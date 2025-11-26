/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as JSONExtensions } from '../../../../platform/jsonschemas/common/jsonContributionRegistry.js';
import { workbenchColorsSchemaId } from '../../../../platform/theme/common/colorRegistry.js';
import { tokenStylingSchemaId } from '../../../../platform/theme/common/tokenClassificationRegistry.js';
const textMateScopes = [
    'comment',
    'comment.block',
    'comment.block.documentation',
    'comment.line',
    'constant',
    'constant.character',
    'constant.character.escape',
    'constant.numeric',
    'constant.numeric.integer',
    'constant.numeric.float',
    'constant.numeric.hex',
    'constant.numeric.octal',
    'constant.other',
    'constant.regexp',
    'constant.rgb-value',
    'emphasis',
    'entity',
    'entity.name',
    'entity.name.class',
    'entity.name.function',
    'entity.name.method',
    'entity.name.section',
    'entity.name.selector',
    'entity.name.tag',
    'entity.name.type',
    'entity.other',
    'entity.other.attribute-name',
    'entity.other.inherited-class',
    'invalid',
    'invalid.deprecated',
    'invalid.illegal',
    'keyword',
    'keyword.control',
    'keyword.operator',
    'keyword.operator.new',
    'keyword.operator.assignment',
    'keyword.operator.arithmetic',
    'keyword.operator.logical',
    'keyword.other',
    'markup',
    'markup.bold',
    'markup.changed',
    'markup.deleted',
    'markup.heading',
    'markup.inline.raw',
    'markup.inserted',
    'markup.italic',
    'markup.list',
    'markup.list.numbered',
    'markup.list.unnumbered',
    'markup.other',
    'markup.quote',
    'markup.raw',
    'markup.underline',
    'markup.underline.link',
    'meta',
    'meta.block',
    'meta.cast',
    'meta.class',
    'meta.function',
    'meta.function-call',
    'meta.preprocessor',
    'meta.return-type',
    'meta.selector',
    'meta.tag',
    'meta.type.annotation',
    'meta.type',
    'punctuation.definition.string.begin',
    'punctuation.definition.string.end',
    'punctuation.separator',
    'punctuation.separator.continuation',
    'punctuation.terminator',
    'storage',
    'storage.modifier',
    'storage.type',
    'string',
    'string.interpolated',
    'string.other',
    'string.quoted',
    'string.quoted.double',
    'string.quoted.other',
    'string.quoted.single',
    'string.quoted.triple',
    'string.regexp',
    'string.unquoted',
    'strong',
    'support',
    'support.class',
    'support.constant',
    'support.function',
    'support.other',
    'support.type',
    'support.type.property-name',
    'support.variable',
    'variable',
    'variable.language',
    'variable.name',
    'variable.other',
    'variable.other.readwrite',
    'variable.parameter'
];
export const textmateColorsSchemaId = 'vscode://schemas/textmate-colors';
export const textmateColorGroupSchemaId = `${textmateColorsSchemaId}#/definitions/colorGroup`;
const textmateColorSchema = {
    type: 'array',
    definitions: {
        colorGroup: {
            default: '#FF0000',
            anyOf: [
                {
                    type: 'string',
                    format: 'color-hex'
                },
                {
                    $ref: '#/definitions/settings'
                }
            ]
        },
        settings: {
            type: 'object',
            description: nls.localize(15797, null),
            properties: {
                foreground: {
                    type: 'string',
                    description: nls.localize(15798, null),
                    format: 'color-hex',
                    default: '#ff0000'
                },
                background: {
                    type: 'string',
                    deprecationMessage: nls.localize(15799, null)
                },
                fontStyle: {
                    type: 'string',
                    description: nls.localize(15800, null),
                    pattern: '^(\\s*\\b(italic|bold|underline|strikethrough))*\\s*$',
                    patternErrorMessage: nls.localize(15801, null),
                    defaultSnippets: [
                        { label: nls.localize(15802, null), bodyText: '""' },
                        { body: 'italic' },
                        { body: 'bold' },
                        { body: 'underline' },
                        { body: 'strikethrough' },
                        { body: 'italic bold' },
                        { body: 'italic underline' },
                        { body: 'italic strikethrough' },
                        { body: 'bold underline' },
                        { body: 'bold strikethrough' },
                        { body: 'underline strikethrough' },
                        { body: 'italic bold underline' },
                        { body: 'italic bold strikethrough' },
                        { body: 'italic underline strikethrough' },
                        { body: 'bold underline strikethrough' },
                        { body: 'italic bold underline strikethrough' }
                    ]
                }
            },
            additionalProperties: false,
            defaultSnippets: [{ body: { foreground: '${1:#FF0000}', fontStyle: '${2:bold}' } }]
        }
    },
    items: {
        type: 'object',
        defaultSnippets: [{ body: { scope: '${1:keyword.operator}', settings: { foreground: '${2:#FF0000}' } } }],
        properties: {
            name: {
                type: 'string',
                description: nls.localize(15803, null)
            },
            scope: {
                description: nls.localize(15804, null),
                anyOf: [
                    {
                        enum: textMateScopes
                    },
                    {
                        type: 'string'
                    },
                    {
                        type: 'array',
                        items: {
                            enum: textMateScopes
                        }
                    },
                    {
                        type: 'array',
                        items: {
                            type: 'string'
                        }
                    }
                ]
            },
            settings: {
                $ref: '#/definitions/settings'
            }
        },
        required: [
            'settings'
        ],
        additionalProperties: false
    }
};
export const colorThemeSchemaId = 'vscode://schemas/color-theme';
const colorThemeSchema = {
    type: 'object',
    allowComments: true,
    allowTrailingCommas: true,
    properties: {
        colors: {
            description: nls.localize(15805, null),
            $ref: workbenchColorsSchemaId,
            additionalProperties: false
        },
        tokenColors: {
            anyOf: [{
                    type: 'string',
                    description: nls.localize(15806, null)
                },
                {
                    description: nls.localize(15807, null),
                    $ref: textmateColorsSchemaId
                }
            ]
        },
        semanticHighlighting: {
            type: 'boolean',
            description: nls.localize(15808, null)
        },
        semanticTokenColors: {
            type: 'object',
            description: nls.localize(15809, null),
            $ref: tokenStylingSchemaId
        }
    }
};
export function registerColorThemeSchemas() {
    const schemaRegistry = Registry.as(JSONExtensions.JSONContribution);
    schemaRegistry.registerSchema(colorThemeSchemaId, colorThemeSchema);
    schemaRegistry.registerSchema(textmateColorsSchemaId, textmateColorSchema);
}
//# sourceMappingURL=colorThemeSchema.js.map