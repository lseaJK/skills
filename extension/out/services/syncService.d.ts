import { EventEmitter } from 'events';
import { SkillRegistry } from '../types';
import { SyncStatus, SyncConfiguration, SyncConflict, SyncResult } from '../types/sync';
/**
 * Simplified synchronization service for VS Code extension
 */
export declare class SynchronizationService extends EventEmitter {
    private registry;
    private config;
    private status;
    private lastSyncTime?;
    private syncTimer?;
    private watchedSkills;
    private conflicts;
    constructor(registry: SkillRegistry, config: SyncConfiguration);
    /**
     * Get current synchronization status
     */
    getStatus(): SyncStatus;
    /**
     * Get last synchronization time
     */
    getLastSyncTime(): Date | undefined;
    /**
     * Get current conflicts
     */
    getConflicts(): SyncConflict[];
    /**
     * Start monitoring skills for changes
     */
    startMonitoring(): Promise<void>;
    /**
     * Stop monitoring skills
     */
    stopMonitoring(): void;
    /**
     * Manually trigger synchronization
     */
    synchronize(): Promise<SyncResult>;
    /**
     * Detect changes in skills since last sync
     */
    detectChanges(): Promise<string[]>;
    /**
     * Resolve a synchronization conflict
     */
    resolveConflict(skillId: string, resolution: 'local' | 'remote' | 'merge'): Promise<void>;
    /**
     * Update synchronization configuration
     */
    updateConfiguration(newConfig: Partial<SyncConfiguration>): void;
    /**
     * Get synchronization statistics
     */
    getStatistics(): {
        totalSkills: number;
        watchedSkills: number;
        conflicts: number;
        lastSyncTime?: Date;
        status: SyncStatus;
    };
    /**
     * Setup automatic synchronization
     */
    private setupAutoSync;
    /**
     * Perform the actual synchronization
     */
    private performSync;
    /**
     * Check for conflicts with a skill
     */
    private checkForConflicts;
    /**
     * Create a conflict object
     */
    private createConflict;
    /**
     * Synchronize a single skill
     */
    private syncSkill;
    /**
     * Apply conflict resolution
     */
    private applyConflictResolution;
    /**
     * Calculate hash for a skill to detect changes
     */
    private calculateSkillHash;
    /**
     * Generate a simulated remote version
     */
    private generateRemoteVersion;
    /**
     * Merge two versions (simplified)
     */
    private mergeVersions;
    /**
     * Set status and emit change event
     */
    private setStatus;
    /**
     * Dispose of resources
     */
    dispose(): void;
}
//# sourceMappingURL=syncService.d.ts.map