import * as vscode from 'vscode';
import * as path from 'path';
import { ConfigurationManager } from '../managers/configurationManager';

/**
 * Skill tree item for the tree view
 */
export class SkillTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly itemType: 'layer' | 'category' | 'skill',
        public readonly skillId?: string,
        public readonly layer?: number,
        public readonly category?: string
    ) {
        super(label, collapsibleState);
        
        this.tooltip = this.getTooltip();
        this.contextValue = this.getContextValue();
        this.iconPath = this.getIconPath();
        
        if (itemType === 'skill' && skillId) {
            this.command = {
                command: 'skillsArchitecture.editSkill',
                title: 'Edit Skill',
                arguments: [skillId]
            };
        }
    }

    private getTooltip(): string {
        switch (this.itemType) {
            case 'layer':
                return `Layer ${this.layer} - ${this.getLayerDescription()}`;
            case 'category':
                return `Category: ${this.category}`;
            case 'skill':
                return `Skill: ${this.label}`;
            default:
                return this.label;
        }
    }

    private getContextValue(): string {
        return this.itemType;
    }

    private getIconPath(): vscode.ThemeIcon {
        switch (this.itemType) {
            case 'layer':
                return new vscode.ThemeIcon('layers');
            case 'category':
                return new vscode.ThemeIcon('folder');
            case 'skill':
                return new vscode.ThemeIcon('symbol-function');
            default:
                return new vscode.ThemeIcon('circle-outline');
        }
    }

    private getLayerDescription(): string {
        switch (this.layer) {
            case 1:
                return 'Function calls - Direct atomic operations';
            case 2:
                return 'Sandbox tools - Command line programs and tools';
            case 3:
                return 'Wrapper APIs - High-level programming and execution code';
            default:
                return 'Unknown layer';
        }
    }
}

/**
 * Skills tree data provider for VS Code tree view
 */
