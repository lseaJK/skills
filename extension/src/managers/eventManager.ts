import * as vscode from 'vscode';
import { SkillsArchitectureExtension } from '../skillsArchitectureExtension';

/**
 * Event types for the Skills Architecture extension
 */
export enum SkillsArchitectureEvent {
    SKILL_CREATED = 'skillCreated',
    SKILL_UPDATED = 'skillUpdated',
    SKILL_DELETED = 'skillDeleted',
    SKILL_TESTED = 'skillTested',
    CONFIGURATION_CHANGED = 'configurationChanged',
    WORKSPACE_CHANGED = 'workspaceChanged',
    TREE_SELECTION_CHANGED = 'treeSelectionChanged',
    TREE_VISIBILITY_CHANGED = 'treeVisibilityChanged',
    SYNC_STATUS_CHANGED = 'syncStatusChanged',
    SYNC_CONFLICT_DETECTED = 'syncConflictDetected'
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
export class EventManager {
    private listeners: Map<SkillsArchitectureEvent, EventListener[]> = new Map();
    private extension: SkillsArchitectureExtension | null = null;
    private eventHistory: EventData[] = [];
    private maxHistorySize = 100;

    constructor(private context: vscode.ExtensionContext) {}

    /**
     * Initialize the event manager
     */
    async initialize(extension: SkillsArchitectureExtension): Promise<void> {
        this.extension = extension;
        this.setupDefaultListeners();
        console.log('Event manager initialized');
    }

    /**
     * Setup default event listeners
     */
    private setupDefaultListeners(): void {
        // Listen for skill events to update the tree view
        this.addEventListener(SkillsArchitectureEvent.SKILL_CREATED, async (event) => {
            await this.extension?.getSkillsTreeProvider().refresh();
            this.extension?.getConfigurationManager().debug('Tree refreshed after skill creation');
            
            // Trigger sync if auto-sync is enabled
            this.triggerAutoSync();
        });

        this.addEventListener(SkillsArchitectureEvent.SKILL_UPDATED, async (event) => {
            await this.extension?.getSkillsTreeProvider().refresh();
            this.extension?.getConfigurationManager().debug('Tree refreshed after skill update');
            
            // Trigger sync if auto-sync is enabled
            this.triggerAutoSync();
        });

        this.addEventListener(SkillsArchitectureEvent.SKILL_DELETED, async (event) => {
            await this.extension?.getSkillsTreeProvider().refresh();
            this.extension?.getConfigurationManager().debug('Tree refreshed after skill deletion');
            
            // Trigger sync if auto-sync is enabled
            this.triggerAutoSync();
        });

        // Listen for configuration changes
        this.addEventListener(SkillsArchitectureEvent.CONFIGURATION_CHANGED, async (event) => {
            this.extension?.getConfigurationManager().debug('Configuration changed event handled');
        });

        // Listen for workspace changes
        this.addEventListener(SkillsArchitectureEvent.WORKSPACE_CHANGED, async (event) => {
            await this.extension?.getSkillsTreeProvider().refresh();
            this.extension?.getConfigurationManager().debug('Tree refreshed after workspace change');
        });

        // Listen for sync events
        this.addEventListener(SkillsArchitectureEvent.SYNC_STATUS_CHANGED, async (event) => {
            this.extension?.getConfigurationManager().debug('Sync status changed:', event.data);
        });

        this.addEventListener(SkillsArchitectureEvent.SYNC_CONFLICT_DETECTED, async (event) => {
            this.extension?.getConfigurationManager().debug('Sync conflict detected:', event.data);
        });
    }

    /**
     * Add an event listener
     */
    addEventListener(eventType: SkillsArchitectureEvent, listener: EventListener): vscode.Disposable {
        const listeners = this.listeners.get(eventType) || [];
        listeners.push(listener);
        this.listeners.set(eventType, listeners);

        // Return disposable to remove the listener
        return new vscode.Disposable(() => {
            this.removeEventListener(eventType, listener);
        });
    }

    /**
     * Remove an event listener
     */
    removeEventListener(eventType: SkillsArchitectureEvent, listener: EventListener): void {
        const listeners = this.listeners.get(eventType) || [];
        const index = listeners.indexOf(listener);
        if (index > -1) {
            listeners.splice(index, 1);
            this.listeners.set(eventType, listeners);
        }
    }

    /**
     * Emit an event
     */
    async emitEvent(eventType: SkillsArchitectureEvent, data?: any): Promise<void> {
        const event: EventData = {
            type: eventType,
            timestamp: new Date(),
            data
        };

        // Add to history
        this.addToHistory(event);

        // Notify listeners
        const listeners = this.listeners.get(eventType) || [];
        const promises = listeners.map(listener => {
            try {
                return Promise.resolve(listener(event));
            } catch (error) {
                console.error(`Error in event listener for ${eventType}:`, error);
                return Promise.resolve();
            }
        });

        await Promise.all(promises);

        this.extension?.getConfigurationManager().debug('Event emitted:', eventType, data);
    }

    /**
     * Handle tree selection change
     */
    handleTreeSelectionChange(event: vscode.TreeViewSelectionChangeEvent<any>): void {
        this.emitEvent(SkillsArchitectureEvent.TREE_SELECTION_CHANGED, {
            selection: event.selection
        });
    }

