import * as vscode from 'vscode';
import { SyncEvent, SyncStatus, SyncResult, SyncConflict } from '../types/sync';

/**
 * Notification types for the Skills Architecture extension
 */
export enum NotificationType {
    INFO = 'info',
    WARNING = 'warning',
    ERROR = 'error',
    PROGRESS = 'progress'
}

/**
 * Notification configuration
 */
export interface NotificationConfig {
    showSyncNotifications: boolean;
    showConflictNotifications: boolean;
    showProgressNotifications: boolean;
    autoHideTimeout: number;
    enableStatusBar: boolean;
}

/**
 * Status bar item for sync status
 */
interface SyncStatusBarItem {
    item: vscode.StatusBarItem;
    command: string;
}

/**
 * Service for managing notifications and status indicators in VS Code
 */
export class NotificationService {
    private statusBarItem: SyncStatusBarItem;
    private outputChannel: vscode.OutputChannel;
    private config: NotificationConfig;
    private activeNotifications: Map<string, vscode.Disposable> = new Map();

    constructor(private context: vscode.ExtensionContext) {
        this.config = this.loadConfiguration();
        this.outputChannel = vscode.window.createOutputChannel('Skills Architecture');
        this.statusBarItem = this.createStatusBarItem();
        
        // Register configuration change listener
        this.context.subscriptions.push(
            vscode.workspace.onDidChangeConfiguration(e => {
                if (e.affectsConfiguration('skillsArchitecture.notifications')) {
                    this.config = this.loadConfiguration();
                }
            })
        );
    }

    /**
     * Initialize the notification service
     */
    async initialize(): Promise<void> {
        this.updateStatusBar(SyncStatus.IDLE);
        this.outputChannel.appendLine('Skills Architecture Notification Service initialized');
    }

    /**
     * Handle synchronization events
     */
    handleSyncEvent(event: SyncEvent, data?: any): void {
        switch (event) {
            case SyncEvent.SYNC_STARTED:
                this.handleSyncStarted();
                break;
            case SyncEvent.SYNC_COMPLETED:
                this.handleSyncCompleted(data as SyncResult);
                break;
            case SyncEvent.SYNC_FAILED:
                this.handleSyncFailed(data as SyncResult);
                break;
            case SyncEvent.SKILL_SYNCHRONIZED:
                this.handleSkillSynchronized(data);
                break;
            case SyncEvent.CONFLICT_DETECTED:
                this.handleConflictDetected(data as SyncConflict);
                break;
            case SyncEvent.STATUS_CHANGED:
                this.handleStatusChanged(data as SyncStatus);
                break;
        }
    }

