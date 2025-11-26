/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export function getOutput(instance, startMarker) {
    if (!instance.xterm || !instance.xterm.raw) {
        return '';
    }
    const buffer = instance.xterm.raw.buffer.active;
    const startLine = Math.max(startMarker?.line ?? 0, 0);
    const endLine = buffer.length;
    const lines = new Array(endLine - startLine);
    for (let y = startLine; y < endLine; y++) {
        const line = buffer.getLine(y);
        lines[y - startLine] = line ? line.translateToString(true) : '';
    }
    let output = lines.join('\n');
    if (output.length > 16000) {
        output = output.slice(-16000);
    }
    return output;
}
//# sourceMappingURL=outputHelpers.js.map