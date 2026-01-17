import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Configuration interface for the extension
 */
export interface ExtensionConfiguration {
    enabled: boolean;
    skillsPath: string;
    autoSave: boolean;
    autoValidate: boolean;
    showPreview: boolean;
    enabledLayers: number[];
    debugMode: boolean;
}

/**
 * Manages extension configuration and settings
 */
export class ConfigurationManager {
    private static readonly CONFIGURATION_SECTION = 'skillsArchitecture';
    private static readonly FIRST_TIME_KEY = 'skillsArchitecture.firstTime';
    
    private configuration: ExtensionConfiguration;

    constructor(private context: vscode.ExtensionContext) {
        this.configuration = this.loadConfiguration();
    }

    /**
     * Initialize the configuration manager
     */
    async initialize(): Promise<void> {
        // Ensure skills directory exists
        await this.ensureSkillsDirectory();
        
        // Validate configuration
        this.validateConfiguration();
        
        console.log('Configuration manager initialized with settings:', this.configuration);
    }

    /**
     * Load configuration from VS Code settings
     */
    private loadConfiguration(): ExtensionConfiguration {
        const config = vscode.workspace.getConfiguration(ConfigurationManager.CONFIGURATION_SECTION);
        
        return {
            enabled: config.get<boolean>('enabled', true),
            skillsPath: config.get<string>('skillsPath', '.skills'),
            autoSave: config.get<boolean>('autoSave', false),
            autoValidate: config.get<boolean>('autoValidate', true),
            showPreview: config.get<boolean>('showPreview', true),
            enabledLayers: config.get<number[]>('enabledLayers', [1, 2, 3]),
            debugMode: config.get<boolean>('debugMode', false)
        };
    }

    /**
     * Validate the current configuration
     */
    private validateConfiguration(): void {
        const errors: string[] = [];

        // Validate enabled layers
        if (!Array.isArray(this.configuration.enabledLayers) || this.configuration.enabledLayers.length === 0) {
            errors.push('At least one layer must be enabled');
        }

        for (const layer of this.configuration.enabledLayers) {
            if (layer < 1 || layer > 3) {
                errors.push(`Invalid layer number: ${layer}. Must be 1, 2, or 3`);
            }
        }

        // Validate skills path
        if (!this.configuration.skillsPath || this.configuration.skillsPath.trim() === '') {
            errors.push('Skills path cannot be empty');
        }

        if (errors.length > 0) {
            const message = `Configuration validation failed:\n${errors.join('\n')}`;
            vscode.window.showErrorMessage(message);
            throw new Error(message);
        }
    }

