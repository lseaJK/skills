// Simple test for skill editor functionality
const testSkill = {
    id: "test-skill-001",
    name: "Test Data Processor",
    version: "1.0.0",
    layer: 2,
    description: "A test skill for processing data files",
    invocationSpec: {
        inputSchema: {
            type: "object",
            properties: {
                filePath: { type: "string" },
                format: { type: "string", enum: ["json", "csv", "xml"] }
            },
            required: ["filePath"]
        },
        outputSchema: {
            type: "object",
            properties: {
                processedData: { type: "object" },
                recordCount: { type: "number" }
            }
        },
        executionContext: {
            environment: {},
            security: { sandboxed: true }
        },
        parameters: [
            {
                name: "filePath",
                type: "string",
                description: "Path to the input file",
                required: true
            },
            {
                name: "format",
                type: "string",
                description: "Input file format",
                required: false
            }
        ],
        examples: [
            {
                name: "Process JSON file",
                description: "Process a JSON data file",
                input: {
                    filePath: "/data/sample.json",
                    format: "json"
                },
                expectedOutput: {
                    processedData: {},
                    recordCount: 100
                }
            }
        ]
    },
    extensionPoints: [],
    dependencies: [],
    metadata: {
        author: "Test Author",
        created: "2024-01-17T00:00:00Z",
        updated: "2024-01-17T00:00:00Z",
        tags: ["data", "processing", "utility"],
        category: "data-processing"
    }
};

console.log("Test skill definition:");
console.log(JSON.stringify(testSkill, null, 2));

// Test validation
function validateTestSkill() {
    const errors = [];
    
    if (!testSkill.name) errors.push("Missing name");
    if (!testSkill.version) errors.push("Missing version");
    if (![1, 2, 3].includes(testSkill.layer)) errors.push("Invalid layer");
    if (!testSkill.invocationSpec) errors.push("Missing invocation spec");
    
    if (errors.length === 0) {
        console.log("✓ Test skill is valid");
    } else {
        console.log("✗ Test skill validation failed:");
        errors.forEach(error => console.log(`  - ${error}`));
    }
}

validateTestSkill();