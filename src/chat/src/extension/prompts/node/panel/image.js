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
exports.Image = void 0;
const pukuRequestTypes_1 = require("../../../../platform/api/common/pukuRequestTypes");
const l10n = __importStar(require("@vscode/l10n"));
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const authentication_1 = require("../../../../platform/authentication/common/authentication");
const configurationService_1 = require("../../../../platform/configuration/common/configurationService");
const chatModelCapabilities_1 = require("../../../../platform/endpoint/common/chatModelCapabilities");
const imageService_1 = require("../../../../platform/image/common/imageService");
const logService_1 = require("../../../../platform/log/common/logService");
const nullExperimentationService_1 = require("../../../../platform/telemetry/common/nullExperimentationService");
const imageUtils_1 = require("../../../../util/common/imageUtils");
const vscodeTypes_1 = require("../../../../vscodeTypes");
const promptRenderer_1 = require("../base/promptRenderer");
let Image = class Image extends prompt_tsx_1.PromptElement {
    constructor(props, promptEndpoint, authService, logService, imageService, configurationService, experimentationService) {
        super(props);
        this.promptEndpoint = promptEndpoint;
        this.authService = authService;
        this.logService = logService;
        this.imageService = imageService;
        this.configurationService = configurationService;
        this.experimentationService = experimentationService;
    }
    async render(_state, sizing) {
        const options = { status: { description: l10n.t("{0} does not support images.", this.promptEndpoint.model), kind: prompt_tsx_1.ChatResponseReferencePartStatusKind.Omitted } };
        const fillerUri = this.props.reference ?? vscodeTypes_1.Uri.parse('Attached Image');
        try {
            if (!this.promptEndpoint.supportsVision) {
                if (this.props.omitReferences) {
                    return;
                }
                return (vscpp(vscppf, null,
                    vscpp("references", { value: [new prompt_tsx_1.PromptReference(this.props.variableName ? { variableName: this.props.variableName, value: fillerUri } : fillerUri, undefined, options)] })));
            }
            const variable = await this.props.variableValue;
            let imageSource = Buffer.from(variable).toString('base64');
            const isChatCompletions = typeof this.promptEndpoint.urlOrRequestMetadata !== 'string' && this.promptEndpoint.urlOrRequestMetadata.type === pukuRequestTypes_1.RequestType.ChatCompletions;
            const enabled = this.configurationService.getExperimentBasedConfig(configurationService_1.ConfigKey.EnableChatImageUpload, this.experimentationService);
            if (isChatCompletions && enabled && (0, chatModelCapabilities_1.modelCanUseImageURL)(this.promptEndpoint)) {
                try {
                    const githubToken = (await this.authService.getAnyGitHubSession())?.accessToken;
                    const uri = await this.imageService.uploadChatImageAttachment(variable, this.props.variableName, (0, imageUtils_1.getMimeType)(imageSource) ?? 'image/png', githubToken);
                    if (uri) {
                        imageSource = uri.toString();
                    }
                }
                catch (error) {
                    this.logService.warn(`Image upload failed, using base64 fallback: ${error}`);
                }
            }
            return (vscpp(prompt_tsx_1.UserMessage, { priority: 0 },
                vscpp(prompt_tsx_1.Image, { src: imageSource, detail: 'high' }),
                this.props.reference && (vscpp("references", { value: [new prompt_tsx_1.PromptReference(this.props.variableName ? { variableName: this.props.variableName, value: fillerUri } : fillerUri, undefined)] }))));
        }
        catch (err) {
            if (this.props.omitReferences) {
                return;
            }
            return (vscpp(vscppf, null,
                vscpp("references", { value: [new prompt_tsx_1.PromptReference(this.props.variableName ? { variableName: this.props.variableName, value: fillerUri } : fillerUri, undefined, options)] })));
        }
    }
};
exports.Image = Image;
exports.Image = Image = __decorate([
    __param(1, promptRenderer_1.IPromptEndpoint),
    __param(2, authentication_1.IAuthenticationService),
    __param(3, logService_1.ILogService),
    __param(4, imageService_1.IImageService),
    __param(5, configurationService_1.IConfigurationService),
    __param(6, nullExperimentationService_1.IExperimentationService)
], Image);
//# sourceMappingURL=image.js.map