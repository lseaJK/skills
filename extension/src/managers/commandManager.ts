import * as vscode from 'vscode';
import { SkillsArchitectureExtension } from '../skillsArchitectureExtension';

/**
 * Manages all commands for the Skills Architecture extension
 */
export class CommandManager {
    private commands: Map<string, vscode.Disposable> = new Map();
    private extension: SkillsArchitectureExtension | null = null;

    constructor(private context: vscode.ExtensionContext) {}

    /**
     * Initialize the command manager
     */
    async initialize(extension: SkillsArchitectureExtension): Promise<void> {
        this.extension = extension;
        this.registerCommands();
        console.log('Command manager initialized with', this.commands.size, 'commands');
    }

    /**
     * Register all extension commands
     */
    private registerCommands(): void {
        // Main panel commands
        this.registerCommand('skillsArchitecture.showSkillPanel', this.showSkillPanel.bind(this));
        this.registerCommand('skillsArchitecture.refreshSkills', this.refreshSkills.bind(this));

        // Skill management commands
        this.registerCommand('skillsArchitecture.createSkill', this.createSkill.bind(this));
        this.registerCommand('skillsArchitecture.editSkill', this.editSkill.bind(this));
        this.registerCommand('skillsArchitecture.deleteSkill', this.deleteSkill.bind(this));
        this.registerCommand('skillsArchitecture.testSkill', this.testSkill.bind(this));

        // Import/Export commands
        this.registerCommand('skillsArchitecture.exportSkill', this.exportSkill.bind(this));
        this.registerCommand('skillsArchitecture.importSkill', this.importSkill.bind(this));

        // Configuration commands
        this.registerCommand('skillsArchitecture.openSettings', this.openSettings.bind(this));
        this.registerCommand('skillsArchitecture.resetConfiguration', this.resetConfiguration.bind(this));

        // Debug commands
        this.registerCommand('skillsArchitecture.toggleDebugMode', this.toggleDebugMode.bind(this));
        this.registerCommand('skillsArchitecture.showLogs', this.showLogs.bind(this));

        console.log('Registered commands:', Array.from(this.commands.keys()));
    }

    /**
     * Register a single command
     */
    private registerCommand(commandId: string, callback: (...args: any[]) => any): void {
        const disposable = vscode.commands.registerCommand(commandId, callback);
        this.commands.set(commandId, disposable);
        this.context.subscriptions.push(disposable);
    }

    /**
     * Show the skills panel
     */
    private async showSkillPanel(): Promise<void> {
        try {
            await vscode.commands.executeCommand('workbench.view.explorer');
            await vscode.commands.executeCommand('skillsExplorer.focus');
            
            this.extension?.getConfigurationManager().debug('Skills panel shown');
        } catch (error) {
            console.error('Failed to show skills panel:', error);
            vscode.window.showErrorMessage(`Failed to show skills panel: ${error}`);
        }
    }

    /**
     * Refresh the skills tree
     */
    private async refreshSkills(): Promise<void> {
        try {
            await this.extension?.getSkillsTreeProvider().refresh();
            vscode.window.showInformationMessage('Skills refreshed successfully');
            
            this.extension?.getConfigurationManager().debug('Skills refreshed');
        } catch (error) {
            console.error('Failed to refresh skills:', error);
            vscode.window.showErrorMessage(`Failed to refresh skills: ${error}`);
        }
    }

    /**
     * Create a new skill
     */
    private async createSkill(): Promise<void> {
        try {
            // Show input box for skill name
            const skillName = await vscode.window.showInputBox({
                prompt: 'Enter skill name',
                placeHolder: 'my-awesome-skill',
                validateInput: (value) => {
                    if (!value || value.trim() === '') {
                        return 'Skill name cannot be empty';
                    }
                    if (!/^[a-zA-Z0-9-_]+$/.test(value)) {
                        return 'Skill name can only contain letters, numbers, hyphens, and underscores';
                    }
                    return null;
                }
            });

            if (!skillName) {
                return; // User cancelled
            }

            // Show quick pick for skill layer
            const layerOptions = [
                { label: 'Layer 1', description: 'Function calls - Direct atomic operations', value: 1 },
                { label: 'Layer 2', description: 'Sandbox tools - Command line programs and tools', value: 2 },
                { label: 'Layer 3', description: 'Wrapper APIs - High-level programming and execution code', value: 3 }
            ];

            const selectedLayer = await vscode.window.showQuickPick(layerOptions, {
                placeHolder: 'Select skill layer',
                canPickMany: false
            });

            if (!selectedLayer) {
                return; // User cancelled
            }

            // Create the skill using the tree provider
            const skill = await this.extension?.getSkillsTreeProvider().createSkill(skillName, selectedLayer.value);
            
            if (skill) {
                vscode.window.showInformationMessage(`Skill "${skillName}" created successfully`);
                
                // Ask if user wants to edit the skill immediately
                const editAction = 'Edit Now';
                const choice = await vscode.window.showInformationMessage(
                    `Skill "${skillName}" created. Would you like to edit it now?`,
                    editAction
                );

                if (choice === editAction) {
                    await this.editSkill(skill.id);
                }
            }

            this.extension?.getConfigurationManager().debug('Skill created:', skillName);
        } catch (error) {
            console.error('Failed to create skill:', error);
            vscode.window.showErrorMessage(`Failed to create skill: ${error}`);
        }
    }

