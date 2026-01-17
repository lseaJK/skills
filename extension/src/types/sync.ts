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