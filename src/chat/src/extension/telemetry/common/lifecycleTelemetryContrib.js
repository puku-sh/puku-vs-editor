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
exports.LifecycleTelemetryContrib = void 0;
const telemetry_1 = require("../../../platform/telemetry/common/telemetry");
let LifecycleTelemetryContrib = class LifecycleTelemetryContrib {
    constructor(telemetryService) {
        this.telemetryService = telemetryService;
        telemetryService.sendGHTelemetryEvent('extension.activate');
    }
    dispose() {
        this.telemetryService.sendGHTelemetryEvent('extension.deactivate');
    }
};
exports.LifecycleTelemetryContrib = LifecycleTelemetryContrib;
exports.LifecycleTelemetryContrib = LifecycleTelemetryContrib = __decorate([
    __param(0, telemetry_1.ITelemetryService)
], LifecycleTelemetryContrib);
//# sourceMappingURL=lifecycleTelemetryContrib.js.map