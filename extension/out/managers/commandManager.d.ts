import * as vscode from 'vscode';
import { SkillsArchitectureExtension } from '../skillsArchitectureExtension';
/**
 * Manages all commands for the Skills Architecture extension
 */
export declare class CommandManager {
    private context;
    private commands;
    private extension;
    constructor(context: vscode.ExtensionContext);
    /**
     * Initialize the command manager
     */
    initialize(extension: SkillsArchitectureExtension): Promise<void>;
    /**
     * Register all extension commands
     */
    private registerCommands;
    /**
     * Register a single command
     */
    private registerCommand;
    /**
     * Show the skills panel
     */
    private showSkillPanel;
    /**
     * Refresh the skills tree
     */
    private refreshSkills;
    /**
     * Create a new skill
     */
    private createSkill;
    /**
     * Edit a skill
     */
    private editSkill;
    /**
     * Delete a skill
     */
    private deleteSkill;
    /**
     * Test a skill
     */
    private testSkill;
    /**
     * Export a skill
     */
    private exportSkill;
    /**
     * Import a skill
     */
    private importSkill;
    /**
     * Open extension settings
     */
    private openSettings;
    /**
     * Reset configuration to defaults
     */
    private resetConfiguration;
    /**
     * Toggle debug mode
     */
    private toggleDebugMode;
    /**
     * Search skills
     */
    private searchSkills;
    /**
     * Filter skills by layer
     */
    private filterByLayer;
    /**
     * Filter skills by category
     */
    private filterByCategory;
    /**
     * Clear all filters
     */
    private clearFilters;
    /**
     * Show detailed skill information
     */
    private showSkillDetails;
    /**
     * Show skill statistics
     */
    private showSkillStatistics;
    /**
     * Show test results in output channel
     */
    private showTestResults;
    /**
     * Show extension logs
     */
    private showLogs;
    /**
     * Generate HTML for skill details view
     */
    private getSkillDetailsHtml;
    /**
     * Generate HTML for skill statistics view
     */
    private getSkillStatisticsHtml;
    /**
     * Execute a command by ID
     */
    executeCommand(commandId: string, ...args: any[]): Promise<any>;
    /**
     * Check if a command is registered
     */
    hasCommand(commandId: string): boolean;
    /**
     * Get all registered command IDs
     */
    getRegisteredCommands(): string[];
    /**
     * Dispose of all commands
     */
    dispose(): void;
}
//# sourceMappingURL=commandManager.d.ts.map