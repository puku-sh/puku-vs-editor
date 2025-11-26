/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { ExtensionsRegistry } from '../../extensions/common/extensionsRegistry.js';
import { languagesExtPoint } from '../../language/common/languageService.js';
export const grammarsExtPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'grammars',
    deps: [languagesExtPoint],
    jsonSchema: {
        description: nls.localize(15743, null),
        type: 'array',
        defaultSnippets: [{ body: [{ language: '${1:id}', scopeName: 'source.${2:id}', path: './syntaxes/${3:id}.tmLanguage.' }] }],
        items: {
            type: 'object',
            defaultSnippets: [{ body: { language: '${1:id}', scopeName: 'source.${2:id}', path: './syntaxes/${3:id}.tmLanguage.' } }],
            properties: {
                language: {
                    description: nls.localize(15744, null),
                    type: 'string'
                },
                scopeName: {
                    description: nls.localize(15745, null),
                    type: 'string'
                },
                path: {
                    description: nls.localize(15746, null),
                    type: 'string'
                },
                embeddedLanguages: {
                    description: nls.localize(15747, null),
                    type: 'object'
                },
                tokenTypes: {
                    description: nls.localize(15748, null),
                    type: 'object',
                    additionalProperties: {
                        enum: ['string', 'comment', 'other']
                    }
                },
                injectTo: {
                    description: nls.localize(15749, null),
                    type: 'array',
                    items: {
                        type: 'string'
                    }
                },
                balancedBracketScopes: {
                    description: nls.localize(15750, null),
                    type: 'array',
                    items: {
                        type: 'string'
                    },
                    default: ['*'],
                },
                unbalancedBracketScopes: {
                    description: nls.localize(15751, null),
                    type: 'array',
                    items: {
                        type: 'string'
                    },
                    default: [],
                },
            },
            required: ['scopeName', 'path']
        }
    }
});
//# sourceMappingURL=TMGrammars.js.map