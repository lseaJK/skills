import * as vscode from 'vscode';
import { ConfigurationManager } from '../managers/configurationManager';
import { InMemorySkillRegistry } from '../core/skillRegistry';
/**
 * Custom editor provider for skill files
 */
export declare class SkillEditorProvider implements vscode.CustomTextEditorProvider {
    private context;
    private configManager;
    private skillRegistry;
    private static readonly viewType;
    constructor(context: vscode.ExtensionContext, configManager: ConfigurationManager, skillRegistry: InMemorySkillRegistry);
    /**
     * Initialize the skill editor provider
     */
    initialize(): Promise<void>;
    /**
     * Resolve custom text editor
     */
    resolveCustomTextEditor(document: vscode.TextDocument, webviewPanel: vscode.WebviewPanel, token: vscode.CancellationToken): Promise<void>;
    /**
     * Get webview HTML content
     */
    private getWebviewContent;
    /**
     * Handle messages from webview
     */
    private handleWebviewMessage;
    /**
     * Update webview with document content
     */
    private updateWebview;
    /**
     * Validate skill using the skill registry
     */
    private validateSkill;
    /**
     * Preview skill execution
     */
    private previewSkill;
    /**
     * Save skill to document
     */
    private saveSkill;
    /**
     * Update document with skill data
     */
    private updateDocument;
    /**
     * Test skill execution
     */
    private testSkill;
    /**
     * Get auto-completion suggestions
     */
    private getAutoComplete;
    /**
     * Register skill to the registry
     */
    private registerSkill;
    /**
     * Get view type
     */
    static getViewType(): string;
    /**
     * Generate nonce for CSP
     */
    private getNonce;
}
//# sourceMappingURL=skillEditorProvider.d.ts.map