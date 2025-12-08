"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleException = handleException;
const logger_1 = require("./logger");
const networking_1 = require("./networking");
const progress_1 = require("./progress");
const oomCodes = new Set(['ERR_WORKER_OUT_OF_MEMORY', 'ENOMEM']);
function isOomError(error) {
    return (oomCodes.has(error.code ?? '') ||
        // happens in loadWasmLanguage
        (error.name === 'RangeError' && error.message === 'WebAssembly.Memory(): could not allocate memory'));
}
function handleException(accessor, err, origin, _logger = logger_1.logger) {
    if ((0, networking_1.isAbortError)(err)) {
        // ignore cancelled fetch requests
        return;
    }
    const statusReporter = accessor.get(progress_1.ICompletionsStatusReporter);
    if (err instanceof Error) {
        const error = err;
        if (isOomError(error)) {
            statusReporter.setWarning('Out of memory');
        }
        else if (error.code === 'EMFILE' || error.code === 'ENFILE') {
            statusReporter.setWarning('Too many open files');
        }
        else if (error.code === 'CopilotPromptLoadFailure') {
            statusReporter.setWarning('Corrupted Copilot installation');
        }
        else if (`${error.code}`.startsWith('CopilotPromptWorkerExit')) {
            statusReporter.setWarning('Worker unexpectedly exited');
        }
        else if (error.syscall === 'uv_cwd' && error.code === 'ENOENT') {
            statusReporter.setWarning('Current working directory does not exist');
        }
    }
    _logger.exception(accessor, err, origin);
}
//# sourceMappingURL=defaultHandlers.js.map