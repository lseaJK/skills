"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncManager = void 0;
const vscode = __importStar(require("vscode"));
const syncService_1 = require("../services/syncService");
const sync_1 = require("../types/sync");
const notificationService_1 = require("../services/notificationService");
/**
 * Manager for coordinating synchronization between core service and VS Code extension
 */
class SyncManager {
    constructor(context, skillRegistry, configManager) {
        this.context = context;
        this.skillRegistry = skillRegistry;
        this.configManager = configManager;
        this.isInitialized = false;
        this.disposables = [];
        this.notificationService = new notificationService_1.NotificationService(context);
        // Initialize sync service with default configuration
        const syncConfig = this.loadSyncConfiguration();
        this.syncService = new syncService_1.SynchronizationService(skillRegistry, syncConfig);
        this.setupEventHandlers();
        this.registerCommands();
    }
    /**
     * Initialize the sync manager
     */
    async initialize() {
        if (this.isInitialized) {
            return;
        }
        try {
            await this.notificationService.initialize();
            await this.syncService.startMonitoring();
            // Perform initial sync if configured
            const config = this.loadSyncConfiguration();
            if (config.syncOnStartup) {
                await this.performInitialSync();
            }
            this.isInitialized = true;
            this.configManager.debug('Sync manager initialized successfully');
        }
        catch (error) {
            this.configManager.debug('Failed to initialize sync manager:', error);
            throw error;
        }
    }
    /**
     * Get current synchronization status
     */
    getStatus() {
        return this.syncService.getStatus();
    }
    /**
     * Get synchronization statistics
     */
    getStatistics() {
        return this.syncService.getStatistics();
    }
    /**
     * Manually trigger synchronization
     */
    async synchronize() {
        try {
            await this.notificationService.showProgress('Synchronizing Skills', async (progress) => {
                progress.report({ message: 'Starting synchronization...' });
                const result = await this.syncService.synchronize();
                progress.report({
                    message: `Synchronized ${result.syncedSkills.length} skills`,
                    increment: 100
                });
                if (result.conflicts.length > 0 || result.errors.length > 0) {
                    await this.notificationService.showSyncSummary(result);
                }
            }, true // cancellable
            );
        }
        catch (error) {
            await this.notificationService.showNotification(`Synchronization failed: ${error}`, 'error', ['Retry']);
        }
    }
    /**
     * Resolve a specific conflict
     */
    async resolveConflict(skillId) {
        const conflicts = this.syncService.getConflicts();
        const conflict = conflicts.find(c => c.skillId === skillId);
        if (!conflict) {
            await this.notificationService.showNotification(`No conflict found for skill: ${skillId}`, 'warning');
            return;
        }
        const resolution = await this.notificationService.showConflictDialog(conflict);
        if (resolution !== 'cancel') {
            try {
                await this.syncService.resolveConflict(skillId, resolution);
                await this.notificationService.showNotification(`Conflict resolved for skill: ${skillId}`, 'info');
            }
            catch (error) {
                await this.notificationService.showNotification(`Failed to resolve conflict: ${error}`, 'error');
            }
        }
    }
    /**
     * Resolve all conflicts
     */
    async resolveAllConflicts() {
        const conflicts = this.syncService.getConflicts();
        if (conflicts.length === 0) {
            await this.notificationService.showNotification('No conflicts to resolve', 'info');
            return;
        }
        const config = this.loadSyncConfiguration();
        if (config.conflictResolution === 'manual') {
            // Resolve conflicts one by one
            for (const conflict of conflicts) {
                await this.resolveConflict(conflict.skillId);
            }
        }
        else {
            // Auto-resolve all conflicts
            try {
                await this.notificationService.showProgress('Resolving Conflicts', async (progress) => {
                    for (let i = 0; i < conflicts.length; i++) {
                        const conflict = conflicts[i];
                        progress.report({
                            message: `Resolving conflict for ${conflict.skillId}...`,
                            increment: (i / conflicts.length) * 100
                        });
                        await this.syncService.resolveConflict(conflict.skillId, config.conflictResolution === 'manual' ? 'local' : config.conflictResolution);
                    }
                });
                await this.notificationService.showNotification(`Resolved ${conflicts.length} conflicts automatically`, 'info');
            }
            catch (error) {
                await this.notificationService.showNotification(`Failed to resolve conflicts: ${error}`, 'error');
            }
        }
    }
    /**
     * Show sync status dialog
     */
    async showSyncStatus() {
        const stats = this.syncService.getStatistics();
        const conflicts = this.syncService.getConflicts();
        let message = `Synchronization Status:\n\n`;
        message += `Status: ${stats.status}\n`;
        message += `Total Skills: ${stats.totalSkills}\n`;
        message += `Conflicts: ${stats.conflicts}\n`;
        if (stats.lastSyncTime) {
            message += `Last Sync: ${stats.lastSyncTime.toLocaleString()}\n`;
        }
        const actions = ['Sync Now'];
        if (conflicts.length > 0) {
            actions.push('Resolve Conflicts');
        }
        actions.push('Settings', 'Close');
        const selection = await vscode.window.showInformationMessage(message, { modal: true }, ...actions);
        switch (selection) {
            case 'Sync Now':
                await this.synchronize();
                break;
            case 'Resolve Conflicts':
                await this.resolveAllConflicts();
                break;
            case 'Settings':
                await vscode.commands.executeCommand('workbench.action.openSettings', 'skillsArchitecture.sync');
                break;
        }
    }
    /**
     * Update sync configuration
     */
    updateConfiguration() {
        const newConfig = this.loadSyncConfiguration();
        this.syncService.updateConfiguration(newConfig);
        this.configManager.debug('Sync configuration updated');
    }
    /**
     * Setup event handlers for sync service
     */
    setupEventHandlers() {
        // Listen to all sync events and forward to notification service
        Object.values(sync_1.SyncEvent).forEach(event => {
            this.syncService.on(event, (data) => {
                this.notificationService.handleSyncEvent(event, data);
            });
        });
        // Listen for configuration changes
        const configDisposable = vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('skillsArchitecture.sync')) {
                this.updateConfiguration();
            }
        });
        this.disposables.push(configDisposable);
    }
    /**
     * Register VS Code commands
     */
    registerCommands() {
        const commands = [
            vscode.commands.registerCommand('skillsArchitecture.sync', () => this.synchronize()),
            vscode.commands.registerCommand('skillsArchitecture.resolveConflicts', () => this.resolveAllConflicts()),
            vscode.commands.registerCommand('skillsArchitecture.resolveConflict', (skillId) => this.resolveConflict(skillId)),
            vscode.commands.registerCommand('skillsArchitecture.showSyncStatus', () => this.showSyncStatus()),
            vscode.commands.registerCommand('skillsArchitecture.toggleAutoSync', () => this.toggleAutoSync())
        ];
        this.disposables.push(...commands);
        this.context.subscriptions.push(...commands);
    }
    /**
     * Perform initial synchronization on startup
     */
    async performInitialSync() {
        try {
            this.configManager.debug('Performing initial synchronization...');
            await this.syncService.synchronize();
        }
        catch (error) {
            this.configManager.debug('Initial synchronization failed:', error);
            // Don't throw error on startup - just log it
        }
    }
    /**
     * Load synchronization configuration from VS Code settings
     */
    loadSyncConfiguration() {
        const config = vscode.workspace.getConfiguration('skillsArchitecture.sync');
        return {
            autoSync: config.get('autoSync', true),
            syncInterval: config.get('syncInterval', 30000), // 30 seconds
            conflictResolution: config.get('conflictResolution', 'manual'),
            enableNotifications: config.get('enableNotifications', true),
            syncOnStartup: config.get('syncOnStartup', true)
        };
    }
    /**
     * Toggle auto-sync on/off
     */
    async toggleAutoSync() {
        const config = vscode.workspace.getConfiguration('skillsArchitecture.sync');
        const currentValue = config.get('autoSync', true);
        await config.update('autoSync', !currentValue, vscode.ConfigurationTarget.Workspace);
        const status = !currentValue ? 'enabled' : 'disabled';
        await this.notificationService.showNotification(`Auto-sync ${status}`, 'info');
    }
    /**
     * Dispose of all resources
     */
    dispose() {
        this.syncService.dispose();
        this.notificationService.dispose();
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
    }
}
exports.SyncManager = SyncManager;
//# sourceMappingURL=syncManager.js.map