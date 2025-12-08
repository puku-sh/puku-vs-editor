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
const l10n = __importStar(require("@vscode/l10n"));
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const commonTypes_1 = require("../../../platform/chat/common/commonTypes");
const proxy4oEndpoint_1 = require("../../../platform/endpoint/node/proxy4oEndpoint");
const extensionContext_1 = require("../../../platform/extContext/common/extensionContext");
const fileSystemService_1 = require("../../../platform/filesystem/common/fileSystemService");
const markdown_1 = require("../../../util/common/markdown");
const uri_1 = require("../../../util/vs/base/common/uri");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../vscodeTypes");
const promptRenderer_1 = require("../../prompts/node/base/promptRenderer");
const safeElements_1 = require("../../prompts/node/panel/safeElements");
const toolNames_1 = require("../common/toolNames");
const toolsRegistry_1 = require("../common/toolsRegistry");
class UserPreferenceUpdatePrompt extends prompt_tsx_1.PromptElement {
    constructor(props) {
        super(props);
    }
    render() {
        const { userPreferenceFile, facts, currentContent } = this.props;
        return (vscpp(vscppf, null,
            vscpp(prompt_tsx_1.SystemMessage, { priority: 1000 },
                "You are an AI programming assistant. The user has provided new preferences to be added to their existing preferences file.",
                vscpp("br", null),
                "Please incorporate the following new preferences into the existing file content:",
                vscpp("br", null),
                vscpp(safeElements_1.CodeBlock, { uri: userPreferenceFile, code: facts.join('\n'), languageId: "markdown", shouldTrim: false, includeFilepath: false }),
                vscpp("br", null),
                "Ensure the final content is well-formatted and correctly indented.",
                vscpp("br", null)),
            vscpp(prompt_tsx_1.UserMessage, { priority: 700 },
                vscpp(safeElements_1.CodeBlock, { uri: userPreferenceFile, code: currentContent, languageId: "markdown", shouldTrim: false, includeFilepath: false }),
                vscpp("br", null))));
    }
}
let UpdateUserPreferencesTool = class UpdateUserPreferencesTool {
    static { this.toolName = toolNames_1.ToolName.UpdateUserPreferences; }
    constructor(extensionContext, fileSystemService, instantiationService) {
        this.extensionContext = extensionContext;
        this.fileSystemService = fileSystemService;
        this.instantiationService = instantiationService;
        this.endpoint = this.instantiationService.createInstance(proxy4oEndpoint_1.Proxy4oEndpoint);
    }
    get userPreferenceFile() {
        return uri_1.URI.joinPath(this.extensionContext.globalStorageUri, 'copilotUserPreferences.md');
    }
    async invoke(options, token) {
        try {
            const currentContent = await this.fileSystemService.readFile(this.userPreferenceFile).catch(() => '');
            const newContent = await this.generateNewContent(currentContent.toString(), options.input.facts, token);
            await this.fileSystemService.writeFile(this.userPreferenceFile, Buffer.from(newContent));
            return new vscodeTypes_1.LanguageModelToolResult([
                new vscodeTypes_1.LanguageModelTextPart('User preferences updated')
            ]);
        }
        catch (ex) {
            return new vscodeTypes_1.LanguageModelToolResult([
                new vscodeTypes_1.LanguageModelTextPart('Encountered an error while updating user preferences')
            ]);
        }
    }
    async generateNewContent(currentContent, facts, token) {
        const { messages } = await (0, promptRenderer_1.renderPromptElement)(this.instantiationService, this.endpoint, UserPreferenceUpdatePrompt, { facts: facts, currentContent, userPreferenceFile: this.userPreferenceFile }, undefined, token);
        return this.doFetch(messages, this.endpoint, currentContent, token);
    }
    async doFetch(promptMessages, endpoint, speculation, token) {
        const result = await endpoint.makeChatRequest('updateUserPreferences', promptMessages, async () => {
            return undefined;
        }, token, commonTypes_1.ChatLocation.Other, undefined, { stream: true, temperature: 0, prediction: { type: 'content', content: speculation } });
        if (result.type !== commonTypes_1.ChatFetchResponseType.Success) {
            throw new Error('Failed to update user preferences');
        }
        return (0, markdown_1.extractCodeBlocks)(result.value)[0].code;
    }
    prepareInvocation(options, token) {
        return {
            invocationMessage: l10n.t `Updating user preferences`,
            pastTenseMessage: l10n.t `Updated user preferences`
        };
    }
};
UpdateUserPreferencesTool = __decorate([
    __param(0, extensionContext_1.IVSCodeExtensionContext),
    __param(1, fileSystemService_1.IFileSystemService),
    __param(2, instantiation_1.IInstantiationService)
], UpdateUserPreferencesTool);
toolsRegistry_1.ToolRegistry.registerTool(UpdateUserPreferencesTool);
//# sourceMappingURL=userPreferencesTool.js.map