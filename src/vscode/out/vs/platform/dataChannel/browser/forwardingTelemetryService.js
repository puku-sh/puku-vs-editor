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
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
import { IDataChannelService } from '../common/dataChannel.js';
export class InterceptingTelemetryService {
    constructor(_baseService, _intercept) {
        this._baseService = _baseService;
        this._intercept = _intercept;
    }
    get telemetryLevel() {
        return this._baseService.telemetryLevel;
    }
    get sessionId() {
        return this._baseService.sessionId;
    }
    get machineId() {
        return this._baseService.machineId;
    }
    get sqmId() {
        return this._baseService.sqmId;
    }
    get devDeviceId() {
        return this._baseService.devDeviceId;
    }
    get firstSessionDate() {
        return this._baseService.firstSessionDate;
    }
    get msftInternal() {
        return this._baseService.msftInternal;
    }
    get sendErrorTelemetry() {
        return this._baseService.sendErrorTelemetry;
    }
    publicLog(eventName, data) {
        this._intercept(eventName, data);
        this._baseService.publicLog(eventName, data);
    }
    publicLog2(eventName, data) {
        this._intercept(eventName, data);
        this._baseService.publicLog2(eventName, data);
    }
    publicLogError(errorEventName, data) {
        this._intercept(errorEventName, data);
        this._baseService.publicLogError(errorEventName, data);
    }
    publicLogError2(eventName, data) {
        this._intercept(eventName, data);
        this._baseService.publicLogError2(eventName, data);
    }
    setExperimentProperty(name, value) {
        this._baseService.setExperimentProperty(name, value);
    }
}
let DataChannelForwardingTelemetryService = class DataChannelForwardingTelemetryService extends InterceptingTelemetryService {
    constructor(telemetryService, dataChannelService) {
        super(telemetryService, (eventName, data) => {
            // filter for extension
            let forward = true;
            if (data && shouldForwardToChannel in data) {
                forward = Boolean(data[shouldForwardToChannel]);
            }
            if (forward) {
                dataChannelService.getDataChannel('editTelemetry').sendData({ eventName, data: data ?? {} });
            }
        });
    }
};
DataChannelForwardingTelemetryService = __decorate([
    __param(0, ITelemetryService),
    __param(1, IDataChannelService)
], DataChannelForwardingTelemetryService);
export { DataChannelForwardingTelemetryService };
const shouldForwardToChannel = Symbol('shouldForwardToChannel');
export function forwardToChannelIf(value) {
    return {
        // This will not be sent via telemetry, it is just a marker
        [shouldForwardToChannel]: value
    };
}
export function isCopilotLikeExtension(extensionId) {
    if (!extensionId) {
        return false;
    }
    const extIdLowerCase = extensionId.toLowerCase();
    return extIdLowerCase === 'github.copilot' || extIdLowerCase === 'github.copilot-chat';
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9yd2FyZGluZ1RlbGVtZXRyeVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWhhbWVkL0Rlc2t0b3AvcHVrdS12cy1lZGl0b3IvcHVrdS1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9kYXRhQ2hhbm5lbC9icm93c2VyL2ZvcndhcmRpbmdUZWxlbWV0cnlTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBa0IsaUJBQWlCLEVBQWtCLE1BQU0scUNBQXFDLENBQUM7QUFDeEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFFL0QsTUFBTSxPQUFPLDRCQUE0QjtJQUd4QyxZQUNrQixZQUErQixFQUMvQixVQUE4RDtRQUQ5RCxpQkFBWSxHQUFaLFlBQVksQ0FBbUI7UUFDL0IsZUFBVSxHQUFWLFVBQVUsQ0FBb0Q7SUFDNUUsQ0FBQztJQUVMLElBQUksY0FBYztRQUNqQixPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsY0FBYyxDQUFDO0lBQ3pDLENBQUM7SUFFRCxJQUFJLFNBQVM7UUFDWixPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDO0lBQ3BDLENBQUM7SUFFRCxJQUFJLFNBQVM7UUFDWixPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDO0lBQ3BDLENBQUM7SUFFRCxJQUFJLEtBQUs7UUFDUixPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDO0lBQ2hDLENBQUM7SUFFRCxJQUFJLFdBQVc7UUFDZCxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDO0lBQ3RDLENBQUM7SUFFRCxJQUFJLGdCQUFnQjtRQUNuQixPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsZ0JBQWdCLENBQUM7SUFDM0MsQ0FBQztJQUVELElBQUksWUFBWTtRQUNmLE9BQU8s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