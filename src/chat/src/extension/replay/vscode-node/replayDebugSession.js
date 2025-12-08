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
exports.ChatReplayDebugSession = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const debugadapter_1 = require("@vscode/debugadapter");
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
const vscode_1 = require("vscode");
const chatReplayResponses_1 = require("../common/chatReplayResponses");
const replayParser_1 = require("../node/replayParser");
class ChatReplayDebugSession extends debugadapter_1.LoggingDebugSession {
    static { this.THREAD_ID = 1; }
    constructor(workspaceFolder) {
        super();
        this._program = '';
        this._chatSteps = [];
        this._currentIndex = -1;
        this._stopOnEntry = true;
        this._variableHandles = new debugadapter_1.Handles();
        this._replay = chatReplayResponses_1.ChatReplayResponses.getInstance();
        this._workspaceFolder = workspaceFolder;
        // all line/column numbers are 1-based in DAP
        this.setDebuggerLinesStartAt1(true);
        this.setDebuggerColumnsStartAt1(true);
    }
    // Initialize capabilities and signal ready to accept configuration (e.g., breakpoints)
    initializeRequest(response, args) {
        response.body = response.body || {};
        response.body.supportsConfigurationDoneRequest = false;
        response.body.supportsStepBack = false;
        response.body.supportsEvaluateForHovers = false;
        this.sendResponse(response);
        this.sendEvent(new debugadapter_1.InitializedEvent());
    }
    // Launch the session: read and parse the markdown file and stop on the first header if requested
    async launchRequest(response, args) {
        try {
            this._stopOnEntry = !!args.stopOnEntry;
            const programArg = args.program;
            if (!programArg || typeof programArg !== 'string') {
                return this.sendErrorResponse(response, 3001, 'Missing program (markdown file)');
            }
            // Resolve to absolute path; VS Code typically passes absolute already
            this._program = path.isAbsolute(programArg)
                ? programArg
                : path.join(this._workspaceFolder?.uri.fsPath || process.cwd(), programArg);
            const content = fs.readFileSync(this._program, 'utf8');
            this._chatSteps = (0, replayParser_1.parseReplay)(content);
            this.sendResponse(response);
            if (this._chatSteps.length === 0) {
                // Nothing to debug; terminate immediately
                this.sendEvent(new debugadapter_1.TerminatedEvent());
                return;
            }
            this._currentIndex = 0;
            this._replay = chatReplayResponses_1.ChatReplayResponses.create(() => this.sendEvent(new debugadapter_1.TerminatedEvent()));
            startReplayInChat();
            if (this._stopOnEntry) {
                this.sendEvent(new debugadapter_1.StoppedEvent('entry', ChatReplayDebugSession.THREAD_ID));
            }
        }
        catch (err) {
            this.sendErrorResponse(response, 3002, `Failed to launch: ${err?.message || String(err)}`);
        }
    }
    disconnectRequest(response) {
        this._replay.markDone();
        this.sendResponse(response);
        this.sendEvent(new debugadapter_1.TerminatedEvent());
    }
    threadsRequest(response) {
        response.body = {
            threads: [new debugadapter_1.Thread(ChatReplayDebugSession.THREAD_ID, 'Main Thread')]
        };
        this.sendResponse(response);
    }
    stackTraceRequest(response, args) {
        const frames = [];
        const step = this.currentStep();
        if (step) {
            const source = new debugadapter_1.Source(path.basename(this._program), this._program);
            frames.push(new debugadapter_1.StackFrame(1, `#${step.kind} ${step.kind === 'userQuery' ? step.query : step.id}`, source, step.line, 1));
        }
        response.body = {
            stackFrames: frames,
            totalFrames: frames.length
        };
        this.sendResponse(response);
    }
    scopesRequest(response, args) {
        const step = this.currentStep();
        if (!step) {
            response.body = { scopes: [] };
            this.sendResponse(response);
            return;
        }
        const ref = this._variableHandles.create({ step });
        response.body = {
            scopes: [new debugadapter_1.Scope('Step', ref, false)]
        };
        this.sendResponse(response);
    }
    variablesRequest(response, args) {
        response.body = { variables: [] };
        this.sendResponse(response);
    }
    setBreakPointsRequest(response, args) {
        // We don't support user breakpoints; we stop automatically at headers
        response.body = {
            breakpoints: (args.breakpoints || []).map(bp => ({ verified: false, line: bp.line }))
        };
        this.sendResponse(response);
    }
    continueRequest(response, args) {
        const step = this.currentStep();
        if (step) {
            this.replayNextResponse(step);
            this.sendResponse(response);
        }
        else {
            // We're done
            this._replay.markDone();
            this.sendResponse(response);
            this.sendEvent(new debugadapter_1.TerminatedEvent());
        }
    }
    nextRequest(response, args) {
        const step = this.currentStep();
        if (step) {
            this.replayNextResponse(step);
            this.sendResponse(response);
        }
        else {
            this._replay.markDone();
            this.sendResponse(response);
            this.sendEvent(new debugadapter_1.TerminatedEvent());
        }
    }
    replayNextResponse(step) {
        this._replay.replayResponse(step);
        this._currentIndex++;
        // Send a stopped event to indicate we are at the next step
        this.sendEvent(new debugadapter_1.StoppedEvent('next', ChatReplayDebugSession.THREAD_ID));
    }
    pauseRequest(response, args) {
        // Stay on current header and report stopped
        this.sendResponse(response);
        this.sendEvent(new debugadapter_1.StoppedEvent('pause', ChatReplayDebugSession.THREAD_ID));
    }
    currentStep() {
        if (this._currentIndex >= 0 && this._currentIndex < this._chatSteps.length) {
            return this._chatSteps[this._currentIndex];
        }
        this._currentIndex++;
        return undefined;
    }
}
exports.ChatReplayDebugSession = ChatReplayDebugSession;
async function startReplayInChat() {
    await vscode_1.commands.executeCommand('workbench.panel.chat.view.copilot.focus');
    await vscode_1.commands.executeCommand('type', {
        text: `\@chatReplay`,
    });
    await vscode_1.commands.executeCommand('workbench.action.chat.submit');
}
//# sourceMappingURL=replayDebugSession.js.map