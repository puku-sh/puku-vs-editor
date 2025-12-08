"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimpleRPC = void 0;
const streamSplitter_1 = require("./streamSplitter");
const terminator = process.platform === 'win32' ? '\r\n' : '\n';
class SimpleRPC {
    constructor(stream) {
        this.stream = stream;
        this.methods = new Map();
        this.pendingRequests = new Map();
        this.idCounter = 0;
        this.stream.pipe(new streamSplitter_1.StreamSplitter('\n')).on('data', d => this.handleData(d));
        this.ended = new Promise((resolve) => this.stream.on('end', () => {
            this.didEnd = true;
            resolve();
        }));
    }
    registerMethod(method, handler) {
        this.methods.set(method, handler);
    }
    async callMethod(method, params) {
        const id = this.idCounter++;
        const request = { id, method, params, };
        const promise = new Promise((resolve, reject) => {
            this.pendingRequests.set(id, { resolve, reject });
        });
        this.stream.write(JSON.stringify(request) + terminator);
        return Promise.race([promise, this.ended]);
    }
    dispose() {
        this.didEnd = true;
        this.stream.end();
        for (const { reject } of this.pendingRequests.values()) {
            reject(new Error('RPC connection closed'));
        }
        this.pendingRequests.clear();
    }
    async handleData(data) {
        // -1 to remove trailing split match
        const incoming = JSON.parse(data.toString());
        if (!('method' in incoming)) {
            const { id, result, error } = incoming;
            const handler = this.pendingRequests.get(id);
            this.pendingRequests.delete(id);
            if (error !== undefined) {
                handler?.reject(new Error(error.message));
            }
            else {
                handler?.resolve(result);
            }
        }
        else {
            const { id, method, params } = incoming;
            const response = { id };
            try {
                if (this.methods.has(method)) {
                    const result = await this.methods.get(method)(params);
                    response.result = result;
                }
                else {
                    throw new Error(`Method not found: ${method}`);
                }
            }
            catch (error) {
                response.error = {
                    code: -1,
                    message: String(error.stack || error),
                };
            }
            if (!this.didEnd) {
                this.stream.write(JSON.stringify(response) + terminator);
            }
        }
    }
}
exports.SimpleRPC = SimpleRPC;
//# sourceMappingURL=rpc.js.map