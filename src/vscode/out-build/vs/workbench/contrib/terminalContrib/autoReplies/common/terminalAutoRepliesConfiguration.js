/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../nls.js';
export var TerminalAutoRepliesSettingId;
(function (TerminalAutoRepliesSettingId) {
    TerminalAutoRepliesSettingId["AutoReplies"] = "terminal.integrated.autoReplies";
})(TerminalAutoRepliesSettingId || (TerminalAutoRepliesSettingId = {}));
export const terminalAutoRepliesConfiguration = {
    ["terminal.integrated.autoReplies" /* TerminalAutoRepliesSettingId.AutoReplies */]: {
        markdownDescription: localize(13054, null, '`"Terminate batch job (Y/N)": "Y\\r"`', '`"\\r"`'),
        type: 'object',
        additionalProperties: {
            oneOf: [{
                    type: 'string',
                    description: localize(13055, null)
                },
                { type: 'null' }]
        },
        default: {}
    },
};
//# sourceMappingURL=terminalAutoRepliesConfiguration.js.map