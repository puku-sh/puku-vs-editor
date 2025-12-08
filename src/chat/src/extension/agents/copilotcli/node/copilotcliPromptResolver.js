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
exports.CopilotCLIPromptResolver = void 0;
const fileSystemService_1 = require("../../../../platform/filesystem/common/fileSystemService");
const logService_1 = require("../../../../platform/log/common/logService");
const types_1 = require("../../../../util/common/types");
const async_1 = require("../../../../util/vs/base/common/async");
const map_1 = require("../../../../util/vs/base/common/map");
const path = __importStar(require("../../../../util/vs/base/common/path"));
const uri_1 = require("../../../../util/vs/base/common/uri");
const vscodeTypes_1 = require("../../../../vscodeTypes");
let CopilotCLIPromptResolver = class CopilotCLIPromptResolver {
    constructor(logService, fileSystemService) {
        this.logService = logService;
        this.fileSystemService = fileSystemService;
    }
    async resolvePrompt(request, token) {
        if (request.prompt.startsWith('/')) {
            return { prompt: request.prompt, attachments: [] }; // likely a slash command, don't modify
        }
        const attachments = [];
        const allRefsTexts = [];
        const diagnosticTexts = [];
        const files = [];
        const attachedFiles = new map_1.ResourceSet();
        request.references.forEach(ref => {
            if (collectDiagnosticContent(ref.value, diagnosticTexts, files)) {
                return;
            }
            const uri = uri_1.URI.isUri(ref.value) ? ref.value : (0, types_1.isLocation)(ref.value) ? ref.value.uri : undefined;
            if (!uri || uri.scheme !== 'file') {
                return;
            }
            const filePath = uri.fsPath;
            if (!attachedFiles.has(uri)) {
                attachedFiles.add(uri);
                files.push({ path: filePath, name: ref.name || path.basename(filePath) });
            }
            const valueText = uri_1.URI.isUri(ref.value) ?
                ref.value.fsPath :
                (0, types_1.isLocation)(ref.value) ?
                    `${ref.value.uri.fsPath}:${ref.value.range.start.line + 1}` :
                    undefined;
            if (valueText && ref.range) {
                // Keep the original prompt untouched, just collect resolved paths
                const variableText = request.prompt.substring(ref.range[0], ref.range[1]);
                allRefsTexts.push(`- ${variableText} → ${valueText}`);
            }
        });
        await Promise.all(files.map(async (file) => {
            try {
                const stat = await (0, async_1.raceCancellationError)(this.fileSystemService.stat(uri_1.URI.file(file.path)), token);
                const type = stat.type === vscodeTypes_1.FileType.Directory ? 'directory' : stat.type === vscodeTypes_1.FileType.File ? 'file' : undefined;
                if (!type) {
                    this.logService.error(`[CopilotCLIAgentManager] Ignoring attachment as its not a file/directory (${file.path})`);
                    return;
                }
                attachments.push({
                    type,
                    displayName: file.name,
                    path: file.path
                });
            }
            catch (error) {
                this.logService.error(`[CopilotCLIAgentManager] Failed to attach ${file.path}: ${error}`);
            }
        }));
        const reminderParts = [];
        if (allRefsTexts.length > 0) {
            reminderParts.push(`The user provided the following references:\n${allRefsTexts.join('\n')}`);
        }
        if (diagnosticTexts.length > 0) {
            reminderParts.push(`The user provided the following diagnostics:\n${diagnosticTexts.join('\n')}`);
        }
        let prompt = request.prompt;
        if (reminderParts.length > 0) {
            prompt = `<reminder>\n${reminderParts.join('\n\n')}\n\nIMPORTANT: this context may or may not be relevant to your tasks. You should not respond to this context unless it is highly relevant to your task.\n</reminder>\n\n${prompt}`;
        }
        return { prompt, attachments };
    }
};
exports.CopilotCLIPromptResolver = CopilotCLIPromptResolver;
exports.CopilotCLIPromptResolver = CopilotCLIPromptResolver = __decorate([
    __param(0, logService_1.ILogService),
    __param(1, fileSystemService_1.IFileSystemService)
], CopilotCLIPromptResolver);
function collectDiagnosticContent(value, diagnosticTexts, files) {
    const attachedFiles = new map_1.ResourceSet();
    const diagnosticCollection = getChatReferenceDiagnostics(value);
    if (!diagnosticCollection.length) {
        return false;
    }
    let hasDiagnostics = false;
    // Handle diagnostic reference
    for (const [uri, diagnostics] of diagnosticCollection) {
        if (uri.scheme !== 'file') {
            continue;
        }
        for (const diagnostic of diagnostics) {
            const severityMap = {
                0: 'error',
                1: 'warning',
                2: 'info',
                3: 'hint'
            };
            const severity = severityMap[diagnostic.severity] ?? 'error';
            const code = (typeof diagnostic.code === 'object' && diagnostic.code !== null) ? diagnostic.code.value : diagnostic.code;
            const codeStr = code ? ` [${code}]` : '';
            const line = diagnostic.range.start.line + 1;
            diagnosticTexts.push(`- ${severity}${codeStr} at ${uri.fsPath}:${line}: ${diagnostic.message}`);
            hasDiagnostics = true;
            if (!attachedFiles.has(uri)) {
                attachedFiles.add(uri);
                files.push({ path: uri.fsPath, name: path.basename(uri.fsPath) });
            }
        }
    }
    return hasDiagnostics;
}
function getChatReferenceDiagnostics(value) {
    if (isChatReferenceDiagnostic(value)) {
        return Array.from(value.diagnostics.values());
    }
    if (isDiagnosticCollection(value)) {
        const result = [];
        value.forEach((uri, diagnostics) => {
            result.push([uri, diagnostics]);
        });
        return result;
    }
    return [];
}
function isChatReferenceDiagnostic(value) {
    if (value instanceof vscodeTypes_1.ChatReferenceDiagnostic) {
        return true;
    }
    const possibleDiag = value;
    if (possibleDiag.diagnostics && Array.isArray(possibleDiag.diagnostics)) {
        return true;
    }
    return false;
}
function isDiagnosticCollection(value) {
    const possibleDiag = value;
    if (possibleDiag.clear && typeof possibleDiag.clear === 'function' &&
        possibleDiag.delete && typeof possibleDiag.delete === 'function' &&
        possibleDiag.get && typeof possibleDiag.get === 'function' &&
        possibleDiag.set && typeof possibleDiag.set === 'function' &&
        possibleDiag.forEach && typeof possibleDiag.forEach === 'function') {
        return true;
    }
    return false;
}
//# sourceMappingURL=copilotcliPromptResolver.js.map