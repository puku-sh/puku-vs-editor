/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/**
 * Extracted from json.ts to keep json nls free.
 */
import { localize } from '../../nls.js';
export function getParseErrorMessage(errorCode) {
    switch (errorCode) {
        case 1 /* ParseErrorCode.InvalidSymbol */: return localize(116, null);
        case 2 /* ParseErrorCode.InvalidNumberFormat */: return localize(117, null);
        case 3 /* ParseErrorCode.PropertyNameExpected */: return localize(118, null);
        case 4 /* ParseErrorCode.ValueExpected */: return localize(119, null);
        case 5 /* ParseErrorCode.ColonExpected */: return localize(120, null);
        case 6 /* ParseErrorCode.CommaExpected */: return localize(121, null);
        case 7 /* ParseErrorCode.CloseBraceExpected */: return localize(122, null);
        case 8 /* ParseErrorCode.CloseBracketExpected */: return localize(123, null);
        case 9 /* ParseErrorCode.EndOfFileExpected */: return localize(124, null);
        default:
            return '';
    }
}
//# sourceMappingURL=jsonErrorMessages.js.map