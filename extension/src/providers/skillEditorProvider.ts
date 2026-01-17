import * as vscode from 'vscode';
import { ConfigurationManager } from '../managers/configurationManager';

/**
 * Custom editor provider for skill files
 */
export class SkillEditorProvider implements vscode.CustomTextEditorProvider {
    private static readonly viewType = 'skillsArchitecture.skillEditor';

    constructor(
        private context: vscode.ExtensionContext,
        private configManager: ConfigurationManager
    ) {}

    /**
     * Initialize the skill editor provider
     */
    async initialize(): Promise<void> {
        console.log('Skill editor provider initialized');
    }

    /**
     * Resolve custom text editor
     */
    async resolveCustomTextEditor(
        document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel,
        token: vscode.CancellationToken
    ): Promise<void> {
        // Setup webview options
        webviewPanel.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.context.extensionUri]
        };

        // Set webview HTML content
        webviewPanel.webview.html = this.getWebviewContent(webviewPanel.webview, document);

        // Handle messages from webview
        webviewPanel.webview.onDidReceiveMessage(
            message => this.handleWebviewMessage(message, document, webviewPanel),
            undefined,
            this.context.subscriptions
        );

        // Update webview when document changes
        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document.uri.toString() === document.uri.toString()) {
                this.updateWebview(webviewPanel.webview, document);
            }
        });

        // Clean up when webview is disposed
        webviewPanel.onDidDispose(() => {
            changeDocumentSubscription.dispose();
        });

        // Initial update
        this.updateWebview(webviewPanel.webview, document);
    }

    /**
     * Get webview HTML content
     */
    private getWebviewContent(webview: vscode.Webview, document: vscode.TextDocument): string {
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'media', 'skillEditor.js')
        );
        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'media', 'skillEditor.css')
        );

        const nonce = this.getNonce();

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="${styleUri}" rel="stylesheet">
    <title>Skill Editor</title>
