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
exports.generateIntentTest = generateIntentTest;
exports.executeIntentTest = executeIntentTest;
exports.readBuiltinIntents = readBuiltinIntents;
const assert_1 = __importDefault(require("assert"));
const fs = __importStar(require("fs"));
const path_1 = __importDefault(require("path"));
require("../../src/extension/intents/node/allIntents");
const intentService_1 = require("../../src/extension/intents/node/intentService");
const chatVariablesCollection_1 = require("../../src/extension/prompt/common/chatVariablesCollection");
const intentDetector_1 = require("../../src/extension/prompt/node/intentDetector");
const telemetry_1 = require("../../src/extension/prompt/node/telemetry");
const commonTypes_1 = require("../../src/platform/chat/common/commonTypes");
const tabsAndEditorsService_1 = require("../../src/platform/tabs/common/tabsAndEditorsService");
const simulationWorkspaceServices_1 = require("../../src/platform/test/node/simulationWorkspaceServices");
const cancellation_1 = require("../../src/util/vs/base/common/cancellation");
const instantiation_1 = require("../../src/util/vs/platform/instantiation/common/instantiation");
const stest_1 = require("../base/stest");
function generateIntentTest(scenario) {
    (0, stest_1.stest)({ description: scenario.name }, async (testingServiceCollection) => {
        await executeIntentTest(testingServiceCollection, scenario);
    });
}
async function executeIntentTest(testingServiceCollection, scenario) {
    testingServiceCollection.define(tabsAndEditorsService_1.ITabsAndEditorsService, new simulationWorkspaceServices_1.TestingTabsAndEditorsService({
        getActiveTextEditor: () => undefined,
        getVisibleTextEditors: () => [],
        getActiveNotebookEditor: () => undefined
    }));
    const accessor = testingServiceCollection.createTestingAccessor();
    const intentService = accessor.get(intentService_1.IIntentService);
    const instaService = accessor.get(instantiation_1.IInstantiationService);
    const intentDetector = instaService.createInstance(intentDetector_1.IntentDetector);
    const query = scenario.query;
    const builtinIntents = readBuiltinIntents(scenario.location);
    const detectedIntent = await intentDetector.detectIntent(scenario.location, undefined, query, cancellation_1.CancellationToken.None, (0, telemetry_1.createTelemetryWithId)(), new chatVariablesCollection_1.ChatVariablesCollection([]), builtinIntents);
    const intent = detectedIntent ?? intentService.unknownIntent;
    const expectedIntents = Array.isArray(scenario.expectedIntent) ? scenario.expectedIntent : [scenario.expectedIntent];
    assert_1.default.ok(intent && expectedIntents.includes('participant' in intent ? detectedParticipantToIntentId(intent) : intent.id), `Expected intent [${expectedIntents.join(',')}] but got ${'participant' in intent ? intent.participant : intent.id}`);
}
function detectedParticipantToIntentId(detected) {
    switch (detected.participant) {
        case 'github.copilot.default':
            return 'unknown';
        case 'github.copilot.editor':
            if (detected.command) {
                return detected.command;
            }
            return 'unknown';
        case 'github.copilot.terminalPanel':
            return 'terminalExplain';
        case 'github.copilot.workspace':
            switch (detected.command) {
                case 'new':
                    return 'new';
                case 'newNotebook':
                    return 'newNotebook';
                case 'tests':
                    return 'tests';
                case 'setupTests':
                    return 'setupTests';
                default:
                    return 'workspace';
            }
        case 'github.copilot.vscode':
            return 'vscode';
        case 'github.copilot-dynamic.platform':
            return 'github.copilot-dynamic.platform';
    }
    throw new Error(`Unknown participant ${detected.participant} with command ${detected.command}`);
}
function readBuiltinIntents(location) {
    const packageJson = JSON.parse(fs.readFileSync(path_1.default.resolve(path_1.default.join(__dirname, '..', 'package.json'))).toString(), undefined);
    const participantMetadata = [];
    for (const participant of packageJson['contributes']['chatParticipants']) {
        const locationName = location === commonTypes_1.ChatLocation.Panel ? 'panel' : location === commonTypes_1.ChatLocation.Editor ? 'editor' : undefined;
        if (!locationName || !participant.locations || !participant.locations.includes(locationName)) {
            continue;
        }
        if (participant.disambiguation?.length) {
            participantMetadata.push({
                participant: participant.id, disambiguation: participant.disambiguation
            });
        }
        if (participant.commands) {
            for (const command of participant.commands) {
                if (command.disambiguation?.length) {
                    participantMetadata.push({
                        participant: participant.id, command: command.name, disambiguation: command.disambiguation
                    });
                }
            }
        }
    }
    return participantMetadata;
}
//# sourceMappingURL=intentTest.js.map