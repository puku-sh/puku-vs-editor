"use strict";
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
exports.SimulationTestRuntime = exports.ISimulationTestRuntime = exports.SimulationTestsRegistry = exports.SimulationSuite = exports.SimulationSuiteOptions = exports.SimulationTest = exports.SimulationTestOptions = exports.REPO_ROOT = void 0;
exports.getOutcomeFileName = getOutcomeFileName;
exports.createSimulationTestFilter = createSimulationTestFilter;
exports.ssuite = ssuite;
exports.stest = stest;
exports.toDirname = toDirname;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const fs = __importStar(require("fs"));
const path_1 = __importDefault(require("path"));
const services_1 = require("../../src/util/common/services");
const grepFilter_1 = require("../simulation/shared/grepFilter");
const sharedTypes_1 = require("../simulation/shared/sharedTypes");
const hash_1 = require("./hash");
var util_1 = require("../util");
Object.defineProperty(exports, "REPO_ROOT", { enumerable: true, get: function () { return util_1.REPO_ROOT; } });
class SimulationTestOptions {
    get optional() {
        if (this._suiteOpts.optional) {
            return true;
        }
        return this._opts.optional ?? false;
    }
    skip(opts) {
        if (this._suiteOpts.skip(opts)) {
            return true;
        }
        return this.mySkip(opts);
    }
    mySkip(opts) {
        if (this._cachedMySkip === undefined) {
            this._cachedMySkip = this._opts.skip?.(opts) ?? false;
        }
        return this._cachedMySkip;
    }
    get location() {
        return this._opts.location;
    }
    get conversationPath() {
        return this._opts.conversationPath;
    }
    get scenarioFolderPath() {
        return this._opts.scenarioFolderPath;
    }
    get stateFile() {
        return this._opts.stateFile;
    }
    constructor(_opts, _suiteOpts) {
        this._opts = _opts;
        this._suiteOpts = _suiteOpts;
        this._cachedMySkip = undefined;
    }
}
exports.SimulationTestOptions = SimulationTestOptions;
class SimulationTest {
    constructor(descriptor, options, suite, _runner) {
        this.suite = suite;
        this._runner = _runner;
        this.description = descriptor.description;
        this.language = descriptor.language;
        this.model = descriptor.model;
        this.embeddingType = descriptor.embeddingType;
        this.configurations = descriptor.configurations;
        this.nonExtensionConfigurations = descriptor.nonExtensionConfigurations;
        this.attributes = descriptor.attributes;
        this.options = new SimulationTestOptions(options, suite.options);
    }
    get fullName() {
        return `${this.suite.fullName} ${this.language ? `[${this.language}] ` : ''}- ${this.description}${this.model ? ` - (${this.model})` : ''}${this.embeddingType ? ` - (${this.embeddingType})` : ''}`;
    }
    get outcomeCategory() {
        return this.suite.outcomeCategory;
    }
    get outcomeFileName() {
        return getOutcomeFileName(this.fullName);
    }
    run(testingServiceCollection) {
        return Promise.resolve(this._runner(testingServiceCollection));
    }
    toString() {
        return `SimulationTest: ${this.fullName}`;
    }
}
exports.SimulationTest = SimulationTest;
function getOutcomeFileName(testName) {
    let suffix = '';
    if (testName.endsWith(' - (gpt-4)')) {
        testName = testName.substring(0, testName.length - 10);
        suffix = '-gpt-4';
    }
    else if (testName.endsWith(' - (gpt-3.5-turbo)')) {
        testName = testName.substring(0, testName.length - 18);
        suffix = '-gpt-3.5-turbo';
    }
    const result = toDirname(testName);
    return `${result.substring(0, 60)}${suffix}.json`.replace(/-+/g, '-');
}
class SimulationSuiteOptions {
    get optional() {
        return this._opts.optional ?? false;
    }
    skip(opts) {
        if (this._cachedSkip === undefined) {
            this._cachedSkip = this._opts.skip?.(opts) ?? false;
        }
        return this._cachedSkip;
    }
    get location() {
        return this._opts.location;
    }
    constructor(_opts) {
        this._opts = _opts;
        this._cachedSkip = undefined;
    }
}
exports.SimulationSuiteOptions = SimulationSuiteOptions;
class SimulationSuite {
    constructor(descriptor, opts = {}, tests = []) {
        this.tests = tests;
        this._title = descriptor.title;
        this._subtitle = descriptor.subtitle;
        this._location = descriptor.location;
        this.language = descriptor.language;
        this.configurations = descriptor.configurations;
        this.nonExtensionConfigurations = descriptor.nonExtensionConfigurations;
        this.options = new SimulationSuiteOptions(opts);
    }
    get fullName() {
        return `${this._title} ${this._subtitle ? `(${this._subtitle}) ` : ''}[${this._location}]`;
    }
    get outcomeCategory() {
        return `${this._title}${this._subtitle ? `-${this._subtitle}` : ''}-${this._location}`;
    }
}
exports.SimulationSuite = SimulationSuite;
function createSimulationTestFilter(grep, omitGrep) {
    const filters = [];
    if (grep) {
        if (typeof grep === 'string') {
            let trimmedGrep = grep.trim();
            const isSuiteNameSearch = trimmedGrep.startsWith('!s:');
            if (isSuiteNameSearch) {
                trimmedGrep = trimmedGrep.replace(/^!s:/, '');
            }
            const grepRegex = (0, grepFilter_1.grepStrToRegex)(trimmedGrep);
            filters.push((test) => isSuiteNameSearch ? grepRegex.test(test.suite.fullName) : grepRegex.test(test.fullName));
        }
        else {
            const grepArr = Array.isArray(grep) ? grep : [grep];
            for (const grep of grepArr) {
                const grepLowerCase = String(grep).toLowerCase();
                const grepFilter = (str) => str.toLowerCase().indexOf(grepLowerCase) >= 0;
                filters.push((test) => grepFilter(test.fullName));
            }
        }
    }
    if (omitGrep) {
        const omitGrepRegex = (0, grepFilter_1.grepStrToRegex)(omitGrep);
        filters.push((test) => !omitGrepRegex.test(test.fullName));
    }
    return (test) => filters.every(shouldRunTest => shouldRunTest(test));
}
class SimulationTestsRegistryClass {
    constructor() {
        this.defaultSuite = new SimulationSuite({ title: 'generic', location: 'inline' });
        this.suites = [this.defaultSuite];
        this.currentSuite = this.defaultSuite;
        this.testNames = new Set();
        this._filter = () => true;
        this._allowTestReregistration = false;
    }
    setInputPath(inputPath) {
        this._inputPath = inputPath;
    }
    setFilters(testPath, grep, omitGrep) {
        this._testPath = testPath;
        this._filter = createSimulationTestFilter(grep, omitGrep);
    }
    getAllSuites() {
        return this.suites;
    }
    getAllTests() {
        const allTests = this.suites.reduce((prev, curr) => prev.concat(curr.tests), []);
        const testsToRun = allTests.filter(this._filter).sort((t0, t1) => t0.fullName.localeCompare(t1.fullName));
        return testsToRun;
    }
    allowTestReregistration() {
        this._allowTestReregistration = true;
    }
    registerTest(testDescriptor, options, runner) {
        if (testDescriptor.language === undefined && this.currentSuite.language) {
            testDescriptor = { ...testDescriptor, language: this.currentSuite.language };
        }
        // inherit configurations from suite
        if (this.currentSuite.configurations !== undefined) {
            const updatedConfigurations = testDescriptor.configurations === undefined
                ? this.currentSuite.configurations
                : [...this.currentSuite.configurations, ...testDescriptor.configurations];
            testDescriptor = { ...testDescriptor, configurations: updatedConfigurations };
        }
        if (this.currentSuite.nonExtensionConfigurations !== undefined) {
            const updatedNonExtConfig = this.currentSuite.nonExtensionConfigurations.slice(0);
            updatedNonExtConfig.push(...testDescriptor.nonExtensionConfigurations ?? []);
            testDescriptor = { ...testDescriptor, nonExtensionConfigurations: updatedNonExtConfig };
        }
        // remove newlines, carriage returns, bad whitespace, etc
        testDescriptor = { ...testDescriptor, description: testDescriptor.description.replace(/\s+/g, ' ') };
        // force a length of 100 chars for a stest name
        if (testDescriptor.description.length > 100) {
            testDescriptor = { ...testDescriptor, description: testDescriptor.description.substring(0, 100) + '…' };
        }
        const test = new SimulationTest(testDescriptor, options, this.currentSuite, runner);
        // change this validation up
        if (this.testNames.has(test.fullName) && !this._allowTestReregistration) {
            throw new Error(`Cannot have two tests with the same name: ${test.fullName}`);
        }
        this.testNames.add(test.fullName);
        this.currentSuite.tests.push(test);
    }
    registerSuite(descriptor, options, factory) {
        if (this._testPath && options.location !== undefined) {
            const testBasename = path_1.default.basename(options.location.path);
            const testBasenameWithoutExtension = testBasename.replace(/\.[^/.]+$/, '');
            if (this._testPath !== testBasename && this._testPath !== testBasenameWithoutExtension) {
                return;
            }
        }
        const suite = new SimulationSuite(descriptor, options);
        function suiteId(s) {
            return s.options.location?.path + '###' + s.fullName;
        }
        this.suites = this.suites.filter(s => suiteId(s) !== suiteId(suite)); // When re-registering a suite, delete the old one
        this.suites.push(suite);
        this.invokeSuiteFactory(suite, factory);
    }
    invokeSuiteFactory(suite, factory) {
        try {
            this.currentSuite = suite;
            factory(this._inputPath);
        }
        finally {
            this.currentSuite = this.defaultSuite;
        }
    }
}
exports.SimulationTestsRegistry = new SimulationTestsRegistryClass();
function captureLocation(fn) {
    try {
        const err = new Error();
        Error.captureStackTrace(err, fn);
        throw err;
    }
    catch (e) {
        const stack = e.stack.split('\n').at(1);
        if (!stack) {
            // It looks like sometimes the stack is empty,
            // so let's add a fallback case
            return captureLocationUsingClassicalWay();
        }
        return extractPositionFromStackTraceLine(stack);
    }
    function captureLocationUsingClassicalWay() {
        try {
            throw new Error();
        }
        catch (e) {
            // Error:
            //     at captureLocationUsingClassicalWay (/Users/alex/src/vscode-copilot/test/base/stest.ts:398:10)
            //     at captureLocation (/Users/alex/src/vscode-copilot/test/base/stest.ts:374:11)
            //     at stest (/Users/alex/src/vscode-copilot/test/base/stest.ts:467:84)
            //     at /Users/alex/src/vscode-copilot/test/codeMapper/codeMapper.stest.ts:22:2
            const stack = e.stack.split('\n').at(4);
            if (!stack) {
                console.log(`No stack in captureLocation`);
                console.log(e.stack);
                return undefined;
            }
            return extractPositionFromStackTraceLine(stack);
        }
    }
    function extractPositionFromStackTraceLine(stack) {
        const r1 = /\((.+):(\d+):(\d+)\)/;
        const r2 = /at (.+):(\d+):(\d+)/;
        const match = stack.match(r1) ?? stack.match(r2);
        if (!match) {
            console.log(`No matches in stack for captureLocation`);
            console.log(stack);
            return undefined;
        }
        return {
            path: match[1],
            position: {
                line: Number(match[2]) - 1,
                character: Number(match[3]) - 1,
            }
        };
    }
}
/**
 * @remarks DO NOT FORGET to register the test file in `simulationTests.ts` for local test files
 */
