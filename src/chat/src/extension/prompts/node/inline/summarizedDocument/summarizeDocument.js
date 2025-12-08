"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RemovableNode = exports.ProjectedDocument = void 0;
exports.summarizeDocumentsSync = summarizeDocumentsSync;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const abstractText_1 = require("../../../../../platform/editing/common/abstractText");
const implementation_1 = require("./implementation");
Object.defineProperty(exports, "RemovableNode", { enumerable: true, get: function () { return implementation_1.RemovableNode; } });
const projectedText_1 = require("./projectedText");
class ProjectedDocument extends projectedText_1.ProjectedText {
    constructor(originalText, edits, languageId) {
        super(originalText, edits);
        this.languageId = languageId;
    }
}
exports.ProjectedDocument = ProjectedDocument;
function summarizeDocumentsSync(charLimit, settings, items) {
    const result = (0, implementation_1.summarizeDocumentsSyncImpl)(charLimit, settings, items.map(i => ({
        document: new abstractText_1.VsCodeTextDocument(i.document),
        selection: i.selection,
        overlayNodeRoot: i.overlayNodeRoot,
    })));
    return result.map(r => {
        const d = new ProjectedDocument(r.originalText, r.edits, r.baseDocument.languageId);
        d.getVisualization = r.getVisualization;
        return d;
    });
}
//# sourceMappingURL=summarizeDocument.js.map