    /**
     * Edit a skill
     */
    private async editSkill(skillId?: string): Promise<void> {
        try {
            if (!skillId) {
                // Show skill picker if no ID provided
                const skills = await this.extension?.getSkillsTreeProvider().getAllSkills() || [];
                
                if (skills.length === 0) {
                    vscode.window.showInformationMessage('No skills available to edit. Create a skill first.');
                    return;
                }

                const skillOptions = skills.map(skill => ({
                    label: skill.name,
                    description: `Layer ${skill.layer} - ${skill.description}`,
                    skillId: skill.id
                }));

                const selectedSkill = await vscode.window.showQuickPick(skillOptions, {
                    placeHolder: 'Select skill to edit',
                    canPickMany: false
                });

                if (!selectedSkill) {
                    return; // User cancelled
                }

                skillId = selectedSkill.skillId;
            }

            // Open the skill in the custom editor
            const skillPath = await this.extension?.getSkillsTreeProvider().getSkillPath(skillId);
            if (skillPath) {
                const uri = vscode.Uri.file(skillPath);
                await vscode.commands.executeCommand('vscode.openWith', uri, 'skillsArchitecture.skillEditor');
            }

            this.extension?.getConfigurationManager().debug('Skill editor opened for:', skillId);
        } catch (error) {
            console.error('Failed to edit skill:', error);
            vscode.window.showErrorMessage(`Failed to edit skill: ${error}`);
        }
    }

    /**
     * Delete a skill
     */
    private async deleteSkill(skillId?: string): Promise<void> {
        try {
            if (!skillId) {
                vscode.window.showErrorMessage('No skill selected for deletion');
                return;
            }

            const skill = await this.extension?.getSkillsTreeProvider().getSkill(skillId);
            if (!skill) {
                vscode.window.showErrorMessage('Skill not found');
                return;
            }

            // Confirm deletion
            const confirmAction = 'Delete';
            const choice = await vscode.window.showWarningMessage(
                `Are you sure you want to delete skill "${skill.name}"? This action cannot be undone.`,
                { modal: true },
                confirmAction
            );

            if (choice === confirmAction) {
                await this.extension?.getSkillsTreeProvider().deleteSkill(skillId);
                vscode.window.showInformationMessage(`Skill "${skill.name}" deleted successfully`);
            }

            this.extension?.getConfigurationManager().debug('Skill deleted:', skillId);
        } catch (error) {
            console.error('Failed to delete skill:', error);
            vscode.window.showErrorMessage(`Failed to delete skill: ${error}`);
        }
    }

