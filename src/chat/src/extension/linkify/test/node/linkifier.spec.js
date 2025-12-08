"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const cancellation_1 = require("../../../../util/vs/base/common/cancellation");
const linkifiedText_1 = require("../../common/linkifiedText");
const util_1 = require("./util");
const emptyContext = { requestId: undefined, references: [] };
(0, vitest_1.suite)('Stateful Linkifier', () => {
    async function runLinkifier(linkifier, parts) {
        const out = [];
        for (const part of parts) {
            out.push(...(await linkifier.append(part, cancellation_1.CancellationToken.None)).parts);
        }
        out.push(...(await linkifier.flush(cancellation_1.CancellationToken.None))?.parts ?? []);
        return (0, linkifiedText_1.coalesceParts)(out);
    }
    (0, vitest_1.test)(`Should not linkify inside of markdown code blocks`, async () => {
        const linkifier = (0, util_1.createTestLinkifierService)('file.ts', 'src/file.ts').createLinkifier(emptyContext);
        const parts = [
            '[file.ts](file.ts)',
            '\n',
            '```',
            '\n',
            '[file.ts](file.ts)',
            '\n',
            '```',
            '\n',
            '[file.ts](file.ts)',
        ];
        const result = await runLinkifier(linkifier, parts);
        (0, util_1.assertPartsEqual)(result, [
            new linkifiedText_1.LinkifyLocationAnchor((0, util_1.workspaceFile)('file.ts')),
            ['\n',
                '```',
                '\n',
                '[file.ts](file.ts)', // no linkification here
                '\n',
                '```',
                '\n'
            ].join(''),
            new linkifiedText_1.LinkifyLocationAnchor((0, util_1.workspaceFile)('file.ts'))
        ]);
    });
    (0, vitest_1.test)(`Should handle link tokens`, async () => {
        const linkifier = (0, util_1.createTestLinkifierService)('file.ts', 'src/file.ts').createLinkifier(emptyContext);
        {
            // Tokens for `[file.ts](file.ts)`
            const parts = [
                '[file',
                '.ts',
                '](',
                'file',
                '.ts',
                ')',
            ];
            const result = await runLinkifier(linkifier, parts);
            (0, util_1.assertPartsEqual)(result, [
                new linkifiedText_1.LinkifyLocationAnchor((0, util_1.workspaceFile)('file.ts')),
            ]);
        }
        {
            // Another potential tokenization for `[file.ts](file.ts)`
            const parts = [
                '[',
                'file',
                '.ts',
                '](',
                'file',
                '.ts',
                ')',
            ];
            const result = await runLinkifier(linkifier, parts);
            (0, util_1.assertPartsEqual)(result, [
                new linkifiedText_1.LinkifyLocationAnchor((0, util_1.workspaceFile)('file.ts')),
            ]);
        }
        {
            // With leading space potential tokenization for `[file.ts](file.ts)`
            const parts = [
                ' [',
                'file',
                '.ts',
                '](',
                'file',
                '.ts',
                ')',
            ];
            const result = await runLinkifier(linkifier, parts);
            (0, util_1.assertPartsEqual)(result, [
                ' ',
                new linkifiedText_1.LinkifyLocationAnchor((0, util_1.workspaceFile)('file.ts')),
            ]);
        }
    });
    (0, vitest_1.test)(`Should handle inline code with spaces`, async () => {
        const linkText = 'LINK';
        const linkifier = (0, util_1.createTestLinkifierService)('file.ts', 'src/file.ts').createLinkifier(emptyContext, [
            {
                create: () => ({
                    async linkify(newText) {
                        if (/\s*`[^`]+`\s*/.test(newText)) {
                            return { parts: [linkText] };
                        }
                        return;
                    },
                })
            }
        ]);
        const parts = [
            '`code ',
            ' more`',
        ];
        const result = await runLinkifier(linkifier, parts);
        (0, util_1.assertPartsEqual)(result, [
            linkText
        ]);
    });
    (0, vitest_1.test)(`Should not linkify inside of markdown fenced code block containing fenced code blocks (#5708)`, async () => {
        const linkifier = (0, util_1.createTestLinkifierService)('file.ts').createLinkifier(emptyContext);
        const parts = [
            '[file.ts](file.ts)',
            '\n',
            '```md',
            '\n',
            '[file.ts](file.ts)',
            '\n',
            '\t```ts',
            '\n',
            `\t1 + 1`,
            '\n',
            '\t[file.ts](file.ts)',
            '\n',
            '\t```',
            '\n',
            '[file.ts](file.ts)',
            '\n',
            '```',
            '\n',
            '[file.ts](file.ts)',
        ];
        const result = await runLinkifier(linkifier, parts);
        (0, util_1.assertPartsEqual)(result, [
            new linkifiedText_1.LinkifyLocationAnchor((0, util_1.workspaceFile)('file.ts')),
            [
                '\n',
                '```md',
                '\n',
                '[file.ts](file.ts)', // No linkification
                '\n',
                '\t```ts',
                '\n',
                `\t1 + 1`,
                '\n',
                '\t[file.ts](file.ts)', // No linkification
                '\n',
                '\t```',
                '\n',
                '[file.ts](file.ts)', // No linkification
                '\n',
                '```',
                '\n',
            ].join(''),
            new linkifiedText_1.LinkifyLocationAnchor((0, util_1.workspaceFile)('file.ts'))
        ]);
    });
    (0, vitest_1.test)(`Should not linkify inside tilde markdown code blocks`, async () => {
        const linkifier = (0, util_1.createTestLinkifierService)('file.ts').createLinkifier(emptyContext);
        const parts = [
            '[file.ts](file.ts)',
            '\n',
            '~~~',
            '\n',
            '[file.ts](file.ts)',
            '\n',
            '~~~',
            '\n',
            '[file.ts](file.ts)',
        ];
        const result = await runLinkifier(linkifier, parts);
        (0, util_1.assertPartsEqual)(result, [
            new linkifiedText_1.LinkifyLocationAnchor((0, util_1.workspaceFile)('file.ts')),
            [
                '\n',
                '~~~',
                '\n',
                '[file.ts](file.ts)', // no linkification here
                '\n',
                '~~~',
                '\n',
            ].join(''),
            new linkifiedText_1.LinkifyLocationAnchor((0, util_1.workspaceFile)('file.ts'))
        ]);
    });
    (0, vitest_1.test)(`Should correctly handle fenced code blocks split over multiple parts`, async () => {
        const linkifier = (0, util_1.createTestLinkifierService)('file.ts').createLinkifier(emptyContext);
        const parts = [
            '[file.ts](file.ts)',
            '\n',
            '```ts',
            '\n',
            '[file.ts](file.ts)',
            '\n``', // Split ending backtick
            '`',
            '\n',
            '[file.ts](file.ts)',
        ];
        const result = await runLinkifier(linkifier, parts);
        (0, util_1.assertPartsEqual)(result, [
            new linkifiedText_1.LinkifyLocationAnchor((0, util_1.workspaceFile)('file.ts')),
            [
                '\n',
                '```ts',
                '\n',
                '[file.ts](file.ts)', // no linkification here
                '\n',
                '```',
                '\n',
            ].join(''),
            new linkifiedText_1.LinkifyLocationAnchor((0, util_1.workspaceFile)('file.ts'))
        ]);
    });
    (0, vitest_1.test)(`Should correctly handle fenced code blocks when opening fence is split`, async () => {
        const linkifier = (0, util_1.createTestLinkifierService)('file.ts').createLinkifier(emptyContext);
        const parts = [
            '[file.ts](file.ts)',
            '\n',
            '``', // Split opening backticks
            '`ts',
            '\n',
            '[file.ts](file.ts)',
            '\n``', // Split ending backtick
            '`',
            '\n',
            '[file.ts](file.ts)',
        ];
        const result = await runLinkifier(linkifier, parts);
        (0, util_1.assertPartsEqual)(result, [
            new linkifiedText_1.LinkifyLocationAnchor((0, util_1.workspaceFile)('file.ts')),
            [
                '\n',
                '```ts',
                '\n',
                '[file.ts](file.ts)', // no linkification here
                '\n',
                '```',
                '\n',
            ].join(''),
            new linkifiedText_1.LinkifyLocationAnchor((0, util_1.workspaceFile)('file.ts'))
        ]);
    });
    (0, vitest_1.test)(`Should de-linkify links without schemes`, async () => {
        const linkifier = (0, util_1.createTestLinkifierService)().createLinkifier(emptyContext);
        const parts = [
            '[text](file.ts) [`text`](/file.ts)',
        ];
        const result = await runLinkifier(linkifier, parts);
        (0, util_1.assertPartsEqual)(result, [
            'text `text`'
        ]);
    });
    (0, vitest_1.test)(`Should not unlinkify text inside of code blocks`, async () => {
        const linkifier = (0, util_1.createTestLinkifierService)().createLinkifier(emptyContext);
        const parts = [
            '```md\n',
            `[g](x)\n`,
            '```',
        ];
        const result = await runLinkifier(linkifier, parts);
        (0, util_1.assertPartsEqual)(result, [
            [
                '```md\n',
                `[g](x)\n`,
                '```'
            ].join('')
        ]);
    });
    (0, vitest_1.test)(`Should not unlikify text inside of inline code`, async () => {
        {
            const linkifier = (0, util_1.createTestLinkifierService)().createLinkifier(emptyContext);
            const result = await runLinkifier(linkifier, [
                'a `J[g](x)` b',
            ]);
            (0, util_1.assertPartsEqual)(result, [
                'a `J[g](x)` b'
            ]);
        }
        {
            const linkifier = (0, util_1.createTestLinkifierService)().createLinkifier(emptyContext);
            const result = await runLinkifier(linkifier, [
                'a `b [c](d) e` f',
            ]);
            (0, util_1.assertPartsEqual)(result, [
                'a `b [c](d) e` f'
            ]);
        }
    });
    (0, vitest_1.test)(`Should not unlikify text inside of math blocks code`, async () => {
        {
            const linkifier = (0, util_1.createTestLinkifierService)('file1.ts', 'file2.ts').createLinkifier(emptyContext);
            const result = await runLinkifier(linkifier, [
                '[file1.ts](file1.ts)\n',
                '$$\n',
                `J[g](x)\n`,
                '$$\n',
                '[file2.ts](file2.ts)'
            ]);
            (0, util_1.assertPartsEqual)(result, [
                new linkifiedText_1.LinkifyLocationAnchor((0, util_1.workspaceFile)('file1.ts')),
                [
                    '',
                    '$$',
                    'J[g](x)',
                    '$$',
                    '',
                ].join('\n'),
                new linkifiedText_1.LinkifyLocationAnchor((0, util_1.workspaceFile)('file2.ts')),
            ]);
        }
    });
    (0, vitest_1.test)(`Should not touch code inside of inline math equations`, async () => {
        {
            const linkifier = (0, util_1.createTestLinkifierService)().createLinkifier(emptyContext);
            const result = await runLinkifier(linkifier, [
                'a $J[g](x)$ b',
            ]);
            (0, util_1.assertPartsEqual)(result, [
                'a $J[g](x)$ b'
            ]);
        }
        {
            const linkifier = (0, util_1.createTestLinkifierService)().createLinkifier(emptyContext);
            const result = await runLinkifier(linkifier, [
                'a $c [g](x) d$ x',
            ]);
            (0, util_1.assertPartsEqual)(result, [
                'a $c [g](x) d$ x',
            ]);
        }
    });
});
//# sourceMappingURL=linkifier.spec.js.map