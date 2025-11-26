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
import { Disposable } from '../../../../../../../base/common/lifecycle.js';
import { URI } from '../../../../../../../base/common/uri.js';
import { win32, posix } from '../../../../../../../base/common/path.js';
import { localize } from '../../../../../../../nls.js';
import { IConfigurationService } from '../../../../../../../platform/configuration/common/configuration.js';
import { IWorkspaceContextService } from '../../../../../../../platform/workspace/common/workspace.js';
import { isString } from '../../../../../../../base/common/types.js';
import { ILabelService } from '../../../../../../../platform/label/common/label.js';
const nullDevice = Symbol('null device');
let CommandLineFileWriteAnalyzer = class CommandLineFileWriteAnalyzer extends Disposable {
    constructor(_treeSitterCommandParser, _log, _configurationService, _labelService, _workspaceContextService) {
        super();
        this._treeSitterCommandParser = _treeSitterCommandParser;
        this._log = _log;
        this._configurationService = _configurationService;
        this._labelService = _labelService;
        this._workspaceContextService = _workspaceContextService;
    }
    async analyze(options) {
        let fileWrites;
        try {
            fileWrites = await this._getFileWrites(options);
        }
        catch (e) {
            console.error(e);
            this._log('Failed to get file writes via grammar', options.treeSitterLanguage);
            return {
                isAutoApproveAllowed: false
            };
        }
        return this._getResult(options, fileWrites);
    }
    async _getFileWrites(options) {
        let fileWrites = [];
        const capturedFileWrites = (await this._treeSitterCommandParser.getFileWrites(options.treeSitterLanguage, options.commandLine))
            .map(this._mapNullDevice.bind(this, options));
        if (capturedFileWrites.length) {
            const cwd = options.cwd;
            if (cwd) {
                this._log('Detected cwd', cwd.toString());
                fileWrites = capturedFileWrites.map(e => {
                    if (e === nullDevice) {
                        return e;
                    }
                    const isAbsolute = options.os === 1 /* OperatingSystem.Windows */ ? win32.isAbsolute(e) : posix.isAbsolute(e);
                    if (isAbsolute) {
                        return URI.file(e);
                    }
                    else {
                        return URI.joinPath(cwd, e);
                    }
                });
            }
            else {
                this._log('Cwd could not be detected');
                fileWrites = capturedFileWrites;
            }
        }
        this._log('File writes detected', fileWrites.map(e => e.toString()));
        return fileWrites;
    }
    _mapNullDevice(options, rawFileWrite) {
        if (options.treeSitterLanguage === "powershell" /* TreeSitterCommandParserLanguage.PowerShell */) {
            return rawFileWrite === '$null'
                ? nullDevice
                : rawFileWrite;
        }
        return rawFileWrite === '/dev/null'
            ? nullDevice
            : rawFileWrite;
    }
    _getResult(options, fileWrites) {
        let isAutoApproveAllowed = true;
        if (fileWrites.length > 0) {
            const blockDetectedFileWrites = this._configurationService.getValue("chat.tools.terminal.blockDetectedFileWrites" /* TerminalChatAgentToolsSettingId.BlockDetectedFileWrites */);
            switch (blockDetectedFileWrites) {
                case 'all': {
                    isAutoApproveAllowed = false;
                    this._log('File writes blocked due to "all" setting');
                    break;
                }
                case 'outsideWorkspace': {
                    const workspaceFolders = this._workspaceContextService.getWorkspace().folders;
                    if (workspaceFolders.length > 0) {
                        for (const fileWrite of fileWrites) {
                            if (fileWrite === nullDevice) {
                                this._log('File write to null device allowed', URI.isUri(fileWrite) ? fileWrite.toString() : fileWrite);
                                continue;
                            }
                            if (isString(fileWrite)) {
                                const isAbsolute = options.os === 1 /* OperatingSystem.Windows */ ? win32.isAbsolute(fileWrite) : posix.isAbsolute(fileWrite);
                                if (!isAbsolute) {
                                    isAutoApproveAllowed = false;
                                    this._log('File write blocked due to unknown terminal cwd', fileWrite);
                                    break;
                                }
                            }
                            const fileUri = URI.isUri(fileWrite) ? fileWrite : URI.file(fileWrite);
                            // TODO: Handle command substitutions/complex destinations properly https://github.com/microsoft/vscode/issues/274167
                            // TODO: Handle environment variables properly https://github.com/microsoft/vscode/issues/274166
                            if (fileUri.fsPath.match(/[$\(\){}]/)) {
                                isAutoApproveAllowed = false;
                                this._log('File write blocked due to likely containing a variable', fileUri.toString());
                                break;
                            }
                            const isInsideWorkspace = workspaceFolders.some(folder => folder.uri.scheme === fileUri.scheme &&
                                (fileUri.path.startsWith(folder.uri.path + '/') || fileUri.path === folder.uri.path));
                            if (!isInsideWorkspace) {
                                isAutoApproveAllowed = false;
                                this._log('File write blocked outside workspace', fileUri.toString());
                                break;
                            }
                        }
                    }
                    else {
                        // No workspace folders, allow safe null device paths even without workspace
                        const hasOnlyNullDevices = fileWrites.every(fw => fw === nullDevice);
                        if (!hasOnlyNullDevices) {
                            isAutoApproveAllowed = false;
                            this._log('File writes blocked - no workspace folders');
                        }
                    }
                    break;
                }
                case 'never':
                default: {
                    break;
                }
            }
        }
        const disclaimers = [];
        if (fileWrites.length > 0) {
            const fileWritesList = fileWrites.map(fw => `\`${URI.isUri(fw) ? this._labelService.getUriLabel(fw) : fw === nullDevice ? '/dev/null' : fw.toString()}\``).join(', ');
            if (!isAutoApproveAllowed) {
                disclaimers.push(localize(13129, null, fileWritesList));
            }
            else {
                disclaimers.push(localize(13130, null, fileWritesList));
            }
        }
        return {
            isAutoApproveAllowed,
            disclaimers,
        };
    }
};
CommandLineFileWriteAnalyzer = __decorate([
    __param(2, IConfigurationService),
    __param(3, ILabelService),
    __param(4, IWorkspaceContextService)
], CommandLineFileWriteAnalyzer);
export { CommandLineFileWriteAnalyzer };
//# sourceMappingURL=commandLineFileWriteAnalyzer.js.map