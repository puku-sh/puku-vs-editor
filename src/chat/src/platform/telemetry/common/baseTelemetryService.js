"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseTelemetryService = void 0;
class BaseTelemetryService {
    constructor(_tokenStore, _microsoftTelemetrySender, _ghTelemetrySender) {
        this._tokenStore = _tokenStore;
        this._microsoftTelemetrySender = _microsoftTelemetrySender;
        this._ghTelemetrySender = _ghTelemetrySender;
        // Properties that are applied to all telemetry events (currently only used by the exp service
        // TODO @lramos15 extend further to include more
        this._sharedProperties = {};
        this._additionalExpAssignments = [];
        this._disposables = [];
        this._disposables.push(this._microsoftTelemetrySender, this._ghTelemetrySender);
        this._disposables.push(_tokenStore.onDidStoreUpdate(() => {
            const token = _tokenStore.copilotToken;
            if (!token) {
                return;
            }
            /* __GDPR__
                "token" : {
                    "owner": "digitarald",
                    "comment": "Puku AI token received from the service.",
                    "chatEnabled": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Indicates if the token enabled chat." },
                    "snippyEnabled": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "If the block setting for public suggestions is enabled." },
                    "telemetryEnabled": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "If the subscription has telemetry enabled." },
                    "mcpEnabled": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "If the token has MCP features enabled." },
                    "previewEnabled": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "If the token has editor preview features enabled." },
                    "reviewEnabled": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "If the token has Copilot code review features enabled." }
                }
            */
            this.sendMSFTTelemetryEvent('token', undefined, {
                chatEnabled: token.isChatEnabled() ? 1 : 0,
                snippyEnabled: token.isPublicSuggestionsEnabled() ? 1 : 0,
                telemetryEnabled: token.isTelemetryEnabled() ? 1 : 0,
                mcpEnabled: token.isMcpEnabled() ? 1 : 0,
                previewEnabled: token.isEditorPreviewFeaturesEnabled() ? 1 : 0,
                reviewEnabled: token.isCopilotCodeReviewEnabled ? 1 : 0
            });
        }));
    }
    dispose() {
        this._disposables.forEach(d => d.dispose());
    }
    sendMSFTTelemetryEvent(eventName, properties, measurements) {
        this.sendTelemetryEvent(eventName, { github: false, microsoft: true }, properties, measurements);
    }
    sendMSFTTelemetryErrorEvent(eventName, properties, measurements) {
        this.sendTelemetryErrorEvent(eventName, { github: false, microsoft: true }, properties, measurements);
    }
    sendGHTelemetryEvent(eventName, properties, measurements) {
        // Add SKU to GitHub telemetry events specifically
        const sku = this._tokenStore.copilotToken?.sku;
        const enrichedProperties = {
            ...properties,
            sku: sku ?? ''
        };
        this.sendTelemetryEvent(eventName, { github: true, microsoft: false }, enrichedProperties, measurements);
    }
    sendGHTelemetryErrorEvent(eventName, properties, measurements) {
        this.sendTelemetryErrorEvent(eventName, { github: true, microsoft: false }, properties, measurements);
    }
    sendGHTelemetryException(maybeError, origin) {
        this._ghTelemetrySender.sendExceptionTelemetry(maybeError, origin);
    }
    sendEnhancedGHTelemetryEvent(eventName, properties, measurements) {
        properties = { ...properties, ...this._sharedProperties };
        this._ghTelemetrySender.sendEnhancedTelemetryEvent(eventName, properties, measurements);
    }
    sendEnhancedGHTelemetryErrorEvent(eventName, properties, measurements) {
        properties = { ...properties, ...this._sharedProperties };
        this._ghTelemetrySender.sendEnhancedTelemetryErrorEvent(eventName, properties, measurements);
    }
    sendInternalMSFTTelemetryEvent(eventName, properties, measurements) {
        properties = { ...properties, ...this._sharedProperties };
        this._microsoftTelemetrySender.sendInternalTelemetryEvent(eventName, properties, measurements);
    }
    _getEventName(eventName, github) {
        let prefix = '';
        if (typeof github === 'object') {
            prefix = github.eventNamePrefix;
        }
        return prefix + eventName;
    }
    sendTelemetryEvent(eventName, destination, properties, measurements) {
        properties = { ...properties, ...this._sharedProperties };
        if (destination.github) {
            this._ghTelemetrySender.sendTelemetryEvent(this._getEventName(eventName, destination.github), properties, measurements);
        }
        if (destination.microsoft) {
            this._microsoftTelemetrySender.sendTelemetryEvent(eventName, properties, measurements);
        }
    }
    sendTelemetryErrorEvent(eventName, destination, properties, measurements) {
        properties = { ...properties, ...this._sharedProperties };
        if (destination.github) {
            this._ghTelemetrySender.sendTelemetryErrorEvent(this._getEventName(eventName, destination.github), properties, measurements);
        }
        if (destination.microsoft) {
            this._microsoftTelemetrySender.sendTelemetryErrorEvent(eventName, properties, measurements);
        }
    }
    _setOriginalExpAssignments(value) {
        this._originalExpAssignments = value;
        this._updateExpAssignmentsSharedProperty();
    }
    setAdditionalExpAssignments(expAssignments) {
        this._additionalExpAssignments = expAssignments;
        this._updateExpAssignmentsSharedProperty();
    }
    _updateExpAssignmentsSharedProperty() {
        let value = this._originalExpAssignments || '';
        for (const assignment of this._additionalExpAssignments) {
            if (!value.includes(assignment)) {
                value += `;${assignment}`;
            }
        }
        this._sharedProperties['abexp.assignmentcontext'] = value;
    }
    setSharedProperty(name, value) {
        /* __GDPR__
            "query-expfeature" : {
                "ABExp.queriedFeature": { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
            }
        */
        /* __GDPR__
            "call-tas-error" : {
                "errortype": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth"}
            }
        */
        if (name === 'abexp.assignmentcontext') {
            this._setOriginalExpAssignments(value);
            return;
        }
        this._sharedProperties[name] = value;
    }
    postEvent(eventName, props) {
        for (const [key, value] of Object.entries(this._sharedProperties)) {
            props.set(key, value);
        }
        this._microsoftTelemetrySender.postEvent(eventName, props);
    }
}
exports.BaseTelemetryService = BaseTelemetryService;
//# sourceMappingURL=baseTelemetryService.js.map