    /**
     * Handle tree visibility change
     */
    handleTreeVisibilityChange(event: vscode.TreeViewVisibilityChangeEvent): void {
        this.emitEvent(SkillsArchitectureEvent.TREE_VISIBILITY_CHANGED, {
            visible: event.visible
        });
    }

    /**
     * Handle workspace folders change
     */
    handleWorkspaceFoldersChange(event: vscode.WorkspaceFoldersChangeEvent): void {
        this.emitEvent(SkillsArchitectureEvent.WORKSPACE_CHANGED, {
            added: event.added,
            removed: event.removed
        });
    }

    /**
     * Handle skill file created
     */
    handleSkillFileCreated(uri: vscode.Uri): void {
        this.emitEvent(SkillsArchitectureEvent.SKILL_CREATED, {
            uri: uri.toString(),
            path: uri.fsPath
        });
    }

    /**
     * Handle skill file changed
     */
    handleSkillFileChanged(uri: vscode.Uri): void {
        this.emitEvent(SkillsArchitectureEvent.SKILL_UPDATED, {
            uri: uri.toString(),
            path: uri.fsPath
        });
    }

    /**
     * Handle skill file deleted
     */
    handleSkillFileDeleted(uri: vscode.Uri): void {
        this.emitEvent(SkillsArchitectureEvent.SKILL_DELETED, {
            uri: uri.toString(),
            path: uri.fsPath
        });
    }

    /**
     * Handle configuration change
     */
    handleConfigurationChange(event: vscode.ConfigurationChangeEvent): void {
        this.emitEvent(SkillsArchitectureEvent.CONFIGURATION_CHANGED, {
            affectedSections: ['skillsArchitecture']
        });
    }

    /**
     * Add event to history
     */
    private addToHistory(event: EventData): void {
        this.eventHistory.push(event);
        
        // Maintain history size limit
        if (this.eventHistory.length > this.maxHistorySize) {
            this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
        }
    }

    /**
     * Get event history
     */
    getEventHistory(eventType?: SkillsArchitectureEvent, limit?: number): EventData[] {
        let history = this.eventHistory;
        
        if (eventType) {
            history = history.filter(event => event.type === eventType);
        }
        
        if (limit) {
            history = history.slice(-limit);
        }
        
        return [...history]; // Return copy
    }

    /**
     * Clear event history
     */
    clearEventHistory(): void {
        this.eventHistory = [];
    }

    /**
     * Get listener count for an event type
     */
    getListenerCount(eventType: SkillsArchitectureEvent): number {
        return this.listeners.get(eventType)?.length || 0;
    }

    /**
     * Get all registered event types
     */
    getRegisteredEventTypes(): SkillsArchitectureEvent[] {
        return Array.from(this.listeners.keys());
    }

    /**
     * Show notification to user
     */
    showNotification(
        message: string, 
        type: 'info' | 'warning' | 'error' = 'info',
        actions?: string[]
    ): Thenable<string | undefined> {
        switch (type) {
            case 'warning':
                return vscode.window.showWarningMessage(message, ...(actions || []));
            case 'error':
                return vscode.window.showErrorMessage(message, ...(actions || []));
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
        return vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title,
            cancellable
        }, task);
    }

    /**
     * Show status bar message
     */
    showStatusBarMessage(message: string, timeout?: number): vscode.Disposable {
        if (timeout !== undefined) {
            return vscode.window.setStatusBarMessage(message, timeout);
        } else {
            return vscode.window.setStatusBarMessage(message);
        }
    }

    /**
     * Create and show output channel
     */
    createOutputChannel(name: string): vscode.OutputChannel {
        return vscode.window.createOutputChannel(name);
    }

    /**
     * Dispose of all event listeners
     */
    dispose(): void {
        this.listeners.clear();
        this.eventHistory = [];
    }

    /**
     * Debug method to log all events
     */
    enableEventLogging(): vscode.Disposable {
        const disposables: vscode.Disposable[] = [];

        // Add listeners for all event types
        Object.values(SkillsArchitectureEvent).forEach(eventType => {
            const disposable = this.addEventListener(eventType, (event) => {
                console.log(`[Event] ${event.type}:`, event.data);
            });
            disposables.push(disposable);
        });

        return new vscode.Disposable(() => {
            disposables.forEach(d => d.dispose());
        });
    }

    /**
     * Get event statistics
     */
    getEventStatistics(): { [key in SkillsArchitectureEvent]?: number } {
        const stats: { [key in SkillsArchitectureEvent]?: number } = {};
        
        this.eventHistory.forEach(event => {
            stats[event.type] = (stats[event.type] || 0) + 1;
        });
        
        return stats;
    }

    /**
     * Trigger auto-sync if enabled
     */
    private triggerAutoSync(): void {
        // Check if auto-sync is enabled and trigger sync
        const syncManager = this.extension?.getSyncManager();
        if (syncManager) {
            // Use a small delay to batch multiple rapid changes
            setTimeout(() => {
                const config = vscode.workspace.getConfiguration('skillsArchitecture.sync');
                if (config.get('autoSync', true)) {
                    syncManager.synchronize().catch(error => {
                        this.extension?.getConfigurationManager().debug('Auto-sync failed:', error);
                    });
                }
            }, 1000); // 1 second delay
        }
    }
}