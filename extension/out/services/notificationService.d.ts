import * as vscode from 'vscode';
import { SyncEvent, SyncStatus, SyncResult, SyncConflict } from '../types/sync';
/**
 * Notification types for the Skills Architecture extension
 */
export declare enum NotificationType {
    INFO = "info",
    WARNING = "warning",
    ERROR = "error",
    PROGRESS = "progress"
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
 * Service for managing notifications and status indicators in VS Code
 */
export declare class NotificationService {
    private context;
    private statusBarItem;
    private outputChannel;
    private config;
    private activeNotifications;
    constructor(context: vscode.ExtensionContext);
    /**
     * Initialize the notification service
     */
    initialize(): Promise<void>;
    /**
     * Handle synchronization events
     */
    handleSyncEvent(event: SyncEvent, data?: any): void;
    /**
     * Show a notification message
     */
    showNotification(message: string, type?: NotificationType, actions?: string[]): Promise<string | undefined>;
    /**
     * Show progress notification
     */
    showProgress<T>(title: string, task: (progress: vscode.Progress<{
        message?: string;
        increment?: number;
    }>) => Promise<T>, cancellable?: boolean): Promise<T>;
    /**
     * Show status bar message temporarily
     */
    showStatusBarMessage(message: string, timeout?: number): vscode.Disposable;
    /**
     * Update the sync status bar item
     */
    updateStatusBar(status: SyncStatus, details?: string): void;
    /**
     * Show conflict resolution dialog
     */
    showConflictDialog(conflict: SyncConflict): Promise<'local' | 'remote' | 'merge' | 'cancel'>;
    /**
     * Show sync summary dialog
     */
    showSyncSummary(result: SyncResult): Promise<void>;
    /**
     * Handle sync started event
     */
    private handleSyncStarted;
    /**
     * Handle sync completed event
     */
    private handleSyncCompleted;
    /**
     * Handle sync failed event
     */
    private handleSyncFailed;
    /**
     * Handle skill synchronized event
     */
    private handleSkillSynchronized;
    /**
     * Handle conflict detected event
     */
    private handleConflictDetected;
    /**
     * Handle status changed event
     */
    private handleStatusChanged;
    /**
     * Load notification configuration
     */
    private loadConfiguration;
    /**
     * Create status bar item
     */
    private createStatusBarItem;
    /**
     * Get status information for display
     */
    private getStatusInfo;
    /**
     * Check if notification should be shown based on configuration
     */
    private shouldShowNotification;
    /**
     * Log message to output channel
     */
    private logToOutput;
    /**
     * Show error details in output channel
     */
    private showErrorDetails;
    /**
     * Clear all active notifications
     */
    clearNotifications(): void;
    /**
     * Dispose of all resources
     */
    dispose(): void;
}
//# sourceMappingURL=notificationService.d.ts.map