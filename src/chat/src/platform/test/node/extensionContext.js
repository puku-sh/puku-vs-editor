"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockExtensionContext = void 0;
exports.constructGlobalStateMemento = constructGlobalStateMemento;
const fs_1 = require("fs");
const enums_1 = require("../../../util/common/test/shims/enums");
const path_1 = require("../../../util/vs/base/common/path");
const uri_1 = require("../../../util/vs/base/common/uri");
function constructGlobalStateMemento(globalStatePath) {
    // Check if the JSON file at globalStatePath exists, if not create it
    if (!(0, fs_1.existsSync)(globalStatePath)) {
        (0, fs_1.mkdirSync)((0, path_1.dirname)(globalStatePath), { recursive: true });
        (0, fs_1.writeFileSync)(globalStatePath, '{}', 'utf8');
    }
    return {
        get: (key, defaultValue) => {
            const globalState = JSON.parse((0, fs_1.readFileSync)(globalStatePath, 'utf8'));
            return globalState[key] ?? defaultValue;
        },
        keys: () => {
            const globalState = JSON.parse((0, fs_1.readFileSync)(globalStatePath, 'utf8'));
            return Object.keys(globalState);
        },
        update: (key, value) => {
            const globalState = JSON.parse((0, fs_1.readFileSync)(globalStatePath, 'utf8'));
            globalState[key] = value;
            (0, fs_1.writeFileSync)(globalStatePath, JSON.stringify(globalState), 'utf8');
            return Promise.resolve();
        }
    };
}
function createInMemoryMemento() {
    const state = new Map();
    return {
        get: (key, defaultValue) => {
            return state.get(key) ?? defaultValue;
        },
        keys: () => {
            return Object.keys(state);
        },
        update: (key, value) => {
            state.set(key, value);
            return Promise.resolve();
        }
    };
}
function constructGlobalStoragePath(globalStoragePath) {
    if (!(0, fs_1.existsSync)(globalStoragePath)) {
        // Create the folder if it doesn't exist
        (0, fs_1.mkdirSync)(globalStoragePath, { recursive: true });
    }
    return uri_1.URI.file(globalStoragePath);
}
class MockExtensionContext {
    constructor(globalStoragePath, globalState = createInMemoryMemento()) {
        this.globalState = globalState;
        this._serviceBrand = undefined;
        this.extension = { id: 'GitHub.copilot-chat' };
        this.extensionMode = enums_1.ExtensionMode.Test;
        this.subscriptions = [];
        this.workspaceState = createInMemoryMemento();
        this.globalStorageUri = globalStoragePath ? constructGlobalStoragePath(globalStoragePath) : undefined;
    }
}
exports.MockExtensionContext = MockExtensionContext;
//# sourceMappingURL=extensionContext.js.map