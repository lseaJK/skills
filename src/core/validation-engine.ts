import Ajv from 'ajv';
import { SkillDefinition, ValidationResult, ValidationContext, ValidatorFunction, ValidationError, ValidationWarning, ValidationSeverity } from '../types';

/**
 * Validation engine for skill definitions and data
 */
export class ValidationEngine {
  private ajv: Ajv;
  private customValidators: Map<string, ValidatorFunction> = new Map();

  constructor() {
    this.ajv = new Ajv({ 
      allErrors: true, 
      verbose: true,
      strict: false 
    });
    this.setupDefaultValidators();
  }

  /**
   * Validate skill definition
   */
  validateSkillDefinition(skill: SkillDefinition, context: ValidationContext = { strict: false, allowUnknownProperties: true, validateExamples: true }): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Basic structure validation
    const structureValidation = this.validateStructure(skill);
    errors.push(...structureValidation.errors);
    warnings.push(...structureValidation.warnings);

    // Schema validation
    const schemaValidation = this.validateSchemas(skill);
    errors.push(...schemaValidation.errors);
    warnings.push(...schemaValidation.warnings);

    // Business logic validation
    const businessValidation = this.validateBusinessLogic(skill);
    errors.push(...businessValidation.errors);
    warnings.push(...businessValidation.warnings);

    // Example validation if requested
    if (context.validateExamples) {
      const exampleValidation = this.validateExamples(skill);
      errors.push(...exampleValidation.errors);
      warnings.push(...exampleValidation.warnings);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate data against JSON schema
   */
  validateData(data: any, schema: any): ValidationResult {
    const validate = this.ajv.compile(schema);
    const valid = validate(data);

    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!valid && validate.errors) {
      for (const error of validate.errors) {
        errors.push({
          code: 'SCHEMA_VALIDATION_ERROR',
          message: `${error.instancePath || 'root'}: ${error.message}`,
          path: error.instancePath,
          severity: ValidationSeverity.ERROR,
          suggestions: this.getSuggestionsForSchemaError(error)
        });
      }
    }

    return {
      valid,
      errors,
      warnings
    };
  }

  /**
   * Register custom validator
   */
  registerValidator(name: string, validator: ValidatorFunction): void {
    this.customValidators.set(name, validator);
  }

