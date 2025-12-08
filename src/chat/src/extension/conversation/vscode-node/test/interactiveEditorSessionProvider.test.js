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
const vscode_1 = require("vscode");
const languageDiagnosticsService_1 = require("../../../../platform/languages/common/languageDiagnosticsService");
const parserService_1 = require("../../../../platform/parser/node/parserService");
const vscodeTypes_1 = require("../../../../vscodeTypes");
const fixSelection_1 = require("../../../context/node/resolvers/fixSelection");
const services_1 = require("../../../test/vscode-node/services");
suite('findFixRangeOfInterest', function () {
    let accessor;
    let typeScriptDoc;
    let javaDoc;
    let pythonDoc;
    let cppDoc;
    suiteSetup(async function () {
        accessor = (0, services_1.createExtensionTestingServices)().createTestingAccessor();
        await setupTypeScriptDoc();
        await setupPythonDoc();
        await setupJavaDoc();
        await setupCppDoc();
    });
    async function setupTypeScriptDoc() {
        const typeScriptContent = [
            /* 0  */ 'class Person {',
            /* 1  */ '	readonly myName = "Paul";',
            /* 2  */ '	readonly myFriendName = "Marc";',
            /* 3  */ '	readonly threshold = 3;',
            /* 4  */ '',
            /* 5  */ '	sayMyName() {',
            /* 6  */ '		return this.myName;',
            /* 7  */ '	}',
            /* 8  */ '	sayHi() {',
            /* 9  */ '		return "hi";',
            /* 10 */ '	}',
            /* 11 */ '	speak() {',
            /* 12 */ '		const salute = () => {',
            /* 13 */ '			for (let i = 0; i < 5; i++) {',
            /* 14 */ '				if (i > this.threshold) {',
            /* 15 */ '',
            /* 16 */ '                  const x = 3;',
            /* 17 */ '                  const x = 10;',
            /* 18 */ '					|r|eturn this.sayHi() + this.sayMyName();',
            /* 19 */ '',
            /* 20 */ '				}',
            /* 21 */ '			}',
            /* 22 */ '		};',
            /* 23 */ '		salute();',
            /* 24 */ '	}',
            /* 25 */ '}',
        ].join('\n');
        typeScriptDoc = await vscode_1.workspace.openTextDocument({
            language: 'typescript',
            content: typeScriptContent,
        });
    }
    test('typescript - max number of lines 4', async function () {
        await assertfindFixRangeOfInterestAsync(accessor, typeScriptDoc, 4, [16, 18]);
    });
    test('typescript - max number of lines 10', async function () {
        await assertfindFixRangeOfInterestAsync(accessor, typeScriptDoc, 10, [13, 21]);
    });
    test('typescript - max number of lines 15', async function () {
        await assertfindFixRangeOfInterestAsync(accessor, typeScriptDoc, 15, [11, 24]);
    });
    async function setupPythonDoc() {
        const pythonContent = [
            /* 0  */ 'participant = ["Monalisa", "Akbar Hossain",',
            /* 1  */ '				"Jakir Hasan", "Zahadur Rahman", "Zenifer Lopez"]',
            /* 2  */ '',
            /* 3  */ 'def selected_person(part):',
            /* 4  */ '	selected = ["Akbar Hossain", "Zillur Rahman", "Monalisa"]',
            /* 5  */ '	if (part in selected):',
            /* 6  */ '		|r|eturn True',
            /* 7  */ '	return False',
            /* 8  */ '',
            /* 9  */ 'selectedList = filter(selected_person, participant)',
            /* 10 */ '',
            /* 11 */ 'print("The selected candidates are:")',
            /* 12 */ 'for candidate in selectedList:',
            /* 13 */ '	print(candidate)',
        ].join('\n');
        pythonDoc = await vscode_1.workspace.openTextDocument({
            language: 'python',
            content: pythonContent,
        });
    }
    test('python - max number of lines 5', async function () {
        await assertfindFixRangeOfInterestAsync(accessor, pythonDoc, 5, [3, 7]);
    });
    test('python - max number of lines 11', async function () {
        await assertfindFixRangeOfInterestAsync(accessor, pythonDoc, 11, [0, 9]);
    });
    test('python - max number of lines 16', async function () {
        await assertfindFixRangeOfInterestAsync(accessor, pythonDoc, 16, [0, 13]);
    });
    async function setupJavaDoc() {
        const javaContent = [
            /* 0 */ 'public class Main {',
            /* 1 */ '	public static void main(String[] args) {',
            /* 2 */ '		final int myNum = 15;',
            /* 3 */ '		for (int i = 0; i <= 10; i = i + 2) {',
            /* 4 */ '			|S|ystem.out.println(i);',
            /* 5 */ '		}',
            /* 6 */ '		myNum = 20; // will generate an error',
            /* 7 */ '		System.out.println(myNum);',
            /* 8 */ '	}',
            /* 9 */ '}',
        ].join('\n');
        javaDoc = await vscode_1.workspace.openTextDocument({
            language: 'java',
            content: javaContent,
        });
    }
    test('java - max number of lines 3', async function () {
        await assertfindFixRangeOfInterestAsync(accessor, javaDoc, 3, [3, 5]);
    });
    test('java - max number of lines 5', async function () {
        await assertfindFixRangeOfInterestAsync(accessor, javaDoc, 5, [2, 6]);
    });
    test('java - max number of lines 9', async function () {
        await assertfindFixRangeOfInterestAsync(accessor, javaDoc, 9, [1, 8]);
    });
    async function setupCppDoc() {
        const cppContent = [
            /* 0  */ 'bool isArmstrong(int x)',
            /* 1  */ '{',
            /* 2  */ '	|/|/ Calling order function',
            /* 3  */ '	int n = order(x);',
            /* 4  */ '	int temp = x, sum = 0;',
            /* 5  */ '',
            /* 6  */ '	while (temp) {',
            /* 7  */ '		int r = temp % 10;',
            /* 8  */ '		sum += power(r, n);',
            /* 9  */ '		temp = temp / 10;',
            /* 10 */ '	}',
            /* 11 */ '',
            /* 12 */ '	// If satisfies Armstrong',
            /* 13 */ '	// condition',
            /* 14 */ '	return (sum == x);',
            /* 15 */ '}',
        ].join('\n');
        cppDoc = await vscode_1.workspace.openTextDocument({
            language: 'cpp',
            content: cppContent,
        });
    }
    test('cpp - max length 4', async function () {
        await assertfindFixRangeOfInterestAsync(accessor, cppDoc, 4, [2, 4]);
    });
    test('cpp - max length 11', async function () {
        await assertfindFixRangeOfInterestAsync(accessor, cppDoc, 11, [2, 10]);
    });
    test('cpp - max length 12', async function () {
        await assertfindFixRangeOfInterestAsync(accessor, cppDoc, 12, [2, 10]);
    });
});
async function assertfindFixRangeOfInterestAsync(accessor, _document, maximumNumberOfLines, expectedLineRange) {
    let startPosition;
    let endPosition;
    const documentLineCount = _document.lineCount;
    for (let index = 0; index < documentLineCount; index++) {
        const line = _document.lineAt(index);
        if (!line.text.includes('|')) {
            continue;
        }
        const firstPipeIndex = line.text.indexOf('|');
        const position = new vscodeTypes_1.Position(index, firstPipeIndex);
        if (!startPosition) {
            startPosition = position;
            const secondPipeIndex = line.text.indexOf('|', firstPipeIndex + 1) - 1;
            endPosition = secondPipeIndex !== -1 ? new vscodeTypes_1.Position(index, secondPipeIndex) : undefined;
            continue;
        }
        if (!endPosition) {
            endPosition = position;
            continue;
        }
        throw new Error('More than two | in the document');
    }
    if (!startPosition || !endPosition) {
        throw new Error('Less than two | in the document');
    }
    const document = await vscode_1.workspace.openTextDocument({
        language: _document.languageId,
        content: _document.getText().replace(/\|/g, ''),
    });
    const treeSitterAST = accessor.get(parserService_1.IParserService).getTreeSitterAST(document);
    (0, assert_1.default)(treeSitterAST);
    const diagnostics = [new vscode_1.Diagnostic(new vscode_1.Range(startPosition, endPosition), "placeholder")];
    const diagnosticsRange = (0, languageDiagnosticsService_1.rangeSpanningDiagnostics)(diagnostics);
    const rangeOfInterest = await (0, fixSelection_1.findFixRangeOfInterest)(treeSitterAST, diagnosticsRange, maximumNumberOfLines);
    assert_1.default.deepStrictEqual(rangeOfInterest.start.line, expectedLineRange[0]);
    assert_1.default.deepStrictEqual(rangeOfInterest.end.line, expectedLineRange[1]);
}
//# sourceMappingURL=interactiveEditorSessionProvider.test.js.map