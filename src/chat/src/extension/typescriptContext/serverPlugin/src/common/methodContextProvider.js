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
exports.ConstructorContextProvider = exports.AccessorProvider = exports.MethodContextProvider = void 0;
const typescript_1 = __importDefault(require("./typescript"));
const ts = (0, typescript_1.default)();
const baseContextProviders_1 = require("./baseContextProviders");
const code_1 = require("./code");
const contextProvider_1 = require("./contextProvider");
const protocol_1 = require("./protocol");
const types_1 = require("./types");
const typescripts_1 = __importStar(require("./typescripts"));
class ClassPropertyBlueprintSearch extends contextProvider_1.Search {
    constructor(program, symbols, declaration, stateProvider) {
        super(program, symbols);
        this.declaration = declaration;
        this.stateProvider = stateProvider;
    }
    isSame(other) {
        return this.declaration === other ||
            (this.declaration.getSourceFile().fileName === other.getSourceFile().fileName && this.declaration.pos === other.pos);
    }
    score(program, context) {
        if (program.getSourceFile(this.declaration.getSourceFile().fileName) === undefined) {
            return 0;
        }
        const neighborFiles = context.neighborFiles;
        if (neighborFiles.length === 0) {
            return 1;
        }
        let result = Math.pow(10, neighborFiles.length.toString().length);
        for (const file of neighborFiles) {
            if (program.getSourceFile(file) !== undefined) {
                result += 1;
            }
        }
        return result;
    }
}
class MethodBlueprintSearch extends ClassPropertyBlueprintSearch {
    constructor(program, symbols, declaration, stateProvider) {
        super(program, symbols, declaration, stateProvider);
    }
    static create(program, symbols, declaration, stateProvider) {
        const classDeclaration = declaration.parent;
        if (!ts.isClassDeclaration(classDeclaration)) {
            return undefined;
        }
        const isPrivate = typescripts_1.Declarations.isPrivate(declaration);
        const typesToCheck = [];
        let classToCheck = undefined;
        if (!isPrivate) {
            const symbol = symbols.getLeafSymbolAtLocation(classDeclaration.name !== undefined ? classDeclaration.name : classDeclaration);
            if (symbol === undefined || !typescripts_1.Symbols.isClass(symbol)) {
                return undefined;
            }
            const name = ts.escapeLeadingUnderscores(declaration.name.getText());
            let path = undefined;
            let skip = false;
            for (const [typeSymbol, superTypeSymbol] of symbols.getAllSuperTypesWithPath(symbol)) {
                if (symbol === typeSymbol) {
                    // We start a new path;
                    skip = false;
                    path = [];
                }
                if (skip) {
                    continue;
                }
                path.push(superTypeSymbol);
                const method = superTypeSymbol.members?.get(name);
                if (method !== undefined) {
                    if (typescripts_1.Symbols.isInterface(superTypeSymbol) || typescripts_1.Symbols.isTypeLiteral(superTypeSymbol)) {
                        typesToCheck.push(...path);
                        skip = true;
                    }
                    else if (typescripts_1.Symbols.isClass(superTypeSymbol)) {
                        if (typescripts_1.Symbols.isAbstract(method)) {
                            // If the method is abstract we check in the same class
                            // hierarchy
                            classToCheck = superTypeSymbol;
                            break;
                        }
                        else {
                            // Method is not abstract, so the method overrides another
                            // method. So we search in the same class hierarchy as well.
                            classToCheck = superTypeSymbol;
                            break;
                        }
                    }
                }
            }
        }
        if (isPrivate) {
            const extendsClause = typescripts_1.ClassDeclarations.getExtendsClause(classDeclaration);
            if (extendsClause === undefined || extendsClause.types.length === 0) {
                return undefined;
            }
            else {
                const extendsSymbol = symbols.getLeafSymbolAtLocation(extendsClause.types[0].expression);
                if (extendsSymbol === undefined || !typescripts_1.Symbols.isClass(extendsSymbol)) {
                    return undefined;
                }
                return new PrivateMethodBlueprintSearch(program, symbols, classDeclaration, extendsSymbol, declaration, stateProvider);
            }
        }
        else {
            if (classToCheck !== undefined) {
                return new FindMethodInSubclassSearch(program, symbols, classDeclaration, declaration, classToCheck, stateProvider);
            }
            else if (typesToCheck.length > 0) {
                // the super types we collect contain type literals. Since they can't be referred to by name we
                // can filter them out for the find in hierarchy search. We also filter the symbols that are unnamed.
                const filteredTypesToCheck = typesToCheck.filter((symbol) => {
                    if (typescripts_1.Symbols.isTypeLiteral(symbol)) {
                        return false;
                    }
                    const name = symbol.escapedName;
                    if (name === '__type' || name === '__class') {
                        return false;
                    }
                    return true;
                });
                return new FindMethodInHierarchySearch(program, symbols, classDeclaration, declaration, filteredTypesToCheck, stateProvider);
            }
            else {
                return undefined;
            }
        }
    }
}
class FindInSiblingClassSearch extends ClassPropertyBlueprintSearch {
    constructor(program, symbols, classDeclarationOrSearch, extendsSymbol, declaration, stateProvider) {
        if (classDeclarationOrSearch instanceof FindInSiblingClassSearch) {
            const search = classDeclarationOrSearch;
            const methodDeclaration = contextProvider_1.Search.getNodeInProgram(program, search.declaration);
            super(program, symbols, methodDeclaration, search.stateProvider);
            this.classDeclaration = contextProvider_1.Search.getNodeInProgram(program, search.classDeclaration);
            const declarations = search.extendsSymbol.declarations;
            if (declarations === undefined || declarations.length === 0) {
                throw new Error('No declarations found for extends symbol');
            }
            let extendsSymbol;
            for (const declaration of declarations) {
                if (ts.isClassDeclaration(declaration)) {
                    const heritageClause = typescripts_1.ClassDeclarations.getExtendsClause(declaration);
                    if (heritageClause === undefined || heritageClause.types.length === 0) {
                        throw new Error('No extends clause found');
                    }
                    extendsSymbol = this.symbols.getLeafSymbolAtLocation(heritageClause.types[0].expression);
                    if (extendsSymbol === undefined || !typescripts_1.Symbols.isClass(extendsSymbol)) {
                        throw new Error('No extends symbol found');
                    }
                    break;
                }
            }
            if (extendsSymbol === undefined) {
                throw new Error('No extends symbol found');
            }
            this.extendsSymbol = extendsSymbol;
        }
        else {
            super(program, symbols, declaration, stateProvider);
            this.classDeclaration = classDeclarationOrSearch;
            this.extendsSymbol = extendsSymbol;
        }
    }
    run(context, token) {
        const memberName = this.getMemberName();
        for (const subType of this.symbols.getDirectSubTypes(this.extendsSymbol, context.getPreferredNeighborFiles(this.program), this.stateProvider, token)) {
            token.throwIfCancellationRequested();
            if (subType.members !== undefined) {
                const member = subType.members.get(memberName);
                if (member === undefined) {
                    continue;
                }
                const declarations = member.declarations;
                if (declarations === undefined || declarations.length === 0) {
                    continue;
                }
                for (const declaration of declarations) {
                    if (declaration.kind !== this.declaration.kind) {
                        continue;
                    }
                    const parent = declaration.parent;
                    if (!ts.isClassDeclaration(parent) || parent === this.classDeclaration) {
                        continue;
                    }
                    return parent;
                }
            }
        }
        return undefined;
    }
}
class PrivateMethodBlueprintSearch extends FindInSiblingClassSearch {
    constructor(program, symbols, classDeclarationOrSearch, extendsSymbol, declaration, stateProvider) {
        if (classDeclarationOrSearch instanceof PrivateMethodBlueprintSearch) {
            super(program, symbols, classDeclarationOrSearch);
        }
        else {
            super(program, symbols, classDeclarationOrSearch, extendsSymbol, declaration, stateProvider);
        }
    }
    with(program) {
        if (program === this.program) {
            return this;
        }
        return new PrivateMethodBlueprintSearch(program, new typescripts_1.Symbols(program), this);
    }
    getMemberName() {
        return ts.escapeLeadingUnderscores(this.declaration.name.getText());
    }
}
class FindMethodInSubclassSearch extends MethodBlueprintSearch {
    constructor(program, symbols, classDeclarationOrSearch, declaration, startClass, stateProvider) {
        if (classDeclarationOrSearch instanceof FindMethodInSubclassSearch) {
            const search = classDeclarationOrSearch;
            const declaration = contextProvider_1.Search.getNodeInProgram(program, search.declaration);
            super(program, symbols, declaration, search.stateProvider);
            this.classDeclaration = contextProvider_1.Search.getNodeInProgram(program, search.classDeclaration);
            const startClass = search.startClass;
            const declarations = startClass.declarations;
            if (declarations === undefined || declarations.length === 0) {
                throw new types_1.RecoverableError('No declarations found for start class', types_1.RecoverableError.NoDeclaration);
            }
            let symbol;
            for (const declaration of declarations) {
                if (!ts.isClassDeclaration(declaration)) {
                    continue;
                }
                symbol = this.symbols.getLeafSymbolAtLocation(declaration.name ? declaration.name : declaration);
                if (symbol !== undefined) {
                    break;
                }
            }
            if (symbol === undefined) {
                throw new types_1.RecoverableError('No symbol found for start class', types_1.RecoverableError.SymbolNotFound);
            }
            this.startClass = symbol;
        }
        else {
            super(program, symbols, declaration, stateProvider);
            this.classDeclaration = classDeclarationOrSearch;
            this.startClass = startClass;
        }
    }
    with(program) {
        if (program === this.program) {
            return this;
        }
        return new FindMethodInSubclassSearch(program, new typescripts_1.Symbols(program), this);
    }
    run(context, token) {
        if (!typescripts_1.Symbols.isClass(this.startClass)) {
            return undefined;
        }
        const callableName = ts.escapeLeadingUnderscores(this.declaration.name.getText());
        for (const subType of this.symbols.getAllSubTypes(this.startClass, typescripts_1.Traversal.breadthFirst, context.getPreferredNeighborFiles(this.program), this.stateProvider, token)) {
            token.throwIfCancellationRequested();
            if (subType.members !== undefined) {
                const member = subType.members.get(callableName);
                if (member === undefined) {
                    continue;
                }
                const declarations = member.declarations;
                if (declarations === undefined || declarations.length === 0) {
                    continue;
                }
                for (const declaration of declarations) {
                    if (!ts.isMethodDeclaration(declaration)) {
                        continue;
                    }
                    const parent = declaration.parent;
                    if (!ts.isClassDeclaration(parent) || parent === this.classDeclaration) {
                        continue;
                    }
                    return parent;
                }
            }
        }
        return undefined;
    }
}
class FindMethodInHierarchySearch extends MethodBlueprintSearch {
    constructor(program, symbols, classDeclarationOrSearch, declaration, typesToCheck, stateProvider) {
        if (classDeclarationOrSearch instanceof FindMethodInHierarchySearch) {
            const search = classDeclarationOrSearch;
            const declaration = contextProvider_1.Search.getNodeInProgram(program, search.declaration);
            super(program, symbols, declaration, search.stateProvider);
            this.classDeclaration = contextProvider_1.Search.getNodeInProgram(program, search.classDeclaration);
            const typesToCheck = [];
            for (const symbolToCheck of search.typesToCheck) {
                const declarations = symbolToCheck.declarations;
                if (declarations === undefined || declarations.length === 0) {
                    throw new types_1.RecoverableError('No declarations found for start class', types_1.RecoverableError.NoDeclaration);
                }
                let symbol;
                for (const declaration of declarations) {
                    // todo@dbaeumer We need to check for typedefs as well.
                    if (!ts.isClassDeclaration(declaration) && !ts.isInterfaceDeclaration(declaration)) {
                        continue;
                    }
                    symbol = this.symbols.getLeafSymbolAtLocation(declaration.name ? declaration.name : declaration);
                    if (symbol !== undefined && symbol.flags === symbolToCheck.flags) {
                        break;
                    }
                }
                if (symbol === undefined) {
                    throw new types_1.RecoverableError('No symbol found for start class', types_1.RecoverableError.SymbolNotFound);
                }
                typesToCheck.push(symbol);
            }
            this.typesToCheck = typesToCheck;
        }
        else {
            super(program, symbols, declaration, stateProvider);
            this.classDeclaration = classDeclarationOrSearch;
            this.typesToCheck = typesToCheck;
        }
    }
    with(program) {
        if (program === this.program) {
            return this;
        }
        return new FindMethodInHierarchySearch(program, new typescripts_1.Symbols(program), this);
    }
    run(context, token) {
        const callableName = ts.escapeLeadingUnderscores(this.declaration.name.getText());
        const startSet = new Set(this.typesToCheck);
        const queue = [];
        // To find a good match we first look at the direct sub types of the types to check. If we find a match
        // we use it. If not we add the type to a queue to check later.
        for (const toCheck of this.typesToCheck) {
            token.throwIfCancellationRequested();
            for (const subType of this.symbols.getDirectSubTypes(toCheck, context.getPreferredNeighborFiles(this.program), this.stateProvider, token)) {
                token.throwIfCancellationRequested();
                if (startSet.has(subType)) {
                    continue;
                }
                if (typescripts_1.Symbols.isClass(subType)) {
                    const member = subType.members?.get(callableName);
                    if (member !== undefined && !typescripts_1.Symbols.isAbstract(member)) {
                        const declaration = typescripts_1.ClassDeclarations.fromSymbol(subType);
                        if (declaration === this.classDeclaration) {
                            continue;
                        }
                        if (declaration !== undefined) {
                            return declaration;
                        }
                    }
                }
                queue.push(subType);
            }
        }
        // We have not found any match yet. So we look at all the sub types of the types to check.
        const seen = new Set();
        for (const symbol of queue) {
            token.throwIfCancellationRequested();
            if (seen.has(symbol)) {
                continue;
            }
            for (const subType of this.symbols.getAllSubTypes(symbol, typescripts_1.Traversal.breadthFirst, context.getPreferredNeighborFiles(this.program), this.stateProvider, token)) {
                token.throwIfCancellationRequested();
                if (seen.has(subType)) {
                    continue;
                }
                if (typescripts_1.Symbols.isClass(subType)) {
                    const member = subType.members?.get(callableName);
                    if (member !== undefined && !typescripts_1.Symbols.isAbstract(member)) {
                        const declaration = typescripts_1.ClassDeclarations.fromSymbol(subType);
                        if (declaration === this.classDeclaration) {
                            seen.add(subType);
                            continue;
                        }
                        if (declaration !== undefined) {
                            return declaration;
                        }
                    }
                }
                seen.add(subType);
            }
            seen.add(symbol);
        }
        return undefined;
    }
}
class SimilarPropertyRunnable extends baseContextProviders_1.FunctionLikeContextRunnable {
    constructor(session, languageService, context, declaration, priority = protocol_1.Priorities.Blueprints) {
        super(session, languageService, context, 'SimilarPropertyRunnable', declaration, priority, contextProvider_1.ComputeCost.High);
    }
    createRunnableResult(result) {
        const scope = this.getCacheScope();
        const cacheInfo = scope !== undefined ? { emitMode: protocol_1.EmitMode.ClientBased, scope } : undefined;
        return result.createRunnableResult(this.id, this.priority, protocol_1.SpeculativeKind.emit, cacheInfo);
    }
    run(result, token) {
        const search = this.createSearch(token);
        if (search !== undefined) {
            const [program, candidate] = this.session.run(search, this.context, token);
            if (program !== undefined && candidate !== undefined) {
                const symbol = this.symbols.getLeafSymbolAtLocation(candidate.name ? candidate.name : candidate);
                if (symbol === undefined) {
                    return;
                }
                const sourceFile = this.declaration.getSourceFile();
                const snippetBuilder = new code_1.CodeSnippetBuilder(this.context, this.context.getSymbols(program), sourceFile);
                snippetBuilder.addDeclaration(candidate);
                result.addSnippet(snippetBuilder, this.location, undefined);
            }
        }
    }
}
class SimilarMethodRunnable extends SimilarPropertyRunnable {
    constructor(session, languageService, context, declaration) {
        super(session, languageService, context, declaration);
    }
    createSearch() {
        return MethodBlueprintSearch.create(this.getProgram(), this.symbols, this.declaration, this.session);
    }
}
class ClassPropertyContextProvider extends baseContextProviders_1.FunctionLikeContextProvider {
    constructor(declaration, tokenInfo, computeContext) {
        super(declaration, tokenInfo, computeContext);
        this.declaration = declaration;
        this.isCallableProvider = true;
    }
    getTypeExcludes(languageService, context) {
        const result = new Set();
        const classDeclaration = this.declaration.parent;
        if (ts.isClassDeclaration(classDeclaration) && classDeclaration.heritageClauses !== undefined && classDeclaration.heritageClauses.length > 0) {
            const program = languageService.getProgram();
            if (program !== undefined) {
                const symbols = context.getSymbols(program);
                for (const heritageClause of classDeclaration.heritageClauses) {
                    if (heritageClause.token !== ts.SyntaxKind.ExtendsKeyword) {
                        continue;
                    }
                    for (const type of heritageClause.types) {
                        const symbol = symbols.getLeafSymbolAtLocation(type.expression);
                        if (symbol !== undefined && typescripts_1.Symbols.isClass(symbol)) {
                            return result.add(symbol);
                        }
                    }
                }
            }
        }
        return result;
    }
}
class PropertiesTypeRunnable extends contextProvider_1.AbstractContextRunnable {
    constructor(session, languageService, context, declaration, priority = protocol_1.Priorities.Properties) {
        super(session, languageService, context, 'PropertiesTypeRunnable', contextProvider_1.SnippetLocation.Secondary, priority, contextProvider_1.ComputeCost.Medium);
        this.declaration = declaration;
    }
    getActiveSourceFile() {
        return this.declaration.getSourceFile();
    }
    createRunnableResult(result) {
        const cacheInfo = { emitMode: protocol_1.EmitMode.ClientBased, scope: this.createCacheScope(this.declaration) };
        return result.createRunnableResult(this.id, this.priority, protocol_1.SpeculativeKind.emit, cacheInfo);
    }
    run(result, token) {
        // We could consider object literals here as well. However they don't usually have a this
        // and all things a public in an literal. So we skip them for now.
        const containerDeclaration = this.declaration.parent;
        if (!ts.isClassDeclaration(containerDeclaration)) {
            return;
        }
        const program = this.getProgram();
        const symbols = this.context.getSymbols(program);
        const containerSymbol = symbols.getLeafSymbolAtLocation(containerDeclaration.name ? containerDeclaration.name : containerDeclaration);
        if (containerSymbol === undefined || !typescripts_1.Symbols.isClass(containerSymbol)) {
            return;
        }
        if (containerSymbol.members !== undefined) {
            for (const member of containerSymbol.members.values()) {
                token.throwIfCancellationRequested();
                if (!this.handleMember(result, member, symbols, ts.ModifierFlags.Private | ts.ModifierFlags.Protected)) {
                    return;
                }
            }
        }
        for (const type of symbols.getAllSuperClasses(containerSymbol)) {
            token.throwIfCancellationRequested();
            if (type.members === undefined) {
                continue;
            }
            for (const member of type.members.values()) {
                token.throwIfCancellationRequested();
                if (!this.handleMember(result, member, symbols, ts.ModifierFlags.Public | ts.ModifierFlags.Protected)) {
                    return;
                }
            }
        }
    }
    handleMember(_result, symbol, symbols, flags) {
        if (!typescripts_1.Symbols.hasModifierFlags(symbol, flags)) {
            return true;
        }
        let continueResult = true;
        for (const [typeSymbol, name] of this.getEmitMemberData(symbol, symbols)) {
            if (typeSymbol === undefined) {
                continue;
            }
            continueResult = continueResult && this.handleSymbol(typeSymbol, name, true);
            if (!continueResult) {
                break;
            }
        }
        return continueResult;
    }
    static { this.NoEmitData = Object.freeze([undefined, undefined]); }
    *getEmitMemberData(symbol, symbols) {
        if (typescripts_1.Symbols.isProperty(symbol)) {
            const type = symbols.getTypeChecker().getTypeOfSymbol(symbol);
            let typeSymbol = type.symbol;
            if (typeSymbol === undefined) {
                return;
            }
            typeSymbol = symbols.getLeafSymbol(typeSymbol);
            let name = undefined;
            const declaration = typescripts_1.Symbols.getDeclaration(symbol, ts.SyntaxKind.PropertyDeclaration);
            if (declaration !== undefined) {
                if (declaration.type !== undefined) {
                    name = typescripts_1.default.Nodes.getTypeName(declaration.type);
                }
            }
            yield [typeSymbol, name];
            return;
        }
        else if (typescripts_1.Symbols.isMethod(symbol)) {
            const type = symbols.getTypeChecker().getTypeOfSymbol(symbol);
            const signatures = type.getCallSignatures();
            if (signatures.length === 0) {
                return;
            }
            for (const signature of signatures) {
                let typeSymbol = signature.getReturnType().symbol;
                if (typeSymbol === undefined) {
                    yield PropertiesTypeRunnable.NoEmitData;
                }
                typeSymbol = symbols.getLeafSymbol(typeSymbol);
                let name = undefined;
                const declaration = signature.getDeclaration();
                if (declaration !== undefined) {
                    if (declaration.type !== undefined) {
                        name = typescripts_1.default.Nodes.getTypeName(declaration.type);
                    }
                }
                yield [typeSymbol, name];
            }
        }
        return;
    }
}
class MethodContextProvider extends ClassPropertyContextProvider {
    constructor(declaration, tokenInfo, computeContext) {
        super(declaration, tokenInfo, computeContext);
    }
    provide(result, session, languageService, context, token) {
        if (session.enableBlueprintSearch()) {
            result.addPrimary(new SimilarMethodRunnable(session, languageService, context, this.declaration));
        }
        super.provide(result, session, languageService, context, token);
        result.addSecondary(new PropertiesTypeRunnable(session, languageService, context, this.declaration));
    }
}
exports.MethodContextProvider = MethodContextProvider;
class AccessorProvider extends ClassPropertyContextProvider {
    constructor(declaration, tokenInfo, computeContext) {
        super(declaration, tokenInfo, computeContext);
    }
    provide(result, session, languageService, context, token) {
        super.provide(result, session, languageService, context, token);
        result.addSecondary(new PropertiesTypeRunnable(session, languageService, context, this.declaration));
    }
}
exports.AccessorProvider = AccessorProvider;
class ConstructorBlueprintSearch extends FindInSiblingClassSearch {
    constructor(program, symbols, classDeclarationOrSearch, extendsSymbol, declaration, stateProvider) {
        if (classDeclarationOrSearch instanceof ConstructorBlueprintSearch) {
            super(program, symbols, classDeclarationOrSearch);
        }
        else {
            super(program, symbols, classDeclarationOrSearch, extendsSymbol, declaration, stateProvider);
        }
    }
    with(program) {
        if (program === this.program) {
            return this;
        }
        return new ConstructorBlueprintSearch(program, new typescripts_1.Symbols(program), this);
    }
    getMemberName() {
        return ts.InternalSymbolName.Constructor;
    }
}
class SimilarConstructorRunnable extends SimilarPropertyRunnable {
    constructor(session, languageService, context, declaration) {
        super(session, languageService, context, declaration);
    }
    createSearch() {
        const classDeclaration = this.declaration.parent;
        if (!ts.isClassDeclaration(classDeclaration)) {
            return undefined;
        }
        const extendsClause = typescripts_1.ClassDeclarations.getExtendsClause(classDeclaration);
        if (extendsClause === undefined || extendsClause.types.length === 0) {
            return undefined;
        }
        else {
            const extendsSymbol = this.symbols.getLeafSymbolAtLocation(extendsClause.types[0].expression);
            if (extendsSymbol === undefined || !typescripts_1.Symbols.isClass(extendsSymbol)) {
                return undefined;
            }
            return new ConstructorBlueprintSearch(this.getProgram(), this.symbols, classDeclaration, extendsSymbol, this.declaration, this.session);
        }
    }
}
class ConstructorContextProvider extends ClassPropertyContextProvider {
    constructor(declaration, tokenInfo, computeContext) {
        super(declaration, tokenInfo, computeContext);
    }
    provide(result, session, languageService, context, token) {
        if (session.enableBlueprintSearch()) {
            result.addPrimary(new SimilarConstructorRunnable(session, languageService, context, this.declaration));
        }
        super.provide(result, session, languageService, context, token);
    }
}
exports.ConstructorContextProvider = ConstructorContextProvider;
//# sourceMappingURL=methodContextProvider.js.map