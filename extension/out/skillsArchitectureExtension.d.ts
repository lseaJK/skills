import * as vscode from 'vscode';
import { SkillsTreeDataProvider } from './providers/skillsTreeDataProvider';
import { SkillEditorProvider } from './providers/skillEditorProvider';
import { ConfigurationManager } from './managers/configurationManager';
import { CommandManager } from './managers/commandManager';
import { EventManager } from './managers/eventManager';
/**
 * Main extension class that coordinates all components
 */
export declare class SkillsArchitectureExtension {
    private context;
    private configurationManager;
    private commandManager;
    private eventManager;
    private skillsTreeProvider;
    private skillEditorProvider;
    private treeView;
    private disposables;
    constructor(context: vscode.ExtensionContext);
    /**
     * Initialize the extension
     */
    initialize(): Promise<void>;
    /**
     * Register providers with VS Code
     */
    private registerProviders;
    /**
     * Register event handlers
     */
    private registerEventHandlers;
    /**
     * Show welcome message for first-time users
     */
    private showWelcomeMessage;
    /**
     * Get the configuration manager
     */
    getConfigurationManager(): ConfigurationManager;
    /**
     * Get the command manager
     */
    getCommandManager(): CommandManager;
    /**
     * Get the event manager
     */
    getEventManager(): EventManager;
    /**
     * Get the skills tree provider
     */
    getSkillsTreeProvider(): SkillsTreeDataProvider;
    /**
     * Get the skill editor provider
     */
    getSkillEditorProvider(): SkillEditorProvider;
    /**
     * Get the tree view
     */
    getTreeView(): vscode.TreeView<any>;
    /**
     * Refresh all components
     */
    refresh(): Promise<void>;
    /**
     * Dispose of all resources
     */
    dispose(): void;
}
//# sourceMappingURL=skillsArchitectureExtension.d.ts.map