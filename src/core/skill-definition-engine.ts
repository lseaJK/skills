import { SkillDefinition, InvocationSpecification, ExtensionPoint, Parameter, Example, SkillExtensionType, ValidationResult, ValidationError, ValidationWarning, ValidationSeverity, SkillDependencyType, Dependency } from '../types';
import { JSONSchema7 } from 'json-schema';
import Ajv from 'ajv';

/**
 * Options for creating skill templates
 */
export interface SkillTemplateOptions {
  id?: string;
  name?: string;
  version?: string;
  description?: string;
  author?: string;
  tags?: string[];
  category?: string;
  license?: string;
  documentation?: string;
  repository?: string;
  dependencies?: Dependency[];
}

/**
 * Engine for creating and managing skill definitions
 */
export class SkillDefinitionEngine {
  private ajv: Ajv;
  private skillDefinitionSchema: JSONSchema7;

  constructor() {
    this.ajv = new Ajv({ 
      allErrors: true, 
      verbose: true, 
      strict: false,
      formats: {
        'date-time': true // Accept any string for date-time format
      }
    });
    this.skillDefinitionSchema = this.createSkillDefinitionSchema();
  }
  /**
   * Create JSON Schema for skill definition validation
   */
  private createSkillDefinitionSchema(): JSONSchema7 {
    return {
      type: 'object',
      required: ['id', 'name', 'version', 'layer', 'description', 'invocationSpec', 'extensionPoints', 'dependencies', 'metadata'],
      properties: {
        id: {
          type: 'string',
          pattern: '^[a-zA-Z0-9_-]+$',
          minLength: 1,
          maxLength: 100
        },
        name: {
          type: 'string',
          minLength: 0, // Allow empty for templates
          maxLength: 200
        },
        version: {
          type: 'string',
          pattern: '^\\d+\\.\\d+\\.\\d+(-[a-zA-Z0-9.-]+)?(\\+[a-zA-Z0-9.-]+)?$'
        },
        layer: {
          type: 'integer',
          enum: [1, 2, 3]
        },
        description: {
          type: 'string',
          minLength: 0, // Allow empty for templates
          maxLength: 1000
        },
        invocationSpec: {
          type: 'object',
          required: ['inputSchema', 'outputSchema', 'executionContext', 'parameters', 'examples'],
          properties: {
            inputSchema: { type: 'object' },
            outputSchema: { type: 'object' },
            executionContext: {
              type: 'object',
              required: ['environment'],
              properties: {
                environment: { type: 'object' },
                workingDirectory: { type: 'string' },
                timeout: { type: 'integer', minimum: 1000, maximum: 300000 },
                resources: {
                  type: 'object',
                  properties: {
                    maxMemory: { type: 'integer', minimum: 1024 },
                    maxCpu: { type: 'integer', minimum: 100 },
                    maxDuration: { type: 'integer', minimum: 1000 },
                    maxFileSize: { type: 'integer', minimum: 1024 }
                  }
                },
                security: {
                  type: 'object',
                  required: ['sandboxed'],
                  properties: {
                    sandboxed: { type: 'boolean' },
                    allowedPaths: { type: 'array', items: { type: 'string' } },
                    allowedNetworkHosts: { type: 'array', items: { type: 'string' } },
                    allowedCommands: { type: 'array', items: { type: 'string' } }
                  }
                }
              }
            },
            parameters: {
              type: 'array',
              items: {
                type: 'object',
                required: ['name', 'type', 'description', 'required'],
                properties: {
                  name: { type: 'string', minLength: 1 },
                  type: { type: 'string', minLength: 1 },
                  description: { type: 'string', minLength: 1 },
                  required: { type: 'boolean' },
                  defaultValue: {},
                  validation: { type: 'object' }
                }
              }
            },
            examples: {
              type: 'array',
              items: {
                type: 'object',
                required: ['name', 'description', 'input', 'expectedOutput'],
                properties: {
                  name: { type: 'string', minLength: 1 },
                  description: { type: 'string', minLength: 1 },
                  input: {},
                  expectedOutput: {},
                  context: { type: 'object' }
                }
              }
            }
          }
        },
        extensionPoints: {
          type: 'array',
          items: {
            type: 'object',
            required: ['id', 'name', 'description', 'type', 'interface', 'required'],
            properties: {
              id: { type: 'string', minLength: 1 },
              name: { type: 'string', minLength: 1 },
              description: { type: 'string', minLength: 1 },
              type: { type: 'string', enum: ['override', 'compose', 'decorate', 'hook'] },
              interface: { type: 'object' },
              required: { type: 'boolean' }
            }
          }
        },
        dependencies: {
          type: 'array',
          items: {
            type: 'object',
            required: ['id', 'name', 'version', 'type', 'optional'],
            properties: {
              id: { type: 'string', minLength: 1 },
              name: { type: 'string', minLength: 1 },
              version: { type: 'string', minLength: 1 },
              type: { type: 'string', enum: ['skill', 'library', 'tool', 'service'] },
              optional: { type: 'boolean' },
              source: { type: 'string' }
            }
          }
        },
        metadata: {
          type: 'object',
          required: ['author', 'created', 'updated', 'tags', 'category'],
          properties: {
            author: { type: 'string', minLength: 0 }, // Allow empty for templates
            created: {}, // Accept any type for created date
            updated: {}, // Accept any type for updated date
            tags: { type: 'array', items: { type: 'string', minLength: 1 } },
            category: { type: 'string', minLength: 1 },
            license: { type: 'string' },
            documentation: { type: 'string' },
            repository: { type: 'string' }
          }
        }
      }
    };
  }

