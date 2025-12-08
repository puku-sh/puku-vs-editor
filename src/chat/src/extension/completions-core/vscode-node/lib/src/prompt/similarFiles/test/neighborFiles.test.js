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
const assert = __importStar(require("assert"));
const ignoreService_1 = require("../../../../../../../../platform/ignore/common/ignoreService");
const descriptors_1 = require("../../../../../../../../util/vs/platform/instantiation/common/descriptors");
const instantiation_1 = require("../../../../../../../../util/vs/platform/instantiation/common/instantiation");
const documentTracker_1 = require("../../../documentTracker");
const expConfig_1 = require("../../../experiments/expConfig");
const fileSystem_1 = require("../../../fileSystem");
const logger_1 = require("../../../logger");
const telemetry_1 = require("../../../telemetry");
const context_1 = require("../../../test/context");
const textDocument_1 = require("../../../test/textDocument");
const textDocumentManager_1 = require("../../../textDocumentManager");
const neighborFiles_1 = require("../neighborFiles");
const openTabFiles_1 = require("../openTabFiles");
const relatedFiles_1 = require("../relatedFiles");
const TIMEOUT = 1000;
const WKS_ROOTFOLDER = 'file:///test';
const FILE_A = 'file:///test/a.py';
const FILE_A_TEXT = '# file a';
const FILE_B = 'file:///test/b.py';
const FILE_B_TEXT = '# file b';
const FILE_C = 'file:///test/c.py';
const FILE_C_TEXT = '# file c';
const FILE_D = 'file:///test/d.py';
const FILE_D_TEXT = '# file d';
const FILE_E = 'file:///test/test2/e.py';
const FILE_E_TEXT = '# file e';
const FILE_F = 'file:///test/test2/f.py';
const FILE_F_TEXT = '# file f';
const FILE_G = 'file:///test/test3/test4/g.py';
const FILE_G_TEXT = '# file g';
const FILE_I = 'file:///test/test2/i.py';
const FILE_I_TEXT = '# file i';
const FILE_J = 'file:///test/test2/j.js';
const FILE_J_TEXT = '# file j';
const FILE_K = 'file:///test/test2/k.md';
const FILE_K_TEXT = '# file k';
const FILE_R = 'file:///test/test2/r.jsx';
const FILE_R_TEXT = '# file r';
const FILE_S = 'file:///test/test2/s.js';
const FILE_S_TEXT = '# file s';
const FILE_T = 'file:///test/test2/t.js';
const FILE_T_TEXT = '# file t';
const CURRENT_TIME_STAMP = Date.now();
const CURSOR_HISTORY_FOR_TEST = [
    { uri: FILE_C, offset: 0, timestamp: CURRENT_TIME_STAMP - 14, text: FILE_C_TEXT },
    { uri: FILE_C, offset: 0, timestamp: CURRENT_TIME_STAMP - 13, text: FILE_C_TEXT },
    { uri: FILE_C, offset: 0, timestamp: CURRENT_TIME_STAMP - 12, text: FILE_C_TEXT },
    { uri: FILE_A, offset: 0, timestamp: CURRENT_TIME_STAMP - 11, text: FILE_A_TEXT },
    { uri: FILE_D, offset: 0, timestamp: CURRENT_TIME_STAMP - 10, text: FILE_D_TEXT },
    { uri: FILE_D, offset: 0, timestamp: CURRENT_TIME_STAMP - 9, text: FILE_D_TEXT },
    { uri: FILE_D, offset: 0, timestamp: CURRENT_TIME_STAMP - 8, text: FILE_D_TEXT },
    { uri: FILE_D, offset: 0, timestamp: CURRENT_TIME_STAMP - 7, text: FILE_D_TEXT },
    { uri: FILE_A, offset: 0, timestamp: CURRENT_TIME_STAMP - 6, text: FILE_A_TEXT },
    { uri: FILE_C, offset: 0, timestamp: CURRENT_TIME_STAMP - 5, text: FILE_C_TEXT },
    { uri: FILE_B, offset: 0, timestamp: CURRENT_TIME_STAMP - 4, text: FILE_B_TEXT },
    { uri: FILE_B, offset: 0, timestamp: CURRENT_TIME_STAMP - 3, text: FILE_B_TEXT },
    { uri: FILE_B, offset: 0, timestamp: CURRENT_TIME_STAMP - 2, text: FILE_B_TEXT },
    { uri: FILE_J, offset: 0, timestamp: CURRENT_TIME_STAMP - 1, text: FILE_J_TEXT },
    { uri: FILE_A, offset: 0, timestamp: CURRENT_TIME_STAMP, text: FILE_A_TEXT },
];
const OPEN_FILES_FOR_TEST = [
    { uri: FILE_T, timestamp: CURRENT_TIME_STAMP - 7, text: FILE_T_TEXT, language: 'javascript' },
    { uri: FILE_D, timestamp: CURRENT_TIME_STAMP - 6, text: FILE_D_TEXT, language: 'python' },
    { uri: FILE_R, timestamp: CURRENT_TIME_STAMP - 3, text: FILE_R_TEXT, language: 'javascriptreact' },
    { uri: FILE_C, timestamp: CURRENT_TIME_STAMP - 4, text: FILE_C_TEXT, language: 'python' },
    { uri: FILE_J, timestamp: CURRENT_TIME_STAMP - 3, text: FILE_J_TEXT, language: 'javascript' },
    { uri: FILE_K, timestamp: CURRENT_TIME_STAMP - 2, text: FILE_K_TEXT, language: 'markdown' },
    { uri: FILE_B, timestamp: CURRENT_TIME_STAMP - 1, text: FILE_B_TEXT, language: 'python' },
    { uri: FILE_A, timestamp: CURRENT_TIME_STAMP, text: FILE_A_TEXT, language: 'python' },
];
const WORKSPACE_FILES_FOR_TEST = [
    { uri: FILE_E, text: FILE_E_TEXT, language: 'python' },
    { uri: FILE_D, text: FILE_D_TEXT, language: 'python' },
    { uri: FILE_F, text: FILE_F_TEXT, language: 'python' },
    { uri: FILE_G, text: FILE_G_TEXT, language: 'python' },
    { uri: FILE_I, text: FILE_I_TEXT, language: 'python' },
    { uri: FILE_J, text: FILE_J_TEXT, language: 'javascript' },
    { uri: FILE_K, text: FILE_K_TEXT, language: 'markdown' },
    { uri: FILE_S, text: FILE_S_TEXT, language: 'javascript' },
    { uri: FILE_T, text: FILE_T_TEXT, language: 'javascript' },
];
const CURRENT_FILE = CURSOR_HISTORY_FOR_TEST[CURSOR_HISTORY_FOR_TEST.length - 1].uri;
const MAX_NUM_NEIGHBORING_FILES = 20;
const DEFAULT_FILE_LANGUAGE = 'python';
suite('neighbor files tests', function () {
    this.timeout(TIMEOUT);
    const accessor = (0, context_1.createLibTestingContext)().createTestingAccessor();
    const tdm = accessor.get(textDocumentManager_1.ICompletionsTextDocumentManagerService);
    const workspaceTextDocumentManager = accessor.get(instantiation_1.IInstantiationService).createInstance(textDocument_1.TestTextDocumentManager);
    for (const file of WORKSPACE_FILES_FOR_TEST) {
        workspaceTextDocumentManager.setDiskContents(file.uri, file.text);
    }
    workspaceTextDocumentManager.setTextDocument(FILE_I, DEFAULT_FILE_LANGUAGE, FILE_I_TEXT);
    for (const file of OPEN_FILES_FOR_TEST) {
        tdm.setTextDocument(file.uri, file.language, file.text);
    }
    setup(() => {
        documentTracker_1.accessTimes.clear();
        for (const file of OPEN_FILES_FOR_TEST) {
            documentTracker_1.accessTimes.set(file.uri, file.timestamp);
        }
    });
    test('Test open files', async function () {
        const at = documentTracker_1.accessTimes;
        console.log('Access times:', at);
        const ns = new openTabFiles_1.OpenTabFiles(tdm);
        const { docs, neighborSource } = await ns.getNeighborFiles(CURRENT_FILE, DEFAULT_FILE_LANGUAGE, MAX_NUM_NEIGHBORING_FILES);
        assert.strictEqual(docs.size, 3);
        assert.strictEqual(docs.has(FILE_B), true);
        assert.strictEqual(docs.has(FILE_C), true);
        assert.strictEqual(docs.has(FILE_D), true);
        assert.strictEqual(neighborSource.has(neighborFiles_1.NeighboringFileType.CursorMostCount), false);
        assert.strictEqual(neighborSource.has(neighborFiles_1.NeighboringFileType.CursorMostRecent), false);
        assert.strictEqual(neighborSource.has(neighborFiles_1.NeighboringFileType.OpenTabs), true);
        assert.strictEqual(neighborSource.get(neighborFiles_1.NeighboringFileType.OpenTabs)?.length, 3);
        assert.strictEqual(neighborSource.get(neighborFiles_1.NeighboringFileType.OpenTabs)?.shift(), FILE_B);
        assert.strictEqual(neighborSource.get(neighborFiles_1.NeighboringFileType.OpenTabs)?.shift(), FILE_C);
        assert.strictEqual(neighborSource.get(neighborFiles_1.NeighboringFileType.OpenTabs)?.shift(), FILE_D);
    });
    test('Test open files file limit', async function () {
        const ns = new openTabFiles_1.OpenTabFiles(tdm);
        const { docs } = await ns.getNeighborFiles(CURRENT_FILE, DEFAULT_FILE_LANGUAGE, /* maxNumNeighborFiles */ 1);
        assert.strictEqual(docs.size, 1);
    });
    test('Include neighboring files for aliased languages', async function () {
        const ns = new openTabFiles_1.OpenTabFiles(tdm);
        const { docs } = await ns.getNeighborFiles(CURRENT_FILE, 'javascript', MAX_NUM_NEIGHBORING_FILES);
        assert.ok(docs.has(FILE_J));
        assert.ok(docs.has(FILE_R));
    });
});
suite('NeighborSource.getRelativePath tests', function () {
    test('should return the relative path', function () {
        const file = 'file:/path/to/file.txt';
        const base = 'file:/path/to';
        const relativePath = neighborFiles_1.NeighborSource.getRelativePath(file, base);
        assert.strictEqual(relativePath, 'file.txt');
        const sshFile = 'ssh://path/to/file.txt';
        const sshBase = 'ssh:';
        const relativeSshPath = neighborFiles_1.NeighborSource.getRelativePath(sshFile, sshBase);
        assert.strictEqual(relativeSshPath, '/path/to/file.txt');
    });
    test('should return the basename of the file if not related to the basePath (and should not add ".." to the path either)', function () {
        {
            const file = 'gopher:/path/to/file.txt';
            const base = 'https://path/to';
            const relativePath = neighborFiles_1.NeighborSource.getRelativePath(file, base);
            assert.strictEqual(relativePath, 'file.txt');
        }
        {
            const file = 'file:/path/to/file.txt';
            const base = 'file://path/to/sibling';
            const relativePath = neighborFiles_1.NeighborSource.getRelativePath(file, base);
            assert.strictEqual(relativePath, 'file.txt');
            const relativePath2 = neighborFiles_1.NeighborSource.getRelativePath(base, file);
            assert.strictEqual(relativePath2, 'sibling');
        }
        {
            const file = '';
            const base = 'file:///';
            const relativePath = neighborFiles_1.NeighborSource.getRelativePath(file, base);
            assert.strictEqual(relativePath, '');
        }
        {
            const file = '';
            const base = '';
            const relativePath = neighborFiles_1.NeighborSource.getRelativePath(file, base);
            assert.strictEqual(relativePath, '');
        }
    });
});
suite('Neighbor files exclusion tests', function () {
    let MockedRelatedFilesProvider = class MockedRelatedFilesProvider extends relatedFiles_1.RelatedFilesProvider {
        constructor(relatedFiles, traits = [{ name: 'testTraitName', value: 'testTraitValue' }], instantiationService, ignoreService, logTarget, fileSystemService) {
            super(instantiationService, ignoreService, logTarget, fileSystemService);
            this.relatedFiles = relatedFiles;
            this.traits = traits;
        }
        async getRelatedFilesResponse(docInfo, telemetryData) {
            return Promise.resolve({
                entries: this.relatedFiles,
                traits: this.traits,
            });
        }
        getFileContent(uri) {
            // we are not asserting on file content, so just return a dummy text
            return Promise.resolve('dummy text');
        }
    };
    MockedRelatedFilesProvider = __decorate([
        __param(2, instantiation_1.IInstantiationService),
        __param(3, ignoreService_1.IIgnoreService),
        __param(4, logger_1.ICompletionsLogTargetService),
        __param(5, fileSystem_1.ICompletionsFileSystemService)
    ], MockedRelatedFilesProvider);
    const serviceCollection = (0, context_1.createLibTestingContext)();
    serviceCollection.define(relatedFiles_1.ICompletionsRelatedFilesProviderService, new descriptors_1.SyncDescriptor(MockedRelatedFilesProvider, [[], [{ name: 'testTraitName', value: 'testTraitValue' }]]));
    const accessor = serviceCollection.createTestingAccessor();
    const tdm = accessor.get(textDocumentManager_1.ICompletionsTextDocumentManagerService);
    tdm.init([{ uri: WKS_ROOTFOLDER }]);
    for (const file of OPEN_FILES_FOR_TEST) {
        documentTracker_1.accessTimes.set(file.uri, file.timestamp);
    }
    const workspaceTextDocumentManager = accessor.get(instantiation_1.IInstantiationService).createInstance(textDocument_1.TestTextDocumentManager);
    for (const file of WORKSPACE_FILES_FOR_TEST) {
        workspaceTextDocumentManager.setDiskContents(file.uri, file.text);
    }
    workspaceTextDocumentManager.setTextDocument(FILE_I, DEFAULT_FILE_LANGUAGE, FILE_I_TEXT);
    for (const file of OPEN_FILES_FOR_TEST) {
        tdm.setTextDocument(file.uri, file.language, file.text);
    }
    test('Test with related files excluded', async function () {
        neighborFiles_1.NeighborSource.reset();
        const telemetryWithExp = telemetry_1.TelemetryWithExp.createEmptyConfigForTesting();
        telemetryWithExp.filtersAndExp.exp.variables[expConfig_1.ExpTreatmentVariables.ExcludeRelatedFiles] = true;
        const { docs, neighborSource, traits } = await neighborFiles_1.NeighborSource.getNeighborFilesAndTraits(accessor, FILE_J, 'javascript', telemetryWithExp, undefined, undefined, true);
        assert.strictEqual(docs.size, 2);
        assert.strictEqual(docs.has(FILE_T), true);
        assert.strictEqual(docs.has(FILE_R), true);
        assert.strictEqual(neighborSource.size, 1);
        assert.strictEqual(neighborSource.has(neighborFiles_1.NeighboringFileType.OpenTabs), true);
        assert.strictEqual(neighborSource.get(neighborFiles_1.NeighboringFileType.OpenTabs)?.length, 2);
        assert.strictEqual(neighborSource.get(neighborFiles_1.NeighboringFileType.OpenTabs)?.shift(), FILE_R);
        assert.strictEqual(neighborSource.get(neighborFiles_1.NeighboringFileType.OpenTabs)?.shift(), FILE_T);
        assert.strictEqual(traits.length, 0);
    });
});
//# sourceMappingURL=neighborFiles.test.js.map