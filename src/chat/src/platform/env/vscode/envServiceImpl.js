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
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvServiceImpl = void 0;
const vscode = __importStar(require("vscode"));
const platform_1 = require("../../../util/vs/base/common/platform");
const envService_1 = require("../common/envService");
const packagejson_1 = require("../common/packagejson");
class EnvServiceImpl {
    get extensionId() {
        return `${packagejson_1.packageJson.publisher}.${packagejson_1.packageJson.name}`.toLowerCase();
    }
    get sessionId() {
        return vscode.env.sessionId;
    }
    get machineId() {
        return vscode.env.machineId;
    }
    get devDeviceId() {
        return vscode.env.devDeviceId;
    }
    get vscodeVersion() {
        return vscode.version;
    }
    get remoteName() {
        return vscode.env.remoteName;
    }
    get uiKind() {
        switch (vscode.env.uiKind) {
            case vscode.UIKind.Desktop: return 'desktop';
            case vscode.UIKind.Web: return 'web';
        }
    }
    get isActive() {
        return vscode.window.state.active;
    }
    get OS() {
        switch (platform_1.platform) {
            case 3 /* Platform.Windows */:
                return envService_1.OperatingSystem.Windows;
            case 1 /* Platform.Mac */:
                return envService_1.OperatingSystem.Macintosh;
            case 2 /* Platform.Linux */:
                return envService_1.OperatingSystem.Linux;
            default:
                return envService_1.OperatingSystem.Linux;
        }
    }
    get language() {
        return vscode.env.language;
    }
    get uriScheme() {
        return vscode.env.uriScheme;
    }
    get appRoot() {
        return vscode.env.appRoot;
    }
    get shell() {
        return vscode.env.shell;
    }
    isProduction() {
        return packagejson_1.isProduction;
    }
    isPreRelease() {
        return packagejson_1.isPreRelease;
    }
    isSimulation() {
        return false;
    }
    getBuildType() {
        return packagejson_1.packageJson.buildType;
    }
    getVersion() {
        return packagejson_1.packageJson.version;
    }
    getBuild() {
        return packagejson_1.packageJson.build;
    }
    getName() {
        return packagejson_1.packageJson.name;
    }
    getEditorInfo() {
        return new envService_1.NameAndVersion('vscode', vscode.version);
    }
    getEditorPluginInfo() {
        return new envService_1.NameAndVersion('copilot-chat', packagejson_1.packageJson.version);
    }
    openExternal(target) {
        return new Promise((resolve, reject) => vscode.env.openExternal(target).then(resolve, reject));
    }
}
exports.EnvServiceImpl = EnvServiceImpl;
//# sourceMappingURL=envServiceImpl.js.map