  /**
   * Validate structure of skill definition
   */
  private validateStructure(skill: SkillDefinition): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Required fields
    if (!skill.id) {
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Skill ID is required',
        path: 'id',
        severity: ValidationSeverity.ERROR
      });
    }

    if (!skill.name) {
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Skill name is required',
        path: 'name',
        severity: ValidationSeverity.ERROR
      });
    }

    if (!skill.version) {
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Skill version is required',
        path: 'version',
        severity: ValidationSeverity.ERROR
      });
    }

    // Layer validation
    if (![1, 2, 3].includes(skill.layer)) {
      errors.push({
        code: 'INVALID_LAYER',
        message: 'Skill layer must be 1, 2, or 3',
        path: 'layer',
        severity: ValidationSeverity.ERROR,
        suggestions: ['Use layer 1 for atomic operations', 'Use layer 2 for command tools', 'Use layer 3 for API wrappers']
      });
    }

    // Version format validation
    if (skill.version && !this.isValidVersion(skill.version)) {
      warnings.push({
        code: 'INVALID_VERSION_FORMAT',
        message: 'Version should follow semantic versioning (e.g., 1.0.0)',
        path: 'version',
        suggestions: ['Use semantic versioning format: MAJOR.MINOR.PATCH']
      });
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate JSON schemas in skill definition
   */
  private validateSchemas(skill: SkillDefinition): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate input schema
    if (skill.invocationSpec?.inputSchema) {
      try {
        this.ajv.compile(skill.invocationSpec.inputSchema);
      } catch (error: any) {
        errors.push({
          code: 'INVALID_INPUT_SCHEMA',
          message: `Invalid input schema: ${error.message}`,
          path: 'invocationSpec.inputSchema',
          severity: ValidationSeverity.ERROR
        });
      }
    }

    // Validate output schema
    if (skill.invocationSpec?.outputSchema) {
      try {
        this.ajv.compile(skill.invocationSpec.outputSchema);
      } catch (error: any) {
        errors.push({
          code: 'INVALID_OUTPUT_SCHEMA',
          message: `Invalid output schema: ${error.message}`,
          path: 'invocationSpec.outputSchema',
          severity: ValidationSeverity.ERROR
        });
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate business logic rules
   */
  private validateBusinessLogic(skill: SkillDefinition): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Layer-specific validations
    switch (skill.layer) {
      case 1:
        if (skill.invocationSpec?.executionContext?.security?.sandboxed !== false) {
          warnings.push({
            code: 'LAYER1_SANDBOX_WARNING',
            message: 'Layer 1 skills typically do not require sandboxing',
            path: 'invocationSpec.executionContext.security.sandboxed'
          });
        }
        break;
      case 2:
        if (skill.invocationSpec?.executionContext?.security?.sandboxed !== true) {
          errors.push({
            code: 'LAYER2_SANDBOX_REQUIRED',
            message: 'Layer 2 skills must be sandboxed for security',
            path: 'invocationSpec.executionContext.security.sandboxed',
            severity: ValidationSeverity.ERROR
          });
        }
        break;
      case 3:
        if (!skill.invocationSpec?.executionContext?.timeout || skill.invocationSpec.executionContext.timeout < 5000) {
          warnings.push({
            code: 'LAYER3_TIMEOUT_WARNING',
            message: 'Layer 3 skills typically need longer timeout for API calls',
            path: 'invocationSpec.executionContext.timeout'
          });
        }
        break;
    }

    // Dependency validation
    if (skill.dependencies) {
      for (let i = 0; i < skill.dependencies.length; i++) {
        const dep = skill.dependencies[i];
        if (!dep.id || !dep.name || !dep.version) {
          errors.push({
            code: 'INCOMPLETE_DEPENDENCY',
            message: 'Dependencies must have id, name, and version',
            path: `dependencies[${i}]`,
            severity: ValidationSeverity.ERROR
          });
        }
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate examples against schemas
   */
  private validateExamples(skill: SkillDefinition): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!skill.invocationSpec?.examples) {
      return { valid: true, errors, warnings };
    }

    for (let i = 0; i < skill.invocationSpec.examples.length; i++) {
      const example = skill.invocationSpec.examples[i];
      
      // Validate example input against input schema
      if (skill.invocationSpec.inputSchema) {
        const inputValidation = this.validateData(example.input, skill.invocationSpec.inputSchema);
        if (!inputValidation.valid) {
          errors.push({
            code: 'EXAMPLE_INPUT_INVALID',
            message: `Example ${i + 1} input does not match input schema`,
            path: `invocationSpec.examples[${i}].input`,
            severity: ValidationSeverity.ERROR
          });
        }
      }

      // Validate example output against output schema
      if (skill.invocationSpec.outputSchema) {
        const outputValidation = this.validateData(example.expectedOutput, skill.invocationSpec.outputSchema);
        if (!outputValidation.valid) {
          errors.push({
            code: 'EXAMPLE_OUTPUT_INVALID',
            message: `Example ${i + 1} output does not match output schema`,
            path: `invocationSpec.examples[${i}].expectedOutput`,
            severity: ValidationSeverity.ERROR
          });
        }
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Setup default validators
   */
  private setupDefaultValidators(): void {
    // Add custom formats
    this.ajv.addFormat('semver', /^\d+\.\d+\.\d+$/);
    this.ajv.addFormat('skill-id', /^[a-zA-Z0-9_-]+$/);
  }

  /**
   * Check if version follows semantic versioning
   */
  private isValidVersion(version: string): boolean {
    return /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/.test(version);
  }

  /**
   * Get suggestions for schema validation errors
   */
  private getSuggestionsForSchemaError(error: any): string[] {
    const suggestions = [];
    
    switch (error.keyword) {
      case 'required':
        suggestions.push(`Add the required property: ${error.params.missingProperty}`);
        break;
      case 'type':
        suggestions.push(`Expected type ${error.params.type}, got ${typeof error.data}`);
        break;
      case 'format':
        suggestions.push(`Value should match format: ${error.params.format}`);
        break;
      default:
        suggestions.push('Check the data format and try again');
    }

    return suggestions;
  }
}