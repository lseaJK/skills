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
exports.CommandManager = void 0;
const vscode = __importStar(require("vscode"));
/**
 * Manages all commands for the Skills Architecture extension
 */
class CommandManager {
    constructor(context) {
        this.context = context;
        this.commands = new Map();
        this.extension = null;
    }
    /**
     * Initialize the command manager
     */
    async initialize(extension) {
        this.extension = extension;
        this.registerCommands();
        console.log('Command manager initialized with', this.commands.size, 'commands');
    }
    /**
     * Register all extension commands
     */
    registerCommands() {
        // Main panel commands
        this.registerCommand('skillsArchitecture.showSkillPanel', this.showSkillPanel.bind(this));
        this.registerCommand('skillsArchitecture.refreshSkills', this.refreshSkills.bind(this));
        // Skill management commands
        this.registerCommand('skillsArchitecture.createSkill', this.createSkill.bind(this));
        this.registerCommand('skillsArchitecture.editSkill', this.editSkill.bind(this));
        this.registerCommand('skillsArchitecture.deleteSkill', this.deleteSkill.bind(this));
        this.registerCommand('skillsArchitecture.testSkill', this.testSkill.bind(this));
        // Search and filter commands
        this.registerCommand('skillsArchitecture.searchSkills', this.searchSkills.bind(this));
        this.registerCommand('skillsArchitecture.filterByLayer', this.filterByLayer.bind(this));
        this.registerCommand('skillsArchitecture.filterByCategory', this.filterByCategory.bind(this));
        this.registerCommand('skillsArchitecture.clearFilters', this.clearFilters.bind(this));
        this.registerCommand('skillsArchitecture.showSkillDetails', this.showSkillDetails.bind(this));
        this.registerCommand('skillsArchitecture.showSkillStatistics', this.showSkillStatistics.bind(this));
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
    registerCommand(commandId, callback) {
        const disposable = vscode.commands.registerCommand(commandId, callback);
        this.commands.set(commandId, disposable);
        this.context.subscriptions.push(disposable);
    }
    /**
     * Show the skills panel
     */
    async showSkillPanel() {
        try {
            await vscode.commands.executeCommand('workbench.view.explorer');
            await vscode.commands.executeCommand('skillsExplorer.focus');
            this.extension?.getConfigurationManager().debug('Skills panel shown');
        }
        catch (error) {
            console.error('Failed to show skills panel:', error);
            vscode.window.showErrorMessage(`Failed to show skills panel: ${error}`);
        }
    }
    /**
     * Refresh the skills tree
     */
    async refreshSkills() {
        try {
            await this.extension?.getSkillsTreeProvider().refresh();
            vscode.window.showInformationMessage('Skills refreshed successfully');
            this.extension?.getConfigurationManager().debug('Skills refreshed');
        }
        catch (error) {
            console.error('Failed to refresh skills:', error);
            vscode.window.showErrorMessage(`Failed to refresh skills: ${error}`);
        }
    }
    /**
     * Create a new skill
     */
    async createSkill() {
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
                const choice = await vscode.window.showInformationMessage(`Skill "${skillName}" created. Would you like to edit it now?`, editAction);
                if (choice === editAction) {
                    await this.editSkill(skill.id);
                }
            }
            this.extension?.getConfigurationManager().debug('Skill created:', skillName);
        }
        catch (error) {
            console.error('Failed to create skill:', error);
            vscode.window.showErrorMessage(`Failed to create skill: ${error}`);
        }
    }
    /**
     * Edit a skill
     */
    async editSkill(skillId) {
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
        }
        catch (error) {
            console.error('Failed to edit skill:', error);
            vscode.window.showErrorMessage(`Failed to edit skill: ${error}`);
        }
    }
    /**
     * Delete a skill
     */
    async deleteSkill(skillId) {
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
            const choice = await vscode.window.showWarningMessage(`Are you sure you want to delete skill "${skill.name}"? This action cannot be undone.`, { modal: true }, confirmAction);
            if (choice === confirmAction) {
                await this.extension?.getSkillsTreeProvider().deleteSkill(skillId);
                vscode.window.showInformationMessage(`Skill "${skill.name}" deleted successfully`);
            }
            this.extension?.getConfigurationManager().debug('Skill deleted:', skillId);
        }
        catch (error) {
            console.error('Failed to delete skill:', error);
            vscode.window.showErrorMessage(`Failed to delete skill: ${error}`);
        }
    }
    /**
     * Test a skill
     */
    async testSkill(skillId) {
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
                }
                else {
                    vscode.window.showWarningMessage(`Skill "${skill.name}" failed some tests`);
                }
                // Show detailed results in output channel
                this.showTestResults(skill.name, testResult);
            });
            this.extension?.getConfigurationManager().debug('Skill tested:', skillId);
        }
        catch (error) {
            console.error('Failed to test skill:', error);
            vscode.window.showErrorMessage(`Failed to test skill: ${error}`);
        }
    }
    /**
     * Export a skill
     */
    async exportSkill(skillId) {
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
        }
        catch (error) {
            console.error('Failed to export skill:', error);
            vscode.window.showErrorMessage(`Failed to export skill: ${error}`);
        }
    }
    /**
     * Import a skill
     */
    async importSkill() {
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
        }
        catch (error) {
            console.error('Failed to import skill:', error);
            vscode.window.showErrorMessage(`Failed to import skill: ${error}`);
        }
    }
    /**
     * Open extension settings
     */
    async openSettings() {
        await vscode.commands.executeCommand('workbench.action.openSettings', 'skillsArchitecture');
    }
    /**
     * Reset configuration to defaults
     */
    async resetConfiguration() {
        const confirmAction = 'Reset';
        const choice = await vscode.window.showWarningMessage('Are you sure you want to reset all Skills Architecture settings to defaults?', { modal: true }, confirmAction);
        if (choice === confirmAction) {
            await this.extension?.getConfigurationManager().resetToDefaults();
        }
    }
    /**
     * Toggle debug mode
     */
    async toggleDebugMode() {
        const configManager = this.extension?.getConfigurationManager();
        if (configManager) {
            const currentMode = configManager.isDebugMode();
            await configManager.update('debugMode', !currentMode);
            const status = !currentMode ? 'enabled' : 'disabled';
            vscode.window.showInformationMessage(`Debug mode ${status}`);
        }
    }
    /**
     * Search skills
     */
    async searchSkills() {
        try {
            const searchTerm = await vscode.window.showInputBox({
                prompt: 'Enter search term',
                placeHolder: 'Search by name, description, or tags...',
                value: ''
            });
            if (searchTerm !== undefined) {
                this.extension?.getSkillsTreeProvider().setSearchFilter(searchTerm);
                if (searchTerm) {
                    vscode.window.showInformationMessage(`Searching for: "${searchTerm}"`);
                }
                else {
                    vscode.window.showInformationMessage('Search cleared');
                }
            }
            this.extension?.getConfigurationManager().debug('Skills search applied:', searchTerm);
        }
        catch (error) {
            console.error('Failed to search skills:', error);
            vscode.window.showErrorMessage(`Failed to search skills: ${error}`);
        }
    }
    /**
     * Filter skills by layer
     */
    async filterByLayer() {
        try {
            const treeProvider = this.extension?.getSkillsTreeProvider();
            if (!treeProvider)
                return;
            const layers = treeProvider.getAvailableLayers();
            const layerOptions = [
                { label: 'All Layers', description: 'Show skills from all layers', value: undefined },
                ...layers.map(layer => ({
                    label: `Layer ${layer.layer}`,
                    description: `${layer.description} (${layer.count} skills)`,
                    value: layer.layer
                }))
            ];
            const selectedLayer = await vscode.window.showQuickPick(layerOptions, {
                placeHolder: 'Select layer to filter by',
                canPickMany: false
            });
            if (selectedLayer) {
                treeProvider.setLayerFilter(selectedLayer.value);
                if (selectedLayer.value) {
                    vscode.window.showInformationMessage(`Filtered by Layer ${selectedLayer.value}`);
                }
                else {
                    vscode.window.showInformationMessage('Layer filter cleared');
                }
            }
            this.extension?.getConfigurationManager().debug('Layer filter applied:', selectedLayer?.value);
        }
        catch (error) {
            console.error('Failed to filter by layer:', error);
            vscode.window.showErrorMessage(`Failed to filter by layer: ${error}`);
        }
    }
    /**
     * Filter skills by category
     */
    async filterByCategory() {
        try {
            const treeProvider = this.extension?.getSkillsTreeProvider();
            if (!treeProvider)
                return;
            const categories = treeProvider.getAvailableCategories();
            const categoryOptions = [
                { label: 'All Categories', description: 'Show skills from all categories', value: undefined },
                ...categories.map(category => ({
                    label: category,
                    description: `Category: ${category}`,
                    value: category
                }))
            ];
            const selectedCategory = await vscode.window.showQuickPick(categoryOptions, {
                placeHolder: 'Select category to filter by',
                canPickMany: false
            });
            if (selectedCategory) {
                treeProvider.setCategoryFilter(selectedCategory.value);
                if (selectedCategory.value) {
                    vscode.window.showInformationMessage(`Filtered by category: ${selectedCategory.value}`);
                }
                else {
                    vscode.window.showInformationMessage('Category filter cleared');
                }
            }
            this.extension?.getConfigurationManager().debug('Category filter applied:', selectedCategory?.value);
        }
        catch (error) {
            console.error('Failed to filter by category:', error);
            vscode.window.showErrorMessage(`Failed to filter by category: ${error}`);
        }
    }
    /**
     * Clear all filters
     */
    async clearFilters() {
        try {
            this.extension?.getSkillsTreeProvider().clearFilters();
            vscode.window.showInformationMessage('All filters cleared');
            this.extension?.getConfigurationManager().debug('All filters cleared');
        }
        catch (error) {
            console.error('Failed to clear filters:', error);
            vscode.window.showErrorMessage(`Failed to clear filters: ${error}`);
        }
    }
    /**
     * Show detailed skill information
     */
    async showSkillDetails(skillId) {
        try {
            if (!skillId) {
                // Show skill picker if no ID provided
                const skills = await this.extension?.getSkillsTreeProvider().getAllSkills() || [];
                if (skills.length === 0) {
                    vscode.window.showInformationMessage('No skills available.');
                    return;
                }
                const skillOptions = skills.map(skill => ({
                    label: skill.name,
                    description: `Layer ${skill.layer} - ${skill.description}`,
                    skillId: skill.id
                }));
                const selectedSkill = await vscode.window.showQuickPick(skillOptions, {
                    placeHolder: 'Select skill to view details',
                    canPickMany: false
                });
                if (!selectedSkill) {
                    return; // User cancelled
                }
                skillId = selectedSkill.skillId;
            }
            const treeProvider = this.extension?.getSkillsTreeProvider();
            if (!treeProvider)
                return;
            const skillDetails = await treeProvider.getSkillDetails(skillId);
            // Create and show webview panel with skill details
            const panel = vscode.window.createWebviewPanel('skillDetails', `Skill Details: ${skillDetails.name}`, vscode.ViewColumn.One, {
                enableScripts: true,
                retainContextWhenHidden: true
            });
            panel.webview.html = this.getSkillDetailsHtml(skillDetails);
            this.extension?.getConfigurationManager().debug('Skill details shown for:', skillId);
        }
        catch (error) {
            console.error('Failed to show skill details:', error);
            vscode.window.showErrorMessage(`Failed to show skill details: ${error}`);
        }
    }
    /**
     * Show skill statistics
     */
    async showSkillStatistics() {
        try {
            const treeProvider = this.extension?.getSkillsTreeProvider();
            if (!treeProvider)
                return;
            const stats = treeProvider.getSkillStatistics();
            // Create and show webview panel with statistics
            const panel = vscode.window.createWebviewPanel('skillStatistics', 'Skill Statistics', vscode.ViewColumn.One, {
                enableScripts: true,
                retainContextWhenHidden: true
            });
            panel.webview.html = this.getSkillStatisticsHtml(stats);
            this.extension?.getConfigurationManager().debug('Skill statistics shown');
        }
        catch (error) {
            console.error('Failed to show skill statistics:', error);
            vscode.window.showErrorMessage(`Failed to show skill statistics: ${error}`);
        }
    }
    /**
     * Show test results in output channel
     */
    showTestResults(skillName, testResult) {
        const outputChannel = vscode.window.createOutputChannel(`Skills Architecture - Test Results`);
        outputChannel.clear();
        outputChannel.show();
        outputChannel.appendLine(`Test Results for Skill: ${skillName}`);
        outputChannel.appendLine('='.repeat(50));
        outputChannel.appendLine(`Overall Result: ${testResult?.passed ? 'PASSED' : 'FAILED'}`);
        outputChannel.appendLine('');
        if (testResult?.results) {
            testResult.results.forEach((result, index) => {
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
     * Show extension logs
     */
    showLogs() {
        // Create or show output channel
        const outputChannel = vscode.window.createOutputChannel('Skills Architecture');
        outputChannel.show();
        outputChannel.appendLine('Skills Architecture Extension Logs');
        outputChannel.appendLine('=====================================');
        outputChannel.appendLine(`Extension activated at: ${new Date().toISOString()}`);
        outputChannel.appendLine(`Configuration: ${JSON.stringify(this.extension?.getConfigurationManager().getConfiguration(), null, 2)}`);
    }
    /**
     * Generate HTML for skill details view
     */
    getSkillDetailsHtml(skill) {
        const validationStatus = skill.validation.valid ?
            '<span style="color: green;">✓ Valid</span>' :
            '<span style="color: red;">✗ Invalid</span>';
        const dependentSkillsList = skill.dependentSkills.length > 0 ?
            skill.dependentSkills.map((dep) => `<li>${dep.name} (${dep.id})</li>`).join('') :
            '<li>No dependent skills</li>';
        const tagsList = skill.metadata?.tags?.length > 0 ?
            skill.metadata.tags.map((tag) => `<span class="tag">${tag}</span>`).join('') :
            '<span class="tag">No tags</span>';
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Skill Details</title>
                <style>
                    body { 
                        font-family: var(--vscode-font-family); 
                        color: var(--vscode-foreground);
                        background-color: var(--vscode-editor-background);
                        padding: 20px;
                        line-height: 1.6;
                    }
                    .header { border-bottom: 1px solid var(--vscode-panel-border); padding-bottom: 15px; margin-bottom: 20px; }
                    .section { margin-bottom: 25px; }
                    .section h3 { color: var(--vscode-textLink-foreground); margin-bottom: 10px; }
                    .property { margin-bottom: 8px; }
                    .property-label { font-weight: bold; display: inline-block; width: 120px; }
                    .tag { 
                        background-color: var(--vscode-badge-background); 
                        color: var(--vscode-badge-foreground);
                        padding: 2px 8px; 
                        border-radius: 12px; 
                        font-size: 0.85em; 
                        margin-right: 5px;
                    }
                    .code-block { 
                        background-color: var(--vscode-textCodeBlock-background);
                        border: 1px solid var(--vscode-panel-border);
                        padding: 10px;
                        border-radius: 4px;
                        font-family: var(--vscode-editor-font-family);
                        font-size: 0.9em;
                        overflow-x: auto;
                    }
                    .validation-errors { color: var(--vscode-errorForeground); }
                    .validation-warnings { color: var(--vscode-warningForeground); }
                    ul { padding-left: 20px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>${skill.name}</h1>
                    <p>${skill.description}</p>
                </div>

                <div class="section">
                    <h3>Basic Information</h3>
                    <div class="property"><span class="property-label">ID:</span> ${skill.id}</div>
                    <div class="property"><span class="property-label">Version:</span> ${skill.version}</div>
                    <div class="property"><span class="property-label">Layer:</span> ${skill.layer}</div>
                    <div class="property"><span class="property-label">Category:</span> ${skill.metadata?.category || 'general'}</div>
                    <div class="property"><span class="property-label">Author:</span> ${skill.metadata?.author || 'Unknown'}</div>
                    <div class="property"><span class="property-label">Created:</span> ${skill.metadata?.created ? new Date(skill.metadata.created).toLocaleString() : 'Unknown'}</div>
                    <div class="property"><span class="property-label">Updated:</span> ${skill.metadata?.updated ? new Date(skill.metadata.updated).toLocaleString() : 'Unknown'}</div>
                    <div class="property"><span class="property-label">File Size:</span> ${(skill.fileSize / 1024).toFixed(2)} KB</div>
                </div>

                <div class="section">
                    <h3>Tags</h3>
                    <div>${tagsList}</div>
                </div>

                <div class="section">
                    <h3>Validation Status</h3>
                    <div class="property"><span class="property-label">Status:</span> ${validationStatus}</div>
                    ${skill.validation.errors.length > 0 ? `
                        <div class="validation-errors">
                            <h4>Errors:</h4>
                            <ul>
                                ${skill.validation.errors.map((error) => `<li>${error.message}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                    ${skill.validation.warnings.length > 0 ? `
                        <div class="validation-warnings">
                            <h4>Warnings:</h4>
                            <ul>
                                ${skill.validation.warnings.map((warning) => `<li>${warning.message}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>

                <div class="section">
                    <h3>Dependencies</h3>
                    ${skill.dependencies.length > 0 ? `
                        <ul>
                            ${skill.dependencies.map((dep) => `<li>${dep.id} (${dep.type}${dep.optional ? ', optional' : ''})</li>`).join('')}
                        </ul>
                    ` : '<p>No dependencies</p>'}
                </div>

                <div class="section">
                    <h3>Dependent Skills</h3>
                    <ul>${dependentSkillsList}</ul>
                </div>

                <div class="section">
                    <h3>Invocation Specification</h3>
                    <h4>Input Schema:</h4>
                    <div class="code-block">${JSON.stringify(skill.invocationSpec.inputSchema, null, 2)}</div>
                    <h4>Output Schema:</h4>
                    <div class="code-block">${JSON.stringify(skill.invocationSpec.outputSchema, null, 2)}</div>
                </div>

                <div class="section">
                    <h3>Extension Points</h3>
                    ${skill.extensionPoints.length > 0 ? `
                        <ul>
                            ${skill.extensionPoints.map((ext) => `<li>${ext.name}: ${ext.description}</li>`).join('')}
                        </ul>
                    ` : '<p>No extension points defined</p>'}
                </div>
            </body>
            </html>
        `;
    }
    /**
     * Generate HTML for skill statistics view
     */
    getSkillStatisticsHtml(stats) {
        const layerChartData = Object.entries(stats.byLayer)
            .map(([layer, count]) => `<div class="bar-item"><span class="bar-label">Layer ${layer}</span><div class="bar" style="width: ${(count / stats.total) * 100}%"></div><span class="bar-value">${count}</span></div>`)
            .join('');
        const categoryChartData = Object.entries(stats.byCategory)
            .map(([category, count]) => `<div class="bar-item"><span class="bar-label">${category}</span><div class="bar" style="width: ${(count / stats.total) * 100}%"></div><span class="bar-value">${count}</span></div>`)
            .join('');
        const recentSkillsList = stats.recentlyModified.length > 0 ?
            stats.recentlyModified.map((skill) => `
                <li>
                    <strong>${skill.name}</strong> (Layer ${skill.layer})<br>
                    <small>Updated: ${skill.metadata?.updated ? new Date(skill.metadata.updated).toLocaleString() : 'Unknown'}</small>
                </li>
            `).join('') :
            '<li>No recently modified skills</li>';
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Skill Statistics</title>
                <style>
                    body { 
                        font-family: var(--vscode-font-family); 
                        color: var(--vscode-foreground);
                        background-color: var(--vscode-editor-background);
                        padding: 20px;
                        line-height: 1.6;
                    }
                    .header { border-bottom: 1px solid var(--vscode-panel-border); padding-bottom: 15px; margin-bottom: 20px; }
                    .section { margin-bottom: 25px; }
                    .section h3 { color: var(--vscode-textLink-foreground); margin-bottom: 10px; }
                    .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }
                    .stat-card { 
                        background-color: var(--vscode-textCodeBlock-background);
                        border: 1px solid var(--vscode-panel-border);
                        padding: 15px;
                        border-radius: 4px;
                        text-align: center;
                    }
                    .stat-number { font-size: 2em; font-weight: bold; color: var(--vscode-textLink-foreground); }
                    .stat-label { font-size: 0.9em; color: var(--vscode-descriptionForeground); }
                    .bar-chart { margin: 15px 0; }
                    .bar-item { display: flex; align-items: center; margin-bottom: 8px; }
                    .bar-label { width: 100px; font-size: 0.9em; }
                    .bar { 
                        height: 20px; 
                        background-color: var(--vscode-textLink-foreground);
                        margin: 0 10px;
                        border-radius: 2px;
                        min-width: 2px;
                    }
                    .bar-value { font-size: 0.9em; font-weight: bold; }
                    ul { padding-left: 20px; }
                    li { margin-bottom: 10px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Skill Statistics</h1>
                    <p>Overview of your skills architecture</p>
                </div>

                <div class="section">
                    <h3>Overview</h3>
                    <div class="stat-grid">
                        <div class="stat-card">
                            <div class="stat-number">${stats.total}</div>
                            <div class="stat-label">Total Skills</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">${Object.keys(stats.byLayer).length}</div>
                            <div class="stat-label">Active Layers</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">${Object.keys(stats.byCategory).length}</div>
                            <div class="stat-label">Categories</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">${stats.recentlyModified.length}</div>
                            <div class="stat-label">Recently Modified</div>
                        </div>
                    </div>
                </div>

                <div class="section">
                    <h3>Skills by Layer</h3>
                    <div class="bar-chart">
                        ${layerChartData}
                    </div>
                </div>

                <div class="section">
                    <h3>Skills by Category</h3>
                    <div class="bar-chart">
                        ${categoryChartData}
                    </div>
                </div>

                <div class="section">
                    <h3>Recently Modified Skills</h3>
                    <ul>${recentSkillsList}</ul>
                </div>
            </body>
            </html>
        `;
    }
    /**
     * Execute a command by ID
     */
    async executeCommand(commandId, ...args) {
        return vscode.commands.executeCommand(commandId, ...args);
    }
    /**
     * Check if a command is registered
     */
    hasCommand(commandId) {
        return this.commands.has(commandId);
    }
    /**
     * Get all registered command IDs
     */
    getRegisteredCommands() {
        return Array.from(this.commands.keys());
    }
    /**
     * Dispose of all commands
     */
    dispose() {
        this.commands.forEach(disposable => disposable.dispose());
        this.commands.clear();
    }
}
exports.CommandManager = CommandManager;
//# sourceMappingURL=commandManager.js.map