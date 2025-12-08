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
exports.handleDebugSession = void 0;
const l10n = __importStar(require("@vscode/l10n"));
const vscode = __importStar(require("vscode"));
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const uuid_1 = require("../../../util/vs/base/common/uuid");
const copilotDebugCommandHandle_1 = require("./copilotDebugCommandHandle");
const TRACKED_SESSION_KEY = '__copilotTrackedSession';
const handleDebugSession = (launchConfigService, workspaceFolder, config, handle, once, startAgain) => {
    const trackedId = (0, uuid_1.generateUuid)();
    const store = new lifecycle_1.DisposableStore();
    let gotRoot = false;
    const sessions = new Set();
    async function ended(code, message) {
        if (store.isDisposed) {
            return;
        }
        let color;
        if (code !== 0) {
            color = 'red';
            message ??= l10n.t('Debug session errored');
        }
        else {
            color = 'blue';
            message ??= l10n.t('Session ended');
        }
        handle.printLabel(color, message);
        store.dispose();
        followup();
    }
    async function followup() {
        switch (once ? 'Q' : await handle.getFollowupKeys(copilotDebugCommandHandle_1.CopilotDebugCommandHandle.COPILOT_LABEL.length + 3)) {
            case 'Enter':
                (0, exports.handleDebugSession)(launchConfigService, workspaceFolder, config, handle, once, startAgain);
                break;
            case 'R':
                startAgain({ forceNew: true });
                break;
            case 'S':
                await launchConfigService.add(workspaceFolder?.uri, { configurations: [config] });
                if (workspaceFolder) {
                    await launchConfigService.show(workspaceFolder.uri, config.name);
                }
                handle.exit(0);
                break;
            case 'V':
                await handle.printJson(config);
                followup();
                break;
            case 'Q':
            default:
                handle.exit(0);
        }
    }
    handle.ended.then(() => {
        if (!store.isDisposed) {
            sessions.forEach(s => vscode.debug.stopDebugging(s));
        }
    });
    store.add(vscode.debug.registerDebugAdapterTrackerFactory('*', {
        createDebugAdapterTracker(session) {
            if (session.configuration[TRACKED_SESSION_KEY] !== trackedId && (!session.parentSession || !sessions.has(session.parentSession))) {
                return;
            }
            // handle nested sessions:
            const isRoot = !gotRoot;
            gotRoot = true;
            sessions.add(session);
            return {
                onWillStartSession() {
                    if (isRoot) {
                        handle.printLabel('blue', l10n.t('Debug session starting...'));
                    }
                },
                onDidSendMessage(message) {
                    if (message.type === 'event' && message.event === 'output' && message.body.output) {
                        handle.output(message.body.category, message.body.output);
                    }
                },
                onExit(code, signal) {
                    if (isRoot) {
                        ended(code ?? 0, signal);
                    }
                },
                onWillStopSession() {
                    if (isRoot) {
                        ended(0);
                    }
                },
            };
        },
    }));
    vscode.debug.startDebugging(workspaceFolder, { ...config, [TRACKED_SESSION_KEY]: trackedId }).then(ok => {
        if (!ok) {
            // error will be displayed to user by vscode
            ended(1);
        }
    });
};
exports.handleDebugSession = handleDebugSession;
//# sourceMappingURL=copilotDebugCommandSession.js.map