"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.drainStdoutAndExit = drainStdoutAndExit;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/**
 * Drains stdout and stderr, then exits the process
 * @param exitCode The process exit code
 */
async function drainStdoutAndExit(exitCode) {
    await Promise.all([drainStream(process.stdout), drainStream(process.stderr)]);
    process.exit(exitCode);
}
/**
 * Drains a writable stream
 * @param stream The stream to drain
 */
function drainStream(stream) {
    const ok = stream.write('');
    if (!ok) {
        return new Promise(resolve => {
            stream.once('drain', resolve);
        });
    }
    return Promise.resolve();
}
//# sourceMappingURL=stdout.js.map