    /**
     * Ensure the skills directory exists
     */
    private async ensureSkillsDirectory(): Promise<void> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            return; // No workspace open
        }

        const skillsPath = this.getAbsoluteSkillsPath();
        if (!skillsPath) {
            return;
        }

        try {
            await vscode.workspace.fs.stat(vscode.Uri.file(skillsPath));
        } catch (error) {
            // Directory doesn't exist, create it
            try {
                await vscode.workspace.fs.createDirectory(vscode.Uri.file(skillsPath));
                console.log(`Created skills directory: ${skillsPath}`);
            } catch (createError) {
                console.error(`Failed to create skills directory: ${createError}`);
                vscode.window.showWarningMessage(`Could not create skills directory: ${skillsPath}`);
            }
        }
    }

    /**
     * Handle configuration changes
     */
    handleConfigurationChange(event: vscode.ConfigurationChangeEvent): void {
        if (event.affectsConfiguration(ConfigurationManager.CONFIGURATION_SECTION)) {
            const oldConfig = { ...this.configuration };
            this.configuration = this.loadConfiguration();
            
            try {
                this.validateConfiguration();
                this.onConfigurationChanged(oldConfig, this.configuration);
            } catch (error) {
                console.error('Configuration validation failed after change:', error);
                // Revert to old configuration
                this.configuration = oldConfig;
            }
        }
    }

    /**
     * Called when configuration changes
     */
    private onConfigurationChanged(oldConfig: ExtensionConfiguration, newConfig: ExtensionConfiguration): void {
        console.log('Configuration changed:', { oldConfig, newConfig });

        // Handle specific configuration changes
        if (oldConfig.skillsPath !== newConfig.skillsPath) {
            this.ensureSkillsDirectory();
            // Trigger skills refresh
            vscode.commands.executeCommand('skillsArchitecture.refreshSkills');
        }

        if (oldConfig.enabled !== newConfig.enabled) {
            vscode.commands.executeCommand('setContext', 'skillsArchitecture.enabled', newConfig.enabled);
        }

        if (oldConfig.debugMode !== newConfig.debugMode) {
            console.log(`Debug mode ${newConfig.debugMode ? 'enabled' : 'disabled'}`);
        }
    }

    /**
     * Get the current configuration
     */
    getConfiguration(): ExtensionConfiguration {
        return { ...this.configuration };
    }

    /**
     * Get a specific configuration value
     */
    get<T extends keyof ExtensionConfiguration>(key: T): ExtensionConfiguration[T] {
        return this.configuration[key];
    }

    /**
     * Update a configuration value
     */
    async update<T extends keyof ExtensionConfiguration>(
        key: T, 
        value: ExtensionConfiguration[T], 
        target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Workspace
    ): Promise<void> {
        const config = vscode.workspace.getConfiguration(ConfigurationManager.CONFIGURATION_SECTION);
        await config.update(key, value, target);
        // Configuration will be reloaded via the change event
    }

    /**
     * Get the skills path relative to workspace
     */
    getSkillsPath(): string {
        return this.configuration.skillsPath;
    }

    /**
     * Get the absolute skills path
     */
    getAbsoluteSkillsPath(): string | undefined {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            return undefined;
        }

        return path.join(workspaceFolder.uri.fsPath, this.configuration.skillsPath);
    }

    /**
     * Check if this is the first time the extension is being used
     */
    isFirstTime(): boolean {
        return this.context.globalState.get<boolean>(ConfigurationManager.FIRST_TIME_KEY, true);
    }

    /**
     * Set the first time flag
     */
    setFirstTime(value: boolean): void {
        this.context.globalState.update(ConfigurationManager.FIRST_TIME_KEY, value);
    }

    /**
     * Reset configuration to defaults
     */
    async resetToDefaults(): Promise<void> {
        const config = vscode.workspace.getConfiguration(ConfigurationManager.CONFIGURATION_SECTION);
        
        await Promise.all([
            config.update('enabled', undefined, vscode.ConfigurationTarget.Workspace),
            config.update('skillsPath', undefined, vscode.ConfigurationTarget.Workspace),
            config.update('autoSave', undefined, vscode.ConfigurationTarget.Workspace),
            config.update('autoValidate', undefined, vscode.ConfigurationTarget.Workspace),
            config.update('showPreview', undefined, vscode.ConfigurationTarget.Workspace),
            config.update('enabledLayers', undefined, vscode.ConfigurationTarget.Workspace),
            config.update('debugMode', undefined, vscode.ConfigurationTarget.Workspace)
        ]);

        vscode.window.showInformationMessage('Configuration reset to defaults');
    }

    /**
     * Export current configuration
     */
    exportConfiguration(): string {
        return JSON.stringify(this.configuration, null, 2);
    }

    /**
     * Import configuration from JSON
     */
    async importConfiguration(configJson: string): Promise<void> {
        try {
            const importedConfig = JSON.parse(configJson) as Partial<ExtensionConfiguration>;
            const config = vscode.workspace.getConfiguration(ConfigurationManager.CONFIGURATION_SECTION);

            // Update each setting that exists in the imported config
            const updates: Promise<void>[] = [];
            
            if (importedConfig.enabled !== undefined) {
                updates.push(config.update('enabled', importedConfig.enabled, vscode.ConfigurationTarget.Workspace));
            }
            if (importedConfig.skillsPath !== undefined) {
                updates.push(config.update('skillsPath', importedConfig.skillsPath, vscode.ConfigurationTarget.Workspace));
            }
            if (importedConfig.autoSave !== undefined) {
                updates.push(config.update('autoSave', importedConfig.autoSave, vscode.ConfigurationTarget.Workspace));
            }
            if (importedConfig.autoValidate !== undefined) {
                updates.push(config.update('autoValidate', importedConfig.autoValidate, vscode.ConfigurationTarget.Workspace));
            }
            if (importedConfig.showPreview !== undefined) {
                updates.push(config.update('showPreview', importedConfig.showPreview, vscode.ConfigurationTarget.Workspace));
            }
            if (importedConfig.enabledLayers !== undefined) {
                updates.push(config.update('enabledLayers', importedConfig.enabledLayers, vscode.ConfigurationTarget.Workspace));
            }
            if (importedConfig.debugMode !== undefined) {
                updates.push(config.update('debugMode', importedConfig.debugMode, vscode.ConfigurationTarget.Workspace));
            }

            await Promise.all(updates);
            vscode.window.showInformationMessage('Configuration imported successfully');

        } catch (error) {
            const message = `Failed to import configuration: ${error}`;
            vscode.window.showErrorMessage(message);
            throw new Error(message);
        }
    }

    /**
     * Get configuration for a specific layer
     */
    isLayerEnabled(layer: number): boolean {
        return this.configuration.enabledLayers.includes(layer);
    }

    /**
     * Get debug mode status
     */
    isDebugMode(): boolean {
        return this.configuration.debugMode;
    }

    /**
     * Log debug message if debug mode is enabled
     */
    debug(message: string, ...args: any[]): void {
        if (this.configuration.debugMode) {
            console.log(`[Skills Architecture Debug] ${message}`, ...args);
        }
    }
}