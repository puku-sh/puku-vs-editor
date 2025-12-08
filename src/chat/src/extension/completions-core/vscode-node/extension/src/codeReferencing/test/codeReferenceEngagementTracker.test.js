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
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const assert = __importStar(require("assert"));
const lifecycle_1 = require("../../../../../../../util/vs/base/common/lifecycle");
const instantiation_1 = require("../../../../../../../util/vs/platform/instantiation/common/instantiation");
const telemetry_1 = require("../../../../lib/src/test/telemetry");
const context_1 = require("../../test/context");
const codeReferenceEngagementTracker_1 = require("../codeReferenceEngagementTracker");
const outputChannel_1 = require("../outputChannel");
suite('CodeReferenceEngagementTracker', function () {
    let engagementTracker;
    let accessor;
    const disposables = new lifecycle_1.DisposableStore();
    setup(function () {
        accessor = (0, context_1.createExtensionTestingContext)().createTestingAccessor();
        engagementTracker = disposables.add(accessor.get(instantiation_1.IInstantiationService).createInstance(codeReferenceEngagementTracker_1.CodeRefEngagementTracker));
    });
    teardown(function () {
        disposables.clear();
    });
    test('sends a telemetry event when the output channel is focused', async function () {
        const telemetry = await (0, telemetry_1.withInMemoryTelemetry)(accessor, () => {
            engagementTracker.onActiveEditorChange({
                document: { uri: { scheme: 'output', path: outputChannel_1.citationsChannelName } },
            });
        });
        assert.ok(telemetry.reporter.events.length === 1);
        assert.strictEqual(telemetry.reporter.events[0].name, 'code_referencing.github_copilot_log.focus.count');
    });
    test('sends a telemetry event when the output channel is focused2', async function () {
        const telemetry = await (0, telemetry_1.withInMemoryTelemetry)(accessor, () => {
            engagementTracker.onActiveEditorChange({
                document: { uri: { scheme: 'output', path: outputChannel_1.citationsChannelName } },
            });
        });
        assert.ok(telemetry.reporter.events.length === 1);
        assert.strictEqual(telemetry.reporter.events[0].name, 'code_referencing.github_copilot_log.focus.count');
    });
    test('sends a telemetry event when the output channel is opened', async function () {
        const telemetry = await (0, telemetry_1.withInMemoryTelemetry)(accessor, () => {
            engagementTracker.onVisibleEditorsChange([
                {
                    document: { uri: { scheme: 'output', path: outputChannel_1.citationsChannelName } },
                },
            ]);
        });
        assert.ok(telemetry.reporter.events.length === 1);
        assert.strictEqual(telemetry.reporter.events[0].name, 'code_referencing.github_copilot_log.open.count');
    });
    test('does not send a telemetry event when the output channel is already opened', async function () {
        const telemetry = await (0, telemetry_1.withInMemoryTelemetry)(accessor, () => {
            engagementTracker.onVisibleEditorsChange([
                {
                    document: { uri: { scheme: 'output', path: outputChannel_1.citationsChannelName } },
                },
            ]);
            engagementTracker.onVisibleEditorsChange([
                {
                    document: { uri: { scheme: 'output', path: outputChannel_1.citationsChannelName } },
                },
                {
                    document: { uri: { scheme: 'file', path: 'some-other-file.js' } },
                },
            ]);
        });
        assert.ok(telemetry.reporter.events.length === 1);
    });
    test('tracks when the log closes internally', async function () {
        const telemetry = await (0, telemetry_1.withInMemoryTelemetry)(accessor, () => {
            engagementTracker.onVisibleEditorsChange([
                {
                    document: { uri: { scheme: 'output', path: outputChannel_1.citationsChannelName } },
                },
            ]);
            engagementTracker.onVisibleEditorsChange([
                {
                    document: { uri: { scheme: 'file', path: 'some-other-file.js' } },
                },
            ]);
        });
        assert.ok(telemetry.reporter.events.length === 1);
        assert.ok(engagementTracker.logVisible === false);
    });
});
//# sourceMappingURL=codeReferenceEngagementTracker.test.js.map