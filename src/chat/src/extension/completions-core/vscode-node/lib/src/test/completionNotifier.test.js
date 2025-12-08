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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert = __importStar(require("assert"));
const sinon_1 = __importDefault(require("sinon"));
const instantiation_1 = require("../../../../../../util/vs/platform/instantiation/common/instantiation");
const completionNotifier_1 = require("../completionNotifier");
const completionState_1 = require("../completionState");
const telemetry_1 = require("../telemetry");
const context_1 = require("./context");
const textDocument_1 = require("./textDocument");
suite('Completion Notifier', function () {
    let accessor;
    let notifier;
    let completionState;
    let telemetryData;
    let clock;
    setup(function () {
        accessor = (0, context_1.createLibTestingContext)().createTestingAccessor();
        const instantiationService = accessor.get(instantiation_1.IInstantiationService);
        notifier = instantiationService.createInstance(completionNotifier_1.CompletionNotifier);
        const textDocument = (0, textDocument_1.createTextDocument)('file:///test.ts', 'typescript', 1, 'const x = ');
        const position = { line: 0, character: 10 };
        completionState = (0, completionState_1.createCompletionState)(textDocument, position);
        telemetryData = telemetry_1.TelemetryWithExp.createEmptyConfigForTesting();
        clock = sinon_1.default.useFakeTimers();
    });
    teardown(function () {
        clock.restore();
    });
    test('should notify about requests', function () {
        let notifiedEvent;
        const disposable = notifier.onRequest((event) => {
            notifiedEvent = event;
        });
        for (let i = 0; i < 3; i++) {
            const completionId = `test-completion-id-${i}`;
            notifier.notifyRequest(completionState, completionId, telemetryData);
            assert.ok(notifiedEvent, 'Expected event to be notified');
            assert.strictEqual(notifiedEvent.completionId, completionId);
            assert.strictEqual(notifiedEvent.completionState, completionState);
            assert.strictEqual(notifiedEvent.telemetryData, telemetryData);
            notifiedEvent = undefined; // Reset for each iteration
        }
        disposable.dispose();
    });
    test('should not propagate errors from listeners', function () {
        // The telemetryCatch wrapper should handle errors, so the test should not throw
        let errorThrown = false;
        const disposable = notifier.onRequest(() => {
            throw new Error('Test error from listener');
        });
        try {
            notifier.notifyRequest(completionState, 'test-completion-id', telemetryData);
            // If we reach here, the error was caught and handled properly
        }
        catch (error) {
            errorThrown = true;
        }
        assert.strictEqual(errorThrown, false, 'Error should be caught and not propagated');
        disposable.dispose();
    });
    test('should dispose listeners', function () {
        let requestCount = 0;
        const requestDisposable = notifier.onRequest(() => {
            requestCount++;
        });
        // Dispose listeners before making any requests
        requestDisposable.dispose();
        // Make a request - should not trigger any listeners
        notifier.notifyRequest(completionState, 'test-completion-id', telemetryData);
        assert.strictEqual(requestCount, 0, 'Request listener should be disposed');
    });
});
//# sourceMappingURL=completionNotifier.test.js.map