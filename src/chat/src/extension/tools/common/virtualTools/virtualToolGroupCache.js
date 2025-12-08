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
exports.ToolGroupingCache = void 0;
const extensionContext_1 = require("../../../../platform/extContext/common/extensionContext");
const buffer_1 = require("../../../../util/vs/base/common/buffer");
const map_1 = require("../../../../util/vs/base/common/map");
const GROUP_CACHE_SIZE = 128;
const GROUP_CACHE_NAME = 'virtToolGroupCache';
let ToolGroupingCache = class ToolGroupingCache {
    constructor(_extContext) {
        this._extContext = _extContext;
        this._value = new map_1.LRUCache(GROUP_CACHE_SIZE);
        this._changed = false;
        const cached = _extContext.globalState.get(GROUP_CACHE_NAME);
        if (cached?.version === 2) {
            try {
                cached.lru.forEach(([k, v]) => this._value.set(k, v));
            }
            catch (e) {
                // ignored
            }
        }
    }
    async clear() {
        this._changed = false;
        this._value.clear();
        await this._extContext.globalState.update(GROUP_CACHE_NAME, undefined);
    }
    async flush() {
        if (!this._changed) {
            return Promise.resolve();
        }
        this._changed = false;
        const value = {
            version: 2,
            lru: this._value.toJSON(),
        };
        await this._extContext.globalState.update(GROUP_CACHE_NAME, value);
    }
    async getDescription(tools) {
        const key = await this.getKey(tools);
        const existing = this._value.get(key);
        return {
            category: existing ? this.hydrate(tools, existing) : undefined,
            tools,
            update: (r) => {
                this._changed = true;
                this._value.set(key, {
                    summary: r.summary,
                    name: r.name,
                });
            }
        };
    }
    hydrate(tools, g) {
        return {
            summary: g.summary,
            name: g.name,
            tools,
        };
    }
    async getKey(tools) {
        const str = tools.map(t => t.name + '\0' + t.description).sort().join(',');
        const hashBuf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
        return (0, buffer_1.encodeBase64)(buffer_1.VSBuffer.wrap(new Uint8Array(hashBuf)));
    }
};
exports.ToolGroupingCache = ToolGroupingCache;
exports.ToolGroupingCache = ToolGroupingCache = __decorate([
    __param(0, extensionContext_1.IVSCodeExtensionContext)
], ToolGroupingCache);
//# sourceMappingURL=virtualToolGroupCache.js.map