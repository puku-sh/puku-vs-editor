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
exports.TestFileFinder = exports.suffix2Language = void 0;
exports.isTestFile = isTestFile;
exports.suggestTestFileBasename = suggestTestFileBasename;
exports.suggestTestFileDir = suggestTestFileDir;
exports.suggestUntitledTestFileLocation = suggestUntitledTestFileLocation;
const textDocumentSnapshot_1 = require("../../../platform/editing/common/textDocumentSnapshot");
const searchService_1 = require("../../../platform/search/common/searchService");
const tabsAndEditorsService_1 = require("../../../platform/tabs/common/tabsAndEditorsService");
const glob_1 = require("../../../util/common/glob");
const network_1 = require("../../../util/vs/base/common/network");
const resources = __importStar(require("../../../util/vs/base/common/resources"));
const uri_1 = require("../../../util/vs/base/common/uri");
const nullTestHint = {
    location: 'sameFolder',
    prefix: 'test_',
    suffixes: ['.test', '.spec', '_test', 'Test', '_spec', '_test', 'Tests', '.Tests', 'Spec'],
};
const testHintsByLanguage = {
    csharp: { suffixes: ['Test'], location: 'testFolder' },
    dart: { suffixes: ['_test'], location: 'testFolder' },
    go: { suffixes: ['_test'], location: 'sameFolder' },
    java: { suffixes: ['Test'], location: 'testFolder' },
    javascript: { suffixes: ['.test', '.spec'], location: 'sameFolder' },
    javascriptreact: { suffixes: ['.test', '.spec'], location: 'sameFolder' },
    kotlin: { suffixes: ['Test'], location: 'testFolder' },
    php: { suffixes: ['Test'], location: 'testFolder' },
    powershell: { suffixes: ['.Tests'], location: 'testFolder' },
    python: { prefix: 'test_', suffixes: ['_test'], location: 'testFolder' },
    ruby: { suffixes: ['_test', '_spec'], location: 'testFolder' },
    rust: { suffixes: [''], location: 'testFolder' }, // same file`
    swift: { suffixes: ['Tests'], location: 'testFolder' },
    typescript: { suffixes: ['.test', '.spec'], location: 'sameFolder' },
    typescriptreact: { suffixes: ['.test', '.spec'], location: 'sameFolder' },
};
exports.suffix2Language = {
    cs: 'csharp',
    dart: 'dart',
    go: 'go',
    java: 'java',
    js: 'javascriptreact',
    kt: 'kotlin',
    php: 'php',
    ps1: 'powershell',
    py: 'python',
    rb: 'ruby',
    rs: 'rust',
    swift: 'swift',
    ts: 'typescript',
    tsx: 'typescriptreact',
};
const testHintsBySuffix = (function () {
    const result = {};
    for (const [suffix, langId] of Object.entries(exports.suffix2Language)) {
        result[suffix] = testHintsByLanguage[langId];
    }
    return result;
})();
/**
 * @remark does NOT respect copilot-ignore
 */
