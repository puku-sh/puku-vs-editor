"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.FilePathCodeMarker = void 0;
exports.findAllReferencedFunctionImplementationsInSelection = findAllReferencedFunctionImplementationsInSelection;
exports.findAllReferencedClassDeclarationsInSelection = findAllReferencedClassDeclarationsInSelection;
exports.findAllReferencedTypeDeclarationsInSelection = findAllReferencedTypeDeclarationsInSelection;
exports.asyncComputeWithTimeBudget = asyncComputeWithTimeBudget;
exports.getStructure = getStructure;
const abstractText_1 = require("../../../../platform/editing/common/abstractText");
const languageFeaturesService_1 = require("../../../../platform/languages/common/languageFeaturesService");
const indentationStructure_1 = require("../../../../platform/parser/node/indentationStructure");
const parserService_1 = require("../../../../platform/parser/node/parserService");
const treeSitterLanguages_1 = require("../../../../platform/parser/node/treeSitterLanguages");
/**
 * @param timeoutMs This function makes several async computations, and each gets up to `3 * timeoutMs`. No guarantee is made about the total time.
 */
async function findAllReferencedFunctionImplementationsInSelection(parserService, logService, telemetryService, languageFeaturesService, workspaceService, document, selection, timeoutMs) {
    const currentDocAST = parserService.getTreeSitterAST(document);
    if (!currentDocAST) {
        return [];
    }
    // Parse all function calls in given selection
    const treeSitterOffsetRange = (0, parserService_1.vscodeToTreeSitterOffsetRange)(selection, document);
    const callExprs = await asyncComputeWithTimeBudget(logService, telemetryService, document, timeoutMs, () => currentDocAST.getCallExpressions(treeSitterOffsetRange), []);
    // find implementation or, if not found, definition for a call expression
    async function findImplementation(callExpr) {
        const position = document.positionAt(callExpr.startIndex);
        try {
            const impls = await languageFeaturesService.getImplementations(document.uri, position);
            if (impls.length) {
                return impls;
            }
            return await languageFeaturesService.getDefinitions(document.uri, position);
        }
        catch {
            return [];
        }
    }
    const implementations = await asyncComputeWithTimeBudget(logService, telemetryService, document, timeoutMs * 3, // apply a more generous timeout for language server results
    () => Promise.all(callExprs.map(findImplementation)), []);
    // since language service gives us only links to identifiers, expand to whole implementation/definition using tree-sitter
    const functionImplementations = [];
    for (let i = 0; i < implementations.length; i++) {
        const callExpr = callExprs[i];
        const impl = implementations[i];
        for (const link of impl) {
            const { uri, range } = (0, languageFeaturesService_1.isLocationLink)(link) ? { uri: link.targetUri, range: link.targetRange } : link;
            const textDocument = await workspaceService.openTextDocumentAndSnapshot(uri);
            const treeSitterAST = parserService.getTreeSitterAST(textDocument);
            if (treeSitterAST) {
                const functionDefinitions = await treeSitterAST.getFunctionDefinitions(); // TODO: we should do this once per document, not once per call expression
                const functionDefinition = functionDefinitions.find((fn) => fn.identifier === callExpr.identifier); // FIXME: this's incorrect because it doesn't count for import aliases (e.g., `import { foo as bar } from 'baz'`)
                if (functionDefinition) {
                    const treeSitterRange = (0, parserService_1.vscodeToTreeSitterOffsetRange)(range, textDocument);
                    functionImplementations.push({
                        uri,
                        range,
                        version: textDocument.version,
                        identifier: callExpr.identifier,
                        startIndex: treeSitterRange.startIndex,
                        endIndex: treeSitterRange.endIndex,
                        text: functionDefinition.text,
                    });
                }
            }
        }
    }
    if (functionImplementations.length !== 0) {
        return functionImplementations;
    }
    // For now, just search the current file for all functions
    const allFunctions = await asyncComputeWithTimeBudget(logService, telemetryService, document, timeoutMs, () => currentDocAST.getFunctionDefinitions(), []);
    // Collect all function implementations referenced in the current selection
    const allFunctionImplementations = [];
    for (const fn of allFunctions) {
        for (const callExpr of callExprs) {
            if (fn.identifier === callExpr.identifier) {
                allFunctionImplementations.push(fn);
            }
        }
    }
    // Sort the function positions by start index
    return allFunctionImplementations.sort((a, b) => a.startIndex - b.startIndex);
}
async function findAllReferencedClassDeclarationsInSelection(parserService, logService, telemetryService, languageFeaturesService, workspaceService, document, selection, timeoutMs) {
    const currentDocAST = parserService.getTreeSitterAST(document);
    if (!currentDocAST) {
        return [];
    }
    // Parse all new expressions in active selection
    const treeSitterOffsetRange = (0, parserService_1.vscodeToTreeSitterOffsetRange)(selection, document);
    const matches = await asyncComputeWithTimeBudget(logService, telemetryService, document, timeoutMs, () => currentDocAST.getClassReferences(treeSitterOffsetRange), []);
    const implementations = await asyncComputeWithTimeBudget(logService, telemetryService, document, timeoutMs * 3, // apply a more generous timeout for language server results
    async () => await Promise.all(matches.map(async (match) => {
        try {
            const position = document.positionAt(match.startIndex);
            const impls = await languageFeaturesService.getImplementations(document.uri, position);
            if (impls.length) {
                return impls;
            }
            return await languageFeaturesService.getDefinitions(document.uri, position);
        }
        catch {
            return [];
        }
    })), []);
    const classDeclarations = [];
    for (let i = 0; i < implementations.length; i++) {
        const match = matches[i];
        const impl = implementations[i];
        for (const link of impl) {
            const { uri, range } = (0, languageFeaturesService_1.isLocationLink)(link) ? { uri: link.targetUri, range: link.targetRange } : link;
            const textDocument = await workspaceService.openTextDocumentAndSnapshot(uri);
            const treeSitterAST = parserService.getTreeSitterAST(textDocument);
            if (treeSitterAST) {
                const classDeclaration = (await treeSitterAST.getClassDeclarations()).find((fn) => fn.identifier === match.identifier);
                if (classDeclaration) {
                    const treeSitterRange = (0, parserService_1.vscodeToTreeSitterOffsetRange)(range, textDocument);
                    classDeclarations.push({
                        uri,
                        range,
                        version: textDocument.version,
                        identifier: match.identifier,
                        startIndex: treeSitterRange.startIndex,
                        endIndex: treeSitterRange.endIndex,
                        text: classDeclaration.text,
                    });
                }
            }
        }
    }
    if (classDeclarations.length !== 0) {
        return classDeclarations;
    }
    // For now, just search the current file for all class declarations
    const allClasses = await asyncComputeWithTimeBudget(logService, telemetryService, document, timeoutMs, () => currentDocAST.getClassDeclarations(), []);
    // Collect all class declarations referenced in the current selection
    const allClassDeclarations = [];
    for (const fn of allClasses) {
        for (const match of matches) {
            if (fn.identifier === match.identifier) {
                allClassDeclarations.push(fn);
            }
        }
    }
    // Sort the class declaration positions by start index
    return allClassDeclarations.sort((a, b) => a.startIndex - b.startIndex);
}
async function findAllReferencedTypeDeclarationsInSelection(parserService, logService, telemetryService, _languageFeaturesService, _workspaceService, document, selection, timeoutMs) {
    const currentDocAST = parserService.getTreeSitterAST(document);
    if (!currentDocAST) {
        return [];
    }
    // Parse all type references in active selection
    const treeSitterOffsetRange = (0, parserService_1.vscodeToTreeSitterOffsetRange)(selection, document);
    const matches = await asyncComputeWithTimeBudget(logService, telemetryService, document, timeoutMs, () => currentDocAST.getTypeReferences(treeSitterOffsetRange), []);
    // For now, just search the current file for all type declarations
    const allFunctions = await asyncComputeWithTimeBudget(logService, telemetryService, document, timeoutMs, () => currentDocAST.getTypeDeclarations(), []);
    // Collect all type declarations referenced in the current selection
    const allTypeDeclarations = [];
    for (const fn of allFunctions) {
        for (const match of matches) {
            if (fn.identifier === match.identifier) {
                allTypeDeclarations.push(fn);
            }
        }
    }
    // Sort the type declaration positions by start index
    return allTypeDeclarations.sort((a, b) => a.startIndex - b.startIndex);
}
/**
 * Races the promise with a timeout.
 */
