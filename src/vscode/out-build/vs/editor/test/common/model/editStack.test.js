/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { Selection } from '../../../common/core/selection.js';
import { TextChange } from '../../../common/core/textChange.js';
import { SingleModelEditStackData } from '../../../common/model/editStack.js';
suite('EditStack', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('issue #118041: unicode character undo bug', () => {
        const stackData = new SingleModelEditStackData(1, 2, 0 /* EndOfLineSequence.LF */, 0 /* EndOfLineSequence.LF */, [new Selection(10, 2, 10, 2)], [new Selection(10, 1, 10, 1)], [new TextChange(428, '﻿', 428, '')]);
        const buff = stackData.serialize();
        const actual = SingleModelEditStackData.deserialize(buff);
        assert.deepStrictEqual(actual, stackData);
    });
});
//# sourceMappingURL=editStack.test.js.map