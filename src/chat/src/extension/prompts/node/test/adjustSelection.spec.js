"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const abstractText_1 = require("../../../../platform/editing/common/abstractText");
const indentationStructure_1 = require("../../../../platform/parser/node/indentationStructure");
const vscodeTypes_1 = require("../../../../vscodeTypes");
const adjustSelection_1 = require("../inline/adjustSelection");
(0, vitest_1.describe)('adjustSelection', () => {
    (0, vitest_1.it)('should adjust selection in Swift code', async () => {
        const code = `import Foundation\nimport CoreMotion\n\n`;
        const doc = new abstractText_1.StringTextDocument(code);
        const ast = (0, indentationStructure_1.getStructureUsingIndentation)(doc, 'swift', undefined);
        const selection = new vscodeTypes_1.Range(new vscodeTypes_1.Position(3, 0), new vscodeTypes_1.Position(3, 0));
        const result = (0, adjustSelection_1.getAdjustedSelection)(ast, doc, selection);
        (0, vitest_1.expect)(result.adjusted.toString()).toMatchInlineSnapshot(`"[36, 37)"`);
    });
});
//# sourceMappingURL=adjustSelection.spec.js.map