  /**
   * Validate skill definition against JSON Schema
   */
  validateSkillDefinition(skill: SkillDefinition): ValidationResult {
    const validate = this.ajv.compile(this.skillDefinitionSchema);
    const valid = validate(skill);

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

    // Additional business logic validation
    const businessValidation = this.validateBusinessLogic(skill);
    errors.push(...businessValidation.errors);
    warnings.push(...businessValidation.warnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
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

    // Parameter validation
    if (skill.invocationSpec?.parameters) {
      const paramNames = new Set<string>();
      for (let i = 0; i < skill.invocationSpec.parameters.length; i++) {
        const param = skill.invocationSpec.parameters[i];
        
        // Check for duplicate parameter names
        if (paramNames.has(param.name)) {
          errors.push({
            code: 'DUPLICATE_PARAMETER_NAME',
            message: `Duplicate parameter name: ${param.name}`,
            path: `invocationSpec.parameters[${i}].name`,
            severity: ValidationSeverity.ERROR
          });
        }
        paramNames.add(param.name);

        // Validate parameter name format
        if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(param.name)) {
          errors.push({
            code: 'INVALID_PARAMETER_NAME',
            message: `Parameter name must start with letter and contain only letters, numbers, and underscores: ${param.name}`,
            path: `invocationSpec.parameters[${i}].name`,
            severity: ValidationSeverity.ERROR
          });
        }
      }
    }

    // Example validation
    if (skill.invocationSpec?.examples) {
      for (let i = 0; i < skill.invocationSpec.examples.length; i++) {
        const example = skill.invocationSpec.examples[i];
        
        // Validate example input against input schema
        if (skill.invocationSpec.inputSchema) {
          try {
            const inputValidate = this.ajv.compile(skill.invocationSpec.inputSchema);
            if (!inputValidate(example.input)) {
              warnings.push({
                code: 'EXAMPLE_INPUT_MISMATCH',
                message: `Example ${i + 1} input does not match input schema`,
                path: `invocationSpec.examples[${i}].input`
              });
            }
          } catch (error) {
            // Schema compilation error already handled elsewhere
          }
        }
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Get suggestions for schema validation errors
   */
  private getSuggestionsForSchemaError(error: unknown): string[] {
    const suggestions = [];
    
    // Type guard to check if error has the expected structure
    if (typeof error === 'object' && error !== null && 'keyword' in error) {
      const ajvError = error as { keyword: string; params?: Record<string, unknown>; data?: unknown };
      
      switch (ajvError.keyword) {
        case 'required': {
          suggestions.push(`Add the required property: ${ajvError.params?.missingProperty}`);
          break;
        }
        case 'type': {
          suggestions.push(`Expected type ${ajvError.params?.type}, got ${typeof ajvError.data}`);
          break;
        }
        case 'format': {
          suggestions.push(`Value should match format: ${ajvError.params?.format}`);
          break;
        }
        case 'pattern': {
          suggestions.push(`Value should match pattern: ${ajvError.params?.pattern}`);
          break;
        }
        case 'enum': {
          const allowedValues = ajvError.params?.allowedValues;
          if (Array.isArray(allowedValues)) {
            suggestions.push(`Value should be one of: ${allowedValues.join(', ')}`);
          }
          break;
        }
        case 'minLength': {
          suggestions.push(`Value should be at least ${ajvError.params?.limit} characters long`);
          break;
        }
        case 'maxLength': {
          suggestions.push(`Value should be at most ${ajvError.params?.limit} characters long`);
          break;
        }
        default: {
          suggestions.push('Check the data format and try again');
        }
      }
    } else {
      suggestions.push('Check the data format and try again');
    }

    return suggestions;
  }

  /**
   * Create a standardized skill definition template
   */
  createSkillTemplate(layer: 1 | 2 | 3, options?: SkillTemplateOptions): SkillDefinition {
    const now = new Date();
    const skillId = options?.id || this.generateSkillId();
    
    const template: SkillDefinition = {
      id: skillId,
      name: options?.name || '',
      version: options?.version || '1.0.0',
      layer,
      description: options?.description || '',
      invocationSpec: this.createInvocationSpecTemplate(layer),
      extensionPoints: this.createExtensionPointsTemplate(layer),
      dependencies: options?.dependencies || [],
      metadata: {
        author: options?.author || '',
        created: now,
        updated: now,
        tags: options?.tags || [],
        category: options?.category || this.getDefaultCategory(layer),
        license: options?.license || 'MIT',
        documentation: options?.documentation,
        repository: options?.repository
      }
    };

    return template;
  }

  /**
   * Create multiple skill templates for different layers
   */
  createSkillTemplates(layers: (1 | 2 | 3)[], baseOptions?: SkillTemplateOptions): SkillDefinition[] {
    return layers.map((layer) => {
      const layerOptions = {
        ...baseOptions,
        id: baseOptions?.id ? `${baseOptions.id}-layer${layer}` : undefined,
        name: baseOptions?.name ? `${baseOptions.name} (Layer ${layer})` : `Layer ${layer} Skill`,
        category: this.getDefaultCategory(layer)
      };
      return this.createSkillTemplate(layer, layerOptions);
    });
  }

  /**
   * Create skill template from existing skill (clone/copy)
   */
  cloneSkillTemplate(sourceSkill: SkillDefinition, newOptions?: Partial<SkillTemplateOptions>): SkillDefinition {
    const cloned: SkillDefinition = JSON.parse(JSON.stringify(sourceSkill));
    
    // Update with new options
    if (newOptions?.id) cloned.id = newOptions.id;
    if (newOptions?.name) cloned.name = newOptions.name;
    if (newOptions?.version) cloned.version = newOptions.version;
    if (newOptions?.description) cloned.description = newOptions.description;
    if (newOptions?.author) cloned.metadata.author = newOptions.author;
    if (newOptions?.tags) cloned.metadata.tags = newOptions.tags;
    if (newOptions?.category) cloned.metadata.category = newOptions.category;
    
    // Update timestamps
    cloned.metadata.created = new Date();
    cloned.metadata.updated = new Date();
    
    // Generate new ID if not provided
    if (!newOptions?.id) {
      cloned.id = this.generateSkillId();
    }

    return cloned;
  }

  /**
   * Create invocation specification template
   */
  private createInvocationSpecTemplate(layer: number): InvocationSpecification {
    const baseTimeout = layer === 3 ? 60000 : 30000; // Layer 3 gets longer timeout
    const sandboxed = layer !== 1; // Layer 1 typically doesn't need sandboxing
    
    return {
      inputSchema: {
        type: 'object',
        properties: {},
        required: []
      },
      outputSchema: {
        type: 'object',
        properties: {
          result: { type: 'string' },
          timestamp: { type: 'string', format: 'date-time' }
        },
        required: ['result']
      },
      executionContext: {
        environment: {},
        timeout: baseTimeout,
        resources: {
          maxMemory: layer === 3 ? 1024 * 1024 * 1024 : 512 * 1024 * 1024, // Layer 3 gets more memory
          maxCpu: layer === 3 ? 10000 : 5000,
          maxDuration: baseTimeout,
          maxFileSize: 10 * 1024 * 1024 // 10MB
        },
        security: {
          sandboxed,
          allowedPaths: layer === 2 ? ['/tmp', '/var/tmp'] : [],
          allowedNetworkHosts: layer === 3 ? [] : [], // Layer 3 may need network access
          allowedCommands: layer === 2 ? ['ls', 'cat', 'echo', 'grep', 'awk', 'sed'] : []
        }
      },
      parameters: [],
      examples: []
    };
  }

  /**
   * Create extension points template based on layer
   */
  private createExtensionPointsTemplate(layer: number): ExtensionPoint[] {
    const baseExtensionPoints: ExtensionPoint[] = [
      {
        id: 'pre-execution',
        name: 'Pre-execution Hook',
        description: 'Called before skill execution',
        type: SkillExtensionType.HOOK,
        interface: {
          type: 'object',
          properties: {
            params: { type: 'object' },
            context: { type: 'object' }
          }
        },
        required: false
      },
      {
        id: 'post-execution',
        name: 'Post-execution Hook',
        description: 'Called after skill execution',
        type: SkillExtensionType.HOOK,
        interface: {
          type: 'object',
          properties: {
            result: { type: 'object' },
            context: { type: 'object' }
          }
        },
        required: false
      }
    ];

    // Add layer-specific extension points
    switch (layer) {
      case 1:
        baseExtensionPoints.push({
          id: 'function-override',
          name: 'Function Override',
          description: 'Override the core function implementation',
          type: SkillExtensionType.OVERRIDE,
          interface: {
            type: 'object',
            properties: {
              implementation: { type: 'string' }
            }
          },
          required: false
        });
        break;
      case 2:
        baseExtensionPoints.push({
          id: 'command-wrapper',
          name: 'Command Wrapper',
          description: 'Wrap or modify command execution',
          type: SkillExtensionType.DECORATE,
          interface: {
            type: 'object',
            properties: {
              command: { type: 'string' },
              args: { type: 'array' }
            }
          },
          required: false
        });
        break;
      case 3:
        baseExtensionPoints.push({
          id: 'api-composition',
          name: 'API Composition',
          description: 'Compose with other APIs',
          type: SkillExtensionType.COMPOSE,
          interface: {
            type: 'object',
            properties: {
              apis: { type: 'array' },
              workflow: { type: 'object' }
            }
          },
          required: false
        });
        break;
    }

    return baseExtensionPoints;
  }

  /**
   * Add parameter to skill definition
   */
  addParameter(skill: SkillDefinition, parameter: Parameter): SkillDefinition {
    const updatedSkill = { ...skill };
    updatedSkill.invocationSpec = { ...skill.invocationSpec };
    updatedSkill.invocationSpec.parameters = [...skill.invocationSpec.parameters, parameter];
    
    // Update input schema
    const existingProperties = skill.invocationSpec.inputSchema.properties || {};
    const newProperty = parameter.validation || { 
      type: parameter.type as 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null'
    };
    
    updatedSkill.invocationSpec.inputSchema = {
      ...skill.invocationSpec.inputSchema,
      properties: {
        ...existingProperties,
        [parameter.name]: newProperty
      }
    };

    if (parameter.required) {
      const required = Array.isArray(skill.invocationSpec.inputSchema.required) 
        ? [...skill.invocationSpec.inputSchema.required] 
        : [];
      required.push(parameter.name);
      updatedSkill.invocationSpec.inputSchema.required = required;
    }

    return updatedSkill;
  }

  /**
   * Add example to skill definition
   */
  addExample(skill: SkillDefinition, example: Example): SkillDefinition {
    const updatedSkill = { ...skill };
    updatedSkill.invocationSpec = { ...skill.invocationSpec };
    updatedSkill.invocationSpec.examples = [...skill.invocationSpec.examples, example];
    return updatedSkill;
  }

  /**
   * Validate skill definition completeness
   */
  validateCompleteness(skill: SkillDefinition): { complete: boolean; missing: string[] } {
    const missing: string[] = [];

    if (!skill.name.trim()) missing.push('name');
    if (!skill.description.trim()) missing.push('description');
    if (!skill.metadata.author.trim()) missing.push('author');
    if (skill.metadata.tags.length === 0) missing.push('tags');
    if (skill.invocationSpec.parameters.length === 0) missing.push('parameters');
    if (skill.invocationSpec.examples.length === 0) missing.push('examples');

    return {
      complete: missing.length === 0,
      missing
    };
  }

  /**
   * Generate unique skill ID
   */
  private generateSkillId(): string {
    return `skill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get default category based on layer
   */
  private getDefaultCategory(layer: number): string {
    switch (layer) {
      case 1: return 'atomic-operations';
      case 2: return 'command-tools';
      case 3: return 'api-wrappers';
      default: return 'general';
    }
  }

  /**
   * Create skill definition from JSON string
   */
  fromJSON(jsonString: string): SkillDefinition {
    try {
      const skill = JSON.parse(jsonString);
      
      // Convert date strings back to Date objects
      if (skill.metadata?.created) {
        skill.metadata.created = new Date(skill.metadata.created);
      }
      if (skill.metadata?.updated) {
        skill.metadata.updated = new Date(skill.metadata.updated);
      }

      return skill;
    } catch (error) {
      throw new Error(`Invalid JSON format: ${(error as Error).message}`);
    }
  }

  /**
   * Convert skill definition to JSON string
   */
  toJSON(skill: SkillDefinition, pretty: boolean = true): string {
    return JSON.stringify(skill, null, pretty ? 2 : 0);
  }

  /**
   * Merge two skill definitions (useful for extending skills)
   */
  mergeSkillDefinitions(base: SkillDefinition, extension: Partial<SkillDefinition>): SkillDefinition {
    const merged: SkillDefinition = JSON.parse(JSON.stringify(base));

    // Merge basic properties
    if (extension.name) merged.name = extension.name;
    if (extension.version) merged.version = extension.version;
    if (extension.description) merged.description = extension.description;

    // Merge invocation spec
    if (extension.invocationSpec) {
      if (extension.invocationSpec.inputSchema) {
        merged.invocationSpec.inputSchema = {
          ...merged.invocationSpec.inputSchema,
          ...extension.invocationSpec.inputSchema,
          properties: {
            ...merged.invocationSpec.inputSchema.properties,
            ...extension.invocationSpec.inputSchema.properties
          }
        };
      }

      if (extension.invocationSpec.outputSchema) {
        merged.invocationSpec.outputSchema = {
          ...merged.invocationSpec.outputSchema,
          ...extension.invocationSpec.outputSchema
        };
      }

      if (extension.invocationSpec.parameters) {
        merged.invocationSpec.parameters = [
          ...merged.invocationSpec.parameters,
          ...extension.invocationSpec.parameters
        ];
      }

      if (extension.invocationSpec.examples) {
        merged.invocationSpec.examples = [
          ...merged.invocationSpec.examples,
          ...extension.invocationSpec.examples
        ];
      }
    }

    // Merge extension points
    if (extension.extensionPoints) {
      merged.extensionPoints = [
        ...merged.extensionPoints,
        ...extension.extensionPoints
      ];
    }

    // Merge dependencies
    if (extension.dependencies) {
      merged.dependencies = [
        ...merged.dependencies,
        ...extension.dependencies
      ];
    }

    // Merge metadata
    if (extension.metadata) {
      merged.metadata = {
        ...merged.metadata,
        ...extension.metadata,
        tags: [
          ...merged.metadata.tags,
          ...(extension.metadata.tags || [])
        ],
        updated: new Date()
      };
    }

    return merged;
  }

  /**
   * Create a skill definition builder for fluent API
   */
  createBuilder(layer: 1 | 2 | 3): SkillDefinitionBuilder {
    return new SkillDefinitionBuilder(this, layer);
  }
}

/**
 * Fluent builder for creating skill definitions
 */
export class SkillDefinitionBuilder {
  private skill: SkillDefinition;

  constructor(private engine: SkillDefinitionEngine, layer: 1 | 2 | 3) {
    this.skill = engine.createSkillTemplate(layer);
  }

  /**
   * Set skill ID
   */
  withId(id: string): SkillDefinitionBuilder {
    this.skill.id = id;
    return this;
  }

  /**
   * Set skill name
   */
  withName(name: string): SkillDefinitionBuilder {
    this.skill.name = name;
    return this;
  }

  /**
   * Set skill version
   */
  withVersion(version: string): SkillDefinitionBuilder {
    this.skill.version = version;
    return this;
  }

  /**
   * Set skill description
   */
  withDescription(description: string): SkillDefinitionBuilder {
    this.skill.description = description;
    return this;
  }

  /**
   * Set author
   */
  withAuthor(author: string): SkillDefinitionBuilder {
    this.skill.metadata.author = author;
    return this;
  }

  /**
   * Add tags
   */
  withTags(...tags: string[]): SkillDefinitionBuilder {
    this.skill.metadata.tags.push(...tags);
    return this;
  }

  /**
   * Set category
   */
  withCategory(category: string): SkillDefinitionBuilder {
    this.skill.metadata.category = category;
    return this;
  }

  /**
   * Add parameter
   */
  withParameter(name: string, type: string, description: string, required: boolean = false, defaultValue?: unknown): SkillDefinitionBuilder {
    const parameter: Parameter = {
      name,
      type,
      description,
      required,
      defaultValue
    };
    this.skill = this.engine.addParameter(this.skill, parameter);
    return this;
  }

  /**
   * Add example
   */
  withExample(name: string, description: string, input: unknown, expectedOutput: unknown): SkillDefinitionBuilder {
    const example: Example = {
      name,
      description,
      input,
      expectedOutput
    };
    this.skill = this.engine.addExample(this.skill, example);
    return this;
  }

  /**
   * Add dependency
   */
  withDependency(id: string, name: string, version: string, type: SkillDependencyType, optional: boolean = false): SkillDefinitionBuilder {
    const dependency: Dependency = {
      id,
      name,
      version,
      type,
      optional
    };
    this.skill.dependencies.push(dependency);
    return this;
  }

  /**
   * Set execution timeout
   */
  withTimeout(timeout: number): SkillDefinitionBuilder {
    this.skill.invocationSpec.executionContext.timeout = timeout;
    return this;
  }

  /**
   * Set sandboxed execution
   */
  withSandbox(sandboxed: boolean): SkillDefinitionBuilder {
    if (this.skill.invocationSpec.executionContext.security) {
      this.skill.invocationSpec.executionContext.security.sandboxed = sandboxed;
    }
    return this;
  }

  /**
   * Add allowed commands (for layer 2 skills)
   */
  withAllowedCommands(...commands: string[]): SkillDefinitionBuilder {
    if (this.skill.invocationSpec.executionContext.security) {
      this.skill.invocationSpec.executionContext.security.allowedCommands = [
        ...(this.skill.invocationSpec.executionContext.security.allowedCommands || []),
        ...commands
      ];
    }
    return this;
  }

  /**
   * Build the skill definition
   */
  build(): SkillDefinition {
    // Update timestamp
    this.skill.metadata.updated = new Date();
    return { ...this.skill };
  }

  /**
   * Build and validate the skill definition
   */
  buildAndValidate(): { skill: SkillDefinition; validation: ValidationResult } {
    const skill = this.build();
    const validation = this.engine.validateSkillDefinition(skill);
    return { skill, validation };
  }
}