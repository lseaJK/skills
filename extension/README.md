# Universal Skills Architecture - VS Code Extension

A VS Code extension for managing and developing skills in the Universal Skills Architecture system.

## Features

- **Skills Explorer**: Browse and manage skills organized by layers and categories
- **Visual Skill Editor**: Create and edit skills with a user-friendly interface
- **Skill Testing**: Test skills directly from the editor
- **Import/Export**: Share skills between projects and environments
- **Configuration Management**: Customize extension behavior and settings

## Installation

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "Universal Skills Architecture"
4. Click Install

## Usage

### Skills Explorer

The Skills Explorer appears in the sidebar and shows all skills organized by:
- **Layer 1**: Function calls - Direct atomic operations
- **Layer 2**: Sandbox tools - Command line programs and tools  
- **Layer 3**: Wrapper APIs - High-level programming and execution code

### Creating Skills

1. Click the "+" button in the Skills Explorer
2. Enter a skill name
3. Select the appropriate layer
4. The skill editor will open automatically

### Editing Skills

- Double-click any skill in the explorer to open the editor
- Use the visual editor to modify skill properties
- Validate your skill before saving
- Preview skill execution to test functionality

### Commands

- `Skills Architecture: Show Skills Panel` - Open the skills explorer
- `Skills Architecture: Create New Skill` - Create a new skill
- `Skills Architecture: Refresh Skills` - Reload skills from disk
- `Skills Architecture: Import Skill` - Import a skill from file
- `Skills Architecture: Open Settings` - Open extension settings

## Configuration

Configure the extension through VS Code settings:

```json
{
  "skillsArchitecture.enabled": true,
  "skillsArchitecture.skillsPath": ".skills",
  "skillsArchitecture.autoSave": false,
  "skillsArchitecture.autoValidate": true,
  "skillsArchitecture.showPreview": true,
  "skillsArchitecture.enabledLayers": [1, 2, 3],
  "skillsArchitecture.debugMode": false
}
```

### Settings Description

- `enabled`: Enable/disable the extension
- `skillsPath`: Path to skills directory (relative to workspace root)
- `autoSave`: Automatically save skills when editing
- `autoValidate`: Automatically validate skills while editing
- `showPreview`: Show execution preview in skill editor
- `enabledLayers`: Which skill layers to show (1, 2, 3)
- `debugMode`: Enable debug logging

## Skill File Format

Skills are stored as JSON files with the following structure:

```json
{
  "id": "unique-skill-id",
  "name": "My Skill",
  "version": "1.0.0",
  "layer": 1,
  "description": "A sample skill",
  "invocationSpec": {
    "inputSchema": { "type": "object" },
    "outputSchema": { "type": "object" },
    "executionContext": {
      "environment": {},
      "security": { "sandboxed": true }
    },
    "parameters": [],
    "examples": []
  },
  "extensionPoints": [],
  "dependencies": [],
  "metadata": {
    "author": "Developer",
    "created": "2024-01-01T00:00:00.000Z",
    "updated": "2024-01-01T00:00:00.000Z",
    "tags": ["example"],
    "category": "general"
  }
}
```

## Development

### Building the Extension

```bash
cd extension
npm install
npm run compile
```

### Packaging

```bash
npm run package:extension
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

- [GitHub Issues](https://github.com/skills-architecture/issues)
- [Documentation](https://github.com/skills-architecture/docs)
- [Community Forum](https://github.com/skills-architecture/discussions)