function raceWithTimeout(executor, timeoutMs) {
    if (timeoutMs === 0) {
        // no timeout
        return executor.then(value => ({ type: 'success', value }));
    }
    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => resolve({ type: 'timeout' }), timeoutMs);
        executor
            .then(value => {
            clearTimeout(timeoutId);
            resolve({ type: 'success', value });
        })
            .catch(err => {
            clearTimeout(timeoutId);
            reject(err);
        });
    });
}
/**
 * @returns a promise that resolves to the result of `computation` if the document version is valid, otherwise to `defaultValue`
 */
async function asyncComputeWithTimeBudget(logService, telemetryService, document, timeoutMs, computation, defaultValue) {
    try {
        const functionPositionsResult = await raceWithTimeout(asyncComputeWithValidDocumentVersion(document, computation, defaultValue), timeoutMs);
        if (functionPositionsResult.type === 'success') {
            return functionPositionsResult.value;
        }
        else {
            logService.warn(`Computing async parser based result took longer than ${timeoutMs}ms`);
            return defaultValue;
        }
    }
    catch (err) {
        if (!(err instanceof treeSitterLanguages_1.TreeSitterUnknownLanguageError)) {
            logService.error(err, `Failed to compute async parser based result`);
            telemetryService.sendGHTelemetryException(err, 'Failed to compute async parser based result');
        }
        return defaultValue;
    }
}
/**
 * This function attempts to compute a value based on the provided document, ensuring that the document version remains consistent during the computation.
 * If the document version changes during the computation, it will retry up to 3 times.
 * If the document version continues to change after 3 attempts, it will return a default value.
 */
