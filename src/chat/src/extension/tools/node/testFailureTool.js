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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestFailureList = exports.TestFailureTool = void 0;
const l10n = __importStar(require("@vscode/l10n"));
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const gitExtensionService_1 = require("../../../platform/git/common/gitExtensionService");
const tabsAndEditorsService_1 = require("../../../platform/tabs/common/tabsAndEditorsService");
const testProvider_1 = require("../../../platform/testing/common/testProvider");
const workspaceService_1 = require("../../../platform/workspace/common/workspaceService");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../vscodeTypes");
const promptRenderer_1 = require("../../prompts/node/base/promptRenderer");
const tag_1 = require("../../prompts/node/base/tag");
const toolNames_1 = require("../common/toolNames");
const toolsRegistry_1 = require("../common/toolsRegistry");
/**
 * Resolves `#testFailure` into zero or more test failures based on the API.
 * It gathers all failures, and if there are less than five failures in the
 * most recent test run or they would use less than 1/5th of the token budget,
 * it renders them.
 *
 * Otherwise, they are ranked and trimmed in the order:
 *
 * 1. Tests or failures in editors that are open
 * 2. Tests or failures in files that have SCM changes
 * 3. Failures whose stacks touch editors that are open
 * 4. Failures whose stacks touch files with SCM changes
 *
 */
