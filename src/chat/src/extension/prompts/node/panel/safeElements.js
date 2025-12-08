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
exports.Uri = exports.ExampleCodeBlock = exports.CodeBlock = exports.SafePromptElement = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const envService_1 = require("../../../../platform/env/common/envService");
const extensionContext_1 = require("../../../../platform/extContext/common/extensionContext");
const ignoreService_1 = require("../../../../platform/ignore/common/ignoreService");
const logService_1 = require("../../../../platform/log/common/logService");
const promptPathRepresentationService_1 = require("../../../../platform/prompts/common/promptPathRepresentationService");
const telemetry_1 = require("../../../../platform/telemetry/common/telemetry");
const markdown_1 = require("../../../../util/common/markdown");
const resources_1 = require("../../../../util/vs/base/common/resources");
const vscodeTypes_1 = require("../../../../vscodeTypes");
let SafePromptElement = class SafePromptElement extends prompt_tsx_1.PromptElement {
    constructor(props, _contextService, _telemetryService, _logService, _ignoreService) {
        super(props);
        this._contextService = _contextService;
        this._telemetryService = _telemetryService;
        this._logService = _logService;
        this._ignoreService = _ignoreService;
    }
    _handleFoulPrompt() {
        // REPORT error telemetry
        // FAIL when running tests
        const err = new Error('BAD PROMPT');
        this._logService.error(err);
        if (this._contextService.extensionMode !== vscodeTypes_1.ExtensionMode.Production && !envService_1.isScenarioAutomation) {
            throw err;
        }
        /* __GDPR__
            "prompt.invalidreference": {
                "owner": "jrieken",
                "comment": "Tracks bad prompt references",
                "stack": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Error stack" }
            }
        */
        this._telemetryService.sendMSFTTelemetryErrorEvent('prompt.invalidreference', { stack: err.stack });
    }
};
exports.SafePromptElement = SafePromptElement;
exports.SafePromptElement = SafePromptElement = __decorate([
    __param(1, extensionContext_1.IVSCodeExtensionContext),
    __param(2, telemetry_1.ITelemetryService),
    __param(3, logService_1.ILogService),
    __param(4, ignoreService_1.IIgnoreService)
], SafePromptElement);
let CodeBlock = class CodeBlock extends SafePromptElement {
    constructor(props, _contextService, _telemetryService, _logService, _ignoreService, _promptPathRepresentationService) {
        super(props, _contextService, _telemetryService, _logService, _ignoreService);
        this._promptPathRepresentationService = _promptPathRepresentationService;
    }
    async render() {
        const isIgnored = this.props.uri ? await this._ignoreService.isCopilotIgnored(this.props.uri) : false;
        if (isIgnored) {
            return this._handleFoulPrompt();
        }
        const filePath = this.props.includeFilepath ? this._promptPathRepresentationService.getFilePath(this.props.uri) : undefined;
        const code = (0, markdown_1.createFencedCodeBlock)(this.props.languageId ?? '', this.props.code, this.props.shouldTrim ?? true, filePath, this.props.fence);
        const reference = this.props.references && vscpp("references", { value: this.props.references });
        if (this.props.lineBasedPriority) {
            const lines = code.split('\n');
            // Ensure priority is highest for the last line too so that we don't
            // have an incomplete code block during trimming:
            return vscpp(vscppf, null, lines.map((line, i) => vscpp(prompt_tsx_1.TextChunk, { priority: i === lines.length - 1 ? lines.length : lines.length - i },
                i === 0 && reference,
                line,
                i === lines.length - 1 ? '' : '\n')));
        }
        return vscpp(prompt_tsx_1.TextChunk, null,
            reference,
            code);
    }
};
exports.CodeBlock = CodeBlock;
exports.CodeBlock = CodeBlock = __decorate([
    __param(1, extensionContext_1.IVSCodeExtensionContext),
    __param(2, telemetry_1.ITelemetryService),
    __param(3, logService_1.ILogService),
    __param(4, ignoreService_1.IIgnoreService),
    __param(5, promptPathRepresentationService_1.IPromptPathRepresentationService)
], CodeBlock);
let ExampleCodeBlock = class ExampleCodeBlock extends SafePromptElement {
    constructor(props, _contextService, _telemetryService, _logService, _ignoreService, _promptPathRepresentationService) {
        super(props, _contextService, _telemetryService, _logService, _ignoreService);
        this._promptPathRepresentationService = _promptPathRepresentationService;
    }
    async render() {
        const filePath = this.props.includeFilepath ? this._promptPathRepresentationService.getExampleFilePath(this.props.examplePath ?? '/path/to/file') : undefined;
        const code = (0, markdown_1.createFencedCodeBlock)(this.props.languageId ?? '', this.props.code, this.props.shouldTrim ?? true, filePath, this.props.minNumberOfBackticks);
        return vscpp(prompt_tsx_1.TextChunk, null, code);
    }
};
exports.ExampleCodeBlock = ExampleCodeBlock;
exports.ExampleCodeBlock = ExampleCodeBlock = __decorate([
    __param(1, extensionContext_1.IVSCodeExtensionContext),
    __param(2, telemetry_1.ITelemetryService),
    __param(3, logService_1.ILogService),
    __param(4, ignoreService_1.IIgnoreService),
    __param(5, promptPathRepresentationService_1.IPromptPathRepresentationService)
], ExampleCodeBlock);
class Uri extends SafePromptElement {
    get insertLineBreakBefore() {
        return false;
    }
    async render() {
        const isIgnored = await this._ignoreService.isCopilotIgnored(this.props.value);
        if (isIgnored) {
            return this._handleFoulPrompt();
        }
        let value;
        if (this.props.mode === 1 /* UriMode.Path */) {
            value = this.props.value.path;
        }
        else {
            value = (0, resources_1.basename)(this.props.value);
        }
        return vscpp(vscppf, null, value);
    }
}
exports.Uri = Uri;
//# sourceMappingURL=safeElements.js.map