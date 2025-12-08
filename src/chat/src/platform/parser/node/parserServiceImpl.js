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
exports.ParserServiceImpl = void 0;
const worker_1 = require("../../../util/node/worker");
const lazy_1 = require("../../../util/vs/base/common/lazy");
const path = __importStar(require("../../../util/vs/base/common/path"));
const parser = __importStar(require("./parserImpl"));
const treeSitterLanguages_1 = require("./treeSitterLanguages");
const workerPath = path.join(__dirname, 'worker2.js');
class ParserServiceImpl {
    constructor(useWorker) {
        this._parser = new WorkerOrLocal(parser, workerPath, useWorker);
    }
    dispose() {
        this._parser.dispose();
    }
    getTreeSitterAST(textDocument) {
        const wasmLanguage = (0, treeSitterLanguages_1.getWasmLanguage)(textDocument.languageId);
        if (!wasmLanguage) {
            return undefined;
        }
        return this.getTreeSitterASTForWASMLanguage(wasmLanguage, textDocument.getText());
    }
    getTreeSitterASTForWASMLanguage(wasmLanguage, source) {
        const parserProxy = this._parser.proxy;
        return {
            getFunctionBodies: () => parserProxy._getFunctionBodies(wasmLanguage, source),
            getCoarseParentScope: (range) => parserProxy._getCoarseParentScope(wasmLanguage, source, range),
            getFixSelectionOfInterest: (range, maxNumberOfLines) => parserProxy._getFixSelectionOfInterest(wasmLanguage, source, range, maxNumberOfLines),
            getCallExpressions: (selection) => parserProxy._getCallExpressions(wasmLanguage, source, selection),
            getFunctionDefinitions: () => parserProxy._getFunctionDefinitions(wasmLanguage, source),
            getClassReferences: (selection) => parserProxy._getClassReferences(wasmLanguage, source, selection),
            getClassDeclarations: () => parserProxy._getClassDeclarations(wasmLanguage, source),
            getTypeDeclarations: () => parserProxy._getTypeDeclarations(wasmLanguage, source),
            getTypeReferences: (selection) => parserProxy._getTypeReferences(wasmLanguage, source, selection),
            getSymbols: (selection) => parserProxy._getSymbols(wasmLanguage, source, selection),
            getDocumentableNodeIfOnIdentifier: (range) => parserProxy._getDocumentableNodeIfOnIdentifier(wasmLanguage, source, range),
            getTestableNode: (range) => parserProxy._getTestableNode(wasmLanguage, source, range),
            getTestableNodes: () => parserProxy._getTestableNodes(wasmLanguage, source),
            getNodeToExplain: (range) => parserProxy._getNodeToExplain(wasmLanguage, source, range),
            getNodeToDocument: (range) => parserProxy._getNodeToDocument(wasmLanguage, source, range),
            getFineScopes: (selection) => parserProxy._getFineScopes(wasmLanguage, source, selection),
            getStructure: () => parserProxy._getStructure(wasmLanguage, source),
            findLastTest: () => parserProxy._findLastTest(wasmLanguage, source),
            getParseErrorCount: () => parserProxy._getParseErrorCount(wasmLanguage, source),
        };
    }
    getSemanticChunkTree(wasmLanguage, source) {
        return this._parser.proxy._getSemanticChunkTree(wasmLanguage, source);
    }
    getSemanticChunkNames(language, source) {
        return this._parser.proxy._getSemanticChunkNames(language, source);
    }
}
exports.ParserServiceImpl = ParserServiceImpl;
class WorkerOrLocal {
    get proxy() {
        if (this._useWorker) {
            return this._worker.value.proxy;
        }
        return this._local;
    }
    constructor(local, _workerPath, _useWorker) {
        this._workerPath = _workerPath;
        this._useWorker = _useWorker;
        this._local = new Proxy(local, {
            get: (target, prop, receiver) => {
                const originalMethod = target[prop];
                if (typeof originalMethod !== 'function') {
                    return originalMethod;
                }
                return async (...args) => {
                    const result = await originalMethod.apply(target, viaJSON(args));
                    return viaJSON(result);
                };
            },
        });
        this._worker = new lazy_1.Lazy(() => new worker_1.WorkerWithRpcProxy(this._workerPath, { name: 'Parser worker' }));
    }
    dispose() {
        if (this._worker.hasValue) {
            this._worker.value.terminate();
        }
    }
}
function viaJSON(obj) {
    if (typeof obj === 'undefined') {
        return obj;
    }
    return JSON.parse(JSON.stringify(obj));
}
//# sourceMappingURL=parserServiceImpl.js.map