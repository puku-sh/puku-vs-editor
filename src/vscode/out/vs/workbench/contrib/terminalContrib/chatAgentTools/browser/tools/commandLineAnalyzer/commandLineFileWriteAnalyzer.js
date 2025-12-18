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
                disclaimers.push(localize('runInTerminal.fileWriteBlockedDisclaimer', 'File write operations detected that cannot be auto approved: {0}', fileWritesList));
            }
            else {
                disclaimers.push(localize('runInTerminal.fileWriteDisclaimer', 'File write operations detected: {0}', fileWritesList));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZExpbmVGaWxlV3JpdGVBbmFseXplci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvcG9yaWRoaS9kZXZlbG9wbWVudC9wdWt1LXZzLWVkaXRvci9zcmMvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9jaGF0QWdlbnRUb29scy9icm93c2VyL3Rvb2xzL2NvbW1hbmRMaW5lQW5hbHl6ZXIvY29tbWFuZExpbmVGaWxlV3JpdGVBbmFseXplci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDM0UsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzlELE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDeEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ3ZELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHFFQUFxRSxDQUFDO0FBQzVHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBS3ZHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0scURBQXFELENBQUM7QUFFcEYsTUFBTSxVQUFVLEdBQUcsTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFDO0FBSWxDLElBQU0sNEJBQTRCLEdBQWxDLE1BQU0sNEJBQTZCLFNBQVEsVUFBVTtJQUMzRCxZQUNrQix3QkFBaUQsRUFDakQsSUFBbUQsRUFDNUIscUJBQTRDLEVBQ3BELGFBQTRCLEVBQ2pCLHdCQUFrRDtRQUU3RixLQUFLLEVBQUUsQ0FBQztRQU5TLDZCQUF3QixHQUF4Qix3QkFBd0IsQ0FBeUI7UUFDakQsU0FBSSxHQUFKLElB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