"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SourceFileContextProvider = exports.GlobalsRunnable = void 0;
const typescript_1 = __importDefault(require("./typescript"));
const ts = (0, typescript_1.default)();
const baseContextProviders_1 = require("./baseContextProviders");
const contextProvider_1 = require("./contextProvider");
const protocol_1 = require("./protocol");
class GlobalsRunnable extends contextProvider_1.AbstractContextRunnable {
    constructor(session, languageService, context, tokenInfo) {
        super(session, languageService, context, 'GlobalsRunnable', contextProvider_1.SnippetLocation.Secondary, protocol_1.Priorities.Globals, contextProvider_1.ComputeCost.Medium);
        this.tokenInfo = tokenInfo;
    }
    getActiveSourceFile() {
        return this.tokenInfo.token.getSourceFile();
    }
    createRunnableResult(result) {
        return result.createRunnableResult(this.id, this.priority, protocol_1.SpeculativeKind.emit, { emitMode: protocol_1.EmitMode.ClientBased, scope: { kind: protocol_1.CacheScopeKind.File } });
    }
    run(_result, token) {
        const symbols = this.symbols;
        const sourceFile = this.tokenInfo.token.getSourceFile();
        const inScope = this.getSymbolsInScope(symbols.getTypeChecker(), sourceFile);
        token.throwIfCancellationRequested();
        // Add functions in scope
        for (const symbol of inScope) {
            token.throwIfCancellationRequested();
            if (!this.handleSymbol(symbol, undefined, true)) {
                break;
            }
        }
    }
    getSymbolsInScope(typeChecker, sourceFile) {
        const result = [];
        const symbols = typeChecker.getSymbolsInScope(sourceFile, ts.SymbolFlags.Function | ts.SymbolFlags.Class | ts.SymbolFlags.Interface | ts.SymbolFlags.TypeAlias | ts.SymbolFlags.ValueModule);
        for (const symbol of symbols) {
            if (this.skipSymbolBasedOnDeclaration(symbol)) {
                continue;
            }
            result.push(this.symbols.getLeafSymbol(symbol));
        }
        return result;
    }
}
exports.GlobalsRunnable = GlobalsRunnable;
class SourceFileContextProvider extends contextProvider_1.ContextProvider {
    constructor(tokenInfo, computeInfo) {
        super();
        this.tokenInfo = tokenInfo;
        this.computeInfo = computeInfo;
        this.isCallableProvider = true;
    }
    provide(result, session, languageService, context, token) {
        token.throwIfCancellationRequested();
        result.addSecondary(new GlobalsRunnable(session, languageService, context, this.tokenInfo));
        if (!this.computeInfo.isFirstCallableProvider(this)) {
            return;
        }
        result.addPrimary(new baseContextProviders_1.TypeOfLocalsRunnable(session, languageService, context, this.tokenInfo, new Set(), undefined));
        const runnable = baseContextProviders_1.TypeOfExpressionRunnable.create(session, languageService, context, this.tokenInfo, token);
        if (runnable !== undefined) {
            result.addPrimary(runnable);
        }
        result.addSecondary(new baseContextProviders_1.ImportsRunnable(session, languageService, context, this.tokenInfo, new Set(), undefined));
        if (context.neighborFiles.length > 0) {
            result.addTertiary(new baseContextProviders_1.TypesOfNeighborFilesRunnable(session, languageService, context, this.tokenInfo));
        }
    }
}
exports.SourceFileContextProvider = SourceFileContextProvider;
//# sourceMappingURL=sourceFileContextProvider.js.map