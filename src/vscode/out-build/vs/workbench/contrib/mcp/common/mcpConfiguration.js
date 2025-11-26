/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { localize } from '../../../../nls.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { mcpSchemaId } from '../../../services/configuration/common/configuration.js';
import { inputsSchema } from '../../../services/configurationResolver/common/configurationResolverSchema.js';
import { Extensions } from '../../../services/extensionManagement/common/extensionFeatures.js';
const mcpActivationEventPrefix = 'onMcpCollection:';
/**
 * note: `contributedCollectionId` is _not_ the collection ID. The collection
 * ID is formed by passing the contributed ID through `extensionPrefixedIdentifier`
 */
export const mcpActivationEvent = (contributedCollectionId) => mcpActivationEventPrefix + contributedCollectionId;
export var DiscoverySource;
(function (DiscoverySource) {
    DiscoverySource["ClaudeDesktop"] = "claude-desktop";
    DiscoverySource["Windsurf"] = "windsurf";
    DiscoverySource["CursorGlobal"] = "cursor-global";
    DiscoverySource["CursorWorkspace"] = "cursor-workspace";
})(DiscoverySource || (DiscoverySource = {}));
export const allDiscoverySources = Object.keys({
    ["claude-desktop" /* DiscoverySource.ClaudeDesktop */]: true,
    ["windsurf" /* DiscoverySource.Windsurf */]: true,
    ["cursor-global" /* DiscoverySource.CursorGlobal */]: true,
    ["cursor-workspace" /* DiscoverySource.CursorWorkspace */]: true,
});
export const discoverySourceLabel = {
    ["claude-desktop" /* DiscoverySource.ClaudeDesktop */]: localize(9825, null),
    ["windsurf" /* DiscoverySource.Windsurf */]: localize(9826, null),
    ["cursor-global" /* DiscoverySource.CursorGlobal */]: localize(9827, null),
    ["cursor-workspace" /* DiscoverySource.CursorWorkspace */]: localize(9828, null),
};
export const discoverySourceSettingsLabel = {
    ["claude-desktop" /* DiscoverySource.ClaudeDesktop */]: localize(9829, null),
    ["windsurf" /* DiscoverySource.Windsurf */]: localize(9830, null),
    ["cursor-global" /* DiscoverySource.CursorGlobal */]: localize(9831, null),
    ["cursor-workspace" /* DiscoverySource.CursorWorkspace */]: localize(9832, null),
};
export const mcpConfigurationSection = 'mcp';
export const mcpDiscoverySection = 'chat.mcp.discovery.enabled';
export const mcpServerSamplingSection = 'chat.mcp.serverSampling';
export const mcpSchemaExampleServers = {
    'mcp-server-time': {
        command: 'python',
        args: ['-m', 'mcp_server_time', '--local-timezone=America/Los_Angeles'],
        env: {},
    }
};
const httpSchemaExamples = {
    'my-mcp-server': {
        url: 'http://localhost:3001/mcp',
        headers: {},
    }
};
const mcpDevModeProps = (stdio) => ({
    dev: {
        type: 'object',
        markdownDescription: localize(9833, null),
        examples: [{ watch: 'src/**/*.ts', debug: { type: 'node' } }],
        properties: {
            watch: {
                description: localize(9834, null),
                examples: ['src/**/*.ts'],
                oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
            },
            ...(stdio && {
                debug: {
                    markdownDescription: localize(9835, null),
                    oneOf: [
                        {
                            type: 'object',
                            required: ['type'],
                            properties: {
                                type: {
                                    type: 'string',
                                    enum: ['node'],
                                    description: localize(9836, null)
                                }
                            },
                            additionalProperties: false
                        },
                        {
                            type: 'object',
                            required: ['type'],
                            properties: {
                                type: {
                                    type: 'string',
                                    enum: ['debugpy'],
                                    description: localize(9837, null)
                                },
                                debugpyPath: {
                                    type: 'string',
                                    description: localize(9838, null)
                                },
                            },
                            additionalProperties: false
                        }
                    ]
                }
            })
        }
    }
});
export const mcpStdioServerSchema = {
    type: 'object',
    additionalProperties: false,
    examples: [mcpSchemaExampleServers['mcp-server-time']],
    properties: {
        type: {
            type: 'string',
            enum: ['stdio'],
            description: localize(9839, null)
        },
        command: {
            type: 'string',
            description: localize(9840, null)
        },
        cwd: {
            type: 'string',
            description: localize(9841, null),
            examples: ['${workspaceFolder}'],
        },
        args: {
            type: 'array',
            description: localize(9842, null),
            items: {
                type: 'string'
            },
        },
        envFile: {
            type: 'string',
            description: localize(9843, null),
            examples: ['${workspaceFolder}/.env'],
        },
        env: {
            description: localize(9844, null),
            additionalProperties: {
                anyOf: [
                    { type: 'null' },
                    { type: 'string' },
                    { type: 'number' },
                ]
            }
        },
        ...mcpDevModeProps(true),
    }
};
export const mcpServerSchema = {
    id: mcpSchemaId,
    type: 'object',
    title: localize(9845, null),
    allowTrailingCommas: true,
    allowComments: true,
    additionalProperties: false,
    properties: {
        servers: {
            examples: [
                mcpSchemaExampleServers,
                httpSchemaExamples,
            ],
            additionalProperties: {
                oneOf: [
                    mcpStdioServerSchema, {
                        type: 'object',
                        additionalProperties: false,
                        required: ['url'],
                        examples: [httpSchemaExamples['my-mcp-server']],
                        properties: {
                            type: {
                                type: 'string',
                                enum: ['http', 'sse'],
                                description: localize(9846, null)
                            },
                            url: {
                                type: 'string',
                                format: 'uri',
                                pattern: '^https?:\\/\\/.+',
                                patternErrorMessage: localize(9847, null),
                                description: localize(9848, null)
                            },
                            headers: {
                                type: 'object',
                                description: localize(9849, null),
                                additionalProperties: { type: 'string' },
                            },
                            ...mcpDevModeProps(false),
                        }
                    },
                ]
            }
        },
        inputs: inputsSchema.definitions.inputs
    }
};
export const mcpContributionPoint = {
    extensionPoint: 'mcpServerDefinitionProviders',
    activationEventsGenerator: function* (contribs) {
        for (const contrib of contribs) {
            if (contrib.id) {
                yield mcpActivationEvent(contrib.id);
            }
        }
    },
    jsonSchema: {
        description: localize(9850, null),
        type: 'array',
        defaultSnippets: [{ body: [{ id: '', label: '' }] }],
        items: {
            additionalProperties: false,
            type: 'object',
            defaultSnippets: [{ body: { id: '', label: '' } }],
            properties: {
                id: {
                    description: localize(9851, null),
                    type: 'string'
                },
                label: {
                    description: localize(9852, null),
                    type: 'string'
                },
                when: {
                    description: localize(9853, null),
                    type: 'string'
                }
            }
        }
    }
};
class McpServerDefinitionsProviderRenderer extends Disposable {
    constructor() {
        super(...arguments);
        this.type = 'table';
    }
    shouldRender(manifest) {
        return !!manifest.contributes?.mcpServerDefinitionProviders && Array.isArray(manifest.contributes.mcpServerDefinitionProviders) && manifest.contributes.mcpServerDefinitionProviders.length > 0;
    }
    render(manifest) {
        const mcpServerDefinitionProviders = manifest.contributes?.mcpServerDefinitionProviders ?? [];
        const headers = [localize(9854, null), localize(9855, null)];
        const rows = mcpServerDefinitionProviders
            .map(mcpServerDefinitionProvider => {
            return [
                new MarkdownString().appendMarkdown(`\`${mcpServerDefinitionProvider.id}\``),
                mcpServerDefinitionProvider.label
            ];
        });
        return {
            data: {
                headers,
                rows
            },
            dispose: () => { }
        };
    }
}
Registry.as(Extensions.ExtensionFeaturesRegistry).registerExtensionFeature({
    id: mcpConfigurationSection,
    label: localize(9856, null),
    access: {
        canToggle: false
    },
    renderer: new SyncDescriptor(McpServerDefinitionsProviderRenderer),
});
//# sourceMappingURL=mcpConfiguration.js.map