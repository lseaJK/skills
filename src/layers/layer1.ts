// Layer 1: Atomic Operations - Direct function calls

/**
 * Layer 1 executor interface for atomic operations
 */
export interface Layer1Executor {
  executeFunction(functionName: string, params: any[]): Promise<any>;
  registerFunction(name: string, implementation: Function): void;
  listFunctions(): string[];
}

/**
 * Function registry for Layer 1 operations
 */
export class FunctionRegistry implements Layer1Executor {
  private functions: Map<string, Function> = new Map();

  async executeFunction(functionName: string, params: any[]): Promise<any> {
    const func = this.functions.get(functionName);
    if (!func) {
      throw new Error(`Function not found: ${functionName}`);
    }

    try {
      const result = await func(...params);
      return result;
    } catch (error) {
      throw new Error(`Function execution failed: ${(error as Error).message}`);
    }
  }

  registerFunction(name: string, implementation: Function): void {
    this.functions.set(name, implementation);
  }

  listFunctions(): string[] {
    return Array.from(this.functions.keys());
  }

  unregisterFunction(name: string): void {
    this.functions.delete(name);
  }
}

/**
 * Built-in atomic operations
 */
export class AtomicOperations {
  static readonly BUILT_IN_FUNCTIONS = {
    // File operations
    readFile: async (path: string): Promise<string> => {
      // Placeholder implementation
      return `Content of ${path}`;
    },

    writeFile: async (path: string, content: string): Promise<void> => {
      // Placeholder implementation
      console.log(`Writing to ${path}: ${content.substring(0, 50)}...`);
    },

    // Data operations
    parseJson: (jsonString: string): any => {
      return JSON.parse(jsonString);
    },

    stringifyJson: (data: any): string => {
      return JSON.stringify(data, null, 2);
    },

    // Math operations
    add: (a: number, b: number): number => a + b,
    subtract: (a: number, b: number): number => a - b,
    multiply: (a: number, b: number): number => a * b,
    divide: (a: number, b: number): number => {
      if (b === 0) throw new Error('Division by zero');
      return a / b;
    },

    // String operations
    concat: (...strings: string[]): string => strings.join(''),
    split: (str: string, delimiter: string): string[] => str.split(delimiter),
    trim: (str: string): string => str.trim(),
    toLowerCase: (str: string): string => str.toLowerCase(),
    toUpperCase: (str: string): string => str.toUpperCase(),

    // Array operations
    arrayLength: (arr: any[]): number => arr.length,
    arrayPush: (arr: any[], item: any): any[] => [...arr, item],
    arrayPop: (arr: any[]): { array: any[], item: any } => {
      const newArr = [...arr];
      const item = newArr.pop();
      return { array: newArr, item };
    },
    arrayFilter: (arr: any[], predicate: (item: any) => boolean): any[] => arr.filter(predicate),
    arrayMap: (arr: any[], mapper: (item: any) => any): any[] => arr.map(mapper)
  };

  static registerBuiltInFunctions(registry: FunctionRegistry): void {
    Object.entries(this.BUILT_IN_FUNCTIONS).forEach(([name, func]) => {
      registry.registerFunction(name, func);
    });
  }
}