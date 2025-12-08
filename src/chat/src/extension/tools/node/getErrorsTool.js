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
exports.DiagnosticToolOutput = exports.GetErrorsTool = void 0;
const l10n = __importStar(require("@vscode/l10n"));
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const languageDiagnosticsService_1 = require("../../../platform/languages/common/languageDiagnosticsService");
const logService_1 = require("../../../platform/log/common/logService");
const notebookService_1 = require("../../../platform/notebook/common/notebookService");
const promptPathRepresentationService_1 = require("../../../platform/prompts/common/promptPathRepresentationService");
const workspaceService_1 = require("../../../platform/workspace/common/workspaceService");
const languages_1 = require("../../../util/common/languages");
const notebooks_1 = require("../../../util/common/notebooks");
const types_1 = require("../../../util/common/types");
const arrays_1 = require("../../../util/vs/base/common/arrays");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const map_1 = require("../../../util/vs/base/common/map");
const resources_1 = require("../../../util/vs/base/common/resources");
const uri_1 = require("../../../util/vs/base/common/uri");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../vscodeTypes");
const promptRenderer_1 = require("../../prompts/node/base/promptRenderer");
const tag_1 = require("../../prompts/node/base/tag");
const diagnosticsContext_1 = require("../../prompts/node/inline/diagnosticsContext");
const toolNames_1 = require("../common/toolNames");
const toolsRegistry_1 = require("../common/toolsRegistry");
const toolUtils_1 = require("../common/toolUtils");
const toolUtils_2 = require("./toolUtils");
let GetErrorsTool = class GetErrorsTool extends lifecycle_1.Disposable {
    static { this.toolName = toolNames_1.ToolName.GetErrors; }
    constructor(instantiationService, languageDiagnosticsService, workspaceService, promptPathRepresentationService, notebookService, logService) {
        super();
        this.instantiationService = instantiationService;
        this.languageDiagnosticsService = languageDiagnosticsService;
        this.workspaceService = workspaceService;
        this.promptPathRepresentationService = promptPathRepresentationService;
        this.notebookService = notebookService;
        this.logService = logService;
    }
    /**
     * Get diagnostics for the given paths and optional ranges.
     * Note - This is made public for testing purposes only.
     */
    getDiagnostics(paths) {
        const results = [];
        // for notebooks, we need to find the cell matching the range and get diagnostics for that cell
        const nonNotebookPaths = paths.filter(p => {
            const isNotebook = this.notebookService.hasSupportedNotebooks(p.uri);
            if (isNotebook) {
                const diagnostics = this.getNotebookCellDiagnostics(p.uri);
                results.push({ uri: p.uri, diagnostics });
            }
            return !isNotebook;
        });
        if (nonNotebookPaths.length === 0) {
            return results;
        }
        const pendingMatchPaths = new Set(nonNotebookPaths.map(p => p.uri));
        // for non-notebooks, we get all diagnostics and filter down
        for (const [resource, entries] of this.languageDiagnosticsService.getAllDiagnostics()) {
            const pendingDiagnostics = entries.filter(d => d.severity <= vscodeTypes_1.DiagnosticSeverity.Warning);
            if (pendingDiagnostics.length === 0) {
                continue;
            }
            // find all path&range pairs and collect the ranges to further filter diagnostics
            // if any path matches the resource without a range, take all diagnostics for that file
            // otherwise, filter diagnostics to those intersecting one of the provided ranges
            const ranges = [];
            let shouldTakeAll = false;
            let foundMatch = false;
            let inputUri;
            let matchedExactPath = false;
            for (const path of nonNotebookPaths) {
                // we support file or folder paths
                if ((0, resources_1.isEqualOrParent)(resource, path.uri)) {
                    foundMatch = true;
                    // Track the input URI that matched - prefer exact matches, otherwise use the folder
                    const isExactMatch = resource.toString() === path.uri.toString();
                    if (isExactMatch) {
                        // Exact match - this is the file itself, no input folder
                        inputUri = undefined;
                        matchedExactPath = true;
                    }
                    else if (!matchedExactPath) {
                        // Folder match - only set if we haven't found an exact match or a previous folder match
                        if (inputUri === undefined) {
                            inputUri = path.uri;
                        }
                    }
                    if (pendingMatchPaths.has(path.uri)) {
                        pendingMatchPaths.delete(path.uri);
                    }
                    if (path.range) {
                        ranges.push(path.range);
                    }
                    else {
                        // no range, so all diagnostics for this file
                        shouldTakeAll = true;
                        break;
                    }
                }
            }
            if (shouldTakeAll) {
                results.push({ uri: resource, diagnostics: pendingDiagnostics, inputUri });
                continue;
            }
            if (foundMatch && ranges.length > 0) {
                const diagnostics = pendingDiagnostics.filter(d => ranges.some(range => d.range.intersection(range)));
                results.push({ uri: resource, diagnostics, inputUri });
            }
        }
        // for any given paths that didn't match any files, return empty diagnostics for each of them
        for (const uri of pendingMatchPaths) {
            results.push({ uri, diagnostics: [] });
        }
        return results;
    }
    async invoke(options, token) {
        const getAll = () => this.languageDiagnosticsService.getAllDiagnostics()
            .map(d => ({ uri: d[0], diagnostics: d[1].filter(e => e.severity <= vscodeTypes_1.DiagnosticSeverity.Warning), inputUri: undefined }))
            // filter any documents w/o warnings or errors
            .filter(d => d.diagnostics.length > 0);
        const getSome = (filePaths) => this.getDiagnostics(filePaths.map((filePath, i) => {
            const uri = (0, toolUtils_2.resolveToolInputPath)(filePath, this.promptPathRepresentationService);
            const range = options.input.ranges?.[i];
            if (!uri) {
                throw new Error(`Invalid input path ${filePath}`);
            }
            return { uri, range: range ? new vscodeTypes_1.Range(...range) : undefined };
        }));
        const ds = options.input.filePaths?.length ? getSome(options.input.filePaths) : getAll();
        const diagnostics = (0, arrays_1.coalesce)(await Promise.all(ds.map((async ({ uri, diagnostics, inputUri }) => {
            try {
                const document = await this.workspaceService.openTextDocumentAndSnapshot(uri);
                (0, toolUtils_2.checkCancellation)(token);
                return {
                    uri,
                    diagnostics,
                    context: { document, language: (0, languages_1.getLanguage)(document) },
                    inputUri
                };
            }
            catch (e) {
                this.logService.error(e, 'get_errors failed to open doc with diagnostics');
                return undefined;
            }
        }))));
        (0, toolUtils_2.checkCancellation)(token);
        const result = new vscodeTypes_1.ExtendedLanguageModelToolResult([
            new vscodeTypes_1.LanguageModelPromptTsxPart(await (0, promptRenderer_1.renderPromptElementJSON)(this.instantiationService, DiagnosticToolOutput, { diagnosticsGroups: diagnostics, maxDiagnostics: 50 }, options.tokenizationOptions, token))
        ]);
        const numDiagnostics = diagnostics.reduce((acc, { diagnostics }) => acc + diagnostics.length, 0);
        // For display message, use inputUri if available (indicating file was found via folder input), otherwise use the file uri
        // Deduplicate URIs since multiple files may have the same inputUri
        const displayUriSet = new map_1.ResourceSet();
        for (const d of diagnostics) {
            const displayUri = d.inputUri ?? d.uri;
            displayUriSet.add(displayUri);
        }
        const formattedURIs = this.formatURIs(Array.from(displayUriSet));
        if (options.input.filePaths?.length) {
            result.toolResultMessage = numDiagnostics === 0 ?
                new vscodeTypes_1.MarkdownString(l10n.t `Checked ${formattedURIs}, no problems found`) :
                numDiagnostics === 1 ?
                    new vscodeTypes_1.MarkdownString(l10n.t `Checked ${formattedURIs}, 1 problem found`) :
                    new vscodeTypes_1.MarkdownString(l10n.t `Checked ${formattedURIs}, ${numDiagnostics} problems found`);
        }
        else {
            result.toolResultMessage = numDiagnostics === 0 ?
                new vscodeTypes_1.MarkdownString(l10n.t `Checked workspace, no problems found`) :
                numDiagnostics === 1 ?
                    new vscodeTypes_1.MarkdownString(l10n.t `Checked workspace, 1 problem found in ${formattedURIs}`) :
                    new vscodeTypes_1.MarkdownString(l10n.t `Checked workspace, ${numDiagnostics} problems found in ${formattedURIs}`);
        }
        return result;
    }
    prepareInvocation(options, token) {
        if (!options.input.filePaths?.length) {
            // When no file paths provided, check all files with diagnostics
            return {
                invocationMessage: new vscodeTypes_1.MarkdownString(l10n.t `Checking workspace for problems`),
            };
        }
        else {
            const uris = options.input.filePaths.map(filePath => (0, toolUtils_2.resolveToolInputPath)(filePath, this.promptPathRepresentationService));
            if (uris.some(uri => uri === undefined)) {
                throw new Error('Invalid file path provided');
            }
            return {
                invocationMessage: new vscodeTypes_1.MarkdownString(l10n.t `Checking ${this.formatURIs(uris)}`),
            };
        }
    }
    formatURIs(uris) {
        return uris.map(toolUtils_1.formatUriForFileWidget).join(', ');
    }
    getNotebookCellDiagnostics(uri) {
        const notebook = (0, notebooks_1.findNotebook)(uri, this.workspaceService.notebookDocuments);
        if (!notebook) {
            this.logService.error(`Notebook not found: ${uri.toString()}, could not retrieve diagnostics`);
            return [];
        }
        return notebook.getCells()
            .flatMap((cell) => {
            const uri = cell.document.uri;
            return this.languageDiagnosticsService.getDiagnostics(uri);
        });
    }
    async provideInput(promptContext) {
        const seen = new Set();
        const filePaths = [];
        const ranges = [];
        function addPath(path, range) {
            if (!seen.has(path)) {
                seen.add(path);
                filePaths.push(path);
                ranges.push(range && [range.start.line, range.start.character, range.end.line, range.end.character]);
            }
        }
        for (const ref of promptContext.chatVariables) {
            if (uri_1.URI.isUri(ref.value)) {
                addPath(this.promptPathRepresentationService.getFilePath(ref.value), undefined);
            }
            else if ((0, types_1.isLocation)(ref.value)) {
                addPath(this.promptPathRepresentationService.getFilePath(ref.value.uri), ref.value.range);
            }
        }
        if (promptContext.workingSet) {
            for (const file of promptContext.workingSet) {
                addPath(this.promptPathRepresentationService.getFilePath(file.document.uri), file.range);
            }
        }
        if (!filePaths.length) {
            for (const [uri, diags] of this.languageDiagnosticsService.getAllDiagnostics()) {
                const path = this.promptPathRepresentationService.getFilePath(uri);
                if (diags.length) {
                    let range = diags[0].range;
                    for (let i = 1; i < diags.length; i++) {
                        range = range.union(diags[i].range);
                    }
                    addPath(path, range);
                }
            }
        }
        return {
            filePaths,
            ranges
        };
    }
};
exports.GetErrorsTool = GetErrorsTool;
exports.GetErrorsTool = GetErrorsTool = __decorate([
    __param(0, instantiation_1.IInstantiationService),
    __param(1, languageDiagnosticsService_1.ILanguageDiagnosticsService),
    __param(2, workspaceService_1.IWorkspaceService),
    __param(3, promptPathRepresentationService_1.IPromptPathRepresentationService),
    __param(4, notebookService_1.INotebookService),
    __param(5, logService_1.ILogService)
], GetErrorsTool);
toolsRegistry_1.ToolRegistry.registerTool(GetErrorsTool);
let DiagnosticToolOutput = class DiagnosticToolOutput extends prompt_tsx_1.PromptElement {
    constructor(props, promptPathRepresentationService) {
        super(props);
        this.promptPathRepresentationService = promptPathRepresentationService;
    }
    render() {
        if (!this.props.diagnosticsGroups.length) {
            return vscpp(vscppf, null, "No errors found.");
        }
        let diagnosticsGroups = this.props.diagnosticsGroups;
        let limitMsg;
        if (typeof this.props.maxDiagnostics === 'number') {
            let remaining = this.props.maxDiagnostics;
            diagnosticsGroups = this.props.diagnosticsGroups.map(group => {
                if (remaining <= 0) {
                    return { ...group, diagnostics: [] };
                }
                const take = Math.min(group.diagnostics.length, remaining);
                remaining -= take;
                return { ...group, diagnostics: group.diagnostics.slice(0, take) };
            });
            const totalDiagnostics = this.props.diagnosticsGroups.reduce((acc, group) => acc + group.diagnostics.length, 0);
            limitMsg = totalDiagnostics > this.props.maxDiagnostics
                ? vscpp(vscppf, null,
                    "Showing first ",
                    this.props.maxDiagnostics,
                    " results out of ",
                    totalDiagnostics,
                    vscpp("br", null))
                : undefined;
        }
        return vscpp(vscppf, null,
            limitMsg,
            diagnosticsGroups.map(d => vscpp(tag_1.Tag, { name: 'errors', attrs: { path: this.promptPathRepresentationService.getFilePath(d.uri) } }, d.diagnostics.length
                ? vscpp(diagnosticsContext_1.Diagnostics, { documentContext: d.context, diagnostics: d.diagnostics, includeRelatedInfos: false })
                : 'No errors found')));
    }
};
exports.DiagnosticToolOutput = DiagnosticToolOutput;
exports.DiagnosticToolOutput = DiagnosticToolOutput = __decorate([
    __param(1, promptPathRepresentationService_1.IPromptPathRepresentationService)
], DiagnosticToolOutput);
//# sourceMappingURL=getErrorsTool.js.map