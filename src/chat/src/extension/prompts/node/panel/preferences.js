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
exports.UserPreferences = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const configurationService_1 = require("../../../../platform/configuration/common/configurationService");
const extensionContext_1 = require("../../../../platform/extContext/common/extensionContext");
const fileSystemService_1 = require("../../../../platform/filesystem/common/fileSystemService");
const uri_1 = require("../../../../util/vs/base/common/uri");
const tag_1 = require("../base/tag");
let UserPreferences = class UserPreferences extends prompt_tsx_1.PromptElement {
    constructor(props, fileSystemService, configurationService, extensionContext) {
        super(props);
        this.fileSystemService = fileSystemService;
        this.configurationService = configurationService;
        this.extensionContext = extensionContext;
    }
    async render(state, sizing) {
        if (!this.configurationService.getConfig(configurationService_1.ConfigKey.AdvancedExperimental.EnableUserPreferences)) {
            return undefined;
        }
        try {
            const uri = uri_1.URI.joinPath(this.extensionContext.globalStorageUri, 'copilotUserPreferences.md');
            const fileContents = await this.fileSystemService.readFile(uri);
            return (vscpp(vscppf, null,
                vscpp(tag_1.Tag, { name: 'instructions' },
                    vscpp("references", { value: [new prompt_tsx_1.PromptReference(uri)] }),
                    new TextDecoder().decode(fileContents))));
        }
        catch (ex) {
            return undefined;
        }
    }
};
exports.UserPreferences = UserPreferences;
exports.UserPreferences = UserPreferences = __decorate([
    __param(1, fileSystemService_1.IFileSystemService),
    __param(2, configurationService_1.IConfigurationService),
    __param(3, extensionContext_1.IVSCodeExtensionContext)
], UserPreferences);
//# sourceMappingURL=preferences.js.map