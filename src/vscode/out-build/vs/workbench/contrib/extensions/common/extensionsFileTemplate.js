/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
import { EXTENSION_IDENTIFIER_PATTERN } from '../../../../platform/extensionManagement/common/extensionManagement.js';
export const ExtensionsConfigurationSchemaId = 'vscode://schemas/extensions';
export const ExtensionsConfigurationSchema = {
    id: ExtensionsConfigurationSchemaId,
    allowComments: true,
    allowTrailingCommas: true,
    type: 'object',
    title: localize(8535, null),
    additionalProperties: false,
    properties: {
        recommendations: {
            type: 'array',
            description: localize(8536, null),
            items: {
                type: 'string',
                pattern: EXTENSION_IDENTIFIER_PATTERN,
                errorMessage: localize(8537, null)
            },
        },
        unwantedRecommendations: {
            type: 'array',
            description: localize(8538, null),
            items: {
                type: 'string',
                pattern: EXTENSION_IDENTIFIER_PATTERN,
                errorMessage: localize(8539, null)
            },
        },
    }
};
export const ExtensionsConfigurationInitialContent = [
    '{',
    '\t// See https://go.microsoft.com/fwlink/?LinkId=827846 to learn about workspace recommendations.',
    '\t// Extension identifier format: ${publisher}.${name}. Example: vscode.csharp',
    '',
    '\t// List of extensions which should be recommended for users of this workspace.',
    '\t"recommendations": [',
    '\t\t',
    '\t],',
    '\t// List of extensions recommended by VS Code that should not be recommended for users of this workspace.',
    '\t"unwantedRecommendations": [',
    '\t\t',
    '\t]',
    '}'
].join('\n');
//# sourceMappingURL=extensionsFileTemplate.js.map