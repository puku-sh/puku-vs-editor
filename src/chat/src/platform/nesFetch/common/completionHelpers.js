"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.streamLines = streamLines;
const async_1 = require("../../../util/vs/base/common/async");
const types_1 = require("../../../util/vs/base/common/types");
var LineOfText;
(function (LineOfText) {
    function make(s) {
        return s;
    }
    LineOfText.make = make;
})(LineOfText || (LineOfText = {}));
/**
 * Split an incoming stream of text to a stream of lines.
 */
function streamLines(completions, initialBuffer = '') {
    async function splitLines(emitter) {
        let buffer = initialBuffer;
        let finishReason = null;
        for await (const completion of completions) {
            const choice = completion.choices.at(0);
            (0, types_1.assertType)(choice !== undefined, 'we should have choices[0] to be defined');
            buffer += choice.text ?? '';
            finishReason = choice.finish_reason;
            do {
                const newlineIndex = buffer.indexOf('\n');
                if (newlineIndex === -1) {
                    break;
                }
                // take the first line
                const line = buffer.substring(0, newlineIndex);
                buffer = buffer.substring(newlineIndex + 1);
                emitter.emitOne({ line: LineOfText.make(line), finishReason });
            } while (true);
        }
        if (buffer.length > 0) {
            // last line which doesn't end with \n
            emitter.emitOne({ line: LineOfText.make(buffer), finishReason });
        }
    }
    return new async_1.AsyncIterableObject(splitLines);
}
//# sourceMappingURL=completionHelpers.js.map