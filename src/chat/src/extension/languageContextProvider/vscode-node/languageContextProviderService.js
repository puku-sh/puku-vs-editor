"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.LanguageContextProviderService = void 0;
const vscode_1 = require("vscode");
const languageContextService_1 = require("../../../platform/languageServer/common/languageContextService");
const arrays_1 = require("../../../util/common/arrays");
const async_1 = require("../../../util/vs/base/common/async");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const uri_1 = require("../../../util/vs/base/common/uri");
class LanguageContextProviderService extends lifecycle_1.Disposable {
    constructor() {
        super(...arguments);
        this.providers = [];
    }
    registerContextProvider(provider) {
        this.providers.push(provider);
        return (0, lifecycle_1.toDisposable)(() => {
            const index = this.providers.indexOf(provider);
            if (index > -1) {
                this.providers.splice(index, 1);
            }
        });
    }
    getAllProviders() {
        return this.providers;
    }
    getContextProviders(doc) {
        return this.providers.filter(provider => vscode_1.languages.match(provider.selector, doc));
    }
    dispose() {
        super.dispose();
        this.providers.length = 0;
    }
    getContextItems(doc, request, cancellationToken) {
        const providers = this.getContextProviders(doc);
        const items = new async_1.AsyncIterableObject(async (emitter) => {
            async function runProvider(provider) {
                const langCtx = provider.resolver.resolve(request, cancellationToken);
                if (typeof langCtx[Symbol.asyncIterator] === 'function') {
                    for await (const context of langCtx) {
                        emitter.emitOne(context);
                    }
                    return;
                }
                const result = await langCtx;
                if (Array.isArray(result)) {
                    for (const context of result) {
                        emitter.emitOne(context);
                    }
                }
                else if (typeof result[Symbol.asyncIterator] !== 'function') {
                    // Only push if it's a single SupportedContextItem, not an AsyncIterable
                    emitter.emitOne(result);
                }
            }
            await Promise.allSettled(providers.map(runProvider));
        });
        const contextItems = items.map(v => LanguageContextProviderService.convertCopilotContextItem(v));
        return contextItems;
    }
    static convertCopilotContextItem(item) {
        const isSnippet = item && typeof item === 'object' && item.uri !== undefined;
        if (isSnippet) {
            const ctx = item;
            return {
                kind: languageContextService_1.ContextKind.Snippet,
                priority: LanguageContextProviderService.convertImportanceToPriority(ctx.importance),
                uri: uri_1.URI.parse(ctx.uri),
                value: ctx.value,
                additionalUris: ctx.additionalUris?.map(uri => uri_1.URI.parse(uri)),
            };
        }
        else {
            const ctx = item;
            return {
                kind: languageContextService_1.ContextKind.Trait,
                priority: LanguageContextProviderService.convertImportanceToPriority(ctx.importance),
                name: ctx.name,
                value: ctx.value,
            };
        }
    }
    // importance is coined by the copilot extension and must be an integer in [0, 100], while priority is by the chat extension and spans [0, 1]
    static convertImportanceToPriority(importance) {
        if (importance === undefined || importance < 0) {
            return 0;
        }
        if (importance > 100) {
            return 1;
        }
        return importance / 100;
    }
    getContextItemsOnTimeout(doc, request) {
        const providers = this.getContextProviders(doc);
        const unprocessedResults = (0, arrays_1.filterMap)(providers, p => p.resolver.resolveOnTimeout?.(request));
        const copilotCtxItems = unprocessedResults.flat();
        const ctxItems = copilotCtxItems.map(v => LanguageContextProviderService.convertCopilotContextItem(v));
        return ctxItems;
    }
}
exports.LanguageContextProviderService = LanguageContextProviderService;
//# sourceMappingURL=languageContextProviderService.js.map