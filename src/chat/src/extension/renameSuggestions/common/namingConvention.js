"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.NamingConvention = void 0;
exports.guessNamingConvention = guessNamingConvention;
exports.enforceNamingConvention = enforceNamingConvention;
exports.chunkUpIdentByConvention = chunkUpIdentByConvention;
var NamingConvention;
(function (NamingConvention) {
    /** example: camelCase */
    NamingConvention["CamelCase"] = "camelCase";
    /** example: PascalCase */
    NamingConvention["PascalCase"] = "PascalCase";
    /** example: snake_case */
    NamingConvention["SnakeCase"] = "snake_case";
    /** example: SCREAMING_SNAKE_CASE */
    NamingConvention["ScreamingSnakeCase"] = "SCREAMING_SNAKE_CASE";
    /** example: Capital_snake_case */
    NamingConvention["CapitalSnakeCase"] = "Capital_snake_case";
    /** example: kebab-case */
    NamingConvention["KebabCase"] = "kebab-case";
    /** example: Capitalized */
    NamingConvention["Capitalized"] = "Capitalized";
    /** example: ALLCAPS */
    NamingConvention["Uppercase"] = "Uppercase";
    /**
     * example: lowercase
     *
     * @remark could also be camel case, snake case, kebab case, e.g., `foo`
     */
    NamingConvention["LowerCase"] = "lowercase";
    NamingConvention["Unknown"] = "Unknown";
})(NamingConvention || (exports.NamingConvention = NamingConvention = {}));
// Regular expressions for each naming convention
function guessNamingConvention(ident) {
    // lowercase
    if (/^[a-z][a-z0-9]*$/.test(ident)) {
        return NamingConvention.LowerCase;
    }
    // camelCase
    if (/^[a-z][a-zA-Z0-9]*$/.test(ident)) {
        return NamingConvention.CamelCase;
    }
    // snake_case
    if (/^[a-z]+(_[a-z0-9]+)*$/.test(ident)) {
        return NamingConvention.SnakeCase;
    }
    // kebab-case
    if (/^[a-z]+(-[a-z0-9]+)*$/.test(ident)) {
        return NamingConvention.KebabCase;
    }
    // Capitalized
    if (/^[A-Z][a-z0-9]*$/.test(ident)) {
        return NamingConvention.Capitalized;
    }
    // SCREAMING_SNAKE_CASE
    if (/^[A-Z0-9]+(_[A-Z0-9]+)+$/.test(ident)) {
        return NamingConvention.ScreamingSnakeCase;
    }
    // UPPERCASE
    if (/^[A-Z]+$/.test(ident)) {
        return NamingConvention.Uppercase;
    }
    // PascalCase
    if (/^[A-Z][a-zA-Z0-9]*$/.test(ident)) {
        return NamingConvention.PascalCase;
    }
    // Capital_snake_case
    if (/^[A-Z][a-z0-9]*(_[a-z0-9]+)*$/.test(ident)) {
        return NamingConvention.CapitalSnakeCase;
    }
    return NamingConvention.Unknown;
}
function chunksToCamelCase(chunks) {
    return chunks.map((chunk, i) => {
        if (i === 0) {
            return chunk.toLowerCase();
        }
        return chunk.charAt(0).toUpperCase() + chunk.substring(1).toLowerCase();
    }).join('');
}
function chunksToPascalCase(chunks) {
    return chunks.map(chunk => chunk.charAt(0).toUpperCase() + chunk.substring(1).toLowerCase()).join('');
}
function chunksToSnakeCase(chunks) {
    return chunks.map(chunk => chunk.toLowerCase()).join('_');
}
function chunksToKebabCase(chunks) {
    return chunks.map(chunk => chunk.toLowerCase()).join('-');
}
function enforceNamingConvention(givenIdent, targetConvention) {
    const namingConvention = guessNamingConvention(givenIdent);
    if (namingConvention === targetConvention) {
        return givenIdent;
    }
    else {
        const chunks = chunkUpIdentByConvention(givenIdent, namingConvention);
        switch (targetConvention) {
            case NamingConvention.CamelCase:
                return chunksToCamelCase(chunks);
            case NamingConvention.PascalCase:
                return chunksToPascalCase(chunks);
            case NamingConvention.SnakeCase:
                return chunksToSnakeCase(chunks);
            case NamingConvention.ScreamingSnakeCase:
                return chunksToSnakeCase(chunks).toUpperCase();
            case NamingConvention.CapitalSnakeCase:
                return chunksToSnakeCase(chunks).charAt(0).toUpperCase() + chunksToSnakeCase(chunks).substring(1);
            case NamingConvention.KebabCase:
                return chunksToKebabCase(chunks);
            case NamingConvention.Capitalized:
                return chunksToCamelCase(chunks).charAt(0).toUpperCase() + chunksToCamelCase(chunks).substring(1);
            case NamingConvention.Uppercase:
                return givenIdent.toUpperCase();
            case NamingConvention.LowerCase:
                return givenIdent.toLowerCase();
            case NamingConvention.Unknown:
                return givenIdent;
        }
    }
}
function chunkUpIdentByConvention(ident, identConvention) {
    switch (identConvention) {
        case NamingConvention.CamelCase:
        case NamingConvention.PascalCase:
            return ident.split(/(?=[A-Z])/);
        case NamingConvention.SnakeCase:
        case NamingConvention.ScreamingSnakeCase:
        case NamingConvention.CapitalSnakeCase:
        case NamingConvention.KebabCase:
            return ident.split(/[-_]/).map(chunk => chunk.toLowerCase());
        case NamingConvention.Capitalized:
        case NamingConvention.Uppercase:
        case NamingConvention.LowerCase:
        case NamingConvention.Unknown:
            return [ident];
    }
}
//# sourceMappingURL=namingConvention.js.map