    /**
     * Show a notification message
     */
    async showNotification(
        message: string,
        type: NotificationType = NotificationType.INFO,
        actions?: string[]
    ): Promise<string | undefined> {
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
    async showProgress<T>(
        title: string,
        task: (progress: vscode.Progress<{ message?: string; increment?: number }>) => Promise<T>,
        cancellable: boolean = false
    ): Promise<T> {
        if (!this.config.showProgressNotifications) {
            // Execute task without progress if disabled
            return task({
                report: () => {} // No-op progress reporter
            } as any);
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
    showStatusBarMessage(message: string, timeout?: number): vscode.Disposable {
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
    updateStatusBar(status: SyncStatus, details?: string): void {
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
    async showConflictDialog(conflict: SyncConflict): Promise<'local' | 'remote' | 'merge' | 'cancel'> {
        const message = `Conflict detected for skill "${conflict.skillId}": ${conflict.description}`;
        const options = [
            { title: 'Keep Local', value: 'local' as const },
            { title: 'Use Remote', value: 'remote' as const },
            { title: 'Merge', value: 'merge' as const },
            { title: 'Cancel', value: 'cancel' as const }
        ];

        const selection = await vscode.window.showWarningMessage(
            message,
            { modal: true },
            ...options.map(opt => opt.title)
        );

        const selectedOption = options.find(opt => opt.title === selection);
        return selectedOption?.value || 'cancel';
    }

    /**
     * Show sync summary dialog
     */
    async showSyncSummary(result: SyncResult): Promise<void> {
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
        } else if (selection === 'View Errors') {
            this.showErrorDetails(errors);
        }
    }

    /**
     * Handle sync started event
     */
    private handleSyncStarted(): void {
        this.updateStatusBar(SyncStatus.SYNCING, 'Synchronizing skills...');
        
        if (this.config.showSyncNotifications) {
            this.showStatusBarMessage('Synchronizing skills...', 3000);
        }
        
        this.logToOutput('Synchronization started', NotificationType.INFO);
    }

    /**
     * Handle sync completed event
     */
    private handleSyncCompleted(result: SyncResult): void {
        const hasConflicts = result.conflicts.length > 0;
        const status = hasConflicts ? SyncStatus.CONFLICT : SyncStatus.IDLE;
        
        this.updateStatusBar(status, `Last sync: ${result.timestamp.toLocaleTimeString()}`);
        
        if (this.config.showSyncNotifications) {
            if (hasConflicts) {
                this.showNotification(
                    `Sync completed with ${result.conflicts.length} conflicts`,
                    NotificationType.WARNING,
                    ['Resolve Conflicts']
                ).then(selection => {
                    if (selection === 'Resolve Conflicts') {
                        vscode.commands.executeCommand('skillsArchitecture.resolveConflicts');
                    }
                });
            } else {
                this.showStatusBarMessage(
                    `${result.syncedSkills.length} skills synchronized`,
                    3000
                );
            }
        }
        
        this.logToOutput(`Synchronization completed: ${result.syncedSkills.length} skills`, NotificationType.INFO);
    }

    /**
     * Handle sync failed event
     */
    private handleSyncFailed(result: SyncResult): void {
        this.updateStatusBar(SyncStatus.ERROR, 'Synchronization failed');
        
        if (this.config.showSyncNotifications) {
            this.showNotification(
                'Synchronization failed',
                NotificationType.ERROR,
                ['View Details', 'Retry']
            ).then(selection => {
                if (selection === 'View Details') {
                    this.showErrorDetails(result.errors);
                } else if (selection === 'Retry') {
                    vscode.commands.executeCommand('skillsArchitecture.sync');
                }
            });
        }
        
        this.logToOutput(`Synchronization failed: ${result.errors.join(', ')}`, NotificationType.ERROR);
    }

    /**
     * Handle skill synchronized event
     */
    private handleSkillSynchronized(skill: any): void {
        this.logToOutput(`Skill synchronized: ${skill.name}`, NotificationType.INFO);
    }

    /**
     * Handle conflict detected event
     */
    private handleConflictDetected(conflict: SyncConflict): void {
        if (this.config.showConflictNotifications) {
            this.showNotification(
                `Conflict detected for skill "${conflict.skillId}"`,
                NotificationType.WARNING,
                ['Resolve Now', 'Resolve Later']
            ).then(selection => {
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
    private handleStatusChanged(status: SyncStatus): void {
        this.updateStatusBar(status);
        this.logToOutput(`Sync status changed to: ${status}`, NotificationType.INFO);
    }

    /**
     * Load notification configuration
     */
    private loadConfiguration(): NotificationConfig {
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
    private createStatusBarItem(): SyncStatusBarItem {
        const item = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );
        
        const command = 'skillsArchitecture.showSyncStatus';
        item.command = command;
        
        this.context.subscriptions.push(item);
        
        return { item, command };
    }

    /**
     * Get status information for display
     */
    private getStatusInfo(status: SyncStatus): {
        icon: string;
        text: string;
        tooltip: string;
        color?: string;
    } {
        switch (status) {
            case SyncStatus.SYNCING:
                return {
                    icon: 'sync~spin',
                    text: 'Syncing',
                    tooltip: 'Skills are being synchronized',
                    color: '#007ACC'
                };
            case SyncStatus.ERROR:
                return {
                    icon: 'error',
                    text: 'Sync Error',
                    tooltip: 'Synchronization failed',
                    color: '#F14C4C'
                };
            case SyncStatus.CONFLICT:
                return {
                    icon: 'warning',
                    text: 'Conflicts',
                    tooltip: 'Synchronization conflicts need resolution',
                    color: '#FF8C00'
                };
            case SyncStatus.IDLE:
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
    private shouldShowNotification(type: NotificationType): boolean {
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
    private logToOutput(message: string, type: NotificationType): void {
        const timestamp = new Date().toLocaleTimeString();
        const prefix = type.toUpperCase().padEnd(8);
        this.outputChannel.appendLine(`[${timestamp}] ${prefix} ${message}`);
    }

    /**
     * Show error details in output channel
     */
    private showErrorDetails(errors: string[]): void {
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
    clearNotifications(): void {
        this.activeNotifications.forEach(disposable => disposable.dispose());
        this.activeNotifications.clear();
    }

    /**
     * Dispose of all resources
     */
    dispose(): void {
        this.clearNotifications();
        this.statusBarItem.item.dispose();
        this.outputChannel.dispose();
    }
}