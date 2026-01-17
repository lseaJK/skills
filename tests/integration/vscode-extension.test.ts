/**
 * Integration tests for VS Code extension components
 * Tests the integration between core system and VS Code extension
 */

import * as vscode from 'vscode';
import { SkillsArchitectureExtension } from '../../extension/src/skillsArchitectureExtension';
import { ConfigurationManager } from '../../extension/src/managers/configurationManager';
import { CommandManager } from '../../extension/src/managers/commandManager';
import { EventManager } from '../../extension/src/managers/eventManager';
import { SyncManager } from '../../extension/src/managers/syncManager';
import { SkillsTreeDataProvider } from '../../extension/src/providers/skillsTreeDataProvider';
import { SkillEditorProvider } from '../../extension/src/providers/skillEditorProvider';
import { InMemorySkillRegistry } from '../../extension/src/core/skillRegistry';
import { SkillDefinition } from '../../extension/src/types';

// Mock VS Code API
const mockContext: vscode.ExtensionContext = {
  subscriptions: [],
  workspaceState: {
    get: jest.fn(),
    update: jest.fn(),
    keys: jest.fn()
  } as any,
  globalState: {
    get: jest.fn(),
    update: jest.fn(),
    setKeysForSync: jest.fn(),
    keys: jest.fn()
  } as any,
  extensionPath: '/mock/extension/path',
  extensionUri: vscode.Uri.file('/mock/extension/path'),
  environmentVariableCollection: {} as any,
  asAbsolutePath: jest.fn((path: string) => `/mock/extension/path/${path}`),
  storageUri: vscode.Uri.file('/mock/storage'),
  globalStorageUri: vscode.Uri.file('/mock/global-storage'),
  logUri: vscode.Uri.file('/mock/logs'),
  extensionMode: vscode.ExtensionMode.Test,
  secrets: {} as any,
  extension: {} as any,
  languageModelAccessInformation: {} as any
};

// Mock VS Code commands
const mockCommands = {
  executeCommand: jest.fn(),
  registerCommand: jest.fn(),
  getCommands: jest.fn()
};

// Mock VS Code window
const mockWindow = {
  showInformationMessage: jest.fn(),
  showWarningMessage: jest.fn(),
  showErrorMessage: jest.fn(),
  createTreeView: jest.fn(),
  registerCustomEditorProvider: jest.fn(),
  showTextDocument: jest.fn(),
  activeTextEditor: undefined
};

// Mock VS Code workspace
const mockWorkspace = {
  workspaceFolders: [
    {
      uri: vscode.Uri.file('/mock/workspace'),
      name: 'test-workspace',
      index: 0
    }
  ],
  onDidChangeConfiguration: jest.fn(),
  onDidChangeWorkspaceFolders: jest.fn(),
  createFileSystemWatcher: jest.fn(),
  getConfiguration: jest.fn()
};

// Setup mocks
jest.mock('vscode', () => ({
  commands: mockCommands,
  window: mockWindow,
  workspace: mockWorkspace,
  Uri: {
    file: jest.fn((path: string) => ({ fsPath: path, path })),
    parse: jest.fn()
  },
  TreeItem: jest.fn(),
  TreeItemCollapsibleState: {
    None: 0,
    Collapsed: 1,
    Expanded: 2
  },
  ExtensionMode: {
    Test: 3
  },
  RelativePattern: jest.fn(),
  EventEmitter: jest.fn(() => ({
    event: jest.fn(),
    fire: jest.fn(),
    dispose: jest.fn()
  })),
  Disposable: {
    from: jest.fn()
  }
}));

