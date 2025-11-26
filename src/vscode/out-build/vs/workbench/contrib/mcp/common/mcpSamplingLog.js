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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { localize } from '../../../../nls.js';
import { observableMemento } from '../../../../platform/observable/common/observableMemento.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
var Constants;
(function (Constants) {
    Constants[Constants["SamplingRetentionDays"] = 7] = "SamplingRetentionDays";
    Constants[Constants["MsPerDay"] = 86400000] = "MsPerDay";
    Constants[Constants["SamplingRetentionMs"] = 604800000] = "SamplingRetentionMs";
    Constants[Constants["SamplingLastNMessage"] = 30] = "SamplingLastNMessage";
})(Constants || (Constants = {}));
const samplingMemento = observableMemento({
    defaultValue: new Map(),
    key: 'mcp.sampling.logs',
    toStorage: v => JSON.stringify(Array.from(v.entries())),
    fromStorage: v => new Map(JSON.parse(v)),
});
let McpSamplingLog = class McpSamplingLog extends Disposable {
    constructor(_storageService) {
        super();
        this._storageService = _storageService;
        this._logs = {};
    }
    has(server) {
        const storage = this._getLogStorageForServer(server);
        return storage.get().has(server.definition.id);
    }
    get(server) {
        const storage = this._getLogStorageForServer(server);
        return storage.get().get(server.definition.id);
    }
    getAsText(server) {
        const storage = this._getLogStorageForServer(server);
        const record = storage.get().get(server.definition.id);
        if (!record) {
            return '';
        }
        const parts = [];
        const total = record.bins.reduce((sum, value) => sum + value, 0);
        parts.push(localize(9881, null, total));
        parts.push(this._formatRecentRequests(record));
        return parts.join('\n');
    }
    _formatRecentRequests(data) {
        if (!data.lastReqs.length) {
            return '\nNo recent requests.';
        }
        const result = [];
        for (let i = 0; i < data.lastReqs.length; i++) {
            const { request, response, at, model } = data.lastReqs[i];
            result.push(`\n[${i + 1}] ${new Date(at).toISOString()} ${model}`);
            result.push('  Request:');
            for (const msg of request) {
                const role = msg.role.padEnd(9);
                let content = '';
                if ('text' in msg.content && msg.content.type === 'text') {
                    content = msg.content.text;
                }
                else if ('data' in msg.content) {
                    content = `[${msg.content.type} data: ${msg.content.mimeType}]`;
                }
                result.push(`    ${role}: ${content}`);
            }
            result.push('  Response:');
            result.push(`    ${response}`);
        }
        return result.join('\n');
    }
    async add(server, request, response, model) {
        const now = Date.now();
        const utcOrdinal = Math.floor(now / 86400000 /* Constants.MsPerDay */);
        const storage = this._getLogStorageForServer(server);
        const next = new Map(storage.get());
        let record = next.get(server.definition.id);
        if (!record) {
            record = {
                head: utcOrdinal,
                bins: Array.from({ length: 7 /* Constants.SamplingRetentionDays */ }, () => 0),
                lastReqs: [],
            };
        }
        else {
            // Shift bins back by daysSinceHead, dropping old days
            for (let i = 0; i < (utcOrdinal - record.head) && i < 7 /* Constants.SamplingRetentionDays */; i++) {
                record.bins.pop();
                record.bins.unshift(0);
            }
            record.head = utcOrdinal;
        }
        // Increment the current day's bin (head)
        record.bins[0]++;
        record.lastReqs.unshift({ request, response, at: now, model });
        while (record.lastReqs.length > 30 /* Constants.SamplingLastNMessage */) {
            record.lastReqs.pop();
        }
        next.set(server.definition.id, record);
        storage.set(next, undefined);
    }
    _getLogStorageForServer(server) {
        const scope = server.readDefinitions().get().collection?.scope ?? 1 /* StorageScope.WORKSPACE */;
        return this._logs[scope] ??= this._register(samplingMemento(scope, 1 /* StorageTarget.MACHINE */, this._storageService));
    }
};
McpSamplingLog = __decorate([
    __param(0, IStorageService)
], McpSamplingLog);
export { McpSamplingLog };
//# sourceMappingURL=mcpSamplingLog.js.map