    /**
     * Test a skill
     */
    private async testSkill(skillId?: string): Promise<void> {
        try {
            if (!skillId) {
                vscode.window.showErrorMessage('No skill selected for testing');
                return;
            }

            const skill = await this.extension?.getSkillsTreeProvider().getSkill(skillId);
            if (!skill) {
                vscode.window.showErrorMessage('Skill not found');
                return;
            }

            // Show progress while testing
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Testing skill "${skill.name}"...`,
                cancellable: false
            }, async (progress) => {
                progress.report({ increment: 0 });

                const testResult = await this.extension?.getSkillsTreeProvider().testSkill(skillId);
                
                progress.report({ increment: 100 });

                if (testResult?.passed) {
                    vscode.window.showInformationMessage(`Skill "${skill.name}" passed all tests`);
                } else {
                    vscode.window.showWarningMessage(`Skill "${skill.name}" failed some tests`);
                }

                // Show detailed results in output channel
                this.showTestResults(skill.name, testResult);
            });

            this.extension?.getConfigurationManager().debug('Skill tested:', skillId);
        } catch (error) {
            console.error('Failed to test skill:', error);
            vscode.window.showErrorMessage(`Failed to test skill: ${error}`);
        }
    }

    /**
     * Export a skill
     */
    private async exportSkill(skillId?: string): Promise<void> {
        try {
            if (!skillId) {
                vscode.window.showErrorMessage('No skill selected for export');
                return;
            }

            const skill = await this.extension?.getSkillsTreeProvider().getSkill(skillId);
            if (!skill) {
                vscode.window.showErrorMessage('Skill not found');
                return;
            }

            // Show save dialog
            const uri = await vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.file(`${skill.name}.skill.json`),
                filters: {
                    'Skill Files': ['skill.json', 'json'],
                    'All Files': ['*']
                }
            });

            if (uri) {
                const skillData = JSON.stringify(skill, null, 2);
                await vscode.workspace.fs.writeFile(uri, Buffer.from(skillData, 'utf8'));
                vscode.window.showInformationMessage(`Skill "${skill.name}" exported successfully`);
            }

            this.extension?.getConfigurationManager().debug('Skill exported:', skillId);
        } catch (error) {
            console.error('Failed to export skill:', error);
            vscode.window.showErrorMessage(`Failed to export skill: ${error}`);
        }
    }

    /**
     * Import a skill
     */
    private async importSkill(): Promise<void> {
        try {
            // Show open dialog
            const uris = await vscode.window.showOpenDialog({
                canSelectMany: false,
                filters: {
                    'Skill Files': ['skill.json', 'json'],
                    'All Files': ['*']
                }
            });

            if (uris && uris.length > 0) {
                const uri = uris[0];
                const skillData = await vscode.workspace.fs.readFile(uri);
                const skillJson = Buffer.from(skillData).toString('utf8');
                
                const skill = await this.extension?.getSkillsTreeProvider().importSkill(skillJson);
                
                if (skill) {
                    vscode.window.showInformationMessage(`Skill "${skill.name}" imported successfully`);
                }
            }

            this.extension?.getConfigurationManager().debug('Skill imported');
        } catch (error) {
            console.error('Failed to import skill:', error);
            vscode.window.showErrorMessage(`Failed to import skill: ${error}`);
        }
    }

    /**
     * Open extension settings
     */
    private async openSettings(): Promise<void> {
        await vscode.commands.executeCommand('workbench.action.openSettings', 'skillsArchitecture');
    }

    /**
     * Reset configuration to defaults
     */
    private async resetConfiguration(): Promise<void> {
        const confirmAction = 'Reset';
        const choice = await vscode.window.showWarningMessage(
            'Are you sure you want to reset all Skills Architecture settings to defaults?',
            { modal: true },
            confirmAction
        );

        if (choice === confirmAction) {
            await this.extension?.getConfigurationManager().resetToDefaults();
        }
    }

    /**
     * Toggle debug mode
     */
    private async toggleDebugMode(): Promise<void> {
        const configManager = this.extension?.getConfigurationManager();
        if (configManager) {
            const currentMode = configManager.isDebugMode();
            await configManager.update('debugMode', !currentMode);
            
            const status = !currentMode ? 'enabled' : 'disabled';
            vscode.window.showInformationMessage(`Debug mode ${status}`);
        }
    }

    /**
     * Show extension logs
     */
    private showLogs(): void {
        // Create or show output channel
        const outputChannel = vscode.window.createOutputChannel('Skills Architecture');
        outputChannel.show();
        outputChannel.appendLine('Skills Architecture Extension Logs');
        outputChannel.appendLine('=====================================');
        outputChannel.appendLine(`Extension activated at: ${new Date().toISOString()}`);
        outputChannel.appendLine(`Configuration: ${JSON.stringify(this.extension?.getConfigurationManager().getConfiguration(), null, 2)}`);
    }

    /**
     * Show test results in output channel
     */
    private showTestResults(skillName: string, testResult: any): void {
        const outputChannel = vscode.window.createOutputChannel(`Skills Architecture - Test Results`);
        outputChannel.clear();
        outputChannel.show();
        
        outputChannel.appendLine(`Test Results for Skill: ${skillName}`);
        outputChannel.appendLine('='.repeat(50));
        outputChannel.appendLine(`Overall Result: ${testResult?.passed ? 'PASSED' : 'FAILED'}`);
        outputChannel.appendLine('');
        
        if (testResult?.results) {
            testResult.results.forEach((result: any, index: number) => {
                outputChannel.appendLine(`Test ${index + 1}: ${result.name}`);
                outputChannel.appendLine(`  Status: ${result.passed ? 'PASSED' : 'FAILED'}`);
                outputChannel.appendLine(`  Duration: ${result.duration}ms`);
                outputChannel.appendLine(`  Output: ${result.output}`);
                outputChannel.appendLine('');
            });
        }
        
        if (testResult?.coverage) {
            outputChannel.appendLine('Coverage:');
            outputChannel.appendLine(`  Lines: ${testResult.coverage.lines}%`);
            outputChannel.appendLine(`  Functions: ${testResult.coverage.functions}%`);
            outputChannel.appendLine(`  Branches: ${testResult.coverage.branches}%`);
            outputChannel.appendLine(`  Statements: ${testResult.coverage.statements}%`);
        }
    }

    /**
     * Execute a command by ID
     */
    async executeCommand(commandId: string, ...args: any[]): Promise<any> {
        return vscode.commands.executeCommand(commandId, ...args);
    }

    /**
     * Check if a command is registered
     */
    hasCommand(commandId: string): boolean {
        return this.commands.has(commandId);
    }

    /**
     * Get all registered command IDs
     */
    getRegisteredCommands(): string[] {
        return Array.from(this.commands.keys());
    }

    /**
     * Dispose of all commands
     */
    dispose(): void {
        this.commands.forEach(disposable => disposable.dispose());
        this.commands.clear();
    }
}