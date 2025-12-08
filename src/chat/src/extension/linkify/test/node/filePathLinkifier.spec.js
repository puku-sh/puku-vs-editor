"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const platform_1 = require("../../../../util/vs/base/common/platform");
const uri_1 = require("../../../../util/vs/base/common/uri");
const linkifiedText_1 = require("../../common/linkifiedText");
const util_1 = require("./util");
(0, vitest_1.suite)('File Path Linkifier', () => {
    (0, vitest_1.test)(`Should create file links from Markdown links`, async () => {
        const linkifier = (0, util_1.createTestLinkifierService)('file.ts', 'src/file.ts');
        (0, util_1.assertPartsEqual)((await (0, util_1.linkify)(linkifier, '[file.ts](file.ts) [src/file.ts](src/file.ts)')).parts, [
            new linkifiedText_1.LinkifyLocationAnchor((0, util_1.workspaceFile)('file.ts')),
            ` `,
            new linkifiedText_1.LinkifyLocationAnchor((0, util_1.workspaceFile)('src/file.ts'))
        ]);
        (0, util_1.assertPartsEqual)((await (0, util_1.linkify)(linkifier, '[`file.ts`](file.ts) [`src/file.ts`](src/file.ts)')).parts, [
            new linkifiedText_1.LinkifyLocationAnchor((0, util_1.workspaceFile)('file.ts')),
            ` `,
            new linkifiedText_1.LinkifyLocationAnchor((0, util_1.workspaceFile)('src/file.ts'))
        ]);
    });
    (0, vitest_1.test)(`Should create links for directories`, async () => {
        {
            const linkifier = (0, util_1.createTestLinkifierService)('dir/');
            (0, util_1.assertPartsEqual)((await (0, util_1.linkify)(linkifier, '[dir](dir) [dir/](dir/)')).parts, [
                new linkifiedText_1.LinkifyLocationAnchor((0, util_1.workspaceFile)('dir')),
                ` `,
                new linkifiedText_1.LinkifyLocationAnchor((0, util_1.workspaceFile)('dir/'))
            ]);
        }
        {
            const linkifier = (0, util_1.createTestLinkifierService)('dir1/dir2/');
            (0, util_1.assertPartsEqual)((await (0, util_1.linkify)(linkifier, '[dir1/dir2](dir1/dir2) [dir1/dir2/](dir1/dir2/)')).parts, [
                new linkifiedText_1.LinkifyLocationAnchor((0, util_1.workspaceFile)('dir1/dir2')),
                ` `,
                new linkifiedText_1.LinkifyLocationAnchor((0, util_1.workspaceFile)('dir1/dir2/'))
            ]);
        }
    });
    (0, vitest_1.test)(`Should create file links for file paths as inline code`, async () => {
        const linkifier = (0, util_1.createTestLinkifierService)('file.ts', 'src/file.ts');
        (0, util_1.assertPartsEqual)((await (0, util_1.linkify)(linkifier, '`file.ts` `src/file.ts`')).parts, [
            new linkifiedText_1.LinkifyLocationAnchor((0, util_1.workspaceFile)('file.ts')),
            ` `,
            new linkifiedText_1.LinkifyLocationAnchor((0, util_1.workspaceFile)('src/file.ts'))
        ]);
    });
    (0, vitest_1.test)(`Should create file paths printed as plain text `, async () => {
        const linkifier = (0, util_1.createTestLinkifierService)('file.ts', 'src/file.ts');
        (0, util_1.assertPartsEqual)((await (0, util_1.linkify)(linkifier, 'file.ts src/file.ts')).parts, [
            new linkifiedText_1.LinkifyLocationAnchor((0, util_1.workspaceFile)('file.ts')),
            ` `,
            new linkifiedText_1.LinkifyLocationAnchor((0, util_1.workspaceFile)('src/file.ts'))
        ]);
    });
    (0, vitest_1.test)(`Should de-linkify files that don't exist`, async () => {
        const linkifier = (0, util_1.createTestLinkifierService)();
        (0, util_1.assertPartsEqual)((await (0, util_1.linkify)(linkifier, '[noSuchFile.ts](noSuchFile.ts) [src/noSuchFile.ts](src/noSuchFile.ts)')).parts, [
            'noSuchFile.ts src/noSuchFile.ts'
        ]);
    });
    (0, vitest_1.test)(`Should de-linkify bare file links that haven't been transformed`, async () => {
        const linkifier = (0, util_1.createTestLinkifierService)('file.ts', 'src/file.ts');
        (0, util_1.assertPartsEqual)((await (0, util_1.linkify)(linkifier, '[text](file.ts) [`symbol` foo](src/file.ts)')).parts, [
            'text `symbol` foo',
        ]);
    });
    (0, vitest_1.test)(`Should not create links for https links`, async () => {
        const linkifier = (0, util_1.createTestLinkifierService)();
        (0, util_1.assertPartsEqual)((await (0, util_1.linkify)(linkifier, '[http://example.com](http://example.com)')).parts, [
            '[http://example.com](http://example.com)',
        ]);
    });
    (0, vitest_1.test)(`Should handle file paths with spaces in the name`, async () => {
        const linkifier = (0, util_1.createTestLinkifierService)(`space file.ts`, 'sub space/space file.ts');
        const result = await (0, util_1.linkify)(linkifier, [
            '[space file.ts](space%20file.ts)',
            '[sub space/space file.ts](sub%20space/space%20file.ts)',
            '[no such file.ts](no%20such%20file.ts)',
            '[also not.ts](no%20such%20file.ts)',
        ].join('\n'));
        (0, util_1.assertPartsEqual)(result.parts, [
            new linkifiedText_1.LinkifyLocationAnchor((0, util_1.workspaceFile)('space file.ts')),
            `\n`,
            new linkifiedText_1.LinkifyLocationAnchor((0, util_1.workspaceFile)('sub space/space file.ts')),
            '\nno such file.ts\nalso not.ts',
        ]);
    });
    (0, vitest_1.test)(`Should handle posix style absolute paths`, async () => {
        const isFile = uri_1.URI.file(platform_1.isWindows ? 'c:\\foo\\isfile.ts' : '/foo/isfile.ts');
        const noFile = uri_1.URI.file(platform_1.isWindows ? 'c:\\foo\\nofile.ts' : '/foo/nofile.ts');
        const linkifier = (0, util_1.createTestLinkifierService)(isFile);
        (0, util_1.assertPartsEqual)((await (0, util_1.linkify)(linkifier, [
            `\`${isFile.fsPath}\``,
            `\`${noFile.fsPath}\``,
        ].join('\n'))).parts, [
            new linkifiedText_1.LinkifyLocationAnchor(isFile),
            `\n\`${noFile.fsPath}\``,
        ]);
    });
    (0, vitest_1.test)(`Should not linkify some common ambagious short paths`, async () => {
        const linkifier = (0, util_1.createTestLinkifierService)();
        (0, util_1.assertPartsEqual)((await (0, util_1.linkify)(linkifier, [
            '- `.`',
            '- `..`',
            '- `/.`',
            '- `\\.`',
            '- `/..`',
            '- `\\..`',
            '- `/`',
            '- `\\`',
            '- `/`',
            '- `//`',
            '- `///`',
        ].join('\n'))).parts, [
            [
                '- `.`',
                '- `..`',
                '- `/.`',
                '- `\\.`',
                '- `/..`',
                '- `\\..`',
                '- `/`',
                '- `\\`',
                '- `/`',
                '- `//`',
                '- `///`',
            ].join('\n')
        ]);
    });
    (0, vitest_1.test)(`Should find file links in bold elements`, async () => {
        const linkifier = (0, util_1.createTestLinkifierService)('file.ts', 'src/file.ts');
        (0, util_1.assertPartsEqual)((await (0, util_1.linkify)(linkifier, '**file.ts**')).parts, [
            `**`,
            new linkifiedText_1.LinkifyLocationAnchor((0, util_1.workspaceFile)('file.ts')),
            `**`,
        ]);
        (0, util_1.assertPartsEqual)((await (0, util_1.linkify)(linkifier, '**`file.ts`**')).parts, [
            `**`,
            new linkifiedText_1.LinkifyLocationAnchor((0, util_1.workspaceFile)('file.ts')),
            `**`,
        ]);
    });
});
//# sourceMappingURL=filePathLinkifier.spec.js.map