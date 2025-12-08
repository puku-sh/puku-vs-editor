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
var CurrentSelection_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrentSelection = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const ignoreService_1 = require("../../../../platform/ignore/common/ignoreService");
const logService_1 = require("../../../../platform/log/common/logService");
const tabsAndEditorsService_1 = require("../../../../platform/tabs/common/tabsAndEditorsService");
const path = __importStar(require("../../../../util/vs/base/common/path"));
const vscodeTypes_1 = require("../../../../vscodeTypes");
const conversation_1 = require("../../../prompt/common/conversation");
const currentEditor_1 = require("./currentEditor");
const safeElements_1 = require("./safeElements");
let CurrentSelection = CurrentSelection_1 = class CurrentSelection extends prompt_tsx_1.PromptElement {
    constructor(props, ignoreService, logger, _tabsAndEditorsService) {
        super(props);
        this.ignoreService = ignoreService;
        this.logger = logger;
        this._tabsAndEditorsService = _tabsAndEditorsService;
    }
    async prepare(sizing) {
        if (!this.props.document) {
            return { isIgnored: false, exceedsTokenBudget: false };
        }
        const isIgnored = await this.ignoreService.isCopilotIgnored(this.props.document.uri);
        let exceedsTokenBudget = false;
        const selection = CurrentSelection_1.getCurrentSelection(this._tabsAndEditorsService);
        if (selection && (await sizing.countTokens(selection?.selectedText)) * 1.1 > sizing.tokenBudget) {
            exceedsTokenBudget = true;
        }
        return { isIgnored, exceedsTokenBudget };
    }
    render(state, sizing) {
        const selection = CurrentSelection_1.getCurrentSelection(this._tabsAndEditorsService);
        if (!selection) {
            return vscpp(currentEditor_1.CurrentEditor, null);
        }
        const references = [new conversation_1.PromptReference(new vscodeTypes_1.Location(selection.activeDocument.uri, selection.range))];
        const urisUsed = [selection.activeDocument.uri];
        if (state.isIgnored) {
            return vscpp("ignoredFiles", { value: urisUsed });
        }
        if (state.exceedsTokenBudget) {
            this.logger.info(`Dropped current selection (${sizing.tokenBudget} / ${sizing.endpoint.modelMaxPromptTokens} tokens)`);
            return (vscpp(vscppf, null,
                vscpp(prompt_tsx_1.AssistantMessage, { priority: this.props.priority, name: 'selection-too-large' },
                    "Your active selection (",
                    selection.fileName && vscpp(vscppf, null,
                        selection.selectedText.split('\n').length,
                        " lines from ",
                        path.basename(selection.fileName)),
                    ") exceeded my maximum context size and was dropped. Please reduce the selection to the most relevant part.")));
        }
        return (vscpp(vscppf, null,
            vscpp(prompt_tsx_1.UserMessage, { priority: this.props.priority },
                "Active selection:",
                vscpp("br", null),
                vscpp("br", null),
                vscpp("br", null),
                selection.fileName && vscpp(vscppf, null,
                    "From the file: ",
                    path.basename(selection.fileName),
                    vscpp("br", null)),
                vscpp(safeElements_1.CodeBlock, { code: selection.selectedText, languageId: selection.languageId, uri: selection.activeDocument.uri, references: references }),
                vscpp("br", null),
                vscpp("br", null))));
    }
    static getCurrentSelection(tabsAndEditorsService, allowEmptySelection = false) {
        const editor = tabsAndEditorsService.activeTextEditor;
        const activeDocument = editor?.document;
        if (activeDocument) {
            const activeDocumentSelection = editor.selection;
            if (activeDocumentSelection && (!activeDocumentSelection.isEmpty
                || activeDocumentSelection.isEmpty && allowEmptySelection)) {
                const languageId = activeDocument.languageId;
                const selectedText = activeDocument.getText(activeDocumentSelection);
                return {
                    languageId,
                    selectedText,
                    activeDocument,
                    range: activeDocumentSelection,
                    fileName: activeDocument.fileName
                };
            }
        }
    }
};
exports.CurrentSelection = CurrentSelection;
exports.CurrentSelection = CurrentSelection = CurrentSelection_1 = __decorate([
    __param(1, ignoreService_1.IIgnoreService),
    __param(2, logService_1.ILogService),
    __param(3, tabsAndEditorsService_1.ITabsAndEditorsService)
], CurrentSelection);
//# sourceMappingURL=currentSelection.js.map