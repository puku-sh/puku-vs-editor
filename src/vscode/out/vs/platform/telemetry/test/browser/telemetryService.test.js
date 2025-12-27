/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as sinon from 'sinon';
import sinonTest from 'sinon-test';
import { mainWindow } from '../../../../base/browser/window.js';
import * as Errors from '../../../../base/common/errors.js';
import { Emitter } from '../../../../base/common/event.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { TestConfigurationService } from '../../../configuration/test/common/testConfigurationService.js';
import product from '../../../product/common/product.js';
import ErrorTelemetry from '../../browser/errorTelemetry.js';
import { TelemetryService } from '../../common/telemetryService.js';
import { NullAppender } from '../../common/telemetryUtils.js';
const sinonTestFn = sinonTest(sinon);
class TestTelemetryAppender {
    constructor() {
        this.events = [];
        this.isDisposed = false;
    }
    log(eventName, data) {
        this.events.push({ eventName, data });
    }
    getEventsCount() {
        return this.events.length;
    }
    flush() {
        this.isDisposed = true;
        return Promise.resolve(null);
    }
}
class ErrorTestingSettings {
    constructor() {
        this.randomUserFile = 'a/path/that/doe_snt/con-tain/code/names.js';
        this.anonymizedRandomUserFile = '<REDACTED: user-file-path>';
        this.nodeModulePathToRetain = 'node_modules/path/that/shouldbe/retained/names.js:14:15854';
        this.nodeModuleAsarPathToRetain = 'node_modules.asar/path/that/shouldbe/retained/names.js:14:12354';
        this.personalInfo = 'DANGEROUS/PATH';
        this.importantInfo = 'important/information';
        this.filePrefix = 'file:///';
        this.dangerousPathWithImportantInfo = this.filePrefix + this.personalInfo + '/resources/app/' + this.importantInfo;
        this.dangerousPathWithoutImportantInfo = this.filePrefix + this.personalInfo;
        this.missingModelPrefix = 'Received model events for missing model ';
        this.missingModelMessage = this.missingModelPrefix + ' ' + this.dangerousPathWithoutImportantInfo;
        this.noSuchFilePrefix = 'ENOENT: no such file or directory';
        this.noSuchFileMessage = this.noSuchFilePrefix + ' \'' + this.personalInfo + '\'';
        this.stack = [`at e._modelEvents (${this.randomUserFile}:11:7309)`,
            `    at t.AllWorkers (${this.randomUserFile}:6:8844)`,
            `    at e.(anonymous function) [as _modelEvents] (${this.randomUserFile}:5:29552)`,
            `    at Function.<anonymous> (${this.randomUserFile}:6:8272)`,
            `    at e.dispatch (${this.randomUserFile}:5:26931)`,
            `    at e.request (/${this.nodeModuleAsarPathToRetain})`,
            `    at t._handleMessage (${this.nodeModuleAsarPathToRetain})`,
            `    at t._onmessage (/${this.nodeModulePathToRetain})`,
            `    at t.onmessage (${this.nodeModulePathToRetain})`,
            `    at DedicatedWorkerGlobalScope.self.onmessage`,
            this.dangerousPathWithImportantInfo,
            this.dangerousPathWithoutImportantInfo,
            this.missingModelMessage,
            this.noSuchFileMessage];
    }
}
suite('TelemetryService', () => {
    const TestProductService = { _serviceBrand: undefined, ...product };
    test('Disposing', sinonTestFn(function () {
        const testAppender = new TestTelemetryAppender();
        const service = new TelemetryService({ appenders: [testAppender] }, new TestConfigurationService(), TestProductService);
        service.publicLog('testPrivateEvent');
        assert.strictEqual(testAppender.getEventsCount(), 1);
        service.dispose();
        assert.strictEqual(!testAppender.isDisposed, true);
    }));
    // event reporting
    test('Simple event', sinonTestFn(function () {
        const testAppender = new TestTelemetryAppender();
        const service = new TelemetryService({ appenders: [testAppender] }, new TestConfigurationService(), TestProductService);
        service.publicLog('testEvent');
        assert.strictEqual(testAppender.getEventsCount(), 1);
        assert.strictEqual(testAppender.events[0].eventName, 'testEvent');
        assert.notStrictEqual(testAppender.events[0].data, null);
        service.dispose();
    }));
    test('Event with data', sinonTestFn(function () {
        const testAppender = new TestTelemetryAppender();
        const service = new TelemetryService({ appenders: [testAppender] }, new TestConfigurationService(), TestProductService);
        service.publicLog('testEvent', {
            'stringProp': 'property',
            'numberProp': 1,
            'booleanProp': true,
            'complexProp': {
                'value': 0
            }
        });
        assert.strictEqual(testAppender.getEventsCount(), 1);
        assert.strictEqual(testAppender.events[0].eventName, 'testEvent');
        assert.notStrictEqual(testAppender.events[0].data, null);
        assert.strictEqual(testAppender.events[0].data['stringProp'], 'property');
        assert.strictEqual(testAppender.events[0].data['numberProp'], 1);
        assert.strictEqual(testAppender.events[0].data['booleanProp'], true);
        assert.strictEqual(testAppender.events[0].data['complexProp'].value, 0);
        service.dispose();
    }));
    test('common properties added to *all* events, simple event', function () {
        const testAppender = new TestTelemetryAppender();
        const service = new TelemetryService({
            appenders: [testAppender],
            commonProperties: { foo: 'JA!', get bar() { return Math.random() % 2 === 0; } }
        }, new TestConfigurationService(), TestProductService);
        service.publicLog('testEvent');
        const [first] = testAppender.events;
        assert.strictEqual(Object.keys(first.data).length, 2);
        assert.strictEqual(typeof first.data['foo'], 'string');
        assert.strictEqual(typeof first.data['bar'], 'boolean');
        service.dispose();
    });
    test('common properties added to *all* events, event with data', function () {
        const testAppender = new TestTelemetryAppender();
        const service = new TelemetryService({
            appenders: [testAppender],
            commonProperties: { foo: 'JA!', get bar() { return Math.random() % 2 === 0; } }
        }, new TestConfigurationService(), TestProductService);
        service.publicLog('testEvent', { hightower: 'xl', price: 8000 });
        const [first] = testAppender.events;
        assert.strictEqual(Object.keys(first.data).length, 4);
        assert.strictEqual(typeof first.data['foo'], 'string');
        assert.strictEqual(typeof first.data['bar'], 'boolean');
        assert.strictEqual(typeof first.data['hightower'], 'string');
        assert.strictEqual(typeof first.data['price'], 'number');
        service.dispose();
    });
    test('TelemetryInfo comes from properties', function () {
        const service = new TelemetryService({
            appenders: [NullAppender],
            commonProperties: {
                sessionID: 'one',
                ['common.machineId']: 'three',
            }
        }, new TestConfigurationService(), TestProductService);
        assert.strictEqual(service.sessionId, 'one');
        assert.strictEqual(service.machineId, 'three');
        service.dispose();
    });
    test('telemetry on by default', function () {
        const testAppender = new TestTelemetryAppender();
        const service = new TelemetryService({ appenders: [testAppender] }, new TestConfigurationService(), TestProductService);
        service.publicLog('testEvent');
        assert.strictEqual(testAppender.getEventsCount(), 1);
        assert.strictEqual(testAppender.events[0].eventName, 'testEvent');
        service.dispose();
    });
    class TestErrorTelemetryService extends TelemetryService {
        constructor(config) {
            super({ ...config, sendErrorTelemetry: true }, new TestConfigurationService, TestProductService);
        }
    }
    test('Error events', sinonTestFn(function () {
        const origErrorHandler = Errors.errorHandler.getUnexpectedErrorHandler();
        Errors.setUnexpectedErrorHandler(() => { });
        try {
            const testAppender = new TestTelemetryAppender();
            const service = new TestErrorTelemetryService({ appenders: [testAppender] });
            const errorTelemetry = new ErrorTelemetry(service);
            const e = new Error('This is a test.');
            // for Phantom
            if (!e.stack) {
                e.stack = 'blah';
            }
            Errors.onUnexpectedError(e);
            this.clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
            assert.strictEqual(testAppender.getEventsCount(), 1);
            assert.strictEqual(testAppender.events[0].eventName, 'UnhandledError');
            assert.strictEqual(testAppender.events[0].data.msg, 'This is a test.');
            errorTelemetry.dispose();
            service.dispose();
        }
        finally {
            Errors.setUnexpectedErrorHandler(origErrorHandler);
        }
    }));
    // 	test('Unhandled Promise Error events', sinonTestFn(function() {
    //
    // 		let origErrorHandler = Errors.errorHandler.getUnexpectedErrorHandler();
    // 		Errors.setUnexpectedErrorHandler(() => {});
    //
    // 		try {
    // 			let service = new MainTelemetryService();
    // 			let testAppender = new TestTelemetryAppender();
    // 			service.addTelemetryAppender(testAppender);
    //
    // 			winjs.Promise.wrapError(new Error('This should not get logged'));
    // 			winjs.TPromise.as(true).then(() => {
    // 				throw new Error('This should get logged');
    // 			});
    // 			// prevent console output from failing the test
    // 			this.stub(console, 'log');
    // 			// allow for the promise to finish
    // 			this.clock.tick(MainErrorTelemetry.ERROR_FLUSH_TIMEOUT);
    //
    // 			assert.strictEqual(testAppender.getEventsCount(), 1);
    // 			assert.strictEqual(testAppender.events[0].eventName, 'UnhandledError');
    // 			assert.strictEqual(testAppender.events[0].data.msg,  'This should get logged');
    //
    // 			service.dispose();
    // 		} finally {
    // 			Errors.setUnexpectedErrorHandler(origErrorHandler);
    // 		}
    // 	}));
    test('Handle global errors', sinonTestFn(function () {
        const errorStub = sinon.stub();
        mainWindow.onerror = errorStub;
        const testAppender = new TestTelemetryAppender();
        const service = new TestErrorTelemetryService({ appenders: [testAppender] });
        const errorTelemetry = new ErrorTelemetry(service);
        const testError = new Error('test');
        (mainWindow.onerror)('Error Message', 'file.js', 2, 42, testError);
        this.clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
        assert.strictEqual(errorStub.alwaysCalledWithExactly('Error Message', 'file.js', 2, 42, testError), true);
        assert.strictEqual(errorStub.callCount, 1);
        assert.strictEqual(testAppender.getEventsCount(), 1);
        assert.strictEqual(testAppender.events[0].eventName, 'UnhandledError');
        assert.strictEqual(testAppender.events[0].data.msg, 'Error Message');
        assert.strictEqual(testAppender.events[0].data.file, 'file.js');
        assert.strictEqual(testAppender.events[0].data.line, 2);
        assert.strictEqual(testAppender.events[0].data.column, 42);
        assert.strictEqual(testAppender.events[0].data.uncaught_error_msg, 'test');
        errorTelemetry.dispose();
        service.dispose();
        sinon.restore();
    }));
    test('Error Telemetry removes PII from filename with spaces', sinonTestFn(function () {
        const errorStub = sinon.stub();
        mainWindow.onerror = errorStub;
        const settings = new ErrorTestingSettings();
        const testAppender = new TestTelemetryAppender();
        const service = new TestErrorTelemetryService({ appenders: [testAppender] });
        const errorTelemetry = new ErrorTelemetry(service);
        const personInfoWithSpaces = settings.personalInfo.slice(0, 2) + ' ' + settings.personalInfo.slice(2);
        const dangerousFilenameError = new Error('dangerousFilename');
        dangerousFilenameError.stack = settings.stack;
        mainWindow.onerror('dangerousFilename', settings.dangerousPathWithImportantInfo.replace(settings.personalInfo, personInfoWithSpaces) + '/test.js', 2, 42, dangerousFilenameError);
        this.clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
        assert.strictEqual(errorStub.callCount, 1);
        assert.strictEqual(testAppender.events[0].data.file.indexOf(settings.dangerousPathWithImportantInfo.replace(settings.personalInfo, personInfoWithSpaces)), -1);
        assert.strictEqual(testAppender.events[0].data.file, settings.importantInfo + '/test.js');
        errorTelemetry.dispose();
        service.dispose();
        sinon.restore();
    }));
    test('Uncaught Error Telemetry removes PII from filename', sinonTestFn(function () {
        const clock = this.clock;
        const errorStub = sinon.stub();
        mainWindow.onerror = errorStub;
        const settings = new ErrorTestingSettings();
        const testAppender = new TestTelemetryAppender();
        const service = new TestErrorTelemetryService({ appenders: [testAppender] });
        const errorTelemetry = new ErrorTelemetry(service);
        let dangerousFilenameError = new Error('dangerousFilename');
        dangerousFilenameError.stack = settings.stack;
        mainWindow.onerror('dangerousFilename', settings.dangerousPathWithImportantInfo + '/test.js', 2, 42, dangerousFilenameError);
        clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
        assert.strictEqual(errorStub.callCount, 1);
        assert.strictEqual(testAppender.events[0].data.file.indexOf(settings.dangerousPathWithImportantInfo), -1);
        dangerousFilenameError = new Error('dangerousFilename');
        dangerousFilenameError.stack = settings.stack;
        mainWindow.onerror('dangerousFilename', settings.dangerousPathWithImportantInfo + '/test.js', 2, 42, dangerousFilenameError);
        clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
        assert.strictEqual(errorStub.callCount, 2);
        assert.strictEqual(testAppender.events[0].data.file.indexOf(settings.dangerousPathWithImportantInfo), -1);
        assert.strictEqual(testAppender.events[0].data.file, settings.importantInfo + '/test.js');
        errorTelemetry.dispose();
        service.dispose();
        sinon.restore();
    }));
    test('Unexpected Error Telemetry removes PII', sinonTestFn(function () {
        const origErrorHandler = Errors.errorHandler.getUnexpectedErrorHandler();
        Errors.setUnexpectedErrorHandler(() => { });
        try {
            const settings = new ErrorTestingSettings();
            const testAppender = new TestTelemetryAppender();
            const service = new TestErrorTelemetryService({ appenders: [testAppender] });
            const errorTelemetry = new ErrorTelemetry(service);
            const dangerousPathWithoutImportantInfoError = new Error(settings.dangerousPathWithoutImportantInfo);
            dangerousPathWithoutImportantInfoError.stack = settings.stack;
            Errors.onUnexpectedError(dangerousPathWithoutImportantInfoError);
            this.clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
            assert.strictEqual(testAppender.events[0].data.msg.indexOf(settings.personalInfo), -1);
            assert.strictEqual(testAppender.events[0].data.msg.indexOf(settings.filePrefix), -1);
            assert.strictEqual(testAppender.events[0].data.callstack.indexOf(settings.personalInfo), -1);
            assert.strictEqual(testAppender.events[0].data.callstack.indexOf(settings.filePrefix), -1);
            assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf(settings.stack[4].replace(settings.randomUserFile, settings.anonymizedRandomUserFile)), -1);
            assert.strictEqual(testAppender.events[0].data.callstack.split('\n').length, settings.stack.length);
            errorTelemetry.dispose();
            service.dispose();
        }
        finally {
            Errors.setUnexpectedErrorHandler(origErrorHandler);
        }
    }));
    test('Uncaught Error Telemetry removes PII', sinonTestFn(function () {
        const errorStub = sinon.stub();
        mainWindow.onerror = errorStub;
        const settings = new ErrorTestingSettings();
        const testAppender = new TestTelemetryAppender();
        const service = new TestErrorTelemetryService({ appenders: [testAppender] });
        const errorTelemetry = new ErrorTelemetry(service);
        const dangerousPathWithoutImportantInfoError = new Error('dangerousPathWithoutImportantInfo');
        dangerousPathWithoutImportantInfoError.stack = settings.stack;
        mainWindow.onerror(settings.dangerousPathWithoutImportantInfo, 'test.js', 2, 42, dangerousPathWithoutImportantInfoError);
        this.clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
        assert.strictEqual(errorStub.callCount, 1);
        // Test that no file information remains, esp. personal info
        assert.strictEqual(testAppender.events[0].data.msg.indexOf(settings.personalInfo), -1);
        assert.strictEqual(testAppender.events[0].data.msg.indexOf(settings.filePrefix), -1);
        assert.strictEqual(testAppender.events[0].data.callstack.indexOf(settings.personalInfo), -1);
        assert.strictEqual(testAppender.events[0].data.callstack.indexOf(settings.filePrefix), -1);
        assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf(settings.stack[4].replace(settings.randomUserFile, settings.anonymizedRandomUserFile)), -1);
        assert.strictEqual(testAppender.events[0].data.callstack.split('\n').length, settings.stack.length);
        errorTelemetry.dispose();
        service.dispose();
        sinon.restore();
    }));
    test('Unexpected Error Telemetry removes PII but preserves Code file path', sinonTestFn(function () {
        const origErrorHandler = Errors.errorHandler.getUnexpectedErrorHandler();
        Errors.setUnexpectedErrorHandler(() => { });
        try {
            const settings = new ErrorTestingSettings();
            const testAppender = new TestTelemetryAppender();
            const service = new TestErrorTelemetryService({ appenders: [testAppender] });
            const errorTelemetry = new ErrorTelemetry(service);
            const dangerousPathWithImportantInfoError = new Error(settings.dangerousPathWithImportantInfo);
            dangerousPathWithImportantInfoError.stack = settings.stack;
            // Test that important information remains but personal info does not
            Errors.onUnexpectedError(dangerousPathWithImportantInfoError);
            this.clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
            assert.notStrictEqual(testAppender.events[0].data.msg.indexOf(settings.importantInfo), -1);
            assert.strictEqual(testAppender.events[0].data.msg.indexOf(settings.personalInfo), -1);
            assert.strictEqual(testAppender.events[0].data.msg.indexOf(settings.filePrefix), -1);
            assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf(settings.importantInfo), -1);
            assert.strictEqual(testAppender.events[0].data.callstack.indexOf(settings.personalInfo), -1);
            assert.strictEqual(testAppender.events[0].data.callstack.indexOf(settings.filePrefix), -1);
            assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf(settings.stack[4].replace(settings.randomUserFile, settings.anonymizedRandomUserFile)), -1);
            assert.strictEqual(testAppender.events[0].data.callstack.split('\n').length, settings.stack.length);
            errorTelemetry.dispose();
            service.dispose();
        }
        finally {
            Errors.setUnexpectedErrorHandler(origErrorHandler);
        }
    }));
    test('Uncaught Error Telemetry removes PII but preserves Code file path', sinonTestFn(function () {
        const errorStub = sinon.stub();
        mainWindow.onerror = errorStub;
        const settings = new ErrorTestingSettings();
        const testAppender = new TestTelemetryAppender();
        const service = new TestErrorTelemetryService({ appenders: [testAppender] });
        const errorTelemetry = new ErrorTelemetry(service);
        const dangerousPathWithImportantInfoError = new Error('dangerousPathWithImportantInfo');
        dangerousPathWithImportantInfoError.stack = settings.stack;
        mainWindow.onerror(settings.dangerousPathWithImportantInfo, 'test.js', 2, 42, dangerousPathWithImportantInfoError);
        this.clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
        assert.strictEqual(errorStub.callCount, 1);
        // Test that important information remains but personal info does not
        assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf('(' + settings.nodeModuleAsarPathToRetain), -1);
        assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf('(' + settings.nodeModulePathToRetain), -1);
        assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf('(/' + settings.nodeModuleAsarPathToRetain), -1);
        assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf('(/' + settings.nodeModulePathToRetain), -1);
        assert.notStrictEqual(testAppender.events[0].data.msg.indexOf(settings.importantInfo), -1);
        assert.strictEqual(testAppender.events[0].data.msg.indexOf(settings.personalInfo), -1);
        assert.strictEqual(testAppender.events[0].data.msg.indexOf(settings.filePrefix), -1);
        assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf(settings.importantInfo), -1);
        assert.strictEqual(testAppender.events[0].data.callstack.indexOf(settings.personalInfo), -1);
        assert.strictEqual(testAppender.events[0].data.callstack.indexOf(settings.filePrefix), -1);
        assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf(settings.stack[4].replace(settings.randomUserFile, settings.anonymizedRandomUserFile)), -1);
        assert.strictEqual(testAppender.events[0].data.callstack.split('\n').length, settings.stack.length);
        errorTelemetry.dispose();
        service.dispose();
        sinon.restore();
    }));
    test('Unexpected Error Telemetry removes PII but preserves Code file path with node modules', sinonTestFn(function () {
        const origErrorHandler = Errors.errorHandler.getUnexpectedErrorHandler();
        Errors.setUnexpectedErrorHandler(() => { });
        try {
            const settings = new ErrorTestingSettings();
            const testAppender = new TestTelemetryAppender();
            const service = new TestErrorTelemetryService({ appenders: [testAppender] });
            const errorTelemetry = new ErrorTelemetry(service);
            const dangerousPathWithImportantInfoError = new Error(settings.dangerousPathWithImportantInfo);
            dangerousPathWithImportantInfoError.stack = settings.stack;
            Errors.onUnexpectedError(dangerousPathWithImportantInfoError);
            this.clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
            assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf('(' + settings.nodeModuleAsarPathToRetain), -1);
            assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf('(' + settings.nodeModulePathToRetain), -1);
            assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf('(/' + settings.nodeModuleAsarPathToRetain), -1);
            assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf('(/' + settings.nodeModulePathToRetain), -1);
            errorTelemetry.dispose();
            service.dispose();
        }
        finally {
            Errors.setUnexpectedErrorHandler(origErrorHandler);
        }
    }));
    test('Unexpected Error Telemetry removes PII but preserves Code file path when PIIPath is configured', sinonTestFn(function () {
        const origErrorHandler = Errors.errorHandler.getUnexpectedErrorHandler();
        Errors.setUnexpectedErrorHandler(() => { });
        try {
            const settings = new ErrorTestingSettings();
            const testAppender = new TestTelemetryAppender();
            const service = new TestErrorTelemetryService({ appenders: [testAppender], piiPaths: [settings.personalInfo + '/resources/app/'] });
            const errorTelemetry = new ErrorTelemetry(service);
            const dangerousPathWithImportantInfoError = new Error(settings.dangerousPathWithImportantInfo);
            dangerousPathWithImportantInfoError.stack = settings.stack;
            // Test that important information remains but personal info does not
            Errors.onUnexpectedError(dangerousPathWithImportantInfoError);
            this.clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
            assert.notStrictEqual(testAppender.events[0].data.msg.indexOf(settings.importantInfo), -1);
            assert.strictEqual(testAppender.events[0].data.msg.indexOf(settings.personalInfo), -1);
            assert.strictEqual(testAppender.events[0].data.msg.indexOf(settings.filePrefix), -1);
            assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf(settings.importantInfo), -1);
            assert.strictEqual(testAppender.events[0].data.callstack.indexOf(settings.personalInfo), -1);
            assert.strictEqual(testAppender.events[0].data.callstack.indexOf(settings.filePrefix), -1);
            assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf(settings.stack[4].replace(settings.randomUserFile, settings.anonymizedRandomUserFile)), -1);
            assert.strictEqual(testAppender.events[0].data.callstack.split('\n').length, settings.stack.length);
            errorTelemetry.dispose();
            service.dispose();
        }
        finally {
            Errors.setUnexpectedErrorHandler(origErrorHandler);
        }
    }));
    test('Uncaught Error Telemetry removes PII but preserves Code file path when PIIPath is configured', sinonTestFn(function () {
        const errorStub = sinon.stub();
        mainWindow.onerror = errorStub;
        const settings = new ErrorTestingSettings();
        const testAppender = new TestTelemetryAppender();
        const service = new TestErrorTelemetryService({ appenders: [testAppender], piiPaths: [settings.personalInfo + '/resources/app/'] });
        const errorTelemetry = new ErrorTelemetry(service);
        const dangerousPathWithImportantInfoError = new Error('dangerousPathWithImportantInfo');
        dangerousPathWithImportantInfoError.stack = settings.stack;
        mainWindow.onerror(settings.dangerousPathWithImportantInfo, 'test.js', 2, 42, dangerousPathWithImportantInfoError);
        this.clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
        assert.strictEqual(errorStub.callCount, 1);
        // Test that important information remains but personal info does not
        assert.notStrictEqual(testAppender.events[0].data.msg.indexOf(settings.importantInfo), -1);
        assert.strictEqual(testAppender.events[0].data.msg.indexOf(settings.personalInfo), -1);
        assert.strictEqual(testAppender.events[0].data.msg.indexOf(settings.filePrefix), -1);
        assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf(settings.importantInfo), -1);
        assert.strictEqual(testAppender.events[0].data.callstack.indexOf(settings.personalInfo), -1);
        assert.strictEqual(testAppender.events[0].data.callstack.indexOf(settings.filePrefix), -1);
        assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf(settings.stack[4].replace(settings.randomUserFile, settings.anonymizedRandomUserFile)), -1);
        assert.strictEqual(testAppender.events[0].data.callstack.split('\n').length, settings.stack.length);
        errorTelemetry.dispose();
        service.dispose();
        sinon.restore();
    }));
    test('Unexpected Error Telemetry removes PII but preserves Missing Model error message', sinonTestFn(function () {
        const origErrorHandler = Errors.errorHandler.getUnexpectedErrorHandler();
        Errors.setUnexpectedErrorHandler(() => { });
        try {
            const settings = new ErrorTestingSettings();
            const testAppender = new TestTelemetryAppender();
            const service = new TestErrorTelemetryService({ appenders: [testAppender] });
            const errorTelemetry = new ErrorTelemetry(service);
            const missingModelError = new Error(settings.missingModelMessage);
            missingModelError.stack = settings.stack;
            // Test that no file information remains, but this particular
            // error message does (Received model events for missing model)
            Errors.onUnexpectedError(missingModelError);
            this.clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
            assert.notStrictEqual(testAppender.events[0].data.msg.indexOf(settings.missingModelPrefix), -1);
            assert.strictEqual(testAppender.events[0].data.msg.indexOf(settings.personalInfo), -1);
            assert.strictEqual(testAppender.events[0].data.msg.indexOf(settings.filePrefix), -1);
            assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf(settings.missingModelPrefix), -1);
            assert.strictEqual(testAppender.events[0].data.callstack.indexOf(settings.personalInfo), -1);
            assert.strictEqual(testAppender.events[0].data.callstack.indexOf(settings.filePrefix), -1);
            assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf(settings.stack[4].replace(settings.randomUserFile, settings.anonymizedRandomUserFile)), -1);
            assert.strictEqual(testAppender.events[0].data.callstack.split('\n').length, settings.stack.length);
            errorTelemetry.dispose();
            service.dispose();
        }
        finally {
            Errors.setUnexpectedErrorHandler(origErrorHandler);
        }
    }));
    test('Uncaught Error Telemetry removes PII but preserves Missing Model error message', sinonTestFn(function () {
        const errorStub = sinon.stub();
        mainWindow.onerror = errorStub;
        const settings = new ErrorTestingSettings();
        const testAppender = new TestTelemetryAppender();
        const service = new TestErrorTelemetryService({ appenders: [testAppender] });
        const errorTelemetry = new ErrorTelemetry(service);
        const missingModelError = new Error('missingModelMessage');
        missingModelError.stack = settings.stack;
        mainWindow.onerror(settings.missingModelMessage, 'test.js', 2, 42, missingModelError);
        this.clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
        assert.strictEqual(errorStub.callCount, 1);
        // Test that no file information remains, but this particular
        // error message does (Received model events for missing model)
        assert.notStrictEqual(testAppender.events[0].data.msg.indexOf(settings.missingModelPrefix), -1);
        assert.strictEqual(testAppender.events[0].data.msg.indexOf(settings.personalInfo), -1);
        assert.strictEqual(testAppender.events[0].data.msg.indexOf(settings.filePrefix), -1);
        assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf(settings.missingModelPrefix), -1);
        assert.strictEqual(testAppender.events[0].data.callstack.indexOf(settings.personalInfo), -1);
        assert.strictEqual(testAppender.events[0].data.callstack.indexOf(settings.filePrefix), -1);
        assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf(settings.stack[4].replace(settings.randomUserFile, settings.anonymizedRandomUserFile)), -1);
        assert.strictEqual(testAppender.events[0].data.callstack.split('\n').length, settings.stack.length);
        errorTelemetry.dispose();
        service.dispose();
        sinon.restore();
    }));
    test('Unexpected Error Telemetry removes PII but preserves No Such File error message', sinonTestFn(function () {
        const origErrorHandler = Errors.errorHandler.getUnexpectedErrorHandler();
        Errors.setUnexpectedErrorHandler(() => { });
        try {
            const settings = new ErrorTestingSettings();
            const testAppender = new TestTelemetryAppender();
            const service = new TestErrorTelemetryService({ appenders: [testAppender] });
            const errorTelemetry = new ErrorTelemetry(service);
            const noSuchFileError = new Error(settings.noSuchFileMessage);
            noSuchFileError.stack = settings.stack;
            // Test that no file information remains, but this particular
            // error message does (ENOENT: no such file or directory)
            Errors.onUnexpectedError(noSuchFileError);
            this.clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
            assert.notStrictEqual(testAppender.events[0].data.msg.indexOf(settings.noSuchFilePrefix), -1);
            assert.strictEqual(testAppender.events[0].data.msg.indexOf(settings.personalInfo), -1);
            assert.strictEqual(testAppender.events[0].data.msg.indexOf(settings.filePrefix), -1);
            assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf(settings.noSuchFilePrefix), -1);
            assert.strictEqual(testAppender.events[0].data.callstack.indexOf(settings.personalInfo), -1);
            assert.strictEqual(testAppender.events[0].data.callstack.indexOf(settings.filePrefix), -1);
            assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf(settings.stack[4].replace(settings.randomUserFile, settings.anonymizedRandomUserFile)), -1);
            assert.strictEqual(testAppender.events[0].data.callstack.split('\n').length, settings.stack.length);
            errorTelemetry.dispose();
            service.dispose();
        }
        finally {
            Errors.setUnexpectedErrorHandler(origErrorHandler);
        }
    }));
    test('Uncaught Error Telemetry removes PII but preserves No Such File error message', sinonTestFn(function () {
        const origErrorHandler = Errors.errorHandler.getUnexpectedErrorHandler();
        Errors.setUnexpectedErrorHandler(() => { });
        try {
            const errorStub = sinon.stub();
            mainWindow.onerror = errorStub;
            const settings = new ErrorTestingSettings();
            const testAppender = new TestTelemetryAppender();
            const service = new TestErrorTelemetryService({ appenders: [testAppender] });
            const errorTelemetry = new ErrorTelemetry(service);
            const noSuchFileError = new Error('noSuchFileMessage');
            noSuchFileError.stack = settings.stack;
            mainWindow.onerror(settings.noSuchFileMessage, 'test.js', 2, 42, noSuchFileError);
            this.clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
            assert.strictEqual(errorStub.callCount, 1);
            // Test that no file information remains, but this particular
            // error message does (ENOENT: no such file or directory)
            Errors.onUnexpectedError(noSuchFileError);
            assert.notStrictEqual(testAppender.events[0].data.msg.indexOf(settings.noSuchFilePrefix), -1);
            assert.strictEqual(testAppender.events[0].data.msg.indexOf(settings.personalInfo), -1);
            assert.strictEqual(testAppender.events[0].data.msg.indexOf(settings.filePrefix), -1);
            assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf(settings.noSuchFilePrefix), -1);
            assert.strictEqual(testAppender.events[0].data.callstack.indexOf(settings.personalInfo), -1);
            assert.strictEqual(testAppender.events[0].data.callstack.indexOf(settings.filePrefix), -1);
            assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf(settings.stack[4].replace(settings.randomUserFile, settings.anonymizedRandomUserFile)), -1);
            assert.strictEqual(testAppender.events[0].data.callstack.split('\n').length, settings.stack.length);
            errorTelemetry.dispose();
            service.dispose();
            sinon.restore();
        }
        finally {
            Errors.setUnexpectedErrorHandler(origErrorHandler);
        }
    }));
    test('Telemetry Service sends events when telemetry is on', sinonTestFn(function () {
        const testAppender = new TestTelemetryAppender();
        const service = new TelemetryService({ appenders: [testAppender] }, new TestConfigurationService(), TestProductService);
        service.publicLog('testEvent');
        assert.strictEqual(testAppender.getEventsCount(), 1);
        service.dispose();
    }));
    test('Telemetry Service checks with config service', function () {
        let telemetryLevel = "off" /* TelemetryConfiguration.OFF */;
        const emitter = new Emitter();
        const testAppender = new TestTelemetryAppender();
        const service = new TelemetryService({
            appenders: [testAppender]
        }, new class extends TestConfigurationService {
            constructor() {
                super(...arguments);
                this.onDidChangeConfiguration = emitter.event;
            }
            getValue() {
                return telemetryLevel;
            }
        }(), TestProductService);
        assert.strictEqual(service.telemetryLevel, 0 /* TelemetryLevel.NONE */);
        telemetryLevel = "all" /* TelemetryConfiguration.ON */;
        emitter.fire({ affectsConfiguration: () => true });
        assert.strictEqual(service.telemetryLevel, 3 /* TelemetryLevel.USAGE */);
        telemetryLevel = "error" /* TelemetryConfiguration.ERROR */;
        emitter.fire({ affectsConfiguration: () => true });
        assert.strictEqual(service.telemetryLevel, 2 /* TelemetryLevel.ERROR */);
        service.dispose();
    });
    test('Unexpected Error Telemetry removes Windows PII but preserves code path', sinonTestFn(function () {
        const origErrorHandler = Errors.errorHandler.getUnexpectedErrorHandler();
        Errors.setUnexpectedErrorHandler(() => { });
        try {
            const testAppender = new TestTelemetryAppender();
            const service = new TestErrorTelemetryService({ appenders: [testAppender] });
            const errorTelemetry = new ErrorTelemetry(service);
            const windowsUserPath = 'c:/Users/bpasero/AppData/Local/Programs/Microsoft%20VS%20Code%20Insiders/resources/app/';
            const codePath = 'out/vs/workbench/workbench.desktop.main.js';
            const stack = [
                `    at cTe.gc (vscode-file://vscode-app/${windowsUserPath}${codePath}:2724:81492)`,
                `    at async cTe.setInput (vscode-file://vscode-app/${windowsUserPath}${codePath}:2724:80650)`,
                `    at async qJe.S (vscode-file://vscode-app/${windowsUserPath}${codePath}:698:58520)`,
                `    at async qJe.L (vscode-file://vscode-app/${windowsUserPath}${codePath}:698:57080)`,
                `    at async qJe.openEditor (vscode-file://vscode-app/${windowsUserPath}${codePath}:698:56162)`
            ];
            const windowsError = new Error('The editor could not be opened because the file was not found.');
            windowsError.stack = stack.join('\n');
            Errors.onUnexpectedError(windowsError);
            this.clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
            assert.strictEqual(testAppender.getEventsCount(), 1);
            // Verify PII (username and path) is removed
            assert.strictEqual(testAppender.events[0].data.callstack.indexOf('bpasero'), -1);
            assert.strictEqual(testAppender.events[0].data.callstack.indexOf('Users'), -1);
            assert.strictEqual(testAppender.events[0].data.callstack.indexOf('c:/Users'), -1);
            // Verify important code path is preserved
            assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf(codePath), -1);
            assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf('out/vs/workbench'), -1);
            errorTelemetry.dispose();
            service.dispose();
        }
        finally {
            Errors.setUnexpectedErrorHandler(origErrorHandler);
        }
    }));
    test('Uncaught Error Telemetry removes Windows PII but preserves code path', sinonTestFn(function () {
        const errorStub = sinon.stub();
        mainWindow.onerror = errorStub;
        const testAppender = new TestTelemetryAppender();
        const service = new TestErrorTelemetryService({ appenders: [testAppender] });
        const errorTelemetry = new ErrorTelemetry(service);
        const windowsUserPath = 'c:/Users/bpasero/AppData/Local/Programs/Microsoft%20VS%20Code%20Insiders/resources/app/';
        const codePath = 'out/vs/workbench/workbench.desktop.main.js';
        const stack = [
            `    at cTe.gc (vscode-file://vscode-app/${windowsUserPath}${codePath}:2724:81492)`,
            `    at async cTe.setInput (vscode-file://vscode-app/${windowsUserPath}${codePath}:2724:80650)`,
            `    at async qJe.S (vscode-file://vscode-app/${windowsUserPath}${codePath}:698:58520)`
        ];
        const windowsError = new Error('The editor could not be opened because the file was not found.');
        windowsError.stack = stack.join('\n');
        mainWindow.onerror('The editor could not be opened because the file was not found.', 'test.js', 2, 42, windowsError);
        this.clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
        assert.strictEqual(errorStub.callCount, 1);
        // Verify PII (username and path) is removed
        assert.strictEqual(testAppender.events[0].data.callstack.indexOf('bpasero'), -1);
        assert.strictEqual(testAppender.events[0].data.callstack.indexOf('Users'), -1);
        assert.strictEqual(testAppender.events[0].data.callstack.indexOf('c:/Users'), -1);
        // Verify important code path is preserved
        assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf(codePath), -1);
        assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf('out/vs/workbench'), -1);
        errorTelemetry.dispose();
        service.dispose();
        sinon.restore();
    }));
    test('Unexpected Error Telemetry removes macOS PII but preserves code path', sinonTestFn(function () {
        const origErrorHandler = Errors.errorHandler.getUnexpectedErrorHandler();
        Errors.setUnexpectedErrorHandler(() => { });
        try {
            const testAppender = new TestTelemetryAppender();
            const service = new TestErrorTelemetryService({ appenders: [testAppender] });
            const errorTelemetry = new ErrorTelemetry(service);
            const macUserPath = 'Applications/Visual%20Studio%20Code%20-%20Insiders.app/Contents/Resources/app/';
            const codePath = 'out/vs/workbench/workbench.desktop.main.js';
            const stack = [
                `    at uTe.gc (vscode-file://vscode-app/${macUserPath}${codePath}:2720:81492)`,
                `    at async uTe.setInput (vscode-file://vscode-app/${macUserPath}${codePath}:2720:80650)`,
                `    at async JJe.S (vscode-file://vscode-app/${macUserPath}${codePath}:698:58520)`,
                `    at async JJe.L (vscode-file://vscode-app/${macUserPath}${codePath}:698:57080)`,
                `    at async JJe.openEditor (vscode-file://vscode-app/${macUserPath}${codePath}:698:56162)`
            ];
            const macError = new Error('The editor could not be opened because the file was not found.');
            macError.stack = stack.join('\n');
            Errors.onUnexpectedError(macError);
            this.clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
            assert.strictEqual(testAppender.getEventsCount(), 1);
            // Verify PII (application path) is removed
            assert.strictEqual(testAppender.events[0].data.callstack.indexOf('Applications/Visual'), -1);
            assert.strictEqual(testAppender.events[0].data.callstack.indexOf('Visual%20Studio%20Code'), -1);
            // Verify important code path is preserved
            assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf(codePath), -1);
            assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf('out/vs/workbench'), -1);
            errorTelemetry.dispose();
            service.dispose();
        }
        finally {
            Errors.setUnexpectedErrorHandler(origErrorHandler);
        }
    }));
    test('Uncaught Error Telemetry removes macOS PII but preserves code path', sinonTestFn(function () {
        const errorStub = sinon.stub();
        mainWindow.onerror = errorStub;
        const testAppender = new TestTelemetryAppender();
        const service = new TestErrorTelemetryService({ appenders: [testAppender] });
        const errorTelemetry = new ErrorTelemetry(service);
        const macUserPath = 'Applications/Visual%20Studio%20Code%20-%20Insiders.app/Contents/Resources/app/';
        const codePath = 'out/vs/workbench/workbench.desktop.main.js';
        const stack = [
            `    at uTe.gc (vscode-file://vscode-app/${macUserPath}${codePath}:2720:81492)`,
            `    at async uTe.setInput (vscode-file://vscode-app/${macUserPath}${codePath}:2720:80650)`,
            `    at async JJe.S (vscode-file://vscode-app/${macUserPath}${codePath}:698:58520)`
        ];
        const macError = new Error('The editor could not be opened because the file was not found.');
        macError.stack = stack.join('\n');
        mainWindow.onerror('The editor could not be opened because the file was not found.', 'test.js', 2, 42, macError);
        this.clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
        assert.strictEqual(errorStub.callCount, 1);
        // Verify PII (application path) is removed
        assert.strictEqual(testAppender.events[0].data.callstack.indexOf('Applications/Visual'), -1);
        assert.strictEqual(testAppender.events[0].data.callstack.indexOf('Visual%20Studio%20Code'), -1);
        // Verify important code path is preserved
        assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf(codePath), -1);
        assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf('out/vs/workbench'), -1);
        errorTelemetry.dispose();
        service.dispose();
        sinon.restore();
    }));
    test('Unexpected Error Telemetry removes Linux PII but preserves code path', sinonTestFn(function () {
        const origErrorHandler = Errors.errorHandler.getUnexpectedErrorHandler();
        Errors.setUnexpectedErrorHandler(() => { });
        try {
            const testAppender = new TestTelemetryAppender();
            const service = new TestErrorTelemetryService({ appenders: [testAppender] });
            const errorTelemetry = new ErrorTelemetry(service);
            const linuxUserPath = '/home/parallels/GitDevelopment/vscode-node-sqlite3-perf/';
            const linuxSystemPath = 'usr/share/code-insiders/resources/app/';
            const codePath = 'out/vs/workbench/workbench.desktop.main.js';
            const stack = [
                `    at _kt.G (vscode-file://vscode-app/${linuxSystemPath}${codePath}:3825:65940)`,
                `    at _kt.F (vscode-file://vscode-app/${linuxSystemPath}${codePath}:3825:65765)`,
                `    at async axt.L (vscode-file://vscode-app/${linuxSystemPath}${codePath}:3830:9998)`,
                `    at async axt.readStream (vscode-file://vscode-app/${linuxSystemPath}${codePath}:3830:9773)`,
                `    at async mye.Eb (vscode-file://vscode-app/${linuxSystemPath}${codePath}:1313:12359)`
            ];
            const linuxError = new Error(`Invalid fake file 'git:${linuxUserPath}index.js.git?{"path":"${linuxUserPath}index.js","ref":""}' (Canceled: Canceled)`);
            linuxError.stack = stack.join('\n');
            Errors.onUnexpectedError(linuxError);
            this.clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
            assert.strictEqual(testAppender.getEventsCount(), 1);
            // Verify PII (username and home directory) is removed
            assert.strictEqual(testAppender.events[0].data.msg.indexOf('parallels'), -1);
            assert.strictEqual(testAppender.events[0].data.msg.indexOf('/home/parallels'), -1);
            assert.strictEqual(testAppender.events[0].data.msg.indexOf('GitDevelopment'), -1);
            assert.strictEqual(testAppender.events[0].data.callstack.indexOf('parallels'), -1);
            assert.strictEqual(testAppender.events[0].data.callstack.indexOf('/home/parallels'), -1);
            // Verify important code path is preserved
            assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf(codePath), -1);
            assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf('out/vs/workbench'), -1);
            errorTelemetry.dispose();
            service.dispose();
        }
        finally {
            Errors.setUnexpectedErrorHandler(origErrorHandler);
        }
    }));
    test('Uncaught Error Telemetry removes Linux PII but preserves code path', sinonTestFn(function () {
        const errorStub = sinon.stub();
        mainWindow.onerror = errorStub;
        const testAppender = new TestTelemetryAppender();
        const service = new TestErrorTelemetryService({ appenders: [testAppender] });
        const errorTelemetry = new ErrorTelemetry(service);
        const linuxUserPath = '/home/parallels/GitDevelopment/vscode-node-sqlite3-perf/';
        const linuxSystemPath = 'usr/share/code-insiders/resources/app/';
        const codePath = 'out/vs/workbench/workbench.desktop.main.js';
        const stack = [
            `    at _kt.G (vscode-file://vscode-app/${linuxSystemPath}${codePath}:3825:65940)`,
            `    at _kt.F (vscode-file://vscode-app/${linuxSystemPath}${codePath}:3825:65765)`,
            `    at async axt.L (vscode-file://vscode-app/${linuxSystemPath}${codePath}:3830:9998)`
        ];
        const linuxError = new Error(`Unable to read file 'git:${linuxUserPath}index.js.git'`);
        linuxError.stack = stack.join('\n');
        mainWindow.onerror(`Unable to read file 'git:${linuxUserPath}index.js.git'`, 'test.js', 2, 42, linuxError);
        this.clock.tick(ErrorTelemetry.ERROR_FLUSH_TIMEOUT);
        assert.strictEqual(errorStub.callCount, 1);
        // Verify PII (username and home directory) is removed
        assert.strictEqual(testAppender.events[0].data.msg.indexOf('parallels'), -1);
        assert.strictEqual(testAppender.events[0].data.msg.indexOf('/home/parallels'), -1);
        assert.strictEqual(testAppender.events[0].data.msg.indexOf('GitDevelopment'), -1);
        assert.strictEqual(testAppender.events[0].data.callstack.indexOf('parallels'), -1);
        assert.strictEqual(testAppender.events[0].data.callstack.indexOf('/home/parallels'), -1);
        // Verify important code path is preserved
        assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf(codePath), -1);
        assert.notStrictEqual(testAppender.events[0].data.callstack.indexOf('out/vs/workbench'), -1);
        errorTelemetry.dispose();
        service.dispose();
        sinon.restore();
    }));
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVsZW1ldHJ5U2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9wb3JpZGhpL2RldmVsb3BtZW50L3B1a3UtdnMtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdGVsZW1ldHJ5L3Rlc3QvYnJvd3Nlci90ZWxlbWV0cnlTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sS0FBSyxLQUFLLE1BQU0sT0FBTyxDQUFDO0FBQy9CLE9BQU8sU0FBUyxNQUFNLFlBQVksQ0FBQztBQUNuQyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDaEUsT0FBTyxLQUFLLE1BQU0sTUFBTSxtQ0FBbUMsQ0FBQztBQUM1RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDM0QsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sZ0VBQWdFLENBQUM7QUFDMUcsT0FBTyxPQUFPLE1BQU0sb0NBQW9DLENBQUM7QUFFekQsT0FBTyxjQUFjLE1BQU0saUNBQWlDLENBQUM7QUFFN0QsT0FBTyxFQUEyQixnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzdGLE9BQU8sRUFBc0IsWUFBWSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFbEYsTUFBTSxXQUFXLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBRXJDLE1BQU0scUJBQXFCO0lBSzFCO1FBQ0MsSUFBSSxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUM7UUFDakIsSUFBSSxDQUFDLFVBQVUsR0FBRyxLQUFLLENBQUM7SUFDekIsQ0FBQztJQUVNLEdBQUcsQ0FBQyxTQUFpQixFQUFFLElBQVU7UUFDdkMsSUFBSSxD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