async function asyncComputeWithValidDocumentVersion(document, computation, defaultValue, attempt = 0) {
    const version = document.version;
    const positions = await computation();
    if (document.version !== version) {
        // the document was changed in the meantime
        if (attempt < 3) {
            return asyncComputeWithValidDocumentVersion(document, computation, defaultValue, attempt + 1);
        }
        // we tried 3 times, but the document keeps changing
        return defaultValue;
    }
    return positions;
}
/**
 * Artificial marker used to identify code blocks inside prompts
 */
class FilePathCodeMarker {
    static forDocument(language, document) {
        return this.forUri(language, document.uri);
    }
    static forUri(language, uri) {
        return `${this.forLanguage(language)}: ${uri.path}`;
    }
    static forLanguage(language) {
        return `${language.lineComment.start} FILEPATH`;
    }
    /**
     * Checks if the given code starts with a file path marker
     */
    static testLine(language, code) {
        const filenameMarker = FilePathCodeMarker.forLanguage(language);
        return code.trimStart().startsWith(filenameMarker);
    }
}
exports.FilePathCodeMarker = FilePathCodeMarker;
async function getStructure(parserService, document, formattingOptions) {
    const currentDocAST = parserService.getTreeSitterAST(document);
    const structure = await currentDocAST?.getStructure();
    if (structure) {
        return structure;
    }
    return (0, indentationStructure_1.getStructureUsingIndentation)(new abstractText_1.VsCodeTextDocument(document), document.languageId, formattingOptions);
}
//# sourceMappingURL=selectionContextHelpers.js.map