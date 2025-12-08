"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const vscodeContext_1 = require("../vscodeContext");
// Mock implementation of IWorkbenchService for testing
class MockWorkbenchService {
    constructor(mockSettings = {}, mockCommands = []) {
        this.mockSettings = mockSettings;
        this.mockCommands = mockCommands;
    }
    getAllExtensions() {
        return [];
    }
    async getAllCommands() {
        return this.mockCommands;
    }
    async getAllSettings() {
        return this.mockSettings;
    }
}
(0, vitest_1.describe)('parseSettingsAndCommands', () => {
    (0, vitest_1.it)('returns empty array for non-JSON code blocks', async () => {
        const mockService = new MockWorkbenchService();
        const codeBlock = '```typescript\nconsole.log("hello");\n```';
        const result = await (0, vscodeContext_1.parseSettingsAndCommands)(mockService, codeBlock);
        (0, vitest_1.expect)(result).toEqual([]);
    });
    (0, vitest_1.it)('returns empty array for invalid JSON', async () => {
        const mockService = new MockWorkbenchService();
        const codeBlock = '```json\n{ invalid json\n```';
        const result = await (0, vscodeContext_1.parseSettingsAndCommands)(mockService, codeBlock);
        (0, vitest_1.expect)(result).toEqual([]);
    });
    (0, vitest_1.it)('returns empty array for empty parsed array', async () => {
        const mockService = new MockWorkbenchService();
        const codeBlock = '```json\n[]\n```';
        const result = await (0, vscodeContext_1.parseSettingsAndCommands)(mockService, codeBlock);
        (0, vitest_1.expect)(result).toEqual([]);
    });
    (0, vitest_1.it)('handles trailing commas in JSON', async () => {
        const mockService = new MockWorkbenchService({
            'editor.fontSize': { value: 14 }
        });
        const codeBlock = `\`\`\`json
[
  {
    "type": "setting",
    "details": {
      "key": "editor.fontSize",
    }
  },
]
\`\`\``;
        const result = await (0, vscodeContext_1.parseSettingsAndCommands)(mockService, codeBlock);
        (0, vitest_1.expect)(result).toHaveLength(1);
        (0, vitest_1.expect)(result[0].commandToRun?.command).toBe('workbench.action.openSettings');
        (0, vitest_1.expect)(result[0].commandToRun?.arguments).toEqual(['@id:editor.fontSize ']);
    });
    (0, vitest_1.it)('processes settings and creates openSettings command', async () => {
        const mockService = new MockWorkbenchService({
            'editor.fontSize': { value: 14 },
            'workbench.colorTheme': { value: 'Dark+' }
        });
        const codeBlock = `\`\`\`json
[
  {
    "type": "setting",
    "details": {
      "key": "editor.fontSize"
    }
  },
  {
    "type": "setting",
    "details": {
      "key": "workbench.colorTheme"
    }
  }
]
\`\`\``;
        const result = await (0, vscodeContext_1.parseSettingsAndCommands)(mockService, codeBlock);
        (0, vitest_1.expect)(result).toHaveLength(1);
        (0, vitest_1.expect)(result[0].commandToRun?.command).toBe('workbench.action.openSettings');
        (0, vitest_1.expect)(result[0].commandToRun?.arguments).toEqual(['@id:editor.fontSize @id:workbench.colorTheme ']);
        (0, vitest_1.expect)(result[0].commandToRun?.title).toBe('Show in Settings Editor');
    });
    (0, vitest_1.it)('filters out unknown settings', async () => {
        const mockService = new MockWorkbenchService({
            'editor.fontSize': { value: 14 }
            // 'unknown.setting' is intentionally not included
        });
        const codeBlock = `\`\`\`json
[
  {
    "type": "setting",
    "details": {
      "key": "editor.fontSize"
    }
  },
  {
    "type": "setting",
    "details": {
      "key": "unknown.setting"
    }
  }
]
\`\`\``;
        const result = await (0, vscodeContext_1.parseSettingsAndCommands)(mockService, codeBlock);
        (0, vitest_1.expect)(result).toHaveLength(1);
        (0, vitest_1.expect)(result[0].commandToRun?.arguments).toEqual(['@id:editor.fontSize ']);
    });
    (0, vitest_1.it)('returns empty quickOpen for unknown command', async () => {
        const mockService = new MockWorkbenchService({}, [
            { label: 'Show All Commands', command: 'workbench.action.showCommands', keybinding: 'Ctrl+Shift+P' }
        ]);
        const codeBlock = `\`\`\`json
[
  {
    "type": "command",
    "details": {
      "key": "unknown.command"
    }
  }
]
\`\`\``;
        const result = await (0, vscodeContext_1.parseSettingsAndCommands)(mockService, codeBlock);
        (0, vitest_1.expect)(result).toHaveLength(1);
        (0, vitest_1.expect)(result[0].commandToRun?.command).toBe('workbench.action.quickOpen');
        (0, vitest_1.expect)(result[0].commandToRun?.arguments).toEqual(['>']);
        (0, vitest_1.expect)(result[0].commandToRun?.title).toBe('Open Command Palette');
    });
    (0, vitest_1.it)('processes extension search command', async () => {
        const mockService = new MockWorkbenchService();
        const codeBlock = `\`\`\`json
[
  {
    "type": "command",
    "details": {
      "key": "workbench.extensions.search",
      "value": "python"
    }
  }
]
\`\`\``;
        const result = await (0, vscodeContext_1.parseSettingsAndCommands)(mockService, codeBlock);
        (0, vitest_1.expect)(result).toHaveLength(1);
        (0, vitest_1.expect)(result[0].commandToRun?.command).toBe('workbench.extensions.search');
        (0, vitest_1.expect)(result[0].commandToRun?.arguments).toEqual(['python']);
        (0, vitest_1.expect)(result[0].commandToRun?.title).toBe('Search Extension Marketplace');
    });
    (0, vitest_1.it)('processes extension install command', async () => {
        const mockService = new MockWorkbenchService();
        const codeBlock = `\`\`\`json
[
  {
    "type": "command",
    "details": {
      "key": "workbench.extensions.installExtension",
      "value": ["ms-python.python"]
    }
  }
]
\`\`\``;
        const result = await (0, vscodeContext_1.parseSettingsAndCommands)(mockService, codeBlock);
        (0, vitest_1.expect)(result).toHaveLength(1);
        (0, vitest_1.expect)(result[0].commandToRun?.command).toBe('workbench.extensions.search');
        (0, vitest_1.expect)(result[0].commandToRun?.arguments).toEqual(['ms-python.python']);
        (0, vitest_1.expect)(result[0].commandToRun?.title).toBe('Search Extension Marketplace');
    });
    (0, vitest_1.it)('handles extension search with known queries', async () => {
        const mockService = new MockWorkbenchService();
        const codeBlock = `\`\`\`json
[
  {
    "type": "command",
    "details": {
      "key": "workbench.extensions.search",
      "value": "popular"
    }
  }
]
\`\`\``;
        const result = await (0, vscodeContext_1.parseSettingsAndCommands)(mockService, codeBlock);
        (0, vitest_1.expect)(result).toHaveLength(1);
        (0, vitest_1.expect)(result[0].commandToRun?.arguments).toEqual(['@popular']);
    });
    (0, vitest_1.it)('handles extension search with tag', async () => {
        const mockService = new MockWorkbenchService();
        const codeBlock = `\`\`\`json
[
  {
    "type": "command",
    "details": {
      "key": "workbench.extensions.search",
      "value": "category:themes"
    }
  }
]
\`\`\``;
        const result = await (0, vscodeContext_1.parseSettingsAndCommands)(mockService, codeBlock);
        (0, vitest_1.expect)(result).toHaveLength(1);
        (0, vitest_1.expect)(result[0].commandToRun?.arguments).toEqual(['@category:themes']);
    });
    (0, vitest_1.it)('processes general command with quickOpen', async () => {
        const mockService = new MockWorkbenchService({}, [
            { label: 'Show All Commands', command: 'workbench.action.showCommands', keybinding: 'Ctrl+Shift+P' }
        ]);
        const codeBlock = `\`\`\`json
[
  {
    "type": "command",
    "details": {
      "key": "workbench.action.showCommands"
    }
  }
]
\`\`\``;
        const result = await (0, vscodeContext_1.parseSettingsAndCommands)(mockService, codeBlock);
        (0, vitest_1.expect)(result).toHaveLength(1);
        (0, vitest_1.expect)(result[0].commandToRun?.command).toBe('workbench.action.quickOpen');
        (0, vitest_1.expect)(result[0].commandToRun?.arguments).toEqual(['>Show All Commands']);
        (0, vitest_1.expect)(result[0].commandToRun?.title).toBe('Show in Command Palette');
    });
    (0, vitest_1.it)('handles code block without language specified', async () => {
        const mockService = new MockWorkbenchService({
            'editor.fontSize': { value: 14 }
        });
        const codeBlock = `\`\`\`
[
  {
    "type": "setting",
    "details": {
      "key": "editor.fontSize"
    }
  }
]
\`\`\``;
        const result = await (0, vscodeContext_1.parseSettingsAndCommands)(mockService, codeBlock);
        (0, vitest_1.expect)(result).toHaveLength(1);
        (0, vitest_1.expect)(result[0].commandToRun?.command).toBe('workbench.action.openSettings');
    });
    (0, vitest_1.it)('handles items without details property', async () => {
        const mockService = new MockWorkbenchService({
            'editor.fontSize': { value: 14 }
        });
        const codeBlock = `\`\`\`json
[
  {
    "type": "setting"
  }
]
\`\`\``;
        const result = await (0, vscodeContext_1.parseSettingsAndCommands)(mockService, codeBlock);
        (0, vitest_1.expect)(result).toHaveLength(1);
        (0, vitest_1.expect)(result[0].commandToRun?.arguments).toEqual(['']);
    });
    (0, vitest_1.it)('handles non-string extension arguments', async () => {
        const mockService = new MockWorkbenchService();
        const codeBlock = `\`\`\`json
[
  {
    "type": "command",
    "details": {
      "key": "workbench.extensions.search",
      "value": [123, "python", null]
    }
  }
]
\`\`\``;
        const result = await (0, vscodeContext_1.parseSettingsAndCommands)(mockService, codeBlock);
        (0, vitest_1.expect)(result).toHaveLength(1);
        // Should filter out non-string values
        (0, vitest_1.expect)(result[0].commandToRun?.arguments).toEqual(['python']);
    });
    (0, vitest_1.it)('handles command with empty label', async () => {
        const mockService = new MockWorkbenchService({}, [
            { label: '', command: 'test.command', keybinding: 'Ctrl+T' }
        ]);
        const codeBlock = `\`\`\`json
[
  {
    "type": "command",
    "details": {
      "key": "test.command"
    }
  }
]
\`\`\``;
        const result = await (0, vscodeContext_1.parseSettingsAndCommands)(mockService, codeBlock);
        (0, vitest_1.expect)(result).toHaveLength(1);
        (0, vitest_1.expect)(result[0].commandToRun?.arguments).toEqual(['>']);
        (0, vitest_1.expect)(result[0].commandToRun?.title).toBe('Show in Command Palette');
    });
});
//# sourceMappingURL=vscodeContext.spec.js.map