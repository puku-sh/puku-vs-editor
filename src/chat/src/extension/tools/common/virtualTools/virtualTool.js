"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.VirtualTool = exports.EMBEDDINGS_GROUP_NAME = exports.VIRTUAL_TOOL_NAME_PREFIX = void 0;
exports.VIRTUAL_TOOL_NAME_PREFIX = 'activate_';
exports.EMBEDDINGS_GROUP_NAME = exports.VIRTUAL_TOOL_NAME_PREFIX + 'embeddings';
class VirtualTool {
    constructor(name, description, lastUsedOnTurn, metadata, contents = []) {
        this.name = name;
        this.description = description;
        this.lastUsedOnTurn = lastUsedOnTurn;
        this.metadata = metadata;
        this.contents = contents;
        this.isExpanded = false;
        if (!name.startsWith(exports.VIRTUAL_TOOL_NAME_PREFIX)) {
            throw new Error(`Virtual tool name must start with '${exports.VIRTUAL_TOOL_NAME_PREFIX}'`);
        }
    }
    cloneWithNewName(name) {
        const vt = new VirtualTool(name, this.description, this.lastUsedOnTurn, { ...this.metadata }, this.contents);
        vt.isExpanded = this.isExpanded;
        return vt;
    }
    copyStateFrom(other) {
        this.isExpanded = other.isExpanded;
        this.metadata.wasExpandedByDefault = other.metadata.wasExpandedByDefault;
        this.metadata.canBeCollapsed = other.metadata.canBeCollapsed;
        this.metadata.wasEmbeddingsMatched = other.metadata.wasEmbeddingsMatched;
        this.lastUsedOnTurn = other.lastUsedOnTurn;
    }
    /**
     * Looks up a tool. Update the {@link lastUsedOnTurn} of all virtual tools
     * it touches.
     */
    find(name) {
        if (this.name === name) {
            return { tool: this, path: [] };
        }
        for (const content of this.contents) {
            if (content instanceof VirtualTool) {
                const found = content.find(name);
                if (found) {
                    found.path.unshift(this);
                    return found;
                }
            }
            else {
                if (content.name === name) {
                    return { tool: content, path: [this] };
                }
            }
        }
        return undefined;
    }
    /**
     * Gets the tool with the lowest {@link lastUsedOnTurn} that is expanded.
     */
    getLowestExpandedTool() {
        let lowest;
        for (const tool of this.all()) {
            if (tool instanceof VirtualTool && tool.isExpanded) {
                if (!lowest || tool.lastUsedOnTurn < lowest.lastUsedOnTurn) {
                    lowest = tool;
                }
            }
        }
        return lowest;
    }
    *all() {
        yield this;
        for (const content of this.contents) {
            if (content instanceof VirtualTool) {
                yield* content.all();
            }
            else {
                yield content;
            }
        }
    }
    *tools() {
        if (!this.isExpanded) {
            yield {
                name: this.name,
                description: this.description,
                inputSchema: undefined,
                source: undefined,
                tags: [],
            };
            return;
        }
        for (const content of this.contents) {
            if (content instanceof VirtualTool) {
                yield* content.tools();
            }
            else {
                yield content;
            }
        }
    }
}
exports.VirtualTool = VirtualTool;
//# sourceMappingURL=virtualTool.js.map