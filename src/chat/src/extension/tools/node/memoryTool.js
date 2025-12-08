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
var MemoryTool_1;
Object.defineProperty(exports, "__esModule", { value: true });
const extensionContext_1 = require("../../../platform/extContext/common/extensionContext");
const fileSystemService_1 = require("../../../platform/filesystem/common/fileSystemService");
const extpath = __importStar(require("../../../util/vs/base/common/extpath"));
const resources_1 = require("../../../util/vs/base/common/resources");
const uri_1 = require("../../../util/vs/base/common/uri");
const vscodeTypes_1 = require("../../../vscodeTypes");
const toolNames_1 = require("../common/toolNames");
const toolsRegistry_1 = require("../common/toolsRegistry");
/**
 * All memory operations are confined to the /memories directory within the extension's
 * workspace-specific storage location. Each workspace maintains its own isolated memory.
 */
let MemoryTool = class MemoryTool {
    static { MemoryTool_1 = this; }
    static { this.toolName = toolNames_1.ToolName.Memory; }
    static { this.MEMORY_DIR_NAME = 'memory-tool/memories'; }
    constructor(extensionContext, fileSystem) {
        this.extensionContext = extensionContext;
        this.fileSystem = fileSystem;
    }
    async invoke(options, _token) {
        const params = options.input;
        const result = await this.execute(params);
        const resultText = result.error
            ? `Error: ${result.error}`
            : result.success || '';
        return new vscodeTypes_1.LanguageModelToolResult([
            new vscodeTypes_1.LanguageModelTextPart(resultText)
        ]);
    }
    async execute(params) {
        const command = params.command;
        try {
            switch (command) {
                case 'view':
                    return await this._view(params);
                case 'create':
                    return await this._create(params);
                case 'str_replace':
                    return await this._strReplace(params);
                case 'insert':
                    return await this._insert(params);
                case 'delete':
                    return await this._delete(params);
                case 'rename':
                    return await this._rename(params);
                default:
                    return {
                        error: `Unknown command: ${command}. ` +
                            'Supported commands: view, create, str_replace, insert, delete, rename'
                    };
            }
        }
        catch (error) {
            if (error.message) {
                return { error: error.message };
            }
            return { error: `Unexpected error executing ${command}: ${error}` };
        }
    }
    /**
     * Validate and resolve memory paths to prevent directory traversal attacks.
     */
    validatePath(memoryPath) {
        const storageUri = this.extensionContext.storageUri;
        if (!storageUri) {
            // TODO @bhavya disable tool when no workspace open
            throw new Error('No workspace is currently open. Memory operations require an active workspace.');
        }
        const normalizedPath = extpath.toPosixPath(memoryPath);
        // Validate that path starts with /memories as required by spec
        if (!normalizedPath.startsWith('/memories')) {
            throw new Error(`Path must start with /memories, got: ${memoryPath}. ` +
                'All memory operations must be confined to the /memories directory.');
        }
        // Extract relative path after /memories
        const relativePath = normalizedPath.substring('/memories'.length).replace(/^\/+/, '');
        const memoryRoot = uri_1.URI.joinPath(storageUri, MemoryTool_1.MEMORY_DIR_NAME);
        const pathSegments = relativePath ? relativePath.split('/').filter(s => s.length > 0) : [];
        const fullPath = pathSegments.length > 0
            ? uri_1.URI.joinPath(memoryRoot, ...pathSegments)
            : memoryRoot;
        const normalizedFullPath = (0, resources_1.normalizePath)(fullPath);
        const normalizedMemoryRoot = (0, resources_1.normalizePath)(memoryRoot);
        if (!(0, resources_1.isEqualOrParent)(normalizedFullPath, normalizedMemoryRoot)) {
            throw new Error(`Path '${memoryPath}' would escape /memories directory. ` +
                'Directory traversal attempts are not allowed.');
        }
        return normalizedFullPath;
    }
    async _view(params) {
        const memoryPath = params.path;
        const viewRange = params.view_range;
        if (!memoryPath) {
            return { error: 'Missing required parameter: path' };
        }
        const fullPath = this.validatePath(memoryPath);
        try {
            const stat = await this.fileSystem.stat(fullPath);
            if (stat.type === 2 /* Directory */) {
                try {
                    const entries = await this.fileSystem.readDirectory(fullPath);
                    const items = entries
                        .filter(([name]) => !name.startsWith('.'))
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([name, type]) => type === 2 ? `${name}/` : name);
                    if (items.length === 0) {
                        return { success: `Directory: ${memoryPath}\n(empty)` };
                    }
                    return {
                        success: `Directory: ${memoryPath}\n${items.map(item => `- ${item}`).join('\n')}`
                    };
                }
                catch (error) {
                    return { error: `Cannot read directory ${memoryPath}: ${error.message}` };
                }
            }
            if (stat.type === 1 /* File */) {
                try {
                    const content = await this.fileSystem.readFile(fullPath);
                    const text = new TextDecoder('utf-8').decode(content);
                    const lines = text.split('\n');
                    // Apply view range if specified
                    let displayLines = lines;
                    let startNum = 1;
                    if (viewRange) {
                        const startLine = Math.max(1, viewRange[0]) - 1; // Convert to 0-indexed
                        const endLine = viewRange[1] === -1 ? lines.length : viewRange[1];
                        displayLines = lines.slice(startLine, endLine);
                        startNum = startLine + 1;
                        // Format with line numbers when using view_range
                        const numberedLines = displayLines.map((line, i) => `${String(i + startNum).padStart(4, ' ')}: ${line}`);
                        return { success: numberedLines.join('\n') };
                    }
                    // Return raw content when no view_range specified
                    return { success: text };
                }
                catch (error) {
                    if (error.message?.includes('decode')) {
                        return { error: `Cannot read ${memoryPath}: File is not valid UTF-8 text` };
                    }
                    return { error: `Cannot read file ${memoryPath}: ${error.message}` };
                }
            }
            return { error: `Path not found: ${memoryPath}` };
        }
        catch {
            return { error: `Path not found: ${memoryPath}` };
        }
    }
    /**
     * Create or overwrite a file.
     */
    async _create(params) {
        const memoryPath = params.path;
        const fileText = params.file_text ?? '';
        if (!memoryPath) {
            return { error: 'Missing required parameter: path' };
        }
        const fullPath = this.validatePath(memoryPath);
        try {
            const parentDir = uri_1.URI.joinPath(fullPath, '..');
            await this.fileSystem.createDirectory(parentDir);
            const content = new TextEncoder().encode(fileText);
            await this.fileSystem.writeFile(fullPath, content);
            return { success: `File created successfully at ${memoryPath}` };
        }
        catch (error) {
            return { error: `Cannot create file ${memoryPath}: ${error.message}` };
        }
    }
    /**
     * Replace text in a file.
     */
    async _strReplace(params) {
        const memoryPath = params.path;
        const oldStr = params.old_str;
        const newStr = params.new_str ?? '';
        if (!memoryPath || oldStr === undefined) {
            return { error: 'Missing required parameters: path, old_str' };
        }
        const fullPath = this.validatePath(memoryPath);
        try {
            const stat = await this.fileSystem.stat(fullPath);
            if (stat.type !== 1 /* File */) {
                return { error: `Not a file: ${memoryPath}` };
            }
            const contentBytes = await this.fileSystem.readFile(fullPath);
            const content = new TextDecoder('utf-8').decode(contentBytes);
            // Count occurrences using exact literal matching
            const matchPositions = [];
            for (let searchIdx = 0;;) {
                const idx = content.indexOf(oldStr, searchIdx);
                if (idx === -1) {
                    break;
                }
                matchPositions.push(idx);
                searchIdx = idx + oldStr.length;
            }
            const count = matchPositions.length;
            if (count === 0) {
                return {
                    error: `String not found in ${memoryPath}. ` +
                        'The old_str must exist in the file.'
                };
            }
            if (count > 1) {
                return {
                    error: `String appears ${count} times in ${memoryPath}. ` +
                        'The string must be unique. Use more specific context.'
                };
            }
            const matchIdx = matchPositions[0];
            const newContent = content.slice(0, matchIdx) + newStr + content.slice(matchIdx + oldStr.length);
            const newContentBytes = new TextEncoder().encode(newContent);
            await this.fileSystem.writeFile(fullPath, newContentBytes);
            return { success: `File ${memoryPath} has been edited successfully` };
        }
        catch (error) {
            return { error: `Cannot edit file ${memoryPath}: ${error.message}` };
        }
    }
    /**
     * Insert text at a specific line.
     */
    async _insert(params) {
        const memoryPath = params.path;
        const insertLine = params.insert_line;
        const insertText = params.insert_text ?? '';
        if (!memoryPath || insertLine === undefined) {
            return { error: 'Missing required parameters: path, insert_line' };
        }
        const fullPath = this.validatePath(memoryPath);
        try {
            const stat = await this.fileSystem.stat(fullPath);
            if (stat.type !== 1 /* File */) {
                return { error: `Not a file: ${memoryPath}` };
            }
            const contentBytes = await this.fileSystem.readFile(fullPath);
            const content = new TextDecoder('utf-8').decode(contentBytes);
            const lines = content.split('\n');
            if (insertLine < 0 || insertLine > lines.length) {
                return {
                    error: `Invalid line number ${insertLine}. File has ${lines.length} lines. ` +
                        'insert_line must be between 0 and file length (0 = before first line).'
                };
            }
            // Insert the text
            lines.splice(insertLine, 0, insertText);
            const newContent = lines.join('\n');
            const newContentBytes = new TextEncoder().encode(newContent);
            await this.fileSystem.writeFile(fullPath, newContentBytes);
            return { success: `Text inserted at line ${insertLine} in ${memoryPath}` };
        }
        catch (error) {
            return { error: `Cannot insert into file ${memoryPath}: ${error.message}` };
        }
    }
    /**
     * Delete a file or directory.
     */
    async _delete(params) {
        const memoryPath = params.path;
        if (!memoryPath) {
            return { error: 'Missing required parameter: path' };
        }
        const fullPath = this.validatePath(memoryPath);
        try {
            const stat = await this.fileSystem.stat(fullPath);
            if (stat.type === 1 /* File */) {
                await this.fileSystem.delete(fullPath);
                return { success: `File deleted: ${memoryPath}` };
            }
            else if (stat.type === 2 /* Directory */) {
                await this.fileSystem.delete(fullPath, { recursive: true });
                return { success: `Directory deleted: ${memoryPath}` };
            }
            return { error: `Path not found: ${memoryPath}` };
        }
        catch {
            return { error: `Path not found: ${memoryPath}` };
        }
    }
    /**
     * Rename or move a file/directory.
     */
    async _rename(params) {
        const oldPath = params.old_path;
        const newPath = params.new_path;
        if (!oldPath || !newPath) {
            return { error: 'Missing required parameters: old_path, new_path' };
        }
        const oldFullPath = this.validatePath(oldPath);
        const newFullPath = this.validatePath(newPath);
        try {
            const newParentDir = uri_1.URI.joinPath(newFullPath, '..');
            try {
                await this.fileSystem.stat(newParentDir);
            }
            catch {
                await this.fileSystem.createDirectory(newParentDir);
            }
            await this.fileSystem.rename(oldFullPath, newFullPath, { overwrite: false });
            return { success: `Successfully moved/renamed: ${oldPath} -> ${newPath}` };
        }
        catch (error) {
            return { error: `Cannot rename: ${error.message}` };
        }
    }
};
MemoryTool = MemoryTool_1 = __decorate([
    __param(0, extensionContext_1.IVSCodeExtensionContext),
    __param(1, fileSystemService_1.IFileSystemService)
], MemoryTool);
toolsRegistry_1.ToolRegistry.registerTool(MemoryTool);
//# sourceMappingURL=memoryTool.js.map