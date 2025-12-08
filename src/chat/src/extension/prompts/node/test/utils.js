"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CHAR_LIMIT = void 0;
exports.loadFile = loadFile;
exports.fixture = fixture;
exports.getSummarizedSnapshotPath = getSummarizedSnapshotPath;
exports.fromFixtureOld = fromFixtureOld;
exports.docPathInFixture = docPathInFixture;
exports.summarizedDocPathInFixture = summarizedDocPathInFixture;
exports.selectionDocPathInFixture = selectionDocPathInFixture;
exports.generateSummarizedDocument = generateSummarizedDocument;
exports.generateSummarizedDocuments = generateSummarizedDocuments;
exports.getExprText = getExprText;
exports.generateSummarizedDocumentAndExtractGoodSelection = generateSummarizedDocumentAndExtractGoodSelection;
const fs = __importStar(require("fs"));
const abstractText_1 = require("../../../../platform/editing/common/abstractText");
const textDocumentSnapshot_1 = require("../../../../platform/editing/common/textDocumentSnapshot");
const indentationStructure_1 = require("../../../../platform/parser/node/indentationStructure");
const parserService_1 = require("../../../../platform/parser/node/parserService");
const textDocument_1 = require("../../../../util/common/test/shims/textDocument");
const path = __importStar(require("../../../../util/vs/base/common/path"));
const uri_1 = require("../../../../util/vs/base/common/uri");
const offsetRange_1 = require("../../../../util/vs/editor/common/core/ranges/offsetRange");
const vscodeTypes_1 = require("../../../../vscodeTypes");
const services_1 = require("../../../test/node/services");
const adjustSelection_1 = require("../inline/adjustSelection");
const summarizeDocument_1 = require("../inline/summarizedDocument/summarizeDocument");
const summarizeDocumentHelpers_1 = require("../inline/summarizedDocument/summarizeDocumentHelpers");
const summarizeDocumentPlayground_1 = require("./summarizeDocumentPlayground");
exports.DEFAULT_CHAR_LIMIT = 9557.333333333334;
async function loadFile(data) {
    if ('fileName' in data) {
        return 'not_supported';
    }
    const contents = (await fs.promises.readFile(data.filePath)).toString();
    return {
        contents,
        filePath: data.filePath,
        languageId: data.languageId,
        formattingOptions: undefined,
    };
}
function fixture(relativePath) {
    const filePath = path.join(__dirname, 'fixtures', relativePath);
    return filePath;
}
function getSummarizedSnapshotPath(data, version) {
    const secondaryExtension = (version ? `${version}.` : '') + 'summarized';
    return addSecondaryExtension(data.filePath, secondaryExtension);
}
function addSecondaryExtension(filePath, extension) {
    const parts = filePath.split('.');
    parts.splice(parts.length - 1, 0, extension);
    return parts.join('.');
}
async function fromFixtureOld(pathWithinFixturesDir, languageId, formattingOptions) {
    const filePath = path.join(__dirname, 'fixtures', pathWithinFixturesDir);
    const contents = (await fs.promises.readFile(filePath)).toString();
    return { filePath: filePath, contents, languageId, formattingOptions };
}
function docPathInFixture(pathWithinFixturesDir, type) {
    const dirname = path.dirname(pathWithinFixturesDir);
    const basename = path.basename(pathWithinFixturesDir);
    const basenameByDots = basename.split('.');
    basenameByDots.splice(basenameByDots.length - 1, 0, type);
    const docBasename = basenameByDots.join('.');
    const docPathWithinFixturesDir = path.join(dirname, docBasename);
    return path.join(__dirname, 'fixtures', docPathWithinFixturesDir);
}
function summarizedDocPathInFixture(pathWithinFixturesDir) {
    return docPathInFixture(pathWithinFixturesDir, 'summarized');
}
function selectionDocPathInFixture(pathWithinFixturesDir) {
    return docPathInFixture(pathWithinFixturesDir, 'selection');
}
async function generateSummarizedDocument(filePromise, selection, charLimit = exports.DEFAULT_CHAR_LIMIT, settings = {}) {
    const file = await filePromise;
    const doc = textDocumentSnapshot_1.TextDocumentSnapshot.create((0, textDocument_1.createTextDocumentData)(uri_1.URI.from({ scheme: 'test', path: '/path/file.txt' }), file.contents, file.languageId).document);
    const accessor = (0, services_1.createExtensionUnitTestingServices)().createTestingAccessor();
    const parserService = accessor.get(parserService_1.IParserService);
    const currentDocAST = parserService.getTreeSitterAST(doc);
    let structure = currentDocAST
        ? await currentDocAST.getStructure()
        : undefined;
    if (!structure) {
        structure = (0, indentationStructure_1.getStructureUsingIndentation)(new abstractText_1.VsCodeTextDocument(doc), doc.languageId, file.formattingOptions);
    }
    const selections = selection ? (0, adjustSelection_1.getAdjustedSelection)(structure, new abstractText_1.VsCodeTextDocument(doc), toSelection(selection)) : undefined;
    const summarizedDoc = (0, summarizeDocumentHelpers_1.summarizeDocumentSync)(charLimit, doc, selection ? toSelection(selection) : undefined, structure, settings);
    const playgroundRunnerData = globalThis.$$playgroundRunner_data;
    if (playgroundRunnerData) {
        function getDoc(text) {
            const file = { contents: text, languageId: doc.languageId };
            const data = (0, textDocument_1.createTextDocumentData)(uri_1.URI.from({ scheme: 'test', path: '/path/file.ts' }), file.contents, file.languageId);
            return data;
        }
        globalThis.playground = new summarizeDocumentPlayground_1.SummarizeDocumentPlayground(summarizedDoc, selection ? toSelection(selection) : new vscodeTypes_1.Range(0, 0, 0, 0), charLimit, (text) => parserService.getTreeSitterAST(getDoc(text).document).getStructure(), (text, charLimit, selection, structure) => (0, summarizeDocumentHelpers_1.summarizeDocumentSync)(charLimit, textDocumentSnapshot_1.TextDocumentSnapshot.create(getDoc(text).document), selection, structure, settings));
        globalThis.summarizedDoc = summarizedDoc;
        const g = globalThis;
        g.$$debugValueEditor_properties = [
            {
                label: `Active Test: "${playgroundRunnerData.currentPath.join(' > ')}"`,
            },
            {
                label: 'Summarized Document',
                expression: getExprText(() => globalThis.playground.getSummarizedText()),
            },
            {
                label: `Document Syntax Tree`,
                expression: getExprText(() => globalThis.playground.getAst()),
            },
            {
                label: 'Input Document + Selection',
                expression: getExprText(() => globalThis.playground.inputDocument),
            },
            {
                label: 'Input Options',
                expression: getExprText(() => globalThis.playground.inputOptions),
            },
        ];
        g.$$debugValueEditor_refresh?.('{}');
    }
    return {
        text: summarizedDoc.text,
        adjustedSelection: selections ? summarizedDoc.projectOffsetRange(selections.adjusted) : new offsetRange_1.OffsetRange(0, 0),
    };
}
async function generateSummarizedDocuments(input, charLimit = exports.DEFAULT_CHAR_LIMIT, settings = {}) {
    const items = [];
    for (const { filePromise, selection } of input) {
        const file = await filePromise;
        const doc = textDocumentSnapshot_1.TextDocumentSnapshot.create((0, textDocument_1.createTextDocumentData)(uri_1.URI.from({ scheme: 'test', path: file.filePath }), file.contents, file.languageId).document);
        const accessor = (0, services_1.createExtensionUnitTestingServices)().createTestingAccessor();
        const parserService = accessor.get(parserService_1.IParserService);
        const currentDocAST = parserService.getTreeSitterAST(doc);
        let structure = currentDocAST
            ? await currentDocAST.getStructure()
            : undefined;
        if (!structure) {
            structure = (0, indentationStructure_1.getStructureUsingIndentation)(new abstractText_1.VsCodeTextDocument(doc), doc.languageId, file.formattingOptions);
        }
        // const selections = selection ? getAdjustedSelection(structure, doc, toSelection(selection)) : undefined;
        items.push({
            document: doc,
            overlayNodeRoot: structure,
            selection: selection && toSelection(selection)
        });
    }
    return (0, summarizeDocument_1.summarizeDocumentsSync)(charLimit, settings, items);
}
function getExprText(arrowFn) {
    const src = arrowFn.toString();
    const parts = src.split('=>');
    const expr = parts[1];
    return expr.trim();
}
async function generateSummarizedDocumentAndExtractGoodSelection(filePromise, selection, charLimit = exports.DEFAULT_CHAR_LIMIT) {
    const result = await generateSummarizedDocument(filePromise, selection, charLimit);
    if (!result) {
        return [undefined, undefined];
    }
    const adjustedSelection = result.adjustedSelection;
    const codeAbove = result.text.substring(0, adjustedSelection.start);
    const adjustedSelectedCode = result.text.substring(adjustedSelection.start, adjustedSelection.endExclusive);
    const codeBelow = result.text.substring(adjustedSelection.endExclusive);
    return [`${codeAbove}__SELECTION_HERE__${codeBelow}`, adjustedSelectedCode];
}
function toSelection(selection) {
    if (selection.length === 2) {
        return new vscodeTypes_1.Selection(selection[0], selection[1], selection[0], selection[1]);
    }
    else {
        return new vscodeTypes_1.Selection(selection[0], selection[1], selection[2], selection[3]);
    }
}
//# sourceMappingURL=utils.js.map