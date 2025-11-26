/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as JSONExtensions } from '../../../../platform/jsonschemas/common/jsonContributionRegistry.js';
import { fontWeightRegex, fontStyleRegex, fontSizeRegex, fontIdRegex, fontColorRegex, fontIdErrorMessage } from '../../../../platform/theme/common/iconRegistry.js';
const schemaId = 'vscode://schemas/icon-theme';
const schema = {
    type: 'object',
    allowComments: true,
    allowTrailingCommas: true,
    definitions: {
        folderExpanded: {
            type: 'string',
            description: nls.localize(15810, null)
        },
        folder: {
            type: 'string',
            description: nls.localize(15811, null)
        },
        file: {
            type: 'string',
            description: nls.localize(15812, null)
        },
        rootFolder: {
            type: 'string',
            description: nls.localize(15813, null)
        },
        rootFolderExpanded: {
            type: 'string',
            description: nls.localize(15814, null)
        },
        rootFolderNames: {
            type: 'object',
            description: nls.localize(15815, null),
            additionalProperties: {
                type: 'string',
                description: nls.localize(15816, null)
            }
        },
        rootFolderNamesExpanded: {
            type: 'object',
            description: nls.localize(15817, null),
            additionalProperties: {
                type: 'string',
                description: nls.localize(15818, null)
            }
        },
        folderNames: {
            type: 'object',
            description: nls.localize(15819, null),
            additionalProperties: {
                type: 'string',
                description: nls.localize(15820, null)
            }
        },
        folderNamesExpanded: {
            type: 'object',
            description: nls.localize(15821, null),
            additionalProperties: {
                type: 'string',
                description: nls.localize(15822, null)
            }
        },
        fileExtensions: {
            type: 'object',
            description: nls.localize(15823, null),
            additionalProperties: {
                type: 'string',
                description: nls.localize(15824, null)
            }
        },
        fileNames: {
            type: 'object',
            description: nls.localize(15825, null),
            additionalProperties: {
                type: 'string',
                description: nls.localize(15826, null)
            }
        },
        languageIds: {
            type: 'object',
            description: nls.localize(15827, null),
            additionalProperties: {
                type: 'string',
                description: nls.localize(15828, null)
            }
        },
        associations: {
            type: 'object',
            properties: {
                folderExpanded: {
                    $ref: '#/definitions/folderExpanded'
                },
                folder: {
                    $ref: '#/definitions/folder'
                },
                file: {
                    $ref: '#/definitions/file'
                },
                folderNames: {
                    $ref: '#/definitions/folderNames'
                },
                folderNamesExpanded: {
                    $ref: '#/definitions/folderNamesExpanded'
                },
                rootFolder: {
                    $ref: '#/definitions/rootFolder'
                },
                rootFolderExpanded: {
                    $ref: '#/definitions/rootFolderExpanded'
                },
                rootFolderNames: {
                    $ref: '#/definitions/rootFolderNames'
                },
                rootFolderNamesExpanded: {
                    $ref: '#/definitions/rootFolderNamesExpanded'
                },
                fileExtensions: {
                    $ref: '#/definitions/fileExtensions'
                },
                fileNames: {
                    $ref: '#/definitions/fileNames'
                },
                languageIds: {
                    $ref: '#/definitions/languageIds'
                }
            }
        }
    },
    properties: {
        fonts: {
            type: 'array',
            description: nls.localize(15829, null),
            items: {
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        description: nls.localize(15830, null),
                        pattern: fontIdRegex.source,
                        patternErrorMessage: fontIdErrorMessage
                    },
                    src: {
                        type: 'array',
                        description: nls.localize(15831, null),
                        items: {
                            type: 'object',
                            properties: {
                                path: {
                                    type: 'string',
                                    description: nls.localize(15832, null),
                                },
                                format: {
                                    type: 'string',
                                    description: nls.localize(15833, null),
                                    enum: ['woff', 'woff2', 'truetype', 'opentype', 'embedded-opentype', 'svg']
                                }
                            },
                            required: [
                                'path',
                                'format'
                            ]
                        }
                    },
                    weight: {
                        type: 'string',
                        description: nls.localize(15834, null),
                        pattern: fontWeightRegex.source
                    },
                    style: {
                        type: 'string',
                        description: nls.localize(15835, null),
                        pattern: fontStyleRegex.source
                    },
                    size: {
                        type: 'string',
                        description: nls.localize(15836, null),
                        pattern: fontSizeRegex.source
                    }
                },
                required: [
                    'id',
                    'src'
                ]
            }
        },
        iconDefinitions: {
            type: 'object',
            description: nls.localize(15837, null),
            additionalProperties: {
                type: 'object',
                description: nls.localize(15838, null),
                properties: {
                    iconPath: {
                        type: 'string',
                        description: nls.localize(15839, null)
                    },
                    fontCharacter: {
                        type: 'string',
                        description: nls.localize(15840, null)
                    },
                    fontColor: {
                        type: 'string',
                        format: 'color-hex',
                        description: nls.localize(15841, null),
                        pattern: fontColorRegex.source
                    },
                    fontSize: {
                        type: 'string',
                        description: nls.localize(15842, null),
                        pattern: fontSizeRegex.source
                    },
                    fontId: {
                        type: 'string',
                        description: nls.localize(15843, null),
                        pattern: fontIdRegex.source,
                        patternErrorMessage: fontIdErrorMessage
                    }
                }
            }
        },
        folderExpanded: {
            $ref: '#/definitions/folderExpanded'
        },
        folder: {
            $ref: '#/definitions/folder'
        },
        file: {
            $ref: '#/definitions/file'
        },
        folderNames: {
            $ref: '#/definitions/folderNames'
        },
        folderNamesExpanded: {
            $ref: '#/definitions/folderNamesExpanded'
        },
        rootFolder: {
            $ref: '#/definitions/rootFolder'
        },
        rootFolderExpanded: {
            $ref: '#/definitions/rootFolderExpanded'
        },
        rootFolderNames: {
            $ref: '#/definitions/rootFolderNames'
        },
        rootFolderNamesExpanded: {
            $ref: '#/definitions/rootFolderNamesExpanded'
        },
        fileExtensions: {
            $ref: '#/definitions/fileExtensions'
        },
        fileNames: {
            $ref: '#/definitions/fileNames'
        },
        languageIds: {
            $ref: '#/definitions/languageIds'
        },
        light: {
            $ref: '#/definitions/associations',
            description: nls.localize(15844, null)
        },
        highContrast: {
            $ref: '#/definitions/associations',
            description: nls.localize(15845, null)
        },
        hidesExplorerArrows: {
            type: 'boolean',
            description: nls.localize(15846, null)
        },
        showLanguageModeIcons: {
            type: 'boolean',
            description: nls.localize(15847, null)
        }
    }
};
export function registerFileIconThemeSchemas() {
    const schemaRegistry = Registry.as(JSONExtensions.JSONContribution);
    schemaRegistry.registerSchema(schemaId, schema);
}
//# sourceMappingURL=fileIconThemeSchema.js.map