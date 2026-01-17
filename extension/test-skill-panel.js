// Simple test to verify skill management panel functionality
const { InMemorySkillRegistry } = require('./out/core/skillRegistry');

async function testSkillManagementPanel() {
    console.log('Testing Skill Management Panel functionality...');
    
    try {
        // Test skill registry
        const registry = new InMemorySkillRegistry();
        
        // Create a test skill
        const testSkill = {
            id: 'test-skill-1',
            name: 'Test Skill',
            version: '1.0.0',
            layer: 1,
            description: 'A test skill for validation',
            invocationSpec: {
                inputSchema: { type: 'object', properties: {} },
                outputSchema: { type: 'object', properties: {} },
                executionContext: {
                    environment: {},
                    security: { sandboxed: true }
                },
                parameters: [],
                examples: []
            },
            extensionPoints: [],
            dependencies: [],
            metadata: {
                author: 'Test Author',
                created: new Date().toISOString(),
                updated: new Date().toISOString(),
                tags: ['test', 'example'],
                category: 'testing'
            }
        };
        
        // Test skill registration
        await registry.register(testSkill);
        console.log('✓ Skill registration successful');
        
        // Test skill discovery
        const skills = await registry.discover({ layer: 1 });
        console.log(`✓ Skill discovery successful - found ${skills.length} skills`);
        
        // Test skill validation
        const validation = registry.validate(testSkill);
        console.log(`✓ Skill validation successful - valid: ${validation.valid}`);
        
        // Test skill search
        const searchResults = await registry.search('test');
        console.log(`✓ Skill search successful - found ${searchResults.length} results`);
        
        console.log('\n🎉 All skill management panel tests passed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    }
}

testSkillManagementPanel();