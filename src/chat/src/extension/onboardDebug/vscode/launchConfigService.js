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
exports.LaunchConfigService = void 0;
const JSONC = __importStar(require("jsonc-parser"));
const vscode = __importStar(require("vscode"));
const offsetLineColumnConverter_1 = require("../../../platform/editing/common/offsetLineColumnConverter");
const objects_1 = require("../../../util/vs/base/common/objects");
const uri_1 = require("../../../util/vs/base/common/uri");
class LaunchConfigService {
    /** @inheritdoc */
    async add(workspaceFolder, toAdd) {
        const config = vscode.workspace.getConfiguration('launch', workspaceFolder);
        const existingConfigs = config.get('configurations');
        if (toAdd.configurations.length) {
            await config.update('configurations', [...toAdd.configurations, ...(existingConfigs || [])], vscode.ConfigurationTarget.WorkspaceFolder);
        }
        const existingInputs = config.get('inputs');
        if (toAdd.inputs?.length) {
            await config.update('inputs', [...toAdd.inputs, ...(existingInputs || [])], vscode.ConfigurationTarget.WorkspaceFolder);
        }
    }
    /** @inheritdoc */
    async show(workspaceFolder, showConfigName) {
        const fileUri = uri_1.URI.joinPath(workspaceFolder, '.vscode', 'launch.json');
        let document;
        try {
            document = await vscode.workspace.openTextDocument(fileUri);
        }
        catch {
            return;
        }
        let range;
        if (showConfigName) {
            try {
                const text = document.getText();
                const objectOffsetStack = [];
                let didFind = false;
                JSONC.visit(text, {
                    onObjectBegin(offset) {
                        objectOffsetStack.push(offset);
                    },
                    onObjectEnd(endOffset, length) {
                        const startOffset = objectOffsetStack.pop();
                        if (didFind) {
                            didFind = false;
                            const convert = new offsetLineColumnConverter_1.OffsetLineColumnConverter(text);
                            const start = convert.offsetToPosition(startOffset);
                            const end = convert.offsetToPosition(endOffset + length);
                            range = new vscode.Range(start.lineNumber - 1, start.column - 1, end.lineNumber - 1, end.column - 1);
                        }
                    },
                    onLiteralValue(value, _offset, _length, _startLine, _startCharacter, pathSupplier) {
                        if (value === showConfigName) {
                            const path = pathSupplier();
                            if (path[path.length - 1] === 'name') {
                                didFind = true;
                            }
                        }
                    },
                });
            }
            catch {
                // ignored
            }
        }
        await vscode.window.showTextDocument(document, { selection: range });
    }
    /** @inheritdoc */
    async launch(config) {
        const debugConfig = 'configurations' in config && config.configurations.length ? config.configurations[0] : config;
        if (!debugConfig) {
            return;
        }
        await vscode.debug.startDebugging(undefined, debugConfig);
    }
    async resolveConfigurationInputs(launchJson, defaults, interactor) {
        if (!interactor) {
            interactor = {
                isGenerating: () => { },
                ensureTask: () => Promise.resolve(true),
                prompt: async (text, defaultValue) => {
                    return await vscode.window.showInputBox({
                        prompt: text,
                        value: defaultValue,
                        ignoreFocusOut: true,
                    });
                },
            };
        }
        const inputs = new Map();
        for (const input of launchJson.inputs || []) {
            const key = `\${input:${input.id}}`;
            const value = await interactor.prompt(input.description, defaults?.get(key));
            if (value === undefined) {
                return undefined;
            }
            inputs.set(key, value);
        }
        const config = (0, objects_1.cloneAndChange)(launchJson.configurations[0], orig => {
            if (typeof orig === 'string') {
                for (const [key, value] of inputs) {
                    orig = orig.replaceAll(key, value);
                }
                return orig;
            }
        });
        return { config, inputs };
    }
}
exports.LaunchConfigService = LaunchConfigService;
//# sourceMappingURL=launchConfigService.js.map