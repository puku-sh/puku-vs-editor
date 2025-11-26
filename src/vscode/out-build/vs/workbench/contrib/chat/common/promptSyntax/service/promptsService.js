/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../../../../../platform/instantiation/common/instantiation.js';
/**
 * Provides prompt services.
 */
export const IPromptsService = createDecorator('IPromptsService');
/**
 * Where the prompt is stored.
 */
export var PromptsStorage;
(function (PromptsStorage) {
    PromptsStorage["local"] = "local";
    PromptsStorage["user"] = "user";
    PromptsStorage["extension"] = "extension";
})(PromptsStorage || (PromptsStorage = {}));
//# sourceMappingURL=promptsService.js.map