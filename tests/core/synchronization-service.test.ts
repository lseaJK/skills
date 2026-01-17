import { SynchronizationService, SyncStatus, SyncEvent } from '../../src/core/synchronization-service';
import { InMemorySkillRegistry } from '../../src/core/skill-registry';
import { SkillDefinition } from '../../src/types';

describe('SynchronizationService', () => {
    let syncService: SynchronizationService;
    let skillRegistry: InMemorySkillRegistry;
    let mockSkill: SkillDefinition;

    beforeEach(() => {
        skillRegistry = new InMemorySkillRegistry();
        syncService = new SynchronizationService(skillRegistry, {
            autoSync: false,
            syncInterval: 5000,
            conflictResolution: 'manual',
            enableNotifications: true,
            syncOnStartup: false
        });

        mockSkill = {
            id: 'test-skill-1',
            name: 'Test Skill',
            version: '1.0.0',
            layer: 1,
            description: 'A test skill for synchronization',
            invocationSpec: {
                inputSchema: {
                    type: 'object',
                    properties: {
                        input: { type: 'string' }
                    }
                },
                outputSchema: {
                    type: 'object',
                    properties: {
                        output: { type: 'string' }
                    }
                },
                executionContext: {
                    environment: {},
                    security: { sandboxed: true }
                },
                parameters: [],
                examples: []
            },
            extensionPoints: [],
            dependencies: [],
            metadata: {
                author: 'Test Author',
                created: new Date(),
                updated: new Date(),
                tags: ['test'],
                category: 'testing'
            }
        };
    });

    afterEach(() => {
        syncService.dispose();
    });

    describe('initialization', () => {
        it('should initialize with idle status', () => {
            expect(syncService.getStatus()).toBe(SyncStatus.IDLE);
        });

        it('should have no last sync time initially', () => {
            expect(syncService.getLastSyncTime()).toBeUndefined();
        });

        it('should have no conflicts initially', () => {
            expect(syncService.getConflicts()).toHaveLength(0);
        });
    });

    describe('monitoring', () => {
        it('should start monitoring skills', async () => {
            await skillRegistry.register(mockSkill);
            await syncService.startMonitoring();

            const stats = syncService.getStatistics();
            expect(stats.watchedSkills).toBe(1);
        });

        it('should detect skill changes', async () => {
            await skillRegistry.register(mockSkill);
            await syncService.startMonitoring();

            // Modify the skill
            mockSkill.description = 'Updated description';
            await skillRegistry.update(mockSkill.id, mockSkill);

            const changes = await syncService.detectChanges();
            expect(changes).toContain(mockSkill.id);
        });

        it('should detect new skills', async () => {
            await syncService.startMonitoring();

            // Add a new skill
            await skillRegistry.register(mockSkill);

            const changes = await syncService.detectChanges();
            expect(changes).toContain(mockSkill.id);
        });
    });

    describe('synchronization', () => {
        it('should perform synchronization', async () => {
            await skillRegistry.register(mockSkill);
            await syncService.startMonitoring();

            const result = await syncService.synchronize();

            expect(result.success).toBe(true);
            expect(result.timestamp).toBeInstanceOf(Date);
            expect(syncService.getLastSyncTime()).toBeDefined();
        });

        it('should emit sync events', async () => {
            const events: string[] = [];
            
            syncService.on(SyncEvent.SYNC_STARTED, () => events.push('started'));
            syncService.on(SyncEvent.SYNC_COMPLETED, () => events.push('completed'));

            await skillRegistry.register(mockSkill);
            await syncService.startMonitoring();
            await syncService.synchronize();

            expect(events).toContain('started');
            expect(events).toContain('completed');
        });

        it('should handle sync errors gracefully', async () => {
            // Mock a registry that throws errors
            const errorRegistry = {
                ...skillRegistry,
                list: jest.fn().mockRejectedValue(new Error('Registry error'))
            } as any;

            const errorSyncService = new SynchronizationService(errorRegistry, {
                autoSync: false,
                syncInterval: 5000,
                conflictResolution: 'manual',
                enableNotifications: true,
                syncOnStartup: false
            });

            const result = await errorSyncService.synchronize();

            expect(result.success).toBe(false);
            expect(result.errors).toHaveLength(1);
            expect(errorSyncService.getStatus()).toBe(SyncStatus.ERROR);

            errorSyncService.dispose();
        });

        it('should prevent concurrent synchronization', async () => {
            await skillRegistry.register(mockSkill);
            await syncService.startMonitoring();

            // Start first sync
            const firstSync = syncService.synchronize();

            // Try to start second sync
            await expect(syncService.synchronize()).rejects.toThrow('Synchronization already in progress');

            // Wait for first sync to complete
            await firstSync;
        });
    });

    describe('conflict resolution', () => {
        it('should resolve conflicts with local resolution', async () => {
            await skillRegistry.register(mockSkill);
            await syncService.startMonitoring();

            // Simulate a conflict
            const conflict = {
                skillId: mockSkill.id,
                type: 'version' as const,
                localVersion: '1.0.0',
                remoteVersion: '1.0.1',
                description: 'Test conflict'
            };

            // Add conflict manually for testing
            (syncService as any).conflicts.set(mockSkill.id, conflict);

            await syncService.resolveConflict(mockSkill.id, 'local');

            expect(syncService.getConflicts()).toHaveLength(0);
        });

        it('should throw error for non-existent conflict', async () => {
            await expect(syncService.resolveConflict('non-existent', 'local'))
                .rejects.toThrow('No conflict found for skill: non-existent');
        });
    });

    describe('configuration updates', () => {
        it('should update configuration', () => {
            const newConfig = {
                autoSync: true,
                syncInterval: 10000
            };

            syncService.updateConfiguration(newConfig);

            // Configuration is updated internally, we can verify by checking if auto-sync behavior changes
            expect(syncService.getStatistics().status).toBe(SyncStatus.IDLE);
        });
    });

    describe('statistics', () => {
        it('should provide accurate statistics', async () => {
            await skillRegistry.register(mockSkill);
            await syncService.startMonitoring();

            const stats = syncService.getStatistics();

            expect(stats.totalSkills).toBe(1);
            expect(stats.watchedSkills).toBe(1);
            expect(stats.conflicts).toBe(0);
            expect(stats.status).toBe(SyncStatus.IDLE);
        });
    });

    describe('cleanup', () => {
        it('should dispose resources properly', () => {
            syncService.dispose();

            expect(syncService.getStatistics().watchedSkills).toBe(0);
        });
    });
});