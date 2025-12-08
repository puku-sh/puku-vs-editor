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
var ReleaseNotesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReleaseNotesService = void 0;
const vscodeVersion_1 = require("../../../util/common/vscodeVersion");
const envService_1 = require("../../env/common/envService");
const fetcherService_1 = require("../../networking/common/fetcherService");
let ReleaseNotesService = class ReleaseNotesService {
    static { ReleaseNotesService_1 = this; }
    static { this.BASE_URL = 'https://code.visualstudio.com/raw'; }
    constructor(envService, fetcherService) {
        this.envService = envService;
        this.fetcherService = fetcherService;
    }
    async fetchLatestReleaseNotes() {
        const url = this.getUrl();
        if (!url) {
            return;
        }
        const releaseNotes = await this.fetcherService.fetch(url, {
            method: 'GET',
        });
        const releaseNotesText = await releaseNotes.text();
        return releaseNotesText;
    }
    async fetchReleaseNotesForVersion(version) {
        const url = this.getUrl(version);
        if (!url) {
            return;
        }
        const releaseNotes = await this.fetcherService.fetch(url, {
            method: 'GET',
        });
        const releaseNotesText = await releaseNotes.text();
        return releaseNotesText;
    }
    getUrl(version) {
        // Build URL using MAJOR and MINOR only (no patch). VS Code does not have separate URLs per patch.
        const sourceVersion = (version && version.trim().length > 0)
            ? version.trim()
            : this.envService.getEditorInfo().version;
        let major;
        let minor;
        if (/^\d+\.\d+(?:\.\d+)?$/.test(sourceVersion)) {
            const sanitized = (0, vscodeVersion_1.sanitizeVSCodeVersion)(sourceVersion);
            const mm = /^(\d+)\.(\d+)$/.exec(sanitized);
            if (!mm) {
                return;
            }
            major = mm[1];
            minor = mm[2];
        }
        else {
            return;
        }
        return `${ReleaseNotesService_1.BASE_URL}/v${major}_${minor}.md`;
    }
};
exports.ReleaseNotesService = ReleaseNotesService;
exports.ReleaseNotesService = ReleaseNotesService = ReleaseNotesService_1 = __decorate([
    __param(0, envService_1.IEnvService),
    __param(1, fetcherService_1.IFetcherService)
], ReleaseNotesService);
//# sourceMappingURL=releaseNotesServiceImpl.js.map