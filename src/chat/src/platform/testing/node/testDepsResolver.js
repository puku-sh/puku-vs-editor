"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestDepsResolver = exports.ITestDepsResolver = void 0;
const services_1 = require("../../../util/common/services");
const vscodeTypes_1 = require("../../../vscodeTypes");
const fileSystemService_1 = require("../../filesystem/common/fileSystemService");
const searchService_1 = require("../../search/common/searchService");
exports.ITestDepsResolver = (0, services_1.createServiceIdentifier)('ITestDepsResolver');
let TestDepsResolver = class TestDepsResolver {
    constructor(_searchService, _fileSystemService) {
        this._searchService = _searchService;
        this._fileSystemService = _fileSystemService;
        this._perLanguageTestDepsFinder = new Map();
        this._cachedResults = new Map();
        this._textDecoder = new TextDecoder();
    }
    async getTestDeps(languageId) {
        const cachedResult = this._cachedResults.get(languageId);
        if (cachedResult !== undefined) {
            return cachedResult;
        }
        const testDepsFinder = this.getTestDepsFinder(languageId);
        if (testDepsFinder === undefined) {
            return [];
        }
        const result = await testDepsFinder.findTestDeps();
        this._cachedResults.set(languageId, result);
        return result;
    }
    getTestDepsFinder(languageId) {
        let finder = this._perLanguageTestDepsFinder.get(languageId);
        if (finder === undefined) {
            switch (languageId) {
                case 'javascript':
                case 'javascriptreact':
                case 'typescript':
                case 'typescriptreact': {
                    finder = new JsTsTestDepsFinder(this._searchService, this._fileSystemService, this._textDecoder);
                    break;
                }
                case 'python': {
                    finder = new PyTestDepsFinder(this._searchService, this._fileSystemService, this._textDecoder);
                    break;
                }
                case 'java': {
                    finder = new JavaTestDepsFinder(this._searchService, this._fileSystemService, this._textDecoder);
                    break;
                }
            }
        }
        if (finder !== undefined) {
            this._perLanguageTestDepsFinder.set(languageId, finder);
        }
        return finder;
    }
};
exports.TestDepsResolver = TestDepsResolver;
exports.TestDepsResolver = TestDepsResolver = __decorate([
    __param(0, searchService_1.ISearchService),
    __param(1, fileSystemService_1.IFileSystemService)
], TestDepsResolver);
class JsTsTestDepsFinder {
    constructor(_searchService, _fileSystemService, _textDecoder) {
        this._searchService = _searchService;
        this._fileSystemService = _fileSystemService;
        this._textDecoder = _textDecoder;
        this._jsTsTestDeps = new Set(['mocha', 'jest', 'vitest', 'chai', 'ava', 'jasmine', 'qunit', 'tape', 'cypress', 'puppeteer', 'enzyme', 'testing-library', 'sinon', 'supertest', 'happy-dom', 'playwright']);
    }
    /**
     * Search for test dependencies in package.json files in the workspace.
     */
    async findTestDeps() {
        const packageJsonUris = await this._searchService.findFiles('**/package.json', { exclude: ['**/node_modules/**'], useExcludeSettings: vscodeTypes_1.ExcludeSettingOptions.FilesExclude });
        const testDeps = await Promise.allSettled(packageJsonUris.map(async (uri) => {
            const content = await this._fileSystemService.readFile(uri);
            const packageJson = JSON.parse(this._textDecoder.decode(content));
            const deps = packageJson.dependencies || {};
            const devDeps = packageJson.devDependencies || {};
            const testDeps = [deps, devDeps].flatMap(deps => Object.keys(deps).filter(dep => this._jsTsTestDeps.has(dep)));
            return testDeps;
        }));
        return testDeps.flatMap(result => result.status === 'fulfilled' ? result.value : []);
    }
}
class PyTestDepsFinder {
    constructor(_searchService, _fileSystemService, _textDecoder) {
        this._searchService = _searchService;
        this._fileSystemService = _fileSystemService;
        this._textDecoder = _textDecoder;
        this._pyTestDeps = ['pytest', 'nose', 'unittest', 'tox', 'doctest', 'hypothesis', 'mock', 'coverage', 'behave', 'robotframework'];
    }
    /**
     * Search for test dependencies in package.json files in the workspace.
     */
    async findTestDeps() {
        const testDeps = new Set();
        const projectFiles = ['pyproject.toml', 'setup.py', 'requirements.txt', 'tox.ini'];
        const projectFileUris = await this._searchService.findFiles(`**/{${projectFiles.join(',')}}`);
        await Promise.all(projectFileUris.map(async (uri) => {
            const content = await this._fileSystemService.readFile(uri);
            const contentStr = this._textDecoder.decode(content);
            if (uri.path.endsWith('pyproject.toml')) {
                // pyproject.toml
                const deps = this._getPyProjectTomlDeps(contentStr);
                deps.forEach((dep) => testDeps.add(dep));
            }
            else if (uri.path.endsWith('setup.py')) {
                // setup.py
                const deps = this._getSetupPyDeps(contentStr);
                deps.forEach((dep) => testDeps.add(dep));
            }
            else if (uri.path.endsWith('requirements.txt')) {
                // requirements.txt
                const deps = this._getRequirementsTxtDeps(contentStr);
                deps.forEach((dep) => testDeps.add(dep));
            }
            else if (uri.path.endsWith('tox.ini')) {
                // tox.ini
                testDeps.add('tox');
            }
        }));
        return Array.from(testDeps);
    }
    _getPyProjectTomlDeps(content) {
        return this._pyTestDeps.filter(testDep => content.includes(testDep));
    }
    _getSetupPyDeps(content) {
        return this._pyTestDeps.filter(testDep => content.includes(testDep));
    }
    _getRequirementsTxtDeps(content) {
        return this._pyTestDeps.filter(testDep => content.includes(testDep));
    }
}
class JavaTestDepsFinder {
    constructor(_searchService, _fileSystemService, _textDecoder) {
        this._searchService = _searchService;
        this._fileSystemService = _fileSystemService;
        this._textDecoder = _textDecoder;
        this._javaTestDeps = ['junit', 'testng', 'mockito', 'assertj', 'hamcrest', 'powermock', 'spock', 'cucumber', 'arquillian', 'selenium', 'rest-assured', 'wiremock', 'pitest'];
    }
    async findTestDeps() {
        const testDeps = new Set();
        const projectFiles = ['pom.xml', 'build.gradle', 'build.gradle.kts'];
        const projectFileUris = await this._searchService.findFiles(`**/{${projectFiles.join(',')}}`);
        await Promise.all(projectFileUris.map(async (uri) => {
            const content = await this._fileSystemService.readFile(uri);
            const contentStr = this._textDecoder.decode(content);
            this._javaTestDeps.filter(testDep => contentStr.includes(testDep)).forEach(dep => testDeps.add(dep));
        }));
        return Array.from(testDeps);
    }
}
//# sourceMappingURL=testDepsResolver.js.map