function ssuite(descriptor, factory) {
    exports.SimulationTestsRegistry.registerSuite(descriptor, { optional: false, location: captureLocation(ssuite) }, factory);
}
ssuite.optional = function (skip, descriptor, factory) {
    exports.SimulationTestsRegistry.registerSuite(descriptor, { optional: true, skip, location: captureLocation(ssuite.optional) }, factory);
};
ssuite.skip = function (descriptor, factory) {
    exports.SimulationTestsRegistry.registerSuite(descriptor, { optional: true, skip: (_) => true, location: captureLocation(ssuite.skip) }, factory);
};
/**
 * The test function will receive as first argument a context.
 *
 * On the context, you will find a good working ChatMLFetcher which uses caching
 * and a caching slot which matches the run number.
 *
 * You will also find `SimulationTestRuntime` on the context, which allows you
 * to use logging in your test or write files to the test outcome directory.
 */
function stest(testDescriptor, runner, opts) {
    testDescriptor = typeof testDescriptor === 'string' ? { description: testDescriptor } : testDescriptor;
    exports.SimulationTestsRegistry.registerTest(testDescriptor, { optional: false, location: captureLocation(stest), ...opts }, runner);
}
stest.optional = function (skip, testDescriptor, runner, opts) {
    exports.SimulationTestsRegistry.registerTest(testDescriptor, { optional: true, skip, location: captureLocation(stest.optional), ...opts }, runner);
};
stest.skip = function (testDescriptor, runner, opts) {
    exports.SimulationTestsRegistry.registerTest(testDescriptor, { optional: true, skip: () => true, location: captureLocation(stest.skip), ...opts }, runner);
};
exports.ISimulationTestRuntime = (0, services_1.createServiceIdentifier)('ISimulationTestRuntime');
class SimulationTestRuntime {
    constructor(baseDir, testOutcomeDir, runNumber) {
        this.baseDir = baseDir;
        this.testOutcomeDir = testOutcomeDir;
        this.runNumber = runNumber;
        this.explicitLogMessages = [];
        this.implicitLogMessages = [];
        this.writtenFiles = [];
        this.outcome = undefined;
        this.isInSimulationTests = true;
    }
    logIt(level, metadataStr, ...extra) {
        const timestamp = new Date().toISOString();
        this.implicitLogMessages.push(`[${timestamp}] ${metadataStr} ${extra.join(' ')}`);
    }
    shouldLog(level) {
        return undefined;
    }
    log(message, err) {
        if (err) {
            message += ' ' + (err.stack ? String(err.stack) : String(err));
        }
        this.explicitLogMessages.push(message);
    }
    async flushLogs() {
        if (this.explicitLogMessages.length > 0) {
            await this.writeFile(sharedTypes_1.SIMULATION_EXPLICIT_LOG_FILENAME, this.explicitLogMessages.join('\n'), sharedTypes_1.EXPLICIT_LOG_TAG);
        }
        if (this.implicitLogMessages.length > 0) {
            await this.writeFile(sharedTypes_1.SIMULATION_IMPLICIT_LOG_FILENAME, this.implicitLogMessages.join('\n'), sharedTypes_1.IMPLICIT_LOG_TAG);
        }
    }
    async writeFile(filename, contents, tag) {
        const dest = this._findUniqueFilename(path_1.default.join(this.testOutcomeDir, this.massageFilename(filename)));
        const relativePath = path_1.default.relative(this.baseDir, dest);
        this.writtenFiles.push({
            relativePath,
            tag
        });
        await fs.promises.mkdir(path_1.default.dirname(dest), { recursive: true });
        await fs.promises.writeFile(dest, contents);
        return relativePath;
    }
    massageFilename(filename) {
        return `${(this.runNumber).toString().padStart(2, '0')}-${filename}`;
    }
    /**
     * Generate a new filePath in case this filePath already exists.
     */
    _findUniqueFilename(initialFilePath) {
        for (let i = 0; i < 1000; i++) {
            let filePath = initialFilePath;
            if (i > 0) {
                // This file was already written, we'll rename it to <basename>.X.<ext>
                const ext = path_1.default.extname(initialFilePath);
                const basename = initialFilePath.substring(0, initialFilePath.length - ext.length);
                filePath = `${basename}.${i}${ext}`;
            }
            const relativePath = path_1.default.relative(this.baseDir, filePath);
            const exists = this.writtenFiles.find(x => x.relativePath === relativePath);
            if (!exists) {
                return filePath;
            }
        }
        return initialFilePath;
    }
    getWrittenFiles() {
        return this.writtenFiles.slice(0);
    }
    getOutcome() {
        return this.outcome;
    }
    setOutcome(outcome) {
        this.outcome = outcome;
    }
    getExplicitScore() {
        return this.score;
    }
    setExplicitScore(score) {
        this.score = score;
    }
}
exports.SimulationTestRuntime = SimulationTestRuntime;
const FILENAME_LIMIT = 125;
function toDirname(testName) {
    const filename = testName.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').toLowerCase();
    if (filename.length > FILENAME_LIMIT) { // windows file names can not exceed 255 chars and path length limits, so keep it short
        return `${filename.substring(0, FILENAME_LIMIT)}-${(0, hash_1.computeSHA256)(filename).substring(0, 8)}`;
    }
    return filename;
}
//# sourceMappingURL=stest.js.map