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
exports.EventManager = exports.SkillsArchitectureEvent = void 0;
const vscode = __importStar(require("vscode"));
/**
 * Event types for the Skills Architecture extension
 */
var SkillsArchitectureEvent;
(function (SkillsArchitectureEvent) {
    SkillsArchitectureEvent["SKILL_CREATED"] = "skillCreated";
    SkillsArchitectureEvent["SKILL_UPDATED"] = "skillUpdated";
    SkillsArchitectureEvent["SKILL_DELETED"] = "skillDeleted";
    SkillsArchitectureEvent["SKILL_TESTED"] = "skillTested";
    SkillsArchitectureEvent["CONFIGURATION_CHANGED"] = "configurationChanged";
    SkillsArchitectureEvent["WORKSPACE_CHANGED"] = "workspaceChanged";
    SkillsArchitectureEvent["TREE_SELECTION_CHANGED"] = "treeSelectionChanged";
    SkillsArchitectureEvent["TREE_VISIBILITY_CHANGED"] = "treeVisibilityChanged";
    SkillsArchitectureEvent["SYNC_STATUS_CHANGED"] = "syncStatusChanged";
    SkillsArchitectureEvent["SYNC_CONFLICT_DETECTED"] = "syncConflictDetected";
})(SkillsArchitectureEvent || (exports.SkillsArchitectureEvent = SkillsArchitectureEvent = {}));
/**
 * Manages events and notifications for the Skills Architecture extension
 */
class EventManager {
    constructor(context) {
        this.context = context;
        this.listeners = new Map();
        this.extension = null;
        this.eventHistory = [];
        this.maxHistorySize = 100;
    }
    /**
     * Initialize the event manager
     */
    async initialize(extension) {
        this.extension = extension;
        this.setupDefaultListeners();
        console.log('Event manager initialized');
    }
    /**
     * Setup default event listeners
     */
    setupDefaultListeners() {
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
    addEventListener(eventType, listener) {
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
    removeEventListener(eventType, listener) {
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
    async emitEvent(eventType, data) {
        const event = {
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
            }
            catch (error) {
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
    handleTreeSelectionChange(event) {
        this.emitEvent(SkillsArchitectureEvent.TREE_SELECTION_CHANGED, {
            selection: event.selection
        });
    }
    /**
     * Handle tree visibility change
     */
    handleTreeVisibilityChange(event) {
        this.emitEvent(SkillsArchitectureEvent.TREE_VISIBILITY_CHANGED, {
            visible: event.visible
        });
    }
    /**
     * Handle workspace folders change
     */
    handleWorkspaceFoldersChange(event) {
        this.emitEvent(SkillsArchitectureEvent.WORKSPACE_CHANGED, {
            added: event.added,
            removed: event.removed
        });
    }
    /**
     * Handle skill file created
     */
    handleSkillFileCreated(uri) {
        this.emitEvent(SkillsArchitectureEvent.SKILL_CREATED, {
            uri: uri.toString(),
            path: uri.fsPath
        });
    }
    /**
     * Handle skill file changed
     */
    handleSkillFileChanged(uri) {
        this.emitEvent(SkillsArchitectureEvent.SKILL_UPDATED, {
            uri: uri.toString(),
            path: uri.fsPath
        });
    }
    /**
     * Handle skill file deleted
     */
    handleSkillFileDeleted(uri) {
        this.emitEvent(SkillsArchitectureEvent.SKILL_DELETED, {
            uri: uri.toString(),
            path: uri.fsPath
        });
    }
    /**
     * Handle configuration change
     */
    handleConfigurationChange(event) {
        this.emitEvent(SkillsArchitectureEvent.CONFIGURATION_CHANGED, {
            affectedSections: ['skillsArchitecture']
        });
    }
    /**
     * Add event to history
     */
    addToHistory(event) {
        this.eventHistory.push(event);
        // Maintain history size limit
        if (this.eventHistory.length > this.maxHistorySize) {
            this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
        }
    }
    /**
     * Get event history
     */
    getEventHistory(eventType, limit) {
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
    clearEventHistory() {
        this.eventHistory = [];
    }
    /**
     * Get listener count for an event type
     */
    getListenerCount(eventType) {
        return this.listeners.get(eventType)?.length || 0;
    }
    /**
     * Get all registered event types
     */
    getRegisteredEventTypes() {
        return Array.from(this.listeners.keys());
    }
    /**
     * Show notification to user
     */
    showNotification(message, type = 'info', actions) {
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
    async showProgress(title, task, cancellable = false) {
        return vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title,
            cancellable
        }, task);
    }
    /**
     * Show status bar message
     */
    showStatusBarMessage(message, timeout) {
        if (timeout !== undefined) {
            return vscode.window.setStatusBarMessage(message, timeout);
        }
        else {
            return vscode.window.setStatusBarMessage(message);
        }
    }
    /**
     * Create and show output channel
     */
    createOutputChannel(name) {
        return vscode.window.createOutputChannel(name);
    }
    /**
     * Dispose of all event listeners
     */
    dispose() {
        this.listeners.clear();
        this.eventHistory = [];
    }
    /**
     * Debug method to log all events
     */
    enableEventLogging() {
        const disposables = [];
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
    getEventStatistics() {
        const stats = {};
        this.eventHistory.forEach(event => {
            stats[event.type] = (stats[event.type] || 0) + 1;
        });
        return stats;
    }
    /**
     * Trigger auto-sync if enabled
     */
    triggerAutoSync() {
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
exports.EventManager = EventManager;
//# sourceMappingURL=eventManager.js.map