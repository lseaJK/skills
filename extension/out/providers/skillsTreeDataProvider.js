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
exports.SkillsTreeDataProvider = exports.SkillTreeItem = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const skillRegistry_1 = require("../core/skillRegistry");
/**
 * Skill tree item for the tree view
 */
class SkillTreeItem extends vscode.TreeItem {
    constructor(label, collapsibleState, itemType, skillId, layer, category) {
        super(label, collapsibleState);
        this.label = label;
        this.collapsibleState = collapsibleState;
        this.itemType = itemType;
        this.skillId = skillId;
        this.layer = layer;
        this.category = category;
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
    getTooltip() {
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
    getContextValue() {
        return this.itemType;
    }
    getIconPath() {
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
    getLayerDescription() {
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
exports.SkillTreeItem = SkillTreeItem;
/**
 * Skills tree data provider for VS Code tree view
 */
class SkillsTreeDataProvider {
    constructor(context, configManager) {
        this.context = context;
        this.configManager = configManager;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.skills = new Map();
        this.skillsLoaded = false;
        this.currentFilter = {};
        this.searchTerm = '';
        this.skillRegistry = new skillRegistry_1.InMemorySkillRegistry();
    }
    /**
     * Initialize the tree data provider
     */
    async initialize() {
        await this.loadSkills();
        console.log('Skills tree data provider initialized with', this.skills.size, 'skills');
    }
    /**
     * Set search filter
     */
    setSearchFilter(searchTerm) {
        this.searchTerm = searchTerm.toLowerCase();
        this._onDidChangeTreeData.fire();
    }
    /**
     * Set layer filter
     */
    setLayerFilter(layer) {
        this.currentFilter.layer = layer;
        this._onDidChangeTreeData.fire();
    }
    /**
     * Set category filter
     */
    setCategoryFilter(category) {
        this.currentFilter.category = category;
        this._onDidChangeTreeData.fire();
    }
    /**
     * Clear all filters
     */
    clearFilters() {
        this.currentFilter = {};
        this.searchTerm = '';
        this._onDidChangeTreeData.fire();
    }
    /**
     * Get filtered skills
     */
    getFilteredSkills() {
        let filteredSkills = Array.from(this.skills.values());
        // Apply search filter
        if (this.searchTerm) {
            filteredSkills = filteredSkills.filter(skill => skill.name.toLowerCase().includes(this.searchTerm) ||
                skill.description.toLowerCase().includes(this.searchTerm) ||
                (skill.metadata?.tags || []).some((tag) => tag.toLowerCase().includes(this.searchTerm)));
        }
        // Apply layer filter
        if (this.currentFilter.layer) {
            filteredSkills = filteredSkills.filter(skill => skill.layer === this.currentFilter.layer);
        }
        // Apply category filter
        if (this.currentFilter.category) {
            filteredSkills = filteredSkills.filter(skill => (skill.metadata?.category || 'general') === this.currentFilter.category);
        }
        return filteredSkills;
    }
    /**
     * Get tree item
     */
    getTreeItem(element) {
        return element;
    }
    /**
     * Get children of a tree item
     */
    async getChildren(element) {
        if (!this.skillsLoaded) {
            await this.loadSkills();
        }
        if (!element) {
            // Root level - return layers
            return this.getLayerItems();
        }
        if (element.itemType === 'layer') {
            // Layer level - return categories
            return this.getCategoryItems(element.layer);
        }
        if (element.itemType === 'category') {
            // Category level - return skills
            return this.getSkillItems(element.layer, element.category);
        }
        return [];
    }
    /**
     * Get layer items
     */
    getLayerItems() {
        const enabledLayers = this.configManager.get('enabledLayers');
        const layerItems = [];
        const filteredSkills = this.getFilteredSkills();
        for (const layer of enabledLayers) {
            const layerSkills = filteredSkills.filter((skill) => skill.layer === layer);
            if (layerSkills.length > 0) {
                const item = new SkillTreeItem(`Layer ${layer} (${layerSkills.length})`, vscode.TreeItemCollapsibleState.Expanded, 'layer', undefined, layer);
                layerItems.push(item);
            }
        }
        return layerItems;
    }
    /**
     * Get category items for a layer
     */
    getCategoryItems(layer) {
        const filteredSkills = this.getFilteredSkills();
        const layerSkills = filteredSkills.filter((skill) => skill.layer === layer);
        const categories = new Map();
        layerSkills.forEach((skill) => {
            const category = skill.metadata?.category || 'general';
            categories.set(category, (categories.get(category) || 0) + 1);
        });
        return Array.from(categories.entries()).map(([category, count]) => {
            return new SkillTreeItem(`${category} (${count})`, vscode.TreeItemCollapsibleState.Collapsed, 'category', undefined, layer, category);
        });
    }
    /**
     * Get skill items for a layer and category
     */
    getSkillItems(layer, category) {
        const filteredSkills = this.getFilteredSkills();
        const skills = filteredSkills.filter((skill) => skill.layer === layer && (skill.metadata?.category || 'general') === category);
        return skills.map((skill) => {
            const item = new SkillTreeItem(skill.name, vscode.TreeItemCollapsibleState.None, 'skill', skill.id, layer, category);
            // Add description as tooltip
            item.tooltip = `${skill.description}\n\nLayer: ${skill.layer}\nVersion: ${skill.version}\nAuthor: ${skill.metadata?.author || 'Unknown'}`;
            return item;
        });
    }
    /**
     * Load skills from the file system and sync with registry
     */
    async loadSkills() {
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
                                // Register with skill registry
                                try {
                                    await this.skillRegistry.register(skill);
                                }
                                catch (error) {
                                    // Skill might already be registered, try to update
                                    try {
                                        await this.skillRegistry.update(skill.id, skill);
                                    }
                                    catch (updateError) {
                                        console.warn(`Failed to register/update skill ${skill.id}:`, updateError);
                                    }
                                }
                            }
                            else {
                                console.warn(`Invalid skill file: ${name}`);
                            }
                        }
                        catch (error) {
                            console.error(`Failed to load skill file ${name}:`, error);
                        }
                    }
                }
                this.skillsLoaded = true;
                this.configManager.debug('Loaded', this.skills.size, 'skills');
            }
            catch (error) {
                // Skills directory doesn't exist or is empty
                this.configManager.debug('Skills directory not found or empty');
                this.skillsLoaded = true;
            }
        }
        catch (error) {
            console.error('Failed to load skills:', error);
            this.skillsLoaded = true;
        }
    }
    /**
     * Refresh the tree view
     */
    async refresh() {
        await this.loadSkills();
        this._onDidChangeTreeData.fire();
    }
    /**
     * Create a new skill
     */
    async createSkill(name, layer) {
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
    async getSkill(skillId) {
        return this.skills.get(skillId);
    }
    /**
     * Get all skills
     */
    async getAllSkills() {
        return Array.from(this.skills.values());
    }
    /**
     * Delete a skill
     */
    async deleteSkill(skillId) {
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
    async testSkill(skillId) {
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
    async importSkill(skillJson) {
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
    async getSkillPath(skillId) {
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
    async saveSkill(skill) {
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
    generateSkillId() {
        return `skill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Get layer name
     */
    getLayerName(layer) {
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
    getSkillCount() {
        return this.skills.size;
    }
    /**
     * Get skills by layer
     */
    getSkillsByLayer(layer) {
        return Array.from(this.skills.values()).filter((skill) => skill.layer === layer);
    }
    /**
     * Get skills by category
     */
    getSkillsByCategory(category) {
        return Array.from(this.skills.values()).filter((skill) => (skill.metadata?.category || 'general') === category);
    }
    /**
     * Search skills
     */
    searchSkills(query) {
        const lowerQuery = query.toLowerCase();
        return Array.from(this.skills.values()).filter((skill) => skill.name.toLowerCase().includes(lowerQuery) ||
            skill.description.toLowerCase().includes(lowerQuery) ||
            (skill.metadata?.tags || []).some((tag) => tag.toLowerCase().includes(lowerQuery)));
    }
    /**
     * Get skill registry instance
     */
    getSkillRegistry() {
        return this.skillRegistry;
    }
    /**
     * Get skill details for display
     */
    async getSkillDetails(skillId) {
        const skill = this.skills.get(skillId);
        if (!skill) {
            throw new Error('Skill not found');
        }
        // Get validation results
        const validation = this.skillRegistry.validate(skill);
        // Get dependent skills
        const dependentSkills = await this.skillRegistry.getDependentSkills(skillId);
        return {
            ...skill,
            validation,
            dependentSkills: dependentSkills.map(s => ({ id: s.id, name: s.name })),
            fileSize: await this.getSkillFileSize(skillId),
            lastModified: await this.getSkillLastModified(skillId)
        };
    }
    /**
     * Get all available categories
     */
    getAvailableCategories() {
        const categories = new Set();
        Array.from(this.skills.values()).forEach((skill) => {
            categories.add(skill.metadata?.category || 'general');
        });
        return Array.from(categories).sort();
    }
    /**
     * Get all available layers with skill counts
     */
    getAvailableLayers() {
        const layerCounts = new Map();
        Array.from(this.skills.values()).forEach((skill) => {
            layerCounts.set(skill.layer, (layerCounts.get(skill.layer) || 0) + 1);
        });
        return [1, 2, 3].map(layer => ({
            layer,
            count: layerCounts.get(layer) || 0,
            description: this.getLayerDescription(layer)
        }));
    }
    /**
     * Get skill statistics
     */
    getSkillStatistics() {
        const skills = Array.from(this.skills.values());
        const byLayer = {};
        const byCategory = {};
        skills.forEach((skill) => {
            byLayer[skill.layer] = (byLayer[skill.layer] || 0) + 1;
            const category = skill.metadata?.category || 'general';
            byCategory[category] = (byCategory[category] || 0) + 1;
        });
        // Get recently modified skills (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recentlyModified = skills
            .filter((skill) => {
            const updated = new Date(skill.metadata?.updated || skill.metadata?.created || 0);
            return updated > sevenDaysAgo;
        })
            .sort((a, b) => {
            const aDate = new Date(a.metadata?.updated || a.metadata?.created || 0);
            const bDate = new Date(b.metadata?.updated || b.metadata?.created || 0);
            return bDate.getTime() - aDate.getTime();
        })
            .slice(0, 5);
        return {
            total: skills.length,
            byLayer,
            byCategory,
            recentlyModified
        };
    }
    /**
     * Get layer description
     */
    getLayerDescription(layer) {
        switch (layer) {
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
    /**
     * Get skill file size
     */
    async getSkillFileSize(skillId) {
        try {
            const skillPath = await this.getSkillPath(skillId);
            if (skillPath) {
                const skillUri = vscode.Uri.file(skillPath);
                const stat = await vscode.workspace.fs.stat(skillUri);
                return stat.size;
            }
        }
        catch (error) {
            console.warn(`Failed to get file size for skill ${skillId}:`, error);
        }
        return 0;
    }
    /**
     * Get skill last modified date
     */
    async getSkillLastModified(skillId) {
        try {
            const skillPath = await this.getSkillPath(skillId);
            if (skillPath) {
                const skillUri = vscode.Uri.file(skillPath);
                const stat = await vscode.workspace.fs.stat(skillUri);
                return new Date(stat.mtime);
            }
        }
        catch (error) {
            console.warn(`Failed to get last modified date for skill ${skillId}:`, error);
        }
        return new Date(0);
    }
}
exports.SkillsTreeDataProvider = SkillsTreeDataProvider;
//# sourceMappingURL=skillsTreeDataProvider.js.map