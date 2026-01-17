// Skills Architecture Editor JavaScript

(function() {
    const vscode = acquireVsCodeApi();
    
    let currentSkill = null;
    let isDirty = false;

    // DOM Elements
    const elements = {
        skillName: document.getElementById('skillName'),
        skillVersion: document.getElementById('skillVersion'),
        skillLayer: document.getElementById('skillLayer'),
        skillDescription: document.getElementById('skillDescription'),
        inputSchema: document.getElementById('inputSchema'),
        outputSchema: document.getElementById('outputSchema'),
        skillAuthor: document.getElementById('skillAuthor'),
        skillCategory: document.getElementById('skillCategory'),
        skillTags: document.getElementById('skillTags'),
        parametersContainer: document.getElementById('parametersContainer'),
        examplesContainer: document.getElementById('examplesContainer'),
        addParameterBtn: document.getElementById('addParameterBtn'),
        addExampleBtn: document.getElementById('addExampleBtn'),
        validateBtn: document.getElementById('validateBtn'),
        testBtn: document.getElementById('testBtn'),
        previewBtn: document.getElementById('previewBtn'),
        registerBtn: document.getElementById('registerBtn'),
        saveBtn: document.getElementById('saveBtn'),
        statusMessage: document.getElementById('statusMessage'),
        validationResults: document.getElementById('validationResults')
    };

    // Initialize
    function init() {
        setupEventListeners();
        setStatus('Editor ready');
        
        // Notify VS Code that webview is ready
        vscode.postMessage({ type: 'ready' });
    }

    // Setup event listeners
    function setupEventListeners() {
        // Form field changes
        Object.values(elements).forEach(element => {
            if (element && (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.tagName === 'SELECT')) {
                element.addEventListener('input', markDirty);
                element.addEventListener('change', markDirty);
            }
        });

        // Button clicks
        elements.validateBtn.addEventListener('click', validateSkill);
        elements.testBtn.addEventListener('click', testSkill);
        elements.previewBtn.addEventListener('click', previewSkill);
        elements.registerBtn.addEventListener('click', registerSkill);
        elements.saveBtn.addEventListener('click', saveSkill);
        elements.addParameterBtn.addEventListener('click', addParameter);
        elements.addExampleBtn.addEventListener('click', addExample);

        // Auto-completion for specific fields
        setupAutoCompletion();

        // Syntax highlighting for JSON fields
        setupSyntaxHighlighting();

        // Listen for messages from VS Code
        window.addEventListener('message', handleMessage);
    }

    // Handle messages from VS Code
    function handleMessage(event) {
        const message = event.data;
        
        switch (message.type) {
            case 'updateSkill':
                updateSkillForm(message.skill);
                break;
            case 'validationResult':
                showValidationResults(message);
                break;
            case 'previewResult':
                showPreviewResults(message.result);
                break;
            case 'testResult':
                showTestResults(message.result);
                break;
            case 'registerResult':
                showRegisterResults(message.result);
                break;
            case 'autoCompleteResult':
                showAutoCompleteResults(message.suggestions);
                break;
            case 'error':
                setStatus(message.message, 'error');
                break;
        }
    }

    // Update form with skill data
    function updateSkillForm(skill) {
        currentSkill = skill;
        
        // Basic information
        elements.skillName.value = skill.name || '';
        elements.skillVersion.value = skill.version || '1.0.0';
        elements.skillLayer.value = skill.layer || 1;
        elements.skillDescription.value = skill.description || '';
        
        // Invocation specification
        elements.inputSchema.value = JSON.stringify(skill.invocationSpec?.inputSchema || {}, null, 2);
        elements.outputSchema.value = JSON.stringify(skill.invocationSpec?.outputSchema || {}, null, 2);
        
        // Metadata
        elements.skillAuthor.value = skill.metadata?.author || '';
        elements.skillCategory.value = skill.metadata?.category || 'general';
        elements.skillTags.value = (skill.metadata?.tags || []).join(', ');
        
        // Parameters
        renderParameters(skill.invocationSpec?.parameters || []);
        
        // Examples
        renderExamples(skill.invocationSpec?.examples || []);
        
        isDirty = false;
        updateSaveButton();
        setStatus('Skill loaded');
    }

    // Render parameters
    function renderParameters(parameters) {
        elements.parametersContainer.innerHTML = '';
        
        parameters.forEach((param, index) => {
            const paramElement = createParameterElement(param, index);
            elements.parametersContainer.appendChild(paramElement);
        });
    }

    // Create parameter element
    function createParameterElement(param, index) {
        const div = document.createElement('div');
        div.className = 'parameter-item';
        div.innerHTML = `
            <h4>Parameter ${index + 1}</h4>
            <button class="remove-btn" onclick="removeParameter(${index})" title="Remove parameter">×</button>
            <div class="parameter-row">
                <div class="form-group">
                    <label>Name:</label>
                    <input type="text" class="form-control param-name" value="${param.name || ''}" placeholder="Parameter name">
                </div>
                <div class="form-group">
                    <label>Type:</label>
                    <select class="form-control param-type">
                        <option value="string" ${param.type === 'string' ? 'selected' : ''}>String</option>
                        <option value="number" ${param.type === 'number' ? 'selected' : ''}>Number</option>
                        <option value="boolean" ${param.type === 'boolean' ? 'selected' : ''}>Boolean</option>
                        <option value="object" ${param.type === 'object' ? 'selected' : ''}>Object</option>
                        <option value="array" ${param.type === 'array' ? 'selected' : ''}>Array</option>
                    </select>
                </div>
                <div class="checkbox-group">
                    <input type="checkbox" class="param-required" ${param.required ? 'checked' : ''}>
                    <label>Required</label>
                </div>
            </div>
            <div class="form-group">
                <label>Description:</label>
                <input type="text" class="form-control param-description" value="${param.description || ''}" placeholder="Parameter description">
            </div>
        `;
        
        // Add event listeners
        div.querySelectorAll('input, select').forEach(input => {
            input.addEventListener('input', markDirty);
            input.addEventListener('change', markDirty);
        });
        
        return div;
    }

    // Render examples
    function renderExamples(examples) {
        elements.examplesContainer.innerHTML = '';
        
        examples.forEach((example, index) => {
            const exampleElement = createExampleElement(example, index);
            elements.examplesContainer.appendChild(exampleElement);
        });
    }

    // Create example element
    function createExampleElement(example, index) {
        const div = document.createElement('div');
        div.className = 'example-item';
        div.innerHTML = `
            <h4>Example ${index + 1}</h4>
            <button class="remove-btn" onclick="removeExample(${index})" title="Remove example">×</button>
            <div class="form-group">
                <label>Name:</label>
                <input type="text" class="form-control example-name" value="${example.name || ''}" placeholder="Example name">
            </div>
            <div class="form-group">
                <label>Description:</label>
                <input type="text" class="form-control example-description" value="${example.description || ''}" placeholder="Example description">
            </div>
            <div class="example-row">
                <div class="form-group">
                    <label>Input (JSON):</label>
                    <textarea class="form-control code-editor example-input" rows="4" placeholder="{}">${JSON.stringify(example.input || {}, null, 2)}</textarea>
                </div>
                <div class="form-group">
                    <label>Expected Output (JSON):</label>
                    <textarea class="form-control code-editor example-output" rows="4" placeholder="{}">${JSON.stringify(example.expectedOutput || {}, null, 2)}</textarea>
                </div>
            </div>
        `;
        
        // Add event listeners
        div.querySelectorAll('input, textarea').forEach(input => {
            input.addEventListener('input', markDirty);
            input.addEventListener('change', markDirty);
        });
        
        return div;
    }

    // Add parameter
    function addParameter() {
        const newParam = {
            name: '',
            type: 'string',
            description: '',
            required: false
        };
        
        const paramElement = createParameterElement(newParam, elements.parametersContainer.children.length);
        elements.parametersContainer.appendChild(paramElement);
        markDirty();
    }

    // Remove parameter
    window.removeParameter = function(index) {
        const paramElements = elements.parametersContainer.children;
        if (paramElements[index]) {
            paramElements[index].remove();
            markDirty();
            // Re-render to update indices
            const skill = collectSkillData();
            renderParameters(skill.invocationSpec.parameters);
        }
    };

    // Add example
    function addExample() {
        const newExample = {
            name: '',
            description: '',
            input: {},
            expectedOutput: {}
        };
        
        const exampleElement = createExampleElement(newExample, elements.examplesContainer.children.length);
        elements.examplesContainer.appendChild(exampleElement);
        markDirty();
    }

    // Remove example
    window.removeExample = function(index) {
        const exampleElements = elements.examplesContainer.children;
        if (exampleElements[index]) {
            exampleElements[index].remove();
            markDirty();
            // Re-render to update indices
            const skill = collectSkillData();
            renderExamples(skill.invocationSpec.examples);
        }
    };

    // Collect skill data from form
    function collectSkillData() {
        const skill = {
            id: currentSkill?.id || generateId(),
            name: elements.skillName.value,
            version: elements.skillVersion.value,
            layer: parseInt(elements.skillLayer.value),
            description: elements.skillDescription.value,
            invocationSpec: {
                inputSchema: parseJSON(elements.inputSchema.value) || {},
                outputSchema: parseJSON(elements.outputSchema.value) || {},
                executionContext: currentSkill?.invocationSpec?.executionContext || {
                    environment: {},
                    security: { sandboxed: true }
                },
                parameters: collectParameters(),
                examples: collectExamples()
            },
            extensionPoints: currentSkill?.extensionPoints || [],
            dependencies: currentSkill?.dependencies || [],
            metadata: {
                author: elements.skillAuthor.value,
                created: currentSkill?.metadata?.created || new Date().toISOString(),
                updated: new Date().toISOString(),
                tags: elements.skillTags.value.split(',').map(tag => tag.trim()).filter(tag => tag),
                category: elements.skillCategory.value || 'general'
            }
        };
        
        return skill;
    }

    // Collect parameters from form
    function collectParameters() {
        const parameters = [];
        const paramElements = elements.parametersContainer.children;
        
        for (let i = 0; i < paramElements.length; i++) {
            const element = paramElements[i];
            const param = {
                name: element.querySelector('.param-name').value,
                type: element.querySelector('.param-type').value,
                description: element.querySelector('.param-description').value,
                required: element.querySelector('.param-required').checked
            };
            
            if (param.name) {
                parameters.push(param);
            }
        }
        
        return parameters;
    }

    // Collect examples from form
    function collectExamples() {
        const examples = [];
        const exampleElements = elements.examplesContainer.children;
        
        for (let i = 0; i < exampleElements.length; i++) {
            const element = exampleElements[i];
            const example = {
                name: element.querySelector('.example-name').value,
                description: element.querySelector('.example-description').value,
                input: parseJSON(element.querySelector('.example-input').value) || {},
                expectedOutput: parseJSON(element.querySelector('.example-output').value) || {}
            };
            
            if (example.name) {
                examples.push(example);
            }
        }
        
        return examples;
    }

    // Parse JSON safely
    function parseJSON(jsonString) {
        try {
            return JSON.parse(jsonString);
        } catch (error) {
            return null;
        }
    }

    // Generate ID
    function generateId() {
        return `skill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Mark as dirty
    function markDirty() {
        isDirty = true;
        updateSaveButton();
    }

    // Update save button state
    function updateSaveButton() {
        elements.saveBtn.textContent = isDirty ? 'Save *' : 'Save';
        elements.saveBtn.disabled = !isDirty;
    }

    // Validate skill
    function validateSkill() {
        const skill = collectSkillData();
        setStatus('Validating skill...');
        vscode.postMessage({
            type: 'validate',
            skill: skill
        });
    }

    // Test skill
    function testSkill() {
        const skill = collectSkillData();
        setStatus('Testing skill execution...');
        vscode.postMessage({
            type: 'test',
            skill: skill
        });
    }

    // Preview skill
    function previewSkill() {
        const skill = collectSkillData();
        setStatus('Previewing skill execution...');
        vscode.postMessage({
            type: 'preview',
            skill: skill
        });
    }

    // Register skill
    function registerSkill() {
        const skill = collectSkillData();
        setStatus('Registering skill...');
        vscode.postMessage({
            type: 'registerSkill',
            skill: skill
        });
    }

    // Setup auto-completion
    function setupAutoCompletion() {
        // Category field auto-completion
        elements.skillCategory.addEventListener('input', function(e) {
            requestAutoComplete('category', e.target.value);
        });

        // Tags field auto-completion
        elements.skillTags.addEventListener('input', function(e) {
            requestAutoComplete('tags', e.target.value);
        });
    }

    // Setup syntax highlighting for JSON fields
    function setupSyntaxHighlighting() {
        const jsonFields = [elements.inputSchema, elements.outputSchema];
        
        jsonFields.forEach(field => {
            field.addEventListener('input', function(e) {
                validateAndHighlightJSON(e.target);
            });
            
            field.addEventListener('blur', function(e) {
                formatJSON(e.target);
            });
        });
    }

    // Validate and highlight JSON
    function validateAndHighlightJSON(element) {
        try {
            JSON.parse(element.value);
            element.classList.remove('json-error');
            element.classList.add('json-valid');
        } catch (error) {
            element.classList.remove('json-valid');
            element.classList.add('json-error');
        }
    }

    // Format JSON
    function formatJSON(element) {
        try {
            const parsed = JSON.parse(element.value);
            element.value = JSON.stringify(parsed, null, 2);
            element.classList.remove('json-error');
            element.classList.add('json-valid');
        } catch (error) {
            // Keep original value if invalid
        }
    }

    // Request auto-completion
    function requestAutoComplete(field, query) {
        vscode.postMessage({
            type: 'getAutoComplete',
            context: {
                field: field,
                query: query
            }
        });
    }

    // Save skill
    function saveSkill() {
        const skill = collectSkillData();
        setStatus('Saving skill...');
        vscode.postMessage({
            type: 'save',
            skill: skill
        });
        
        // Also update document
        vscode.postMessage({
            type: 'updateDocument',
            skill: skill
        });
        
        isDirty = false;
        updateSaveButton();
        setStatus('Skill saved successfully');
    }

    // Show validation results
    function showValidationResults(result) {
        let html = '';
        
        if (result.valid) {
            html = '<span class="validation-success">✓ Skill is valid</span>';
            setStatus('Validation passed');
        } else {
            html = '<span class="validation-error">✗ Validation failed</span>';
            setStatus('Validation failed');
        }
        
        if (result.errors && result.errors.length > 0) {
            result.errors.forEach(error => {
                html += `<span class="validation-error">Error: ${error}</span>`;
            });
        }
        
        if (result.warnings && result.warnings.length > 0) {
            result.warnings.forEach(warning => {
                html += `<span class="validation-warning">Warning: ${warning}</span>`;
            });
        }
        
        elements.validationResults.innerHTML = html;
    }

    // Show test results
    function showTestResults(result) {
        if (result.success) {
            setStatus(`Test completed in ${result.duration?.toFixed(0)}ms`);
            
            let html = '<div class="test-results">';
            html += '<h3>Test Results</h3>';
            
            if (result.testResults) {
                result.testResults.forEach(test => {
                    const status = test.success ? '✓' : '✗';
                    const statusClass = test.success ? 'test-success' : 'test-failure';
                    html += `<div class="test-result ${statusClass}">`;
                    html += `<span class="test-status">${status}</span>`;
                    html += `<span class="test-name">${test.exampleName}</span>`;
                    html += `<span class="test-message">${test.message}</span>`;
                    html += '</div>';
                });
            }
            
            html += '</div>';
            elements.validationResults.innerHTML = html;
        } else {
            setStatus(`Test failed: ${result.error}`, 'error');
            elements.validationResults.innerHTML = `<span class="validation-error">Test failed: ${result.error}</span>`;
        }
    }

    // Show register results
    function showRegisterResults(result) {
        if (result.success) {
            setStatus(result.message);
            elements.validationResults.innerHTML = `<span class="validation-success">✓ ${result.message}</span>`;
        } else {
            setStatus(`Registration failed: ${result.error}`, 'error');
            elements.validationResults.innerHTML = `<span class="validation-error">Registration failed: ${result.error}</span>`;
        }
    }

    // Show auto-complete results
    function showAutoCompleteResults(suggestions) {
        // This would typically show a dropdown, but for now we'll log it
        console.log('Auto-complete suggestions:', suggestions);
        // In a full implementation, you'd show a dropdown with these suggestions
    }

    // Set status message
    function setStatus(message, type = 'info') {
        elements.statusMessage.textContent = message;
        elements.statusMessage.className = `status-message status-${type}`;
        
        // Clear status after 5 seconds for non-error messages
        if (type !== 'error') {
            setTimeout(() => {
                if (elements.statusMessage.textContent === message) {
                    elements.statusMessage.textContent = 'Ready';
                    elements.statusMessage.className = 'status-message';
                }
            }, 5000);
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
    // Show preview results
    function showPreviewResults(result) {
        if (result.success) {
            setStatus(`Preview completed in ${result.duration?.toFixed(0)}ms`);
            console.log('Preview result:', result.output);
        } else {
            setStatus(`Preview failed: ${result.error}`, 'error');
        }
    }