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
exports.GitExtensionServiceImpl = void 0;
const vscode = __importStar(require("vscode"));
const logService_1 = require("../../log/common/logService");
let GitExtensionServiceImpl = class GitExtensionServiceImpl {
    getExtensionApi() {
        return this._api;
    }
    constructor(_logService) {
        this._logService = _logService;
        this._onDidChange = new vscode.EventEmitter();
        this.onDidChange = this._onDidChange.event;
        this._extensionEnablement = undefined;
        this._disposables = [];
        this._logService.info('[GitExtensionServiceImpl] Initializing Git extension service.');
        this._disposables.push(...this._initializeExtensionApi());
    }
    get extensionAvailable() {
        if (this._extensionEnablement === undefined) {
            return !!vscode.extensions.getExtension('vscode.git');
        }
        else {
            return this._extensionEnablement;
        }
    }
    _initializeExtensionApi() {
        const disposables = [];
        let gitExtension = vscode.extensions.getExtension('vscode.git');
        const initialize = async () => {
            let extension;
            try {
                extension = await gitExtension.activate();
                this._logService.info('[GitExtensionServiceImpl] Successfully activated the vscode.git extension.');
            }
            catch (e) {
                this._logService.error(e, '[GitExtensionServiceImpl] Failed to activate the vscode.git extension.');
                return;
            }
            const onDidChangeGitExtensionEnablement = (enabled) => {
                this._logService.info(`[GitExtensionServiceImpl] Enablement state of the vscode.git extension: ${enabled}.`);
                this._extensionEnablement = enabled;
                if (enabled) {
                    this._api = extension.getAPI(1);
                    this._onDidChange.fire({ enabled: true });
                    this._logService.info('[GitExtensionServiceImpl] Successfully registered Git commit message provider.');
                }
                else {
                    this._api = undefined;
                    this._onDidChange.fire({ enabled: false });
                }
            };
            disposables.push(extension.onDidChangeEnablement(onDidChangeGitExtensionEnablement));
            onDidChangeGitExtensionEnablement(extension.enabled);
        };
        if (gitExtension) {
            initialize();
        }
        else {
            this._logService.info('[GitExtensionServiceImpl] vscode.git extension is not yet activated.');
            const listener = vscode.extensions.onDidChange(() => {
                if (!gitExtension && vscode.extensions.getExtension('vscode.git')) {
                    gitExtension = vscode.extensions.getExtension('vscode.git');
                    initialize();
                    listener.dispose();
                }
            });
        }
        return disposables;
    }
};
exports.GitExtensionServiceImpl = GitExtensionServiceImpl;
exports.GitExtensionServiceImpl = GitExtensionServiceImpl = __decorate([
    __param(0, logService_1.ILogService)
], GitExtensionServiceImpl);
//# sourceMappingURL=gitExtensionServiceImpl.js.map