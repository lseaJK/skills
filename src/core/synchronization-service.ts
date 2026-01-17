import { EventEmitter } from 'events';
import { SkillDefinition, SkillRegistry } from '../types';

/**
 * Synchronization event types
 */
export enum SyncEvent {
    SYNC_STARTED = 'syncStarted',
    SYNC_COMPLETED = 'syncCompleted',
    SYNC_FAILED = 'syncFailed',
    SKILL_SYNCHRONIZED = 'skillSynchronized',
    CONFLICT_DETECTED = 'conflictDetected',
    STATUS_CHANGED = 'statusChanged'
}

/**
 * Synchronization status
 */
export enum SyncStatus {
    IDLE = 'idle',
    SYNCING = 'syncing',
    ERROR = 'error',
    CONFLICT = 'conflict'
}

/**
 * Synchronization conflict information
 */
export interface SyncConflict {
    skillId: string;
    type: 'version' | 'content' | 'dependency';
    localVersion: string;
    remoteVersion: string;
    description: string;
    resolution?: 'local' | 'remote' | 'merge';
}

/**
 * Synchronization result
 */
export interface SyncResult {
    success: boolean;
    syncedSkills: string[];
    conflicts: SyncConflict[];
    errors: string[];
    timestamp: Date;
}

/**
 * Synchronization configuration
 */
export interface SyncConfiguration {
    autoSync: boolean;
    syncInterval: number; // in milliseconds
    conflictResolution: 'manual' | 'local' | 'remote';
    enableNotifications: boolean;
    syncOnStartup: boolean;
}

/**
 * Service for managing skill synchronization across different environments
 */
export class SynchronizationService extends EventEmitter {
    private status: SyncStatus = SyncStatus.IDLE;
    private lastSyncTime?: Date;
    private syncTimer?: NodeJS.Timeout;
    private watchedSkills: Map<string, string> = new Map(); // skillId -> hash
    private conflicts: Map<string, SyncConflict> = new Map();

    constructor(
        private registry: SkillRegistry,
        private config: SyncConfiguration
    ) {
        super();
        this.setupAutoSync();
    }

    /**
     * Get current synchronization status
     */
    getStatus(): SyncStatus {
        return this.status;
    }

    /**
     * Get last synchronization time
     */
    getLastSyncTime(): Date | undefined {
        return this.lastSyncTime;
    }

    /**
     * Get current conflicts
     */
    getConflicts(): SyncConflict[] {
        return Array.from(this.conflicts.values());
    }

    /**
     * Start monitoring skills for changes
     */
    async startMonitoring(): Promise<void> {
        const skills = await this.registry.list();
        
        // Initialize watched skills with their current hashes
        for (const skill of skills) {
            const hash = this.calculateSkillHash(skill);
            this.watchedSkills.set(skill.id, hash);
        }

        this.emit(SyncEvent.STATUS_CHANGED, this.status);
    }

