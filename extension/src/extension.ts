import * as vscode from 'vscode';
import { SkillsTreeDataProvider } from './providers/skillsTreeDataProvider';
import { SkillEditorProvider } from './providers/skillEditorProvider';
import { ConfigurationManager } from './managers/configurationManager';
import { CommandManager } from './managers/commandManager';
import { EventManager } from './managers/eventManager';
import { SkillsArchitectureExtension } from './skillsArchitectureExtension';

/**
 * Extension activation function
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
    console.log('Activating Universal Skills Architecture extension...');

    try {
        // Initialize the main extension class
        const extension = new SkillsArchitectureExtension(context);
        await extension.initialize();

        // Store extension instance in context for access by other components
        context.globalState.update('skillsArchitectureExtension', extension);

        console.log('Universal Skills Architecture extension activated successfully');
    } catch (error) {
        console.error('Failed to activate Universal Skills Architecture extension:', error);
        vscode.window.showErrorMessage(`Failed to activate Skills Architecture: ${error}`);
        throw error;
    }
}

/**
 * Extension deactivation function
 */
export function deactivate(): void {
    console.log('Deactivating Universal Skills Architecture extension...');
    // Cleanup will be handled by the extension class
}