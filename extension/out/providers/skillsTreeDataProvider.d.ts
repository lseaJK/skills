import * as vscode from 'vscode';
import { ConfigurationManager } from '../managers/configurationManager';
import { InMemorySkillRegistry } from '../core/skillRegistry';
/**
 * Skill tree item for the tree view
 */
export declare class SkillTreeItem extends vscode.TreeItem {
    readonly label: string;
    readonly collapsibleState: vscode.TreeItemCollapsibleState;
    readonly itemType: 'layer' | 'category' | 'skill';
    readonly skillId?: string | undefined;
    readonly layer?: number | undefined;
    readonly category?: string | undefined;
    constructor(label: string, collapsibleState: vscode.TreeItemCollapsibleState, itemType: 'layer' | 'category' | 'skill', skillId?: string | undefined, layer?: number | undefined, category?: string | undefined);
    private getTooltip;
    private getContextValue;
    private getIconPath;
    private getLayerDescription;
}
/**
 * Skills tree data provider for VS Code tree view
 */
export declare class SkillsTreeDataProvider implements vscode.TreeDataProvider<SkillTreeItem> {
    private context;
    private configManager;
    private _onDidChangeTreeData;
    readonly onDidChangeTreeData: vscode.Event<SkillTreeItem | undefined | null | void>;
    private skills;
    private skillsLoaded;
    private skillRegistry;
    private currentFilter;
    private searchTerm;
    constructor(context: vscode.ExtensionContext, configManager: ConfigurationManager);
    /**
     * Initialize the tree data provider
     */
    initialize(): Promise<void>;
    /**
     * Set search filter
     */
    setSearchFilter(searchTerm: string): void;
    /**
     * Set layer filter
     */
    setLayerFilter(layer?: number): void;
    /**
     * Set category filter
     */
    setCategoryFilter(category?: string): void;
    /**
     * Clear all filters
     */
    clearFilters(): void;
    /**
     * Get filtered skills
     */
    private getFilteredSkills;
    /**
     * Get tree item
     */
    getTreeItem(element: SkillTreeItem): vscode.TreeItem;
    /**
     * Get children of a tree item
     */
    getChildren(element?: SkillTreeItem): Promise<SkillTreeItem[]>;
    /**
     * Get layer items
     */
    private getLayerItems;
    /**
     * Get category items for a layer
     */
    private getCategoryItems;
    /**
     * Get skill items for a layer and category
     */
    private getSkillItems;
    /**
     * Load skills from the file system and sync with registry
     */
    private loadSkills;
    /**
     * Refresh the tree view
     */
    refresh(): Promise<void>;
    /**
     * Create a new skill
     */
    createSkill(name: string, layer: number): Promise<any>;
    /**
     * Get a skill by ID
     */
    getSkill(skillId: string): Promise<any>;
    /**
     * Get all skills
     */
    getAllSkills(): Promise<any[]>;
    /**
     * Delete a skill
     */
    deleteSkill(skillId: string): Promise<void>;
    /**
     * Test a skill
     */
    testSkill(skillId: string): Promise<any>;
    /**
     * Import a skill from JSON
     */
    importSkill(skillJson: string): Promise<any>;
    /**
     * Get the file path for a skill
     */
    getSkillPath(skillId: string): Promise<string | undefined>;
    /**
     * Save a skill to the file system
     */
    private saveSkill;
    /**
     * Generate a unique skill ID
     */
    private generateSkillId;
    /**
     * Get layer name
     */
    private getLayerName;
    /**
     * Get skill count
     */
    getSkillCount(): number;
    /**
     * Get skills by layer
     */
    getSkillsByLayer(layer: number): any[];
    /**
     * Get skills by category
     */
    getSkillsByCategory(category: string): any[];
    /**
     * Search skills
     */
    searchSkills(query: string): any[];
    /**
     * Get skill registry instance
     */
    getSkillRegistry(): InMemorySkillRegistry;
    /**
     * Get skill details for display
     */
    getSkillDetails(skillId: string): Promise<any>;
    /**
     * Get all available categories
     */
    getAvailableCategories(): string[];
    /**
     * Get all available layers with skill counts
     */
    getAvailableLayers(): {
        layer: number;
        count: number;
        description: string;
    }[];
    /**
     * Get skill statistics
     */
    getSkillStatistics(): {
        total: number;
        byLayer: {
            [layer: number]: number;
        };
        byCategory: {
            [category: string]: number;
        };
        recentlyModified: any[];
    };
    /**
     * Get layer description
     */
    private getLayerDescription;
    /**
     * Get skill file size
     */
    private getSkillFileSize;
    /**
     * Get skill last modified date
     */
    private getSkillLastModified;
}
//# sourceMappingURL=skillsTreeDataProvider.d.ts.map