export class SkillsTreeDataProvider implements vscode.TreeDataProvider<SkillTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<SkillTreeItem | undefined | null | void> = new vscode.EventEmitter<SkillTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<SkillTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private skills: Map<string, any> = new Map();
    private skillsLoaded = false;

    constructor(
        private context: vscode.ExtensionContext,
        private configManager: ConfigurationManager
    ) {}

    /**
     * Initialize the tree data provider
     */
    async initialize(): Promise<void> {
        await this.loadSkills();
        console.log('Skills tree data provider initialized with', this.skills.size, 'skills');
    }

    /**
     * Get tree item
     */
    getTreeItem(element: SkillTreeItem): vscode.TreeItem {
        return element;
    }

    /**
     * Get children of a tree item
     */
    async getChildren(element?: SkillTreeItem): Promise<SkillTreeItem[]> {
        if (!this.skillsLoaded) {
            await this.loadSkills();
        }

        if (!element) {
            // Root level - return layers
            return this.getLayerItems();
        }

        if (element.itemType === 'layer') {
            // Layer level - return categories
            return this.getCategoryItems(element.layer!);
        }

        if (element.itemType === 'category') {
            // Category level - return skills
            return this.getSkillItems(element.layer!, element.category!);
        }

        return [];
    }

    /**
     * Get layer items
     */
    private getLayerItems(): SkillTreeItem[] {
        const enabledLayers = this.configManager.get('enabledLayers');
        const layerItems: SkillTreeItem[] = [];

        for (const layer of enabledLayers) {
            const layerSkills = Array.from(this.skills.values()).filter((skill: any) => skill.layer === layer);
            
            if (layerSkills.length > 0) {
                const item = new SkillTreeItem(
                    `Layer ${layer}`,
                    vscode.TreeItemCollapsibleState.Expanded,
                    'layer',
                    undefined,
                    layer
                );
                layerItems.push(item);
            }
        }

        return layerItems;
    }

    /**
     * Get category items for a layer
     */
    private getCategoryItems(layer: number): SkillTreeItem[] {
        const layerSkills = Array.from(this.skills.values()).filter((skill: any) => skill.layer === layer);
        const categories = new Set<string>();

        layerSkills.forEach((skill: any) => {
            categories.add(skill.metadata?.category || 'general');
        });

        return Array.from(categories).map(category => {
            return new SkillTreeItem(
                category,
                vscode.TreeItemCollapsibleState.Collapsed,
                'category',
                undefined,
                layer,
                category
            );
        });
    }

    /**
     * Get skill items for a layer and category
     */
    private getSkillItems(layer: number, category: string): SkillTreeItem[] {
        const skills = Array.from(this.skills.values()).filter((skill: any) => 
            skill.layer === layer && (skill.metadata?.category || 'general') === category
        );

        return skills.map((skill: any) => {
            return new SkillTreeItem(
                skill.name,
                vscode.TreeItemCollapsibleState.None,
                'skill',
                skill.id,
                layer,
                category
            );
        });
    }

    /**
     * Load skills from the file system
     */
    private async loadSkills(): Promise<void> {
        try {
            const skillsPath = this.configManager.getAbsoluteSkillsPath();
            if (!skillsPath) {
                this.configManager.debug('No workspace folder available');
                return;
            }

            const skillsUri = vscode.Uri.file(skillsPath);
            
            try {
                const entries = await vscode.workspace.fs.readDirectory(skillsUri);
                this.skills.clear();

                for (const [name, type] of entries) {
                    if (type === vscode.FileType.File && name.endsWith('.json')) {
                        try {
                            const skillPath = path.join(skillsPath, name);
                            const skillUri = vscode.Uri.file(skillPath);
                            const skillData = await vscode.workspace.fs.readFile(skillUri);
                            const skill = JSON.parse(Buffer.from(skillData).toString('utf8'));
                            
                            // Validate basic skill structure
                            if (skill.id && skill.name && skill.layer) {
                                this.skills.set(skill.id, skill);
                            } else {
                                console.warn(`Invalid skill file: ${name}`);
                            }
                        } catch (error) {
                            console.error(`Failed to load skill file ${name}:`, error);
                        }
                    }
                }

                this.skillsLoaded = true;
                this.configManager.debug('Loaded', this.skills.size, 'skills');
            } catch (error) {
                // Skills directory doesn't exist or is empty
                this.configManager.debug('Skills directory not found or empty');
                this.skillsLoaded = true;
            }
        } catch (error) {
            console.error('Failed to load skills:', error);
            this.skillsLoaded = true;
        }
    }

    /**
     * Refresh the tree view
     */
    async refresh(): Promise<void> {
        await this.loadSkills();
        this._onDidChangeTreeData.fire();
    }

    /**
     * Create a new skill
     */
    async createSkill(name: string, layer: number): Promise<any> {
        const skillId = this.generateSkillId();
        const skill = {
            id: skillId,
            name: name,
            version: '1.0.0',
            layer: layer,
            description: `A new ${this.getLayerName(layer)} skill`,
            invocationSpec: {
                inputSchema: { type: 'object', properties: {} },
                outputSchema: { type: 'object', properties: {} },
                executionContext: {
                    environment: {},
                    security: { sandboxed: true }
                },
                parameters: [],
                examples: []
            },
            extensionPoints: [],
            dependencies: [],
            metadata: {
                author: 'User',
                created: new Date().toISOString(),
                updated: new Date().toISOString(),
                tags: [],
                category: 'general'
            }
        };

        // Save to file system
        await this.saveSkill(skill);
        
        // Add to memory
        this.skills.set(skillId, skill);
        
        // Refresh tree
        this._onDidChangeTreeData.fire();
        
        return skill;
    }

    /**
     * Get a skill by ID
     */
    async getSkill(skillId: string): Promise<any> {
        return this.skills.get(skillId);
    }

    /**
     * Get all skills
     */
    async getAllSkills(): Promise<any[]> {
        return Array.from(this.skills.values());
    }

    /**
     * Delete a skill
     */
    async deleteSkill(skillId: string): Promise<void> {
        const skill = this.skills.get(skillId);
        if (!skill) {
            throw new Error('Skill not found');
        }

        // Delete from file system
        const skillPath = await this.getSkillPath(skillId);
        if (skillPath) {
            const skillUri = vscode.Uri.file(skillPath);
            await vscode.workspace.fs.delete(skillUri);
        }

        // Remove from memory
        this.skills.delete(skillId);
        
        // Refresh tree
        this._onDidChangeTreeData.fire();
    }

    /**
     * Test a skill
     */
    async testSkill(skillId: string): Promise<any> {
        const skill = this.skills.get(skillId);
        if (!skill) {
            throw new Error('Skill not found');
        }

        // Simulate testing (in real implementation, this would run actual tests)
        return {
            passed: Math.random() > 0.3,
            results: [
                {
                    name: 'Basic functionality test',
                    passed: true,
                    duration: 150,
                    output: 'Test passed successfully'
                },
                {
                    name: 'Parameter validation test',
                    passed: true,
                    duration: 75,
                    output: 'Parameters validated correctly'
                }
            ],
            coverage: {
                lines: 85,
                functions: 90,
                branches: 80,
                statements: 88
            },
            performance: {
                averageExecutionTime: 112.5,
                memoryUsage: 45 * 1024 * 1024,
                throughput: 8.9
            }
        };
    }

    /**
     * Import a skill from JSON
     */
    async importSkill(skillJson: string): Promise<any> {
        const skill = JSON.parse(skillJson);
        
        // Validate skill structure
        if (!skill.id || !skill.name || !skill.layer) {
            throw new Error('Invalid skill data: missing required fields');
        }

        // Generate new ID if skill already exists
        if (this.skills.has(skill.id)) {
            skill.id = this.generateSkillId();
        }

        // Update metadata
        skill.metadata = {
            ...skill.metadata,
            updated: new Date().toISOString()
        };

        // Save to file system
        await this.saveSkill(skill);
        
        // Add to memory
        this.skills.set(skill.id, skill);
        
        // Refresh tree
        this._onDidChangeTreeData.fire();
        
        return skill;
    }

    /**
     * Get the file path for a skill
     */
    async getSkillPath(skillId: string): Promise<string | undefined> {
        const skill = this.skills.get(skillId);
        if (!skill) {
            return undefined;
        }

        const skillsPath = this.configManager.getAbsoluteSkillsPath();
        if (!skillsPath) {
            return undefined;
        }

        return path.join(skillsPath, `${skill.name.replace(/[^a-zA-Z0-9-_]/g, '_')}.json`);
    }

    /**
     * Save a skill to the file system
     */
    private async saveSkill(skill: any): Promise<void> {
        const skillsPath = this.configManager.getAbsoluteSkillsPath();
        if (!skillsPath) {
            throw new Error('No workspace folder available');
        }

        const fileName = `${skill.name.replace(/[^a-zA-Z0-9-_]/g, '_')}.json`;
        const skillPath = path.join(skillsPath, fileName);
        const skillUri = vscode.Uri.file(skillPath);
        
        const skillData = JSON.stringify(skill, null, 2);
        await vscode.workspace.fs.writeFile(skillUri, Buffer.from(skillData, 'utf8'));
    }

    /**
     * Generate a unique skill ID
     */
    private generateSkillId(): string {
        return `skill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get layer name
     */
    private getLayerName(layer: number): string {
        switch (layer) {
            case 1:
                return 'function call';
            case 2:
                return 'sandbox tool';
            case 3:
                return 'wrapper API';
            default:
                return 'unknown';
        }
    }

    /**
     * Get skill count
     */
    getSkillCount(): number {
        return this.skills.size;
    }

    /**
     * Get skills by layer
     */
    getSkillsByLayer(layer: number): any[] {
        return Array.from(this.skills.values()).filter((skill: any) => skill.layer === layer);
    }

    /**
     * Get skills by category
     */
    getSkillsByCategory(category: string): any[] {
        return Array.from(this.skills.values()).filter((skill: any) => 
            (skill.metadata?.category || 'general') === category
        );
    }

    /**
     * Search skills
     */
    searchSkills(query: string): any[] {
        const lowerQuery = query.toLowerCase();
        return Array.from(this.skills.values()).filter((skill: any) => 
            skill.name.toLowerCase().includes(lowerQuery) ||
            skill.description.toLowerCase().includes(lowerQuery) ||
            (skill.metadata?.tags || []).some((tag: string) => tag.toLowerCase().includes(lowerQuery))
        );
    }
}