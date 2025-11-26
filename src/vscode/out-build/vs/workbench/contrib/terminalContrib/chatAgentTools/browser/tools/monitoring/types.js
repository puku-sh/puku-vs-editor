/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export var OutputMonitorState;
(function (OutputMonitorState) {
    OutputMonitorState["Initial"] = "Initial";
    OutputMonitorState["Idle"] = "Idle";
    OutputMonitorState["PollingForIdle"] = "PollingForIdle";
    OutputMonitorState["Prompting"] = "Prompting";
    OutputMonitorState["Timeout"] = "Timeout";
    OutputMonitorState["Active"] = "Active";
    OutputMonitorState["Cancelled"] = "Cancelled";
})(OutputMonitorState || (OutputMonitorState = {}));
export var PollingConsts;
(function (PollingConsts) {
    PollingConsts[PollingConsts["MinIdleEvents"] = 2] = "MinIdleEvents";
    PollingConsts[PollingConsts["MinPollingDuration"] = 500] = "MinPollingDuration";
    PollingConsts[PollingConsts["FirstPollingMaxDuration"] = 20000] = "FirstPollingMaxDuration";
    PollingConsts[PollingConsts["ExtendedPollingMaxDuration"] = 120000] = "ExtendedPollingMaxDuration";
    PollingConsts[PollingConsts["MaxPollingIntervalDuration"] = 2000] = "MaxPollingIntervalDuration";
    PollingConsts[PollingConsts["MaxRecursionCount"] = 5] = "MaxRecursionCount";
})(PollingConsts || (PollingConsts = {}));
//# sourceMappingURL=types.js.map