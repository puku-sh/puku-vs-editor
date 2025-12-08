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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotebookExectionStatusBarItemProvider = void 0;
const l10n = __importStar(require("@vscode/l10n"));
const vscode = __importStar(require("vscode"));
const logService_1 = require("../../../platform/log/common/logService");
const ERROR_OUTPUT_MIME_TYPE = 'application/vnd.code.notebook.error';
let NotebookExectionStatusBarItemProvider = class NotebookExectionStatusBarItemProvider {
    constructor(logService) {
        this.logService = logService;
    }
    async provideCellStatusBarItems(cell, token) {
        // check if quickfix contributions should come from core instead of copilot
        const coreQuickFix = vscode.workspace.getConfiguration('notebook').get('cellFailureDiagnostics');
        if (coreQuickFix) {
            return [];
        }
        if (cell.kind === vscode.NotebookCellKind.Markup) {
            // show generate button for markdown cells
            // only show this when `notebook.experimental.cellChat` is enabled and the cell is not empty
            const enabled = vscode.workspace.getConfiguration('notebook.experimental').get('cellChat');
            if (!enabled) {
                return [];
            }
            const documentContent = cell.document.getText().trim();
            if (!enabled || documentContent.length === 0) {
                return [];
            }
            const title = l10n.t('Generate code from markdown content');
            const message = documentContent;
            return [
                {
                    text: `$(sparkle)`,
                    alignment: vscode.NotebookCellStatusBarAlignment.Left,
                    priority: Number.MAX_SAFE_INTEGER - 1,
                    tooltip: title,
                    command: {
                        title: title,
                        command: 'notebook.cell.chat.start',
                        arguments: [
                            {
                                index: cell.index + 1,
                                input: message,
                                autoSend: true
                            },
                        ],
                    },
                },
            ];
        }
        const outputItem = cell.outputs
            .flatMap(output => output.items)
            .find(item => item.mime === ERROR_OUTPUT_MIME_TYPE);
        if (!outputItem) {
            return [];
        }
        let err;
        try {
            const textDecoder = new TextDecoder();
            err = JSON.parse(textDecoder.decode(outputItem.data));
            if (!err.name && !err.message) {
                return [];
            }
            const title = l10n.t('Fix using Copilot');
            // remove the file and line number from the error message as they are in-memory
            const joinedMessage = [err.name, err.message].filter(Boolean).join(': ').replace(/\s*\(\S+,\s*line\s*\d+\)/, "");
            return [
                {
                    text: `$(sparkle)`,
                    alignment: vscode.NotebookCellStatusBarAlignment.Left,
                    priority: Number.MAX_SAFE_INTEGER - 1,
                    tooltip: title,
                    command: {
                        title: title,
                        command: 'vscode.editorChat.start',
                        arguments: [
                            {
                                autoSend: true,
                                message: `/fix ${joinedMessage}`,
                            },
                        ],
                    },
                }
            ];
        }
        catch (e) {
            this.logService.error(`Failed to parse error output ${e}`);
        }
        return [];
    }
};
exports.NotebookExectionStatusBarItemProvider = NotebookExectionStatusBarItemProvider;
exports.NotebookExectionStatusBarItemProvider = NotebookExectionStatusBarItemProvider = __decorate([
    __param(0, logService_1.ILogService)
], NotebookExectionStatusBarItemProvider);
//# sourceMappingURL=inlineChatNotebookActions.js.map