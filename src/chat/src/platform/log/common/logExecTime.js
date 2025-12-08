"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.measureExecTime = measureExecTime;
exports.logExecTime = logExecTime;
exports.LogExecTime = LogExecTime;
exports.MeasureExecTime = MeasureExecTime;
const errors_1 = require("../../../util/vs/base/common/errors");
const stopwatch_1 = require("../../../util/vs/base/common/stopwatch");
/**
 * Helper that collects how long a block of code takes to execute.
 */
async function measureExecTime(fn, cb) {
    const sw = new stopwatch_1.StopWatch();
    try {
        const result = await fn();
        cb(sw.elapsed(), 'success', result);
        return result;
    }
    catch (error) {
        cb(sw.elapsed(), (0, errors_1.isCancellationError)(error) ? 'cancelled' : 'failed', undefined);
        throw error;
    }
}
/**
 * Helper that logs how long a block of code takes to execute.
 */
async function logExecTime(logService, name, fn, measureCb) {
    return measureExecTime(() => {
        logService.trace(`${name} started`);
        return fn();
    }, (time, status, result) => {
        logService.trace(`${name} ${status}. Elapsed ${time}`);
        measureCb?.(time, status, result);
    });
}
/**
 * Decorator that adds logging for how long the method takes to execute.
 */
function LogExecTime(getLogService, logName, measureCb) {
    return function (target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        let idPool = 0;
        descriptor.value = async function (...args) {
            const id = idPool++;
            const logService = getLogService(this);
            return logExecTime(logService, `${logName}#${id}`, () => originalMethod.apply(this, args), measureCb?.bind(this));
        };
        return descriptor;
    };
}
/**
 * Decorator that adds a callback about how long an async method takes to execute.
 */
function MeasureExecTime(cb) {
    return function (target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        descriptor.value = function (...args) {
            return measureExecTime(() => originalMethod.apply(this, args), cb.bind(this));
        };
        return descriptor;
    };
}
//# sourceMappingURL=logExecTime.js.map