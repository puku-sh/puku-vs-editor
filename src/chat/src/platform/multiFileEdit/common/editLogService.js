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
exports.EditLogService = exports.IEditLogService = void 0;
const services_1 = require("../../../util/common/services");
const buffer_1 = require("../../../util/vs/base/common/buffer");
const uri_1 = require("../../../util/vs/base/common/uri");
const configurationService_1 = require("../../configuration/common/configurationService");
const extensionContext_1 = require("../../extContext/common/extensionContext");
const fileSystemService_1 = require("../../filesystem/common/fileSystemService");
const logService_1 = require("../../log/common/logService");
exports.IEditLogService = (0, services_1.createServiceIdentifier)('IEditLogService');
let EditLogService = class EditLogService {
    constructor(_vscodeExtensionContext, _fileSystemService, _configurationService, _logService) {
        this._vscodeExtensionContext = _vscodeExtensionContext;
        this._fileSystemService = _fileSystemService;
        this._configurationService = _configurationService;
        this._logService = _logService;
        this.LOG_DIR = uri_1.URI.joinPath(this._vscodeExtensionContext.globalStorageUri, 'editRecordings');
        this._edits = new Map();
    }
    _isEnabled() {
        return this._configurationService.getConfig(configurationService_1.ConfigKey.AdvancedExperimental.EditRecordingEnabled);
    }
    logEditChatRequest(turnId, prompt, response) {
        if (!this._isEnabled()) {
            return;
        }
        const entry = this._edits.get(turnId) ?? { prompt, response, edits: [] };
        entry.prompt = prompt;
        entry.response = response;
        this._edits.set(turnId, entry);
    }
    logSpeculationRequest(turnId, uri, prompt, originalContent, editedContent) {
        if (!this._isEnabled()) {
            return;
        }
        const entry = this._edits.get(turnId) ?? { prompt: [], response: '', edits: [] };
        entry.edits.push({
            uri: uri.toString(),
            prompt,
            originalContent,
            editedContent,
        });
        this._edits.set(turnId, entry);
    }
    async getEditLog(turnId) {
        if (!this._isEnabled()) {
            return;
        }
        try {
            const data = await this._fileSystemService.readFile(uri_1.URI.joinPath(this.LOG_DIR, `${turnId}.json`));
            const log = JSON.parse(data.toString());
            return log.edits.map((edit) => ({ prompt: edit.prompt, response: edit.editedContent }));
        }
        catch { }
    }
    async markCompleted(turnId, outcome) {
        if (!this._isEnabled()) {
            return;
        }
        const edit = this._edits.get(turnId);
        if (!edit) {
            // No edit happened in this turn
            return;
        }
        if (edit.edits.length) {
            const path = uri_1.URI.joinPath(this.LOG_DIR, `${turnId}.json`);
            this._logService.debug(`Edit recording: ${path.toString()}`);
            await this._fileSystemService.writeFile(path, buffer_1.VSBuffer.fromString(JSON.stringify(edit, undefined, 4)).buffer);
        }
        this._edits.delete(turnId);
    }
};
exports.EditLogService = EditLogService;
exports.EditLogService = EditLogService = __decorate([
    __param(0, extensionContext_1.IVSCodeExtensionContext),
    __param(1, fileSystemService_1.IFileSystemService),
    __param(2, configurationService_1.IConfigurationService),
    __param(3, logService_1.ILogService)
], EditLogService);
//# sourceMappingURL=editLogService.js.map