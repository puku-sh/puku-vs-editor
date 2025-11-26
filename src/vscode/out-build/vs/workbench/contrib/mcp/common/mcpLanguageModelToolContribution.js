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
import { Codicon } from '../../../../base/common/codicons.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { Lazy } from '../../../../base/common/lazy.js';
import { Disposable, DisposableMap, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { equals } from '../../../../base/common/objects.js';
import { autorun } from '../../../../base/common/observable.js';
import { basename } from '../../../../base/common/resources.js';
import { isDefined } from '../../../../base/common/types.js';
import { localize } from '../../../../nls.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IImageResizeService } from '../../../../platform/imageResize/common/imageResizeService.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { ChatResponseResource, getAttachableImageExtension } from '../../chat/common/chatModel.js';
import { LanguageModelPartAudience } from '../../chat/common/languageModels.js';
import { ILanguageModelToolsService } from '../../chat/common/languageModelToolsService.js';
import { IMcpRegistry } from './mcpRegistryTypes.js';
import { IMcpService, McpResourceURI, McpToolResourceLinkMimeType } from './mcpTypes.js';
import { mcpServerToSourceData } from './mcpTypesUtils.js';
let McpLanguageModelToolContribution = class McpLanguageModelToolContribution extends Disposable {
    static { this.ID = 'workbench.contrib.mcp.languageModelTools'; }
    constructor(_toolsService, mcpService, _instantiationService, _mcpRegistry) {
        super();
        this._toolsService = _toolsService;
        this._instantiationService = _instantiationService;
        this._mcpRegistry = _mcpRegistry;
        // Keep tools in sync with the tools service.
        const previous = this._register(new DisposableMap());
        this._register(autorun(reader => {
            const servers = mcpService.servers.read(reader);
            const toDelete = new Set(previous.keys());
            for (const server of servers) {
                const previousRec = previous.get(server);
                if (previousRec) {
                    toDelete.delete(server);
                    if (!previousRec.source || equals(previousRec.source, mcpServerToSourceData(server, reader))) {
                        continue; // same definition, no need to update
                    }
                    previousRec.dispose();
                }
                const store = new DisposableStore();
                const rec = { dispose: () => store.dispose() };
                const toolSet = new Lazy(() => {
                    const source = rec.source = mcpServerToSourceData(server);
                    const toolSet = store.add(this._toolsService.createToolSet(source, server.definition.id, server.definition.label, {
                        icon: Codicon.mcp,
                        description: localize(9863, null, server.definition.label)
                    }));
                    return { toolSet, source };
                });
                this._syncTools(server, toolSet, store);
                previous.set(server, rec);
            }
            for (const key of toDelete) {
                previous.deleteAndDispose(key);
            }
        }));
    }
    _syncTools(server, collectionData, store) {
        const tools = new Map();
        const collectionObservable = this._mcpRegistry.collections.map(collections => collections.find(c => c.id === server.collection.id));
        store.add(autorun(reader => {
            const toDelete = new Set(tools.keys());
            // toRegister is deferred until deleting tools that moving a tool between
            // servers (or deleting one instance of a multi-instance server) doesn't cause an error.
            const toRegister = [];
            const registerTool = (tool, toolData, store) => {
                store.add(this._toolsService.registerTool(toolData, this._instantiationService.createInstance(McpToolImplementation, tool, server)));
                store.add(collectionData.value.toolSet.addTool(toolData));
            };
            const collection = collectionObservable.read(reader);
            for (const tool of server.tools.read(reader)) {
                const existing = tools.get(tool.id);
                const icons = tool.icons.getUrl(22);
                const toolData = {
                    id: tool.id,
                    source: collectionData.value.source,
                    icon: icons || Codicon.tools,
                    // duplicative: https://github.com/modelcontextprotocol/modelcontextprotocol/pull/813
                    displayName: tool.definition.annotations?.title || tool.definition.title || tool.definition.name,
                    toolReferenceName: tool.referenceName,
                    modelDescription: tool.definition.description ?? '',
                    userDescription: tool.definition.description ?? '',
                    inputSchema: tool.definition.inputSchema,
                    canBeReferencedInPrompt: true,
                    alwaysDisplayInputOutput: true,
                    canRequestPreApproval: !tool.definition.annotations?.readOnlyHint,
                    canRequestPostApproval: !!tool.definition.annotations?.openWorldHint,
                    runsInWorkspace: collection?.scope === 1 /* StorageScope.WORKSPACE */ || !!collection?.remoteAuthority,
                    tags: ['mcp'],
                };
                if (existing) {
                    if (!equals(existing.toolData, toolData)) {
                        existing.toolData = toolData;
                        existing.store.clear();
                        // We need to re-register both the data and implementation, as the
                        // implementation is discarded when the data is removed (#245921)
                        registerTool(tool, toolData, existing.store);
                    }
                    toDelete.delete(tool.id);
                }
                else {
                    const store = new DisposableStore();
                    toRegister.push(() => registerTool(tool, toolData, store));
                    tools.set(tool.id, { toolData, store });
                }
            }
            for (const id of toDelete) {
                const tool = tools.get(id);
                if (tool) {
                    tool.store.dispose();
                    tools.delete(id);
                }
            }
            for (const fn of toRegister) {
                fn();
            }
            // Important: flush tool updates when the server is fully registered so that
            // any consuming (e.g. autostarting) requests have the tools available immediately.
            this._toolsService.flushToolUpdates();
        }));
        store.add(toDisposable(() => {
            for (const tool of tools.values()) {
                tool.store.dispose();
            }
        }));
    }
};
McpLanguageModelToolContribution = __decorate([
    __param(0, ILanguageModelToolsService),
    __param(1, IMcpService),
    __param(2, IInstantiationService),
    __param(3, IMcpRegistry)
], McpLanguageModelToolContribution);
export { McpLanguageModelToolContribution };
let McpToolImplementation = class McpToolImplementation {
    constructor(_tool, _server, _productService, _fileService, _imageResizeService) {
        this._tool = _tool;
        this._server = _server;
        this._productService = _productService;
        this._fileService = _fileService;
        this._imageResizeService = _imageResizeService;
    }
    async prepareToolInvocation(context) {
        const tool = this._tool;
        const server = this._server;
        const mcpToolWarning = localize(9864, null, this._productService.nameShort);
        // duplicative: https://github.com/modelcontextprotocol/modelcontextprotocol/pull/813
        const title = tool.definition.annotations?.title || tool.definition.title || ('`' + tool.definition.name + '`');
        const confirm = {};
        if (!tool.definition.annotations?.readOnlyHint) {
            confirm.title = new MarkdownString(localize(9865, null, title));
            confirm.message = new MarkdownString(tool.definition.description, { supportThemeIcons: true });
            confirm.disclaimer = mcpToolWarning;
            confirm.allowAutoConfirm = true;
        }
        if (tool.definition.annotations?.openWorldHint) {
            confirm.confirmResults = true;
        }
        return {
            confirmationMessages: confirm,
            invocationMessage: new MarkdownString(localize(9866, null, title)),
            pastTenseMessage: new MarkdownString(localize(9867, null, title)),
            originMessage: localize(9868, null, server.definition.label),
            toolSpecificData: {
                kind: 'input',
                rawInput: context.parameters
            }
        };
    }
    async invoke(invocation, _countTokens, progress, token) {
        const result = {
            content: []
        };
        const callResult = await this._tool.callWithProgress(invocation.parameters, progress, { chatRequestId: invocation.chatRequestId, chatSessionId: invocation.context?.sessionId }, token);
        const details = {
            input: JSON.stringify(invocation.parameters, undefined, 2),
            output: [],
            isError: callResult.isError === true,
        };
        for (const item of callResult.content) {
            const audience = item.annotations?.audience?.map(a => {
                if (a === 'assistant') {
                    return LanguageModelPartAudience.Assistant;
                }
                else if (a === 'user') {
                    return LanguageModelPartAudience.User;
                }
                else {
                    return undefined;
                }
            }).filter(isDefined);
            // Explicit user parts get pushed to progress to show in the status UI
            if (audience?.includes(LanguageModelPartAudience.User)) {
                if (item.type === 'text') {
                    progress.report({ message: item.text });
                }
            }
            // Rewrite image resources to images so they are inlined nicely
            const addAsInlineData = async (mimeType, value, uri) => {
                details.output.push({ type: 'embed', mimeType, value, uri, audience });
                if (isForModel) {
                    let finalData;
                    try {
                        const resized = await this._imageResizeService.resizeImage(decodeBase64(value).buffer, mimeType);
                        finalData = VSBuffer.wrap(resized);
                    }
                    catch {
                        finalData = decodeBase64(value);
                    }
                    result.content.push({ kind: 'data', value: { mimeType, data: finalData }, audience });
                }
            };
            const addAsLinkedResource = (uri, mimeType) => {
                const json = { uri, underlyingMimeType: mimeType };
                result.content.push({
                    kind: 'data',
                    audience,
                    value: {
                        mimeType: McpToolResourceLinkMimeType,
                        data: VSBuffer.fromString(JSON.stringify(json)),
                    },
                });
            };
            const isForModel = !audience || audience.includes(LanguageModelPartAudience.Assistant);
            if (item.type === 'text') {
                details.output.push({ type: 'embed', isText: true, value: item.text });
                // structured content 'represents the result of the tool call', so take
                // that in place of any textual description when present.
                if (isForModel && !callResult.structuredContent) {
                    result.content.push({
                        kind: 'text',
                        audience,
                        value: item.text
                    });
                }
            }
            else if (item.type === 'image' || item.type === 'audio') {
                // default to some image type if not given to hint
                await addAsInlineData(item.mimeType || 'image/png', item.data);
            }
            else if (item.type === 'resource_link') {
                const uri = McpResourceURI.fromServer(this._server.definition, item.uri);
                details.output.push({
                    type: 'ref',
                    uri,
                    audience,
                    mimeType: item.mimeType,
                });
                if (isForModel) {
                    if (item.mimeType && getAttachableImageExtension(item.mimeType)) {
                        result.content.push({
                            kind: 'data',
                            audience,
                            value: {
                                mimeType: item.mimeType,
                                data: await this._fileService.readFile(uri).then(f => f.value).catch(() => VSBuffer.alloc(0)),
                            }
                        });
                    }
                    else {
                        addAsLinkedResource(uri, item.mimeType);
                    }
                }
            }
            else if (item.type === 'resource') {
                const uri = McpResourceURI.fromServer(this._server.definition, item.resource.uri);
                if (item.resource.mimeType && getAttachableImageExtension(item.resource.mimeType) && 'blob' in item.resource) {
                    await addAsInlineData(item.resource.mimeType, item.resource.blob, uri);
                }
                else {
                    details.output.push({
                        type: 'embed',
                        uri,
                        isText: 'text' in item.resource,
                        mimeType: item.resource.mimeType,
                        value: 'blob' in item.resource ? item.resource.blob : item.resource.text,
                        audience,
                        asResource: true,
                    });
                    if (isForModel) {
                        const permalink = invocation.context && ChatResponseResource.createUri(invocation.context.sessionId, invocation.callId, result.content.length, basename(uri));
                        addAsLinkedResource(permalink || uri, item.resource.mimeType);
                    }
                }
            }
        }
        if (callResult.structuredContent) {
            details.output.push({ type: 'embed', isText: true, value: JSON.stringify(callResult.structuredContent, null, 2), audience: [LanguageModelPartAudience.Assistant] });
            result.content.push({ kind: 'text', value: JSON.stringify(callResult.structuredContent), audience: [LanguageModelPartAudience.Assistant] });
        }
        result.toolResultDetails = details;
        return result;
    }
};
McpToolImplementation = __decorate([
    __param(2, IProductService),
    __param(3, IFileService),
    __param(4, IImageResizeService)
], McpToolImplementation);
//# sourceMappingURL=mcpLanguageModelToolContribution.js.map