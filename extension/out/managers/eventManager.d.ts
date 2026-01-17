import * as vscode from 'vscode';
import { SkillsArchitectureExtension } from '../skillsArchitectureExtension';
/**
 * Event types for the Skills Architecture extension
 */
export declare enum SkillsArchitectureEvent {
    SKILL_CREATED = "skillCreated",
    SKILL_UPDATED = "skillUpdated",
    SKILL_DELETED = "skillDeleted",
    SKILL_TESTED = "skillTested",
    CONFIGURATION_CHANGED = "configurationChanged",
    WORKSPACE_CHANGED = "workspaceChanged",
    TREE_SELECTION_CHANGED = "treeSelectionChanged",
    TREE_VISIBILITY_CHANGED = "treeVisibilityChanged",
    SYNC_STATUS_CHANGED = "syncStatusChanged",
    SYNC_CONFLICT_DETECTED = "syncConflictDetected"
}
/**
 * Event data interface
 */
export interface EventData {
    type: SkillsArchitectureEvent;
    timestamp: Date;
    data?: any;
}
/**
 * Event listener function type
 */
export type EventListener = (event: EventData) => void | Promise<void>;
/**
 * Manages events and notifications for the Skills Architecture extension
 */
export declare class EventManager {
    private context;
    private listeners;
    private extension;
    private eventHistory;
    private maxHistorySize;
    constructor(context: vscode.ExtensionContext);
    /**
     * Initialize the event manager
     */
    initialize(extension: SkillsArchitectureExtension): Promise<void>;
    /**
     * Setup default event listeners
     */
    private setupDefaultListeners;
    /**
     * Add an event listener
     */
    addEventListener(eventType: SkillsArchitectureEvent, listener: EventListener): vscode.Disposable;
    /**
     * Remove an event listener
     */
    removeEventListener(eventType: SkillsArchitectureEvent, listener: EventListener): void;
    /**
     * Emit an event
     */
    emitEvent(eventType: SkillsArchitectureEvent, data?: any): Promise<void>;
    /**
     * Handle tree selection change
     */
    handleTreeSelectionChange(event: vscode.TreeViewSelectionChangeEvent<any>): void;
    /**
     * Handle tree visibility change
     */
    handleTreeVisibilityChange(event: vscode.TreeViewVisibilityChangeEvent): void;
    /**
     * Handle workspace folders change
     */
    handleWorkspaceFoldersChange(event: vscode.WorkspaceFoldersChangeEvent): void;
    /**
     * Handle skill file created
     */
    handleSkillFileCreated(uri: vscode.Uri): void;
    /**
     * Handle skill file changed
     */
    handleSkillFileChanged(uri: vscode.Uri): void;
    /**
     * Handle skill file deleted
     */
    handleSkillFileDeleted(uri: vscode.Uri): void;
    /**
     * Handle configuration change
     */
    handleConfigurationChange(event: vscode.ConfigurationChangeEvent): void;
    /**
     * Add event to history
     */
    private addToHistory;
    /**
     * Get event history
     */
    getEventHistory(eventType?: SkillsArchitectureEvent, limit?: number): EventData[];
    /**
     * Clear event history
     */
    clearEventHistory(): void;
    /**
     * Get listener count for an event type
     */
    getListenerCount(eventType: SkillsArchitectureEvent): number;
    /**
     * Get all registered event types
     */
    getRegisteredEventTypes(): SkillsArchitectureEvent[];
    /**
     * Show notification to user
     */
    showNotification(message: string, type?: 'info' | 'warning' | 'error', actions?: string[]): Thenable<string | undefined>;
    /**
     * Show progress notification
     */
    showProgress<T>(title: string, task: (progress: vscode.Progress<{
        message?: string;
        increment?: number;
    }>) => Promise<T>, cancellable?: boolean): Promise<T>;
    /**
     * Show status bar message
     */
    showStatusBarMessage(message: string, timeout?: number): vscode.Disposable;
    /**
     * Create and show output channel
     */
    createOutputChannel(name: string): vscode.OutputChannel;
    /**
     * Dispose of all event listeners
     */
    dispose(): void;
    /**
     * Debug method to log all events
     */
    enableEventLogging(): vscode.Disposable;
    /**
     * Get event statistics
     */
    getEventStatistics(): {
        [key in SkillsArchitectureEvent]?: number;
    };
    /**
     * Trigger auto-sync if enabled
     */
    private triggerAutoSync;
}
//# sourceMappingURL=eventManager.d.ts.map