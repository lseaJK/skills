import { EventEmitter } from 'events';
import { SkillRegistry } from '../types';
/**
 * Synchronization event types
 */
export declare enum SyncEvent {
    SYNC_STARTED = "syncStarted",
    SYNC_COMPLETED = "syncCompleted",
    SYNC_FAILED = "syncFailed",
    SKILL_SYNCHRONIZED = "skillSynchronized",
    CONFLICT_DETECTED = "conflictDetected",
    STATUS_CHANGED = "statusChanged"
}
/**
 * Synchronization status
 */
export declare enum SyncStatus {
    IDLE = "idle",
    SYNCING = "syncing",
    ERROR = "error",
    CONFLICT = "conflict"
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
    syncInterval: number;
    conflictResolution: 'manual' | 'local' | 'remote';
    enableNotifications: boolean;
    syncOnStartup: boolean;
}
/**
 * Service for managing skill synchronization across different environments
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
//# sourceMappingURL=synchronization-service.d.ts.map