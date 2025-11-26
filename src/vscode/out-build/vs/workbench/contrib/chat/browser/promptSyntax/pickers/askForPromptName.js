/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../../nls.js';
import { getPromptFileExtension } from '../../../common/promptSyntax/config/promptFileLocations.js';
import { PromptsType } from '../../../common/promptSyntax/promptTypes.js';
import { IQuickInputService } from '../../../../../../platform/quickinput/common/quickInput.js';
import { URI } from '../../../../../../base/common/uri.js';
import { IFileService } from '../../../../../../platform/files/common/files.js';
import Severity from '../../../../../../base/common/severity.js';
import { isValidBasename } from '../../../../../../base/common/extpath.js';
/**
 * Asks the user for a file name.
 */
export async function askForPromptFileName(accessor, type, selectedFolder, existingFileName) {
    const quickInputService = accessor.get(IQuickInputService);
    const fileService = accessor.get(IFileService);
    const sanitizeInput = (input) => {
        const trimmedName = input.trim();
        if (!trimmedName) {
            return undefined;
        }
        const fileExtension = getPromptFileExtension(type);
        return (trimmedName.endsWith(fileExtension))
            ? trimmedName
            : `${trimmedName}${fileExtension}`;
    };
    const validateInput = async (value) => {
        const fileName = sanitizeInput(value);
        if (!fileName) {
            return {
                content: localize(6251, null),
                severity: Severity.Warning
            };
        }
        if (!isValidBasename(fileName)) {
            return {
                content: localize(6252, null),
                severity: Severity.Error
            };
        }
        const fileUri = URI.joinPath(selectedFolder, fileName);
        if (await fileService.exists(fileUri)) {
            return {
                content: localize(6253, null),
                severity: Severity.Error
            };
        }
        return undefined;
    };
    const placeHolder = existingFileName ? getPlaceholderStringForRename(type) : getPlaceholderStringForNew(type);
    const result = await quickInputService.input({ placeHolder, validateInput, value: existingFileName });
    if (!result) {
        return undefined;
    }
    return sanitizeInput(result);
}
function getPlaceholderStringForNew(type) {
    switch (type) {
        case PromptsType.instructions:
            return localize(6254, null);
        case PromptsType.prompt:
            return localize(6255, null);
        case PromptsType.agent:
            return localize(6256, null);
        default:
            throw new Error('Unknown prompt type');
    }
}
function getPlaceholderStringForRename(type) {
    switch (type) {
        case PromptsType.instructions:
            return localize(6257, null);
        case PromptsType.prompt:
            return localize(6258, null);
        case PromptsType.agent:
            return localize(6259, null);
        default:
            throw new Error('Unknown prompt type');
    }
}
//# sourceMappingURL=askForPromptName.js.map