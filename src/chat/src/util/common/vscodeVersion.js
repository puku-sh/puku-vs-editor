"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeVSCodeVersion = sanitizeVSCodeVersion;
/**
 * Sanitizes the version of VS Code to remove the minor version bump and -insider suffix
 * @param vsCodeVersion The version of VS Code to sanitize i.e. 1.77.0-insider
 * @returns The sanitized version of VS Code i.e. 1.77
 */
function sanitizeVSCodeVersion(vsCodeVersion) {
    const splitVersion = vsCodeVersion.split('.');
    return `${splitVersion[0]}.${splitVersion[1]}`;
}
//# sourceMappingURL=vscodeVersion.js.map