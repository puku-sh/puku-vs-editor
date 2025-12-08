"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationalTelemetryData = void 0;
exports.createTelemetryWithId = createTelemetryWithId;
exports.extendUserMessageTelemetryData = extendUserMessageTelemetryData;
exports.sendUserMessageTelemetry = sendUserMessageTelemetry;
exports.sendModelMessageTelemetry = sendModelMessageTelemetry;
exports.sendOffTopicMessageTelemetry = sendOffTopicMessageTelemetry;
exports.sendConversationalMessageTelemetry = sendConversationalMessageTelemetry;
exports.sendSuggestionShownTelemetryData = sendSuggestionShownTelemetryData;
exports.sendUserActionTelemetry = sendUserActionTelemetry;
exports.getCodeBlocks = getCodeBlocks;
const commonTypes_1 = require("../../../platform/chat/common/commonTypes");
const telemetryData_1 = require("../../../platform/telemetry/common/telemetryData");
const uuid_1 = require("../../../util/vs/base/common/uuid");
function createTelemetryWithId() {
    const uniqueId = (0, uuid_1.generateUuid)();
    const baseTelemetry = telemetryData_1.TelemetryData.createAndMarkAsIssued({ messageId: uniqueId });
    return new ConversationalTelemetryData(baseTelemetry);
}
class ConversationalTelemetryData {
    get properties() { return this.raw.properties; }
    get measurements() { return this.raw.measurements; }
    constructor(raw) {
        this.raw = raw;
    }
    markAsDisplayed() {
        this.raw.markAsDisplayed();
    }
    extendedBy(properties, measurements) {
        const newTelemetryData = this.raw.extendedBy(properties, measurements);
        return new ConversationalTelemetryData(newTelemetryData);
    }
}
exports.ConversationalTelemetryData = ConversationalTelemetryData;
function extendUserMessageTelemetryData(conversation, conversationId, location, message, promptTokenLen, suggestion, baseTelemetry) {
    const properties = {
        source: 'user',
        turnIndex: (conversation.turns.length - 1).toString(),
        conversationId,
        uiKind: commonTypes_1.ChatLocation.toString(location)
    };
    const measurements = {
        promptTokenLen: promptTokenLen,
        messageCharLen: message.length,
    };
    if (suggestion) {
        properties.suggestion = suggestion;
    }
    baseTelemetry = baseTelemetry.extendedBy(properties, measurements);
    return baseTelemetry;
}
function sendUserMessageTelemetry(telemetryService, location, requestId, message, offTopic, doc, baseTelemetry, modeName) {
    if (offTopic !== undefined) {
        baseTelemetry = baseTelemetry.extendedBy({ offTopic: offTopic.toString() });
    }
    baseTelemetry = baseTelemetry.extendedBy({ headerRequestId: requestId });
    sendConversationalMessageTelemetry(telemetryService, doc, location, message, { mode: modeName }, {}, baseTelemetry);
}
function sendModelMessageTelemetry(telemetryService, conversation, location, appliedText, requestId, doc, baseTelemetry, modeName) {
    // Get the languages of code blocks within the message
    const codeBlockLanguages = getCodeBlocks(appliedText);
    sendConversationalMessageTelemetry(telemetryService, doc, location, appliedText, {
        source: 'model',
        turnIndex: conversation.turns.length.toString(),
        conversationId: conversation.sessionId,
        headerRequestId: requestId,
        uiKind: commonTypes_1.ChatLocation.toString(location),
        codeBlockLanguages: JSON.stringify({ ...codeBlockLanguages }),
        mode: modeName,
    }, { messageCharLen: appliedText.length, numCodeBlocks: codeBlockLanguages.length }, baseTelemetry);
}
function sendOffTopicMessageTelemetry(telemetryService, conversation, location, appliedText, userMessageId, doc, baseTelemetry) {
    sendConversationalMessageTelemetry(telemetryService, doc, location, appliedText, {
        source: 'offTopic',
        turnIndex: conversation.turns.length.toString(),
        conversationId: conversation.sessionId,
        userMessageId: userMessageId,
        uiKind: commonTypes_1.ChatLocation.toString(location),
    }, { messageCharLen: appliedText.length }, baseTelemetry);
}
/** Create new telemetry data based on baseTelemetryData and send `conversation.message` event  */
function sendConversationalMessageTelemetry(telemetryService, document, location, messageText, properties, measurements, baseTelemetry) {
    const enhancedProperties = {
        ...(messageText ? { messageText: messageText } : {}),
        ...properties,
    };
    if (document) {
        properties.languageId = document.languageId;
        measurements.documentLength = document.getText().length;
    }
    const standardTelemetryData = baseTelemetry.extendedBy(properties, measurements);
    const enhancedTelemetryLogger = baseTelemetry.extendedBy(enhancedProperties);
    // Telemetrize the message in standard and enhanced telemetry
    // Enhanced telemetry will not be sent if the user isn't opted in, same as for ghostText
    const prefix = telemetryPrefixForLocation(location);
    telemetryService.sendGHTelemetryEvent(`${prefix}.message`, standardTelemetryData.raw.properties, standardTelemetryData.raw.measurements);
    telemetryService.sendEnhancedGHTelemetryEvent(`${prefix}.messageText`, enhancedTelemetryLogger.raw.properties, enhancedTelemetryLogger.raw.measurements);
    telemetryService.sendInternalMSFTTelemetryEvent(`${prefix}.messageText`, enhancedTelemetryLogger.raw.properties, enhancedTelemetryLogger.raw.measurements);
    return standardTelemetryData.raw;
}
function sendSuggestionShownTelemetryData(telemetryService, suggestion, messageId, suggestionId, doc) {
    const telemetryData = sendUserActionTelemetry(telemetryService, doc, {
        suggestion: suggestion,
        messageId: messageId,
        suggestionId: suggestionId,
    }, {}, 'conversation.suggestionShown');
    return telemetryData;
}
/** Create new telemetry data based on baseTelemetryData and send event with name */
function sendUserActionTelemetry(telemetryService, document, properties, measurements, name, baseTelemetry) {
    const telemetryData = baseTelemetry ?? telemetryData_1.TelemetryData.createAndMarkAsIssued();
    if (document) {
        properties.languageId = document.languageId;
        measurements.documentLength = document.getText().length;
    }
    const standardTelemetryData = telemetryData.extendedBy(properties, measurements);
    telemetryService.sendGHTelemetryEvent(name, standardTelemetryData.properties, standardTelemetryData.measurements);
    return standardTelemetryData;
}
function telemetryPrefixForLocation(location) {
    switch (location) {
        case commonTypes_1.ChatLocation.Editor:
            return 'inlineConversation';
        case commonTypes_1.ChatLocation.EditingSession:
            return 'editingSession';
        case commonTypes_1.ChatLocation.Panel:
        default:
            return 'conversation';
    }
}
function getCodeBlocks(text) {
    const lines = text.split('\n');
    const codeBlocks = [];
    let codeBlockState;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (codeBlockState) {
            if (new RegExp(`^\\s*${codeBlockState.delimiter}\\s*$`).test(line)) {
                codeBlocks.push({
                    languageId: codeBlockState.languageId,
                    totalLines: codeBlockState.totalLines
                });
                codeBlockState = undefined;
            }
            else {
                codeBlockState.totalLines++;
            }
        }
        else {
            const match = line.match(/^(\s*)(`{3,}|~{3,})(\w*)/);
            if (match) {
                codeBlockState = {
                    delimiter: match[2],
                    languageId: match[3],
                    totalLines: 0
                };
            }
        }
    }
    return codeBlocks;
}
//# sourceMappingURL=telemetry.js.map