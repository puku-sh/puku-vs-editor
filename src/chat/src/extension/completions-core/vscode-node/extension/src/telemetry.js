"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCommand = registerCommand;
exports.registerCommandWrapper = registerCommandWrapper;
const vscode_1 = require("vscode");
const instantiation_1 = require("../../../../../util/vs/platform/instantiation/common/instantiation");
const defaultHandlers_1 = require("../../lib/src/defaultHandlers");
function exception(accessor, error, origin, logger) {
    if (error instanceof Error && error.name === 'Canceled') {
        // these are VS Code cancellations
        return;
    }
    if (error instanceof Error && error.name === 'CodeExpectedError') {
        // expected errors from VS Code
        return;
    }
    (0, defaultHandlers_1.handleException)(accessor, error, origin, logger);
}
function registerCommand(accessor, command, fn) {
    const instantiationService = accessor.get(instantiation_1.IInstantiationService);
    try {
        const disposable = vscode_1.commands.registerCommand(command, async (...args) => {
            try {
                await fn(...args);
            }
            catch (error) {
                // Pass in the command string as the origin
                instantiationService.invokeFunction(exception, error, command);
            }
        });
        return disposable;
    }
    catch (error) {
        console.error(`Error registering command ${command}:`, error);
        throw error;
    }
}
// Wrapper that handles errors and cleans up the command on extension deactivation
function registerCommandWrapper(accessor, command, fn) {
    return registerCommand(accessor, command, fn);
}
//# sourceMappingURL=telemetry.js.map