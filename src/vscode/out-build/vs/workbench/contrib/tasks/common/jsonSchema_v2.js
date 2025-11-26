/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import * as Objects from '../../../../base/common/objects.js';
import commonSchema from './jsonSchemaCommon.js';
import { ProblemMatcherRegistry } from './problemMatcher.js';
import { TaskDefinitionRegistry } from './taskDefinitionRegistry.js';
import * as ConfigurationResolverUtils from '../../../services/configurationResolver/common/configurationResolverUtils.js';
import { inputsSchema } from '../../../services/configurationResolver/common/configurationResolverSchema.js';
import { getAllCodicons } from '../../../../base/common/codicons.js';
function fixReferences(literal) {
    if (Array.isArray(literal)) {
        literal.forEach(fixReferences);
    }
    else if (typeof literal === 'object') {
        if (literal['$ref']) {
            literal['$ref'] = literal['$ref'] + '2';
        }
        Object.getOwnPropertyNames(literal).forEach(property => {
            const value = literal[property];
            if (Array.isArray(value) || typeof value === 'object') {
                fixReferences(value);
            }
        });
    }
}
const shellCommand = {
    anyOf: [
        {
            type: 'boolean',
            default: true,
            description: nls.localize(12312, null)
        },
        {
            $ref: '#/definitions/shellConfiguration'
        }
    ],
    deprecationMessage: nls.localize(12313, null)
};
const hide = {
    type: 'boolean',
    description: nls.localize(12314, null),
    default: true
};
const taskIdentifier = {
    type: 'object',
    additionalProperties: true,
    properties: {
        type: {
            type: 'string',
            description: nls.localize(12315, null)
        }
    }
};
const dependsOn = {
    anyOf: [
        {
            type: 'string',
            description: nls.localize(12316, null)
        },
        taskIdentifier,
        {
            type: 'array',
            description: nls.localize(12317, null),
            items: {
                anyOf: [
                    {
                        type: 'string',
                    },
                    taskIdentifier
                ]
            }
        }
    ],
    description: nls.localize(12318, null)
};
const dependsOrder = {
    type: 'string',
    enum: ['parallel', 'sequence'],
    enumDescriptions: [
        nls.localize(12319, null),
        nls.localize(12320, null),
    ],
    default: 'parallel',
    description: nls.localize(12321, null)
};
const detail = {
    type: 'string',
    description: nls.localize(12322, null)
};
const icon = {
    type: 'object',
    description: nls.localize(12323, null),
    properties: {
        id: {
            description: nls.localize(12324, null),
            type: ['string', 'null'],
            enum: Array.from(getAllCodicons(), icon => icon.id),
            markdownEnumDescriptions: Array.from(getAllCodicons(), icon => `$(${icon.id})`),
        },
        color: {
            description: nls.localize(12325, null),
            type: ['string', 'null'],
            enum: [
                'terminal.ansiBlack',
                'terminal.ansiRed',
                'terminal.ansiGreen',
                'terminal.ansiYellow',
                'terminal.ansiBlue',
                'terminal.ansiMagenta',
                'terminal.ansiCyan',
                'terminal.ansiWhite'
            ],
        },
    }
};
const presentation = {
    type: 'object',
    default: {
        echo: true,
        reveal: 'always',
        focus: false,
        panel: 'shared',
        showReuseMessage: true,
        clear: false,
    },
    description: nls.localize(12326, null),
    additionalProperties: false,
    properties: {
        echo: {
            type: 'boolean',
            default: true,
            description: nls.localize(12327, null)
        },
        focus: {
            type: 'boolean',
            default: false,
            description: nls.localize(12328, null)
        },
        revealProblems: {
            type: 'string',
            enum: ['always', 'onProblem', 'never'],
            enumDescriptions: [
                nls.localize(12329, null),
                nls.localize(12330, null),
                nls.localize(12331, null),
            ],
            default: 'never',
            description: nls.localize(12332, null)
        },
        reveal: {
            type: 'string',
            enum: ['always', 'silent', 'never'],
            enumDescriptions: [
                nls.localize(12333, null),
                nls.localize(12334, null),
                nls.localize(12335, null),
            ],
            default: 'always',
            description: nls.localize(12336, null)
        },
        panel: {
            type: 'string',
            enum: ['shared', 'dedicated', 'new'],
            default: 'shared',
            description: nls.localize(12337, null)
        },
        showReuseMessage: {
            type: 'boolean',
            default: true,
            description: nls.localize(12338, null)
        },
        clear: {
            type: 'boolean',
            default: false,
            description: nls.localize(12339, null)
        },
        group: {
            type: 'string',
            description: nls.localize(12340, null)
        },
        close: {
            type: 'boolean',
            description: nls.localize(12341, null)
        },
        preserveTerminalName: {
            type: 'boolean',
            default: false,
            description: nls.localize(12342, null)
        }
    }
};
const terminal = Objects.deepClone(presentation);
terminal.deprecationMessage = nls.localize(12343, null);
const groupStrings = {
    type: 'string',
    enum: [
        'build',
        'test',
        'none'
    ],
    enumDescriptions: [
        nls.localize(12344, null),
        nls.localize(12345, null),
        nls.localize(12346, null)
    ],
    description: nls.localize(12347, null)
};
const group = {
    oneOf: [
        groupStrings,
        {
            type: 'object',
            properties: {
                kind: groupStrings,
                isDefault: {
                    type: ['boolean', 'string'],
                    default: false,
                    description: nls.localize(12348, null)
                }
            }
        },
    ],
    defaultSnippets: [
        {
            body: { kind: 'build', isDefault: true },
            description: nls.localize(12349, null)
        },
        {
            body: { kind: 'test', isDefault: true },
            description: nls.localize(12350, null)
        }
    ],
    description: nls.localize(12351, null)
};
const taskType = {
    type: 'string',
    enum: ['shell'],
    default: 'process',
    description: nls.localize(12352, null)
};
const command = {
    oneOf: [
        {
            oneOf: [
                {
                    type: 'string'
                },
                {
                    type: 'array',
                    items: {
                        type: 'string'
                    },
                    description: nls.localize(12353, null)
                }
            ]
        },
        {
            type: 'object',
            required: ['value', 'quoting'],
            properties: {
                value: {
                    oneOf: [
                        {
                            type: 'string'
                        },
                        {
                            type: 'array',
                            items: {
                                type: 'string'
                            },
                            description: nls.localize(12354, null)
                        }
                    ],
                    description: nls.localize(12355, null)
                },
                quoting: {
                    type: 'string',
                    enum: ['escape', 'strong', 'weak'],
                    enumDescriptions: [
                        nls.localize(12356, null),
                        nls.localize(12357, null),
                        nls.localize(12358, null),
                    ],
                    default: 'strong',
                    description: nls.localize(12359, null)
                }
            }
        }
    ],
    description: nls.localize(12360, null)
};
const args = {
    type: 'array',
    items: {
        oneOf: [
            {
                type: 'string',
            },
            {
                type: 'object',
                required: ['value', 'quoting'],
                properties: {
                    value: {
                        type: 'string',
                        description: nls.localize(12361, null)
                    },
                    quoting: {
                        type: 'string',
                        enum: ['escape', 'strong', 'weak'],
                        enumDescriptions: [
                            nls.localize(12362, null),
                            nls.localize(12363, null),
                            nls.localize(12364, null),
                        ],
                        default: 'strong',
                        description: nls.localize(12365, null)
                    }
                }
            }
        ]
    },
    description: nls.localize(12366, null)
};
const label = {
    type: 'string',
    description: nls.localize(12367, null)
};
const version = {
    type: 'string',
    enum: ['2.0.0'],
    description: nls.localize(12368, null)
};
const identifier = {
    type: 'string',
    description: nls.localize(12369, null),
    deprecationMessage: nls.localize(12370, null)
};
const runOptions = {
    type: 'object',
    additionalProperties: false,
    properties: {
        reevaluateOnRerun: {
            type: 'boolean',
            description: nls.localize(12371, null),
            default: true
        },
        runOn: {
            type: 'string',
            enum: ['default', 'folderOpen'],
            description: nls.localize(12372, null),
            default: 'default'
        },
        instanceLimit: {
            type: 'number',
            description: nls.localize(12373, null),
            default: 1
        },
        instancePolicy: {
            type: 'string',
            enum: ['terminateNewest', 'terminateOldest', 'prompt', 'warn', 'silent'],
            enumDescriptions: [
                nls.localize(12374, null),
                nls.localize(12375, null),
                nls.localize(12376, null),
                nls.localize(12377, null),
                nls.localize(12378, null),
            ],
            description: nls.localize(12379, null),
            default: 'prompt'
        }
    },
    description: nls.localize(12380, null)
};
const commonSchemaDefinitions = commonSchema.definitions;
const options = Objects.deepClone(commonSchemaDefinitions.options);
const optionsProperties = options.properties;
optionsProperties.shell = Objects.deepClone(commonSchemaDefinitions.shellConfiguration);
const taskConfiguration = {
    type: 'object',
    additionalProperties: false,
    properties: {
        label: {
            type: 'string',
            description: nls.localize(12381, null)
        },
        taskName: {
            type: 'string',
            description: nls.localize(12382, null),
            deprecationMessage: nls.localize(12383, null)
        },
        identifier: Objects.deepClone(identifier),
        group: Objects.deepClone(group),
        isBackground: {
            type: 'boolean',
            description: nls.localize(12384, null),
            default: true
        },
        promptOnClose: {
            type: 'boolean',
            description: nls.localize(12385, null),
            default: false
        },
        presentation: Objects.deepClone(presentation),
        icon: Objects.deepClone(icon),
        hide: Objects.deepClone(hide),
        options: options,
        problemMatcher: {
            $ref: '#/definitions/problemMatcherType',
            description: nls.localize(12386, null)
        },
        runOptions: Objects.deepClone(runOptions),
        dependsOn: Objects.deepClone(dependsOn),
        dependsOrder: Objects.deepClone(dependsOrder),
        detail: Objects.deepClone(detail),
    }
};
const taskDefinitions = [];
TaskDefinitionRegistry.onReady().then(() => {
    updateTaskDefinitions();
});
export function updateTaskDefinitions() {
    for (const taskType of TaskDefinitionRegistry.all()) {
        // Check that we haven't already added this task type
        if (taskDefinitions.find(schema => {
            return schema.properties?.type?.enum?.find ? schema.properties?.type.enum.find(element => element === taskType.taskType) : undefined;
        })) {
            continue;
        }
        const schema = Objects.deepClone(taskConfiguration);
        const schemaProperties = schema.properties;
        // Since we do this after the schema is assigned we need to patch the refs.
        schemaProperties.type = {
            type: 'string',
            description: nls.localize(12387, null),
            enum: [taskType.taskType]
        };
        if (taskType.required) {
            schema.required = taskType.required.slice();
        }
        else {
            schema.required = [];
        }
        // Customized tasks require that the task type be set.
        schema.required.push('type');
        if (taskType.properties) {
            for (const key of Object.keys(taskType.properties)) {
                const property = taskType.properties[key];
                schemaProperties[key] = Objects.deepClone(property);
            }
        }
        fixReferences(schema);
        taskDefinitions.push(schema);
    }
}
const customize = Objects.deepClone(taskConfiguration);
customize.properties.customize = {
    type: 'string',
    deprecationMessage: nls.localize(12388, null)
};
if (!customize.required) {
    customize.required = [];
}
customize.required.push('customize');
taskDefinitions.push(customize);
const definitions = Objects.deepClone(commonSchemaDefinitions);
const taskDescription = definitions.taskDescription;
taskDescription.required = ['label'];
const taskDescriptionProperties = taskDescription.properties;
taskDescriptionProperties.label = Objects.deepClone(label);
taskDescriptionProperties.command = Objects.deepClone(command);
taskDescriptionProperties.args = Objects.deepClone(args);
taskDescriptionProperties.isShellCommand = Objects.deepClone(shellCommand);
taskDescriptionProperties.dependsOn = dependsOn;
taskDescriptionProperties.hide = Objects.deepClone(hide);
taskDescriptionProperties.dependsOrder = dependsOrder;
taskDescriptionProperties.identifier = Objects.deepClone(identifier);
taskDescriptionProperties.type = Objects.deepClone(taskType);
taskDescriptionProperties.presentation = Objects.deepClone(presentation);
taskDescriptionProperties.terminal = terminal;
taskDescriptionProperties.icon = Objects.deepClone(icon);
taskDescriptionProperties.group = Objects.deepClone(group);
taskDescriptionProperties.runOptions = Objects.deepClone(runOptions);
taskDescriptionProperties.detail = detail;
taskDescriptionProperties.taskName.deprecationMessage = nls.localize(12389, null);
// Clone the taskDescription for process task before setting a default to prevent two defaults #115281
const processTask = Objects.deepClone(taskDescription);
taskDescription.default = {
    label: 'My Task',
    type: 'shell',
    command: 'echo Hello',
    problemMatcher: []
};
definitions.showOutputType.deprecationMessage = nls.localize(12390, null);
taskDescriptionProperties.echoCommand.deprecationMessage = nls.localize(12391, null);
taskDescriptionProperties.suppressTaskName.deprecationMessage = nls.localize(12392, null);
taskDescriptionProperties.isBuildCommand.deprecationMessage = nls.localize(12393, null);
taskDescriptionProperties.isTestCommand.deprecationMessage = nls.localize(12394, null);
// Process tasks are almost identical schema-wise to shell tasks, but they are required to have a command
processTask.properties.type = {
    type: 'string',
    enum: ['process'],
    default: 'process',
    description: nls.localize(12395, null)
};
processTask.required.push('command');
processTask.required.push('type');
taskDefinitions.push(processTask);
taskDefinitions.push({
    $ref: '#/definitions/taskDescription'
});
const definitionsTaskRunnerConfigurationProperties = definitions.taskRunnerConfiguration.properties;
const tasks = definitionsTaskRunnerConfigurationProperties.tasks;
tasks.items = {
    oneOf: taskDefinitions
};
definitionsTaskRunnerConfigurationProperties.inputs = inputsSchema.definitions.inputs;
definitions.commandConfiguration.properties.isShellCommand = Objects.deepClone(shellCommand);
definitions.commandConfiguration.properties.args = Objects.deepClone(args);
definitions.options.properties.shell = {
    $ref: '#/definitions/shellConfiguration'
};
definitionsTaskRunnerConfigurationProperties.isShellCommand = Objects.deepClone(shellCommand);
definitionsTaskRunnerConfigurationProperties.type = Objects.deepClone(taskType);
definitionsTaskRunnerConfigurationProperties.group = Objects.deepClone(group);
definitionsTaskRunnerConfigurationProperties.presentation = Objects.deepClone(presentation);
definitionsTaskRunnerConfigurationProperties.suppressTaskName.deprecationMessage = nls.localize(12396, null);
definitionsTaskRunnerConfigurationProperties.taskSelector.deprecationMessage = nls.localize(12397, null);
const osSpecificTaskRunnerConfiguration = Objects.deepClone(definitions.taskRunnerConfiguration);
delete osSpecificTaskRunnerConfiguration.properties.tasks;
osSpecificTaskRunnerConfiguration.additionalProperties = false;
definitions.osSpecificTaskRunnerConfiguration = osSpecificTaskRunnerConfiguration;
definitionsTaskRunnerConfigurationProperties.version = Objects.deepClone(version);
const schema = {
    oneOf: [
        {
            'allOf': [
                {
                    type: 'object',
                    required: ['version'],
                    properties: {
                        version: Objects.deepClone(version),
                        windows: {
                            '$ref': '#/definitions/osSpecificTaskRunnerConfiguration',
                            'description': nls.localize(12398, null)
                        },
                        osx: {
                            '$ref': '#/definitions/osSpecificTaskRunnerConfiguration',
                            'description': nls.localize(12399, null)
                        },
                        linux: {
                            '$ref': '#/definitions/osSpecificTaskRunnerConfiguration',
                            'description': nls.localize(12400, null)
                        }
                    }
                },
                {
                    $ref: '#/definitions/taskRunnerConfiguration'
                }
            ]
        }
    ]
};
schema.definitions = definitions;
function deprecatedVariableMessage(schemaMap, property) {
    const mapAtProperty = schemaMap[property].properties;
    if (mapAtProperty) {
        Object.keys(mapAtProperty).forEach(name => {
            deprecatedVariableMessage(mapAtProperty, name);
        });
    }
    else {
        ConfigurationResolverUtils.applyDeprecatedVariableMessage(schemaMap[property]);
    }
}
Object.getOwnPropertyNames(definitions).forEach(key => {
    const newKey = key + '2';
    definitions[newKey] = definitions[key];
    delete definitions[key];
    deprecatedVariableMessage(definitions, newKey);
});
fixReferences(schema);
export function updateProblemMatchers() {
    try {
        const matcherIds = ProblemMatcherRegistry.keys().map(key => '$' + key);
        definitions.problemMatcherType2.oneOf[0].enum = matcherIds;
        definitions.problemMatcherType2.oneOf[2].items.anyOf[0].enum = matcherIds;
    }
    catch (err) {
        console.log('Installing problem matcher ids failed');
    }
}
ProblemMatcherRegistry.onReady().then(() => {
    updateProblemMatchers();
});
export default schema;
//# sourceMappingURL=jsonSchema_v2.js.map