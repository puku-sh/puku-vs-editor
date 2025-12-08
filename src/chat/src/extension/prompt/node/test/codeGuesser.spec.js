"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const vitest_1 = require("vitest");
const codeGuesser_1 = require("../../common/codeGuesser");
(0, vitest_1.suite)('codeGuesser', () => {
    (0, vitest_1.test)('looksLikeCode - detects JavaScript configuration as code', () => {
        const jsConfigSnippet = `'prefer-const': 'off',`;
        assert_1.default.strictEqual((0, codeGuesser_1.looksLikeCode)(jsConfigSnippet), true);
    });
    (0, vitest_1.test)('looksLikeCode - detects code-like text', () => {
        const codeSnippet = 'function test() { return true; }';
        assert_1.default.strictEqual((0, codeGuesser_1.looksLikeCode)(codeSnippet), true);
    });
    (0, vitest_1.test)('looksLikeCode - detects non-code text', () => {
        const nonCodeSnippet = 'This is a regular sentence.';
        assert_1.default.strictEqual((0, codeGuesser_1.looksLikeCode)(nonCodeSnippet), false);
    });
    (0, vitest_1.test)('looksLikeCode - detects empty string', () => {
        const emptyString = '';
        assert_1.default.strictEqual((0, codeGuesser_1.looksLikeCode)(emptyString), false);
    });
    (0, vitest_1.test)('looksLikeCode - detects HTML as code', () => {
        const htmlSnippet = '<div>Hello World</div>';
        assert_1.default.strictEqual((0, codeGuesser_1.looksLikeCode)(htmlSnippet), true);
    });
    (0, vitest_1.test)('looksLikeCode - detects JSON as code', () => {
        const jsonSnippet = '{"key": "value"}';
        assert_1.default.strictEqual((0, codeGuesser_1.looksLikeCode)(jsonSnippet), true);
    });
    (0, vitest_1.test)('looksLikeCode - detects CSS as code', () => {
        const cssSnippet = 'body { background-color: #fff; }';
        assert_1.default.strictEqual((0, codeGuesser_1.looksLikeCode)(cssSnippet), true);
    });
    (0, vitest_1.test)('looksLikeCode - detects SQL as code', () => {
        const sqlSnippet = 'SELECT * FROM users WHERE id = 1;';
        assert_1.default.strictEqual((0, codeGuesser_1.looksLikeCode)(sqlSnippet), true);
    });
    (0, vitest_1.test)('looksLikeCode - detects Python as code', () => {
        const pythonSnippet = 'def test(): return True';
        assert_1.default.strictEqual((0, codeGuesser_1.looksLikeCode)(pythonSnippet), true);
    });
    (0, vitest_1.test)('looksLikeCode - detects Java as code', () => {
        const javaSnippet = 'public class Test { public static void main(String[] args) { } }';
        assert_1.default.strictEqual((0, codeGuesser_1.looksLikeCode)(javaSnippet), true);
    });
    (0, vitest_1.test)('looksLikeCode - detects C++ as code', () => {
        const cppSnippet = 'int main() { return 0; }';
        assert_1.default.strictEqual((0, codeGuesser_1.looksLikeCode)(cppSnippet), true);
    });
    (0, vitest_1.test)('looksLikeCode - detects Ruby as code', () => {
        const rubySnippet = 'def test; true; end';
        assert_1.default.strictEqual((0, codeGuesser_1.looksLikeCode)(rubySnippet), true);
    });
    (0, vitest_1.test)('looksLikeCode - detects PHP as code', () => {
        const phpSnippet = '<?php echo "Hello World"; ?>';
        assert_1.default.strictEqual((0, codeGuesser_1.looksLikeCode)(phpSnippet), true);
    });
    (0, vitest_1.test)('looksLikeCode - detects XML as code', () => {
        const xmlSnippet = '<note><to>Tove</to></note>';
        assert_1.default.strictEqual((0, codeGuesser_1.looksLikeCode)(xmlSnippet), true);
    });
    vitest_1.test.skip('looksLikeCode - detects YAML as code', () => {
        const yamlSnippet = 'key: value';
        assert_1.default.strictEqual((0, codeGuesser_1.looksLikeCode)(yamlSnippet), true);
    });
    vitest_1.test.skip('looksLikeCode - detects Markdown as non-code', () => {
        const markdownSnippet = '# This is a heading';
        assert_1.default.strictEqual((0, codeGuesser_1.looksLikeCode)(markdownSnippet), false);
    });
    (0, vitest_1.test)('looksLikeCode - detects plain text as non-code', () => {
        const plainTextSnippet = 'Just some plain text.';
        assert_1.default.strictEqual((0, codeGuesser_1.looksLikeCode)(plainTextSnippet), false);
    });
    vitest_1.test.skip('looksLikeCode - detects shell script as code', () => {
        const shellSnippet = 'echo "Hello World"';
        assert_1.default.strictEqual((0, codeGuesser_1.looksLikeCode)(shellSnippet), true);
    });
    (0, vitest_1.test)('looksLikeCode - detects TypeScript as code', () => {
        const tsSnippet = 'const test: boolean = true;';
        assert_1.default.strictEqual((0, codeGuesser_1.looksLikeCode)(tsSnippet), true);
    });
    (0, vitest_1.test)('looksLikeCode - detects Swift as code', () => {
        const swiftSnippet = 'func test() -> Bool { return true }';
        assert_1.default.strictEqual((0, codeGuesser_1.looksLikeCode)(swiftSnippet), true);
    });
    (0, vitest_1.test)('looksLikeCode - detects Kotlin as code', () => {
        const kotlinSnippet = 'fun test(): Boolean { return true }';
        assert_1.default.strictEqual((0, codeGuesser_1.looksLikeCode)(kotlinSnippet), true);
    });
    (0, vitest_1.test)('looksLikeCode - detects Go as code', () => {
        const goSnippet = 'func main() { fmt.Println("Hello World") }';
        assert_1.default.strictEqual((0, codeGuesser_1.looksLikeCode)(goSnippet), true);
    });
    (0, vitest_1.test)('looksLikeCode - detects Rust as code', () => {
        const rustSnippet = 'fn main() { println!("Hello World"); }';
        assert_1.default.strictEqual((0, codeGuesser_1.looksLikeCode)(rustSnippet), true);
    });
    (0, vitest_1.test)('looksLikeCode - detects Perl as code', () => {
        const perlSnippet = 'print "Hello World";';
        assert_1.default.strictEqual((0, codeGuesser_1.looksLikeCode)(perlSnippet), true);
    });
    (0, vitest_1.test)('looksLikeCode - detects Lua as code', () => {
        const luaSnippet = 'print("Hello World")';
        assert_1.default.strictEqual((0, codeGuesser_1.looksLikeCode)(luaSnippet), true);
    });
    (0, vitest_1.test)('looksLikeCode - detects R as code', () => {
        const rSnippet = 'print("Hello World")';
        assert_1.default.strictEqual((0, codeGuesser_1.looksLikeCode)(rSnippet), true);
    });
    (0, vitest_1.test)('looksLikeCode - detects multiline JavaScript as code', () => {
        const jsSnippet = `
			function add(a, b) {
				return a + b;
			}
			console.log(add(2, 3));
		`;
        assert_1.default.strictEqual((0, codeGuesser_1.looksLikeCode)(jsSnippet), true);
    });
    (0, vitest_1.test)('looksLikeCode - detects multiline Python as code', () => {
        const pythonSnippet = `
			def add(a, b):
				return a + b

			print(add(2, 3))
		`;
        assert_1.default.strictEqual((0, codeGuesser_1.looksLikeCode)(pythonSnippet), true);
    });
    (0, vitest_1.test)('looksLikeCode - detects multiline HTML as code', () => {
        const htmlSnippet = `
			<!DOCTYPE html>
			<html>
			<head>
				<title>Test</title>
			</head>
			<body>
				<p>Hello World</p>
			</body>
			</html>
		`;
        assert_1.default.strictEqual((0, codeGuesser_1.looksLikeCode)(htmlSnippet), true);
    });
    (0, vitest_1.test)('looksLikeCode - detects multiline CSS as code', () => {
        const cssSnippet = `
			body {
				background-color: #fff;
				color: #333;
			}
			h1 {
				font-size: 2em;
			}
		`;
        assert_1.default.strictEqual((0, codeGuesser_1.looksLikeCode)(cssSnippet), true);
    });
    (0, vitest_1.test)('looksLikeCode - detects multiline SQL as code', () => {
        const sqlSnippet = `
			SELECT id, name
			FROM users
			WHERE active = 1
			ORDER BY name;
		`;
        assert_1.default.strictEqual((0, codeGuesser_1.looksLikeCode)(sqlSnippet), true);
    });
    (0, vitest_1.test)('looksLikeCode - detects natural language response as non-code', () => {
        const naturalLanguageSnippet = 'Sure, I can help you with that. What do you need assistance with?';
        assert_1.default.strictEqual((0, codeGuesser_1.looksLikeCode)(naturalLanguageSnippet), false);
    });
    (0, vitest_1.test)('looksLikeCode - detects natural language explanation as non-code', () => {
        const naturalLanguageSnippet = 'To create a new React component, you can use the following code snippet:';
        assert_1.default.strictEqual((0, codeGuesser_1.looksLikeCode)(naturalLanguageSnippet), false);
    });
    (0, vitest_1.test)('looksLikeCode - detects natural language instruction as non-code', () => {
        const naturalLanguageSnippet = 'First, install the necessary dependencies using npm or yarn.';
        assert_1.default.strictEqual((0, codeGuesser_1.looksLikeCode)(naturalLanguageSnippet), false);
    });
    (0, vitest_1.test)('looksLikeCode - detects natural language question as non-code', () => {
        const naturalLanguageSnippet = 'Have you tried restarting your development server?';
        assert_1.default.strictEqual((0, codeGuesser_1.looksLikeCode)(naturalLanguageSnippet), false);
    });
    (0, vitest_1.test)('looksLikeCode - detects natural language suggestion as non-code', () => {
        const naturalLanguageSnippet = 'I suggest checking the console for any error messages.';
        assert_1.default.strictEqual((0, codeGuesser_1.looksLikeCode)(naturalLanguageSnippet), false);
    });
    (0, vitest_1.test)('looksLikeCode - detects natural language response in Spanish as non-code', () => {
        const spanishSnippet = 'Claro, puedo ayudarte con eso. ¿Qué necesitas?';
        assert_1.default.strictEqual((0, codeGuesser_1.looksLikeCode)(spanishSnippet), false);
    });
    (0, vitest_1.test)('looksLikeCode - detects natural language response in French as non-code', () => {
        const frenchSnippet = 'Bien sûr, je peux vous aider avec cela. Que voulez-vous savoir?';
        assert_1.default.strictEqual((0, codeGuesser_1.looksLikeCode)(frenchSnippet), false);
    });
    (0, vitest_1.test)('looksLikeCode - detects natural language response in German as non-code', () => {
        const germanSnippet = 'Natürlich kann ich Ihnen dabei helfen. Was brauchen Sie?';
        assert_1.default.strictEqual((0, codeGuesser_1.looksLikeCode)(germanSnippet), false);
    });
    (0, vitest_1.test)('looksLikeCode - detects natural language response in Chinese as non-code', () => {
        const chineseSnippet = '当然，我可以帮你。你需要什么帮助？';
        assert_1.default.strictEqual((0, codeGuesser_1.looksLikeCode)(chineseSnippet), false);
    });
    (0, vitest_1.test)('looksLikeCode - detects natural language response in Japanese as non-code', () => {
        const japaneseSnippet = 'もちろん、お手伝いできます。何が必要ですか？';
        assert_1.default.strictEqual((0, codeGuesser_1.looksLikeCode)(japaneseSnippet), false);
    });
    (0, vitest_1.test)('looksLikeCode - detects natural language response in Russian as non-code', () => {
        const russianSnippet = 'Конечно, я могу вам помочь. Что вам нужно?';
        assert_1.default.strictEqual((0, codeGuesser_1.looksLikeCode)(russianSnippet), false);
    });
});
//# sourceMappingURL=codeGuesser.spec.js.map