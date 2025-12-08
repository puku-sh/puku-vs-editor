"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.TreeSitterUnknownLanguageError = exports.WASMLanguage = void 0;
exports.getWasmLanguage = getWasmLanguage;
/**
 * Languages we can parse using tree-sitter. Each enum member corresponds to a tree-sitter parser.
 */
var WASMLanguage;
(function (WASMLanguage) {
    WASMLanguage["Python"] = "python";
    WASMLanguage["JavaScript"] = "javascript";
    WASMLanguage["TypeScript"] = "typescript";
    WASMLanguage["TypeScriptTsx"] = "tsx";
    WASMLanguage["Go"] = "go";
    WASMLanguage["Ruby"] = "ruby";
    WASMLanguage["Csharp"] = "csharp";
    WASMLanguage["Cpp"] = "cpp";
    WASMLanguage["Java"] = "java";
    WASMLanguage["Rust"] = "rust";
    WASMLanguage["Php"] = "php";
})(WASMLanguage || (exports.WASMLanguage = WASMLanguage = {}));
class TreeSitterUnknownLanguageError extends Error {
    constructor(language) {
        super(`Unrecognized language: ${language}`);
    }
}
exports.TreeSitterUnknownLanguageError = TreeSitterUnknownLanguageError;
const languageIdToWasmLanguageMapping = {
    python: WASMLanguage.Python,
    javascript: WASMLanguage.JavaScript,
    javascriptreact: WASMLanguage.JavaScript,
    jsx: WASMLanguage.JavaScript,
    typescript: WASMLanguage.TypeScript,
    typescriptreact: WASMLanguage.TypeScriptTsx,
    tsx: WASMLanguage.TypeScriptTsx,
    go: WASMLanguage.Go,
    ruby: WASMLanguage.Ruby,
    csharp: WASMLanguage.Csharp,
    cpp: WASMLanguage.Cpp,
    c: WASMLanguage.Cpp, // C uses C++ parser
    java: WASMLanguage.Java,
    rust: WASMLanguage.Rust,
    php: WASMLanguage.Php,
};
/**
 * @returns a {@link WASMLanguage} if can convert the language ID (from VS Code); otherwise, returns `undefined`.
 */
function getWasmLanguage(languageId) {
    if (languageId in languageIdToWasmLanguageMapping) {
        return languageIdToWasmLanguageMapping[languageId];
    }
}
//# sourceMappingURL=treeSitterLanguages.js.map