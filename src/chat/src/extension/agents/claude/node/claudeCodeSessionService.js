"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaudeCodeSessionService = exports.IClaudeCodeSessionService = void 0;
const envService_1 = require("../../../../platform/env/common/envService");
const fileSystemService_1 = require("../../../../platform/filesystem/common/fileSystemService");
const fileTypes_1 = require("../../../../platform/filesystem/common/fileTypes");
const logService_1 = require("../../../../platform/log/common/logService");
const workspaceService_1 = require("../../../../platform/workspace/common/workspaceService");
const services_1 = require("../../../../util/common/services");
const errors_1 = require("../../../../util/vs/base/common/errors");
const map_1 = require("../../../../util/vs/base/common/map");
const resources_1 = require("../../../../util/vs/base/common/resources");
const uri_1 = require("../../../../util/vs/base/common/uri");
exports.IClaudeCodeSessionService = (0, services_1.createServiceIdentifier)('IClaudeCodeSessionService');
let ClaudeCodeSessionService = class ClaudeCodeSessionService {
    constructor(_fileSystem, _logService, _workspace, _nativeEnvService) {
        this._fileSystem = _fileSystem;
        this._logService = _logService;
        this._workspace = _workspace;
        this._nativeEnvService = _nativeEnvService;
        // Simple mtime-based cache
        this._sessionCache = new map_1.ResourceMap();
        this._fileMtimes = new map_1.ResourceMap();
    }
    /**
     * Collect messages from all sessions in all workspace folders.
     * - Read all .jsonl files in the .claude/projects/<folder> dir
     * - Create a map of all messages by uuid
     * - Find leaf nodes (messages that are never referenced as parents)
     * - Build message chains from leaf nodes
     * - These are the complete "sessions" that can be resumed
     */
    async getAllSessions(token) {
        const folders = this._workspace.getWorkspaceFolders();
        const items = [];
        for (const folderUri of folders) {
            if (token.isCancellationRequested) {
                return items;
            }
            const slug = this._computeFolderSlug(folderUri);
            const projectDirUri = uri_1.URI.joinPath(this._nativeEnvService.userHome, '.claude', 'projects', slug);
            // Check if we can use cached data
            const cachedSessions = await this._getCachedSessionsIfValid(projectDirUri, token);
            if (cachedSessions) {
                items.push(...cachedSessions);
                continue;
            }
            // Cache miss or invalid - reload from disk
            const freshSessions = await this._loadSessionsFromDisk(projectDirUri, token);
            this._sessionCache.set(projectDirUri, freshSessions);
            items.push(...freshSessions);
        }
        return items;
    }
    async getSession(resource, token) {
        const all = await this.getAllSessions(token);
        const targetId = resource.path.slice(1); // Remove leading '/' from path
        return all.find(session => session.id === targetId);
    }
    /**
     * Check if cached sessions are still valid by comparing file modification times
     */
    async _getCachedSessionsIfValid(projectDirUri, token) {
        if (!this._sessionCache.has(projectDirUri)) {
            return null; // No cache entry
        }
        try {
            const entries = await this._fileSystem.readDirectory(projectDirUri);
            if (token.isCancellationRequested) {
                return null;
            }
            const currentFiles = new map_1.ResourceSet();
            // Check if any .jsonl files have changed since our last cache
            for (const [name, type] of entries) {
                if (type !== fileTypes_1.FileType.File || !name.endsWith('.jsonl')) {
                    continue;
                }
                const fileUri = uri_1.URI.joinPath(projectDirUri, name);
                currentFiles.add(fileUri);
                try {
                    const stat = await this._fileSystem.stat(fileUri);
                    const cachedMtime = this._fileMtimes.get(fileUri);
                    if (!cachedMtime || stat.mtime > cachedMtime) {
                        // File has changed or is new
                        return null;
                    }
                }
                catch (e) {
                    // File might have been deleted, invalidate cache
                    return null;
                }
            }
            // Check if any previously cached files have been deleted
            for (const cachedFileUri of this._fileMtimes.keys()) {
                if ((0, resources_1.isEqualOrParent)(cachedFileUri, projectDirUri) && cachedFileUri.path.endsWith('.jsonl')) {
                    if (!currentFiles.has(cachedFileUri)) {
                        // A previously cached file has been deleted
                        return null;
                    }
                }
            }
            // All files are unchanged, return cached sessions
            return this._sessionCache.get(projectDirUri) || null;
        }
        catch (e) {
            // Directory read failed, invalidate cache
            this._logService.error(e, `[ClaudeCodeSessionLoader] Failed to check cache validity for: ${projectDirUri}`);
            return null;
        }
    }
    /**
     * Load sessions from disk and update file modification time tracking
     */
    async _loadSessionsFromDisk(projectDirUri, token) {
        let entries = [];
        try {
            entries = await this._fileSystem.readDirectory(projectDirUri);
        }
        catch (e) {
            if (e.code !== 'FileNotFound') {
                this._logService.error(e, `[ClaudeChatSessionItemProvider] ${e.code} Failed to read directory: ${projectDirUri}`);
            }
            return [];
        }
        const fileTasks = [];
        for (const [name, type] of entries) {
            if (type !== fileTypes_1.FileType.File) {
                continue;
            }
            if (!name.endsWith('.jsonl')) {
                continue;
            }
            const sessionId = name.slice(0, -6); // Remove .jsonl extension
            if (!sessionId) {
                continue;
            }
            const fileUri = uri_1.URI.joinPath(projectDirUri, name);
            fileTasks.push(this._getMessagesFromSessionWithUri(fileUri, token));
        }
        const results = await Promise.allSettled(fileTasks);
        if (token.isCancellationRequested) {
            return [];
        }
        const leafNodes = new Set();
        const allMessages = new Map();
        const allSummaries = new Map();
        const referencedAsParent = new Set();
        for (const r of results) {
            if (r.status === 'fulfilled') {
                // Update mtime cache for this file
                try {
                    const stat = await this._fileSystem.stat(r.value.fileUri);
                    this._fileMtimes.set(r.value.fileUri, stat.mtime);
                }
                catch (e) {
                    // File might have been deleted during processing
                }
                for (const [uuid, message] of r.value.messages.entries()) {
                    allMessages.set(uuid, message);
                    if (message.parentUuid) {
                        referencedAsParent.add(message.parentUuid);
                    }
                }
                for (const [uuid, summary] of r.value.summaries.entries()) {
                    allSummaries.set(uuid, summary);
                }
            }
        }
        for (const [uuid] of allMessages) {
            if (!referencedAsParent.has(uuid)) {
                leafNodes.add(uuid);
            }
        }
        const sessions = [];
        for (const leafUuid of leafNodes) {
            const messages = [];
            let currentUuid = leafUuid;
            let summaryEntry;
            // Follow parent chain to build complete message history
            while (currentUuid) {
                const sdkMessage = allMessages.get(currentUuid);
                summaryEntry = allSummaries.get(currentUuid) ?? summaryEntry;
                if (!sdkMessage) {
                    break;
                }
                // Add the SDK message directly
                messages.unshift(sdkMessage);
                currentUuid = sdkMessage.parentUuid;
            }
            // Create session if we have messages
            if (messages.length > 0) {
                const session = {
                    id: allMessages.get(leafUuid).sessionId,
                    label: this._generateSessionLabel(summaryEntry, messages),
                    messages: messages,
                    timestamp: messages[messages.length - 1].timestamp
                };
                sessions.push(session);
            }
        }
        return sessions;
    }
    _reviveStoredSDKMessage(raw) {
        let revivedMessage = {
            ...raw,
            timestamp: new Date(raw.timestamp)
        };
        // Strip attachments from user messages when loading from disk
        if (revivedMessage.type === 'user' && 'message' in revivedMessage && revivedMessage.message?.role === 'user') {
            const strippedContent = this._stripAttachmentsFromMessageContent(revivedMessage.message.content);
            revivedMessage = {
                ...revivedMessage,
                message: {
                    ...revivedMessage.message,
                    content: strippedContent
                }
            };
        }
        return revivedMessage;
    }
    /**
     * Wrapper for _getMessagesFromSession that includes the fileUri in the result
     */
    async _getMessagesFromSessionWithUri(fileUri, token) {
        const result = await this._getMessagesFromSession(fileUri, token);
        return { ...result, fileUri };
    }
    async _getMessagesFromSession(fileUri, token) {
        const summaries = new Map();
        try {
            // Read and parse the JSONL file
            const content = await this._fileSystem.readFile(fileUri);
            if (token.isCancellationRequested) {
                throw new errors_1.CancellationError();
            }
            const text = Buffer.from(content).toString('utf8');
            // Parse JSONL content line by line
            const lines = text.trim().split('\n').filter(line => line.trim());
            const rawMessages = new Map();
            // Parse each line and build message map
            for (const line of lines) {
                try {
                    const entry = JSON.parse(line);
                    if ('uuid' in entry && entry.uuid && 'message' in entry) {
                        const rawEntry = entry;
                        const uuid = rawEntry.uuid;
                        if (!uuid) {
                            continue;
                        }
                        const { isMeta, ...rest } = rawEntry;
                        const normalizedRaw = {
                            ...rest,
                            parentUuid: rawEntry.parentUuid ?? null
                        };
                        rawMessages.set(uuid, {
                            raw: normalizedRaw,
                            isMeta: Boolean(isMeta)
                        });
                    }
                    else if ('summary' in entry && entry.summary && !entry.summary.toLowerCase().startsWith('api error: 401') && !entry.summary.toLowerCase().startsWith('invalid api key')) {
                        const summaryEntry = entry;
                        const uuid = summaryEntry.leafUuid;
                        if (uuid) {
                            summaries.set(uuid, summaryEntry);
                        }
                    }
                }
                catch (parseError) {
                    this._logService.warn(`Failed to parse line in ${fileUri}: ${line} - ${parseError}`);
                }
            }
            const messages = this._reviveStoredMessages(rawMessages);
            return { messages, summaries };
        }
        catch (e) {
            this._logService.error(e, `[ClaudeChatSessionItemProvider] Failed to load session: ${fileUri}`);
            return { messages: new Map(), summaries: new Map() };
        }
    }
    _computeFolderSlug(folderUri) {
        return folderUri.path
            .replace(/^\/([a-z]):/i, (_, driveLetter) => driveLetter.toUpperCase() + '-')
            .replace(/[\/\.]/g, '-');
    }
    _generateSessionLabel(summaryEntry, messages) {
        // Use summary if available
        if (summaryEntry && summaryEntry.summary) {
            return summaryEntry.summary;
        }
        // Find the first user message to use as label
        const firstUserMessage = messages.find((msg) => msg.type === 'user' && 'message' in msg && msg.message?.role === 'user');
        if (firstUserMessage && 'message' in firstUserMessage) {
            const message = firstUserMessage.message;
            let content;
            // Handle both string content and array content formats using our helper
            const strippedContent = this._stripAttachmentsFromMessageContent(message.content);
            if (typeof strippedContent === 'string') {
                content = strippedContent;
            }
            else if (Array.isArray(strippedContent) && strippedContent.length > 0) {
                // Extract text from the first text block in the content array
                const firstUsefulText = strippedContent
                    .filter((block) => block.type === 'text')
                    .map(block => block.text)
                    .find(text => text.trim().length > 0);
                content = firstUsefulText;
            }
            if (content) {
                // Return first line or first 50 characters, whichever is shorter
                const firstLine = content.split('\n').find(l => l.trim().length > 0) ?? '';
                return firstLine.length > 50 ? firstLine.substring(0, 47) + '...' : firstLine;
            }
        }
        return 'Claude Session';
    }
    _stripAttachments(text) {
        // Remove any <system-reminder> ... </system-reminder> blocks, including newlines
        return text.replace(/<system-reminder>[\s\S]*?<\/system-reminder>\s*/g, '').trim();
    }
    _normalizeCommandContent(text) {
        const parsed = this._extractCommandContent(text);
        if (parsed !== null) {
            return parsed;
        }
        return this._removeCommandTags(text);
    }
    _extractCommandContent(text) {
        const commandMessageMatch = /<command-message>([\s\S]*?)<\/command-message>/i.exec(text);
        if (!commandMessageMatch) {
            return null;
        }
        const commandMessage = commandMessageMatch[1]?.trim();
        return commandMessage ? `/${commandMessage}` : null;
    }
    _removeCommandTags(text) {
        return text
            .replace(/<command-message>/gi, '')
            .replace(/<\/command-message>/gi, '')
            .replace(/<command-name>/gi, '')
            .replace(/<\/command-name>/gi, '')
            .trim();
    }
    _reviveStoredMessages(rawMessages) {
        const messages = new Map();
        for (const [uuid, entry] of rawMessages) {
            if (entry.isMeta) {
                continue;
            }
            const parentUuid = this._resolveParentUuid(entry.raw.parentUuid ?? null, rawMessages);
            const revived = this._reviveStoredSDKMessage({
                ...entry.raw,
                parentUuid
            });
            if (uuid) {
                messages.set(uuid, revived);
            }
        }
        return messages;
    }
    _resolveParentUuid(parentUuid, rawMessages) {
        let current = parentUuid;
        const visited = new Set();
        while (current) {
            if (visited.has(current)) {
                return current;
            }
            visited.add(current);
            const candidate = rawMessages.get(current);
            if (!candidate) {
                return current;
            }
            if (!candidate.isMeta) {
                return current;
            }
            current = candidate.raw.parentUuid ?? null;
        }
        return current ?? null;
    }
    /**
     * Strip attachments from message content, handling both string and array formats
     */
    _stripAttachmentsFromMessageContent(content) {
        if (typeof content === 'string') {
            const withoutAttachments = this._stripAttachments(content);
            return this._normalizeCommandContent(withoutAttachments);
        }
        else if (Array.isArray(content)) {
            const processedBlocks = content.map(block => {
                if (block.type === 'text') {
                    const textBlock = block;
                    const cleanedText = this._normalizeCommandContent(this._stripAttachments(textBlock.text));
                    return {
                        ...block,
                        text: cleanedText
                    };
                }
                return block;
            }).filter(block => block.type !== 'text' || block.text.trim().length > 0);
            return processedBlocks;
        }
        return content;
    }
};
exports.ClaudeCodeSessionService = ClaudeCodeSessionService;
exports.ClaudeCodeSessionService = ClaudeCodeSessionService = __decorate([
    __param(0, fileSystemService_1.IFileSystemService),
    __param(1, logService_1.ILogService),
    __param(2, workspaceService_1.IWorkspaceService),
    __param(3, envService_1.INativeEnvService)
], ClaudeCodeSessionService);
//# sourceMappingURL=claudeCodeSessionService.js.map