"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const validator_1 = require("../../common/validator");
(0, vitest_1.describe)('vRequired', () => {
    (0, vitest_1.it)('should mark a field as required', () => {
        const validator = (0, validator_1.vObj)({
            name: (0, validator_1.vRequired)((0, validator_1.vString)()),
            age: (0, validator_1.vNumber)(),
        });
        // Missing required field should fail
        const result1 = validator.validate({ age: 25 });
        (0, vitest_1.expect)(result1.error).toBeDefined();
        (0, vitest_1.expect)(result1.error?.message).toContain("Required field 'name' is missing");
        // Providing required field should succeed
        const result2 = validator.validate({ name: "John", age: 25 });
        (0, vitest_1.expect)(result2.error).toBeUndefined();
        (0, vitest_1.expect)(result2.content).toEqual({ name: "John", age: 25 });
    });
    (0, vitest_1.it)('should allow optional fields to be missing', () => {
        const validator = (0, validator_1.vObj)({
            name: (0, validator_1.vRequired)((0, validator_1.vString)()),
            age: (0, validator_1.vNumber)(), // optional
            city: (0, validator_1.vString)(), // optional
        });
        // Only required field provided
        const result = validator.validate({ name: "John" });
        (0, vitest_1.expect)(result.error).toBeUndefined();
        (0, vitest_1.expect)(result.content).toEqual({ name: "John" });
    });
    (0, vitest_1.it)('should validate the value when required field is provided', () => {
        const validator = (0, validator_1.vObj)({
            name: (0, validator_1.vRequired)((0, validator_1.vString)()),
        });
        // Wrong type for required field
        const result = validator.validate({ name: 123 });
        (0, vitest_1.expect)(result.error).toBeDefined();
        (0, vitest_1.expect)(result.error?.message).toContain("Expected string");
    });
    (0, vitest_1.it)('should handle multiple required fields', () => {
        const validator = (0, validator_1.vObj)({
            firstName: (0, validator_1.vRequired)((0, validator_1.vString)()),
            lastName: (0, validator_1.vRequired)((0, validator_1.vString)()),
            age: (0, validator_1.vNumber)(), // optional
        });
        // Missing one required field
        const result1 = validator.validate({ firstName: "John" });
        (0, vitest_1.expect)(result1.error).toBeDefined();
        (0, vitest_1.expect)(result1.error?.message).toContain("Required field 'lastName' is missing");
        // All required fields provided
        const result2 = validator.validate({ firstName: "John", lastName: "Doe" });
        (0, vitest_1.expect)(result2.error).toBeUndefined();
        (0, vitest_1.expect)(result2.content).toEqual({ firstName: "John", lastName: "Doe" });
        // All fields provided
        const result3 = validator.validate({ firstName: "John", lastName: "Doe", age: 30 });
        (0, vitest_1.expect)(result3.error).toBeUndefined();
        (0, vitest_1.expect)(result3.content).toEqual({ firstName: "John", lastName: "Doe", age: 30 });
    });
    (0, vitest_1.it)('should generate correct JSON schema with required fields', () => {
        const validator = (0, validator_1.vObj)({
            name: (0, validator_1.vRequired)((0, validator_1.vString)()),
            age: (0, validator_1.vNumber)(),
            isActive: (0, validator_1.vRequired)((0, validator_1.vBoolean)()),
        });
        const schema = validator.toSchema();
        (0, vitest_1.expect)(schema).toEqual({
            type: "object",
            properties: {
                name: { type: "string" },
                age: { type: "number" },
                isActive: { type: "boolean" },
            },
            required: ["name", "isActive"],
        });
    });
    (0, vitest_1.it)('should generate JSON schema without required array when no fields are required', () => {
        const validator = (0, validator_1.vObj)({
            name: (0, validator_1.vString)(),
            age: (0, validator_1.vNumber)(),
        });
        const schema = validator.toSchema();
        (0, vitest_1.expect)(schema).toEqual({
            type: "object",
            properties: {
                name: { type: "string" },
                age: { type: "number" },
            },
        });
        (0, vitest_1.expect)(schema.required).toBeUndefined();
    });
    (0, vitest_1.it)('should handle nested objects with required fields', () => {
        const validator = (0, validator_1.vObj)({
            user: (0, validator_1.vRequired)((0, validator_1.vObj)({
                name: (0, validator_1.vRequired)((0, validator_1.vString)()),
                email: (0, validator_1.vString)(), // optional
            })),
            metadata: (0, validator_1.vObj)({
                created: (0, validator_1.vString)(),
            }),
        });
        // Missing required nested object
        const result1 = validator.validate({});
        (0, vitest_1.expect)(result1.error).toBeDefined();
        (0, vitest_1.expect)(result1.error?.message).toContain("Required field 'user' is missing");
        // Required object present but missing required nested field
        const result2 = validator.validate({ user: {} });
        (0, vitest_1.expect)(result2.error).toBeDefined();
        (0, vitest_1.expect)(result2.error?.message).toContain("Required field 'name' is missing");
        // Valid nested structure
        const result3 = validator.validate({ user: { name: "John" } });
        (0, vitest_1.expect)(result3.error).toBeUndefined();
        (0, vitest_1.expect)(result3.content).toEqual({ user: { name: "John" } });
    });
    (0, vitest_1.it)('should handle explicit undefined for required fields', () => {
        const validator = (0, validator_1.vObj)({
            name: (0, validator_1.vRequired)((0, validator_1.vString)()),
        });
        // Explicitly setting to undefined should fail
        const result = validator.validate({ name: undefined });
        (0, vitest_1.expect)(result.error).toBeDefined();
        (0, vitest_1.expect)(result.error?.message).toContain("Required field 'name' is missing");
    });
    (0, vitest_1.it)('should allow null for optional fields but not required fields', () => {
        const validator = (0, validator_1.vObj)({
            requiredField: (0, validator_1.vRequired)((0, validator_1.vString)()),
            optionalField: (0, validator_1.vString)(),
        });
        // null for required field should validate as wrong type (not string)
        const result1 = validator.validate({ requiredField: null });
        (0, vitest_1.expect)(result1.error).toBeDefined();
        // null for optional field when optional field is present should validate as wrong type
        const result2 = validator.validate({ requiredField: "test", optionalField: null });
        (0, vitest_1.expect)(result2.error).toBeDefined();
    });
});
//# sourceMappingURL=validator.spec.js.map