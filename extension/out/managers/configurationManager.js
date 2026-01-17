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
exports.ConfigurationManager = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
/**
 * Manages extension configuration and settings
 */
class ConfigurationManager {
    constructor(context) {
        this.context = context;
        this.configuration = this.loadConfiguration();
    }
    /**
     * Initialize the configuration manager
     */
    async initialize() {
        // Ensure skills directory exists
        await this.ensureSkillsDirectory();
        // Validate configuration
        this.validateConfiguration();
        console.log('Configuration manager initialized with settings:', this.configuration);
    }
    /**
     * Load configuration from VS Code settings
     */
    loadConfiguration() {
        const config = vscode.workspace.getConfiguration(ConfigurationManager.CONFIGURATION_SECTION);
        return {
            enabled: config.get('enabled', true),
            skillsPath: config.get('skillsPath', '.skills'),
            autoSave: config.get('autoSave', false),
            autoValidate: config.get('autoValidate', true),
            showPreview: config.get('showPreview', true),
            enabledLayers: config.get('enabledLayers', [1, 2, 3]),
            debugMode: config.get('debugMode', false)
        };
    }
    /**
     * Validate the current configuration
     */
    validateConfiguration() {
        const errors = [];
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
    async ensureSkillsDirectory() {
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
        }
        catch (error) {
            // Directory doesn't exist, create it
            try {
                await vscode.workspace.fs.createDirectory(vscode.Uri.file(skillsPath));
                console.log(`Created skills directory: ${skillsPath}`);
            }
            catch (createError) {
                console.error(`Failed to create skills directory: ${createError}`);
                vscode.window.showWarningMessage(`Could not create skills directory: ${skillsPath}`);
            }
        }
    }
    /**
     * Handle configuration changes
     */
    handleConfigurationChange(event) {
        if (event.affectsConfiguration(ConfigurationManager.CONFIGURATION_SECTION)) {
            const oldConfig = { ...this.configuration };
            this.configuration = this.loadConfiguration();
            try {
                this.validateConfiguration();
                this.onConfigurationChanged(oldConfig, this.configuration);
            }
            catch (error) {
                console.error('Configuration validation failed after change:', error);
                // Revert to old configuration
                this.configuration = oldConfig;
            }
        }
    }
    /**
     * Called when configuration changes
     */
    onConfigurationChanged(oldConfig, newConfig) {
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
    getConfiguration() {
        return { ...this.configuration };
    }
    /**
     * Get a specific configuration value
     */
    get(key) {
        return this.configuration[key];
    }
    /**
     * Update a configuration value
     */
    async update(key, value, target = vscode.ConfigurationTarget.Workspace) {
        const config = vscode.workspace.getConfiguration(ConfigurationManager.CONFIGURATION_SECTION);
        await config.update(key, value, target);
        // Configuration will be reloaded via the change event
    }
    /**
     * Get the skills path relative to workspace
     */
    getSkillsPath() {
        return this.configuration.skillsPath;
    }
    /**
     * Get the absolute skills path
     */
    getAbsoluteSkillsPath() {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            return undefined;
        }
        return path.join(workspaceFolder.uri.fsPath, this.configuration.skillsPath);
    }
    /**
     * Check if this is the first time the extension is being used
     */
    isFirstTime() {
        return this.context.globalState.get(ConfigurationManager.FIRST_TIME_KEY, true);
    }
    /**
     * Set the first time flag
     */
    setFirstTime(value) {
        this.context.globalState.update(ConfigurationManager.FIRST_TIME_KEY, value);
    }
    /**
     * Reset configuration to defaults
     */
    async resetToDefaults() {
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
    exportConfiguration() {
        return JSON.stringify(this.configuration, null, 2);
    }
    /**
     * Import configuration from JSON
     */
    async importConfiguration(configJson) {
        try {
            const importedConfig = JSON.parse(configJson);
            const config = vscode.workspace.getConfiguration(ConfigurationManager.CONFIGURATION_SECTION);
            // Update each setting that exists in the imported config
            const updates = [];
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
        }
        catch (error) {
            const message = `Failed to import configuration: ${error}`;
            vscode.window.showErrorMessage(message);
            throw new Error(message);
        }
    }
    /**
     * Get configuration for a specific layer
     */
    isLayerEnabled(layer) {
        return this.configuration.enabledLayers.includes(layer);
    }
    /**
     * Get debug mode status
     */
    isDebugMode() {
        return this.configuration.debugMode;
    }
    /**
     * Log debug message if debug mode is enabled
     */
    debug(message, ...args) {
        if (this.configuration.debugMode) {
            console.log(`[Skills Architecture Debug] ${message}`, ...args);
        }
    }
}
exports.ConfigurationManager = ConfigurationManager;
ConfigurationManager.CONFIGURATION_SECTION = 'skillsArchitecture';
ConfigurationManager.FIRST_TIME_KEY = 'skillsArchitecture.firstTime';
//# sourceMappingURL=configurationManager.js.map