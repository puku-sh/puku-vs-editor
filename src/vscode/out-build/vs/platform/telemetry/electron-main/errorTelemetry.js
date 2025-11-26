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
import { isSigPipeError, onUnexpectedError, setUnexpectedErrorHandler } from '../../../base/common/errors.js';
import BaseErrorTelemetry from '../common/errorTelemetry.js';
import { ITelemetryService } from '../common/telemetry.js';
let ErrorTelemetry = class ErrorTelemetry extends BaseErrorTelemetry {
    constructor(logService, telemetryService) {
        super(telemetryService);
        this.logService = logService;
    }
    installErrorListeners() {
        // We handle uncaught exceptions here to prevent electron from opening a dialog to the user
        setUnexpectedErrorHandler(error => this.onUnexpectedError(error));
        process.on('uncaughtException', error => {
            if (!isSigPipeError(error)) {
                onUnexpectedError(error);
            }
        });
        process.on('unhandledRejection', (reason) => onUnexpectedError(reason));
    }
    onUnexpectedError(error) {
        this.logService.error(`[uncaught exception in main]: ${error}`);
        if (error.stack) {
            this.logService.error(error.stack);
        }
    }
};
ErrorTelemetry = __decorate([
    __param(1, ITelemetryService)
], ErrorTelemetry);
export default ErrorTelemetry;
//# sourceMappingURL=errorTelemetry.js.map