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
exports.InspectorDataProvider = void 0;
const vscode = __importStar(require("vscode"));
const protocol = __importStar(require("../common/serverProtocol"));
class TreePropertyItem {
    constructor(parent, name, value) {
        this.parent = parent;
        this.name = name;
        this.value = value;
    }
    toTreeItem() {
        const item = new vscode.TreeItem(`${this.name} = ${this.value}`, vscode.TreeItemCollapsibleState.None);
        item.tooltip = this.createTooltip();
        item.id = this.id;
        return item;
    }
    createTooltip() {
        const markdown = new vscode.MarkdownString(`${this.value}`);
        return markdown;
    }
    get id() {
        return this.parent instanceof TreeContextItem ? `${this.parent.id}.${this.name}` : undefined;
    }
}
class TreeContextItem {
    constructor(parent) {
        this.parent = parent;
    }
    createTooltip() {
        const markdown = new vscode.MarkdownString(`**${this.getLabel()}**\n\n`);
        markdown.appendCodeblock(JSON.stringify(this.from, undefined, 2), 'json');
        return markdown;
    }
}
class TreeTrait extends TreeContextItem {
    constructor(parent, from) {
        super(parent);
        this.from = from;
    }
    getLabel() {
        return 'Trait';
    }
    get id() {
        return `${this.parent.id}.${this.from.key}`;
    }
    children() {
        const properties = [];
        properties.push(new TreePropertyItem(this, 'key', this.from.key));
        properties.push(new TreePropertyItem(this, 'name', this.from.name));
        properties.push(new TreePropertyItem(this, 'value', this.from.value));
        return properties;
    }
    toTreeItem() {
        const label = `Trait: ${this.from.value}`;
        const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.Collapsed);
        item.tooltip = this.createTooltip();
        item.id = this.id;
        return item;
    }
}
class TreeSnippet extends TreeContextItem {
    constructor(parent, from) {
        super(parent);
        this.from = from;
    }
    getLabel() {
        return 'Snippet';
    }
    get id() {
        return `${this.parent.id}.${this.from.key ?? Date.now().toString()}`;
    }
    children() {
        const properties = [];
        properties.push(new TreePropertyItem(this, 'key', this.from.key ?? 'undefined'));
        properties.push(new TreePropertyItem(this, 'value', this.from.value));
        properties.push(new TreePropertyItem(this, 'path', this.from.fileName));
        return properties;
    }
    toTreeItem() {
        const label = `Snippet: ${this.from.value}`;
        const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.Collapsed);
        item.tooltip = this.createTooltip();
        item.id = this.id;
        return item;
    }
}
class TreeCacheInfo {
    constructor(from) {
        this.from = from;
    }
    toTreeItem() {
        const item = new vscode.TreeItem(this.getLabel());
        item.collapsibleState = this.from.scope.kind === protocol.CacheScopeKind.OutsideRange || this.from.scope.kind === protocol.CacheScopeKind.WithinRange ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None;
        return item;
    }
    children() {
        const properties = [];
        const scope = this.from.scope;
        if (scope.kind === protocol.CacheScopeKind.WithinRange) {
            properties.push(new TreePropertyItem(this, '0', this.getRangeString(scope.range)));
        }
        else if (scope.kind === protocol.CacheScopeKind.OutsideRange) {
            for (let i = 0; i < scope.ranges.length; i++) {
                properties.push(new TreePropertyItem(this, `${i}`, this.getRangeString(scope.ranges[i])));
            }
        }
        return properties;
    }
    getLabel() {
        return `Cache Info: ${this.getEmitMode()} - ${this.getScope()}`;
    }
    getEmitMode() {
        switch (this.from.emitMode) {
            case protocol.EmitMode.ClientBased:
                return 'Client Based';
            case protocol.EmitMode.ClientBasedOnTimeout:
                return 'On Timeout';
            default:
                return 'Unknown';
        }
    }
    getScope() {
        switch (this.from.scope.kind) {
            case protocol.CacheScopeKind.File:
                return 'whole file';
            case protocol.CacheScopeKind.NeighborFiles:
                return 'neighbor files';
            case protocol.CacheScopeKind.OutsideRange:
                return 'outside ranges';
            case protocol.CacheScopeKind.WithinRange:
                return 'within range';
            default:
                return 'unknown scope';
        }
    }
    getRangeString(range) {
        return `[${range.start.line + 1}:${range.start.character + 1} - ${range.end.line + 1}:${range.end.character + 1}]`;
    }
}
class TreeRunnableResult {
    constructor(parent, from) {
        this.parent = parent;
        this.from = from;
        this.items = from.items.map(item => {
            if (item.kind === protocol.ContextKind.Trait) {
                return new TreeTrait(this, item);
            }
            else if (item.kind === protocol.ContextKind.Snippet) {
                return new TreeSnippet(this, item);
            }
            else {
                throw new Error(`Unknown context item kind: ${item.kind}`);
            }
        });
    }
    get id() {
        return `${this.parent.id}.${this.from.id}`;
    }
    children() {
        const result = this.items;
        if (this.from.cache !== undefined) {
            result.push(new TreeCacheInfo(this.from.cache));
        }
        result.push(new TreePropertyItem(this, 'priority', this.from.priority.toString()));
        if (this.from.debugPath !== undefined) {
            result.push(new TreePropertyItem(this, 'debugPath', this.from.debugPath));
        }
        return result;
    }
    toTreeItem() {
        let id = this.from.id;
        if (id.startsWith('_')) {
            id = id.substring(1); // Remove leading underscore for display purposes
        }
        const cacheInfo = this.from.cache !== undefined ? 1 : 0;
        let label = `${id} - ${this.items.length} items - ${this.from.state}`;
        if (this.parent.summary.serverComputed?.has(this.from.id)) {
            label += ' - ⏳';
        }
        const item = new vscode.TreeItem(label, this.items.length + cacheInfo > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None);
        item.id = this.id;
        item.tooltip = this.createTooltip();
        return item;
    }
    createTooltip() {
        let id = this.from.id;
        if (id.startsWith('_')) {
            id = id.substring(1);
        }
        const markdown = new vscode.MarkdownString(`**${id}** - ${this.items.length} items\n\n`);
        markdown.appendCodeblock(JSON.stringify(this.from, undefined, 2), 'json');
        return markdown;
    }
}
class TreeYieldedSnippet {
    constructor(from) {
        this.from = from;
    }
    toTreeItem() {
        const item = new vscode.TreeItem(`${this.getLabel()}: ${this.from.value}`, vscode.TreeItemCollapsibleState.Collapsed);
        item.tooltip = this.createTooltip();
        return item;
    }
    getLabel() {
        return 'Snippet';
    }
    children() {
        return [
            new TreePropertyItem(this, 'kind', this.from.kind),
            new TreePropertyItem(this, 'value', this.from.value),
            new TreePropertyItem(this, 'priority', this.from.priority.toString()),
            new TreePropertyItem(this, 'uri', this.from.uri.toString())
        ];
    }
    createTooltip() {
        const markdown = new vscode.MarkdownString(`**${this.getLabel()}**\n\n`);
        const json = {
            kind: this.from.kind,
            priority: this.from.priority,
            uri: this.from.uri.toString(),
            value: this.from.value
        };
        markdown.appendCodeblock(JSON.stringify(json, undefined, 2), 'json');
        return markdown;
    }
}
class TreeYieldedTrait {
    constructor(from) {
        this.from = from;
    }
    toTreeItem() {
        const item = new vscode.TreeItem(`${this.getLabel()}: ${this.from.value}`, vscode.TreeItemCollapsibleState.Collapsed);
        item.tooltip = this.createTooltip();
        return item;
    }
    getLabel() {
        return 'Trait';
    }
    children() {
        return [
            new TreePropertyItem(this, 'kind', this.from.kind),
            new TreePropertyItem(this, 'name', this.from.name),
            new TreePropertyItem(this, 'value', this.from.value),
            new TreePropertyItem(this, 'priority', this.from.priority.toString())
        ];
    }
    createTooltip() {
        const markdown = new vscode.MarkdownString(`**${this.getLabel()}**\n\n`);
        const json = {
            kind: this.from.kind,
            priority: this.from.priority,
            name: this.from.name,
            value: this.from.value
        };
        markdown.appendCodeblock(JSON.stringify(json, undefined, 2), 'json');
        return markdown;
    }
}
class TreeYielded {
    constructor(parent, items) {
        this.parent = parent;
        this.items = items;
    }
    children() {
        const children = [];
        for (const item of this.items) {
            if (item.kind === protocol.ContextKind.Snippet) {
                children.push(new TreeYieldedSnippet(item));
            }
            else if (item.kind === protocol.ContextKind.Trait) {
                children.push(new TreeYieldedTrait(item));
            }
        }
        return children;
    }
    toTreeItem() {
        const label = `Yielded: ${this.items.length} items`;
        const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.Collapsed);
        item.id = this.id;
        return item;
    }
    get id() {
        return `${this.parent.id}.yielded`;
    }
}
class TreeContextRequest {
    static { this.counter = 1; }
    constructor(label, event) {
        this.document = event.document.uri.toString();
        this.position = event.position;
        this.summary = event.summary;
        const start = new Date(Date.now() - this.summary.totalTime);
        const timeString = `${start.getMinutes().toString().padStart(2, '0')}:${start.getSeconds().toString().padStart(2, '0')}.${start.getMilliseconds().toString().padStart(3, '0')}`;
        this.label = `[${timeString}] - [${this.position.line + 1}:${this.position.character + 1}] ${event.source ?? label} - ${this.summary.stats.yielded} items`;
        if (this.summary.serverComputed && this.summary.serverComputed.size > 0) {
            this.label += ` - ⏳ ${this.summary.totalTime}ms`;
        }
        else {
            this.label += ` - ${this.summary.totalTime}ms`;
        }
    }
    toTreeItem() {
        const item = new vscode.TreeItem(this.label, vscode.TreeItemCollapsibleState.Collapsed);
        item.tooltip = this.createTooltip();
        return item;
    }
    createTooltip() {
        const markdown = new vscode.MarkdownString(`**${this.label}**\n\n`);
        const json = this.createJson();
        markdown.appendCodeblock(JSON.stringify(json, undefined, 2), 'json');
        return markdown;
    }
    get id() {
        return `${TreeContextRequest.counter++}`;
    }
}
class TreeCachePopulateContextRequest extends TreeContextRequest {
    constructor(label, event) {
        super(label, event);
        this.items = event.items;
    }
    createJson() {
        return {
            document: this.document,
            position: {
                line: this.position.line + 1,
                character: this.position.character + 1
            },
            runnables: this.items.length,
            cached: `${this.summary.cachedItems}/${this.summary.stats.total} cached`,
            timings: {
                totalTime: this.summary.totalTime,
                serverTime: this.summary.serverTime,
                contextComputeTime: this.summary.contextComputeTime,
            },
        };
    }
    children() {
        const result = [];
        for (const item of this.items) {
            result.push(new TreeRunnableResult(this, item));
        }
        return result;
    }
}
class TreeYieldContextRequest extends TreeContextRequest {
    constructor(label, event) {
        super(label, event);
        this.items = event.items;
    }
    createJson() {
        return {
            document: this.document,
            position: {
                line: this.position.line + 1,
                character: this.position.character + 1
            },
            items: this.items.length,
            cached: `${this.summary.cachedItems}/${this.summary.stats.total} cached`,
            timings: {
                totalTime: this.summary.totalTime,
                serverTime: this.summary.serverTime,
                contextComputeTime: this.summary.contextComputeTime,
            },
        };
    }
    children() {
        const children = [];
        for (const item of this.items) {
            if (item.kind === protocol.ContextKind.Snippet) {
                children.push(new TreeYieldedSnippet(item));
            }
            else if (item.kind === protocol.ContextKind.Trait) {
                children.push(new TreeYieldedTrait(item));
            }
        }
        return children;
    }
    toTreeItem() {
        const item = new vscode.TreeItem(this.label, vscode.TreeItemCollapsibleState.Collapsed);
        item.id = this.id;
        return item;
    }
}
class InspectorDataProvider {
    constructor(languageContextService) {
        this.languageContextService = languageContextService;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.items = [];
        this.languageContextService.onCachePopulated((event) => {
            this.addContextRequest(new TreeCachePopulateContextRequest(`Cache`, event));
        });
        this.languageContextService.onContextComputed((event) => {
            this.addContextRequest(new TreeYieldContextRequest(`Context`, event));
        });
        this.languageContextService.onContextComputedOnTimeout((event) => {
            this.addContextRequest(new TreeYieldContextRequest(`OnTimeout`, event));
        });
    }
    addContextRequest(item) {
        if (this.items.length >= 32) {
            // Limit the number of items to avoid performance issues.
            this.items.pop();
        }
        this.items.unshift(item);
        this._onDidChangeTreeData.fire(undefined);
    }
    getTreeItem(element) {
        return element.toTreeItem();
    }
    getChildren(element) {
        if (this.items.length === 0) {
            return [];
        }
        if (element === undefined) {
            return this.items;
        }
        else if (element instanceof TreeRunnableResult || element instanceof TreeTrait || element instanceof TreeSnippet || element instanceof TreeYielded ||
            element instanceof TreeYieldedSnippet || element instanceof TreeYieldedTrait || element instanceof TreeCacheInfo || element instanceof TreeContextRequest) {
            return element.children();
        }
        return [];
    }
}
exports.InspectorDataProvider = InspectorDataProvider;
//# sourceMappingURL=inspector.js.map