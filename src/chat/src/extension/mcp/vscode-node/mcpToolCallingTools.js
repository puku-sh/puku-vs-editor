"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuickPickTool = exports.QuickInputTool = exports.McpPickRef = void 0;
const vscode = __importStar(require("vscode"));
const errors_1 = require("../../../util/vs/base/common/errors");
class McpPickRef {
    constructor(_inputBarrier) {
        this._inputBarrier = _inputBarrier;
        this._isDisposed = false;
        this.picks = [];
        this._inputBarrier.then(() => {
            if (!this._inner && !this._isDisposed) {
                this.getPick().show();
                this.reset(); // mark as "thinking"
            }
        });
    }
    async pick() {
        await this._inputBarrier;
        const pick = this.getPick();
        pick.busy = false;
        return pick;
    }
    async input() {
        await this._inputBarrier;
        const input = this.getInput();
        input.busy = false;
        return input;
    }
    reset() {
        if (!this._inner) {
            return;
        }
        if (this._inner.type === 'pick') {
            this._inner.value.items = [];
        }
        else {
            this._inner.value.value = '';
        }
        this._inner.value.title = '🤔';
        this._inner.value.placeholder = 'Thinking...';
        this._inner.value.busy = true;
    }
    dispose() {
        this._inner?.value.dispose();
        this._isDisposed = true;
    }
    getInput() {
        if (this._inner?.type !== 'input') {
            this._inner?.value.dispose();
            const input = vscode.window.createInputBox();
            input.ignoreFocusOut = true;
            this._inner = { type: 'input', value: input };
        }
        return this._inner.value;
    }
    getPick() {
        if (this._inner?.type !== 'pick') {
            this._inner?.value.dispose();
            const pick = vscode.window.createQuickPick();
            pick.ignoreFocusOut = true;
            this._inner = { type: 'pick', value: pick };
        }
        return this._inner.value;
    }
}
exports.McpPickRef = McpPickRef;
class QuickInputTool {
    static { this.ID = 'getInput'; }
    static { this.description = 'Prompts the user for a short string input.'; }
    static { this.schema = {
        type: 'object',
        properties: {
            id: {
                type: 'string',
                description: 'An alphanumeric identifier for the input.',
            },
            title: {
                type: 'string',
                description: 'The title of the input box.',
            },
            placeholder: {
                type: 'string',
                description: 'The placeholder text for the input box.',
            },
            value: {
                type: 'string',
                description: 'The default value of the input box.',
            },
        },
        required: ['title', 'id'],
    }; }
    static async invoke(ref, args) {
        const input = await ref.input();
        input.title = args.title;
        input.placeholder = args.placeholder;
        if (args.value) {
            input.value = args.value;
        }
        input.ignoreFocusOut = true;
        const result = await new Promise((resolve) => {
            input.onDidAccept(() => {
                const value = input.value;
                resolve(value);
            });
            input.onDidHide(() => {
                resolve(undefined);
            });
            input.show();
        });
        ref.reset();
        if (result === undefined) {
            throw new errors_1.CancellationError();
        }
        ref.picks.push({ id: args.id, title: args.title, choice: result });
        return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(`${args.title}: ${result}`)]);
    }
}
exports.QuickInputTool = QuickInputTool;
class QuickPickTool {
    static { this.ID = 'getChoice'; }
    static { this.description = 'Prompts the user to select from a list of choices. It returns the label or labels of the choices that were selected'; }
    static { this.schema = {
        type: 'object',
        properties: {
            title: {
                type: 'string',
                description: 'The title of the pick box.',
            },
            placeholder: {
                type: 'string',
                description: 'The placeholder text for the pick box.',
            },
            canPickMany: {
                type: 'boolean',
                description: 'If true, the user can select multiple choices.',
            },
            choices: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        label: { type: 'string', description: 'The primary label of the choice of the choice.' },
                        description: { type: 'string', description: 'A brief extra description.' },
                    }
                },
                minItems: 1,
            },
        },
        required: ['title', 'choices'],
    }; }
    static async invoke(ref, args) {
        const pick = await ref.pick();
        pick.title = args.title;
        pick.placeholder = args.placeholder;
        pick.items = args.choices;
        pick.canSelectMany = args.canPickMany ?? false;
        pick.ignoreFocusOut = true;
        let result = await new Promise((resolve) => {
            pick.onDidAccept(() => {
                const value = args.canPickMany ? pick.selectedItems.map(i => i.label) : pick.selectedItems[0]?.label;
                resolve(value);
            });
            pick.onDidHide(() => {
                resolve(undefined);
            });
            pick.show();
        });
        ref.reset();
        if (result === undefined) {
            throw new errors_1.CancellationError();
        }
        if (Array.isArray(result)) {
            result = '- ' + result.join('\n- ');
        }
        return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(`${args.title}: ${result}`)]);
    }
}
exports.QuickPickTool = QuickPickTool;
//# sourceMappingURL=mcpToolCallingTools.js.map