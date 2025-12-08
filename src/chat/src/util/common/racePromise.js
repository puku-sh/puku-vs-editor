"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.raceTimeoutAndCancellationError = raceTimeoutAndCancellationError;
const async_1 = require("../vs/base/common/async");
const cancellation_1 = require("../vs/base/common/cancellation");
const errors_1 = require("../vs/base/common/errors");
// sentinel value to indicate cancellation
const CANCELLED = Symbol('cancelled');
/**
 * Races a promise against a cancellation token and a timeout.
 * @param promiseGenerator A function that generates the promise to race against cancellation and timeout.
 * @param parentToken The cancellation token to use.
 * @param timeoutInMs The timeout in milliseconds.
 * @param timeoutMessage The message to use for the timeout error.
 * @returns The result of the promise if it completes before the timeout, or throws an error if it times out or is cancelled.
 */
async function raceTimeoutAndCancellationError(promiseGenerator, parentToken, timeoutInMs, timeoutMessage) {
    const cancellationSource = new cancellation_1.CancellationTokenSource(parentToken);
    try {
        const result = await (0, async_1.raceTimeout)((0, async_1.raceCancellation)(promiseGenerator(cancellationSource.token), cancellationSource.token, CANCELLED), timeoutInMs);
        if (result === CANCELLED) { // cancelled sentinel from raceCancellation
            throw new errors_1.CancellationError();
        }
        if (result === undefined) { // timeout sentinel from raceTimeout
            // signal ongoing work to cancel in the promise
            cancellationSource.cancel();
            throw new Error(timeoutMessage);
        }
        return result;
    }
    finally {
        cancellationSource.dispose();
    }
}
//# sourceMappingURL=racePromise.js.map