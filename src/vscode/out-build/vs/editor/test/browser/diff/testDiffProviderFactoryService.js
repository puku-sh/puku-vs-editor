/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { toDisposable } from '../../../../base/common/lifecycle.js';
import { linesDiffComputers } from '../../../common/diff/linesDiffComputers.js';
export class TestDiffProviderFactoryService {
    createDiffProvider() {
        return new SyncDocumentDiffProvider();
    }
}
class SyncDocumentDiffProvider {
    constructor() {
        this.onDidChange = () => toDisposable(() => { });
    }
    computeDiff(original, modified, options, cancellationToken) {
        const result = linesDiffComputers.getDefault().computeDiff(original.getLinesContent(), modified.getLinesContent(), options);
        return Promise.resolve({
            changes: result.changes,
            quitEarly: result.hitTimeout,
            identical: original.getValue() === modified.getValue(),
            moves: result.moves,
        });
    }
}
//# sourceMappingURL=testDiffProviderFactoryService.js.map