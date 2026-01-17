import { SkillDefinition, ValidationResult, ExecutionResult, ValidationError, ValidationWarning, ValidationSeverity } from '../types';
import { JSONSchema7 } from 'json-schema';

/**
 * Skill editor interface for VS Code extension
 */
export interface SkillEditor {
  openSkillEditor(skill: SkillDefinition): void;
  validateSyntax(): ValidationResult;
  previewExecution(): Promise<ExecutionResult>;
  saveSkill(): Promise<void>;
  exportSkill(): Promise<string>;
  importSkill(skillData: string): Promise<SkillDefinition>;
}

/**
 * Editor configuration options
 */
export interface EditorConfig {
  autoSave: boolean;
  autoValidate: boolean;
  showPreview: boolean;
  syntaxHighlighting: boolean;
  autoComplete: boolean;
}

/**
 * Editor state information
 */
export interface EditorState {
  skillId: string;
  isDirty: boolean;
  isValid: boolean;
  lastSaved: Date;
  validationErrors: ValidationResult;
}

/**
 * Basic implementation of skill editor
 */
export class BasicSkillEditor implements SkillEditor {
  private currentSkill: SkillDefinition | null = null;
  private editorState: EditorState | null = null;
  private config: EditorConfig;

  constructor(config?: Partial<EditorConfig>) {
    this.config = {
      autoSave: false,
      autoValidate: true,
      showPreview: true,
      syntaxHighlighting: true,
      autoComplete: true,
      ...config
    };
  }

  openSkillEditor(skill: SkillDefinition): void {
    this.currentSkill = { ...skill }; // Create a copy for editing
    this.editorState = {
      skillId: skill.id,
      isDirty: false,
      isValid: true,
      lastSaved: new Date(),
      validationErrors: { valid: true, errors: [], warnings: [] }
    };

    // In real VS Code extension, this would open the editor UI
    console.log(`Opening skill editor for: ${skill.name}`);
    
    if (this.config.autoValidate) {
      this.validateSyntax();
    }
  }

  validateSyntax(): ValidationResult {
    if (!this.currentSkill) {
      return {
        valid: false,
        errors: [{
          code: 'NO_SKILL_LOADED',
          message: 'No skill loaded in editor',
          severity: ValidationSeverity.ERROR
        }],
        warnings: []
      };
    }

    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Basic validation
    if (!this.currentSkill.name.trim()) {
      errors.push({
        code: 'EMPTY_NAME',
        message: 'Skill name cannot be empty',
        path: 'name',
        severity: ValidationSeverity.ERROR
      });
    }

    if (!this.currentSkill.description.trim()) {
      warnings.push({
        code: 'EMPTY_DESCRIPTION',
        message: 'Skill description is recommended',
        path: 'description'
      });
    }

    if (this.currentSkill.invocationSpec.parameters.length === 0) {
      warnings.push({
        code: 'NO_PARAMETERS',
        message: 'Consider adding parameters for better usability',
        path: 'invocationSpec.parameters'
      });
    }

    if (this.currentSkill.invocationSpec.examples.length === 0) {
      warnings.push({
        code: 'NO_EXAMPLES',
        message: 'Adding examples helps users understand the skill',
        path: 'invocationSpec.examples'
      });
    }

    // JSON Schema validation
    try {
      JSON.stringify(this.currentSkill.invocationSpec.inputSchema);
    } catch (error: any) {
      errors.push({
        code: 'INVALID_INPUT_SCHEMA',
        message: `Invalid input schema: ${error.message}`,
        path: 'invocationSpec.inputSchema',
        severity: ValidationSeverity.ERROR
      });
    }

    try {
      JSON.stringify(this.currentSkill.invocationSpec.outputSchema);
    } catch (error: any) {
      errors.push({
        code: 'INVALID_OUTPUT_SCHEMA',
        message: `Invalid output schema: ${error.message}`,
        path: 'invocationSpec.outputSchema',
        severity: ValidationSeverity.ERROR
      });
    }

    const result: ValidationResult = {
      valid: errors.length === 0,
      errors,
      warnings
    };

    if (this.editorState) {
      this.editorState.isValid = result.valid;
      this.editorState.validationErrors = result;
    }

    return result;
  }

