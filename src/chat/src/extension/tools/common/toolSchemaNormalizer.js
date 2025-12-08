"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeToolSchema = normalizeToolSchema;
const l10n = __importStar(require("@vscode/l10n"));
const ajv_1 = __importDefault(require("ajv"));
const jsonSchemaDraft7_1 = require("../../../platform/configuration/common/jsonSchemaDraft7");
const iterator_1 = require("../../../util/vs/base/common/iterator");
const lazy_1 = require("../../../util/vs/base/common/lazy");
const objects_1 = require("../../../util/vs/base/common/objects");
/**
 * Normalizes tool schema for various model restrictions. This is a hack
 * just to avoid issues with certain model constraints, which currently result
 * in CAPI returning a blank 400 error. This is a terrible experience in the
 * extensible MCP scenario, so here we _try_ to normalize known cases to
 * avoid that (though there may certainly be unknown cases).
 */
function normalizeToolSchema(family, tools, onFix) {
    if (!tools?.length) {
        return undefined;
    }
    const output = [];
    for (const tool of tools) {
        try {
            const cloned = (0, objects_1.deepClone)(tool);
            for (const rule of fnRules) {
                rule(family, cloned.function, msg => onFix?.(cloned.function.name, msg));
            }
            if (cloned.function.parameters) {
                for (const rule of jsonSchemaRules) {
                    if (cloned.function.parameters) {
                        rule(family, cloned.function.parameters, msg => onFix?.(cloned.function.name, msg));
                    }
                }
            }
            output.push(cloned);
        }
        catch (e) {
            const e2 = new Error(l10n.t `Failed to validate tool ${tool.function.name}: ${e}. Please open a Github issue for the MCP server or extension which provides this tool`);
            e2.stack = e.stack;
            throw e2;
        }
    }
    return output;
}
const fnRules = [
    (_family, n, didFix) => {
        if (n.parameters === undefined) {
            return;
        }
        if (!n.parameters || n.parameters.type !== 'object') {
            n.parameters = { type: 'object', properties: {} };
            didFix('schema must be an object if present');
        }
        const obj = n.parameters;
        if (!obj.properties) {
            obj.properties = {};
            didFix('schema must have a properties object');
        }
    },
    (_family, n, didFix) => {
        if (!n.description) {
            n.description = 'No description provided';
            didFix('schema description may not be empty');
        }
    },
];
const ajvJsonValidator = new lazy_1.Lazy(() => {
    const ajv = new ajv_1.default({
        coerceTypes: true,
        strictTypes: true,
        allowUnionTypes: true,
    });
    ajv.addFormat('uri', (value) => URL.canParse(value));
    ajv.addFormat('regex', (value) => typeof value === 'string');
    return ajv.compile(jsonSchemaDraft7_1.jsonSchemaDraft7);
});
const jsonSchemaRules = [
    (_family, schema) => {
        if (!ajvJsonValidator.value(schema)) {
            throw new Error('tool parameters do not match JSON schema: ' + ajvJsonValidator.value.errors.map(e => e.instancePath + ' ' + e.message).join('\n'));
        }
    },
    (_family, schema) => {
        forEachSchemaNode(schema, n => {
            if (n && 'type' in n && n.type === 'array' && !n.items) {
                throw new Error('tool parameters array type must have items');
            }
        });
    },
    (family, schema, onFix) => {
        if (!isGpt4ish(family)) {
            return;
        }
        forEachSchemaNode(schema, n => {
            if (n && 'description' in n && n.description && n.description.length > gpt4oMaxStringLength) {
                n.description = n.description.substring(0, gpt4oMaxStringLength);
                onFix(`object description is too long (truncated to ${gpt4oMaxStringLength} chars)`);
            }
        });
    },
    (family, schema, onFix) => {
        if (!isGpt4ish(family)) {
            return;
        }
        forEachSchemaNode(schema, n => {
            for (const key of Object.keys(n)) {
                if (gpt4oUnsupportedSchemaKeywords.has(key)) {
                    delete n[key];
                    onFix(`object has unsupported schema keyword '${key}'`);
                }
            }
        });
    },
    (_family, schema, onFix) => {
        // validated this fails both for claude and 4o
        const unsupported = ['oneOf', 'anyOf', 'allOf', 'not', 'if', 'then', 'else'];
        for (const key of unsupported) {
            if (schema.hasOwnProperty(key)) {
                onFix(`object has unsupported top-level schema keyword '${key}'`);
                delete schema[key];
            }
        }
    },
    (_family, schema, onFix) => {
        forEachSchemaNode(schema, n => {
            if (n && typeof n === 'object' && n.type === 'object') {
                const obj = n;
                if (obj.properties && typeof obj.properties === 'object' && obj.required && Array.isArray(obj.required)) {
                    obj.required = obj.required.filter(key => {
                        if (obj.properties[key] === undefined) {
                            onFix(`object has required property '${key}' that is not defined`);
                            return false;
                        }
                        return true;
                    });
                }
            }
        });
    },
    (family, schema, onFix) => {
        if (!isDraft2020_12Schema(family)) {
            return;
        }
        forEachSchemaNode(schema, n => {
            if (n && typeof n === 'object' && n.type === 'array') {
                const obj = n;
                if (obj.items && Array.isArray(obj.items)) {
                    onFix(`array schema has items as an array, which is not supported in Draft 2020-12`);
                    obj.items = { anyOf: obj.items };
                }
            }
        });
    },
];
function forEachSchemaNode(input, fn) {
    if (!input || typeof input !== 'object') {
        return;
    }
    const r = fn(input);
    if (r !== undefined) {
        return r;
    }
    const children = [
        'properties' in input ? Object.values(input.properties || {}) : undefined,
        'items' in input ? (Array.isArray(input.items) ? input.items : [input.items]) : undefined,
        'dependencies' in input ? Object.values(input.dependencies || {}) : undefined,
        'patternProperties' in input ? Object.values(input.patternProperties || {}) : undefined,
        'additionalProperties' in input ? [input.additionalProperties] : undefined,
        'anyOf' in input ? input.anyOf : undefined,
        'allOf' in input ? input.allOf : undefined,
        'oneOf' in input ? input.oneOf : undefined,
        'not' in input ? input.not : undefined,
        'if' in input ? input.if : undefined,
        'then' in input ? input.then : undefined,
        'else' in input ? input.else : undefined,
        'contains' in input ? input.contains : undefined,
    ];
    for (const child of children) {
        for (const value of (Array.isArray(child) ? child : iterator_1.Iterable.single(child))) {
            const r = forEachSchemaNode(value, fn);
            if (r !== undefined) {
                return r;
            }
        }
    }
}
// Whether the model is a GPT-4 family model.
const isGpt4ish = (family) => family.startsWith('gpt-4');
// Whether the model is a model known to follow JSON Schema Draft 2020-12, (versus Draft 7).
const isDraft2020_12Schema = (family) => family.startsWith('gpt-4') || family.startsWith('claude-') || family.startsWith('o4');
const gpt4oMaxStringLength = 1024;
// Keywords in schema that gpt-4o does not support. From Toby at Github who wrote a normalizer
// https://gist.github.com/toby/dfe40041ae5b02d44ea21321b9f7dfd2
const gpt4oUnsupportedSchemaKeywords = new Set([
    "minLength",
    "maxLength",
    "pattern",
    "default",
    "format",
    "minimum",
    "maximum",
    "multipleOf",
    "patternProperties",
    "unevaluatedProperties",
    "propertyNames",
    "minProperties",
    "maxProperties",
    "unevaluatedItems",
    "contains",
    "minContains",
    "maxContains",
    "minItems",
    "maxItems",
    "uniqueItems"
]);
//# sourceMappingURL=toolSchemaNormalizer.js.map