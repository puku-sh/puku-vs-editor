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
exports.SettingsSchemaFeature = void 0;
const vscode_1 = require("vscode");
const authentication_1 = require("../../../platform/authentication/common/authentication");
const configurationService_1 = require("../../../platform/configuration/common/configurationService");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const observable_1 = require("../../../util/vs/base/common/observable");
const virtualTextDocumentProvider_1 = require("../../inlineEdits/vscode-node/utils/virtualTextDocumentProvider");
let SettingsSchemaFeature = class SettingsSchemaFeature extends lifecycle_1.Disposable {
    constructor(_authenticationService) {
        super();
        this._authenticationService = _authenticationService;
        this._copilotToken = (0, observable_1.observableFromEvent)(this, this._authenticationService.onDidAuthenticationChange, () => this._authenticationService.copilotToken);
        this._isInternal = this._copilotToken.map(t => !!(t?.isInternal));
        this._register((0, observable_1.autorunWithStore)((reader, store) => {
            const p = store.add(new virtualTextDocumentProvider_1.VirtualTextDocumentProvider('ccsettings'));
            const doc = p.createDocumentForUri(vscode_1.Uri.parse('ccsettings://root/schema.json'));
            const schema = this._getSchema(reader);
            doc.setContent(JSON.stringify(schema));
        }));
    }
    _getSchema(reader) {
        const props = {};
        if (!this._isInternal.read(reader)) {
            return {};
        }
        else {
            // JSON Schema only for internal users!
            for (const c of configurationService_1.globalConfigRegistry.configs.values()) {
                props[c.fullyQualifiedId] = { description: 'Recognized Advanced Setting.\nIgnore the warning "Unknown Configuration Setting", which cannot be surpressed.', ...(c.validator ? c.validator.toSchema() : {}) };
            }
            const schema = {
                type: "object",
                properties: props,
                patternProperties: {
                    "github\.copilot(\.chat)?\.advanced\..*": {
                        deprecated: true,
                        description: "Unknown advanced setting.\nIf you believe this is a supported setting, please file an issue so that it gets registered.",
                    }
                }
            };
            return schema;
        }
    }
};
exports.SettingsSchemaFeature = SettingsSchemaFeature;
exports.SettingsSchemaFeature = SettingsSchemaFeature = __decorate([
    __param(0, authentication_1.IAuthenticationService)
], SettingsSchemaFeature);
//# sourceMappingURL=settingsSchemaFeature.js.map