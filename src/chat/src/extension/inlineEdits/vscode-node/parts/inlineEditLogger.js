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
exports.InlineEditLogger = void 0;
const requestLogger_1 = require("../../../../platform/requestLogger/node/requestLogger");
const lifecycle_1 = require("../../../../util/vs/base/common/lifecycle");
let InlineEditLogger = class InlineEditLogger extends lifecycle_1.Disposable {
    constructor(_requestLogger) {
        super();
        this._requestLogger = _requestLogger;
        this._requests = [];
    }
    add(request) {
        if (!request.includeInLogTree) {
            return;
        }
        this._requestLogger.addEntry({
            type: "MarkdownContentRequest" /* LoggedRequestKind.MarkdownContentRequest */,
            debugName: request.getDebugName(),
            icon: request.getIcon(),
            startTimeMs: request.time,
            markdownContent: request.toLogDocument(),
        });
        this._requests.push(request);
        if (this._requests.length > 100) {
            this._requests.shift();
        }
    }
    getRequestById(requestId) {
        return this._requests.find(request => request.requestId === requestId);
    }
};
exports.InlineEditLogger = InlineEditLogger;
exports.InlineEditLogger = InlineEditLogger = __decorate([
    __param(0, requestLogger_1.IRequestLogger)
], InlineEditLogger);
//# sourceMappingURL=inlineEditLogger.js.map