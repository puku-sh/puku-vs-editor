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
import { decodeBase64, VSBuffer } from '../../../../base/common/buffer.js';
import { Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { newWriteableStream } from '../../../../base/common/stream.js';
import { createFileSystemProviderError, FileSystemProviderErrorCode, FileType, IFileService } from '../../../../platform/files/common/files.js';
import { ChatResponseResource } from './chatModel.js';
import { IChatService, IChatToolInvocation } from './chatService.js';
import { LocalChatSessionUri } from './chatUri.js';
import { isToolResultInputOutputDetails } from './languageModelToolsService.js';
let ChatResponseResourceFileSystemProvider = class ChatResponseResourceFileSystemProvider extends Disposable {
    static { this.ID = 'workbench.contrib.chatResponseResourceFileSystemProvider'; }
    constructor(chatService, _fileService) {
        super();
        this.chatService = chatService;
        this._fileService = _fileService;
        this.onDidChangeCapabilities = Event.None;
        this.onDidChangeFile = Event.None;
        this.capabilities = 0 /* FileSystemProviderCapabilities.None */
            | 2048 /* FileSystemProviderCapabilities.Readonly */
            | 1024 /* FileSystemProviderCapabilities.PathCaseSensitive */
            | 16 /* FileSystemProviderCapabilities.FileReadStream */
            | 16384 /* FileSystemProviderCapabilities.FileAtomicRead */
            | 2 /* FileSystemProviderCapabilities.FileReadWrite */;
        this._register(this._fileService.registerProvider(ChatResponseResource.scheme, this));
    }
    readFile(resource) {
        return Promise.resolve(this.lookupURI(resource));
    }
    readFileStream(resource) {
        const stream = newWriteableStream(data => VSBuffer.concat(data.map(data => VSBuffer.wrap(data))).buffer);
        Promise.resolve(this.lookupURI(resource)).then(v => stream.end(v));
        return stream;
    }
    async stat(resource) {
        const r = await this.lookupURI(resource);
        return {
            type: FileType.File,
            ctime: 0,
            mtime: 0,
            size: r.length,
        };
    }
    delete() {
        throw createFileSystemProviderError('fs is readonly', FileSystemProviderErrorCode.NoPermissions);
    }
    watch() {
        return Disposable.None;
    }
    mkdir() {
        throw createFileSystemProviderError('fs is readonly', FileSystemProviderErrorCode.NoPermissions);
    }
    readdir() {
        return Promise.resolve([]);
    }
    rename() {
        throw createFileSystemProviderError('fs is readonly', FileSystemProviderErrorCode.NoPermissions);
    }
    writeFile() {
        throw createFileSystemProviderError('fs is readonly', FileSystemProviderErrorCode.NoPermissions);
    }
    findMatchingInvocation(uri) {
        const parsed = ChatResponseResource.parseUri(uri);
        if (!parsed) {
            throw createFileSystemProviderError(`File not found`, FileSystemProviderErrorCode.FileNotFound);
        }
        const { sessionId, toolCallId, index } = parsed;
        const session = this.chatService.getSession(LocalChatSessionUri.forSession(sessionId));
        if (!session) {
            throw createFileSystemProviderError(`File not found`, FileSystemProviderErrorCode.FileNotFound);
        }
        const requests = session.getRequests();
        for (let k = requests.length - 1; k >= 0; k--) {
            const req = requests[k];
            const tc = req.response?.entireResponse.value.find((r) => (r.kind === 'toolInvocation' || r.kind === 'toolInvocationSerialized') && r.toolCallId === toolCallId);
            if (tc) {
                return { result: tc, index };
            }
        }
        throw createFileSystemProviderError(`File not found`, FileSystemProviderErrorCode.FileNotFound);
    }
    lookupURI(uri) {
        const { result, index } = this.findMatchingInvocation(uri);
        const details = IChatToolInvocation.resultDetails(result);
        if (!isToolResultInputOutputDetails(details)) {
            throw createFileSystemProviderError(`Tool does not have I/O`, FileSystemProviderErrorCode.FileNotFound);
        }
        const part = details.output.at(index);
        if (!part) {
            throw createFileSystemProviderError(`Tool does not have part`, FileSystemProviderErrorCode.FileNotFound);
        }
        if (part.type === 'ref') {
            return this._fileService.readFile(part.uri).then(r => r.value.buffer);
        }
        return part.isText ? new TextEncoder().encode(part.value) : decodeBase64(part.value).buffer;
    }
};
ChatResponseResourceFileSystemProvider = __decorate([
    __param(0, IChatService),
    __param(1, IFileService)
], ChatResponseResourceFileSystemProvider);
export { ChatResponseResourceFileSystemProvider };
//# sourceMappingURL=chatResponseResourceFileSystemProvider.js.map