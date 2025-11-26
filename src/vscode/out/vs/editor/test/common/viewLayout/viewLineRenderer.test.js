/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as strings from '../../../../base/common/strings.js';
import { assertSnapshot } from '../../../../base/test/common/snapshot.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { OffsetRange } from '../../../common/core/ranges/offsetRange.js';
import { LineDecoration } from '../../../common/viewLayout/lineDecorations.js';
import { DomPosition, RenderLineInput, renderViewLine2 as renderViewLine } from '../../../common/viewLayout/viewLineRenderer.js';
import { TestLineToken, TestLineTokens } from '../core/testLineToken.js';
const HTML_EXTENSION = { extension: 'html' };
function createViewLineTokens(viewLineTokens) {
    return new TestLineTokens(viewLineTokens);
}
function createPart(endIndex, foreground) {
    return new TestLineToken(endIndex, (foreground << 15 /* MetadataConsts.FOREGROUND_OFFSET */) >>> 0);
}
function inflateRenderLineOutput(renderLineOutput) {
    // remove encompassing <span> to simplify test writing.
    let html = renderLineOutput.html;
    if (html.startsWith('<span>')) {
        html = html.replace(/^<span>/, '');
    }
    html = html.replace(/<\/span>$/, '');
    const spans = [];
    let lastIndex = 0;
    do {
        const newIndex = html.indexOf('<span', lastIndex + 1);
        if (newIndex === -1) {
            break;
        }
        spans.push(html.substring(lastIndex, newIndex));
        lastIndex = newIndex;
    } while (true);
    spans.push(html.substring(lastIndex));
    return {
        html: spans,
        mapping: renderLineOutput.characterMapping.inflate(),
    };
}
const defaultRenderLineInputOptions = {
    useMonospaceOptimizations: false,
    canUseHalfwidthRightwardsArrow: true,
    lineContent: '',
    continuesWithWrappedLine: false,
    isBasicASCII: true,
    containsRTL: false,
    fauxIndentLength: 0,
    lineTokens: createViewLineTokens([]),
    lineDecorations: [],
    tabSize: 4,
    startVisibleColumn: 0,
    spaceWidth: 10,
    middotWidth: 10,
    wsmiddotWidth: 10,
    stopRenderingLineAfter: -1,
    renderWhitespace: 'none',
    renderControlCharacters: false,
    fontLigatures: false,
    selectionsOnLine: null,
    textDirection: null,
    verticalScrollbarSize: 14,
    renderNewLineWhenEmpty: false
};
function createRenderLineInputOptions(opts) {
    return {
        ...defaultRenderLineInputOptions,
        ...opts
    };
}
function createRenderLineInput(opts) {
    const options = createRenderLineInputOptions(opts);
    return new RenderLineInput(options.useMonospaceOptimizations, options.canUseHalfwidthRightwardsArrow, options.lineContent, options.continuesWithWrappedLine, options.isBasicASCII, options.containsRTL, options.fauxIndentLength, options.lineTokens, options.lineDecorations, options.tabSize, options.startVisibleColumn, options.spaceWidth, options.middotWidth, options.wsmiddotWidth, options.stopRenderingLineAfter, options.renderWhitespace, options.renderControlCharacters, options.fontLigatures, options.selectionsOnLine, options.textDirection, options.verticalScrollbarSize, options.renderNewLineWhenEmpty);
}
suite('viewLineRenderer.renderLine', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function assertCharacterReplacement(lineContent, tabSize, expected, expectedCharOffsetInPart) {
        const _actual = renderViewLine(createRenderLineInput({
            lineContent,
            isBasicASCII: strings.isBasicASCII(lineContent),
            lineTokens: createViewLineTokens([new TestLineToken(lineContent.length, 0)]),
            tabSize,
            spaceWidth: 0,
            middotWidth: 0,
            wsmiddotWidth: 0
        }));
        assert.strictEqual(_actual.html, '<span><span class="mtk0">' + expected + '</span></span>');
        const info = expectedCharOffsetInPart.map((absoluteOffset) => [absoluteOffset, [0, absoluteOffset]]);
        assertCharacterMapping3(_actual.characterMapping, info);
    }
    test('replaces spaces', () => {
        assertCharacterReplacement(' ', 4, '\u00a0', [0, 1]);
        assertCharacterReplacement('  ', 4, '\u00a0\u00a0', [0, 1, 2]);
        assertCharacterReplacement('a  b', 4, 'a\u00a0\u00a0b', [0, 1, 2, 3, 4]);
    });
    test('escapes HTML markup', () => {
        assertCharacterReplacement('a<b', 4, 'a&lt;b', [0, 1, 2, 3]);
        assertCharacterReplacement('a>b', 4, 'a&gt;b', [0, 1, 2, 3]);
        assertCharacterReplacement('a&b', 4, 'a&amp;b', [0, 1, 2, 3]);
    });
    test('replaces some bad characters', () => {
        assertCharacterReplacement('a\0b', 4, 'a&#00;b', [0, 1, 2, 3]);
        assertCharacterReplacement('a' + String.fromCharCode(65279 /* CharCode.UTF8_BOM */) + 'b', 4, 'a\ufffdb', [0, 1, 2, 3]);
        assertCharacterReplacement('a\u2028b', 4, 'a\ufffdb', [0, 1, 2, 3]);
    });
    test('handles tabs', () => {
        assertCharacterReplacement('\t', 4, '\u00a0\u00a0\u00a0\u00a0', [0, 4]);
        assertCharacterReplacement('x\t', 4, 'x\u00a0\u00a0\u00a0', [0, 1, 4]);
        assertCharacterReplacement('xx\t', 4, 'xx\u00a0\u00a0', [0, 1, 2, 4]);
        assertCharacterReplacement('xxx\t', 4, 'xxx\u00a0', [0, 1, 2, 3, 4]);
        assertCharacterReplacement('xxxx\t', 4, 'xxxx\u00a0\u00a0\u00a0\u00a0', [0, 1, 2, 3, 4, 8]);
    });
    function assertParts(lineContent, tabSize, parts, expected, info) {
        const _actual = renderViewLine(createRenderLineInput({
            lineContent,
            lineTokens: createViewLineTokens(parts),
            tabSize,
            spaceWidth: 0,
            middotWidth: 0,
            wsmiddotWidth: 0
        }));
        assert.strictEqual(_actual.html, '<span>' + expected + '</span>');
        assertCharacterMapping3(_actual.characterMapping, info);
    }
    test('empty line', () => {
        assertParts('', 4, [], '<span></span>', []);
    });
    test('uses part type', () => {
        assertParts('x', 4, [createPart(1, 10)], '<span class="mtk10">x</span>', [[0, [0, 0]], [1, [0, 1]]]);
        assertParts('x', 4, [createPart(1, 20)], '<span class="mtk20">x</span>', [[0, [0, 0]], [1, [0, 1]]]);
        assertParts('x', 4, [createPart(1, 30)], '<span class="mtk30">x</span>', [[0, [0, 0]], [1, [0, 1]]]);
    });
    test('two parts', () => {
        assertParts('xy', 4, [createPart(1, 1), createPart(2, 2)], '<span class="mtk1">x</span><span class="mtk2">y</span>', [[0, [0, 0]], [1, [1, 0]], [2, [1, 1]]]);
        assertParts('xyz', 4, [createPart(1, 1), createPart(3, 2)], '<span class="mtk1">x</span><span class="mtk2">yz</span>', [[0, [0, 0]], [1, [1, 0]], [2, [1, 1]], [3, [1, 2]]]);
        assertParts('xyz', 4, [createPart(2, 1), createPart(3, 2)], '<span class="mtk1">xy</span><span class="mtk2">z</span>', [[0, [0, 0]], [1, [0, 1]], [2, [1, 0]], [3, [1, 1]]]);
    });
    test('overflow', async () => {
        const _actual = renderViewLine(createRenderLineInput({
            lineContent: 'Hello world!',
            lineTokens: createViewLineTokens([
                createPart(1, 0),
                createPart(2, 1),
                createPart(3, 2),
                createPart(4, 3),
                createPart(5, 4),
                createPart(6, 5),
                createPart(7, 6),
                createPart(8, 7),
                createPart(9, 8),
                createPart(10, 9),
                createPart(11, 10),
                createPart(12, 11),
            ]),
            stopRenderingLineAfter: 6,
            renderWhitespace: 'boundary'
        }));
        const inflated = inflateRenderLineOutput(_actual);
        await assertSnapshot(inflated.html.join(''), HTML_EXTENSION);
        await assertSnapshot(inflated.mapping);
    });
    test('typical line', async () => {
        const lineContent = '\t    export class Game { // http://test.com     ';
        const lineTokens = createViewLineTokens([
            createPart(5, 1),
            createPart(11, 2),
            createPart(12, 3),
            createPart(17, 4),
            createPart(18, 5),
            createPart(22, 6),
            createPart(23, 7),
            createPart(24, 8),
            createPart(25, 9),
            createPart(28, 10),
            createPart(43, 11),
            createPart(48, 12),
        ]);
        const _actual = renderViewLine(createRenderLineInput({
            lineContent,
            lineTokens,
            renderWhitespace: 'boundary'
        }));
        const inflated = inflateRenderLineOutput(_actual);
        await assertSnapshot(inflated.html.join(''), HTML_EXTENSION);
        await assertSnapshot(inflated.mapping);
    });
    test('issue #2255: Weird line rendering part 1', async () => {
        const lineContent = '\t\t\tcursorStyle:\t\t\t\t\t\t(prevOpts.cursorStyle !== newOpts.cursorStyle),';
        const lineTokens = createViewLineTokens([
            createPart(3, 1), // 3 chars
            createPart(15, 2), // 12 chars
            createPart(21, 3), // 6 chars
            createPart(22, 4), // 1 char
            createPart(43, 5), // 21 chars
            createPart(45, 6), // 2 chars
            createPart(46, 7), // 1 char
            createPart(66, 8), // 20 chars
            createPart(67, 9), // 1 char
            createPart(68, 10), // 2 chars
        ]);
        const _actual = renderViewLine(createRenderLineInput({
            lineContent,
            lineTokens
        }));
        const inflated = inflateRenderLineOutput(_actual);
        await assertSnapshot(inflated.html.join(''), HTML_EXTENSION);
        await assertSnapshot(inflated.mapping);
    });
    test('issue #2255: Weird line rendering part 2', async () => {
        const lineContent = ' \t\t\tcursorStyle:\t\t\t\t\t\t(prevOpts.cursorStyle !== newOpts.cursorStyle),';
        const lineTokens = createViewLineTokens([
            createPart(4, 1), // 4 chars
            createPart(16, 2), // 12 chars
            createPart(22, 3), // 6 chars
            createPart(23, 4), // 1 char
            createPart(44, 5), // 21 chars
            createPart(46, 6), // 2 chars
            createPart(47, 7), // 1 char
            createPart(67, 8), // 20 chars
            createPart(68, 9), // 1 char
            createPart(69, 10), // 2 chars
        ]);
        const _actual = renderViewLine(createRenderLineInput({
            lineContent,
            lineTokens
        }));
        const inflated = inflateRenderLineOutput(_actual);
        await assertSnapshot(inflated.html.join(''), HTML_EXTENSION);
        await assertSnapshot(inflated.mapping);
    });
    test('issue #91178: after decoration type shown before cursor', async () => {
        const lineContent = '//just a comment';
        const lineTokens = createViewLineTokens([
            createPart(16, 1)
        ]);
        const actual = renderViewLine(createRenderLineInput({
            useMonospaceOptimizations: true,
            canUseHalfwidthRightwardsArrow: false,
            lineContent,
            lineTokens,
            lineDecorations: [
                new LineDecoration(13, 13, 'dec1', 2 /* InlineDecorationType.After */),
                new LineDecoration(13, 13, 'dec2', 1 /* InlineDecorationType.Before */),
            ]
        }));
        const inflated = inflateRenderLineOutput(actual);
        await assertSnapshot(inflated.html.join(''), HTML_EXTENSION);
        await assertSnapshot(inflated.mapping);
    });
    test('issue microsoft/monaco-editor#280: Improved source code rendering for RTL languages', async () => {
        const lineContent = 'var קודמות = \"מיותר קודמות צ\'ט של, אם לשון העברית שינויים ויש, אם\";';
        const lineTokens = createViewLineTokens([
            createPart(3, 6),
            createPart(13, 1),
            createPart(66, 20),
            createPart(67, 1),
        ]);
        const _actual = renderViewLine(createRenderLineInput({
            lineContent,
            isBasicASCII: false,
            containsRTL: true,
            lineTokens
        }));
        const inflated = inflateRenderLineOutput(_actual);
        await assertSnapshot(inflated.html.join(''), HTML_EXTENSION);
        await assertSnapshot(inflated.mapping);
    });
    test('issue #137036: Issue in RTL languages in recent versions', async () => {
        const lineContent = '<option value=\"العربية\">العربية</option>';
        const lineTokens = createViewLineTokens([
            createPart(1, 2),
            createPart(7, 3),
            createPart(8, 4),
            createPart(13, 5),
            createPart(14, 4),
            createPart(23, 6),
            createPart(24, 2),
            createPart(31, 4),
            createPart(33, 2),
            createPart(39, 3),
            createPart(40, 2),
        ]);
        const _actual = renderViewLine(createRenderLineInput({
            lineContent,
            isBasicASCII: false,
            containsRTL: true,
            lineTokens
        }));
        const inflated = inflateRenderLineOutput(_actual);
        await assertSnapshot(inflated.html.join(''), HTML_EXTENSION);
        await assertSnapshot(inflated.mapping);
    });
    test('issue #99589: Rendering whitespace influences bidi layout', async () => {
        const lineContent = '    [\"🖨️ چاپ فاکتور\",\"🎨 تنظیمات\"]';
        const lineTokens = createViewLineTokens([
            createPart(5, 2),
            createPart(21, 3),
            createPart(22, 2),
            createPart(34, 3),
            createPart(35, 2),
        ]);
        const _actual = renderViewLine(createRenderLineInput({
            useMonospaceOptimizations: true,
            lineContent,
            isBasicASCII: false,
            containsRTL: true,
            lineTokens,
            renderWhitespace: 'all'
        }));
        const inflated = inflateRenderLineOutput(_actual);
        await assertSnapshot(inflated.html.join(''), HTML_EXTENSION);
        await assertSnapshot(inflated.mapping);
    });
    test('issue #260239: HTML containing bidirectional text is rendered incorrectly', async () => {
        // Simulating HTML like: <p class="myclass" title="العربي">نشاط التدويل!</p>
        // The line contains both LTR (class="myclass") and RTL (title="العربي") attribute values
        const lineContent = '<p class="myclass" title="العربي">نشاط التدويل!</p>';
        const lineTokens = createViewLineTokens([
            createPart(1, 1), // <
            createPart(2, 2), // p
            createPart(3, 3), // (space)
            createPart(8, 4), // class
            createPart(9, 5), // =
            createPart(10, 6), // "
            createPart(17, 7), // myclass
            createPart(18, 6), // "
            createPart(19, 3), // (space)
            createPart(24, 4), // title
            createPart(25, 5), // =
            createPart(26, 6), // "
            createPart(32, 8), // العربي (RTL text) - 6 Arabic characters from position 26-31
            createPart(33, 6), // " - closing quote at position 32
            createPart(34, 1), // >
            createPart(47, 9), // نشاط التدويل! (RTL text) - 13 characters from position 34-46
            createPart(48, 1), // <
            createPart(49, 2), // /
            createPart(50, 2), // p
            createPart(51, 1), // >
        ]);
        const _actual = renderViewLine(new RenderLineInput(false, true, lineContent, false, false, true, 0, lineTokens, [], 4, 0, 10, 10, 10, -1, 'none', false, false, null, null, 14));
        const inflated = inflateRenderLineOutput(_actual);
        await assertSnapshot(inflated.html.join(''), HTML_EXTENSION);
        await assertSnapshot(inflated.mapping);
    });
    test('issue #6885: Splits large tokens', async () => {
        //                                                                                                                  1         1         1
        //                        1         2         3         4         5         6         7         8         9         0         1         2
        //               1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234
        const _lineText = 'This is just a long line that contains very interesting text. This is just a long line that contains very interesting text.';
        function assertSplitsTokens(message, lineContent, expectedOutput) {
            const lineTokens = createViewLineTokens([createPart(lineContent.length, 1)]);
            const actual = renderViewLine(createRenderLineInput({
                lineContent,
                lineTokens
            }));
            assert.strictEqual(actual.html, '<span>' + expectedOutput.join('') + '</span>', message);
        }
        // A token with 49 chars
        {
            assertSplitsTokens('49 chars', _lineText.substr(0, 49), [
                '<span class="mtk1">This\u00a0is\u00a0just\u00a0a\u00a0long\u00a0line\u00a0that\u00a0contains\u00a0very\u00a0inter</span>',
            ]);
        }
        // A token with 50 chars
        {
            assertSplitsTokens('50 chars', _lineText.substr(0, 50), [
                '<span class="mtk1">This\u00a0is\u00a0just\u00a0a\u00a0long\u00a0line\u00a0that\u00a0contains\u00a0very\u00a0intere</span>',
            ]);
        }
        // A token with 51 chars
        {
            assertSplitsTokens('51 chars', _lineText.substr(0, 51), [
                '<span class="mtk1">This\u00a0is\u00a0just\u00a0a\u00a0long\u00a0line\u00a0that\u00a0contains\u00a0very\u00a0intere</span>',
                '<span class="mtk1">s</span>',
            ]);
        }
        // A token with 99 chars
        {
            assertSplitsTokens('99 chars', _lineText.substr(0, 99), [
                '<span class="mtk1">This\u00a0is\u00a0just\u00a0a\u00a0long\u00a0line\u00a0that\u00a0contains\u00a0very\u00a0intere</span>',
                '<span class="mtk1">sting\u00a0text.\u00a0This\u00a0is\u00a0just\u00a0a\u00a0long\u00a0line\u00a0that\u00a0contain</span>',
            ]);
        }
        // A token with 100 chars
        {
            assertSplitsTokens('100 chars', _lineText.substr(0, 100), [
                '<span class="mtk1">This\u00a0is\u00a0just\u00a0a\u00a0long\u00a0line\u00a0that\u00a0contains\u00a0very\u00a0intere</span>',
                '<span class="mtk1">sting\u00a0text.\u00a0This\u00a0is\u00a0just\u00a0a\u00a0long\u00a0line\u00a0that\u00a0contains</span>',
            ]);
        }
        // A token with 101 chars
        {
            assertSplitsTokens('101 chars', _lineText.substr(0, 101), [
                '<span class="mtk1">This\u00a0is\u00a0just\u00a0a\u00a0long\u00a0line\u00a0that\u00a0contains\u00a0very\u00a0intere</span>',
                '<span class="mtk1">sting\u00a0text.\u00a0This\u00a0is\u00a0just\u00a0a\u00a0long\u00a0line\u00a0that\u00a0contains</span>',
                '<span class="mtk1">\u00a0</span>',
            ]);
        }
    });
    test('issue #21476: Does not split large tokens when ligatures are on', async () => {
        //                                                                                                                  1         1         1
        //                        1         2         3         4         5         6         7         8         9         0         1         2
        //               1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234
        const _lineText = 'This is just a long line that contains very interesting text. This is just a long line that contains very interesting text.';
        function assertSplitsTokens(message, lineContent, expectedOutput) {
            const lineTokens = createViewLineTokens([createPart(lineContent.length, 1)]);
            const actual = renderViewLine(createRenderLineInput({
                lineContent,
                lineTokens,
                fontLigatures: true
            }));
            assert.strictEqual(actual.html, '<span>' + expectedOutput.join('') + '</span>', message);
        }
        // A token with 101 chars
        {
            assertSplitsTokens('101 chars', _lineText.substr(0, 101), [
                '<span class="mtk1">This\u00a0is\u00a0just\u00a0a\u00a0long\u00a0line\u00a0that\u00a0contains\u00a0very\u00a0</span>',
                '<span class="mtk1">interesting\u00a0text.\u00a0This\u00a0is\u00a0just\u00a0a\u00a0long\u00a0line\u00a0that\u00a0</span>',
                '<span class="mtk1">contains\u00a0</span>',
            ]);
        }
    });
    test('issue #20624: Unaligned surrogate pairs are corrupted at multiples of 50 columns', async () => {
        const lineContent = 'a𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷';
        const lineTokens = createViewLineTokens([createPart(lineContent.length, 1)]);
        const actual = renderViewLine(createRenderLineInput({
            lineContent,
            isBasicASCII: false,
            lineTokens
        }));
        await assertSnapshot(inflateRenderLineOutput(actual).html.join(''), HTML_EXTENSION);
    });
    test('issue #6885: Does not split large tokens in RTL text', async () => {
        const lineContent = 'את גרמנית בהתייחסות שמו, שנתי המשפט אל חפש, אם כתב אחרים ולחבר. של התוכן אודות בויקיפדיה כלל, של עזרה כימיה היא. על עמוד יוצרים מיתולוגיה סדר, אם שכל שתפו לעברית שינויים, אם שאלות אנגלית עזה. שמות בקלות מה סדר.';
        const lineTokens = createViewLineTokens([createPart(lineContent.length, 1)]);
        const actual = renderViewLine(createRenderLineInput({
            lineContent,
            isBasicASCII: false,
            containsRTL: true,
            lineTokens
        }));
        await assertSnapshot(actual.html, HTML_EXTENSION);
    });
    test('issue #95685: Uses unicode replacement character for Paragraph Separator', async () => {
        const lineContent = 'var ftext = [\u2029"Und", "dann", "eines"];';
        const lineTokens = createViewLineTokens([createPart(lineContent.length, 1)]);
        const actual = renderViewLine(createRenderLineInput({
            lineContent,
            isBasicASCII: false,
            lineTokens
        }));
        const inflated = inflateRenderLineOutput(actual);
        await assertSnapshot(inflated.html.join(''), HTML_EXTENSION);
        await assertSnapshot(inflated.mapping);
    });
    test('issue #19673: Monokai Theme bad-highlighting in line wrap', async () => {
        const lineContent = '    MongoCallback<string>): void {';
        const lineTokens = createViewLineTokens([
            createPart(17, 1),
            createPart(18, 2),
            createPart(24, 3),
            createPart(26, 4),
            createPart(27, 5),
            createPart(28, 6),
            createPart(32, 7),
            createPart(34, 8),
        ]);
        const _actual = renderViewLine(createRenderLineInput({
            useMonospaceOptimizations: true,
            lineContent,
            fauxIndentLength: 4,
            lineTokens
        }));
        const inflated = inflateRenderLineOutput(_actual);
        await assertSnapshot(inflated.html.join(''), HTML_EXTENSION);
        await assertSnapshot(inflated.mapping);
    });
});
function assertCharacterMapping3(actual, expectedInfo) {
    for (let i = 0; i < expectedInfo.length; i++) {
        const [horizontalOffset, [partIndex, charIndex]] = expectedInfo[i];
        const actualDomPosition = actual.getDomPosition(i + 1);
        assert.deepStrictEqual(actualDomPosition, new DomPosition(partIndex, charIndex), `getDomPosition(${i + 1})`);
        let partLength = charIndex + 1;
        for (let j = i + 1; j < expectedInfo.length; j++) {
            const [, [nextPartIndex, nextCharIndex]] = expectedInfo[j];
            if (nextPartIndex === partIndex) {
                partLength = nextCharIndex + 1;
            }
            else {
                break;
            }
        }
        const actualColumn = actual.getColumn(new DomPosition(partIndex, charIndex), partLength);
        assert.strictEqual(actualColumn, i + 1, `actual.getColumn(${partIndex}, ${charIndex})`);
        const actualHorizontalOffset = actual.getHorizontalOffset(i + 1);
        assert.strictEqual(actualHorizontalOffset, horizontalOffset, `actual.getHorizontalOffset(${i + 1})`);
    }
    assert.strictEqual(actual.length, expectedInfo.length, `length mismatch`);
}
suite('viewLineRenderer.renderLine 2', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function testCreateLineParts(fontIsMonospace, lineContent, tokens, fauxIndentLength, renderWhitespace, selections) {
        const actual = renderViewLine(createRenderLineInput({
            useMonospaceOptimizations: fontIsMonospace,
            lineContent,
            fauxIndentLength,
            lineTokens: createViewLineTokens(tokens),
            renderWhitespace,
            selectionsOnLine: selections
        }));
        return inflateRenderLineOutput(actual);
    }
    test('issue #18616: Inline decorations ending at the text length are no longer rendered', async () => {
        const lineContent = 'https://microsoft.com';
        const actual = renderViewLine(createRenderLineInput({
            lineContent,
            lineTokens: createViewLineTokens([createPart(21, 3)]),
            lineDecorations: [new LineDecoration(1, 22, 'link', 0 /* InlineDecorationType.Regular */)]
        }));
        const inflated = inflateRenderLineOutput(actual);
        await assertSnapshot(inflated.html.join(''), HTML_EXTENSION);
        await assertSnapshot(inflated.mapping);
    });
    test('issue #19207: Link in Monokai is not rendered correctly', async () => {
        const lineContent = '\'let url = `http://***/_api/web/lists/GetByTitle(\\\'Teambuildingaanvragen\\\')/items`;\'';
        const actual = renderViewLine(createRenderLineInput({
            useMonospaceOptimizations: true,
            lineContent,
            lineTokens: createViewLineTokens([
                createPart(49, 6),
                createPart(51, 4),
                createPart(72, 6),
                createPart(74, 4),
                createPart(84, 6),
            ]),
            lineDecorations: [
                new LineDecoration(13, 51, 'detected-link', 0 /* InlineDecorationType.Regular */)
            ]
        }));
        const inflated = inflateRenderLineOutput(actual);
        await assertSnapshot(inflated.html.join(''), HTML_EXTENSION);
        await assertSnapshot(inflated.mapping);
    });
    test('createLineParts simple', async () => {
        const actual = testCreateLineParts(false, 'Hello world!', [
            createPart(12, 1)
        ], 0, 'none', null);
        await assertSnapshot(actual.html.join(''), HTML_EXTENSION);
        await assertSnapshot(actual.mapping);
    });
    test('createLineParts simple two tokens', async () => {
        const actual = testCreateLineParts(false, 'Hello world!', [
            createPart(6, 1),
            createPart(12, 2)
        ], 0, 'none', null);
        await assertSnapshot(actual.html.join(''), HTML_EXTENSION);
        await assertSnapshot(actual.mapping);
    });
    test('createLineParts render whitespace - 4 leading spaces', async () => {
        const actual = testCreateLineParts(false, '    Hello world!    ', [
            createPart(4, 1),
            createPart(6, 2),
            createPart(20, 3)
        ], 0, 'boundary', null);
        await assertSnapshot(actual.html.join(''), HTML_EXTENSION);
        await assertSnapshot(actual.mapping);
    });
    test('createLineParts render whitespace - 8 leading spaces', async () => {
        const actual = testCreateLineParts(false, '        Hello world!        ', [
            createPart(8, 1),
            createPart(10, 2),
            createPart(28, 3)
        ], 0, 'boundary', null);
        await assertSnapshot(actual.html.join(''), HTML_EXTENSION);
        await assertSnapshot(actual.mapping);
    });
    test('createLineParts render whitespace - 2 leading tabs', async () => {
        const actual = testCreateLineParts(false, '\t\tHello world!\t', [
            createPart(2, 1),
            createPart(4, 2),
            createPart(15, 3)
        ], 0, 'boundary', null);
        await assertSnapshot(actual.html.join(''), HTML_EXTENSION);
        await assertSnapshot(actual.mapping);
    });
    test('createLineParts render whitespace - mixed leading spaces and tabs', async () => {
        const actual = testCreateLineParts(false, '  \t\t  Hello world! \t  \t   \t    ', [
            createPart(6, 1),
            createPart(8, 2),
            createPart(31, 3)
        ], 0, 'boundary', null);
        await assertSnapshot(actual.html.join(''), HTML_EXTENSION);
        await assertSnapshot(actual.mapping);
    });
    test('createLineParts render whitespace skips faux indent', async () => {
        const actual = testCreateLineParts(false, '\t\t  Hello world! \t  \t   \t    ', [
            createPart(4, 1),
            createPart(6, 2),
            createPart(29, 3)
        ], 2, 'boundary', null);
        await assertSnapshot(actual.html.join(''), HTML_EXTENSION);
        await assertSnapshot(actual.mapping);
    });
    test('createLineParts does not emit width for monospace fonts', async () => {
        const actual = testCreateLineParts(true, '\t\t  Hello world! \t  \t   \t    ', [
            createPart(4, 1),
            createPart(6, 2),
            createPart(29, 3)
        ], 2, 'boundary', null);
        await assertSnapshot(actual.html.join(''), HTML_EXTENSION);
        await assertSnapshot(actual.mapping);
    });
    test('createLineParts render whitespace in middle but not for one space', async () => {
        const actual = testCreateLineParts(false, 'it  it it  it', [
            createPart(6, 1),
            createPart(7, 2),
            createPart(13, 3)
        ], 0, 'boundary', null);
        await assertSnapshot(actual.html.join(''), HTML_EXTENSION);
        await assertSnapshot(actual.mapping);
    });
    test('createLineParts render whitespace for all in middle', async () => {
        const actual = testCreateLineParts(false, ' Hello world!\t', [
            createPart(4, 0),
            createPart(6, 1),
            createPart(14, 2)
        ], 0, 'all', null);
        await assertSnapshot(actual.html.join(''), HTML_EXTENSION);
        await assertSnapshot(actual.mapping);
    });
    test('createLineParts render whitespace for selection with no selections', async () => {
        const actual = testCreateLineParts(false, ' Hello world!\t', [
            createPart(4, 0),
            createPart(6, 1),
            createPart(14, 2)
        ], 0, 'selection', null);
        await assertSnapshot(actual.html.join(''), HTML_EXTENSION);
        await assertSnapshot(actual.mapping);
    });
    test('createLineParts render whitespace for selection with whole line selection', async () => {
        const actual = testCreateLineParts(false, ' Hello world!\t', [
            createPart(4, 0),
            createPart(6, 1),
            createPart(14, 2)
        ], 0, 'selection', [new OffsetRange(0, 14)]);
        await assertSnapshot(actual.html.join(''), HTML_EXTENSION);
        await assertSnapshot(actual.mapping);
    });
    test('createLineParts render whitespace for selection with selection spanning part of whitespace', async () => {
        const actual = testCreateLineParts(false, ' Hello world!\t', [
            createPart(4, 0),
            createPart(6, 1),
            createPart(14, 2)
        ], 0, 'selection', [new OffsetRange(0, 5)]);
        await assertSnapshot(actual.html.join(''), HTML_EXTENSION);
        await assertSnapshot(actual.mapping);
    });
    test('createLineParts render whitespace for selection with multiple selections', async () => {
        const actual = testCreateLineParts(false, ' Hello world!\t', [
            createPart(4, 0),
            createPart(6, 1),
            createPart(14, 2)
        ], 0, 'selection', [new OffsetRange(0, 5), new OffsetRange(9, 14)]);
        await assertSnapshot(actual.html.join(''), HTML_EXTENSION);
        await assertSnapshot(actual.mapping);
    });
    test('createLineParts render whitespace for selection with multiple, initially unsorted selections', async () => {
        const actual = testCreateLineParts(false, ' Hello world!\t', [
            createPart(4, 0),
            createPart(6, 1),
            createPart(14, 2)
        ], 0, 'selection', [new OffsetRange(9, 14), new OffsetRange(0, 5)]);
        await assertSnapshot(actual.html.join(''), HTML_EXTENSION);
        await assertSnapshot(actual.mapping);
    });
    test('createLineParts render whitespace for selection with selections next to each other', async () => {
        const actual = testCreateLineParts(false, ' * S', [
            createPart(4, 0)
        ], 0, 'selection', [new OffsetRange(0, 1), new OffsetRange(1, 2), new OffsetRange(2, 3)]);
        await assertSnapshot(actual.html.join(''), HTML_EXTENSION);
        await assertSnapshot(actual.mapping);
    });
    test('createLineParts render whitespace for trailing with leading, inner, and without trailing whitespace', async () => {
        const actual = testCreateLineParts(false, ' Hello world!', [
            createPart(4, 0),
            createPart(6, 1),
            createPart(14, 2)
        ], 0, 'trailing', null);
        await assertSnapshot(actual.html.join(''), HTML_EXTENSION);
        await assertSnapshot(actual.mapping);
    });
    test('createLineParts render whitespace for trailing with leading, inner, and trailing whitespace', async () => {
        const actual = testCreateLineParts(false, ' Hello world! \t', [
            createPart(4, 0),
            createPart(6, 1),
            createPart(15, 2)
        ], 0, 'trailing', null);
        await assertSnapshot(actual.html.join(''), HTML_EXTENSION);
        await assertSnapshot(actual.mapping);
    });
    test('createLineParts render whitespace for trailing with 8 leading and 8 trailing whitespaces', async () => {
        const actual = testCreateLineParts(false, '        Hello world!        ', [
            createPart(8, 1),
            createPart(10, 2),
            createPart(28, 3)
        ], 0, 'trailing', null);
        await assertSnapshot(actual.html.join(''), HTML_EXTENSION);
        await assertSnapshot(actual.mapping);
    });
    test('createLineParts render whitespace for trailing with line containing only whitespaces', async () => {
        const actual = testCreateLineParts(false, ' \t ', [
            createPart(2, 0),
            createPart(3, 1),
        ], 0, 'trailing', null);
        await assertSnapshot(actual.html.join(''), HTML_EXTENSION);
        await assertSnapshot(actual.mapping);
    });
    test('createLineParts can handle unsorted inline decorations', async () => {
        const actual = renderViewLine(createRenderLineInput({
            lineContent: 'Hello world',
            lineTokens: createViewLineTokens([createPart(11, 0)]),
            lineDecorations: [
                new LineDecoration(5, 7, 'a', 0 /* InlineDecorationType.Regular */),
                new LineDecoration(1, 3, 'b', 0 /* InlineDecorationType.Regular */),
                new LineDecoration(2, 8, 'c', 0 /* InlineDecorationType.Regular */),
            ]
        }));
        // 01234567890
        // Hello world
        // ----aa-----
        // bb---------
        // -cccccc----
        const inflated = inflateRenderLineOutput(actual);
        await assertSnapshot(inflated.html.join(''), HTML_EXTENSION);
        await assertSnapshot(inflated.mapping);
    });
    test('issue #11485: Visible whitespace conflicts with before decorator attachment', async () => {
        const lineContent = '\tbla';
        const actual = renderViewLine(createRenderLineInput({
            lineContent,
            lineTokens: createViewLineTokens([createPart(4, 3)]),
            lineDecorations: [new LineDecoration(1, 2, 'before', 1 /* InlineDecorationType.Before */)],
            renderWhitespace: 'all',
            fontLigatures: true
        }));
        const inflated = inflateRenderLineOutput(actual);
        await assertSnapshot(inflated.html.join(''), HTML_EXTENSION);
        await assertSnapshot(inflated.mapping);
    });
    test('issue #32436: Non-monospace font + visible whitespace + After decorator causes line to "jump"', async () => {
        const lineContent = '\tbla';
        const actual = renderViewLine(createRenderLineInput({
            lineContent,
            lineTokens: createViewLineTokens([createPart(4, 3)]),
            lineDecorations: [new LineDecoration(2, 3, 'before', 1 /* InlineDecorationType.Before */)],
            renderWhitespace: 'all',
            fontLigatures: true
        }));
        const inflated = inflateRenderLineOutput(actual);
        await assertSnapshot(inflated.html.join(''), HTML_EXTENSION);
        await assertSnapshot(inflated.mapping);
    });
    test('issue #30133: Empty lines don\'t render inline decorations', async () => {
        const lineContent = '';
        const actual = renderViewLine(createRenderLineInput({
            lineContent,
            lineTokens: createViewLineTokens([createPart(0, 3)]),
            lineDecorations: [new LineDecoration(1, 2, 'before', 1 /* InlineDecorationType.Before */)],
            renderWhitespace: 'all',
            fontLigatures: true
        }));
        const inflated = inflateRenderLineOutput(actual);
        await assertSnapshot(inflated.html.join(''), HTML_EXTENSION);
        await assertSnapshot(inflated.mapping);
    });
    test('issue #37208: Collapsing bullet point containing emoji in Markdown document results in [??] character', async () => {
        const actual = renderViewLine(createRenderLineInput({
            useMonospaceOptimizations: true,
            lineContent: '  1. 🙏',
            isBasicASCII: false,
            lineTokens: createViewLineTokens([createPart(7, 3)]),
            lineDecorations: [new LineDecoration(7, 8, 'inline-folded', 2 /* InlineDecorationType.After */)],
            tabSize: 2,
            stopRenderingLineAfter: 10000
        }));
        const inflated = inflateRenderLineOutput(actual);
        await assertSnapshot(inflated.html.join(''), HTML_EXTENSION);
        await assertSnapshot(inflated.mapping);
    });
    test('issue #37401 #40127: Allow both before and after decorations on empty line', async () => {
        const actual = renderViewLine(createRenderLineInput({
            useMonospaceOptimizations: true,
            lineContent: '',
            lineTokens: createViewLineTokens([createPart(0, 3)]),
            lineDecorations: [
                new LineDecoration(1, 1, 'before', 1 /* InlineDecorationType.Before */),
                new LineDecoration(1, 1, 'after', 2 /* InlineDecorationType.After */),
            ],
            tabSize: 2,
            stopRenderingLineAfter: 10000
        }));
        const inflated = inflateRenderLineOutput(actual);
        await assertSnapshot(inflated.html.join(''), HTML_EXTENSION);
        await assertSnapshot(inflated.mapping);
    });
    test('issue #118759: enable multiple text editor decorations in empty lines', async () => {
        const actual = renderViewLine(createRenderLineInput({
            useMonospaceOptimizations: true,
            lineContent: '',
            lineTokens: createViewLineTokens([createPart(0, 3)]),
            lineDecorations: [
                new LineDecoration(1, 1, 'after1', 2 /* InlineDecorationType.After */),
                new LineDecoration(1, 1, 'after2', 2 /* InlineDecorationType.After */),
                new LineDecoration(1, 1, 'before1', 1 /* InlineDecorationType.Before */),
                new LineDecoration(1, 1, 'before2', 1 /* InlineDecorationType.Before */),
            ],
            tabSize: 2,
            stopRenderingLineAfter: 10000
        }));
        const inflated = inflateRenderLineOutput(actual);
        await assertSnapshot(inflated.html.join(''), HTML_EXTENSION);
        await assertSnapshot(inflated.mapping);
    });
    test('issue #38935: GitLens end-of-line blame no longer rendering', async () => {
        const actual = renderViewLine(createRenderLineInput({
            useMonospaceOptimizations: true,
            lineContent: '\t}',
            lineTokens: createViewLineTokens([createPart(2, 3)]),
            lineDecorations: [
                new LineDecoration(3, 3, 'ced-TextEditorDecorationType2-5e9b9b3f-3 ced-TextEditorDecorationType2-3', 1 /* InlineDecorationType.Before */),
                new LineDecoration(3, 3, 'ced-TextEditorDecorationType2-5e9b9b3f-4 ced-TextEditorDecorationType2-4', 2 /* InlineDecorationType.After */),
            ],
            stopRenderingLineAfter: 10000
        }));
        const inflated = inflateRenderLineOutput(actual);
        await assertSnapshot(inflated.html.join(''), HTML_EXTENSION);
        await assertSnapshot(inflated.mapping);
    });
    test('issue #136622: Inline decorations are not rendering on non-ASCII lines when renderControlCharacters is on', async () => {
        const actual = renderViewLine(createRenderLineInput({
            useMonospaceOptimizations: true,
            lineContent: 'some text £',
            isBasicASCII: false,
            lineTokens: createViewLineTokens([createPart(11, 3)]),
            lineDecorations: [
                new LineDecoration(5, 5, 'inlineDec1', 2 /* InlineDecorationType.After */),
                new LineDecoration(6, 6, 'inlineDec2', 1 /* InlineDecorationType.Before */),
            ],
            stopRenderingLineAfter: 10000,
            renderControlCharacters: true
        }));
        const inflated = inflateRenderLineOutput(actual);
        await assertSnapshot(inflated.html.join(''), HTML_EXTENSION);
        await assertSnapshot(inflated.mapping);
    });
    test('issue #22832: Consider fullwidth characters when rendering tabs', async () => {
        const actual = renderViewLine(createRenderLineInput({
            useMonospaceOptimizations: true,
            lineContent: 'asd = "擦"\t\t#asd',
            isBasicASCII: false,
            lineTokens: createViewLineTokens([createPart(15, 3)]),
            stopRenderingLineAfter: 10000
        }));
        const inflated = inflateRenderLineOutput(actual);
        await assertSnapshot(inflated.html.join(''), HTML_EXTENSION);
        await assertSnapshot(inflated.mapping);
    });
    test('issue #22832: Consider fullwidth characters when rendering tabs (render whitespace)', async () => {
        const actual = renderViewLine(createRenderLineInput({
            useMonospaceOptimizations: true,
            lineContent: 'asd = "擦"\t\t#asd',
            isBasicASCII: false,
            lineTokens: createViewLineTokens([createPart(15, 3)]),
            stopRenderingLineAfter: 10000,
            renderWhitespace: 'all'
        }));
        const inflated = inflateRenderLineOutput(actual);
        await assertSnapshot(inflated.html.join(''), HTML_EXTENSION);
        await assertSnapshot(inflated.mapping);
    });
    test('issue #22352: COMBINING ACUTE ACCENT (U+0301)', async () => {
        const actual = renderViewLine(createRenderLineInput({
            useMonospaceOptimizations: true,
            lineContent: '12345689012345678901234568901234567890123456890abába',
            isBasicASCII: false,
            lineTokens: createViewLineTokens([createPart(53, 3)]),
            stopRenderingLineAfter: 10000
        }));
        const inflated = inflateRenderLineOutput(actual);
        await assertSnapshot(inflated.html.join(''), HTML_EXTENSION);
        await assertSnapshot(inflated.mapping);
    });
    test('issue #22352: Partially Broken Complex Script Rendering of Tamil', async () => {
        const actual = renderViewLine(createRenderLineInput({
            useMonospaceOptimizations: true,
            lineContent: ' JoyShareல் பின்தொடர்ந்து, விடீயோ, ஜோக்குகள், அனிமேசன், நகைச்சுவை படங்கள் மற்றும் செய்திகளை பெறுவீர்',
            isBasicASCII: false,
            lineTokens: createViewLineTokens([createPart(100, 3)]),
            stopRenderingLineAfter: 10000
        }));
        const inflated = inflateRenderLineOutput(actual);
        await assertSnapshot(inflated.html.join(''), HTML_EXTENSION);
        await assertSnapshot(inflated.mapping);
    });
    test('issue #42700: Hindi characters are not being rendered properly', async () => {
        const actual = renderViewLine(createRenderLineInput({
            useMonospaceOptimizations: true,
            lineContent: ' वो ऐसा क्या है जो हमारे अंदर भी है और बाहर भी है। जिसकी वजह से हम सब हैं। जिसने इस सृष्टि की रचना की है।',
            isBasicASCII: false,
            lineTokens: createViewLineTokens([createPart(105, 3)]),
            stopRenderingLineAfter: 10000
        }));
        const inflated = inflateRenderLineOutput(actual);
        await assertSnapshot(inflated.html.join(''), HTML_EXTENSION);
        await assertSnapshot(inflated.mapping);
    });
    test('issue #38123: editor.renderWhitespace: "boundary" renders whitespace at line wrap point when line is wrapped', async () => {
        const actual = renderViewLine(createRenderLineInput({
            useMonospaceOptimizations: true,
            lineContent: 'This is a long line which never uses more than two spaces. ',
            continuesWithWrappedLine: true,
            lineTokens: createViewLineTokens([createPart(59, 3)]),
            stopRenderingLineAfter: 10000,
            renderWhitespace: 'boundary'
        }));
        const inflated = inflateRenderLineOutput(actual);
        await assertSnapshot(inflated.html.join(''), HTML_EXTENSION);
        await assertSnapshot(inflated.mapping);
    });
    test('issue #33525: Long line with ligatures takes a long time to paint decorations', async () => {
        const actual = renderViewLine(createRenderLineInput({
            canUseHalfwidthRightwardsArrow: false,
            lineContent: 'append data to append data to append data to append data to append data to append data to append data to append data to append data to append data to append data to append data to append data to',
            lineTokens: createViewLineTokens([createPart(194, 3)]),
            stopRenderingLineAfter: 10000,
            fontLigatures: true
        }));
        const inflated = inflateRenderLineOutput(actual);
        await assertSnapshot(inflated.html.join(''), HTML_EXTENSION);
        await assertSnapshot(inflated.mapping);
    });
    test('issue #33525: Long line with ligatures takes a long time to paint decorations - not possible', async () => {
        const actual = renderViewLine(createRenderLineInput({
            canUseHalfwidthRightwardsArrow: false,
            lineContent: 'appenddatatoappenddatatoappenddatatoappenddatatoappenddatatoappenddatatoappenddatatoappenddatatoappenddatatoappenddatatoappenddatatoappenddatatoappenddatato',
            lineTokens: createViewLineTokens([createPart(194, 3)]),
            stopRenderingLineAfter: 10000,
            fontLigatures: true
        }));
        const inflated = inflateRenderLineOutput(actual);
        await assertSnapshot(inflated.html.join(''), HTML_EXTENSION);
        await assertSnapshot(inflated.mapping);
    });
    test('issue #91936: Semantic token color highlighting fails on line with selected text', async () => {
        const actual = renderViewLine(createRenderLineInput({
            lineContent: '                    else if ($s = 08) then \'\\b\'',
            lineTokens: createViewLineTokens([
                createPart(20, 1),
                createPart(24, 15),
                createPart(25, 1),
                createPart(27, 15),
                createPart(28, 1),
                createPart(29, 1),
                createPart(29, 1),
                createPart(31, 16),
                createPart(32, 1),
                createPart(33, 1),
                createPart(34, 1),
                createPart(36, 6),
                createPart(36, 1),
                createPart(37, 1),
                createPart(38, 1),
                createPart(42, 15),
                createPart(43, 1),
                createPart(47, 11)
            ]),
            stopRenderingLineAfter: 10000,
            renderWhitespace: 'selection',
            selectionsOnLine: [new OffsetRange(0, 47)],
            middotWidth: 11,
            wsmiddotWidth: 11
        }));
        const inflated = inflateRenderLineOutput(actual);
        await assertSnapshot(inflated.html.join(''), HTML_EXTENSION);
        await assertSnapshot(inflated.mapping);
    });
    test('issue #119416: Delete Control Character (U+007F / &#127;) displayed as space', async () => {
        const actual = renderViewLine(createRenderLineInput({
            canUseHalfwidthRightwardsArrow: false,
            lineContent: '[' + String.fromCharCode(127) + '] [' + String.fromCharCode(0) + ']',
            lineTokens: createViewLineTokens([createPart(7, 3)]),
            stopRenderingLineAfter: 10000,
            renderControlCharacters: true,
            fontLigatures: true
        }));
        const inflated = inflateRenderLineOutput(actual);
        await assertSnapshot(inflated.html.join(''), HTML_EXTENSION);
        await assertSnapshot(inflated.mapping);
    });
    test('issue #116939: Important control characters aren\'t rendered', async () => {
        const actual = renderViewLine(createRenderLineInput({
            canUseHalfwidthRightwardsArrow: false,
            lineContent: `transferBalance(5678,${String.fromCharCode(0x202E)}6776,4321${String.fromCharCode(0x202C)},"USD");`,
            isBasicASCII: false,
            lineTokens: createViewLineTokens([createPart(42, 3)]),
            stopRenderingLineAfter: 10000,
            renderControlCharacters: true
        }));
        const inflated = inflateRenderLineOutput(actual);
        await assertSnapshot(inflated.html.join(''), HTML_EXTENSION);
        await assertSnapshot(inflated.mapping);
    });
    test('issue #124038: Multiple end-of-line text decorations get merged', async () => {
        const actual = renderViewLine(createRenderLineInput({
            useMonospaceOptimizations: true,
            canUseHalfwidthRightwardsArrow: false,
            lineContent: '    if',
            lineTokens: createViewLineTokens([createPart(4, 1), createPart(6, 2)]),
            lineDecorations: [
                new LineDecoration(7, 7, 'ced-1-TextEditorDecorationType2-17c14d98-3 ced-1-TextEditorDecorationType2-3', 1 /* InlineDecorationType.Before */),
                new LineDecoration(7, 7, 'ced-1-TextEditorDecorationType2-17c14d98-4 ced-1-TextEditorDecorationType2-4', 2 /* InlineDecorationType.After */),
                new LineDecoration(7, 7, 'ced-ghost-text-1-4', 2 /* InlineDecorationType.After */),
            ],
            stopRenderingLineAfter: 10000,
            renderWhitespace: 'all'
        }));
        const inflated = inflateRenderLineOutput(actual);
        await assertSnapshot(inflated.html.join(''), HTML_EXTENSION);
        await assertSnapshot(inflated.mapping);
    });
    function createTestGetColumnOfLinePartOffset(lineContent, tabSize, parts, expectedPartLengths) {
        const renderLineOutput = renderViewLine(createRenderLineInput({
            lineContent,
            tabSize,
            lineTokens: createViewLineTokens(parts)
        }));
        return (partIndex, partLength, offset, expected) => {
            const actualColumn = renderLineOutput.characterMapping.getColumn(new DomPosition(partIndex, offset), partLength);
            assert.strictEqual(actualColumn, expected, 'getColumn for ' + partIndex + ', ' + offset);
        };
    }
    test('getColumnOfLinePartOffset 1 - simple text', () => {
        const testGetColumnOfLinePartOffset = createTestGetColumnOfLinePartOffset('hello world', 4, [
            createPart(11, 1)
        ], [11]);
        testGetColumnOfLinePartOffset(0, 11, 0, 1);
        testGetColumnOfLinePartOffset(0, 11, 1, 2);
        testGetColumnOfLinePartOffset(0, 11, 2, 3);
        testGetColumnOfLinePartOffset(0, 11, 3, 4);
        testGetColumnOfLinePartOffset(0, 11, 4, 5);
        testGetColumnOfLinePartOffset(0, 11, 5, 6);
        testGetColumnOfLinePartOffset(0, 11, 6, 7);
        testGetColumnOfLinePartOffset(0, 11, 7, 8);
        testGetColumnOfLinePartOffset(0, 11, 8, 9);
        testGetColumnOfLinePartOffset(0, 11, 9, 10);
        testGetColumnOfLinePartOffset(0, 11, 10, 11);
        testGetColumnOfLinePartOffset(0, 11, 11, 12);
    });
    test('getColumnOfLinePartOffset 2 - regular JS', () => {
        const testGetColumnOfLinePartOffset = createTestGetColumnOfLinePartOffset('var x = 3;', 4, [
            createPart(3, 1),
            createPart(4, 2),
            createPart(5, 3),
            createPart(8, 4),
            createPart(9, 5),
            createPart(10, 6),
        ], [3, 1, 1, 3, 1, 1]);
        testGetColumnOfLinePartOffset(0, 3, 0, 1);
        testGetColumnOfLinePartOffset(0, 3, 1, 2);
        testGetColumnOfLinePartOffset(0, 3, 2, 3);
        testGetColumnOfLinePartOffset(0, 3, 3, 4);
        testGetColumnOfLinePartOffset(1, 1, 0, 4);
        testGetColumnOfLinePartOffset(1, 1, 1, 5);
        testGetColumnOfLinePartOffset(2, 1, 0, 5);
        testGetColumnOfLinePartOffset(2, 1, 1, 6);
        testGetColumnOfLinePartOffset(3, 3, 0, 6);
        testGetColumnOfLinePartOffset(3, 3, 1, 7);
        testGetColumnOfLinePartOffset(3, 3, 2, 8);
        testGetColumnOfLinePartOffset(3, 3, 3, 9);
        testGetColumnOfLinePartOffset(4, 1, 0, 9);
        testGetColumnOfLinePartOffset(4, 1, 1, 10);
        testGetColumnOfLinePartOffset(5, 1, 0, 10);
        testGetColumnOfLinePartOffset(5, 1, 1, 11);
    });
    test('getColumnOfLinePartOffset 3 - tab with tab size 6', () => {
        const testGetColumnOfLinePartOffset = createTestGetColumnOfLinePartOffset('\t', 6, [
            createPart(1, 1)
        ], [6]);
        testGetColumnOfLinePartOffset(0, 6, 0, 1);
        testGetColumnOfLinePartOffset(0, 6, 1, 1);
        testGetColumnOfLinePartOffset(0, 6, 2, 1);
        testGetColumnOfLinePartOffset(0, 6, 3, 1);
        testGetColumnOfLinePartOffset(0, 6, 4, 2);
        testGetColumnOfLinePartOffset(0, 6, 5, 2);
        testGetColumnOfLinePartOffset(0, 6, 6, 2);
    });
    test('getColumnOfLinePartOffset 4 - once indented line, tab size 4', () => {
        const testGetColumnOfLinePartOffset = createTestGetColumnOfLinePartOffset('\tfunction', 4, [
            createPart(1, 1),
            createPart(9, 2),
        ], [4, 8]);
        testGetColumnOfLinePartOffset(0, 4, 0, 1);
        testGetColumnOfLinePartOffset(0, 4, 1, 1);
        testGetColumnOfLinePartOffset(0, 4, 2, 1);
        testGetColumnOfLinePartOffset(0, 4, 3, 2);
        testGetColumnOfLinePartOffset(0, 4, 4, 2);
        testGetColumnOfLinePartOffset(1, 8, 0, 2);
        testGetColumnOfLinePartOffset(1, 8, 1, 3);
        testGetColumnOfLinePartOffset(1, 8, 2, 4);
        testGetColumnOfLinePartOffset(1, 8, 3, 5);
        testGetColumnOfLinePartOffset(1, 8, 4, 6);
        testGetColumnOfLinePartOffset(1, 8, 5, 7);
        testGetColumnOfLinePartOffset(1, 8, 6, 8);
        testGetColumnOfLinePartOffset(1, 8, 7, 9);
        testGetColumnOfLinePartOffset(1, 8, 8, 10);
    });
    test('getColumnOfLinePartOffset 5 - twice indented line, tab size 4', () => {
        const testGetColumnOfLinePartOffset = createTestGetColumnOfLinePartOffset('\t\tfunction', 4, [
            createPart(2, 1),
            createPart(10, 2),
        ], [8, 8]);
        testGetColumnOfLinePartOffset(0, 8, 0, 1);
        testGetColumnOfLinePartOffset(0, 8, 1, 1);
        testGetColumnOfLinePartOffset(0, 8, 2, 1);
        testGetColumnOfLinePartOffset(0, 8, 3, 2);
        testGetColumnOfLinePartOffset(0, 8, 4, 2);
        testGetColumnOfLinePartOffset(0, 8, 5, 2);
        testGetColumnOfLinePartOffset(0, 8, 6, 2);
        testGetColumnOfLinePartOffset(0, 8, 7, 3);
        testGetColumnOfLinePartOffset(0, 8, 8, 3);
        testGetColumnOfLinePartOffset(1, 8, 0, 3);
        testGetColumnOfLinePartOffset(1, 8, 1, 4);
        testGetColumnOfLinePartOffset(1, 8, 2, 5);
        testGetColumnOfLinePartOffset(1, 8, 3, 6);
        testGetColumnOfLinePartOffset(1, 8, 4, 7);
        testGetColumnOfLinePartOffset(1, 8, 5, 8);
        testGetColumnOfLinePartOffset(1, 8, 6, 9);
        testGetColumnOfLinePartOffset(1, 8, 7, 10);
        testGetColumnOfLinePartOffset(1, 8, 8, 11);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld0xpbmVSZW5kZXJlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FoYW1lZC9EZXNrdG9wL3B1a3UtdnMtZWRpdG9yL3B1a3UtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvY29tbW9uL3ZpZXdMYXlvdXQvdmlld0xpbmVSZW5kZXJlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUU1QixPQUFPLEtBQUssT0FBTyxNQUFNLG9DQUFvQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFHekUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQy9FLE9BQU8sRUFBb0IsV0FBVyxFQUEyQixlQUFlLEVBQXFCLGVBQWUsSUFBSSxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUUvTCxPQUFPLEVBQUUsYUFBYSxFQUFFLGNBQWMsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBRXpFLE1BQU0sY0FBYyxHQUFHLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxDQUFDO0FBRTdDLFNBQVMsb0JBQW9CLENBQUMsY0FBK0I7SUFDNUQsT0FBTyxJQUFJLGNBQWMsQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUMzQyxDQUFDO0FBRUQsU0FBUyxVQUFVLENBQUMsUUFBZ0IsRUFBRSxVQUFrQjtJQUN2RCxPQUFPLElBQUksYUFBYSxDQUFDLFFBQVEsRUFBRSxDQUNsQyxVQUFVLDZDQUFvQyxDQUM5QyxLQUFLLENBQUMsQ0FBQyxDQUFDO0FBQ1YsQ0FBQztBQUVELFNBQVMsdUJBQXVCLENBQUMsZ0JB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QUMsQ0FBQyxFQUFFLDhCQUE4QixFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN0RyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxXQUFXLEVBQUUsR0FBRyxFQUFFO1FBQ3RCLFdBQVcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsd0RBQXdELEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDOUosV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSx5REFBeUQsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzdLLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxDQUFDLENB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QyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzNDLDZCQUE2QixDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzNDLDZCQUE2QixDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQzVDLDZCQUE2QixDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQzdDLDZCQUE2QixDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQzlDLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDBDQUEwQyxFQUFFLEdBQUcsRUFBRTtRQUNyRCxNQUFNLDZCQUE2QixHQUFHLG1DQUFtQyxDQUN4RSxZQUFZLEVBQ1osQ0FBQyxFQUNEO1lBQ0MsVUFBVSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDaEIsVUFBVSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDaEIsVUFBVSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDaEIsVUFBVSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDaEIsVUFBVSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDaEIsVUFBVSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7U0FDakIsRUFDRCxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQ2xCLENBQUM7UUFDRiw2QkFBNkIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMxQyw2QkFBNkIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMxQyw2QkFBNkIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMxQyw2QkFBNkIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMxQyw2QkFBNkIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMxQyw2QkFBNkIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMxQyw2QkFBNkIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMxQyw2QkFBNkIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMxQyw2QkFBNkIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMxQyw2QkFBNkIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMxQyw2QkFBNkIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMxQyw2QkFBNkIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMxQyw2QkFBNkIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMxQyw2QkFBNkIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUMzQyw2QkFBNkIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUMzQyw2QkFBNkIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUM1QyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxtREFBbUQsRUFBRSxHQUFHLEVBQUU7UUFDOUQsTUFBTSw2QkFBNkIsR0FBRyxtQ0FBbUMsQ0FDeEUsSUFBSSxFQUNKLENBQUMsRUFDRDtZQUNDLFVBQVUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1NBQ2hCLEVBQ0QsQ0FBQyxDQUFDLENBQUMsQ0FDSCxDQUFDO1FBQ0YsNkJBQTZCLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDMUMsNkJBQTZCLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDMUMsNkJBQTZCLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDMUMsNkJBQTZCLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDMUMsNkJBQTZCLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDMUMsNkJBQTZCLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDMUMsNkJBQTZCLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDM0MsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsOERBQThELEVBQUUsR0FBRyxFQUFFO1FBQ3pFLE1BQU0sNkJBQTZCLEdBQUcsbUNBQW1DLENBQ3hFLFlBQVksRUFDWixDQUFDLEVBQ0Q7WUFDQyxVQUFVLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNoQixVQUFVLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztTQUNoQixFQUNELENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUNOLENBQUM7UUFDRiw2QkFBNkIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMxQyw2QkFBNkIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMxQyw2QkFBNkIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMxQyw2QkFBNkIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMxQyw2QkFBNkIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMxQyw2QkFBNkIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMxQyw2QkFBNkIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMxQyw2QkFBNkIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMxQyw2QkFBNkIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMxQyw2QkFBNkIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMxQyw2QkFBNkIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMxQyw2QkFBNkIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMxQyw2QkFBNkIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMxQyw2QkFBNkIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUM1QyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQywrREFBK0QsRUFBRSxHQUFHLEVBQUU7UUFDMUUsTUFBTSw2QkFBNkIsR0FBRyxtQ0FBbUMsQ0FDeEUsY0FBYyxFQUNkLENBQUMsRUFDRDtZQUNDLFVBQVUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ2hCLFVBQVUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1NBQ2pCLEVBQ0QsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQ04sQ0FBQztRQUNGLDZCQUE2QixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzFDLDZCQUE2QixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzFDLDZCQUE2QixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzFDLDZCQUE2QixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzFDLDZCQUE2QixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzFDLDZCQUE2QixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzFDLDZCQUE2QixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzFDLDZCQUE2QixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzFDLDZCQUE2QixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzFDLDZCQUE2QixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzFDLDZCQUE2QixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzFDLDZCQUE2QixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzFDLDZCQUE2QixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzFDLDZCQUE2QixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzFDLDZCQUE2QixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzFDLDZCQUE2QixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzFDLDZCQUE2QixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQzNDLDZCQUE2QixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQzVDLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMifQ==