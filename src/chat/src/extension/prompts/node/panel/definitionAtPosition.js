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
var DefinitionAtPosition_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefinitionAtPosition = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const envService_1 = require("../../../../platform/env/common/envService");
const extensionContext_1 = require("../../../../platform/extContext/common/extensionContext");
const ignoreService_1 = require("../../../../platform/ignore/common/ignoreService");
const languageFeaturesService_1 = require("../../../../platform/languages/common/languageFeaturesService");
const logService_1 = require("../../../../platform/log/common/logService");
const parserService_1 = require("../../../../platform/parser/node/parserService");
const treeSitterLanguages_1 = require("../../../../platform/parser/node/treeSitterLanguages");
const telemetry_1 = require("../../../../platform/telemetry/common/telemetry");
const workspaceService_1 = require("../../../../platform/workspace/common/workspaceService");
const languages_1 = require("../../../../util/common/languages");
const arrays = __importStar(require("../../../../util/vs/base/common/arrays"));
const vscodeTypes_1 = require("../../../../vscodeTypes");
const selectionContextHelpers_1 = require("../../../context/node/resolvers/selectionContextHelpers");
const definitionAroundCursor_1 = require("../../../prompt/node/definitionAroundCursor");
const safeElements_1 = require("./safeElements");
/**
 * @remark Excludes definitions that are in copilot-ignored files.
 */
let DefinitionAtPosition = class DefinitionAtPosition extends prompt_tsx_1.PromptElement {
    static { DefinitionAtPosition_1 = this; }
    static { this.DEFAULT_TIMEOUT_MS = 200; }
    constructor(props, _languageFeaturesService, _workspaceService, _vscodeExtensionCtxService, _ignoreService, _logService, _parserService, _telemetryService) {
        super(props);
        this._languageFeaturesService = _languageFeaturesService;
        this._workspaceService = _workspaceService;
        this._vscodeExtensionCtxService = _vscodeExtensionCtxService;
        this._ignoreService = _ignoreService;
        this._logService = _logService;
        this._parserService = _parserService;
        this._telemetryService = _telemetryService;
    }
    async prepare() {
        if (await this._ignoreService.isCopilotIgnored(this.props.document.uri)) {
            return { k: 'ignored' };
        }
        const timeout = this._vscodeExtensionCtxService.extensionMode === vscodeTypes_1.ExtensionMode.Test && !envService_1.isScenarioAutomation
            ? 0
            : (this.props.timeoutMs === undefined ? DefinitionAtPosition_1.DEFAULT_TIMEOUT_MS : this.props.timeoutMs);
        const definitions = await this.findDefinition(timeout);
        this._logService.debug(`Found ${definitions.length} implementation(s)/definition(s)`);
        if (definitions.length > 0) {
            this._logService.debug(`Implementation(s)/definition(s) found:` + JSON.stringify(definitions, null, '\t'));
        }
        return {
            k: 'found',
            definitions
        };
    }
    render(state, sizing) {
        if (state.k === 'ignored') {
            return vscpp("ignoredFiles", { value: [this.props.document.uri] });
        }
        const { document, position } = this.props;
        const { definitions } = state;
        if (definitions.length === 0) {
            const line = document.lineAt(position.line);
            definitions.push({
                languageId: document.languageId,
                uri: document.uri,
                code: line.text,
                excerptRange: line.range,
            });
        }
        return (vscpp(vscppf, null,
            "Relevant definition",
            definitions.length > 1 ? 's' : '',
            ": ",
            vscpp("br", null),
            vscpp("br", null),
            definitions.map(codeBlock => {
                const lineCommentStart = (0, languages_1.getLanguage)(codeBlock.languageId).lineComment.start;
                const filePath = `${lineCommentStart} FILEPATH: ${codeBlock.uri.path}`;
                const code = `${filePath}\n${codeBlock.code}`;
                return (vscpp(safeElements_1.CodeBlock, { uri: codeBlock.uri, languageId: codeBlock.languageId, code: code }));
            })));
    }
    async findDefinition(timeoutMs) {
        const { document, position } = this.props;
        // find implementation or, if not found, definition
        const findImplOrDefinition = async (position) => {
            try {
                const impls = await this._languageFeaturesService.getImplementations(document.uri, position);
                this._logService.debug(`Found ${impls.length} implementations` + JSON.stringify(impls, null, '\t'));
                if (impls.length > 0) {
                    return impls;
                }
            }
            catch { }
            try {
                const defs = await this._languageFeaturesService.getDefinitions(document.uri, position);
                this._logService.debug(`Found ${defs.length} definitions` + JSON.stringify(defs, null, '\t'));
                if (defs.length > 0) {
                    return defs;
                }
            }
            catch { }
            this._logService.debug(`No definitions or implementations found`);
            return [];
        };
        const foundDefs = await (0, selectionContextHelpers_1.asyncComputeWithTimeBudget)(this._logService, this._telemetryService, document, timeoutMs * 3, () => findImplOrDefinition(position), []);
        const nonIgnoredDefs = arrays.coalesce(await Promise.all(foundDefs.map(async (def) => {
            const uri = (0, languageFeaturesService_1.isLocationLink)(def) ? def.targetUri : document.uri;
            return await this._ignoreService.isCopilotIgnored(uri) ? undefined : def;
        })));
        // since language service gives us only links to identifiers, expand to whole implementation/definition using tree-sitter
        return Promise.all(nonIgnoredDefs.map(async (def) => {
            const { uri, range } = (0, languageFeaturesService_1.isLocationLink)(def) ? { uri: def.targetUri, range: def.targetRange } : def;
            const docContainingDef = await this._workspaceService.openTextDocumentAndSnapshot(uri);
            const wasmLanguage = (0, treeSitterLanguages_1.getWasmLanguage)(docContainingDef.languageId);
            let code;
            let excerptRange;
            if (wasmLanguage === undefined) { // capture at least the line of the definition
                const line = docContainingDef.lineAt(range.start.line);
                code = line.text;
                excerptRange = line.range;
            }
            else {
                const nodeToDocument = await (0, definitionAroundCursor_1.determineNodeToDocument)(this._parserService, this._telemetryService, {
                    document: docContainingDef,
                    language: (0, languages_1.getLanguage)(document.languageId),
                    wholeRange: range,
                    selection: new vscodeTypes_1.Selection(range.start, range.end),
                    fileIndentInfo: undefined,
                });
                excerptRange = nodeToDocument.range;
                code = docContainingDef.getText(excerptRange);
            }
            return {
                languageId: docContainingDef.languageId,
                uri: docContainingDef.uri,
                code,
                excerptRange,
            };
        }));
    }
};
exports.DefinitionAtPosition = DefinitionAtPosition;
exports.DefinitionAtPosition = DefinitionAtPosition = DefinitionAtPosition_1 = __decorate([
    __param(1, languageFeaturesService_1.ILanguageFeaturesService),
    __param(2, workspaceService_1.IWorkspaceService),
    __param(3, extensionContext_1.IVSCodeExtensionContext),
    __param(4, ignoreService_1.IIgnoreService),
    __param(5, logService_1.ILogService),
    __param(6, parserService_1.IParserService),
    __param(7, telemetry_1.ITelemetryService)
], DefinitionAtPosition);
//# sourceMappingURL=definitionAtPosition.js.map