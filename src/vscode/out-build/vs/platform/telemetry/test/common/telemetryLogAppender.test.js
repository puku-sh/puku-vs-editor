/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Event } from '../../../../base/common/event.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { IEnvironmentService } from '../../../environment/common/environment.js';
import { TestInstantiationService } from '../../../instantiation/test/common/instantiationServiceMock.js';
import { AbstractLogger, DEFAULT_LOG_LEVEL, LogLevel } from '../../../log/common/log.js';
import { IProductService } from '../../../product/common/productService.js';
import { TelemetryLogAppender } from '../../common/telemetryLogAppender.js';
class TestTelemetryLogger extends AbstractLogger {
    constructor(logLevel = DEFAULT_LOG_LEVEL) {
        super();
        this.logs = [];
        this.setLevel(logLevel);
    }
    trace(message, ...args) {
        if (this.canLog(LogLevel.Trace)) {
            this.logs.push(message + JSON.stringify(args));
        }
    }
    debug(message, ...args) {
        if (this.canLog(LogLevel.Debug)) {
            this.logs.push(message);
        }
    }
    info(message, ...args) {
        if (this.canLog(LogLevel.Info)) {
            this.logs.push(message);
        }
    }
    warn(message, ...args) {
        if (this.canLog(LogLevel.Warning)) {
            this.logs.push(message.toString());
        }
    }
    error(message, ...args) {
        if (this.canLog(LogLevel.Error)) {
            this.logs.push(message);
        }
    }
    flush() { }
}
export class TestTelemetryLoggerService {
    constructor(logLevel) {
        this.logLevel = logLevel;
        this.onDidChangeVisibility = Event.None;
        this.onDidChangeLogLevel = Event.None;
        this.onDidChangeLoggers = Event.None;
    }
    getLogger() {
        return this.logger;
    }
    createLogger() {
        if (!this.logger) {
            this.logger = new TestTelemetryLogger(this.logLevel);
        }
        return this.logger;
    }
    setLogLevel() { }
    getLogLevel() { return LogLevel.Info; }
    setVisibility() { }
    getDefaultLogLevel() { return this.logLevel; }
    registerLogger() { }
    deregisterLogger() { }
    getRegisteredLoggers() { return []; }
    getRegisteredLogger() { return undefined; }
}
suite('TelemetryLogAdapter', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('Do not Log Telemetry if log level is not trace', async () => {
        const testLoggerService = new TestTelemetryLoggerService(DEFAULT_LOG_LEVEL);
        const testInstantiationService = new TestInstantiationService();
        const testObject = new TelemetryLogAppender('', false, testLoggerService, testInstantiationService.stub(IEnvironmentService, {}), testInstantiationService.stub(IProductService, {}));
        testObject.log('testEvent', { hello: 'world', isTrue: true, numberBetween1And3: 2 });
        assert.strictEqual(testLoggerService.createLogger().logs.length, 0);
        testObject.dispose();
        testInstantiationService.dispose();
    });
    test('Log Telemetry if log level is trace', async () => {
        const testLoggerService = new TestTelemetryLoggerService(LogLevel.Trace);
        const testInstantiationService = new TestInstantiationService();
        const testObject = new TelemetryLogAppender('', false, testLoggerService, testInstantiationService.stub(IEnvironmentService, {}), testInstantiationService.stub(IProductService, {}));
        testObject.log('testEvent', { hello: 'world', isTrue: true, numberBetween1And3: 2 });
        assert.strictEqual(testLoggerService.createLogger().logs[0], 'telemetry/testEvent' + JSON.stringify([{
                properties: {
                    hello: 'world',
                },
                measurements: {
                    isTrue: 1, numberBetween1And3: 2
                }
            }]));
        testObject.dispose();
        testInstantiationService.dispose();
    });
});
//# sourceMappingURL=telemetryLogAppender.test.js.map