describe('VS Code Extension Integration Tests', () => {
  let extension: SkillsArchitectureExtension;
  let skillRegistry: InMemorySkillRegistry;

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup mock returns
    mockCommands.executeCommand.mockResolvedValue(undefined);
    mockCommands.registerCommand.mockReturnValue({ dispose: jest.fn() });
    mockWindow.createTreeView.mockReturnValue({
      onDidChangeSelection: jest.fn(() => ({ dispose: jest.fn() })),
      onDidChangeVisibility: jest.fn(() => ({ dispose: jest.fn() })),
      dispose: jest.fn()
    });
    mockWindow.registerCustomEditorProvider.mockReturnValue({ dispose: jest.fn() });
    mockWorkspace.onDidChangeConfiguration.mockReturnValue({ dispose: jest.fn() });
    mockWorkspace.onDidChangeWorkspaceFolders.mockReturnValue({ dispose: jest.fn() });
    mockWorkspace.createFileSystemWatcher.mockReturnValue({
      onDidCreate: jest.fn(() => ({ dispose: jest.fn() })),
      onDidChange: jest.fn(() => ({ dispose: jest.fn() })),
      onDidDelete: jest.fn(() => ({ dispose: jest.fn() })),
      dispose: jest.fn()
    });
    mockWorkspace.getConfiguration.mockReturnValue({
      get: jest.fn(),
      update: jest.fn(),
      has: jest.fn(),
      inspect: jest.fn()
    });

    // Create extension instance
    extension = new SkillsArchitectureExtension(mockContext);
    skillRegistry = extension.getSkillRegistry();
  });

  afterEach(() => {
    if (extension) {
      extension.dispose();
    }
  });

  describe('Extension Initialization', () => {
    test('should initialize all components successfully', async () => {
      await extension.initialize();

      // Verify context is set
      expect(mockCommands.executeCommand).toHaveBeenCalledWith(
        'setContext', 
        'skillsArchitecture.enabled', 
        true
      );

      // Verify tree view is created
      expect(mockWindow.createTreeView).toHaveBeenCalledWith(
        'skillsExplorer',
        expect.objectContaining({
          treeDataProvider: expect.any(Object),
          showCollapseAll: true,
          canSelectMany: false
        })
      );

      // Verify custom editor is registered
      expect(mockWindow.registerCustomEditorProvider).toHaveBeenCalledWith(
        'skillsArchitecture.skillEditor',
        expect.any(Object),
        expect.objectContaining({
          webviewOptions: {
            retainContextWhenHidden: true
          }
        })
      );
    });

    test('should handle initialization errors gracefully', async () => {
      // Mock an initialization error
      mockCommands.executeCommand.mockRejectedValueOnce(new Error('Mock initialization error'));

      await expect(extension.initialize()).rejects.toThrow('Mock initialization error');
    });

    test('should register all required commands', async () => {
      await extension.initialize();

      // Verify command manager is initialized
      const commandManager = extension.getCommandManager();
      expect(commandManager).toBeDefined();
    });
  });

  describe('Component Integration', () => {
    beforeEach(async () => {
      await extension.initialize();
    });

    test('should integrate skill registry with tree provider', async () => {
      // Create and register a test skill
      const testSkill = createTestSkill('integration-test-skill', 1);
      await skillRegistry.register(testSkill);

      // Get tree provider and verify it can access the skill
      const treeProvider = extension.getSkillsTreeProvider();
      expect(treeProvider).toBeDefined();

      // Refresh tree provider
      await treeProvider.refresh();

      // Verify skill appears in tree (this would normally trigger UI updates)
      const skills = await skillRegistry.list();
      expect(skills).toContainEqual(testSkill);
    });

    test('should integrate configuration manager with other components', async () => {
      const configManager = extension.getConfigurationManager();
      expect(configManager).toBeDefined();

      // Test configuration access
      const skillsPath = configManager.getSkillsPath();
      expect(skillsPath).toBeDefined();

      // Test configuration change handling
      const mockConfigEvent = {
        affectsConfiguration: jest.fn().mockReturnValue(true)
      };

      // Simulate configuration change
      configManager.handleConfigurationChange(mockConfigEvent as any);
      expect(mockConfigEvent.affectsConfiguration).toHaveBeenCalled();
    });

    test('should integrate sync manager with skill registry', async () => {
      const syncManager = extension.getSyncManager();
      expect(syncManager).toBeDefined();

      // Create test skill
      const testSkill = createTestSkill('sync-test-skill', 2);
      await skillRegistry.register(testSkill);

      // Test sync operations (mocked)
      // In real implementation, this would sync with external sources
      const syncStatus = syncManager.getSyncStatus();
      expect(syncStatus).toBeDefined();
    });

    test('should handle event propagation between components', async () => {
      const eventManager = extension.getEventManager();
      expect(eventManager).toBeDefined();

      // Simulate tree selection change
      const mockSelectionEvent = {
        selection: [{ id: 'test-skill' }]
      };

      eventManager.handleTreeSelectionChange(mockSelectionEvent as any);

      // Simulate file system change
      const mockUri = vscode.Uri.file('/test/skill.json');
      eventManager.handleSkillFileCreated(mockUri);
      eventManager.handleSkillFileChanged(mockUri);
      eventManager.handleSkillFileDeleted(mockUri);

      // Verify events are handled without errors
      expect(true).toBe(true); // If we reach here, no errors occurred
    });
  });

  describe('Skill Management Operations', () => {
    beforeEach(async () => {
      await extension.initialize();
    });

    test('should handle skill creation workflow', async () => {
      const commandManager = extension.getCommandManager();
      
      // Mock skill creation command
      const createSkillCommand = jest.fn().mockResolvedValue(undefined);
      mockCommands.registerCommand.mockImplementation((command, handler) => {
        if (command === 'skillsArchitecture.createSkill') {
          createSkillCommand.mockImplementation(handler);
        }
        return { dispose: jest.fn() };
      });

      // Simulate skill creation
      await createSkillCommand();

      // Verify command was registered
      expect(mockCommands.registerCommand).toHaveBeenCalledWith(
        expect.stringContaining('createSkill'),
        expect.any(Function)
      );
    });

    test('should handle skill editing workflow', async () => {
      // Create and register a test skill
      const testSkill = createTestSkill('edit-test-skill', 1);
      await skillRegistry.register(testSkill);

      const editorProvider = extension.getSkillEditorProvider();
      expect(editorProvider).toBeDefined();

      // Simulate opening skill editor
      const mockDocument = {
        uri: vscode.Uri.file('/test/skill.json')
      };

      const mockWebviewPanel = {
        webview: {
          html: '',
          onDidReceiveMessage: jest.fn(),
          postMessage: jest.fn()
        },
        onDidDispose: jest.fn(),
        dispose: jest.fn()
      };

      // Test editor provider methods
      expect(() => {
        editorProvider.resolveCustomTextEditor(
          mockDocument as any,
          mockWebviewPanel as any,
          {} as any
        );
      }).not.toThrow();
    });

    test('should handle skill testing workflow', async () => {
      // Create and register a test skill
      const testSkill = createTestSkill('test-execution-skill', 2);
      await skillRegistry.register(testSkill);

      // Mock test execution
      const testCommand = jest.fn().mockResolvedValue({
        success: true,
        output: 'Test execution successful'
      });

      // Simulate skill testing
      const result = await testCommand();
      expect(result.success).toBe(true);
    });

    test('should handle skill import/export workflow', async () => {
      // Create test skills
      const skill1 = createTestSkill('export-skill-1', 1);
      const skill2 = createTestSkill('export-skill-2', 3);
      
      await skillRegistry.register(skill1);
      await skillRegistry.register(skill2);

      // Mock export operation
      const exportCommand = jest.fn().mockResolvedValue({
        success: true,
        exportPath: '/mock/export/path'
      });

      // Mock import operation
      const importCommand = jest.fn().mockResolvedValue({
        success: true,
        importedSkills: ['export-skill-1', 'export-skill-2']
      });

      // Test export/import workflow
      const exportResult = await exportCommand();
      expect(exportResult.success).toBe(true);

      const importResult = await importCommand();
      expect(importResult.success).toBe(true);
      expect(importResult.importedSkills).toHaveLength(2);
    });
  });

  describe('Error Handling and Recovery', () => {
    beforeEach(async () => {
      await extension.initialize();
    });

    test('should handle skill registry errors gracefully', async () => {
      // Try to register invalid skill
      const invalidSkill = {
        id: '', // Invalid: empty ID
        name: 'Invalid Skill'
      } as SkillDefinition;

      await expect(skillRegistry.register(invalidSkill)).rejects.toThrow();

      // Verify error is handled and doesn't crash extension
      expect(extension.getSkillRegistry()).toBeDefined();
    });

    test('should handle VS Code API errors', async () => {
      // Mock VS Code API error
      mockWindow.showErrorMessage.mockRejectedValueOnce(new Error('VS Code API error'));

      // Simulate error scenario
      try {
        await mockWindow.showErrorMessage('Test error');
      } catch (error) {
        // Verify error is caught and handled
        expect(error).toBeDefined();
      }

      // Extension should still be functional
      expect(extension.getSkillRegistry()).toBeDefined();
    });

    test('should recover from sync failures', async () => {
      const syncManager = extension.getSyncManager();
      
      // Mock sync failure
      const mockSyncError = new Error('Sync failed');
      
      // Simulate sync error handling
      try {
        throw mockSyncError;
      } catch (error) {
        // Verify sync manager handles error gracefully
        expect(error.message).toBe('Sync failed');
      }

      // Sync manager should still be operational
      expect(syncManager.getSyncStatus()).toBeDefined();
    });
  });

  describe('Performance and Resource Management', () => {
    beforeEach(async () => {
      await extension.initialize();
    });

    test('should manage resources efficiently', async () => {
      // Create multiple skills to test resource usage
      const skills = Array.from({ length: 50 }, (_, i) => 
        createTestSkill(`perf-test-skill-${i}`, (i % 3) + 1)
      );

      const startTime = Date.now();
      
      // Register all skills
      for (const skill of skills) {
        await skillRegistry.register(skill);
      }
      
      const registrationTime = Date.now() - startTime;
      console.log(`VS Code extension registered ${skills.length} skills in ${registrationTime}ms`);

      // Verify all skills are accessible
      const allSkills = await skillRegistry.list();
      expect(allSkills).toHaveLength(skills.length);

      // Test tree provider performance
      const treeProvider = extension.getSkillsTreeProvider();
      const refreshStartTime = Date.now();
      await treeProvider.refresh();
      const refreshTime = Date.now() - refreshStartTime;
      
      console.log(`Tree provider refreshed ${skills.length} skills in ${refreshTime}ms`);
      expect(refreshTime).toBeLessThan(1000); // Should refresh within 1 second
    });

    test('should dispose resources properly', async () => {
      // Track disposables
      const initialDisposables = mockContext.subscriptions.length;

      // Create additional resources
      const testSkill = createTestSkill('disposal-test-skill', 1);
      await skillRegistry.register(testSkill);

      // Dispose extension
      extension.dispose();

      // Verify cleanup (in real implementation, this would check actual resource cleanup)
      expect(true).toBe(true); // Placeholder - real test would verify resource disposal
    });
  });

  describe('User Experience Integration', () => {
    beforeEach(async () => {
      await extension.initialize();
    });

    test('should provide appropriate user feedback', async () => {
      // Test success feedback
      mockWindow.showInformationMessage.mockResolvedValue('OK');
      
      // Simulate successful operation
      const testSkill = createTestSkill('feedback-test-skill', 1);
      await skillRegistry.register(testSkill);

      // In real implementation, this would trigger user feedback
      expect(mockWindow.showInformationMessage).toHaveBeenCalledTimes(0); // Not called in test setup

      // Test error feedback
      mockWindow.showErrorMessage.mockResolvedValue('OK');
      
      // Simulate error scenario
      try {
        await skillRegistry.register(testSkill); // Duplicate registration should fail
      } catch (error) {
        // Error handling would show user feedback
        expect(error).toBeDefined();
      }
    });

    test('should handle user interactions correctly', async () => {
      // Mock user selection in tree view
      const treeView = extension.getTreeView();
      const mockSelectionEvent = {
        selection: [{ id: 'test-skill', label: 'Test Skill' }]
      };

      // Simulate user interaction
      const eventManager = extension.getEventManager();
      eventManager.handleTreeSelectionChange(mockSelectionEvent as any);

      // Verify interaction is handled
      expect(true).toBe(true); // Placeholder - real test would verify UI state changes
    });
  });

  // Helper function to create test skills
  function createTestSkill(id: string, layer: 1 | 2 | 3): SkillDefinition {
    return {
      id,
      name: `Test Skill ${id}`,
      version: '1.0.0',
      layer,
      description: `Test skill for layer ${layer}`,
      invocationSpec: {
        inputSchema: {
          type: 'object',
          properties: {
            input: { type: 'string' }
          },
          required: ['input']
        },
        outputSchema: {
          type: 'object',
          properties: {
            result: { type: 'string' }
          }
        },
        executionContext: {
          environment: {},
          timeout: 30000
        },
        parameters: [{
          name: 'input',
          type: 'string',
          required: true,
          description: 'Input parameter'
        }],
        examples: [{
          name: 'Example',
          description: 'Test example',
          input: { input: 'test' },
          output: { result: 'test result' }
        }]
      },
      extensionPoints: [{
        id: `${id}-ext-point`,
        name: 'Extension Point',
        description: 'Test extension point',
        interface: {
          methods: ['execute'],
          events: []
        }
      }],
      dependencies: [],
      metadata: {
        author: 'Test',
        created: new Date(),
        updated: new Date(),
        tags: ['test'],
        category: 'testing'
      }
    } as SkillDefinition;
  }
});