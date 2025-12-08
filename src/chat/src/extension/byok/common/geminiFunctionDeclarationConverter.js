"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.toGeminiFunction = toGeminiFunction;
const genai_1 = require("@google/genai");
// Map JSON schema types to Gemini Type enum
function mapType(jsonType) {
    switch (jsonType) {
        case "object":
            return genai_1.Type.OBJECT;
        case "array":
            return genai_1.Type.ARRAY;
        case "string":
            return genai_1.Type.STRING;
        case "number":
            return genai_1.Type.NUMBER;
        case "integer":
            return genai_1.Type.INTEGER;
        case "boolean":
            return genai_1.Type.BOOLEAN;
        case "null":
            return genai_1.Type.NULL;
        default:
            throw new Error(`Unsupported type: ${jsonType}`);
    }
}
// Convert JSON schema → Gemini function declaration
function toGeminiFunction(name, description, schema) {
    // If schema root is array, we use its items for function parameters
    const target = schema.type === "array" && schema.items ? schema.items : schema;
    const parameters = {
        type: genai_1.Type.OBJECT,
        properties: transformProperties(target.properties || {}),
        required: Array.isArray(target.required) ? target.required : []
    };
    return {
        name,
        description: description || "No description provided.",
        parameters
    };
}
// Recursive transformation for nested properties
function transformProperties(props) {
    const result = {};
    for (const [key, value] of Object.entries(props)) {
        // Handle anyOf, oneOf, allOf by picking the first valid entry
        const effectiveValue = (value.anyOf?.[0] || value.oneOf?.[0] || value.allOf?.[0] || value);
        const transformed = {
            // If type is undefined, throw an error to avoid incorrect assumptions
            type: effectiveValue.type
                ? mapType(effectiveValue.type)
                : genai_1.Type.OBJECT
        };
        if (effectiveValue.description) {
            transformed.description = effectiveValue.description;
        }
        // Enum support
        if (effectiveValue.enum) {
            transformed.enum = effectiveValue.enum;
        }
        if (effectiveValue.type === "object" && effectiveValue.properties) {
            transformed.properties = transformProperties(effectiveValue.properties);
            if (effectiveValue.required) {
                transformed.required = effectiveValue.required;
            }
        }
        else if (effectiveValue.type === "array" && effectiveValue.items) {
            const itemType = effectiveValue.items.type === "object" ? genai_1.Type.OBJECT : mapType(effectiveValue.items.type ?? "object");
            const itemSchema = { type: itemType };
            if (effectiveValue.items.description) {
                itemSchema.description = effectiveValue.items.description;
            }
            if (effectiveValue.items.enum) {
                itemSchema.enum = effectiveValue.items.enum;
            }
            if (effectiveValue.items.properties) {
                itemSchema.properties = transformProperties(effectiveValue.items.properties);
                if (effectiveValue.items.required) {
                    itemSchema.required = effectiveValue.items.required;
                }
            }
            transformed.items = itemSchema;
        }
        result[key] = transformed;
    }
    return result;
}
//# sourceMappingURL=geminiFunctionDeclarationConverter.js.map