</head>
<body>
    <div id="app">
        <div class="header">
            <h1>Skill Editor</h1>
            <div class="toolbar">
                <button id="validateBtn" class="btn btn-primary">Validate</button>
                <button id="previewBtn" class="btn btn-secondary">Preview</button>
                <button id="saveBtn" class="btn btn-success">Save</button>
            </div>
        </div>

        <div class="content">
            <div class="form-section">
                <h2>Basic Information</h2>
                <div class="form-group">
                    <label for="skillName">Name:</label>
                    <input type="text" id="skillName" class="form-control" placeholder="Enter skill name">
                </div>
                <div class="form-group">
                    <label for="skillVersion">Version:</label>
                    <input type="text" id="skillVersion" class="form-control" placeholder="1.0.0">
                </div>
                <div class="form-group">
                    <label for="skillLayer">Layer:</label>
                    <select id="skillLayer" class="form-control">
                        <option value="1">Layer 1 - Function Calls</option>
                        <option value="2">Layer 2 - Sandbox Tools</option>
                        <option value="3">Layer 3 - Wrapper APIs</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="skillDescription">Description:</label>
                    <textarea id="skillDescription" class="form-control" rows="3" placeholder="Enter skill description"></textarea>
                </div>
            </div>

            <div class="form-section">
                <h2>Invocation Specification</h2>
                <div class="form-group">
                    <label for="inputSchema">Input Schema (JSON):</label>
                    <textarea id="inputSchema" class="form-control code-editor" rows="8" placeholder="{}"></textarea>
                </div>
                <div class="form-group">
                    <label for="outputSchema">Output Schema (JSON):</label>
                    <textarea id="outputSchema" class="form-control code-editor" rows="8" placeholder="{}"></textarea>
                </div>
            </div>

            <div class="form-section">
                <h2>Parameters</h2>
                <div id="parametersContainer">
                    <!-- Parameters will be dynamically added here -->
                </div>
                <button id="addParameterBtn" class="btn btn-outline">Add Parameter</button>
            </div>

            <div class="form-section">
                <h2>Examples</h2>
                <div id="examplesContainer">
                    <!-- Examples will be dynamically added here -->
                </div>
                <button id="addExampleBtn" class="btn btn-outline">Add Example</button>
            </div>

            <div class="form-section">
                <h2>Metadata</h2>
                <div class="form-group">
                    <label for="skillAuthor">Author:</label>
                    <input type="text" id="skillAuthor" class="form-control" placeholder="Enter author name">
                </div>
                <div class="form-group">
                    <label for="skillCategory">Category:</label>
                    <input type="text" id="skillCategory" class="form-control" placeholder="general">
                </div>
                <div class="form-group">
                    <label for="skillTags">Tags (comma-separated):</label>
                    <input type="text" id="skillTags" class="form-control" placeholder="tag1, tag2, tag3">
                </div>
            </div>
        </div>

        <div class="status-bar">
            <div id="statusMessage" class="status-message"></div>
            <div id="validationResults" class="validation-results"></div>
        </div>
    </div>

    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
    }

    /**
     * Handle messages from webview
     */
    private async handleWebviewMessage(
        message: any,
        document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel
    ): Promise<void> {
        switch (message.type) {
            case 'validate':
                await this.validateSkill(message.skill, webviewPanel.webview);
                break;
            case 'preview':
                await this.previewSkill(message.skill, webviewPanel.webview);
                break;
            case 'save':
                await this.saveSkill(message.skill, document);
                break;
            case 'updateDocument':
                await this.updateDocument(message.skill, document);
                break;
            case 'ready':
                // Webview is ready, send initial data
                this.updateWebview(webviewPanel.webview, document);
                break;
        }
    }

    /**
     * Update webview with document content
     */
    private updateWebview(webview: vscode.Webview, document: vscode.TextDocument): void {
        try {
            const skill = JSON.parse(document.getText());
            webview.postMessage({
                type: 'updateSkill',
                skill: skill
            });
        } catch (error) {
            webview.postMessage({
                type: 'error',
                message: 'Invalid JSON in skill file'
            });
        }
    }

    /**
     * Validate skill
     */
    private async validateSkill(skill: any, webview: vscode.Webview): Promise<void> {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Basic validation
        if (!skill.name || skill.name.trim() === '') {
            errors.push('Skill name is required');
        }

        if (!skill.version || skill.version.trim() === '') {
            errors.push('Skill version is required');
        }

        if (!skill.layer || ![1, 2, 3].includes(skill.layer)) {
            errors.push('Valid skill layer (1, 2, or 3) is required');
        }

        if (!skill.description || skill.description.trim() === '') {
            warnings.push('Skill description is recommended');
        }

        // Schema validation
        try {
            if (skill.invocationSpec?.inputSchema) {
                JSON.stringify(skill.invocationSpec.inputSchema);
            }
        } catch (error) {
            errors.push('Invalid input schema JSON');
        }

        try {
            if (skill.invocationSpec?.outputSchema) {
                JSON.stringify(skill.invocationSpec.outputSchema);
            }
        } catch (error) {
            errors.push('Invalid output schema JSON');
        }

        // Parameters validation
        if (skill.invocationSpec?.parameters) {
            skill.invocationSpec.parameters.forEach((param: any, index: number) => {
                if (!param.name) {
                    errors.push(`Parameter ${index + 1} is missing a name`);
                }
                if (!param.type) {
                    errors.push(`Parameter ${index + 1} is missing a type`);
                }
            });
        }

        webview.postMessage({
            type: 'validationResult',
            valid: errors.length === 0,
            errors: errors,
            warnings: warnings
        });
    }

    /**
     * Preview skill execution
     */
    private async previewSkill(skill: any, webview: vscode.Webview): Promise<void> {
        try {
            // Simulate skill execution
            const result = {
                success: true,
                output: {
                    message: `Preview execution of skill "${skill.name}"`,
                    layer: skill.layer,
                    timestamp: new Date().toISOString(),
                    previewMode: true
                },
                duration: Math.random() * 1000 + 100
            };

            webview.postMessage({
                type: 'previewResult',
                result: result
            });
        } catch (error) {
            webview.postMessage({
                type: 'previewResult',
                result: {
                    success: false,
                    error: `Preview failed: ${error}`
                }
            });
        }
    }

    /**
     * Save skill to document
     */
    private async saveSkill(skill: any, document: vscode.TextDocument): Promise<void> {
        // Update metadata
        skill.metadata = {
            ...skill.metadata,
            updated: new Date().toISOString()
        };

        // Update the document
        await this.updateDocument(skill, document);
    }

    /**
     * Update document with skill data
     */
    private async updateDocument(skill: any, document: vscode.TextDocument): Promise<void> {
        const edit = new vscode.WorkspaceEdit();
        const fullRange = new vscode.Range(
            document.positionAt(0),
            document.positionAt(document.getText().length)
        );
        
        edit.replace(document.uri, fullRange, JSON.stringify(skill, null, 2));
        await vscode.workspace.applyEdit(edit);
    }

    /**
     * Generate nonce for CSP
     */
    private getNonce(): string {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }

    /**
     * Get view type
     */
    static getViewType(): string {
        return SkillEditorProvider.viewType;
    }
}