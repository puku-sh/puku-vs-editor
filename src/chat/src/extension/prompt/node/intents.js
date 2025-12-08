"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreamingEditsController = exports.LeadingMarkdownStreaming = exports.NoopReplyInterpreter = exports.StreamingMarkdownReplyInterpreter = exports.ReplyInterpreterMetaData = exports.NullIntentInvocation = exports.TelemetryData = exports.promptResultMetadata = exports.nullRenderPromptResult = exports.IntentError = void 0;
exports.applyEdits = applyEdits;
const positionOffsetTransformer_1 = require("../../../platform/editing/common/positionOffsetTransformer");
const async_1 = require("../../../util/vs/base/common/async");
const streaming_1 = require("../../prompts/node/inline/utils/streaming");
const conversation_1 = require("../common/conversation");
const streamingEdits_1 = require("./streamingEdits");
/**
 * An error type that can be thrown from {@link IIntent.invoke} to signal an
 * ordinary error to the user.
 *
 * note: this is only treated specially in stests at the moment
 */
class IntentError extends Error {
    constructor(error) {
        super(typeof error === 'string' ? error : error.message);
        this.errorDetails = typeof error === 'string' ? { message: error } : error;
    }
}
exports.IntentError = IntentError;
const nullRenderPromptResult = () => ({
    hasIgnoredFiles: false,
    messages: [],
    omittedReferences: [],
    references: [],
    tokenCount: 0,
    metadata: (0, exports.promptResultMetadata)([]),
});
exports.nullRenderPromptResult = nullRenderPromptResult;
const promptResultMetadata = (metadata) => ({
    get(key) {
        return metadata.find(m => m instanceof key);
    },
    getAll(key) {
        return metadata.filter(m => m instanceof key);
    }
});
exports.promptResultMetadata = promptResultMetadata;
/**
 * Generic marker type of telemetry data that can be passed
 * along in an opaque way
 */
class TelemetryData {
}
exports.TelemetryData = TelemetryData;
class NullIntentInvocation {
    constructor(intent, location, endpoint) {
        this.intent = intent;
        this.location = location;
        this.endpoint = endpoint;
    }
    async buildPrompt() {
        return (0, exports.nullRenderPromptResult)();
    }
}
exports.NullIntentInvocation = NullIntentInvocation;
class ReplyInterpreterMetaData extends conversation_1.PromptMetadata {
    constructor(replyInterpreter) {
        super();
        this.replyInterpreter = replyInterpreter;
    }
}
exports.ReplyInterpreterMetaData = ReplyInterpreterMetaData;
class StreamingMarkdownReplyInterpreter {
    async processResponse(context, inputStream, outputStream, token) {
        for await (const part of inputStream) {
            outputStream.markdown(part.delta.text);
        }
    }
}
exports.StreamingMarkdownReplyInterpreter = StreamingMarkdownReplyInterpreter;
class NoopReplyInterpreter {
    async processResponse() {
        return undefined;
    }
}
exports.NoopReplyInterpreter = NoopReplyInterpreter;
function applyEdits(text, edits) {
    const transformer = new positionOffsetTransformer_1.PositionOffsetTransformer(text);
    const offsetEdits = edits.map(e => {
        const offsetRange = transformer.toOffsetRange(e.range);
        return ({
            startOffset: offsetRange.start,
            endOffset: offsetRange.endExclusive,
            text: e.newText
        });
    });
    // sort is stable: does not change the order of edits that start at the same offset
    offsetEdits.sort((a, b) => a.startOffset - b.startOffset || a.endOffset - b.endOffset);
    for (let i = offsetEdits.length - 1; i >= 0; i--) {
        const edit = offsetEdits[i];
        text = text.substring(0, edit.startOffset) + edit.text + text.substring(edit.endOffset);
    }
    return text;
}
exports.LeadingMarkdownStreaming = {
    Mute: streaming_1.StreamPipe.discard(),
    Emit: streaming_1.StreamPipe.identity(),
};
class StreamingEditsController {
    constructor(_outputStream, _leadingMarkdownStreamPipe, _earlyStopping, textPieceClassifier, streamingEditsStrategy) {
        this._outputStream = _outputStream;
        this._leadingMarkdownStreamPipe = _leadingMarkdownStreamPipe;
        this._earlyStopping = _earlyStopping;
        this._responseStream = new async_1.AsyncIterableSource();
        this._lastLength = 0;
        this._leftFirstCodeBlock = false;
        const textPieceStream = textPieceClassifier(this._responseStream.asyncIterable);
        this._streamingPromise = this._process(textPieceStream, streamingEditsStrategy);
    }
    async _process(textPieceStream, streamingEditsStrategy) {
        const leadingMarkdown = new async_1.AsyncIterableSource();
        const processedMarkdown = this._leadingMarkdownStreamPipe(leadingMarkdown.asyncIterable);
        (0, streaming_1.forEachStreamed)(processedMarkdown, item => this._outputStream.markdown(item));
        const firstCodeBlockText = new async_1.AsyncIterableSource();
        const firstCodeBlockLines = (0, streamingEdits_1.streamLines)(firstCodeBlockText.asyncIterable);
        const streamingEditsPromise = streamingEditsStrategy.processStream(firstCodeBlockLines);
        const textPieceStreamWithoutDelimiters = textPieceStream.filter(piece => piece.kind !== 2 /* TextPieceKind.Delimiter */);
        const reader = new streamingEdits_1.AsyncReader(textPieceStreamWithoutDelimiters[Symbol.asyncIterator]());
        // Read all the markdown pieces until the first code block
        await reader.readWhile(piece => piece.kind === 0 /* TextPieceKind.OutsideCodeBlock */, piece => leadingMarkdown.emitOne(piece.value));
        leadingMarkdown.resolve();
        // Read the first code block
        await reader.readWhile(piece => piece.kind === 1 /* TextPieceKind.InsideCodeBlock */, piece => firstCodeBlockText.emitOne(piece.value));
        this._leftFirstCodeBlock = true;
        // Finish reading the rest of the text
        await reader.consumeToEnd();
        firstCodeBlockText.resolve();
        return streamingEditsPromise;
    }
    update(newText) {
        if (this._earlyStopping === 1 /* EarlyStopping.StopAfterFirstCodeBlock */ && this._leftFirstCodeBlock) {
            // stop was requested!
            return { shouldFinish: true };
        }
        const chunk = newText.slice(this._lastLength);
        this._lastLength = newText.length;
        this._responseStream.emitOne(chunk);
        return { shouldFinish: false };
    }
    async finish() {
        this._responseStream.resolve();
        return await this._streamingPromise;
    }
}
exports.StreamingEditsController = StreamingEditsController;
//# sourceMappingURL=intents.js.map