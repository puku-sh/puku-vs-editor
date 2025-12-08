"use strict";
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
exports.loadFile = loadFile;
exports.fixture = fixture;
exports.getAlternativeNotebookSnapshotPath = getAlternativeNotebookSnapshotPath;
exports.docPathInFixture = docPathInFixture;
exports.generateAlternativeContent = generateAlternativeContent;
exports.loadNotebook = loadNotebook;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const fs = __importStar(require("fs"));
const path = __importStar(require("../../../../util/vs/base/common/path"));
const notebookDocument_1 = require("../../../../util/common/test/shims/notebookDocument");
const vscodeTypes_1 = require("../../../../vscodeTypes");
async function loadFile(data) {
    if ('fileName' in data) {
        return 'not_supported';
    }
    const contents = (await fs.promises.readFile(data.filePath)).toString();
    return {
        contents,
        filePath: data.filePath,
        formattingOptions: undefined,
    };
}
function fixture(relativePath) {
    const filePath = path.join(__dirname, 'fixtures', relativePath);
    return filePath;
}
function getAlternativeNotebookSnapshotPath(data, extension) {
    return addSecondaryExtension(data.filePath, [extension]);
}
function addSecondaryExtension(filePath, extensions) {
    return filePath + '.' + extensions.join('.');
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
async function generateAlternativeContent(filePromise, contentProvider) {
    const notebook = await loadNotebook(filePromise);
    const content = contentProvider.getAlternativeDocument(notebook).getText();
    return { content, notebook };
}
async function loadNotebook(filePromise, simulationWorkspace) {
    const file = await filePromise;
    const uri = vscodeTypes_1.Uri.file(file.filePath);
    return file.filePath.endsWith('.ipynb') ? notebookDocument_1.ExtHostNotebookDocumentData.createJupyterNotebook(uri, file.contents, simulationWorkspace).document :
        notebookDocument_1.ExtHostNotebookDocumentData.createGithubIssuesNotebook(uri, file.contents, simulationWorkspace).document;
}
//# sourceMappingURL=utils.js.map