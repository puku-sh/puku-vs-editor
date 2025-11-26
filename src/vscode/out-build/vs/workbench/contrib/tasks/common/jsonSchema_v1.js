/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import * as Objects from '../../../../base/common/objects.js';
import { ProblemMatcherRegistry } from './problemMatcher.js';
import commonSchema from './jsonSchemaCommon.js';
const schema = {
    oneOf: [
        {
            allOf: [
                {
                    type: 'object',
                    required: ['version'],
                    properties: {
                        version: {
                            type: 'string',
                            enum: ['0.1.0'],
                            deprecationMessage: nls.localize(12304, null),
                            description: nls.localize(12305, null)
                        },
                        _runner: {
                            deprecationMessage: nls.localize(12306, null)
                        },
                        runner: {
                            type: 'string',
                            enum: ['process', 'terminal'],
                            default: 'process',
                            description: nls.localize(12307, null)
                        },
                        windows: {
                            $ref: '#/definitions/taskRunnerConfiguration',
                            description: nls.localize(12308, null)
                        },
                        osx: {
                            $ref: '#/definitions/taskRunnerConfiguration',
                            description: nls.localize(12309, null)
                        },
                        linux: {
                            $ref: '#/definitions/taskRunnerConfiguration',
                            description: nls.localize(12310, null)
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
const shellCommand = {
    type: 'boolean',
    default: true,
    description: nls.localize(12311, null)
};
schema.definitions = Objects.deepClone(commonSchema.definitions);
const definitions = schema.definitions;
definitions['commandConfiguration']['properties']['isShellCommand'] = Objects.deepClone(shellCommand);
definitions['taskDescription']['properties']['isShellCommand'] = Objects.deepClone(shellCommand);
definitions['taskRunnerConfiguration']['properties']['isShellCommand'] = Objects.deepClone(shellCommand);
Object.getOwnPropertyNames(definitions).forEach(key => {
    const newKey = key + '1';
    definitions[newKey] = definitions[key];
    delete definitions[key];
});
function fixReferences(literal) {
    if (Array.isArray(literal)) {
        literal.forEach(fixReferences);
    }
    else if (typeof literal === 'object') {
        if (literal['$ref']) {
            literal['$ref'] = literal['$ref'] + '1';
        }
        Object.getOwnPropertyNames(literal).forEach(property => {
            const value = literal[property];
            if (Array.isArray(value) || typeof value === 'object') {
                fixReferences(value);
            }
        });
    }
}
fixReferences(schema);
ProblemMatcherRegistry.onReady().then(() => {
    try {
        const matcherIds = ProblemMatcherRegistry.keys().map(key => '$' + key);
        definitions.problemMatcherType1.oneOf[0].enum = matcherIds;
        definitions.problemMatcherType1.oneOf[2].items.anyOf[1].enum = matcherIds;
    }
    catch (err) {
        console.log('Installing problem matcher ids failed');
    }
});
export default schema;
//# sourceMappingURL=jsonSchema_v1.js.map