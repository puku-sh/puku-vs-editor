/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { FuzzyScore } from '../../../../base/common/filters.js';
export class SimpleCompletionItem {
    constructor(completion) {
        this.completion = completion;
        // sorting, filtering
        this.score = FuzzyScore.Default;
        // validation
        this.isInvalid = false;
        // ensure lower-variants (perf)
        this.textLabel = typeof completion.label === 'string'
            ? completion.label
            : completion.label?.label;
        this.labelLow = this.textLabel.toLowerCase();
    }
}
//# sourceMappingURL=simpleCompletionItem.js.map