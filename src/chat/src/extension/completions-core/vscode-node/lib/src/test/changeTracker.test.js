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
const assert = __importStar(require("assert"));
const sinon = __importStar(require("sinon"));
const instantiation_1 = require("../../../../../../util/vs/platform/instantiation/common/instantiation");
const changeTracker_1 = require("../changeTracker");
const context_1 = require("./context");
const textDocument_1 = require("./textDocument");
suite('ChangeTracker test suite', function () {
    const accessor = (0, context_1.createLibTestingContext)().createTestingAccessor();
    let clock;
    setup(function () {
        clock = sinon.useFakeTimers();
    });
    teardown(function () {
        clock.restore();
    });
    test('It calls pushed actions after the timeout', async function () {
        const document = (0, textDocument_1.createTextDocument)('file:///foo.ts', 'typescript', 0, '');
        const tracker = accessor.get(instantiation_1.IInstantiationService).createInstance(changeTracker_1.ChangeTracker, document.uri, 100);
        let called = false;
        tracker.push(() => {
            called = true;
        }, 10);
        assert.strictEqual(called, false);
        await clock.tickAsync(30);
        assert.strictEqual(called, true);
    });
    test('It refuses new actions if already disposed', async function () {
        const document = (0, textDocument_1.createTextDocument)('file:///foo.ts', 'typescript', 0, '');
        const tracker = accessor.get(instantiation_1.IInstantiationService).createInstance(changeTracker_1.ChangeTracker, document.uri, 100);
        let called = 0;
        tracker.push(() => {
            called = 1;
        }, 10);
        await clock.tickAsync(30);
        assert.throws(() => {
            tracker.push(() => {
                called = 2;
            }, 100);
        });
        assert.strictEqual(called, 1);
    });
});
//# sourceMappingURL=changeTracker.test.js.map