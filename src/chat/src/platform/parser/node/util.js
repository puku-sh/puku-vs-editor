"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractIdentifier = extractIdentifier;
exports.isDocumentableNode = isDocumentableNode;
const treeSitterLanguages_1 = require("./treeSitterLanguages");
/**
 * Extracts the identifier for the given node (is based on heuristics, so not 100% accurate for all languages)
 */
function extractIdentifier(node, languageId) {
    switch (languageId) {
        case 'python':
        case 'csharp':
            return node.children.find(c => c.type.match(/identifier/))?.text;
        case 'go': {
            const identifierChild = node.children.find(c => c.type.match(/identifier/));
            if (identifierChild) {
                return identifierChild.text;
            }
            const specChild = node.children.find(c => c.type.match(/spec/));
            return specChild?.children.find(c => c.type.match(/identifier/))?.text;
        }
        case 'javascript':
        case 'javascriptreact':
        case 'typescript':
        case 'typescriptreact':
        case 'cpp': {
            const declarator = node.children.find(c => c.type.match(/declarator/));
            if (declarator) {
                return declarator.children.find(c => c.type.match(/identifier/))?.text;
            }
            const identifierChild = node.children.find(c => c.type.match(/identifier/));
            return identifierChild?.text;
        }
        case 'java': {
            /*
                handles
                ```java
                // class identifier
                class Fo<<>>o { }

                class Foo {
                    // method identifier
                    public void ba<<>>r() { }
                }

                // enum identifier
                enum F<<>>oo {
                    // enum constant identifier
                    BA<<>>Z
                }

                // interface identifier
                interface Fo<<>>o { }
                ```
            */
            const identifierChild = node.children.find(c => c.type === 'identifier');
            return identifierChild?.text;
        }
        case 'ruby':
            return node.children.find(c => c.type.match(/constant|identifier/))?.text;
        default:
            return node.children.find(c => c.type.match(/identifier/))?.text;
    }
}
function isDocumentableNode(node, language) {
    switch (language) {
        case treeSitterLanguages_1.WASMLanguage.TypeScript:
        case treeSitterLanguages_1.WASMLanguage.TypeScriptTsx:
        case treeSitterLanguages_1.WASMLanguage.JavaScript:
            return node.type.match(/definition|declaration|declarator|export_statement/);
        case treeSitterLanguages_1.WASMLanguage.Go:
            return node.type.match(/definition|declaration|declarator|var_spec/);
        case treeSitterLanguages_1.WASMLanguage.Cpp:
            return node.type.match(/definition|declaration|class_specifier/);
        case treeSitterLanguages_1.WASMLanguage.Ruby:
            return node.type.match(/module|class|method|assignment/);
        default:
            return node.type.match(/definition|declaration|declarator/);
    }
}
//# sourceMappingURL=util.js.map