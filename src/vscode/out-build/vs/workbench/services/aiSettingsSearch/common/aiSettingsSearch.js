/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export const IAiSettingsSearchService = createDecorator('IAiSettingsSearchService');
export var AiSettingsSearchResultKind;
(function (AiSettingsSearchResultKind) {
    AiSettingsSearchResultKind[AiSettingsSearchResultKind["EMBEDDED"] = 1] = "EMBEDDED";
    AiSettingsSearchResultKind[AiSettingsSearchResultKind["LLM_RANKED"] = 2] = "LLM_RANKED";
    AiSettingsSearchResultKind[AiSettingsSearchResultKind["CANCELED"] = 3] = "CANCELED";
})(AiSettingsSearchResultKind || (AiSettingsSearchResultKind = {}));
//# sourceMappingURL=aiSettingsSearch.js.map