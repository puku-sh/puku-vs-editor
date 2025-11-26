/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../../../../../base/common/lifecycle.js';
import { isPowerShell } from '../../runInTerminalHelpers.js';
export class CommandLinePwshChainOperatorRewriter extends Disposable {
    constructor(_treeSitterCommandParser) {
        super();
        this._treeSitterCommandParser = _treeSitterCommandParser;
    }
    async rewrite(options) {
        // TODO: This should just be Windows PowerShell in the future when the powershell grammar
        // supports chain operators https://github.com/airbus-cert/tree-sitter-powershell/issues/27
        if (isPowerShell(options.shell, options.os)) {
            let doubleAmpersandCaptures;
            try {
                doubleAmpersandCaptures = await this._treeSitterCommandParser.extractPwshDoubleAmpersandChainOperators(options.commandLine);
            }
            catch {
                // Swallow tree sitter failures
            }
            if (doubleAmpersandCaptures && doubleAmpersandCaptures.length > 0) {
                let rewritten = options.commandLine;
                for (const capture of doubleAmpersandCaptures.reverse()) {
                    rewritten = `${rewritten.substring(0, capture.node.startIndex)};${rewritten.substring(capture.node.endIndex)}`;
                }
                return {
                    rewritten,
                    reasoning: '&& re-written to ;'
                };
            }
        }
        return undefined;
    }
}
//# sourceMappingURL=commandLinePwshChainOperatorRewriter.js.map