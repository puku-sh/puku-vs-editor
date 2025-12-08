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
exports.LSIFLanguageFeaturesService = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const scip = __importStar(require("@c4312/scip"));
const LSIF = __importStar(require("@vscode/lsif-language-service"));
const fs = __importStar(require("fs/promises"));
const strings_1 = require("../../../src/util/vs/base/common/strings");
const uri_1 = require("../../../src/util/vs/base/common/uri");
const vscodeTypes_1 = require("../../../src/vscodeTypes");
const REPO_NAME = 'vscode-copilot';
const liftLSIFRange = (range) => new vscodeTypes_1.Range(range.start.line, range.start.character, range.end.line, range.end.character);
const liftLSIFLocations = (locations) => {
    if (!locations) {
        return [];
    }
    const arr = locations instanceof Array ? locations : [locations];
    return arr.map(l => new vscodeTypes_1.Location(uri_1.URI.parse(l.uri), liftLSIFRange(l.range)));
};
/** Gets whether the SCIP occurence happens at the given posiiton */
const occursAt = (o, position) => {
    const range = occurenceToPosition(o);
    if (position.line < range.start.line || (position.line === range.start.line && position.character < range.start.character)) {
        return false;
    }
    if (position.line > range.end.line || (position.line === range.end.line && position.character >= range.end.character)) {
        return false;
    }
    return true;
};
/** Converts an SCIP occurence to an LSIF range */
const occurenceToPosition = (o) => {
    const [startLine, startChar] = o.range;
    let endLine;
    let endChar;
    if (o.range.length >= 4) {
        [, , endLine, endChar] = o.range;
    }
    else {
        endLine = startLine;
        endChar = o.range[2];
    }
    return { start: { line: startLine, character: startChar }, end: { line: endLine, character: endChar } };
};
class SCIPGraph {
    constructor(index, workspace) {
        this.index = index;
        this.workspaceUriOriginal = workspace.workspaceFolders[0];
        this.workspaceUriLower = workspace.workspaceFolders[0].toString(true).toLowerCase();
    }
    declarations(uri, position) {
        // https://github.com/sourcegraph/scip/blob/0504a347d36dbff48b21f53ccfedb46f3803855e/scip.proto#L501
        return this.findOccurencesOfSymbolAt(uri, position, o => !!(o.symbolRoles & 0x1));
    }
    definitions(uri, position) {
        return this.declarations(uri, position); //  SCIP doesn't really differentiate I think...
    }
    references(uri, position, context) {
        return this.findOccurencesOfSymbolAt(uri, position, () => true);
    }
    findOccurencesOfSymbolAt(uri, position, filter) {
        const toFind = this.getSymbolsAt(uri, position);
        const locations = [];
        for (const doc of this.index.documents) {
            for (const occurence of doc.occurrences) {
                if (occurence.symbolRoles & 0x1 && toFind.has(occurence.symbol)) { // definition
                    toFind.delete(occurence.symbol);
                    locations.push({
                        uri: uri_1.URI.joinPath(this.workspaceUriOriginal, doc.relativePath.replaceAll('\\', '/')).toString(true),
                        range: occurenceToPosition(occurence),
                    });
                }
            }
        }
        return locations;
    }
    getSymbolsAt(uri, position) {
        const doc = this.getDoc(uri);
        if (!doc) {
            return new Set();
        }
        const toFind = new Set();
        for (const occurence of doc.occurrences) {
            if (occursAt(occurence, position)) {
                toFind.add(occurence.symbol);
            }
        }
        return toFind;
    }
    getDoc(uriInWorkspace) {
        uriInWorkspace = uriInWorkspace.toLowerCase().replaceAll('\\', '/');
        if (!uriInWorkspace.startsWith(this.workspaceUriLower)) {
            return undefined;
        }
        uriInWorkspace = uriInWorkspace.slice(this.workspaceUriLower.length);
        if (uriInWorkspace.startsWith('/')) {
            uriInWorkspace = uriInWorkspace.slice(1);
        }
        return this.index.documents.find(d => d.relativePath.replaceAll('\\', '/').toLowerCase() === uriInWorkspace);
    }
}
const makeTranslator = (workspace, indexRoot) => {
    let simulationRootUri = workspace.workspaceFolders[0].toString(true);
    if (simulationRootUri.endsWith('/')) {
        simulationRootUri = simulationRootUri.slice(0, -1);
    }
    const indexPath = uri_1.URI.parse(indexRoot).path;
    const lastIndex = indexPath.lastIndexOf(REPO_NAME);
    if (lastIndex === -1) {
        throw new Error(`Index path ${indexPath} does not contain 'vscode-copilot', please ensure the index is generated in the correct workspace`);
    }
    const subdir = indexPath.slice(lastIndex + REPO_NAME.length + 1);
    const localRootRe = new RegExp(`^file:\\/\\/.*?${(0, strings_1.escapeRegExpCharacters)(subdir.replaceAll('\\', '/'))}`, 'i');
    return {
        fromDatabase: (uri) => uri.replace(localRootRe, simulationRootUri),
        toDatabase: (uri) => uri.startsWith(simulationRootUri) ? uri.replace(simulationRootUri, indexRoot) : uri,
    };
};
/**
 * A language features service powered by an LSIF index. To use this, you need
 * to have generated an LSIF index for your workspace. This can be done in
 * several ways:
 *
 * - Rust: ensure rust-analyzer is installed (rustup component add rust-analyzer)
 *   and run `rust-analyzer lsif ./ > lsif.json` in the workspace root.
 *
 * If you index a new language, please add instructions above.
 */
class LSIFLanguageFeaturesService {
    /**
     * @param workspace The simulation workspace
     * @param indexFilePath Path to an LSIF index file
     */
    constructor(workspace, indexFilePath) {
        this.workspace = workspace;
        this.indexFilePath = indexFilePath;
    }
    _getGraph() {
        if (!this._graph) {
            this._graph = this._load();
        }
        return this._graph;
    }
    async _load() {
        if (this.indexFilePath.endsWith('.scip')) {
            const contents = await fs.readFile(this.indexFilePath);
            const index = scip.deserializeSCIP(contents);
            return new SCIPGraph(index, this.workspace);
        }
        const graph = new LSIF.JsonStore();
        try {
            await graph.load(this.indexFilePath, r => makeTranslator(this.workspace, r));
        }
        catch (e) {
            throw new Error(`Failed to parse LSIF index from ${this.indexFilePath}: ${e}`);
        }
        return graph;
    }
    async getDocumentSymbols(uri) {
        throw new Error('Unimplemented: excercise for the reader');
    }
    async getDefinitions(uri, position) {
        const graph = await this._getGraph();
        return liftLSIFLocations(graph.definitions(uri.toString(true), position));
    }
    async getImplementations(uri, position) {
        const graph = await this._getGraph();
        return liftLSIFLocations(graph.declarations(uri.toString(true), position));
    }
    async getReferences(uri, position) {
        const graph = await this._getGraph();
        return liftLSIFLocations(graph.references(uri.toString(true), position, { includeDeclaration: true }));
    }
    getDiagnostics(_uri) {
        return []; // not part of LSIF
    }
    async getWorkspaceSymbols(query) {
        throw new Error('Unimplemented: excercise for the reader');
        // would have to iterate through all documents, get all symbols that match
    }
}
exports.LSIFLanguageFeaturesService = LSIFLanguageFeaturesService;
//# sourceMappingURL=lsifLanguageFeatureService.js.map