let TestFileFinder = class TestFileFinder {
    constructor(_search, _tabs) {
        this._search = _search;
        this._tabs = _tabs;
    }
    _findTabMatchingPattern(pattern) {
        const tab = this._tabs.tabs.find(info => {
            // return a tab which uri matches the pattern
            return info.uri && info.uri.scheme !== network_1.Schemas.untitled && (0, glob_1.isMatch)(info.uri, pattern);
        });
        return tab?.uri;
    }
    /**
     * Given a source file, find the corresponding test file.
     */
    async findTestFileForSourceFile(document, token) {
        if (document.isUntitled) {
            return undefined;
        }
        const basename = resources.basename(document.uri);
        const ext = resources.extname(document.uri);
        const testHint = testHintsByLanguage[document.languageId] ?? nullTestHint;
        const testNameCandidates = [];
        if (testHint.prefix) {
            testNameCandidates.push(testHint.prefix + basename);
        }
        if (testHint.suffixes) {
            for (const suffix of testHint.suffixes ?? []) {
                const testName = basename.replace(`${ext}`, `${suffix}${ext}`);
                testNameCandidates.push(testName);
            }
        }
        const pattern = testNameCandidates.length === 1
            ? `**/${testNameCandidates[0]}` // @ulugbekna: there must be at least two sub-patterns within braces for the glob to work
            : `**/{${testNameCandidates.join(',')}}`;
        // try open editors/tabs first
        // use search service as fallback
        let result = this._findTabMatchingPattern(pattern);
        if (!result) {
            if (document.languageId === 'python') {
                result = await this._search.findFilesWithExcludes(pattern, '**/*.pyc', 1, token);
            }
            else {
                result = await this._search.findFilesWithDefaultExcludes(pattern, 1, token);
            }
        }
        return result;
    }
    /**
     * Given a source file, find any test file (for the same language)
     */
    async findAnyTestFileForSourceFile(document, token) {
        const testHint = testHintsByLanguage[document.languageId] ?? nullTestHint;
        const patterns = [];
        if (testHint.prefix) {
            patterns.push(`${testHint.prefix}*`);
        }
        if (testHint.suffixes) {
            const ext = resources.extname(document.uri);
            for (const suffix of testHint.suffixes ?? []) {
                patterns.push(`*${suffix}${ext}`);
            }
        }
        const pattern = patterns.length === 1
            ? `**/${patterns[0]}` // @ulugbekna: there must be at least two sub-patterns within braces for the glob to work
            : `**/{${patterns.join(',')}}`;
        // try open editors/tabs first
        // use search service as fallback
        let result = this._findTabMatchingPattern(pattern);
        if (!result) {
            if (document.languageId === 'python') {
                result = await this._search.findFilesWithExcludes(pattern, '**/*.pyc', 1, token);
            }
            else {
                result = await this._search.findFilesWithDefaultExcludes(pattern, 1, token);
            }
        }
        return result;
    }
    /**
     * Given a test file, find the corresponding source file.
     */
    async findFileForTestFile(document, token) {
        const testHint = testHintsByLanguage[document.languageId] ?? nullTestHint;
        const basename = resources.basename(document.uri);
        const parts = [];
        // collect potential suffixes and prefixes
        if (testHint.suffixes) {
            parts.splice(0, 0, ...testHint.suffixes);
        }
        if (testHint.prefix) {
            parts.splice(0, 0, testHint.prefix);
        }
        for (const part of parts) {
            const candidate = basename.replace(part, '');
            if (candidate !== basename) {
                const pattern = `**/${candidate}`;
                let result = this._findTabMatchingPattern(pattern);
                if (!result) {
                    result = await this._search.findFilesWithDefaultExcludes(pattern, 1, token);
                }
                if (result) {
                    return result;
                }
            }
        }
        return undefined;
    }
};
exports.TestFileFinder = TestFileFinder;
exports.TestFileFinder = TestFileFinder = __decorate([
    __param(0, searchService_1.ISearchService),
    __param(1, tabsAndEditorsService_1.ITabsAndEditorsService)
], TestFileFinder);
function isTestFile(candidate) {
    let testHint;
    if (candidate instanceof textDocumentSnapshot_1.TextDocumentSnapshot) {
        testHint = testHintsByLanguage[candidate.languageId];
        candidate = candidate.uri;
    }
    const sourceFileName = resources.basename(candidate);
    const sourceFileExtension = resources.extname(candidate);
    testHint ??= testHintsBySuffix[sourceFileExtension.replace('.', '')];
    if (testHint) {
        if (testHint.suffixes) {
            const foundSuffixMatch = testHint.suffixes.some(suffix => sourceFileName.endsWith(suffix + sourceFileExtension));
            if (foundSuffixMatch) {
                return true;
            }
        }
        if (testHint.prefix && sourceFileName.startsWith(testHint.prefix)) {
            return true;
        }
    }
    else {
        const foundSuffixMatch = nullTestHint.suffixes.some(suffix => sourceFileName.endsWith(suffix + sourceFileExtension));
        if (foundSuffixMatch) {
            return true;
        }
        if (sourceFileName.startsWith(nullTestHint.prefix)) {
            return true;
        }
    }
    return false;
}
function suggestTestFileBasename(document) {
    const testHint = testHintsByLanguage[document.languageId] ?? nullTestHint;
    const basename = resources.basename(document.uri);
    if (testHint.prefix) {
        return testHint.prefix + basename;
    }
    const ext = resources.extname(document.uri);
    const suffix = testHint.suffixes && testHint.suffixes.length > 0
        ? testHint.suffixes[0]
        : '.test';
    return basename.replace(`${ext}`, `${suffix}${ext}`);
}
function suggestTestFileDir(document) {
    const srcFileLocation = resources.joinPath(document.uri, '..'); // same folder
    if (document.languageId === 'java') { // Java
        /*
         * According to the standard project structure of Maven, the corresponding test file for
         * `$module/src/main/java/...$packages/$Class.java` is usually `$module/src/test/java/...$packages/${Class}Test.java`.
         * Yet, it's worth noting that this structure might be altered by the user (though it's rare). In such cases, we can
         * only obtain the accurate path from a language extension installed by the user, like `redhat.java`, for instance. But
         * for simplicity's sake, we always assume the user is sticking to the standard project structure mentioned above at
         * this stage.
         */
        const srcFilePath = srcFileLocation.path;
        if (srcFilePath.includes("/src/main/")) {
            const testFilePath = srcFilePath.replace('/src/main/', '/src/test/');
            return srcFileLocation.with({ path: testFilePath });
        }
    }
    return srcFileLocation; // same folder
}
function suggestUntitledTestFileLocation(document) {
    const newBasename = suggestTestFileBasename(document);
    const newLocation = suggestTestFileDir(document);
    const testFileUri = uri_1.URI.joinPath(newLocation, newBasename).with({ scheme: network_1.Schemas.untitled });
    return testFileUri;
}
//# sourceMappingURL=testFiles.js.map