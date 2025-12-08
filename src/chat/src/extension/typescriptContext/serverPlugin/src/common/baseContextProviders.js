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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FunctionLikeContextProvider = exports.TypeOfExpressionRunnable = exports.ImportsRunnable = exports.TypesOfNeighborFilesRunnable = exports.TypeOfLocalsRunnable = exports.SignatureRunnable = exports.FunctionLikeContextRunnable = exports.CompilerOptionsRunnable = void 0;
const typescript_1 = __importDefault(require("./typescript"));
const ts = (0, typescript_1.default)();
const code_1 = require("./code");
const contextProvider_1 = require("./contextProvider");
const protocol_1 = require("./protocol");
const typescripts_1 = __importStar(require("./typescripts"));
class CompilerOptionsRunnable extends contextProvider_1.AbstractContextRunnable {
    static { this.VersionTraitKey = protocol_1.Trait.createContextItemKey(protocol_1.TraitKind.Version); }
    // Traits to collect from the compiler options in the format of [trait kind, trait description, context key, CompilerOptions.enumType (if applicable)]
    static { this.traitsToCollect = [
        [protocol_1.TraitKind.Module, 'The TypeScript module system used in this project is ', protocol_1.Trait.createContextItemKey(protocol_1.TraitKind.Module), ts.ModuleKind],
        [protocol_1.TraitKind.ModuleResolution, 'The TypeScript module resolution strategy used in this project is ', protocol_1.Trait.createContextItemKey(protocol_1.TraitKind.ModuleResolution), ts.ModuleResolutionKind],
        [protocol_1.TraitKind.Target, 'The target version of JavaScript for this project is ', protocol_1.Trait.createContextItemKey(protocol_1.TraitKind.Target), ts.ScriptTarget],
        [protocol_1.TraitKind.Lib, 'Library files that should be included in TypeScript compilation are ', protocol_1.Trait.createContextItemKey(protocol_1.TraitKind.Lib), undefined],
    ]; }
    constructor(session, languageService, context, sourceFile) {
        super(session, languageService, context, 'CompilerOptionsRunnable', contextProvider_1.SnippetLocation.Primary, protocol_1.Priorities.Traits, contextProvider_1.ComputeCost.Low);
        this.sourceFile = sourceFile;
    }
    getActiveSourceFile() {
        return this.sourceFile;
    }
    createRunnableResult(result) {
        const cacheInfo = { emitMode: protocol_1.EmitMode.ClientBased, scope: { kind: protocol_1.CacheScopeKind.File } };
        return result.createRunnableResult(this.id, this.priority, protocol_1.SpeculativeKind.emit, cacheInfo);
    }
    run(result, _token) {
        const compilerOptions = this.getProgram().getCompilerOptions();
        if (!result.addFromKnownItems(CompilerOptionsRunnable.VersionTraitKey)) {
            result.addTrait(protocol_1.TraitKind.Version, 'The TypeScript version used in this project is ', ts.version);
        }
        for (const [traitKind, trait, key, enumType,] of CompilerOptionsRunnable.traitsToCollect) {
            if (result.addFromKnownItems(key)) {
                continue;
            }
            let traitValue = compilerOptions[traitKind];
            if (traitValue) {
                if (typeof traitValue === "number") {
                    const enumName = CompilerOptionsRunnable.getEnumName(enumType, traitValue);
                    if (enumName) {
                        traitValue = enumName;
                    }
                }
                result.addTrait(traitKind, trait, traitValue.toString());
            }
        }
    }
    static getEnumName(enumObj, value) {
        return Object.keys(enumObj).find(key => enumObj[key] === value);
    }
}
exports.CompilerOptionsRunnable = CompilerOptionsRunnable;
class FunctionLikeContextRunnable extends contextProvider_1.AbstractContextRunnable {
    constructor(session, languageService, context, id, declaration, priority, cost) {
        super(session, languageService, context, id, contextProvider_1.SnippetLocation.Primary, priority, cost);
        this.declaration = declaration;
        this.sourceFile = declaration.getSourceFile();
    }
    getActiveSourceFile() {
        return this.sourceFile;
    }
    getCacheScope() {
        const body = this.declaration.body;
        if (body === undefined || !ts.isBlock(body)) {
            return undefined;
        }
        return super.createCacheScope(body, this.sourceFile);
    }
}
exports.FunctionLikeContextRunnable = FunctionLikeContextRunnable;
class SignatureRunnable extends FunctionLikeContextRunnable {
    constructor(session, languageService, context, declaration, priority = protocol_1.Priorities.Locals) {
        super(session, languageService, context, SignatureRunnable.computeId(session, declaration), declaration, priority, contextProvider_1.ComputeCost.Low);
    }
    createRunnableResult(result) {
        const scope = this.getCacheScope();
        const cacheInfo = scope !== undefined ? { emitMode: protocol_1.EmitMode.ClientBased, scope } : undefined;
        const runnableResult = result.createRunnableResult(this.id, this.priority, protocol_1.SpeculativeKind.emit, cacheInfo);
        runnableResult.debugPath = this.getDebugPath();
        return runnableResult;
    }
    run(result, token) {
        const parameters = this.declaration.parameters;
        for (let i = 0; i < parameters.length; i++) {
            token.throwIfCancellationRequested();
            const parameter = this.declaration.parameters[i];
            const type = parameter.type;
            if (type === undefined) {
                continue;
            }
            this.processType(result, type, token);
        }
        const returnType = this.declaration.type;
        if (returnType !== undefined) {
            token.throwIfCancellationRequested();
            this.processType(result, returnType, token);
        }
    }
    processType(_result, type, token) {
        const symbolsToEmit = this.getSymbolsForTypeNode(type);
        if (symbolsToEmit.length === 0) {
            return;
        }
        for (const symbolEmitData of symbolsToEmit) {
            token.throwIfCancellationRequested();
            this.handleSymbol(symbolEmitData.symbol, symbolEmitData.name);
        }
    }
    getDebugPath() {
        if (!this.session.host.isDebugging()) {
            return undefined;
        }
        const { sourceFile, startPos, endPos } = SignatureRunnable.getSourceFileAndPositions(this.declaration);
        const start = ts.getLineAndCharacterOfPosition(sourceFile, startPos);
        const end = ts.getLineAndCharacterOfPosition(sourceFile, endPos);
        return `SignatureRunnable:${sourceFile.fileName}:[${start.line},${start.character},${end.line},${end.character}]`;
    }
    static computeId(session, declaration) {
        const { sourceFile, startPos, endPos } = SignatureRunnable.getSourceFileAndPositions(declaration);
        const hash = session.host.createHash('md5'); // CodeQL [SM04514] The 'md5' algorithm is used to compute a shorter string to represent a symbol in a map. It has no security implications.
        hash.update(sourceFile.fileName);
        hash.update(`[${startPos},${endPos}]`);
        return `SignatureRunnable:${hash.digest('base64')}`;
    }
    static getSourceFileAndPositions(declaration) {
        const startPos = declaration.parameters.pos;
        const endPos = declaration.type?.end ?? declaration.parameters.end;
        const sourceFile = declaration.getSourceFile();
        return { sourceFile, startPos, endPos };
    }
}
exports.SignatureRunnable = SignatureRunnable;
class TypeOfLocalsRunnable extends contextProvider_1.AbstractContextRunnable {
    constructor(session, languageService, context, tokenInfo, excludes, cacheScope, priority = protocol_1.Priorities.Locals) {
        super(session, languageService, context, 'TypeOfLocalsRunnable', contextProvider_1.SnippetLocation.Primary, priority, contextProvider_1.ComputeCost.Medium);
        this.tokenInfo = tokenInfo;
        this.excludes = excludes;
        this.cacheScope = cacheScope;
        this.runnableResult = undefined;
    }
    getActiveSourceFile() {
        return this.tokenInfo.token.getSourceFile();
    }
    createRunnableResult(result) {
        const cacheInfo = this.cacheScope !== undefined ? { emitMode: protocol_1.EmitMode.ClientBasedOnTimeout, scope: this.cacheScope } : undefined;
        this.runnableResult = result.createRunnableResult(this.id, this.priority, protocol_1.SpeculativeKind.emit, cacheInfo);
        return this.runnableResult;
    }
    run(_result, cancellationToken) {
        const token = this.tokenInfo.previous ?? this.tokenInfo.token ?? this.tokenInfo.touching;
        const symbols = this.symbols;
        const typeChecker = symbols.getTypeChecker();
        const inScope = typeChecker.getSymbolsInScope(token, ts.SymbolFlags.BlockScopedVariable);
        if (inScope.length === 0) {
            return;
        }
        const sourceFile = token.getSourceFile();
        // When we try to capture locals outside of a callable (e.g. top level in a source file) we capture the declarations as
        // scope. If we are inside the body of the callable defines the scope.
        let variableDeclarations = this.cacheScope === undefined ? new Set() : undefined;
        // The symbols are block scope variables. We try to find the type of the variable
        // to include it in the context.
        for (const symbol of inScope) {
            cancellationToken.throwIfCancellationRequested();
            if (this.excludes.has(symbol)) {
                continue;
            }
            const declaration = typescripts_1.Symbols.getDeclaration(symbol, ts.SyntaxKind.VariableDeclaration);
            if (declaration === undefined) {
                continue;
            }
            let symbolsToEmit = undefined;
            if (declaration.type !== undefined) {
                symbolsToEmit = this.getSymbolsForTypeNode(declaration.type);
            }
            else {
                const type = typeChecker.getTypeAtLocation(declaration.type ?? declaration);
                if (type !== undefined) {
                    symbolsToEmit = this.getSymbolsToEmitForType(type);
                }
            }
            if (symbolsToEmit === undefined || symbolsToEmit.length === 0) {
                continue;
            }
            for (const { symbol, name } of symbolsToEmit) {
                cancellationToken.throwIfCancellationRequested();
                this.handleSymbol(symbol, name);
            }
            if (variableDeclarations !== undefined) {
                variableDeclarations = this.addScopeNode(variableDeclarations, symbol, ts.SyntaxKind.VariableDeclarationList, sourceFile);
            }
        }
        if (variableDeclarations !== undefined && variableDeclarations.size > 0 && this.runnableResult !== undefined) {
            this.runnableResult.setCacheInfo({ emitMode: protocol_1.EmitMode.ClientBasedOnTimeout, scope: contextProvider_1.CacheScopes.createOutsideCacheScope(variableDeclarations, sourceFile) });
        }
    }
}
exports.TypeOfLocalsRunnable = TypeOfLocalsRunnable;
class TypesOfNeighborFilesRunnable extends contextProvider_1.AbstractContextRunnable {
    static { this.SymbolsToInclude = ts.SymbolFlags.Class | ts.SymbolFlags.Interface | ts.SymbolFlags.TypeAlias | ts.SymbolFlags.Enum | ts.SymbolFlags.Function; }
    constructor(session, languageService, context, tokenInfo, priority = protocol_1.Priorities.NeighborFiles) {
        super(session, languageService, context, 'TypesOfNeighborFilesRunnable', contextProvider_1.SnippetLocation.Secondary, priority, contextProvider_1.ComputeCost.Medium);
        this.tokenInfo = tokenInfo;
    }
    getActiveSourceFile() {
        return this.tokenInfo.token.getSourceFile();
    }
    createRunnableResult(result) {
        const cacheInfo = { emitMode: protocol_1.EmitMode.ClientBased, scope: { kind: protocol_1.CacheScopeKind.NeighborFiles } };
        return result.createRunnableResult(this.id, this.priority, protocol_1.SpeculativeKind.emit, cacheInfo);
    }
    run(result, cancellationToken) {
        const symbols = this.symbols;
        for (const neighborFile of this.context.neighborFiles) {
            cancellationToken.throwIfCancellationRequested();
            if (result.isSecondaryBudgetExhausted()) {
                return;
            }
            const neighborSourceFile = this.getProgram().getSourceFile(neighborFile);
            if (neighborSourceFile === undefined || this.skipSourceFile(neighborSourceFile)) {
                continue;
            }
            const sourceFileSymbol = symbols.getLeafSymbolAtLocation(neighborSourceFile);
            // The neighbor file might have been seen when importing a value module
            if (sourceFileSymbol === undefined) {
                continue;
            }
            if (sourceFileSymbol.exports !== undefined) {
                for (const member of sourceFileSymbol.exports) {
                    cancellationToken.throwIfCancellationRequested();
                    const memberSymbol = member[1];
                    if ((memberSymbol.flags & TypesOfNeighborFilesRunnable.SymbolsToInclude) === 0) {
                        continue;
                    }
                    if (!this.handleSymbol(memberSymbol, member[0], true)) {
                        return;
                    }
                }
            }
        }
    }
}
exports.TypesOfNeighborFilesRunnable = TypesOfNeighborFilesRunnable;
class ImportsRunnable extends contextProvider_1.AbstractContextRunnable {
    static { this.CacheNodes = new Set([
        ts.SyntaxKind.FunctionDeclaration,
        ts.SyntaxKind.ArrowFunction,
        ts.SyntaxKind.FunctionExpression,
        ts.SyntaxKind.Constructor,
        ts.SyntaxKind.MethodDeclaration,
        ts.SyntaxKind.ClassDeclaration,
        ts.SyntaxKind.ModuleDeclaration
    ]); }
    constructor(session, languageService, context, tokenInfo, excludes, priority = protocol_1.Priorities.Imports) {
        super(session, languageService, context, 'ImportsRunnable', contextProvider_1.SnippetLocation.Secondary, priority, contextProvider_1.ComputeCost.Medium);
        this.tokenInfo = tokenInfo;
        this.excludes = excludes;
        this.runnableResult = undefined;
        const scopeNode = this.getCacheScopeNode();
        this.cacheInfo = scopeNode === undefined
            ? undefined
            : { emitMode: protocol_1.EmitMode.ClientBased, scope: this.createCacheScope(scopeNode) };
    }
    getActiveSourceFile() {
        return this.tokenInfo.token.getSourceFile();
    }
    useCachedResult(cached) {
        const cacheInfo = cached.cache;
        if (cacheInfo === undefined) {
            return false;
        }
        if (cacheInfo.emitMode === protocol_1.EmitMode.ClientBased && cached.state === protocol_1.ContextRunnableState.Finished) {
            const scope = cacheInfo.scope;
            if (scope.kind === protocol_1.CacheScopeKind.WithinRange) {
                return true;
            }
            else if (scope.kind === protocol_1.CacheScopeKind.OutsideRange) {
                // If we have a cache info that means we have an within range cache scope.
                // So we can't use the cached result since we need to emit a new scope.
                return this.cacheInfo === undefined;
            }
        }
        return super.useCachedResult(cached);
    }
    createRunnableResult(result) {
        this.runnableResult = result.createRunnableResult(this.id, this.priority, protocol_1.SpeculativeKind.emit, this.cacheInfo);
        return this.runnableResult;
    }
    run(result, cancellationToken) {
        cancellationToken.throwIfCancellationRequested();
        const token = this.tokenInfo.touching ?? this.tokenInfo.token;
        const sourceFile = token.getSourceFile();
        const importBlocks = this.getImportBlocks(sourceFile);
        cancellationToken.throwIfCancellationRequested();
        const importedSymbols = [];
        let outSideRanges = undefined;
        for (const block of importBlocks) {
            for (const stmt of block.imports) {
                cancellationToken.throwIfCancellationRequested();
                if (stmt.importClause === undefined) {
                    continue;
                }
                const importClause = stmt.importClause;
                if (importClause.name !== undefined) {
                    const symbol = this.symbols.getLeafSymbolAtLocation(importClause.name);
                    if (symbol !== undefined && !this.excludes.has(symbol)) {
                        importedSymbols.push({ symbol, name: importClause.name.getText() });
                    }
                }
                else if (importClause.namedBindings !== undefined) {
                    const namedBindings = importClause.namedBindings;
                    if (ts.isNamespaceImport(namedBindings)) {
                        const symbol = this.symbols.getLeafSymbolAtLocation(namedBindings.name);
                        if (symbol !== undefined && !this.excludes.has(symbol)) {
                            importedSymbols.push({ symbol, name: namedBindings.name.getText() });
                        }
                    }
                    else if (ts.isNamedImports(namedBindings)) {
                        for (const element of namedBindings.elements) {
                            const symbol = this.symbols.getLeafSymbolAtLocation(element.name);
                            if (symbol !== undefined && !this.excludes.has(symbol)) {
                                importedSymbols.push({ symbol, name: element.name.getText() });
                            }
                        }
                    }
                }
            }
            if (this.cacheInfo === undefined) {
                if (outSideRanges === undefined) {
                    outSideRanges = [];
                }
                const start = block.before !== undefined ? contextProvider_1.CacheScopes.createRange(block.before, sourceFile).end : contextProvider_1.CacheScopes.createRange(block.imports[0], sourceFile).start;
                const end = block.after !== undefined ? contextProvider_1.CacheScopes.createRange(block.after, sourceFile).start : contextProvider_1.CacheScopes.createRange(block.imports[block.imports.length - 1], sourceFile).end;
                outSideRanges.push({ start, end });
            }
        }
        for (const { symbol, name } of importedSymbols) {
            const flags = symbol.flags;
            if ((flags & (ts.SymbolFlags.Class | ts.SymbolFlags.Interface | ts.SymbolFlags.TypeAlias | ts.SymbolFlags.Enum | ts.SymbolFlags.Alias | ts.SymbolFlags.ValueModule)) === 0) {
                continue;
            }
            if (!this.handleSymbol(symbol, name, true)) {
                break;
            }
        }
        if (this.cacheInfo === undefined && outSideRanges !== undefined && outSideRanges.length > 0) {
            result.setCacheInfo({ emitMode: protocol_1.EmitMode.ClientBased, scope: { kind: protocol_1.CacheScopeKind.OutsideRange, ranges: outSideRanges } });
        }
    }
    getImportBlocks(sourceFile) {
        if (this.cacheInfo !== undefined) {
            const imports = [];
            for (const node of typescripts_1.default.Nodes.getChildren(sourceFile, sourceFile)) {
                if (ts.isImportDeclaration(node)) {
                    imports.push(node);
                }
            }
            return [{ before: undefined, imports, after: undefined }];
        }
        else {
            const result = [];
            let before = undefined;
            let after = undefined;
            let imports = [];
            for (const node of typescripts_1.default.Nodes.getChildren(sourceFile, sourceFile)) {
                if (ts.isImportDeclaration(node)) {
                    imports.push(node);
                }
                else {
                    if (imports.length === 0) {
                        before = node;
                    }
                    else {
                        after = node;
                        result.push({ before, imports, after });
                        before = undefined;
                        after = undefined;
                        imports = [];
                    }
                }
            }
            if (imports.length > 0) {
                result.push({ before, imports, after });
            }
            return result;
        }
    }
    getCacheScopeNode() {
        let current = this.tokenInfo.touching ?? this.tokenInfo.token;
        if (current === undefined || current.kind === ts.SyntaxKind.EndOfFileToken || current.kind === ts.SyntaxKind.Unknown) {
            return undefined;
        }
        let result;
        while (current !== undefined && current.kind !== ts.SyntaxKind.SourceFile) {
            if (ImportsRunnable.CacheNodes.has(current.kind)) {
                result = current;
            }
            current = current.parent;
        }
        return result;
    }
}
exports.ImportsRunnable = ImportsRunnable;
class TypeOfExpressionRunnable extends contextProvider_1.AbstractContextRunnable {
    constructor(session, languageService, context, expression, priority = protocol_1.Priorities.Expression) {
        super(session, languageService, context, 'TypeOfExpressionRunnable', contextProvider_1.SnippetLocation.Primary, priority, contextProvider_1.ComputeCost.Low);
        this.expression = expression;
    }
    getActiveSourceFile() {
        return this.expression.getSourceFile();
    }
    static create(session, languageService, context, tokenInfo, _token) {
        const previous = tokenInfo.previous;
        if (previous === undefined || previous.parent === undefined) {
            return;
        }
        if ((ts.isIdentifier(previous) || previous.kind === ts.SyntaxKind.DotToken) && ts.isPropertyAccessExpression(previous.parent)) {
            const identifier = this.getRightMostIdentifier(previous.parent.expression, 0);
            if (identifier !== undefined) {
                return new TypeOfExpressionRunnable(session, languageService, context, identifier);
            }
        }
        return undefined;
    }
    static getRightMostIdentifier(node, count) {
        if (count === 32) {
            return undefined;
        }
        switch (node.kind) {
            case ts.SyntaxKind.Identifier:
                return node;
            case ts.SyntaxKind.PropertyAccessExpression:
                return this.getRightMostIdentifier(node.name, count + 1);
            case ts.SyntaxKind.ElementAccessExpression:
                return this.getRightMostIdentifier(node.argumentExpression, count + 1);
            case ts.SyntaxKind.CallExpression:
                return this.getRightMostIdentifier(node.expression, count + 1);
            default:
                return undefined;
        }
    }
    createRunnableResult(result) {
        return result.createRunnableResult(this.id, this.priority, protocol_1.SpeculativeKind.ignore);
    }
    run(result, token) {
        const expSymbol = this.symbols.getLeafSymbolAtLocation(this.expression);
        if (expSymbol === undefined) {
            return;
        }
        const typeChecker = this.symbols.getTypeChecker();
        const type = typeChecker.getTypeOfSymbolAtLocation(expSymbol, this.expression);
        const signatures = type.getConstructSignatures().concat(type.getCallSignatures());
        const sourceFile = this.expression.getSourceFile();
        for (const signature of signatures) {
            token.throwIfCancellationRequested();
            const returnType = signature.getReturnType();
            const returnTypeSymbol = returnType.aliasSymbol ?? returnType.getSymbol();
            if (returnTypeSymbol === undefined) {
                continue;
            }
            const snippetBuilder = new code_1.CodeSnippetBuilder(this.context, this.symbols, sourceFile);
            snippetBuilder.addTypeSymbol(returnTypeSymbol, returnTypeSymbol.name);
            result.addSnippet(snippetBuilder, this.location, undefined);
        }
        const typeSymbol = type.getSymbol();
        if (typeSymbol === undefined) {
            return;
        }
        const snippetBuilder = new code_1.CodeSnippetBuilder(this.context, this.symbols, sourceFile);
        snippetBuilder.addTypeSymbol(typeSymbol, typeSymbol.name);
        result.addSnippet(snippetBuilder, this.location, undefined);
    }
}
exports.TypeOfExpressionRunnable = TypeOfExpressionRunnable;
class FunctionLikeContextProvider extends contextProvider_1.ContextProvider {
    constructor(declaration, tokenInfo, computeContext) {
        super();
        this.functionLikeDeclaration = declaration;
        this.tokenInfo = tokenInfo;
        this.computeContext = computeContext;
        this.isCallableProvider = true;
    }
    provide(result, session, languageService, context, token) {
        token.throwIfCancellationRequested();
        result.addPrimary(new SignatureRunnable(session, languageService, context, this.functionLikeDeclaration));
        // If we already have a callable provider then we don't need to compute anything
        // around the cursor location.
        if (!this.computeContext.isFirstCallableProvider(this)) {
            return;
        }
        const excludes = this.getTypeExcludes(languageService, context);
        result.addPrimary(new TypeOfLocalsRunnable(session, languageService, context, this.tokenInfo, excludes, contextProvider_1.CacheScopes.fromDeclaration(this.functionLikeDeclaration)));
        const runnable = TypeOfExpressionRunnable.create(session, languageService, context, this.tokenInfo, token);
        if (runnable !== undefined) {
            result.addPrimary(runnable);
        }
        result.addSecondary(new ImportsRunnable(session, languageService, context, this.tokenInfo, excludes));
        if (context.neighborFiles.length > 0) {
            result.addTertiary(new TypesOfNeighborFilesRunnable(session, languageService, context, this.tokenInfo));
        }
    }
}
exports.FunctionLikeContextProvider = FunctionLikeContextProvider;
//# sourceMappingURL=baseContextProviders.js.map