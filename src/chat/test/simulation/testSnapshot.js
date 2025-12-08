"use strict";
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
exports.TestSnapshotsImpl = exports.ITestSnapshots = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const snapshot_1 = require("@vitest/snapshot");
const environment_1 = require("@vitest/snapshot/environment");
const assert = __importStar(require("assert"));
const services_1 = require("../../src/util/common/services");
const lazy_1 = require("../../src/util/vs/base/common/lazy");
exports.ITestSnapshots = (0, services_1.createServiceIdentifier)('ITestSnapshots');
class TestSnapshotsImpl {
    constructor(filePath, testName, runNumber) {
        this.filePath = filePath;
        this.testName = testName;
        this.runNumber = runNumber;
        this.client = new lazy_1.Lazy(async () => {
            const client = new snapshot_1.SnapshotClient({
                isEqual: (received, expected) => {
                    try {
                        assert.deepStrictEqual(received, expected);
                        return true;
                    }
                    catch {
                        return false;
                    }
                }
            });
            const name = this.runNumber !== undefined ? `${this.testName}-${this.runNumber}` : this.testName;
            await client.startCurrentRun(this.filePath, name, {
                updateSnapshot: 'new',
                snapshotEnvironment: new environment_1.NodeSnapshotEnvironment(),
            });
            return client;
        });
    }
    async matches(value, message) {
        (await this.client.value).assert({
            received: value,
            isInline: false,
            message,
        });
    }
    async dispose() {
        const client = await this.client.rawValue;
        const r = await client?.finishCurrentRun();
        if (r?.unmatched) {
            throw new Error(`${r.unmatched} snapshot(s) failed to match`);
        }
    }
}
exports.TestSnapshotsImpl = TestSnapshotsImpl;
//# sourceMappingURL=testSnapshot.js.map