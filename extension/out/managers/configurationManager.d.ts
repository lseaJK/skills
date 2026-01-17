import * as vscode from 'vscode';
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
export declare class ConfigurationManager {
    private context;
    private static readonly CONFIGURATION_SECTION;
    private static readonly FIRST_TIME_KEY;
    private configuration;
    constructor(context: vscode.ExtensionContext);
    /**
     * Initialize the configuration manager
     */
    initialize(): Promise<void>;
    /**
     * Load configuration from VS Code settings
     */
    private loadConfiguration;
    /**
     * Validate the current configuration
     */
    private validateConfiguration;
    /**
     * Ensure the skills directory exists
     */
    private ensureSkillsDirectory;
    /**
     * Handle configuration changes
     */
    handleConfigurationChange(event: vscode.ConfigurationChangeEvent): void;
    /**
     * Called when configuration changes
     */
    private onConfigurationChanged;
    /**
     * Get the current configuration
     */
    getConfiguration(): ExtensionConfiguration;
    /**
     * Get a specific configuration value
     */
    get<T extends keyof ExtensionConfiguration>(key: T): ExtensionConfiguration[T];
    /**
     * Update a configuration value
     */
    update<T extends keyof ExtensionConfiguration>(key: T, value: ExtensionConfiguration[T], target?: vscode.ConfigurationTarget): Promise<void>;
    /**
     * Get the skills path relative to workspace
     */
    getSkillsPath(): string;
    /**
     * Get the absolute skills path
     */
    getAbsoluteSkillsPath(): string | undefined;
    /**
     * Check if this is the first time the extension is being used
     */
    isFirstTime(): boolean;
    /**
     * Set the first time flag
     */
    setFirstTime(value: boolean): void;
    /**
     * Reset configuration to defaults
     */
    resetToDefaults(): Promise<void>;
    /**
     * Export current configuration
     */
    exportConfiguration(): string;
    /**
     * Import configuration from JSON
     */
    importConfiguration(configJson: string): Promise<void>;
    /**
     * Get configuration for a specific layer
     */
    isLayerEnabled(layer: number): boolean;
    /**
     * Get debug mode status
     */
    isDebugMode(): boolean;
    /**
     * Log debug message if debug mode is enabled
     */
    debug(message: string, ...args: any[]): void;
}
//# sourceMappingURL=configurationManager.d.ts.map