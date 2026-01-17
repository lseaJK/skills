import * as vscode from 'vscode';
import { SkillsTreeDataProvider } from './providers/skillsTreeDataProvider';
import { SkillEditorProvider } from './providers/skillEditorProvider';
import { ConfigurationManager } from './managers/configurationManager';
import { CommandManager } from './managers/commandManager';
import { EventManager } from './managers/eventManager';

/**
 * Main extension class that coordinates all components
 */
export class SkillsArchitectureExtension {
    private configurationManager: ConfigurationManager;
    private commandManager: CommandManager;
    private eventManager: EventManager;
    private skillsTreeProvider: SkillsTreeDataProvider;
    private skillEditorProvider: SkillEditorProvider;
    private treeView: vscode.TreeView<any>;
    private disposables: vscode.Disposable[] = [];

    constructor(private context: vscode.ExtensionContext) {
        // Initialize managers
        this.configurationManager = new ConfigurationManager(context);
        this.commandManager = new CommandManager(context);
        this.eventManager = new EventManager(context);
        
        // Initialize providers
        this.skillsTreeProvider = new SkillsTreeDataProvider(context, this.configurationManager);
        this.skillEditorProvider = new SkillEditorProvider(context, this.configurationManager);
        
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
    async initialize(): Promise<void> {
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
            this.context.subscriptions.push(
                this.treeView,
                ...this.disposables
            );

            // Show welcome message if first time
            if (this.configurationManager.isFirstTime()) {
                this.showWelcomeMessage();
            }

            console.log('Skills Architecture extension initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Skills Architecture extension:', error);
            throw error;
        }
    }

    /**
     * Register providers with VS Code
     */
    private registerProviders(): void {
        // Register custom editor provider for skill files
        const skillEditorDisposable = vscode.window.registerCustomEditorProvider(
            'skillsArchitecture.skillEditor',
            this.skillEditorProvider,
            {
                webviewOptions: {
                    retainContextWhenHidden: true
                }
            }
        );

        this.disposables.push(skillEditorDisposable);
    }

    /**
     * Register event handlers
     */
    private registerEventHandlers(): void {
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
        const fileWatcher = vscode.workspace.createFileSystemWatcher(
            new vscode.RelativePattern(
                vscode.workspace.workspaceFolders?.[0] || '',
                `${this.configurationManager.getSkillsPath()}/**/*.json`
            )
        );

        const fileCreateDisposable = fileWatcher.onDidCreate(uri => {
            this.eventManager.handleSkillFileCreated(uri);
        });

        const fileChangeDisposable = fileWatcher.onDidChange(uri => {
            this.eventManager.handleSkillFileChanged(uri);
        });

        const fileDeleteDisposable = fileWatcher.onDidDelete(uri => {
            this.eventManager.handleSkillFileDeleted(uri);
        });

        this.disposables.push(
            selectionDisposable,
            visibilityDisposable,
            configDisposable,
            workspaceDisposable,
            fileWatcher,
            fileCreateDisposable,
            fileChangeDisposable,
            fileDeleteDisposable
        );
    }

    /**
     * Show welcome message for first-time users
     */
    private showWelcomeMessage(): void {
        const message = 'Welcome to Universal Skills Architecture! Create your first skill to get started.';
        const createAction = 'Create Skill';
        const docsAction = 'View Documentation';

        vscode.window.showInformationMessage(message, createAction, docsAction)
            .then(selection => {
                if (selection === createAction) {
                    vscode.commands.executeCommand('skillsArchitecture.createSkill');
                } else if (selection === docsAction) {
                    vscode.env.openExternal(vscode.Uri.parse('https://github.com/skills-architecture/docs'));
                }
            });

        // Mark as no longer first time
        this.configurationManager.setFirstTime(false);
    }

    /**
     * Get the configuration manager
     */
    getConfigurationManager(): ConfigurationManager {
        return this.configurationManager;
    }

    /**
     * Get the command manager
     */
    getCommandManager(): CommandManager {
        return this.commandManager;
    }

    /**
     * Get the event manager
     */
    getEventManager(): EventManager {
        return this.eventManager;
    }

    /**
     * Get the skills tree provider
     */
    getSkillsTreeProvider(): SkillsTreeDataProvider {
        return this.skillsTreeProvider;
    }

    /**
     * Get the skill editor provider
     */
    getSkillEditorProvider(): SkillEditorProvider {
        return this.skillEditorProvider;
    }

    /**
     * Get the tree view
     */
    getTreeView(): vscode.TreeView<any> {
        return this.treeView;
    }

    /**
     * Refresh all components
     */
    async refresh(): Promise<void> {
        await this.skillsTreeProvider.refresh();
        // Refresh other components as needed
    }

    /**
     * Dispose of all resources
     */
    dispose(): void {
        this.disposables.forEach(disposable => disposable.dispose());
        this.disposables = [];
    }
}