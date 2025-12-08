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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const sinon = __importStar(require("sinon"));
const vscode_1 = require("vscode");
const workspaceServiceImpl_1 = require("../../../platform/workspace/vscode/workspaceServiceImpl");
const uri_1 = require("../../../util/vs/base/common/uri");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const services_1 = require("./services");
suite('extension text document manager', () => {
    test('no workspace folders by default', () => {
        const accessor = (0, services_1.createExtensionTestingServices)().createTestingAccessor();
        const instantiationService = accessor.get(instantiation_1.IInstantiationService);
        const manager = instantiationService.createInstance(workspaceServiceImpl_1.ExtensionTextDocumentManager);
        const folders = manager.getWorkspaceFolders();
        assert_1.default.deepStrictEqual(folders, []);
    });
    test('workspace folders', () => {
        const accessor = (0, services_1.createExtensionTestingServices)().createTestingAccessor();
        const instantiationService = accessor.get(instantiation_1.IInstantiationService);
        const manager = instantiationService.createInstance(workspaceServiceImpl_1.ExtensionTextDocumentManager);
        sinon.stub(vscode_1.workspace, 'workspaceFolders').value([
            {
                uri: uri_1.URI.file('/path/to/folder1'),
                name: 'folder1',
                index: 0,
            },
            {
                uri: uri_1.URI.file('/path/to/folder2'),
                name: 'folder2',
                index: 1,
            },
        ]);
        const folders = manager.getWorkspaceFolders();
        assert_1.default.deepStrictEqual(folders, [uri_1.URI.parse('file:///path/to/folder1'), uri_1.URI.parse('file:///path/to/folder2')]);
    });
});
//# sourceMappingURL=textDocumentManager.test.js.map