    /**
     * Stop monitoring skills
     */
    stopMonitoring(): void {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
            this.syncTimer = undefined;
        }
        this.watchedSkills.clear();
    }

    /**
     * Manually trigger synchronization
     */
    async synchronize(): Promise<SyncResult> {
        if (this.status === SyncStatus.SYNCING) {
            throw new Error('Synchronization already in progress');
        }

        this.setStatus(SyncStatus.SYNCING);
        this.emit(SyncEvent.SYNC_STARTED);

        try {
            const result = await this.performSync();
            this.lastSyncTime = new Date();
            this.setStatus(result.conflicts.length > 0 ? SyncStatus.CONFLICT : SyncStatus.IDLE);
            this.emit(SyncEvent.SYNC_COMPLETED, result);
            return result;
        } catch (error) {
            this.setStatus(SyncStatus.ERROR);
            const errorResult: SyncResult = {
                success: false,
                syncedSkills: [],
                conflicts: [],
                errors: [error instanceof Error ? error.message : String(error)],
                timestamp: new Date()
            };
            this.emit(SyncEvent.SYNC_FAILED, errorResult);
            return errorResult;
        }
    }

    /**
     * Detect changes in skills since last sync
     */
    async detectChanges(): Promise<string[]> {
        const changedSkills: string[] = [];
        const currentSkills = await this.registry.list();

        // Check for modified skills
        for (const skill of currentSkills) {
            const currentHash = this.calculateSkillHash(skill);
            const previousHash = this.watchedSkills.get(skill.id);

            if (!previousHash || previousHash !== currentHash) {
                changedSkills.push(skill.id);
                this.watchedSkills.set(skill.id, currentHash);
            }
        }

        // Check for deleted skills
        for (const [skillId] of this.watchedSkills) {
            const exists = currentSkills.some(skill => skill.id === skillId);
            if (!exists) {
                changedSkills.push(skillId);
                this.watchedSkills.delete(skillId);
            }
        }

        return changedSkills;
    }

    /**
     * Resolve a synchronization conflict
     */
    async resolveConflict(skillId: string, resolution: 'local' | 'remote' | 'merge'): Promise<void> {
        const conflict = this.conflicts.get(skillId);
        if (!conflict) {
            throw new Error(`No conflict found for skill: ${skillId}`);
        }

        conflict.resolution = resolution;

        try {
            await this.applyConflictResolution(conflict);
            this.conflicts.delete(skillId);

            // Update status if no more conflicts
            if (this.conflicts.size === 0 && this.status === SyncStatus.CONFLICT) {
                this.setStatus(SyncStatus.IDLE);
            }
        } catch (error) {
            throw new Error(`Failed to resolve conflict for ${skillId}: ${error}`);
        }
    }

    /**
     * Update synchronization configuration
     */
    updateConfiguration(newConfig: Partial<SyncConfiguration>): void {
        this.config = { ...this.config, ...newConfig };
        
        // Restart auto-sync if interval changed
        if (newConfig.autoSync !== undefined || newConfig.syncInterval !== undefined) {
            this.setupAutoSync();
        }
    }

    /**
     * Get synchronization statistics
     */
    getStatistics(): {
        totalSkills: number;
        watchedSkills: number;
        conflicts: number;
        lastSyncTime?: Date;
        status: SyncStatus;
    } {
        return {
            totalSkills: this.watchedSkills.size,
            watchedSkills: this.watchedSkills.size,
            conflicts: this.conflicts.size,
            lastSyncTime: this.lastSyncTime,
            status: this.status
        };
    }

    /**
     * Setup automatic synchronization
     */
    private setupAutoSync(): void {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
        }

        if (this.config.autoSync && this.config.syncInterval > 0) {
            this.syncTimer = setInterval(async () => {
                try {
                    const changes = await this.detectChanges();
                    if (changes.length > 0) {
                        await this.synchronize();
                    }
                } catch (error) {
                    console.error('Auto-sync failed:', error);
                }
            }, this.config.syncInterval);
        }
    }

    /**
     * Perform the actual synchronization
     */
    private async performSync(): Promise<SyncResult> {
        const syncedSkills: string[] = [];
        const conflicts: SyncConflict[] = [];
        const errors: string[] = [];

        try {
            // Detect changes
            const changedSkills = await this.detectChanges();

            // Process each changed skill
            for (const skillId of changedSkills) {
                try {
                    const skill = await this.registry.resolve(skillId);
                    
                    // Simulate conflict detection (in real implementation, this would check against remote)
                    const hasConflict = await this.checkForConflicts(skill);
                    
                    if (hasConflict) {
                        const conflict = await this.createConflict(skill);
                        conflicts.push(conflict);
                        this.conflicts.set(skillId, conflict);
                        this.emit(SyncEvent.CONFLICT_DETECTED, conflict);
                    } else {
                        // Synchronize the skill
                        await this.syncSkill(skill);
                        syncedSkills.push(skillId);
                        this.emit(SyncEvent.SKILL_SYNCHRONIZED, skill);
                    }
                } catch (error) {
                    const errorMessage = `Failed to sync skill ${skillId}: ${error}`;
                    errors.push(errorMessage);
                    console.error(errorMessage);
                }
            }

            return {
                success: errors.length === 0,
                syncedSkills,
                conflicts,
                errors,
                timestamp: new Date()
            };
        } catch (error) {
            throw new Error(`Synchronization failed: ${error}`);
        }
    }

    /**
     * Check for conflicts with a skill
     */
    private async checkForConflicts(skill: SkillDefinition): Promise<boolean> {
        // In a real implementation, this would check against a remote registry
        // For now, we'll simulate conflict detection based on dependencies
        const dependentSkills = await this.registry.getDependentSkills(skill.id);
        
        // Simulate conflict if skill has dependents and version changed
        return dependentSkills.length > 0 && Math.random() < 0.1; // 10% chance of conflict
    }

    /**
     * Create a conflict object
     */
    private async createConflict(skill: SkillDefinition): Promise<SyncConflict> {
        return {
            skillId: skill.id,
            type: 'version',
            localVersion: skill.version,
            remoteVersion: this.generateRemoteVersion(skill.version),
            description: `Version conflict detected for skill ${skill.name}`
        };
    }

    /**
     * Synchronize a single skill
     */
    private async syncSkill(skill: SkillDefinition): Promise<void> {
        // In a real implementation, this would sync with remote registry
        // For now, we'll just update the local hash
        const hash = this.calculateSkillHash(skill);
        this.watchedSkills.set(skill.id, hash);
    }

    /**
     * Apply conflict resolution
     */
    private async applyConflictResolution(conflict: SyncConflict): Promise<void> {
        switch (conflict.resolution) {
            case 'local':
                // Keep local version - no action needed
                break;
            case 'remote':
                // Update to remote version - simulate by updating version
                const skill = await this.registry.resolve(conflict.skillId);
                skill.version = conflict.remoteVersion;
                await this.registry.update(conflict.skillId, skill);
                break;
            case 'merge':
                // Merge versions - simplified implementation
                const mergedSkill = await this.registry.resolve(conflict.skillId);
                mergedSkill.version = this.mergeVersions(conflict.localVersion, conflict.remoteVersion);
                await this.registry.update(conflict.skillId, mergedSkill);
                break;
        }
    }

    /**
     * Calculate hash for a skill to detect changes
     */
    private calculateSkillHash(skill: SkillDefinition): string {
        const content = JSON.stringify({
            id: skill.id,
            version: skill.version,
            description: skill.description,
            invocationSpec: skill.invocationSpec,
            dependencies: skill.dependencies,
            updated: skill.metadata.updated
        });
        
        // Simple hash function (in production, use a proper hash library)
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString();
    }

    /**
     * Generate a simulated remote version
     */
    private generateRemoteVersion(localVersion: string): string {
        const parts = localVersion.split('.');
        const patch = parseInt(parts[2] || '0') + 1;
        return `${parts[0]}.${parts[1]}.${patch}`;
    }

    /**
     * Merge two versions (simplified)
     */
    private mergeVersions(local: string, remote: string): string {
        const localParts = local.split('.').map(Number);
        const remoteParts = remote.split('.').map(Number);
        
        // Take the higher version for each part
        const merged = [
            Math.max(localParts[0] || 0, remoteParts[0] || 0),
            Math.max(localParts[1] || 0, remoteParts[1] || 0),
            Math.max(localParts[2] || 0, remoteParts[2] || 0)
        ];
        
        return merged.join('.');
    }

    /**
     * Set status and emit change event
     */
    private setStatus(status: SyncStatus): void {
        if (this.status !== status) {
            this.status = status;
            this.emit(SyncEvent.STATUS_CHANGED, status);
        }
    }

    /**
     * Dispose of resources
     */
    dispose(): void {
        this.stopMonitoring();
        this.removeAllListeners();
    }
}