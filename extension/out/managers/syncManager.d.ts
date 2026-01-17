import * as vscode from 'vscode';
import { SyncStatus } from '../types/sync';
import { InMemorySkillRegistry } from '../core/skillRegistry';
import { ConfigurationManager } from './configurationManager';
/**
 * Manager for coordinating synchronization between core service and VS Code extension
 */
export declare class SyncManager {
    private context;
    private skillRegistry;
    private configManager;
    private syncService;
    private notificationService;
    private isInitialized;
    private disposables;
    constructor(context: vscode.ExtensionContext, skillRegistry: InMemorySkillRegistry, configManager: ConfigurationManager);
    /**
     * Initialize the sync manager
     */
    initialize(): Promise<void>;
    /**
     * Get current synchronization status
     */
    getStatus(): SyncStatus;
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
     * Manually trigger synchronization
     */
    synchronize(): Promise<void>;
    /**
     * Resolve a specific conflict
     */
    resolveConflict(skillId: string): Promise<void>;
    /**
     * Resolve all conflicts
     */
    resolveAllConflicts(): Promise<void>;
    /**
     * Show sync status dialog
     */
    showSyncStatus(): Promise<void>;
    /**
     * Update sync configuration
     */
    updateConfiguration(): void;
    /**
     * Setup event handlers for sync service
     */
    private setupEventHandlers;
    /**
     * Register VS Code commands
     */
    private registerCommands;
    /**
     * Perform initial synchronization on startup
     */
    private performInitialSync;
    /**
     * Load synchronization configuration from VS Code settings
     */
    private loadSyncConfiguration;
    /**
     * Toggle auto-sync on/off
     */
    private toggleAutoSync;
    /**
     * Dispose of all resources
     */
    dispose(): void;
}
//# sourceMappingURL=syncManager.d.ts.map