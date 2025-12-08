"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const diffServiceImpl_1 = require("../../../../platform/diff/node/diffServiceImpl");
const edit_1 = require("../../../../platform/editing/common/edit");
const edit_2 = require("../../../../platform/inlineEdits/common/dataTypes/edit");
const abstractText_1 = require("../../../../util/vs/editor/common/core/text/abstractText");
const importFiltering_1 = require("../../node/importFiltering");
(0, vitest_1.suite)('IgnoreImportChangesAspect', () => {
    const diffService = new diffServiceImpl_1.DiffServiceImpl();
    async function computeDiff(val1, val2) {
        const edit = await (0, edit_1.stringEditFromDiff)(val1.value, val2.value, diffService);
        return new edit_2.RootedEdit(val1, edit);
    }
    const doc1 = new abstractText_1.StringText(`
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { assert } from '../../../util/vs/base/common/assert';
import { CancellationToken } from '../../../util/vs/base/common/cancellation';
import { win32 } from '../../../util/vs/base/common/path';

class FooBar {
}
	`);
    (0, vitest_1.test)('ImportDeletion', async () => {
        const doc2 = new abstractText_1.StringText(`
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { assert } from '../../../util/vs/base/common/assert';
import { win32 } from '../../../util/vs/base/common/path';

class FooBar {
}
`);
        const lineEdit = edit_2.RootedEdit.toLineEdit(await computeDiff(doc1, doc2));
        (0, vitest_1.expect)(importFiltering_1.IgnoreImportChangesAspect.isImportChange(lineEdit.replacements[0], 'typescript', doc1.getLines())).toBe(true);
    });
    (0, vitest_1.test)('ImportAddition', async () => {
        const doc2 = new abstractText_1.StringText(`
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { assert } from '../../../util/vs/base/common/assert';
import { assert2 } from '../../../util/vs/base/common/assert2';
import { CancellationToken } from '../../../util/vs/base/common/cancellation';
import { win32 } from '../../../util/vs/base/common/path';

class FooBar {
}
`);
        const lineEdit = edit_2.RootedEdit.toLineEdit(await computeDiff(doc1, doc2));
        (0, vitest_1.expect)(importFiltering_1.IgnoreImportChangesAspect.isImportChange(lineEdit.replacements[0], 'typescript', doc1.getLines())).toBe(true);
    });
    (0, vitest_1.test)('ImportChange', async () => {
        const doc2 = new abstractText_1.StringText(`
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { assert } from '../../../util/vs/base/common/assert';
import { CancellationToken2 } from '../../../util/vs/base/common/cancellation';
import { win32 } from '../../../util/vs/base/common/path';

class FooBar {
}
`);
        const lineEdit = edit_2.RootedEdit.toLineEdit(await computeDiff(doc1, doc2));
        (0, vitest_1.expect)(importFiltering_1.IgnoreImportChangesAspect.isImportChange(lineEdit.replacements[0], 'typescript', doc1.getLines())).toBe(true);
    });
    (0, vitest_1.test)('ClassChange', async () => {
        const doc2 = new abstractText_1.StringText(`
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { assert } from '../../../util/vs/base/common/assert';
import { CancellationToken } from '../../../util/vs/base/common/cancellation';
import { win32 } from '../../../util/vs/base/common/path';

class FooBar {
	test() {}
}
`);
        const lineEdit = edit_2.RootedEdit.toLineEdit(await computeDiff(doc1, doc2));
        (0, vitest_1.expect)(importFiltering_1.IgnoreImportChangesAspect.isImportChange(lineEdit.replacements[0], 'typescript', doc1.getLines())).toBe(false);
    });
});
//# sourceMappingURL=ignoreImportChanges.spec.js.map