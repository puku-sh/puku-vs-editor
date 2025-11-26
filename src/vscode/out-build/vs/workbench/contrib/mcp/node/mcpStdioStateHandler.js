/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { TimeoutTimer } from '../../../../base/common/async.js';
import { killTree } from '../../../../base/node/processes.js';
import { isWindows } from '../../../../base/common/platform.js';
var McpProcessState;
(function (McpProcessState) {
    McpProcessState[McpProcessState["Running"] = 0] = "Running";
    McpProcessState[McpProcessState["StdinEnded"] = 1] = "StdinEnded";
    McpProcessState[McpProcessState["KilledPolite"] = 2] = "KilledPolite";
    McpProcessState[McpProcessState["KilledForceful"] = 3] = "KilledForceful";
})(McpProcessState || (McpProcessState = {}));
/**
 * Manages graceful shutdown of MCP stdio connections following the MCP specification.
 *
 * Per spec, shutdown should:
 * 1. Close the input stream to the child process
 * 2. Wait for the server to exit, or send SIGTERM if it doesn't exit within 10 seconds
 * 3. Send SIGKILL if the server doesn't exit within 10 seconds after SIGTERM
 * 4. Allow forceful killing if called twice
 */
export class McpStdioStateHandler {
    static { this.GRACE_TIME_MS = 10_000; }
    get stopped() {
        return this._procState !== 0 /* McpProcessState.Running */;
    }
    constructor(_child, _graceTimeMs = McpStdioStateHandler.GRACE_TIME_MS) {
        this._child = _child;
        this._graceTimeMs = _graceTimeMs;
        this._procState = 0 /* McpProcessState.Running */;
    }
    /**
     * Initiates graceful shutdown. If called while shutdown is already in progress,
     * forces immediate termination.
     */
    stop() {
        if (this._procState === 0 /* McpProcessState.Running */) {
            let graceTime = this._graceTimeMs;
            try {
                this._child.stdin.end();
            }
            catch (error) {
                // If stdin.end() fails, continue with termination sequence
                // This can happen if the stream is already in an error state
                graceTime = 1;
            }
            this._procState = 1 /* McpProcessState.StdinEnded */;
            this._nextTimeout = new TimeoutTimer(() => this.killPolite(), graceTime);
        }
        else {
            this._nextTimeout?.dispose();
            this.killForceful();
        }
    }
    async killPolite() {
        this._procState = 2 /* McpProcessState.KilledPolite */;
        this._nextTimeout = new TimeoutTimer(() => this.killForceful(), this._graceTimeMs);
        if (this._child.pid) {
            if (!isWindows) {
                await killTree(this._child.pid, false).catch(() => {
                    this._child.kill('SIGTERM');
                });
            }
        }
        else {
            this._child.kill('SIGTERM');
        }
    }
    async killForceful() {
        this._procState = 3 /* McpProcessState.KilledForceful */;
        if (this._child.pid) {
            await killTree(this._child.pid, true).catch(() => {
                this._child.kill('SIGKILL');
            });
        }
        else {
            this._child.kill();
        }
    }
    write(message) {
        if (!this.stopped) {
            this._child.stdin.write(message + '\n');
        }
    }
    dispose() {
        this._nextTimeout?.dispose();
    }
}
//# sourceMappingURL=mcpStdioStateHandler.js.map