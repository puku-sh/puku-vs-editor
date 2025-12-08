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
exports.CharacterBudget = exports.TokenBudgetExhaustedError = exports.ContextProvider = exports.ContextRunnableCollector = exports.AbstractContextRunnable = exports.CacheScopes = exports.ComputeCost = exports.ContextResult = exports.RunnableResult = exports.SnippetLocation = exports.SingleLanguageServiceSession = exports.LanguageServerSession = exports.ComputeContextSession = exports.NullLogger = exports.Search = exports.RequestContext = void 0;
const typescript_1 = __importDefault(require("./typescript"));
const ts = (0, typescript_1.default)();
const code_1 = require("./code");
const protocol_1 = require("./protocol");
const types_1 = require("./types");
const typescripts_1 = __importStar(require("./typescripts"));
const utils_1 = require("./utils");
class RequestContext {
    constructor(session, neighborFiles, clientSideRunnableResults, includeDocumentation) {
        this.session = session;
        this.symbols = new Map();
        this.neighborFiles = neighborFiles;
        this.clientSideRunnableResults = clientSideRunnableResults;
        this.clientSideContextItems = new Map();
        for (const rr of clientSideRunnableResults.values()) {
            for (const item of rr.items) {
                this.clientSideContextItems.set(item.key, item);
            }
        }
        this.includeDocumentation = includeDocumentation;
    }
    getSymbols(program) {
        let result = this.symbols.get(program);
        if (result === undefined) {
            result = new typescripts_1.Symbols(program);
            this.symbols.set(program, result);
        }
        return result;
    }
    getPreferredNeighborFiles(program) {
        const result = [];
        for (const file of this.neighborFiles) {
            const sourceFile = program.getSourceFile(file);
            if (sourceFile !== undefined) {
                result.push(sourceFile);
            }
        }
        return result;
    }
    createContextItemReferenceIfManaged(key) {
        const cachedItem = this.clientSideContextItems.get(key);
        return cachedItem !== undefined
            ? protocol_1.ContextItemReference.create(cachedItem.key)
            : undefined;
    }
    clientHasContextItem(key) {
        return this.clientSideContextItems.has(key);
    }
}
exports.RequestContext = RequestContext;
class Search extends types_1.ProgramContext {
    constructor(program, symbols = new typescripts_1.Symbols(program)) {
        super();
        if (program !== symbols.getProgram()) {
            throw new Error('Program and symbols program must match');
        }
        this.program = program;
        this.symbols = symbols;
    }
    getSymbols() {
        return this.symbols;
    }
    getProgram() {
        return this.program;
    }
    getHeritageSymbol(node) {
        let result = this.symbols.getLeafSymbolAtLocation(node);
        if (result === undefined) {
            return undefined;
        }
        if (typescripts_1.Symbols.isAlias(result)) {
            result = this.symbols.getLeafSymbol(result);
        }
        let counter = 0;
        while (typescripts_1.Symbols.isTypeAlias(result) && counter < 10) {
            const declarations = result.declarations;
            if (declarations !== undefined) {
                const start = result;
                for (const declaration of declarations) {
                    if (ts.isTypeAliasDeclaration(declaration)) {
                        const type = declaration.type;
                        if (ts.isTypeReferenceNode(type)) {
                            result = this.symbols.getLeafSymbolAtLocation(type.typeName);
                        }
                    }
                }
                if (start === result) {
                    break;
                }
            }
            counter++;
        }
        return result;
    }
    static getNodeInProgram(program, node) {
        function sameChain(node, other) {
            if (node === undefined || other === undefined) {
                return node === other;
            }
            while (node !== undefined && other !== undefined) {
                if (node.kind !== other.kind || node.pos !== other.pos || node.end !== other.end) {
                    return false;
                }
                node = node.parent;
                other = other.parent;
            }
            return node === undefined && other === undefined;
        }
        const fileName = node.getSourceFile().fileName;
        const other = program.getSourceFile(fileName);
        if (other === undefined) {
            throw new types_1.RecoverableError(`No source file found for ${fileName}`, types_1.RecoverableError.SourceFileNotFound);
        }
        const candidate = typescripts_1.default.getTokenAtPosition(other, node.pos);
        let otherNode = candidate;
        if (otherNode === undefined) {
            throw new types_1.RecoverableError(`No node found for ${fileName}:${node.pos}`, types_1.RecoverableError.NodeNotFound);
        }
        while (otherNode !== undefined) {
            if (node.pos === otherNode.pos && node.end === otherNode.end && node.kind === otherNode.kind && sameChain(node.parent, otherNode.parent)) {
                return otherNode;
            }
            otherNode = otherNode.parent;
        }
        throw new types_1.RecoverableError(`Found node ${candidate.kind} for node ${node.kind} in file ${fileName}:${node.pos}`, types_1.RecoverableError.NodeKindMismatch);
    }
}
exports.Search = Search;
class NullLogger {
    info() {
    }
    msg() {
    }
    startGroup() {
    }
    endGroup() {
    }
}
exports.NullLogger = NullLogger;
class ComputeContextSession {
    constructor(host, supportsCaching) {
        this.host = host;
        this.codeCache = new utils_1.LRUCache(100);
        this.importedByState = new Map();
        this.supportsCaching = supportsCaching;
    }
    getImportedByState(key) {
        let state = this.importedByState.get(key);
        if (state === undefined) {
            state = new typescripts_1.ImportedByState(key);
            this.importedByState.set(key, state);
        }
        return state;
    }
    run(search, context, token) {
        const programsToSearch = this.getPossiblePrograms(search, context);
        for (const program of programsToSearch) {
            const programSearch = search.with(program);
            const result = programSearch.run(context, token);
            if (result !== undefined) {
                return [program, result];
            }
        }
        return [undefined, undefined];
    }
    getPossiblePrograms(search, context) {
        const candidates = [];
        for (const languageService of this.getLanguageServices()) {
            const program = languageService.getProgram();
            if (program === undefined) {
                continue;
            }
            const score = search.score(program, context);
            if (score > 0) {
                candidates.push([score, program]);
            }
        }
        return candidates.sort((a, b) => b[0] - a[0]).map(c => c[1]);
    }
    getCachedCode(symbolOrKey, symbol) {
        if (!this.supportsCaching) {
            return undefined;
        }
        if (typeof symbolOrKey === 'string') {
            return this.codeCache.get(symbolOrKey);
        }
        else {
            const key = typescripts_1.Symbols.createVersionedKey(symbol, this);
            return key === undefined ? undefined : this.codeCache.get(key);
        }
    }
    cacheCode(symbolOrKey, code) {
        if (!this.supportsCaching) {
            return;
        }
        if (typeof symbolOrKey === 'string') {
            this.codeCache.set(symbolOrKey, code);
        }
        else {
            const key = typescripts_1.Symbols.createVersionedKey(symbolOrKey, this);
            if (key !== undefined) {
                this.codeCache.set(key, code);
            }
        }
    }
    enableBlueprintSearch() {
        return false;
    }
}
exports.ComputeContextSession = ComputeContextSession;
class LanguageServerSession extends ComputeContextSession {
    constructor(session, host) {
        super(host, true);
        this.session = session;
        const projectService = typescripts_1.Sessions.getProjectService(this.session);
        this.logger = projectService?.logger ?? new NullLogger();
    }
    logError(error, cmd) {
        this.session.logError(error, cmd);
    }
    getFileAndProject(args) {
        return typescripts_1.Sessions.getFileAndProject(this.session, args);
    }
    getPositionInFile(args, file) {
        return typescripts_1.Sessions.getPositionInFile(this.session, args, file);
    }
    *getLanguageServices(sourceFile) {
        const projectService = typescripts_1.Sessions.getProjectService(this.session);
        if (projectService === undefined) {
            return;
        }
        if (sourceFile === undefined) {
            for (const project of projectService.configuredProjects.values()) {
                const languageService = project.getLanguageService();
                yield languageService;
            }
            for (const project of projectService.inferredProjects) {
                const languageService = project.getLanguageService();
                yield languageService;
            }
            for (const project of projectService.externalProjects) {
                const languageService = project.getLanguageService();
                yield languageService;
            }
        }
        else {
            const file = ts.server.toNormalizedPath(sourceFile.fileName);
            const scriptInfo = projectService.getScriptInfoForNormalizedPath(file);
            yield* scriptInfo ? scriptInfo.containingProjects.map(p => p.getLanguageService()) : [];
        }
    }
    getScriptVersion(sourceFile) {
        const file = ts.server.toNormalizedPath(sourceFile.fileName);
        const projectService = typescripts_1.Sessions.getProjectService(this.session);
        if (projectService === undefined) {
            return undefined;
        }
        const scriptInfo = projectService.getScriptInfoForNormalizedPath(file);
        return scriptInfo?.getLatestVersion();
    }
}
exports.LanguageServerSession = LanguageServerSession;
class SingleLanguageServiceSession extends ComputeContextSession {
    constructor(languageService, host) {
        super(host, false);
        this.languageService = languageService;
        this.logger = new NullLogger();
    }
    logError(_error, _cmd) {
        // Null logger;
    }
    *getLanguageServices(sourceFile) {
        const ls = this.languageService;
        if (ls === undefined) {
            return;
        }
        if (sourceFile === undefined) {
            yield ls;
        }
        else {
            const file = ts.server.toNormalizedPath(sourceFile.fileName);
            const scriptInfo = ls.getProgram()?.getSourceFile(file);
            if (scriptInfo === undefined) {
                return;
            }
            yield ls;
        }
    }
    run(search, context, token) {
        const program = this.languageService.getProgram();
        if (program === undefined) {
            return [undefined, undefined];
        }
        if (search.score(program, context) === 0) {
            return [undefined, undefined];
        }
        const programSearch = search.with(program);
        const result = programSearch.run(context, token);
        if (result !== undefined) {
            return [program, result];
        }
        else {
            return [undefined, undefined];
        }
    }
    getScriptVersion(_sourceFile) {
        return undefined;
    }
}
exports.SingleLanguageServiceSession = SingleLanguageServiceSession;
var SnippetLocation;
(function (SnippetLocation) {
    SnippetLocation[SnippetLocation["Primary"] = 0] = "Primary";
    SnippetLocation[SnippetLocation["Secondary"] = 1] = "Secondary";
})(SnippetLocation || (exports.SnippetLocation = SnippetLocation = {}));
class RunnableResult {
    constructor(id, priority, runnableResultContext, primaryBudget, secondaryBudget, speculativeKind, cache) {
        this.id = id;
        this.priority = priority;
        this.runnableResultContext = runnableResultContext;
        this.primaryBudget = primaryBudget;
        this.secondaryBudget = secondaryBudget;
        this.state = protocol_1.ContextRunnableState.Created;
        this.speculativeKind = speculativeKind;
        this.cache = cache;
        this.items = [];
    }
    isPrimaryBudgetExhausted() {
        if (this.primaryBudget.isExhausted()) {
            this.state = protocol_1.ContextRunnableState.IsFull;
            return true;
        }
        return false;
    }
    isSecondaryBudgetExhausted() {
        return this.secondaryBudget.isExhausted();
    }
    done() {
        if (this.state === protocol_1.ContextRunnableState.Created || this.state === protocol_1.ContextRunnableState.InProgress) {
            this.state = protocol_1.ContextRunnableState.Finished;
        }
    }
    setCacheInfo(cache) {
        this.cache = cache;
    }
    addFromKnownItems(key) {
        this.state = protocol_1.ContextRunnableState.InProgress;
        const reference = this.runnableResultContext.createContextItemReference(key);
        if (reference === undefined) {
            return false;
        }
        this.items.push(reference);
        return true;
    }
    addTrait(traitKind, name, value) {
        this.state = protocol_1.ContextRunnableState.InProgress;
        const trait = protocol_1.Trait.create(traitKind, name, value);
        this.items.push(this.runnableResultContext.manageContextItem(trait));
        this.primaryBudget.spent(protocol_1.Trait.sizeInChars(trait));
    }
    addSnippet(code, location, key, ifRoom = false) {
        const budget = location === SnippetLocation.Primary ? this.primaryBudget : this.secondaryBudget;
        if (code.isEmpty()) {
            return true;
        }
        const snippet = code.snippet(key);
        const size = protocol_1.CodeSnippet.sizeInChars(snippet);
        if (ifRoom && !budget.hasRoom(size)) {
            this.state = protocol_1.ContextRunnableState.IsFull;
            return false;
        }
        this.state = protocol_1.ContextRunnableState.InProgress;
        budget.spent(size);
        this.items.push(this.runnableResultContext.manageContextItem(snippet));
        return true;
    }
    toJson() {
        return {
            kind: protocol_1.ContextRunnableResultKind.ComputedResult,
            id: this.id,
            state: this.state,
            priority: this.priority,
            items: this.items,
            cache: this.cache,
            speculativeKind: this.speculativeKind,
            debugPath: this.debugPath
        };
    }
}
exports.RunnableResult = RunnableResult;
class RunnableResultReference {
    constructor(cached) {
        this.cached = cached;
    }
    get items() {
        const result = [];
        for (const item of this.cached.items) {
            result.push(protocol_1.ContextItemReference.create(item.key));
        }
        return result;
    }
    toJson() {
        return {
            kind: protocol_1.ContextRunnableResultKind.Reference,
            id: this.cached.id,
        };
    }
}
class ContextResult {
    constructor(primaryBudget, secondaryBudget, context) {
        this.runnableResults = [];
        this.primaryBudget = primaryBudget;
        this.secondaryBudget = secondaryBudget;
        this.context = context;
        this.state = protocol_1.ContextRequestResultState.Created;
        this.path = undefined;
        this.timedOut = false;
        this.errors = [];
        this.runnableResults = [];
        this.contextItems = new Map();
    }
    getSession() {
        return this.context.session;
    }
    addPath(path) {
        this.path = path;
    }
    addErrorData(error) {
        this.errors.push(protocol_1.ErrorData.create(error.code, error.message));
    }
    addTimings(totalTime, computeTime) {
        this.timings = protocol_1.Timings.create(totalTime, computeTime);
    }
    setTimedOut(timedOut) {
        this.timedOut = timedOut;
    }
    createRunnableResult(id, priority, speculativeKind, cache) {
        this.state = protocol_1.ContextRequestResultState.InProgress;
        const result = new RunnableResult(id, priority, this, this.primaryBudget, this.secondaryBudget, speculativeKind, cache);
        this.runnableResults.push(result);
        return result;
    }
    addRunnableResultReference(cached) {
        this.state = protocol_1.ContextRequestResultState.InProgress;
        this.runnableResults.push(new RunnableResultReference(cached));
    }
    createContextItemReference(key) {
        const clientSide = this.context.createContextItemReferenceIfManaged(key);
        if (clientSide !== undefined) {
            return clientSide;
        }
        const serverSide = this.contextItems.get(key);
        if (serverSide !== undefined) {
            return protocol_1.ContextItemReference.create(key);
        }
        return undefined;
    }
    manageContextItem(item) {
        if (!protocol_1.ContextItem.hasKey(item)) {
            return item;
        }
        const key = item.key;
        if (this.context.clientHasContextItem(key)) {
            // The item is already known on the client side.
            return protocol_1.ContextItemReference.create(key);
        }
        if (this.contextItems.has(key)) {
            // The item is already known on the server side.
            return protocol_1.ContextItemReference.create(key);
        }
        this.contextItems.set(key, item);
        return protocol_1.ContextItemReference.create(key);
    }
    done() {
        this.state = protocol_1.ContextRequestResultState.Finished;
    }
    items() {
        const seen = new Set();
        const items = [];
        const runnableResults = this.runnableResults.slice().filter(item => item instanceof RunnableResult).sort((a, b) => {
            return a.priority < b.priority ? 1 : a.priority > b.priority ? -1 : 0;
        });
        for (const runnableResult of runnableResults) {
            for (const item of runnableResult.items) {
                if (item.kind === protocol_1.ContextKind.Reference) {
                    if (seen.has(item.key)) {
                        // We have already seen this item, skip it.
                        continue;
                    }
                    seen.add(item.key);
                    const referenced = this.contextItems.get(item.key);
                    if (referenced !== undefined) {
                        const withPriority = Object.assign({}, referenced, { priority: runnableResult.priority });
                        items.push(withPriority);
                    }
                }
                else {
                    const withPriority = Object.assign({}, item, { priority: runnableResult.priority });
                    items.push(withPriority);
                }
            }
        }
        return items;
    }
    toJson() {
        const runnableResults = [];
        for (const runnableResult of this.runnableResults) {
            runnableResults.push(runnableResult.toJson());
        }
        return {
            state: this.state,
            path: this.path,
            timings: this.timings,
            errors: this.errors,
            timedOut: this.timedOut,
            exhausted: this.primaryBudget.isExhausted(),
            runnableResults: runnableResults,
            contextItems: Array.from(this.contextItems.values())
        };
    }
}
exports.ContextResult = ContextResult;
var ComputeCost;
(function (ComputeCost) {
    ComputeCost[ComputeCost["Low"] = 1] = "Low";
    ComputeCost[ComputeCost["Medium"] = 2] = "Medium";
    ComputeCost[ComputeCost["High"] = 3] = "High";
})(ComputeCost || (exports.ComputeCost = ComputeCost = {}));
var CacheScopes;
(function (CacheScopes) {
    function fromDeclaration(declaration) {
        const body = declaration.body;
        if (body === undefined || !ts.isBlock(body)) {
            return undefined;
        }
        return createWithinCacheScope(body, declaration.getSourceFile());
    }
    CacheScopes.fromDeclaration = fromDeclaration;
    function createWithinCacheScope(node, sourceFile) {
        return {
            kind: protocol_1.CacheScopeKind.WithinRange,
            range: createRange(node, sourceFile),
        };
    }
    CacheScopes.createWithinCacheScope = createWithinCacheScope;
    function createOutsideCacheScope(nodes, sourceFile) {
        const ranges = [];
        for (const node of nodes) {
            ranges.push(createRange(node, sourceFile));
        }
        ranges.sort((a, b) => {
            if (a.start.line !== b.start.line) {
                return a.start.line - b.start.line;
            }
            return a.start.character - b.start.character;
        });
        return {
            kind: protocol_1.CacheScopeKind.OutsideRange,
            ranges
        };
    }
    CacheScopes.createOutsideCacheScope = createOutsideCacheScope;
    function createRange(node, sourceFile) {
        let startOffset;
        let endOffset;
        if (isNodeArray(node)) {
            startOffset = node.pos;
            endOffset = node.end;
        }
        else {
            startOffset = node.getStart(sourceFile);
            endOffset = node.getEnd();
            if (sourceFile === undefined) {
                sourceFile = node.getSourceFile();
            }
        }
        const start = ts.getLineAndCharacterOfPosition(sourceFile, startOffset);
        const end = ts.getLineAndCharacterOfPosition(sourceFile, endOffset);
        return { start, end };
    }
    CacheScopes.createRange = createRange;
    function isNodeArray(node) {
        return Array.isArray(node);
    }
})(CacheScopes || (exports.CacheScopes = CacheScopes = {}));
class CacheBasedContextRunnable {
    constructor(cached, priority, cost) {
        this.cached = cached;
        this.id = cached.id;
        this.priority = priority;
        this.cost = cost;
    }
    initialize(result) {
        this.tokenBudget = result.primaryBudget;
        result.addRunnableResultReference(this.cached);
    }
    compute() {
        if (this.tokenBudget === undefined) {
            return;
        }
        // Update the token budget.
        for (const item of this.cached.items) {
            this.tokenBudget.spent(item.sizeInChars ?? 0);
        }
    }
}
var SymbolEmitDataKind;
(function (SymbolEmitDataKind) {
    SymbolEmitDataKind["symbol"] = "symbol";
    SymbolEmitDataKind["typeAlias"] = "typeAlias";
})(SymbolEmitDataKind || (SymbolEmitDataKind = {}));
class AbstractContextRunnable {
    constructor(session, languageService, context, id, location, priority, cost) {
        this.session = session;
        this.languageService = languageService;
        this.program = languageService.getProgram();
        this.context = context;
        this.symbols = context.getSymbols(this.getProgram());
        this.id = id;
        this.location = location;
        this.priority = priority;
        this.cost = cost;
    }
    initialize(result) {
        if (this.result !== undefined) {
            throw new Error('Runnable already initialized');
        }
        this.result = this.createRunnableResult(result);
    }
    useCachedResult(cached) {
        const cacheInfo = cached.cache;
        if (cacheInfo === undefined) {
            return false;
        }
        if (cacheInfo.emitMode === protocol_1.EmitMode.ClientBased) {
            if (cached.state === protocol_1.ContextRunnableState.Finished) {
                return true;
            }
            if (cached.state === protocol_1.ContextRunnableState.IsFull) {
                const kind = cached.cache?.scope.kind;
                if (kind === protocol_1.CacheScopeKind.WithinRange || kind === protocol_1.CacheScopeKind.NeighborFiles || kind === protocol_1.CacheScopeKind.File) {
                    return true;
                }
            }
        }
        return false;
    }
    compute(token) {
        if (this.result === undefined) {
            throw new Error('Runnable not initialized');
        }
        token.throwIfCancellationRequested();
        if (this.result.isPrimaryBudgetExhausted()) {
            return;
        }
        this.run(this.result, token);
        this.result.done();
    }
    getProgram() {
        if (this.program === undefined) {
            throw new types_1.RecoverableError('No program available', types_1.RecoverableError.NoProgram);
        }
        return this.program;
    }
    createCacheScope(node, sourceFile) {
        return CacheScopes.createWithinCacheScope(node, sourceFile);
    }
    addScopeNode(scopeNodes, symbol, kind, sourceFile) {
        const declarations = symbol.getDeclarations();
        if (declarations === undefined) {
            return undefined;
        }
        let scopeNode = undefined;
        let outsideDeclarations = 0;
        for (const declaration of declarations) {
            if (declaration.getSourceFile() !== sourceFile) {
                outsideDeclarations++;
                continue;
            }
            const parent = typescripts_1.default.Nodes.getParentOfKind(declaration, kind);
            if (parent === undefined) {
                return undefined;
            }
            if (scopeNode === undefined) {
                scopeNode = parent;
            }
            else if (scopeNode !== parent) {
                return undefined;
            }
        }
        if (outsideDeclarations < declarations.length) {
            if (scopeNode !== undefined) {
                scopeNodes.add(scopeNode);
            }
            else {
                return undefined;
            }
        }
        return scopeNodes;
    }
    createCacheInfo(emitMode, cacheScope) {
        return cacheScope !== undefined ? { emitMode, scope: cacheScope } : undefined;
    }
    handleSymbol(symbol, name, ifRoom) {
        if (this.result === undefined) {
            return true;
        }
        const symbolsToEmit = this.getEmitDataForSymbol(symbol, name);
        if (symbolsToEmit.length === 0) {
            return true;
        }
        for (const emitData of symbolsToEmit) {
            if (emitData.kind === SymbolEmitDataKind.typeAlias) {
                if (this.skipNode(emitData.node)) {
                    continue;
                }
                const snippetBuilder = new code_1.CodeSnippetBuilder(this.context, this.symbols, this.getActiveSourceFile());
                snippetBuilder.addDeclaration(emitData.node);
                if (ifRoom === undefined || ifRoom === false) {
                    this.result.addSnippet(snippetBuilder, this.location, undefined);
                }
                else {
                    if (!this.result.addSnippet(snippetBuilder, this.location, undefined, ifRoom)) {
                        return false;
                    }
                }
            }
            else if (emitData.kind === SymbolEmitDataKind.symbol) {
                const { symbol, name } = emitData;
                if (this.skipSymbolBasedOnDeclaration(symbol) || typescripts_1.Symbols.isTypeParameter(symbol)) {
                    continue;
                }
                const key = typescripts_1.Symbols.createKey(symbol, this.session.host);
                if (key !== undefined && this.result.addFromKnownItems(key)) {
                    continue;
                }
                const snippetBuilder = new code_1.CodeSnippetBuilder(this.context, this.symbols, this.getActiveSourceFile());
                snippetBuilder.addTypeSymbol(symbol, name);
                if (ifRoom === undefined || ifRoom === false) {
                    this.result.addSnippet(snippetBuilder, this.location, key);
                }
                else {
                    if (!this.result.addSnippet(snippetBuilder, this.location, key, ifRoom)) {
                        return false;
                    }
                }
            }
        }
        return true;
    }
    isNodeArray(node) {
        return Array.isArray(node);
    }
    skipNode(node) {
        return this.skipSourceFile(node.getSourceFile());
    }
    skipSourceFile(sourceFile) {
        if (this.getActiveSourceFile().fileName === sourceFile.fileName) {
            return true;
        }
        const program = this.getProgram();
        return program.isSourceFileDefaultLibrary(sourceFile) || program.isSourceFileFromExternalLibrary(sourceFile);
    }
    skipSymbolBasedOnDeclaration(symbol) {
        const declarations = symbol.getDeclarations();
        if (declarations === undefined || declarations.length === 0) {
            return false;
        }
        for (const declaration of declarations) {
            if (this.skipSourceFile(declaration.getSourceFile())) {
                return true;
            }
        }
        return false;
    }
    getSymbolsForTypeNode(node) {
        const result = [];
        this.doGetSymbolsForTypeNode(result, node);
        return result;
    }
    doGetSymbolsForTypeNode(result, node) {
        if (ts.isTypeReferenceNode(node)) {
            const symbol = this.symbols.getLeafSymbolAtLocation(node.typeName);
            if (symbol !== undefined) {
                result.push({ symbol, name: node.typeName.getText() });
            }
        }
        else if (ts.isUnionTypeNode(node) || ts.isIntersectionTypeNode(node)) {
            for (const type of node.types) {
                this.doGetSymbolsForTypeNode(result, type);
            }
        }
    }
    getSymbolsToEmitForType(type) {
        const result = [];
        this.doGetSymbolsForType(result, type);
        return result;
    }
    doGetSymbolsForType(result, type) {
        const symbol = type.getSymbol();
        if (symbol !== undefined) {
            result.push({ symbol, name: symbol.getName() });
        }
        else if (typescripts_1.Types.isIntersection(type) || typescripts_1.Types.isUnion(type)) {
            for (const item of type.types) {
                this.doGetSymbolsForType(result, item);
            }
        }
    }
    getEmitDataForSymbol(symbol, name) {
        const result = [];
        this.doGetEmitDataForSymbol(result, new Set(), 0, symbol, name);
        return result;
    }
    doGetEmitDataForSymbol(result, seen, level, symbol, name) {
        if (typescripts_1.Symbols.isAlias(symbol)) {
            symbol = this.symbols.getLeafSymbol(symbol);
        }
        if (seen.has(symbol) || level > 2) {
            return;
        }
        seen.add(symbol);
        if (typescripts_1.Symbols.isTypeAlias(symbol)) {
            const declarations = symbol.getDeclarations();
            if (declarations === undefined || declarations.length === 0) {
                return;
            }
            let declaration = undefined;
            for (const decl of declarations) {
                if (ts.isTypeAliasDeclaration(decl)) {
                    declaration = decl;
                    // Multiple type aliases declarations with the same name
                    // and different types are not possible.
                    break;
                }
            }
            if (declaration === undefined) {
                return;
            }
            name = name ?? declaration.name.getText();
            const type = declaration.type;
            if (ts.isTypeLiteralNode(type)) {
                const symbol = this.symbols.getLeafSymbolAtLocation(type);
                if (symbol !== undefined) {
                    if (seen.has(symbol)) {
                        return;
                    }
                    result.push({ kind: SymbolEmitDataKind.symbol, symbol, name });
                }
            }
            else if (ts.isTypeReferenceNode(type)) {
                const symbol = this.symbols.getLeafSymbolAtLocation(type.typeName);
                if (symbol !== undefined) {
                    if (seen.has(symbol)) {
                        return;
                    }
                    this.doGetEmitDataForSymbol(result, seen, level + 1, symbol, name);
                }
            }
            else if (ts.isUnionTypeNode(type) || ts.isIntersectionTypeNode(type)) {
                result.push({ kind: SymbolEmitDataKind.typeAlias, node: declaration });
                if (level >= 2) {
                    return;
                }
                for (const item of type.types) {
                    const symbol = this.symbols.getLeafSymbolAtLocation(item);
                    if (symbol !== undefined) {
                        if (seen.has(symbol)) {
                            continue;
                        }
                        // We can't name type literals on that level and we have included
                        // the type alias itself, so we don't need to emit it again.
                        if (!typescripts_1.Symbols.isTypeLiteral(symbol)) {
                            this.doGetEmitDataForSymbol(result, seen, level + 1, symbol, name);
                        }
                    }
                    else {
                        const symbolData = this.getSymbolsForTypeNode(item);
                        for (const { symbol, name } of symbolData) {
                            if (seen.has(symbol)) {
                                continue;
                            }
                            this.doGetEmitDataForSymbol(result, seen, level + 1, symbol, name);
                        }
                    }
                }
            }
        }
        else {
            result.push({ kind: SymbolEmitDataKind.symbol, symbol, name });
        }
    }
}
exports.AbstractContextRunnable = AbstractContextRunnable;
class ContextRunnableCollector {
    constructor(cachedRunnableResults) {
        this.cachedRunnableResults = cachedRunnableResults;
        this.primary = [];
        this.secondary = [];
        this.tertiary = [];
    }
    addPrimary(runnable) {
        this.primary.push(this.useCachedRunnableIfPossible(runnable));
    }
    addSecondary(runnable) {
        this.secondary.push(this.useCachedRunnableIfPossible(runnable));
    }
    addTertiary(runnable) {
        this.tertiary.push(this.useCachedRunnableIfPossible(runnable));
    }
    *entries() {
        for (const runnable of this.primary) {
            yield runnable;
        }
        for (const runnable of this.secondary) {
            yield runnable;
        }
        for (const runnable of this.tertiary) {
            yield runnable;
        }
    }
    getPrimaryRunnables() {
        return this.primary.sort((a, b) => {
            const result = a.cost - b.cost;
            if (result !== 0) {
                return result;
            }
            return b.priority - a.priority;
        });
    }
    getSecondaryRunnables() {
        return this.secondary.sort((a, b) => {
            const result = a.cost - b.cost;
            if (result !== 0) {
                return result;
            }
            return b.priority - a.priority;
        });
    }
    getTertiaryRunnables() {
        return this.tertiary.sort((a, b) => {
            const result = a.cost - b.cost;
            if (result !== 0) {
                return result;
            }
            return b.priority - a.priority;
        });
    }
    useCachedRunnableIfPossible(runnable) {
        const cached = this.cachedRunnableResults.get(runnable.id);
        if (cached === undefined) {
            return runnable;
        }
        return runnable.useCachedResult(cached) ? new CacheBasedContextRunnable(cached, runnable.priority, runnable.cost) : runnable;
    }
}
exports.ContextRunnableCollector = ContextRunnableCollector;
class ContextProvider {
    constructor() {
    }
}
exports.ContextProvider = ContextProvider;
class TokenBudgetExhaustedError extends Error {
    constructor() {
        super('Budget exhausted');
    }
}
exports.TokenBudgetExhaustedError = TokenBudgetExhaustedError;
class CharacterBudget {
    constructor(budget, lowWaterMark = 256) {
        this.charBudget = budget;
        this.lowWaterMark = lowWaterMark;
        this.itemRejected = false;
    }
    spent(chars) {
        this.charBudget -= chars;
    }
    hasRoom(chars) {
        const result = this.charBudget - this.lowWaterMark >= chars;
        if (!result) {
            this.itemRejected = true;
        }
        return result;
    }
    isExhausted() {
        return this.charBudget <= 0;
    }
    wasItemRejected() {
        return this.itemRejected;
    }
    throwIfExhausted() {
        if (this.charBudget <= 0) {
            throw new TokenBudgetExhaustedError();
        }
    }
    spentAndThrowIfExhausted(chars) {
        this.spent(chars);
        this.throwIfExhausted();
    }
}
exports.CharacterBudget = CharacterBudget;
//# sourceMappingURL=contextProvider.js.map