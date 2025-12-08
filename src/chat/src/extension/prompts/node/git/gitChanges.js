"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitChanges = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const path_1 = require("../../../../util/vs/base/common/path");
const fileVariable_1 = require("../panel/fileVariable");
const unsafeElements_1 = require("../panel/unsafeElements");
class GitChanges extends prompt_tsx_1.PromptElement {
    render() {
        return (vscpp(vscppf, null, this.props.diffs.map((diff) => (vscpp(vscppf, null,
            vscpp("references", { value: diff.uri ? [new prompt_tsx_1.PromptReference(diff.uri)] : [] }),
            vscpp(fileVariable_1.FileVariable, { passPriority: true, variableName: (0, path_1.basename)(diff.uri.toString()), variableValue: diff.uri, filePathMode: fileVariable_1.FilePathMode.AsComment }),
            vscpp(unsafeElements_1.UnsafeCodeBlock, { passPriority: true, code: diff.diff, languageId: 'diff' }),
            vscpp("br", null))))));
    }
}
exports.GitChanges = GitChanges;
//# sourceMappingURL=gitChanges.js.map