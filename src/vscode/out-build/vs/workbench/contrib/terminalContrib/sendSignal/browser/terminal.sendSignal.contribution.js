/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isWindows } from '../../../../../base/common/platform.js';
import { isObject, isString } from '../../../../../base/common/types.js';
import { localize, localize2 } from '../../../../../nls.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';
import { registerTerminalAction } from '../../../terminal/browser/terminalActions.js';
export var TerminalSendSignalCommandId;
(function (TerminalSendSignalCommandId) {
    TerminalSendSignalCommandId["SendSignal"] = "workbench.action.terminal.sendSignal";
})(TerminalSendSignalCommandId || (TerminalSendSignalCommandId = {}));
function toOptionalString(obj) {
    return isString(obj) ? obj : undefined;
}
const sendSignalString = localize2(13344, "Send Signal");
registerTerminalAction({
    id: "workbench.action.terminal.sendSignal" /* TerminalSendSignalCommandId.SendSignal */,
    title: sendSignalString,
    f1: !isWindows,
    metadata: {
        description: sendSignalString.value,
        args: [{
                name: 'args',
                schema: {
                    type: 'object',
                    required: ['signal'],
                    properties: {
                        signal: {
                            description: localize(13330, null),
                            type: 'string'
                        }
                    },
                }
            }]
    },
    run: async (c, accessor, args) => {
        const quickInputService = accessor.get(IQuickInputService);
        const instance = c.service.activeInstance;
        if (!instance) {
            return;
        }
        function isSignalArg(obj) {
            return isObject(obj) && 'signal' in obj;
        }
        let signal = isSignalArg(args) ? toOptionalString(args.signal) : undefined;
        if (!signal) {
            const signalOptions = [
                { label: 'SIGINT', description: localize(13331, null) },
                { label: 'SIGTERM', description: localize(13332, null) },
                { label: 'SIGKILL', description: localize(13333, null) },
                { label: 'SIGSTOP', description: localize(13334, null) },
                { label: 'SIGCONT', description: localize(13335, null) },
                { label: 'SIGHUP', description: localize(13336, null) },
                { label: 'SIGQUIT', description: localize(13337, null) },
                { label: 'SIGUSR1', description: localize(13338, null) },
                { label: 'SIGUSR2', description: localize(13339, null) },
                { type: 'separator' },
                { label: localize(13340, null) }
            ];
            const selected = await quickInputService.pick(signalOptions, {
                placeHolder: localize(13341, null)
            });
            if (!selected) {
                return;
            }
            if (selected.label === localize(13342, null)) {
                const inputSignal = await quickInputService.input({
                    prompt: localize(13343, null),
                });
                if (!inputSignal) {
                    return;
                }
                signal = inputSignal;
            }
            else {
                signal = selected.label;
            }
        }
        await instance.sendSignal(signal);
    }
});
//# sourceMappingURL=terminal.sendSignal.contribution.js.map