  async previewExecution(): Promise<ExecutionResult> {
    if (!this.currentSkill) {
      throw new Error('No skill loaded in editor');
    }

    // Validate before preview
    const validation = this.validateSyntax();
    if (!validation.valid) {
      throw new Error(`Cannot preview invalid skill: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Simulate execution with example data
    const example = this.currentSkill.invocationSpec.examples[0];
    const testParams = example ? example.input : {};

    // Simulate execution result
    const executionResult: ExecutionResult = {
      success: true,
      output: {
        result: `Preview execution of ${this.currentSkill.name}`,
        params: testParams,
        timestamp: new Date(),
        previewMode: true
      },
      metadata: {
        skillId: this.currentSkill.id,
        executionId: `preview_${Date.now()}`,
        startTime: new Date(),
        endTime: new Date(),
        duration: Math.random() * 1000 + 100, // Random duration 100-1100ms
        layer: this.currentSkill.layer
      }
    };

    return executionResult;
  }

  async saveSkill(): Promise<void> {
    if (!this.currentSkill || !this.editorState) {
      throw new Error('No skill loaded in editor');
    }

    // Validate before saving
    const validation = this.validateSyntax();
    if (!validation.valid) {
      throw new Error(`Cannot save invalid skill: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Update metadata
    this.currentSkill.metadata.updated = new Date();

    // In real implementation, this would save to storage
    console.log(`Saving skill: ${this.currentSkill.name}`);

    // Update editor state
    this.editorState.isDirty = false;
    this.editorState.lastSaved = new Date();
  }

  async exportSkill(): Promise<string> {
    if (!this.currentSkill) {
      throw new Error('No skill loaded in editor');
    }

    // Validate before export
    const validation = this.validateSyntax();
    if (!validation.valid) {
      throw new Error(`Cannot export invalid skill: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Export as JSON
    return JSON.stringify(this.currentSkill, null, 2);
  }

  async importSkill(skillData: string): Promise<SkillDefinition> {
    try {
      const skill: SkillDefinition = JSON.parse(skillData);
      
      // Basic structure validation
      if (!skill.id || !skill.name || !skill.version) {
        throw new Error('Invalid skill data: missing required fields');
      }

      this.openSkillEditor(skill);
      return skill;

    } catch (error) {
      throw new Error(`Failed to import skill: ${(error as Error).message}`);
    }
  }

  // Utility methods
  getCurrentSkill(): SkillDefinition | null {
    return this.currentSkill;
  }

  getEditorState(): EditorState | null {
    return this.editorState;
  }

  isDirty(): boolean {
    return this.editorState?.isDirty || false;
  }

  isValid(): boolean {
    return this.editorState?.isValid || false;
  }

  updateSkill(updates: Partial<SkillDefinition>): void {
    if (!this.currentSkill || !this.editorState) {
      throw new Error('No skill loaded in editor');
    }

    // Apply updates
    Object.assign(this.currentSkill, updates);
    
    // Mark as dirty
    this.editorState.isDirty = true;

    // Auto-validate if enabled
    if (this.config.autoValidate) {
      this.validateSyntax();
    }

    // Auto-save if enabled
    if (this.config.autoSave && this.editorState.isValid) {
      this.saveSkill().catch(error => {
        console.error('Auto-save failed:', error);
      });
    }
  }

  getConfig(): EditorConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<EditorConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  // Editor-specific methods
  addParameter(name: string, type: string, required: boolean = false): void {
    if (!this.currentSkill) {
      throw new Error('No skill loaded in editor');
    }

    const parameter = {
      name,
      type,
      description: '',
      required,
      defaultValue: undefined
    };

    this.currentSkill.invocationSpec.parameters.push(parameter);
    
    // Update input schema
    this.currentSkill.invocationSpec.inputSchema.properties = {
      ...this.currentSkill.invocationSpec.inputSchema.properties,
      [name]: { type: type as any }
    };

    if (required) {
      const requiredFields = Array.isArray(this.currentSkill.invocationSpec.inputSchema.required)
        ? [...this.currentSkill.invocationSpec.inputSchema.required]
        : [];
      requiredFields.push(name);
      this.currentSkill.invocationSpec.inputSchema.required = requiredFields;
    }

    this.markDirty();
  }

  removeParameter(name: string): void {
    if (!this.currentSkill) {
      throw new Error('No skill loaded in editor');
    }

    // Remove from parameters array
    this.currentSkill.invocationSpec.parameters = 
      this.currentSkill.invocationSpec.parameters.filter(p => p.name !== name);

    // Remove from input schema
    const properties = { ...this.currentSkill.invocationSpec.inputSchema.properties };
    delete properties[name];
    this.currentSkill.invocationSpec.inputSchema.properties = properties;

    // Remove from required fields
    if (Array.isArray(this.currentSkill.invocationSpec.inputSchema.required)) {
      this.currentSkill.invocationSpec.inputSchema.required = 
        this.currentSkill.invocationSpec.inputSchema.required.filter(field => field !== name);
    }

    this.markDirty();
  }

  addExample(name: string, input: any, expectedOutput: any): void {
    if (!this.currentSkill) {
      throw new Error('No skill loaded in editor');
    }

    const example = {
      name,
      description: '',
      input,
      expectedOutput
    };

    this.currentSkill.invocationSpec.examples.push(example);
    this.markDirty();
  }

  private markDirty(): void {
    if (this.editorState) {
      this.editorState.isDirty = true;
    }

    if (this.config.autoValidate) {
      this.validateSyntax();
    }
  }
}