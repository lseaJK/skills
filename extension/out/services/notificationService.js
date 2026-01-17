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
exports.NotificationService = exports.NotificationType = void 0;
const vscode = __importStar(require("vscode"));
const sync_1 = require("../types/sync");
/**
 * Notification types for the Skills Architecture extension
 */
var NotificationType;
(function (NotificationType) {
    NotificationType["INFO"] = "info";
    NotificationType["WARNING"] = "warning";
    NotificationType["ERROR"] = "error";
    NotificationType["PROGRESS"] = "progress";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
/**
 * Service for managing notifications and status indicators in VS Code
 */
class NotificationService {
    constructor(context) {
        this.context = context;
        this.activeNotifications = new Map();
        this.config = this.loadConfiguration();
        this.outputChannel = vscode.window.createOutputChannel('Skills Architecture');
        this.statusBarItem = this.createStatusBarItem();
        // Register configuration change listener
        this.context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('skillsArchitecture.notifications')) {
                this.config = this.loadConfiguration();
            }
        }));
    }
    /**
     * Initialize the notification service
     */
    async initialize() {
        this.updateStatusBar(sync_1.SyncStatus.IDLE);
        this.outputChannel.appendLine('Skills Architecture Notification Service initialized');
    }
    /**
     * Handle synchronization events
     */
    handleSyncEvent(event, data) {
        switch (event) {
            case sync_1.SyncEvent.SYNC_STARTED:
                this.handleSyncStarted();
                break;
            case sync_1.SyncEvent.SYNC_COMPLETED:
                this.handleSyncCompleted(data);
                break;
            case sync_1.SyncEvent.SYNC_FAILED:
                this.handleSyncFailed(data);
                break;
            case sync_1.SyncEvent.SKILL_SYNCHRONIZED:
                this.handleSkillSynchronized(data);
                break;
            case sync_1.SyncEvent.CONFLICT_DETECTED:
                this.handleConflictDetected(data);
                break;
            case sync_1.SyncEvent.STATUS_CHANGED:
                this.handleStatusChanged(data);
                break;
        }
    }
    /**
     * Show a notification message
     */
    async showNotification(message, type = NotificationType.INFO, actions) {
        if (!this.shouldShowNotification(type)) {
            return undefined;
        }
        this.logToOutput(message, type);
        switch (type) {
            case NotificationType.ERROR:
                return vscode.window.showErrorMessage(message, ...(actions || []));
            case NotificationType.WARNING:
                return vscode.window.showWarningMessage(message, ...(actions || []));
            case NotificationType.INFO:
            default:
                return vscode.window.showInformationMessage(message, ...(actions || []));
        }
    }
    /**
     * Show progress notification
     */
    async showProgress(title, task, cancellable = false) {
        if (!this.config.showProgressNotifications) {
            // Execute task without progress if disabled
            return task({
                report: () => { } // No-op progress reporter
            });
        }
        return vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title,
            cancellable
        }, task);
    }
    /**
     * Show status bar message temporarily
     */
    showStatusBarMessage(message, timeout) {
        const messageId = `status-${Date.now()}`;
        const disposable = timeout !== undefined
            ? vscode.window.setStatusBarMessage(message, timeout)
            : vscode.window.setStatusBarMessage(message);
        this.activeNotifications.set(messageId, disposable);
        // Auto-cleanup after timeout
        if (timeout !== undefined) {
            setTimeout(() => {
                this.activeNotifications.delete(messageId);
            }, timeout);
        }
        return disposable;
    }
    /**
     * Update the sync status bar item
     */
    updateStatusBar(status, details) {
        if (!this.config.enableStatusBar) {
            this.statusBarItem.item.hide();
            return;
        }
        const statusInfo = this.getStatusInfo(status);
        this.statusBarItem.item.text = `$(${statusInfo.icon}) ${statusInfo.text}`;
        this.statusBarItem.item.tooltip = details || statusInfo.tooltip;
        this.statusBarItem.item.color = statusInfo.color;
        this.statusBarItem.item.show();
    }
    /**
     * Show conflict resolution dialog
     */
    async showConflictDialog(conflict) {
        const message = `Conflict detected for skill "${conflict.skillId}": ${conflict.description}`;
        const options = [
            { title: 'Keep Local', value: 'local' },
            { title: 'Use Remote', value: 'remote' },
            { title: 'Merge', value: 'merge' },
            { title: 'Cancel', value: 'cancel' }
        ];
        const selection = await vscode.window.showWarningMessage(message, { modal: true }, ...options.map(opt => opt.title));
        const selectedOption = options.find(opt => opt.title === selection);
        return selectedOption?.value || 'cancel';
    }
    /**
     * Show sync summary dialog
     */
    async showSyncSummary(result) {
        const { syncedSkills, conflicts, errors } = result;
        let message = `Synchronization completed:\n`;
        message += `• ${syncedSkills.length} skills synchronized\n`;
        if (conflicts.length > 0) {
            message += `• ${conflicts.length} conflicts detected\n`;
        }
        if (errors.length > 0) {
            message += `• ${errors.length} errors occurred\n`;
        }
        const actions = [];
        if (conflicts.length > 0) {
            actions.push('Resolve Conflicts');
        }
        if (errors.length > 0) {
            actions.push('View Errors');
        }
        actions.push('OK');
        const selection = await vscode.window.showInformationMessage(message, ...actions);
        if (selection === 'Resolve Conflicts') {
            vscode.commands.executeCommand('skillsArchitecture.resolveConflicts');
        }
        else if (selection === 'View Errors') {
            this.showErrorDetails(errors);
        }
    }
    /**
     * Handle sync started event
     */
    handleSyncStarted() {
        this.updateStatusBar(sync_1.SyncStatus.SYNCING, 'Synchronizing skills...');
        if (this.config.showSyncNotifications) {
            this.showStatusBarMessage('Synchronizing skills...', 3000);
        }
        this.logToOutput('Synchronization started', NotificationType.INFO);
    }
    /**
     * Handle sync completed event
     */
    handleSyncCompleted(result) {
        const hasConflicts = result.conflicts.length > 0;
        const status = hasConflicts ? sync_1.SyncStatus.CONFLICT : sync_1.SyncStatus.IDLE;
        this.updateStatusBar(status, `Last sync: ${result.timestamp.toLocaleTimeString()}`);
        if (this.config.showSyncNotifications) {
            if (hasConflicts) {
                this.showNotification(`Sync completed with ${result.conflicts.length} conflicts`, NotificationType.WARNING, ['Resolve Conflicts']).then(selection => {
                    if (selection === 'Resolve Conflicts') {
                        vscode.commands.executeCommand('skillsArchitecture.resolveConflicts');
                    }
                });
            }
            else {
                this.showStatusBarMessage(`${result.syncedSkills.length} skills synchronized`, 3000);
            }
        }
        this.logToOutput(`Synchronization completed: ${result.syncedSkills.length} skills`, NotificationType.INFO);
    }
    /**
     * Handle sync failed event
     */
    handleSyncFailed(result) {
        this.updateStatusBar(sync_1.SyncStatus.ERROR, 'Synchronization failed');
        if (this.config.showSyncNotifications) {
            this.showNotification('Synchronization failed', NotificationType.ERROR, ['View Details', 'Retry']).then(selection => {
                if (selection === 'View Details') {
                    this.showErrorDetails(result.errors);
                }
                else if (selection === 'Retry') {
                    vscode.commands.executeCommand('skillsArchitecture.sync');
                }
            });
        }
        this.logToOutput(`Synchronization failed: ${result.errors.join(', ')}`, NotificationType.ERROR);
    }
    /**
     * Handle skill synchronized event
     */
    handleSkillSynchronized(skill) {
        this.logToOutput(`Skill synchronized: ${skill.name}`, NotificationType.INFO);
    }
    /**
     * Handle conflict detected event
     */
    handleConflictDetected(conflict) {
        if (this.config.showConflictNotifications) {
            this.showNotification(`Conflict detected for skill "${conflict.skillId}"`, NotificationType.WARNING, ['Resolve Now', 'Resolve Later']).then(selection => {
                if (selection === 'Resolve Now') {
                    vscode.commands.executeCommand('skillsArchitecture.resolveConflict', conflict.skillId);
                }
            });
        }
        this.logToOutput(`Conflict detected: ${conflict.description}`, NotificationType.WARNING);
    }
    /**
     * Handle status changed event
     */
    handleStatusChanged(status) {
        this.updateStatusBar(status);
        this.logToOutput(`Sync status changed to: ${status}`, NotificationType.INFO);
    }
    /**
     * Load notification configuration
     */
    loadConfiguration() {
        const config = vscode.workspace.getConfiguration('skillsArchitecture.notifications');
        return {
            showSyncNotifications: config.get('showSyncNotifications', true),
            showConflictNotifications: config.get('showConflictNotifications', true),
            showProgressNotifications: config.get('showProgressNotifications', true),
            autoHideTimeout: config.get('autoHideTimeout', 5000),
            enableStatusBar: config.get('enableStatusBar', true)
        };
    }
    /**
     * Create status bar item
     */
    createStatusBarItem() {
        const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        const command = 'skillsArchitecture.showSyncStatus';
        item.command = command;
        this.context.subscriptions.push(item);
        return { item, command };
    }
    /**
     * Get status information for display
     */
    getStatusInfo(status) {
        switch (status) {
            case sync_1.SyncStatus.SYNCING:
                return {
                    icon: 'sync~spin',
                    text: 'Syncing',
                    tooltip: 'Skills are being synchronized',
                    color: '#007ACC'
                };
            case sync_1.SyncStatus.ERROR:
                return {
                    icon: 'error',
                    text: 'Sync Error',
                    tooltip: 'Synchronization failed',
                    color: '#F14C4C'
                };
            case sync_1.SyncStatus.CONFLICT:
                return {
                    icon: 'warning',
                    text: 'Conflicts',
                    tooltip: 'Synchronization conflicts need resolution',
                    color: '#FF8C00'
                };
            case sync_1.SyncStatus.IDLE:
            default:
                return {
                    icon: 'check',
                    text: 'Synced',
                    tooltip: 'Skills are synchronized'
                };
        }
    }
    /**
     * Check if notification should be shown based on configuration
     */
    shouldShowNotification(type) {
        switch (type) {
            case NotificationType.PROGRESS:
                return this.config.showProgressNotifications;
            case NotificationType.WARNING:
                return this.config.showConflictNotifications;
            case NotificationType.INFO:
                return this.config.showSyncNotifications;
            case NotificationType.ERROR:
                return true; // Always show errors
            default:
                return true;
        }
    }
    /**
     * Log message to output channel
     */
    logToOutput(message, type) {
        const timestamp = new Date().toLocaleTimeString();
        const prefix = type.toUpperCase().padEnd(8);
        this.outputChannel.appendLine(`[${timestamp}] ${prefix} ${message}`);
    }
    /**
     * Show error details in output channel
     */
    showErrorDetails(errors) {
        this.outputChannel.show();
        this.outputChannel.appendLine('\n=== Synchronization Errors ===');
        errors.forEach((error, index) => {
            this.outputChannel.appendLine(`${index + 1}. ${error}`);
        });
        this.outputChannel.appendLine('================================\n');
    }
    /**
     * Clear all active notifications
     */
    clearNotifications() {
        this.activeNotifications.forEach(disposable => disposable.dispose());
        this.activeNotifications.clear();
    }
    /**
     * Dispose of all resources
     */
    dispose() {
        this.clearNotifications();
        this.statusBarItem.item.dispose();
        this.outputChannel.dispose();
    }
}
exports.NotificationService = NotificationService;
//# sourceMappingURL=notificationService.js.map