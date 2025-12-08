"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockEndpoint = void 0;
const tokenizer_1 = require("../../../../util/common/tokenizer");
const chatMLFetcher_1 = require("../../../chat/common/chatMLFetcher");
const networking_1 = require("../../../networking/common/networking");
const tokenizer_2 = require("../../../tokenizer/node/tokenizer");
let MockEndpoint = class MockEndpoint {
    constructor(family, _chatMLFetcher, _tokenizerProvider) {
        this._chatMLFetcher = _chatMLFetcher;
        this._tokenizerProvider = _tokenizerProvider;
        this.isPremium = false;
        this.multiplier = 0;
        this.maxOutputTokens = 50000;
        this.model = "gpt-4.1-2025-04-14" /* CHAT_MODEL.GPT41 */;
        this.supportsToolCalls = false;
        this.supportsVision = false;
        this.supportsPrediction = true;
        this.showInModelPicker = true;
        this.isDefault = false;
        this.isFallback = false;
        this.policy = 'enabled';
        this.urlOrRequestMetadata = 'https://microsoft.com';
        this.modelMaxPromptTokens = 50000;
        this.name = 'test';
        this.family = 'test';
        this.version = '1.0';
        this.tokenizer = tokenizer_1.TokenizerType.O200K;
        if (family !== undefined) {
            this.family = family;
            this.model = family;
        }
    }
    processResponseFromChatEndpoint(telemetryService, logService, response, expectedNumChoices, finishCallback, telemetryData, cancellationToken) {
        throw new Error('Method not implemented.');
    }
    acceptChatPolicy() {
        throw new Error('Method not implemented.');
    }
    makeChatRequest2(options, token) {
        return this._chatMLFetcher.fetchOne({
            requestOptions: {},
            ...options,
            endpoint: this,
        }, token);
    }
    createRequestBody(options) {
        return (0, networking_1.createCapiRequestBody)(options, this.model);
    }
    async makeChatRequest(debugName, messages, finishedCb, token, location, source, requestOptions, userInitiatedRequest, telemetryProperties) {
        return this.makeChatRequest2({
            debugName,
            messages,
            finishedCb,
            location,
            source,
            requestOptions,
            userInitiatedRequest,
            telemetryProperties,
        }, token);
    }
    cloneWithTokenOverride(modelMaxPromptTokens) {
        throw new Error('Method not implemented.');
    }
    getExtraHeaders() {
        throw new Error('Method not implemented.');
    }
    interceptBody(body) {
        throw new Error('Method not implemented.');
    }
    acquireTokenizer() {
        return this._tokenizerProvider.acquireTokenizer(this);
    }
};
exports.MockEndpoint = MockEndpoint;
exports.MockEndpoint = MockEndpoint = __decorate([
    __param(1, chatMLFetcher_1.IChatMLFetcher),
    __param(2, tokenizer_2.ITokenizerProvider)
], MockEndpoint);
//# sourceMappingURL=mockEndpoint.js.map