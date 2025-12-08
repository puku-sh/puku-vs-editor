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
exports.ContextItemResultBuilder = exports.ContextItemSummary = exports.Stats = exports.ResolvedRunnableResult = void 0;
const vscode = __importStar(require("vscode"));
const languageContextService_1 = require("../../../platform/languageServer/common/languageContextService");
const protocol = __importStar(require("../common/serverProtocol"));
var ResolvedRunnableResult;
(function (ResolvedRunnableResult) {
    function from(result, items) {
        return {
            id: result.id,
            state: result.state,
            priority: result.priority,
            items: items,
            cache: result.cache,
            debugPath: result.debugPath
        };
    }
    ResolvedRunnableResult.from = from;
})(ResolvedRunnableResult || (exports.ResolvedRunnableResult = ResolvedRunnableResult = {}));
var Stats;
(function (Stats) {
    function create() {
        return {
            total: 0,
            totalSize: 0,
            snippets: 0,
            traits: 0,
            yielded: 0,
            items: {},
        };
    }
    Stats.create = create;
    function update(stats, runnableResult) {
        let size = 0;
        for (const item of runnableResult.items) {
            stats.total++;
            switch (item.kind) {
                case protocol.ContextKind.Snippet:
                    stats.snippets++;
                    size = protocol.CodeSnippet.sizeInChars(item);
                    break;
                case protocol.ContextKind.Trait:
                    stats.traits++;
                    size = protocol.Trait.sizeInChars(item);
                    break;
            }
        }
        stats.items[runnableResult.id] = [runnableResult.state, runnableResult.items.length, size, runnableResult.cache?.emitMode ?? 'none', runnableResult.cache?.scope.kind ?? 'notCached'];
        stats.totalSize += size;
    }
    Stats.update = update;
    function yielded(stats) {
        stats.yielded++;
    }
    Stats.yielded = yielded;
})(Stats || (exports.Stats = Stats = {}));
var ContextItemSummary;
(function (ContextItemSummary) {
    ContextItemSummary.DefaultExhausted = Object.freeze({
        path: [0],
        errorData: undefined,
        stats: Stats.create(),
        cancelled: false,
        timedOut: false,
        tokenBudgetExhausted: true,
        cachedItems: 0,
        referencedItems: 0,
        fromCache: false,
        serverComputed: undefined,
        serverTime: -1,
        contextComputeTime: -1,
        totalTime: 0,
    });
})(ContextItemSummary || (exports.ContextItemSummary = ContextItemSummary = {}));
class ContextItemResultBuilder {
    constructor(totalTime) {
        this.seenRunnableResults = new Set();
        this.seenContextItems = new Set();
        this.path = [0];
        this.errorData = undefined;
        this.stats = Stats.create();
        this.cancelled = false;
        this.timedOut = false;
        this.tokenBudgetExhausted = false;
        this.cachedItems = 0;
        this.referencedItems = 0;
        this.fromCache = false;
        this.serverComputed = undefined;
        this.serverTime = -1;
        this.contextComputeTime = -1;
        this.totalTime = totalTime;
        this.counter = 0;
    }
    updateResponse(result, token) {
        this.timedOut = result.timedOut;
        this.tokenBudgetExhausted = result.exhausted;
        this.serverTime = result.timings?.totalTime ?? -1;
        this.contextComputeTime = result.timings?.computeTime ?? -1;
        this.path = result.path;
        this.cancelled = token.isCancellationRequested;
    }
    *update(runnableResult, fromCache = false) {
        if (this.seenRunnableResults.has(runnableResult.id)) {
            return;
        }
        this.seenRunnableResults.add(runnableResult.id);
        Stats.update(this.stats, runnableResult);
        for (const item of runnableResult.items) {
            if (protocol.ContextItem.hasKey(item)) {
                if (this.seenContextItems.has(item.key)) {
                    continue;
                }
                this.seenContextItems.add(item.key);
            }
            const converted = ContextItemResultBuilder.doConvert(item, runnableResult.priority, (this.counter++).toString());
            if (converted === undefined) {
                continue;
            }
            Stats.yielded(this.stats);
            yield { item: converted, size: protocol.ContextItem.sizeInChars(item) };
        }
    }
    *convert(runnableResult) {
        Stats.update(this.stats, runnableResult);
        for (const item of runnableResult.items) {
            const converted = ContextItemResultBuilder.doConvert(item, runnableResult.priority, (this.counter++).toString());
            if (converted === undefined) {
                continue;
            }
            Stats.yielded(this.stats);
            yield converted;
        }
    }
    static doConvert(item, priority, id) {
        switch (item.kind) {
            case protocol.ContextKind.Snippet:
                return {
                    kind: languageContextService_1.ContextKind.Snippet,
                    id: id,
                    priority: priority,
                    uri: vscode.Uri.file(item.fileName),
                    additionalUris: item.additionalFileNames?.map(uri => vscode.Uri.file(uri)),
                    value: item.value
                };
            case protocol.ContextKind.Trait:
                return {
                    kind: languageContextService_1.ContextKind.Trait,
                    id: id,
                    priority: priority,
                    name: item.name,
                    value: item.value
                };
        }
        return undefined;
    }
}
exports.ContextItemResultBuilder = ContextItemResultBuilder;
//# sourceMappingURL=types.js.map