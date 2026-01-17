import * as vscode from 'vscode';
import { ConfigurationManager } from '../managers/configurationManager';
/**
 * Custom editor provider for skill files
 */
export declare class SkillEditorProvider implements vscode.CustomTextEditorProvider {
    private context;
    private configManager;
    private static readonly viewType;
    constructor(context: vscode.ExtensionContext, configManager: ConfigurationManager);
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
     * Validate skill
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
     * Generate nonce for CSP
     */
    private getNonce;
    /**
     * Get view type
     */
    static getViewType(): string;
}
//# sourceMappingURL=skillEditorProvider.d.ts.map