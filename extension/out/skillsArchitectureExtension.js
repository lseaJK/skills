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
exports.SkillsArchitectureExtension = void 0;
const vscode = __importStar(require("vscode"));
const skillsTreeDataProvider_1 = require("./providers/skillsTreeDataProvider");
const skillEditorProvider_1 = require("./providers/skillEditorProvider");
const configurationManager_1 = require("./managers/configurationManager");
const commandManager_1 = require("./managers/commandManager");
const eventManager_1 = require("./managers/eventManager");
const skillRegistry_1 = require("./core/skillRegistry");
/**
 * Main extension class that coordinates all components
 */
class SkillsArchitectureExtension {
    constructor(context) {
        this.context = context;
        this.disposables = [];
        // Initialize managers
        this.configurationManager = new configurationManager_1.ConfigurationManager(context);
        this.commandManager = new commandManager_1.CommandManager(context);
        this.eventManager = new eventManager_1.EventManager(context);
        this.skillRegistry = new skillRegistry_1.InMemorySkillRegistry();
        // Initialize providers
        this.skillsTreeProvider = new skillsTreeDataProvider_1.SkillsTreeDataProvider(context, this.configurationManager);
        this.skillEditorProvider = new skillEditorProvider_1.SkillEditorProvider(context, this.configurationManager, this.skillRegistry);
        // Create tree view
        this.treeView = vscode.window.createTreeView('skillsExplorer', {
            treeDataProvider: this.skillsTreeProvider,
            showCollapseAll: true,
            canSelectMany: false
        });
    }
    /**
     * Initialize the extension
     */
    async initialize() {
        try {
            // Set extension as enabled
            await vscode.commands.executeCommand('setContext', 'skillsArchitecture.enabled', true);
            // Initialize all components
            await this.configurationManager.initialize();
            await this.commandManager.initialize(this);
            await this.eventManager.initialize(this);
            await this.skillsTreeProvider.initialize();
            await this.skillEditorProvider.initialize();
            // Register providers and views
            this.registerProviders();
            this.registerEventHandlers();
            // Add disposables to context
            this.context.subscriptions.push(this.treeView, ...this.disposables);
            // Show welcome message if first time
            if (this.configurationManager.isFirstTime()) {
                this.showWelcomeMessage();
            }
            console.log('Skills Architecture extension initialized successfully');
        }
        catch (error) {
            console.error('Failed to initialize Skills Architecture extension:', error);
            throw error;
        }
    }
    /**
     * Register providers with VS Code
     */
    registerProviders() {
        // Register custom editor provider for skill files
        const skillEditorDisposable = vscode.window.registerCustomEditorProvider('skillsArchitecture.skillEditor', this.skillEditorProvider, {
            webviewOptions: {
                retainContextWhenHidden: true
            }
        });
        this.disposables.push(skillEditorDisposable);
    }
    /**
     * Register event handlers
     */
    registerEventHandlers() {
        // Tree view selection change
        const selectionDisposable = this.treeView.onDidChangeSelection(e => {
            this.eventManager.handleTreeSelectionChange(e);
        });
        // Tree view visibility change
        const visibilityDisposable = this.treeView.onDidChangeVisibility(e => {
            this.eventManager.handleTreeVisibilityChange(e);
        });
        // Configuration changes
        const configDisposable = vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('skillsArchitecture')) {
                this.configurationManager.handleConfigurationChange(e);
            }
        });
        // Workspace folder changes
        const workspaceDisposable = vscode.workspace.onDidChangeWorkspaceFolders(e => {
            this.eventManager.handleWorkspaceFoldersChange(e);
        });
        // File system changes
        const fileWatcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(vscode.workspace.workspaceFolders?.[0] || '', `${this.configurationManager.getSkillsPath()}/**/*.json`));
        const fileCreateDisposable = fileWatcher.onDidCreate(uri => {
            this.eventManager.handleSkillFileCreated(uri);
        });
        const fileChangeDisposable = fileWatcher.onDidChange(uri => {
            this.eventManager.handleSkillFileChanged(uri);
        });
        const fileDeleteDisposable = fileWatcher.onDidDelete(uri => {
            this.eventManager.handleSkillFileDeleted(uri);
        });
        this.disposables.push(selectionDisposable, visibilityDisposable, configDisposable, workspaceDisposable, fileWatcher, fileCreateDisposable, fileChangeDisposable, fileDeleteDisposable);
    }
    /**
     * Show welcome message for first-time users
     */
    showWelcomeMessage() {
        const message = 'Welcome to Universal Skills Architecture! Create your first skill to get started.';
        const createAction = 'Create Skill';
        const docsAction = 'View Documentation';
        vscode.window.showInformationMessage(message, createAction, docsAction)
            .then(selection => {
            if (selection === createAction) {
                vscode.commands.executeCommand('skillsArchitecture.createSkill');
            }
            else if (selection === docsAction) {
                vscode.env.openExternal(vscode.Uri.parse('https://github.com/skills-architecture/docs'));
            }
        });
        // Mark as no longer first time
        this.configurationManager.setFirstTime(false);
    }
    /**
     * Get the skill registry
     */
    getSkillRegistry() {
        return this.skillRegistry;
    }
    /**
     * Get the configuration manager
     */
    getConfigurationManager() {
        return this.configurationManager;
    }
    /**
     * Get the command manager
     */
    getCommandManager() {
        return this.commandManager;
    }
    /**
     * Get the event manager
     */
    getEventManager() {
        return this.eventManager;
    }
    /**
     * Get the skills tree provider
     */
    getSkillsTreeProvider() {
        return this.skillsTreeProvider;
    }
    /**
     * Get the skill editor provider
     */
    getSkillEditorProvider() {
        return this.skillEditorProvider;
    }
    /**
     * Get the tree view
     */
    getTreeView() {
        return this.treeView;
    }
    /**
     * Refresh all components
     */
    async refresh() {
        await this.skillsTreeProvider.refresh();
        // Refresh other components as needed
    }
    /**
     * Dispose of all resources
     */
    dispose() {
        this.disposables.forEach(disposable => disposable.dispose());
        this.disposables = [];
    }
}
exports.SkillsArchitectureExtension = SkillsArchitectureExtension;
//# sourceMappingURL=skillsArchitectureExtension.js.map