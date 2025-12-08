"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeMapperService = exports.ICodeMapperService = void 0;
const notebookDocumentSnapshot_1 = require("../../../../platform/editing/common/notebookDocumentSnapshot");
const textDocumentSnapshot_1 = require("../../../../platform/editing/common/textDocumentSnapshot");
const editSurvivalTrackerService_1 = require("../../../../platform/editSurvivalTracking/common/editSurvivalTrackerService");
const fileSystemService_1 = require("../../../../platform/filesystem/common/fileSystemService");
const alternativeContent_1 = require("../../../../platform/notebook/common/alternativeContent");
const alternativeContentEditGenerator_1 = require("../../../../platform/notebook/common/alternativeContentEditGenerator");
const notebookService_1 = require("../../../../platform/notebook/common/notebookService");
const telemetry_1 = require("../../../../platform/telemetry/common/telemetry");
const workspaceService_1 = require("../../../../platform/workspace/common/workspaceService");
const notebooks_1 = require("../../../../util/common/notebooks");
const services_1 = require("../../../../util/common/services");
const async_1 = require("../../../../util/vs/base/common/async");
const lifecycle_1 = require("../../../../util/vs/base/common/lifecycle");
const map_1 = require("../../../../util/vs/base/common/map");
const resources_1 = require("../../../../util/vs/base/common/resources");
const instantiation_1 = require("../../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../../vscodeTypes");
const codeBlockFormattingRules_1 = require("../panel/codeBlockFormattingRules");
const codeMapper_1 = require("./codeMapper");
exports.ICodeMapperService = (0, services_1.createServiceIdentifier)('ICodeMapperService');
let CodeMapperService = class CodeMapperService extends lifecycle_1.Disposable {
    constructor(instantiationService, notebookService) {
        super();
        this.instantiationService = instantiationService;
        this.notebookService = notebookService;
        this._queues = new map_1.ResourceMap();
        this._register((0, lifecycle_1.toDisposable)(() => this._queues.clear()));
    }
    async mapCode(request, responseStream, telemetryInfo, token) {
        let queue = this._queues.get(request.codeBlock.resource);
        if (!queue) {
            queue = new async_1.Queue();
            this._queues.set(request.codeBlock.resource, queue);
        }
        return queue.queue(() => this._doMapCode(request, responseStream, telemetryInfo, token));
    }
    async _doMapCode(request, responseStream, telemetryInfo, token) {
        const codeMapper = this.notebookService.hasSupportedNotebooks(request.codeBlock.resource) ?
            this.instantiationService.createInstance(NotebookCodeMapper) :
            this.instantiationService.createInstance(DocumentCodeMapper);
        return codeMapper.mapCode(request, responseStream, telemetryInfo, token);
    }
};
exports.CodeMapperService = CodeMapperService;
exports.CodeMapperService = CodeMapperService = __decorate([
    __param(0, instantiation_1.IInstantiationService),
    __param(1, notebookService_1.INotebookService)
], CodeMapperService);
let DocumentCodeMapper = class DocumentCodeMapper extends lifecycle_1.Disposable {
    constructor(instantiationService, _workspaceService, _telemetryService, _editSurvivalTrackerService, _fileSystemService) {
        super();
        this.instantiationService = instantiationService;
        this._workspaceService = _workspaceService;
        this._telemetryService = _telemetryService;
        this._editSurvivalTrackerService = _editSurvivalTrackerService;
        this._fileSystemService = _fileSystemService;
        this.codeMapper = this.instantiationService.createInstance(codeMapper_1.CodeMapper);
    }
    async mapCode(request, responseStream, telemetryInfo, token) {
        const { codeBlock } = request;
        const documentContext = await this._getDocumentContextForCodeBlock(codeBlock);
        if (token.isCancellationRequested) {
            return undefined;
        }
        if ((!documentContext || (documentContext.getText().length === 0)) && !codeBlock.code.includes(codeBlockFormattingRules_1.EXISTING_CODE_MARKER)) {
            // for non existing, empty file and no '...existing code... content, we can emit the code block as is
            // Fast path: the base request already gave us the content to apply in full, we can avoid going to the speculative decoding endpoint
            responseStream.textEdit(codeBlock.resource, new vscodeTypes_1.TextEdit(new vscodeTypes_1.Range(0, 0, 0, 0), codeBlock.code));
            /* __GDPR__
                "codemapper.completeCodeBlock" : {
                    "owner": "aeschli",
                    "comment": "Sent when a codemapper request is received for a complete code block that contains no ...existing code... comments."
                }
                */
            this._telemetryService.sendMSFTTelemetryEvent('codemapper.completeCodeBlock');
            return {};
        }
        let editSurvivalTracker;
        // set up edit survival tracking currently only when we are modifying an existing document
        if (documentContext) {
            const tracker = editSurvivalTracker = this._editSurvivalTrackerService.initialize(documentContext.document);
            responseStream = spyResponseStream(responseStream, (_target, edits) => { tracker.collectAIEdits(edits); });
        }
        const result = await mapCode(request, responseStream, documentContext, this.codeMapper, this._telemetryService, telemetryInfo, token);
        const telemetry = result?.telemetry;
        if (telemetry) {
            editSurvivalTracker?.startReporter(res => reportEditSurvivalEvent(res, telemetry));
        }
        return result;
    }
    async _getDocumentContextForCodeBlock(codeblock) {
        try {
            const existingDoc = this._workspaceService.textDocuments.find(doc => (0, resources_1.isEqual)(doc.uri, codeblock.resource));
            if (existingDoc) {
                return textDocumentSnapshot_1.TextDocumentSnapshot.create(existingDoc);
            }
            const existsOnDisk = await this._fileSystemService.stat(codeblock.resource).then(() => true, () => false);
            if (!existsOnDisk) {
                return undefined;
            }
            return await this._workspaceService.openTextDocumentAndSnapshot(codeblock.resource);
        }
        catch (ex) {
            // ignore, probably an invalid URI or the like.
            console.error(`Failed to get document context for ${codeblock.resource.toString()}`, ex);
            return undefined;
        }
    }
};
DocumentCodeMapper = __decorate([
    __param(0, instantiation_1.IInstantiationService),
    __param(1, workspaceService_1.IWorkspaceService),
    __param(2, telemetry_1.ITelemetryService),
    __param(3, editSurvivalTrackerService_1.IEditSurvivalTrackerService),
    __param(4, fileSystemService_1.IFileSystemService)
], DocumentCodeMapper);
let NotebookCodeMapper = class NotebookCodeMapper extends lifecycle_1.Disposable {
    constructor(instantiationService, _workspaceService, _telemetryService, _fileSystemService, alternativeNotebookEditGenerator) {
        super();
        this.instantiationService = instantiationService;
        this._workspaceService = _workspaceService;
        this._telemetryService = _telemetryService;
        this._fileSystemService = _fileSystemService;
        this.alternativeNotebookEditGenerator = alternativeNotebookEditGenerator;
        this.codeMapper = this.instantiationService.createInstance(codeMapper_1.CodeMapper);
    }
    async mapCode(request, responseStream, telemetryInfo, token) {
        const { codeBlock } = request;
        const documentContext = await this._getDocumentContextForCodeBlock(codeBlock);
        if (token.isCancellationRequested) {
            return undefined;
        }
        if ((!documentContext || (documentContext.getText().length === 0)) && !codeBlock.code.includes(codeBlockFormattingRules_1.EXISTING_CODE_MARKER)) {
            // for non existing, empty file and no '...existing code... content, we can emit the code block as is
            // Fast path: the base request already gave us the content to apply in full, we can avoid going to the speculative decoding endpoint
            await (0, codeMapper_1.processFullRewriteNewNotebook)(codeBlock.resource, codeBlock.code, responseStream, this.alternativeNotebookEditGenerator, { source: alternativeContentEditGenerator_1.NotebookEditGenrationSource.newNotebookIntent, model: telemetryInfo?.chatRequestModel, requestId: telemetryInfo?.chatRequestId }, token);
            /* __GDPR__
                "codemapper.completeCodeBlock" : {
                    "owner": "aeschli",
                    "comment": "Sent when a codemapper request is received for a complete code block that contains no ...existing code... comments."
                }
            */
            this._telemetryService.sendMSFTTelemetryEvent('codemapper.completeCodeBlock');
            return {};
        }
        return mapCode(request, responseStream, documentContext, this.codeMapper, this._telemetryService, telemetryInfo, token);
    }
    async _getDocumentContextForCodeBlock(codeblock) {
        try {
            const format = (0, alternativeContent_1.inferAlternativeNotebookContentFormat)(codeblock.code);
            const notebookDocument = (0, notebooks_1.findNotebook)(codeblock.resource, this._workspaceService.notebookDocuments);
            if (notebookDocument) {
                return notebookDocumentSnapshot_1.NotebookDocumentSnapshot.create(notebookDocument, format);
            }
            const existsOnDisk = await this._fileSystemService.stat(codeblock.resource).then(() => true, () => false);
            if (!existsOnDisk) {
                return undefined;
            }
            return await this._workspaceService.openNotebookDocumentAndSnapshot(codeblock.resource, format);
        }
        catch (ex) {
            // ignore, probably an invalid URI or the like.
            console.error(`Failed to get document context for ${codeblock.resource.toString()}`, ex);
            return undefined;
        }
    }
};
NotebookCodeMapper = __decorate([
    __param(0, instantiation_1.IInstantiationService),
    __param(1, workspaceService_1.IWorkspaceService),
    __param(2, telemetry_1.ITelemetryService),
    __param(3, fileSystemService_1.IFileSystemService),
    __param(4, alternativeContentEditGenerator_1.IAlternativeNotebookContentEditGenerator)
], NotebookCodeMapper);
async function mapCode(request, responseStream, documentContext, codeMapper, telemetryService, telemetryInfo, token) {
    const { codeBlock, workingSet, location } = request;
    const requestInput = (documentContext && (documentContext.getText().length > 0)) ?
        {
            createNew: false,
            codeBlock: codeBlock.code,
            uri: codeBlock.resource,
            markdownBeforeBlock: codeBlock.markdownBeforeBlock,
            existingDocument: documentContext,
            location
        } : {
        createNew: true,
        codeBlock: codeBlock.code,
        uri: codeBlock.resource,
        markdownBeforeBlock: codeBlock.markdownBeforeBlock,
        existingDocument: undefined,
        workingSet: workingSet?.map(entry => entry.document) || []
    };
    const result = await codeMapper.mapCode(requestInput, responseStream, telemetryInfo, token);
    if (result) {
        reportTelemetry(telemetryService, result);
    }
    return result;
}
function reportTelemetry(telemetryService, { telemetry, annotations }) {
    if (!telemetry) {
        return; // cancelled
    }
    /* __GDPR__
        "codemapper.request" : {
            "owner": "aeschli",
            "comment": "Metadata about the code mapper request",
            "requestId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The id of the current request turn." },
            "requestSource": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The source from where the request was made" },
            "mapper": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The mapper used: One of 'fast', 'fast-lora', 'full' and 'patch'" },
            "outcomeAnnotations": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Annotations about the outcome of the request." }
        }
    */
    telemetryService.sendMSFTTelemetryEvent('codemapper.request', {
        requestId: telemetry.requestId,
        requestSource: telemetry.requestSource,
        mapper: telemetry.mapper,
        outcomeAnnotations: annotations?.map(a => a.label).join(','),
    }, {});
}
function spyResponseStream(responseStream, callback) {
    return {
        textEdit: (target, edits) => {
            callback(target, edits);
            responseStream.textEdit(target, edits);
        },
        notebookEdit(target, edits) {
            responseStream.notebookEdit(target, edits);
        },
    };
}
function reportEditSurvivalEvent(res, { requestId, speculationRequestId, requestSource, mapper, chatRequestModel }) {
    /* __GDPR__
        "codeMapper.trackEditSurvival" : {
            "owner": "aeschli",
            "comment": "Tracks how much percent of the AI edits survived after 5 minutes of accepting",
            "requestId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The id of the current request turn." },
            "speculationRequestId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The id of the speculation request." },
            "requestSource": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The source from where the request was made" },
            "chatRequestModel": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The model used for the base chat request to generate the edit object." },
            "mapper": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The code mapper used: One of 'fast', 'fast-lora', 'full' and 'patch'" },
            "survivalRateFourGram": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "The rate between 0 and 1 of how much of the AI edit is still present in the document." },
            "survivalRateNoRevert": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "The rate between 0 and 1 of how much of the ranges the AI touched ended up being reverted." },
            "didBranchChange": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Indicates if the branch changed in the meantime. If the branch changed (value is 1), this event should probably be ignored." },
            "timeDelayMs": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "The time delay between the user accepting the edit and measuring the survival rate." }
        }
    */
    res.telemetryService.sendMSFTTelemetryEvent('codeMapper.trackEditSurvival', { requestId, speculationRequestId, requestSource, chatRequestModel, mapper }, {
        survivalRateFourGram: res.fourGram,
        survivalRateNoRevert: res.noRevert,
        timeDelayMs: res.timeDelayMs,
        didBranchChange: res.didBranchChange ? 1 : 0,
    });
    res.telemetryService.sendInternalMSFTTelemetryEvent('codeMapper.trackEditSurvival', {
        requestId,
        speculationRequestId,
        requestSource,
        chatRequestModel,
        mapper,
        currentFileContent: res.currentFileContent,
    }, {
        survivalRateFourGram: res.fourGram,
        survivalRateNoRevert: res.noRevert,
        timeDelayMs: res.timeDelayMs,
        didBranchChange: res.didBranchChange ? 1 : 0,
    });
    res.telemetryService.sendEnhancedGHTelemetryEvent('fastApply/trackEditSurvival', {
        providerId: mapper,
        headerRequestId: speculationRequestId,
        completionTextJson: res.currentFileContent,
        chatRequestModel,
        requestSource
    }, {
        timeDelayMs: res.timeDelayMs,
        survivalRateFourGram: res.fourGram,
        survivalRateNoRevert: res.noRevert,
    });
}
//# sourceMappingURL=codeMapperService.js.map