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
exports.CopilotDebugCommandHandle = void 0;
const l10n = __importStar(require("@vscode/l10n"));
const util = __importStar(require("util"));
class CopilotDebugCommandHandle {
    static { this.COPILOT_LABEL = 'Copilot'; }
    get ended() {
        return this.rpc.ended;
    }
    constructor(rpc) {
        this.rpc = rpc;
    }
    output(category, output) {
        return this.rpc.callMethod('output', { category, output });
    }
    exit(code, error) {
        return this.rpc.callMethod('exit', { code, error });
    }
    question(message, defaultValue, singleKey = false) {
        return this.rpc.callMethod('question', { message: withLabel('blue', CopilotDebugCommandHandle.COPILOT_LABEL, message), defaultValue, singleKey });
    }
    confirm(message, defaultValue) {
        return this.rpc.callMethod('confirm', { message: withLabel('blue', CopilotDebugCommandHandle.COPILOT_LABEL, message), defaultValue });
    }
    printLabel(color, message) {
        return this.output('stdout', withLabel(color, CopilotDebugCommandHandle.COPILOT_LABEL, message) + '\r\n');
    }
    printJson(data) {
        return this.output('stdout', (util.inspect(data, { colors: true }) + '\n').replaceAll('\n', '\r\n'));
    }
    getFollowupKeys(padStart) {
        const keys = ['enter', 'r', 's', 'v', 'q'].map(p => `${"\u001B[0m" /* Style.Reset */}${"\u001B[1m" /* Style.Bold */}${p}${"\u001B[0m" /* Style.Reset */}${"\u001B[2m" /* Style.Dim */}`);
        const loc = l10n.t('press {0} to re-run, {1} to regenerate, {2} to save config, {3} to view it, {4} to quit', ...keys);
        const str = ' '.repeat(padStart) + "\u001B[2m" /* Style.Dim */ + loc + "\u001B[0m" /* Style.Reset */ + '\r\n';
        return this.rpc.callMethod('question', { message: str, singleKey: true });
    }
}
exports.CopilotDebugCommandHandle = CopilotDebugCommandHandle;
// we know the user is running the program in a VS Code terminal, so we don't need
// to do the color support detection that we would normally need to handle.
function withLabel(color, label, message) {
    const colorCode = (color) => {
        switch (color) {
            case 'red':
                return "\u001B[31m" /* Style.Red */;
            case 'green':
                return "\u001B[32m" /* Style.Green */;
            case 'blue':
                return "\u001B[34m" /* Style.Blue */;
            case 'cyan':
                return "\u001B[36m" /* Style.Cyan */;
            default:
                return '';
        }
    };
    return `${"\u001B[1m" /* Style.Bold */}${"\u001B[7m" /* Style.Inverse */}${colorCode(color)} ${label} ${"\u001B[0m" /* Style.Reset */} ${colorCode(color)}${message}${"\u001B[0m" /* Style.Reset */}`;
}
//# sourceMappingURL=copilotDebugCommandHandle.js.map