let TestFailureTool = class TestFailureTool {
    static { this.toolName = toolNames_1.ToolName.TestFailure; }
    constructor(testProvider, workspaceService, instantiationService) {
        this.testProvider = testProvider;
        this.workspaceService = workspaceService;
        this.instantiationService = instantiationService;
    }
    async invoke({ tokenizationOptions }) {
        const failures = Array.from(this.testProvider.getAllFailures());
        if (failures.length === 0) {
            return new vscodeTypes_1.LanguageModelToolResult([
                new vscodeTypes_1.LanguageModelTextPart(`No test failures were found yet, call the tool ${toolNames_1.ToolName.RunTests} to run tests and find failures.`),
            ]);
        }
        const json = await (0, promptRenderer_1.renderPromptElementJSON)(this.instantiationService, TestFailureList, { failures }, tokenizationOptions && {
            ...tokenizationOptions,
            tokenBudget: tokenizationOptions.tokenBudget * 0.2 /* Constant.IdealMaxTokenUsageProportion */,
        });
        return new vscodeTypes_1.LanguageModelToolResult([
            new vscodeTypes_1.LanguageModelPromptTsxPart(json)
        ]);
    }
    async filterEdits(resource) {
        if (await this.testProvider.hasTestsInUri(resource)) {
            return {
                title: l10n.t `Allow changing test assertions?`,
                message: l10n.t `The model wants to change the assertions in \`${this.workspaceService.asRelativePath(resource)}\`. Do you want to allow this?`,
            };
        }
    }
    prepareInvocation(options, token) {
        return {
            invocationMessage: l10n.t `Finding test failures`,
            pastTenseMessage: l10n.t `Found test failures`,
        };
    }
    provideInput() {
        return Promise.resolve({}); // just to avoid an unnecessary model call
    }
};
exports.TestFailureTool = TestFailureTool;
exports.TestFailureTool = TestFailureTool = __decorate([
    __param(0, testProvider_1.ITestProvider),
    __param(1, workspaceService_1.IWorkspaceService),
    __param(2, instantiation_1.IInstantiationService)
], TestFailureTool);
toolsRegistry_1.ToolRegistry.registerTool(TestFailureTool);
let TestFailureList = class TestFailureList extends prompt_tsx_1.PromptElement {
    constructor(props, workspaceService, tabsAndEditorsService, gitExtensionService) {
        super(props);
        this.workspaceService = workspaceService;
        this.tabsAndEditorsService = tabsAndEditorsService;
        this.gitExtensionService = gitExtensionService;
    }
    render() {
        if (!this.props.failures.length) {
            return vscpp(prompt_tsx_1.TextChunk, { priority: 100 }, "No test failures were found.");
        }
        return vscpp(vscppf, null,
            vscpp(prompt_tsx_1.PrioritizedList, { priority: 100, descending: true }, this.sortByRanks(this.props.failures).map(f => vscpp(TestFailureElement, { failure: f }))),
            vscpp(prompt_tsx_1.TextChunk, { priority: 101 },
                "## Rules:",
                vscpp("br", null),
                "- Always try to find an error in the implementation code first. Don't suggest any changes in my test cases unless I tell you to.",
                vscpp("br", null),
                "- If you need more information about anything in the codebase, use a tool like ",
                toolNames_1.ToolName.ReadFile,
                ", ",
                toolNames_1.ToolName.ListDirectory,
                ", or ",
                toolNames_1.ToolName.FindFiles,
                " to find and read it. Never ask the user to provide it themselves.",
                vscpp("br", null),
                "- If you make changes to fix the test, call ",
                toolNames_1.ToolName.RunTests,
                " to run the tests and verify the fix.",
                vscpp("br", null),
                "- Don't try to make the same changes you made before to fix the test. If you're stuck, ask the user for pointers.",
                vscpp("br", null)));
    }
    sortByRanks(failures) {
        const withRanks = failures.map((failure) => {
            let rank = failure.snapshot.uri ? this.rankFile(failure.snapshot.uri) : 0 /* Constant.RankNone */;
            for (const message of failure.task.messages) {
                if (rank === 4 /* Constant.MaxRank */) {
                    return { failure, rank }; // abort early if there's nothing better
                }
                if (message.location) {
                    rank = Math.max(rank, this.rankFile(message.location.uri));
                }
            }
            if (rank > 0 /* Constant.RankNone */) {
                return { failure, rank };
            }
            for (const message of failure.task.messages) {
                if (message.stackTrace) {
                    // limit to first 10 stack frames to avoid going too crazy on giant stacks
                    for (const frame of message.stackTrace.slice(0, 10)) {
                        if (frame.uri) {
                            rank = Math.max(rank, this.rankFile(frame.uri));
                        }
                    }
                }
            }
            // Ranks from stacktraces are always less than 'primary' ranks, so /10
            return { failure, rank: rank / 10 };
        });
        return withRanks.sort((a, b) => b.rank - a.rank).map(f => f.failure);
    }
    rankFile(uri) {
        if (this.tabsAndEditorsService.activeTextEditor?.document.uri.toString() === uri.toString()) {
            return 4 /* Constant.RankActive */;
        }
        if (this.tabsAndEditorsService.visibleTextEditors?.some(e => e.document.uri.toString() === uri.toString())) {
            return 3 /* Constant.RankVisible */;
        }
        if (this.workspaceService.textDocuments.some(d => d.uri.toString() === uri.toString())) {
            return 2 /* Constant.RankOpen */;
        }
        // Check if file has SCM changes
        const repository = this.gitExtensionService.getExtensionApi()?.getRepository(uri);
        if (repository) {
            const state = repository.state;
            const indicies = [
                state.indexChanges,
                state.workingTreeChanges,
                state.mergeChanges,
                state.untrackedChanges
            ];
            for (const changes of indicies) {
                if (changes.some(change => change.uri.toString() === uri.toString())) {
                    return 1 /* Constant.RankSCM */;
                }
            }
        }
        return 0 /* Constant.RankNone */;
    }
};
exports.TestFailureList = TestFailureList;
exports.TestFailureList = TestFailureList = __decorate([
    __param(1, workspaceService_1.IWorkspaceService),
    __param(2, tabsAndEditorsService_1.ITabsAndEditorsService),
    __param(3, gitExtensionService_1.IGitExtensionService)
], TestFailureList);
class TestFailureElement extends prompt_tsx_1.PromptElement {
    constructor(props) {
        super(props);
    }
    render() {
        const f = this.props.failure;
        const namePartsInSameUri = [];
        for (let n = f.snapshot; n; n = n.parent) {
            if (n.uri?.toString() === f.snapshot.uri?.toString()) {
                namePartsInSameUri.push(n.label);
            }
        }
        return vscpp(vscppf, null,
            vscpp(tag_1.Tag, { name: 'testFailure', attrs: {
                    testCase: namePartsInSameUri.reverse().join(' '),
                    path: f.snapshot.uri?.fsPath,
                } }, f.task.messages.map(m => vscpp(TestMessageElement, { message: m }))));
    }
}
let TestMessageElement = class TestMessageElement extends prompt_tsx_1.PromptElement {
    constructor(props, workspaceService) {
        super(props);
        this.workspaceService = workspaceService;
    }
    render() {
        const f = this.props.message;
        const children = [];
        if (f.expectedOutput !== undefined && f.actualOutput !== undefined) {
            children.push(vscpp(tag_1.Tag, { name: 'expectedOutput' }, f.expectedOutput), vscpp(tag_1.Tag, { name: 'actualOutput' }, f.actualOutput));
        }
        else {
            children.push(vscpp(tag_1.Tag, { name: 'message' }, typeof f.message === 'string' ? f.message : f.message.value));
        }
        if (f.stackTrace) {
            for (const { label, position, uri } of f.stackTrace) {
                // if there's both a position and URI, the XML element alone is fully descriptive so omit the label
                if (position && uri) {
                    children.push(vscpp(tag_1.Tag, { name: 'stackFrame', attrs: { path: this.workspaceService.asRelativePath(uri), line: position.line, col: position.character } }));
                }
                else {
                    children.push(vscpp(tag_1.Tag, { name: 'stackFrame', attrs: { path: uri && this.workspaceService.asRelativePath(uri), line: position?.line, col: position?.character } }, label));
                }
            }
        }
        return vscpp(vscppf, null, children);
    }
};
TestMessageElement = __decorate([
    __param(1, workspaceService_1.IWorkspaceService)
], TestMessageElement);
//# sourceMappingURL=testFailureTool.js.map