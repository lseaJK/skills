import { SkillDefinition, TestResult } from '../types';

/**
 * Skill management panel interface for VS Code extension
 */
export interface SkillManagementPanel {
  showSkillTree(): void;
  createSkill(): Promise<SkillDefinition>;
  editSkill(skillId: string): Promise<void>;
  deleteSkill(skillId: string): Promise<void>;
  testSkill(skillId: string): Promise<TestResult>;
  refreshSkills(): Promise<void>;
  filterSkills(criteria: SkillFilterCriteria): void;
}

/**
 * Skill filter criteria for the management panel
 */
export interface SkillFilterCriteria {
  layer?: number;
  category?: string;
  tags?: string[];
  searchTerm?: string;
}

/**
 * Skill tree node for hierarchical display
 */
export interface SkillTreeNode {
  id: string;
  label: string;
  type: SkillTreeNodeType;
  children?: SkillTreeNode[];
  skill?: SkillDefinition;
  collapsibleState?: TreeItemCollapsibleState;
}

/**
 * Types of nodes in the skill tree
 */
export enum SkillTreeNodeType {
  LAYER = 'layer',
  CATEGORY = 'category',
  SKILL = 'skill',
  EXTENSION = 'extension'
}

/**
 * Tree item collapsible states
 */
export enum TreeItemCollapsibleState {
  NONE = 0,
  COLLAPSED = 1,
  EXPANDED = 2
}

/**
 * Basic implementation of skill management panel
 */
export class BasicSkillManagementPanel implements SkillManagementPanel {
  private skills: Map<string, SkillDefinition> = new Map();
  private filteredSkills: SkillDefinition[] = [];

  showSkillTree(): void {
    // In real VS Code extension, this would update the tree view
    console.log('Showing skill tree with', this.skills.size, 'skills');
  }

  async createSkill(): Promise<SkillDefinition> {
    // In real implementation, this would open a skill creation wizard
    const newSkill: SkillDefinition = {
      id: this.generateSkillId(),
      name: 'New Skill',
      version: '1.0.0',
      layer: 1,
      description: 'A new skill',
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
        created: new Date(),
        updated: new Date(),
        tags: [],
        category: 'general'
      }
    };

    this.skills.set(newSkill.id, newSkill);
    return newSkill;
  }

  async editSkill(skillId: string): Promise<void> {
    const skill = this.skills.get(skillId);
    if (!skill) {
      throw new Error(`Skill not found: ${skillId}`);
    }

    // In real implementation, this would open the skill editor
    console.log(`Opening editor for skill: ${skill.name}`);
  }

  async deleteSkill(skillId: string): Promise<void> {
    if (!this.skills.has(skillId)) {
      throw new Error(`Skill not found: ${skillId}`);
    }

    // In real implementation, this would show confirmation dialog
    this.skills.delete(skillId);
    console.log(`Deleted skill: ${skillId}`);
  }

  async testSkill(skillId: string): Promise<TestResult> {
    const skill = this.skills.get(skillId);
    if (!skill) {
      throw new Error(`Skill not found: ${skillId}`);
    }

    // Simulate skill testing
    const testResult: TestResult = {
      passed: Math.random() > 0.3, // 70% pass rate for simulation
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
        memoryUsage: 45 * 1024 * 1024, // 45MB
        throughput: 8.9
      }
    };

    return testResult;
  }

  async refreshSkills(): Promise<void> {
    // In real implementation, this would reload skills from storage
    console.log('Refreshing skills...');
    this.applyCurrentFilter();
  }

  filterSkills(criteria: SkillFilterCriteria): void {
    const allSkills = Array.from(this.skills.values());
    
    this.filteredSkills = allSkills.filter(skill => {
      if (criteria.layer && skill.layer !== criteria.layer) {
        return false;
      }
      
      if (criteria.category && skill.metadata.category !== criteria.category) {
        return false;
      }
      
      if (criteria.tags && !criteria.tags.some(tag => skill.metadata.tags.includes(tag))) {
        return false;
      }
      
      if (criteria.searchTerm) {
        const term = criteria.searchTerm.toLowerCase();
        if (!skill.name.toLowerCase().includes(term) && 
            !skill.description.toLowerCase().includes(term)) {
          return false;
        }
      }
      
      return true;
    });

    this.showSkillTree();
  }

  // Utility methods
  buildSkillTree(): SkillTreeNode[] {
    const tree: SkillTreeNode[] = [];
    
    // Group by layers
    for (let layer = 1; layer <= 3; layer++) {
      const layerSkills = this.filteredSkills.filter(skill => skill.layer === layer);
      
      if (layerSkills.length > 0) {
        const layerNode: SkillTreeNode = {
          id: `layer-${layer}`,
          label: `Layer ${layer}`,
          type: SkillTreeNodeType.LAYER,
          collapsibleState: TreeItemCollapsibleState.EXPANDED,
          children: []
        };

        // Group by categories within layer
        const categories = new Map<string, SkillDefinition[]>();
        for (const skill of layerSkills) {
          const category = skill.metadata.category;
          const categorySkills = categories.get(category) || [];
          categorySkills.push(skill);
          categories.set(category, categorySkills);
        }

        for (const [category, skills] of categories.entries()) {
          const categoryNode: SkillTreeNode = {
            id: `category-${layer}-${category}`,
            label: category,
            type: SkillTreeNodeType.CATEGORY,
            collapsibleState: TreeItemCollapsibleState.COLLAPSED,
            children: skills.map(skill => ({
              id: skill.id,
              label: skill.name,
              type: SkillTreeNodeType.SKILL,
              skill,
              collapsibleState: TreeItemCollapsibleState.NONE
            }))
          };

          layerNode.children!.push(categoryNode);
        }

        tree.push(layerNode);
      }
    }

    return tree;
  }

  getSkillCount(): number {
    return this.skills.size;
  }

  getFilteredSkillCount(): number {
    return this.filteredSkills.length;
  }

  private applyCurrentFilter(): void {
    this.filteredSkills = Array.from(this.skills.values());
  }

  private generateSkillId(): string {
    return `skill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Methods for testing
  addSkill(skill: SkillDefinition): void {
    this.skills.set(skill.id, skill);
    this.applyCurrentFilter();
  }

  getSkill(skillId: string): SkillDefinition | undefined {
    return this.skills.get(skillId);
  }

  getAllSkills(): SkillDefinition[] {
    return Array.from(this.skills.values());
  }
}