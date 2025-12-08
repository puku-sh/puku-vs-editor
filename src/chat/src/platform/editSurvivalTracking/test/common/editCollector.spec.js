"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const vscodeTypes_1 = require("../../../../vscodeTypes");
const editCollector_1 = require("../../common/editCollector");
(0, vitest_1.suite)('OffsetBasedTextDocument', function () {
    (0, vitest_1.test)('document with \\n', async () => {
        const content = [
            'line0\n',
            'line1\n',
            'line2\n',
            'line3\n',
        ];
        {
            const document = new editCollector_1.OffsetBasedTextDocument(content.join(''));
            document.applyTextEdits([vscodeTypes_1.TextEdit.insert(new vscodeTypes_1.Position(0, 0), '|')]);
            (0, vitest_1.expect)(document.getValue()).toBe('|line0\nline1\nline2\nline3\n');
        }
        {
            const document = new editCollector_1.OffsetBasedTextDocument(content.join(''));
            document.applyTextEdits([vscodeTypes_1.TextEdit.insert(new vscodeTypes_1.Position(0, 1), '|')]);
            (0, vitest_1.expect)(document.getValue()).toBe('l|ine0\nline1\nline2\nline3\n');
        }
        {
            const document = new editCollector_1.OffsetBasedTextDocument(content.join(''));
            document.applyTextEdits([vscodeTypes_1.TextEdit.insert(new vscodeTypes_1.Position(0, 2), '|')]);
            (0, vitest_1.expect)(document.getValue()).toBe('li|ne0\nline1\nline2\nline3\n');
        }
        {
            const document = new editCollector_1.OffsetBasedTextDocument(content.join(''));
            document.applyTextEdits([vscodeTypes_1.TextEdit.insert(new vscodeTypes_1.Position(0, 5), '|')]);
            (0, vitest_1.expect)(document.getValue()).toBe('line0|\nline1\nline2\nline3\n');
        }
        {
            const document = new editCollector_1.OffsetBasedTextDocument(content.join(''));
            document.applyTextEdits([vscodeTypes_1.TextEdit.insert(new vscodeTypes_1.Position(0, 6), '|')]);
            (0, vitest_1.expect)(document.getValue()).toBe('line0|\nline1\nline2\nline3\n');
        }
        {
            const document = new editCollector_1.OffsetBasedTextDocument(content.join(''));
            document.applyTextEdits([vscodeTypes_1.TextEdit.insert(new vscodeTypes_1.Position(0, 7), '|')]);
            (0, vitest_1.expect)(document.getValue()).toBe('line0|\nline1\nline2\nline3\n');
        }
        {
            const document = new editCollector_1.OffsetBasedTextDocument(content.join(''));
            document.applyTextEdits([vscodeTypes_1.TextEdit.insert(new vscodeTypes_1.Position(3, 0), '|')]);
            (0, vitest_1.expect)(document.getValue()).toBe('line0\nline1\nline2\n|line3\n');
        }
        {
            const document = new editCollector_1.OffsetBasedTextDocument(content.join(''));
            document.applyTextEdits([vscodeTypes_1.TextEdit.insert(new vscodeTypes_1.Position(3, 5), '|')]);
            (0, vitest_1.expect)(document.getValue()).toBe('line0\nline1\nline2\nline3|\n');
        }
        {
            const document = new editCollector_1.OffsetBasedTextDocument(content.join(''));
            document.applyTextEdits([vscodeTypes_1.TextEdit.insert(new vscodeTypes_1.Position(3, 6), '|')]);
            (0, vitest_1.expect)(document.getValue()).toBe('line0\nline1\nline2\nline3|\n');
        }
        {
            const document = new editCollector_1.OffsetBasedTextDocument(content.join(''));
            document.applyTextEdits([vscodeTypes_1.TextEdit.insert(new vscodeTypes_1.Position(4, 0), '|')]);
            (0, vitest_1.expect)(document.getValue()).toBe('line0\nline1\nline2\nline3\n|');
        }
        {
            const document = new editCollector_1.OffsetBasedTextDocument(content.join(''));
            document.applyTextEdits([vscodeTypes_1.TextEdit.insert(new vscodeTypes_1.Position(4, 4), '|')]);
            (0, vitest_1.expect)(document.getValue()).toBe('line0\nline1\nline2\nline3\n|');
        }
        {
            const document = new editCollector_1.OffsetBasedTextDocument(content.join(''));
            document.applyTextEdits([vscodeTypes_1.TextEdit.insert(new vscodeTypes_1.Position(5, 4), '|')]);
            (0, vitest_1.expect)(document.getValue()).toBe('line0\nline1\nline2\nline3\n|');
        }
        {
            const document = new editCollector_1.OffsetBasedTextDocument(content.join(''));
            document.applyTextEdits([vscodeTypes_1.TextEdit.delete(new vscodeTypes_1.Range(1, 0, 2, 0))]);
            (0, vitest_1.expect)(document.getValue()).toBe('line0\nline2\nline3\n');
        }
        {
            const document = new editCollector_1.OffsetBasedTextDocument(content.join(''));
            document.applyTextEdits([vscodeTypes_1.TextEdit.replace(new vscodeTypes_1.Range(3, 0, 3, 5), 'lineX\n')]);
            (0, vitest_1.expect)(document.getValue()).toBe('line0\nline1\nline2\nlineX\n\n');
        }
        {
            const document = new editCollector_1.OffsetBasedTextDocument(content.join(''));
            document.applyTextEdits([vscodeTypes_1.TextEdit.replace(new vscodeTypes_1.Range(3, 0, 4, 0), 'lineX\n')]);
            (0, vitest_1.expect)(document.getValue()).toBe('line0\nline1\nline2\nlineX\n');
        }
    });
    (0, vitest_1.test)('document with \\r\\n', async () => {
        const content = [
            'line0\r\n',
            'line1\r\n',
            'line2\r\n',
            'line3\r\n',
        ];
        {
            const document = new editCollector_1.OffsetBasedTextDocument(content.join(''));
            document.applyTextEdits([vscodeTypes_1.TextEdit.insert(new vscodeTypes_1.Position(0, 0), '|')]);
            (0, vitest_1.expect)(document.getValue()).toBe('|line0\r\nline1\r\nline2\r\nline3\r\n');
        }
        {
            const document = new editCollector_1.OffsetBasedTextDocument(content.join(''));
            document.applyTextEdits([vscodeTypes_1.TextEdit.insert(new vscodeTypes_1.Position(0, 1), '|')]);
            (0, vitest_1.expect)(document.getValue()).toBe('l|ine0\r\nline1\r\nline2\r\nline3\r\n');
        }
        {
            const document = new editCollector_1.OffsetBasedTextDocument(content.join(''));
            document.applyTextEdits([vscodeTypes_1.TextEdit.insert(new vscodeTypes_1.Position(0, 2), '|')]);
            (0, vitest_1.expect)(document.getValue()).toBe('li|ne0\r\nline1\r\nline2\r\nline3\r\n');
        }
        {
            const document = new editCollector_1.OffsetBasedTextDocument(content.join(''));
            document.applyTextEdits([vscodeTypes_1.TextEdit.insert(new vscodeTypes_1.Position(0, 5), '|')]);
            (0, vitest_1.expect)(document.getValue()).toBe('line0|\r\nline1\r\nline2\r\nline3\r\n');
        }
        {
            const document = new editCollector_1.OffsetBasedTextDocument(content.join(''));
            document.applyTextEdits([vscodeTypes_1.TextEdit.insert(new vscodeTypes_1.Position(0, 6), '|')]);
            (0, vitest_1.expect)(document.getValue()).toBe('line0|\r\nline1\r\nline2\r\nline3\r\n');
        }
        {
            const document = new editCollector_1.OffsetBasedTextDocument(content.join(''));
            document.applyTextEdits([vscodeTypes_1.TextEdit.insert(new vscodeTypes_1.Position(0, 7), '|')]);
            (0, vitest_1.expect)(document.getValue()).toBe('line0|\r\nline1\r\nline2\r\nline3\r\n');
        }
        {
            const document = new editCollector_1.OffsetBasedTextDocument(content.join(''));
            document.applyTextEdits([vscodeTypes_1.TextEdit.insert(new vscodeTypes_1.Position(3, 0), '|')]);
            (0, vitest_1.expect)(document.getValue()).toBe('line0\r\nline1\r\nline2\r\n|line3\r\n');
        }
        {
            const document = new editCollector_1.OffsetBasedTextDocument(content.join(''));
            document.applyTextEdits([vscodeTypes_1.TextEdit.insert(new vscodeTypes_1.Position(3, 5), '|')]);
            (0, vitest_1.expect)(document.getValue()).toBe('line0\r\nline1\r\nline2\r\nline3|\r\n');
        }
        {
            const document = new editCollector_1.OffsetBasedTextDocument(content.join(''));
            document.applyTextEdits([vscodeTypes_1.TextEdit.insert(new vscodeTypes_1.Position(3, 6), '|')]);
            (0, vitest_1.expect)(document.getValue()).toBe('line0\r\nline1\r\nline2\r\nline3|\r\n');
        }
        {
            const document = new editCollector_1.OffsetBasedTextDocument(content.join(''));
            document.applyTextEdits([vscodeTypes_1.TextEdit.insert(new vscodeTypes_1.Position(4, 0), '|')]);
            (0, vitest_1.expect)(document.getValue()).toBe('line0\r\nline1\r\nline2\r\nline3\r\n|');
        }
        {
            const document = new editCollector_1.OffsetBasedTextDocument(content.join(''));
            document.applyTextEdits([vscodeTypes_1.TextEdit.insert(new vscodeTypes_1.Position(4, 4), '|')]);
            (0, vitest_1.expect)(document.getValue()).toBe('line0\r\nline1\r\nline2\r\nline3\r\n|');
        }
        {
            const document = new editCollector_1.OffsetBasedTextDocument(content.join(''));
            document.applyTextEdits([vscodeTypes_1.TextEdit.insert(new vscodeTypes_1.Position(5, 4), '|')]);
            (0, vitest_1.expect)(document.getValue()).toBe('line0\r\nline1\r\nline2\r\nline3\r\n|');
        }
    });
    (0, vitest_1.test)('document with \\r\\n, last line no line delimiter', async () => {
        const content = [
            'line0\r\n',
            'line1\r\n',
            'line2\r\n',
            'line3\r\n',
            'line4'
        ];
        {
            const document = new editCollector_1.OffsetBasedTextDocument(content.join(''));
            document.applyTextEdits([vscodeTypes_1.TextEdit.insert(new vscodeTypes_1.Position(3, 0), '|')]);
            (0, vitest_1.expect)(document.getValue()).toBe('line0\r\nline1\r\nline2\r\n|line3\r\nline4');
        }
        {
            const document = new editCollector_1.OffsetBasedTextDocument(content.join(''));
            document.applyTextEdits([vscodeTypes_1.TextEdit.insert(new vscodeTypes_1.Position(3, 5), '|')]);
            (0, vitest_1.expect)(document.getValue()).toBe('line0\r\nline1\r\nline2\r\nline3|\r\nline4');
        }
        {
            const document = new editCollector_1.OffsetBasedTextDocument(content.join(''));
            document.applyTextEdits([vscodeTypes_1.TextEdit.insert(new vscodeTypes_1.Position(3, 6), '|')]);
            (0, vitest_1.expect)(document.getValue()).toBe('line0\r\nline1\r\nline2\r\nline3|\r\nline4');
        }
        {
            const document = new editCollector_1.OffsetBasedTextDocument(content.join(''));
            document.applyTextEdits([vscodeTypes_1.TextEdit.insert(new vscodeTypes_1.Position(4, 0), '|')]);
            (0, vitest_1.expect)(document.getValue()).toBe('line0\r\nline1\r\nline2\r\nline3\r\n|line4');
        }
        {
            const document = new editCollector_1.OffsetBasedTextDocument(content.join(''));
            document.applyTextEdits([vscodeTypes_1.TextEdit.insert(new vscodeTypes_1.Position(4, 4), '|')]);
            (0, vitest_1.expect)(document.getValue()).toBe('line0\r\nline1\r\nline2\r\nline3\r\nline|4');
        }
        {
            const document = new editCollector_1.OffsetBasedTextDocument(content.join(''));
            document.applyTextEdits([vscodeTypes_1.TextEdit.insert(new vscodeTypes_1.Position(4, 5), '|')]);
            (0, vitest_1.expect)(document.getValue()).toBe('line0\r\nline1\r\nline2\r\nline3\r\nline4|');
        }
        {
            const document = new editCollector_1.OffsetBasedTextDocument(content.join(''));
            document.applyTextEdits([vscodeTypes_1.TextEdit.insert(new vscodeTypes_1.Position(4, 6), '|')]);
            (0, vitest_1.expect)(document.getValue()).toBe('line0\r\nline1\r\nline2\r\nline3\r\nline4|');
        }
        {
            const document = new editCollector_1.OffsetBasedTextDocument(content.join(''));
            document.applyTextEdits([vscodeTypes_1.TextEdit.insert(new vscodeTypes_1.Position(5, 4), '|')]);
            (0, vitest_1.expect)(document.getValue()).toBe('line0\r\nline1\r\nline2\r\nline3\r\nline4|');
        }
    });
    (0, vitest_1.test)('document with \\r', async () => {
        const content = [
            'line0\r',
            'line1\r',
            'line2\r',
            'line3\r',
        ];
        {
            const document = new editCollector_1.OffsetBasedTextDocument(content.join(''));
            document.applyTextEdits([vscodeTypes_1.TextEdit.insert(new vscodeTypes_1.Position(0, 0), '|')]);
            (0, vitest_1.expect)(document.getValue()).toBe('|line0\rline1\rline2\rline3\r');
        }
        {
            const document = new editCollector_1.OffsetBasedTextDocument(content.join(''));
            document.applyTextEdits([vscodeTypes_1.TextEdit.insert(new vscodeTypes_1.Position(0, 1), '|')]);
            (0, vitest_1.expect)(document.getValue()).toBe('l|ine0\rline1\rline2\rline3\r');
        }
        {
            const document = new editCollector_1.OffsetBasedTextDocument(content.join(''));
            document.applyTextEdits([vscodeTypes_1.TextEdit.insert(new vscodeTypes_1.Position(0, 2), '|')]);
            (0, vitest_1.expect)(document.getValue()).toBe('li|ne0\rline1\rline2\rline3\r');
        }
        {
            const document = new editCollector_1.OffsetBasedTextDocument(content.join(''));
            document.applyTextEdits([vscodeTypes_1.TextEdit.insert(new vscodeTypes_1.Position(0, 5), '|')]);
            (0, vitest_1.expect)(document.getValue()).toBe('line0|\rline1\rline2\rline3\r');
        }
        {
            const document = new editCollector_1.OffsetBasedTextDocument(content.join(''));
            document.applyTextEdits([vscodeTypes_1.TextEdit.insert(new vscodeTypes_1.Position(0, 6), '|')]);
            (0, vitest_1.expect)(document.getValue()).toBe('line0|\rline1\rline2\rline3\r');
        }
        {
            const document = new editCollector_1.OffsetBasedTextDocument(content.join(''));
            document.applyTextEdits([vscodeTypes_1.TextEdit.insert(new vscodeTypes_1.Position(0, 7), '|')]);
            (0, vitest_1.expect)(document.getValue()).toBe('line0|\rline1\rline2\rline3\r');
        }
        {
            const document = new editCollector_1.OffsetBasedTextDocument(content.join(''));
            document.applyTextEdits([vscodeTypes_1.TextEdit.insert(new vscodeTypes_1.Position(3, 0), '|')]);
            (0, vitest_1.expect)(document.getValue()).toBe('line0\rline1\rline2\r|line3\r');
        }
        {
            const document = new editCollector_1.OffsetBasedTextDocument(content.join(''));
            document.applyTextEdits([vscodeTypes_1.TextEdit.insert(new vscodeTypes_1.Position(3, 5), '|')]);
            (0, vitest_1.expect)(document.getValue()).toBe('line0\rline1\rline2\rline3|\r');
        }
        {
            const document = new editCollector_1.OffsetBasedTextDocument(content.join(''));
            document.applyTextEdits([vscodeTypes_1.TextEdit.insert(new vscodeTypes_1.Position(3, 6), '|')]);
            (0, vitest_1.expect)(document.getValue()).toBe('line0\rline1\rline2\rline3|\r');
        }
        {
            const document = new editCollector_1.OffsetBasedTextDocument(content.join(''));
            document.applyTextEdits([vscodeTypes_1.TextEdit.insert(new vscodeTypes_1.Position(4, 0), '|')]);
            (0, vitest_1.expect)(document.getValue()).toBe('line0\rline1\rline2\rline3\r|');
        }
        {
            const document = new editCollector_1.OffsetBasedTextDocument(content.join(''));
            document.applyTextEdits([vscodeTypes_1.TextEdit.insert(new vscodeTypes_1.Position(4, 4), '|')]);
            (0, vitest_1.expect)(document.getValue()).toBe('line0\rline1\rline2\rline3\r|');
        }
        {
            const document = new editCollector_1.OffsetBasedTextDocument(content.join(''));
            document.applyTextEdits([vscodeTypes_1.TextEdit.insert(new vscodeTypes_1.Position(5, 4), '|')]);
            (0, vitest_1.expect)(document.getValue()).toBe('line0\rline1\rline2\rline3\r|');
        }
    });
});
//# sourceMappingURL=editCollector.spec.js.map