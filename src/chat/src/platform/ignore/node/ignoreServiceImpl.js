"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseIgnoreService = exports.COPILOT_IGNORE_FILE_NAME = void 0;
const cancellation_1 = require("../../../util/vs/base/common/cancellation");
const event_1 = require("../../../util/vs/base/common/event");
const uri_1 = require("../../../util/vs/base/common/uri");
const vscodeTypes_1 = require("../../../vscodeTypes");
const fileTypes_1 = require("../../filesystem/common/fileTypes");
const ignoreFile_1 = require("./ignoreFile");
const remoteContentExclusion_1 = require("./remoteContentExclusion");
exports.COPILOT_IGNORE_FILE_NAME = '.copilotignore';
class BaseIgnoreService {
    constructor(_gitService, _logService, _authService, _workspaceService, _capiClientService, searchService, fs) {
        this._gitService = _gitService;
        this._logService = _logService;
        this._authService = _authService;
        this._workspaceService = _workspaceService;
        this._capiClientService = _capiClientService;
        this.searchService = searchService;
        this.fs = fs;
        this._copilotIgnoreFiles = new ignoreFile_1.IgnoreFile();
        this._copilotIgnoreEnabled = false;
        this._onDidChangeCopilotIgnoreEnablement = new event_1.Emitter();
        this._disposables = [];
        this.onDidChangeCopilotIgnoreEnablement = this._onDidChangeCopilotIgnoreEnablement.event;
        this._disposables.push(this._onDidChangeCopilotIgnoreEnablement);
        this._disposables.push(this._authService.onDidAuthenticationChange(() => {
            const copilotIgnoreEnabled = this._authService.copilotToken?.isCopilotIgnoreEnabled() ?? false;
            if (this._copilotIgnoreEnabled !== copilotIgnoreEnabled) {
                this._onDidChangeCopilotIgnoreEnablement.fire(copilotIgnoreEnabled);
            }
            this._copilotIgnoreEnabled = copilotIgnoreEnabled;
            if (this._copilotIgnoreEnabled === false && this._remoteContentExclusions) {
                this._remoteContentExclusions.dispose();
                this._remoteContentExclusions = undefined;
            }
            if (this._copilotIgnoreEnabled === true && !this._remoteContentExclusions) {
                this._remoteContentExclusions = new remoteContentExclusion_1.RemoteContentExclusion(this._gitService, this._logService, this._authService, this._capiClientService, this.fs, this._workspaceService);
            }
        }));
    }
    dispose() {
        this._disposables.forEach(d => d.dispose());
        if (this._remoteContentExclusions) {
            this._remoteContentExclusions.dispose();
            this._remoteContentExclusions = undefined;
        }
        this._disposables = [];
    }
    get isEnabled() {
        return this._copilotIgnoreEnabled;
    }
    get isRegexExclusionsEnabled() {
        return this._remoteContentExclusions?.isRegexContextExclusionsEnabled ?? false;
    }
    async isCopilotIgnored(file, token) {
        let copilotIgnored = false;
        if (this._copilotIgnoreEnabled) {
            const localCopilotIgnored = this._copilotIgnoreFiles.isIgnored(file);
            copilotIgnored = localCopilotIgnored || await (this._remoteContentExclusions?.isIgnored(file, token) ?? false);
        }
        return copilotIgnored;
    }
    async asMinimatchPattern() {
        if (!this._copilotIgnoreEnabled) {
            return;
        }
        const all = [];
        const gitRepoRoots = (await this.searchService.findFiles('**/.git/HEAD', {
            useExcludeSettings: vscodeTypes_1.ExcludeSettingOptions.None,
        })).map(uri => uri_1.URI.joinPath(uri, '..', '..'));
        // Loads the repositories in prior to requesting the patterns so that they're "discovered" and available
        await this._remoteContentExclusions?.loadRepos(gitRepoRoots);
        all.push(await this._remoteContentExclusions?.asMinimatchPatterns() ?? []);
        all.push(this._copilotIgnoreFiles.asMinimatchPatterns());
        const allall = all.flat();
        if (allall.length === 0) {
            return undefined;
        }
        else if (allall.length === 1) {
            return allall[0];
        }
        else {
            return `{${allall.join(',')}}`;
        }
    }
    init() {
        this._init ??= (async () => {
            for (const folder of this._workspaceService.getWorkspaceFolders()) {
                await this.addWorkspace(folder);
            }
        })();
        return this._init;
    }
    trackIgnoreFile(workspaceRoot, ignoreFile, contents) {
        // Check if the ignore file is a copilotignore file
        if (ignoreFile.path.endsWith(exports.COPILOT_IGNORE_FILE_NAME)) {
            this._copilotIgnoreFiles.setIgnoreFile(workspaceRoot, ignoreFile, contents);
        }
        return;
    }
    removeIgnoreFile(ignoreFile) {
        // Check if the ignore file is a copilotignore file
        if (ignoreFile.path.endsWith(exports.COPILOT_IGNORE_FILE_NAME)) {
            this._copilotIgnoreFiles.removeIgnoreFile(ignoreFile);
        }
        return;
    }
    removeWorkspace(workspace) {
        this._copilotIgnoreFiles.removeWorkspace(workspace);
    }
    isIgnoreFile(fileUri) {
        // Check if the file is a copilotignore file
        if (fileUri.path.endsWith(exports.COPILOT_IGNORE_FILE_NAME)) {
            return true;
        }
        return false;
    }
    async addWorkspace(workspaceUri) {
        if (workspaceUri.scheme !== 'file') {
            return;
        }
        const files = await this.searchService.findFilesWithDefaultExcludes(new fileTypes_1.RelativePattern(workspaceUri, `${exports.COPILOT_IGNORE_FILE_NAME}`), undefined, cancellation_1.CancellationToken.None);
        for (const file of files) {
            const contents = (await this.fs.readFile(file)).toString();
            this.trackIgnoreFile(workspaceUri, file, contents);
        }
    }
}
exports.BaseIgnoreService = BaseIgnoreService;
//# sourceMappingURL=ignoreServiceImpl.js.map