"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModuleContextProvider = void 0;
const baseContextProviders_1 = require("./baseContextProviders");
const contextProvider_1 = require("./contextProvider");
class ModuleContextProvider extends contextProvider_1.ContextProvider {
    constructor(declaration, tokenInfo, computeInfo) {
        super();
        this.declaration = declaration;
        this.tokenInfo = tokenInfo;
        this.computeInfo = computeInfo;
        this.isCallableProvider = true;
    }
    provide(result, session, languageService, context, token) {
        token.throwIfCancellationRequested();
        if (!this.computeInfo.isFirstCallableProvider(this)) {
            return;
        }
        const excludes = new Set();
        result.addPrimary(new baseContextProviders_1.TypeOfLocalsRunnable(session, languageService, context, this.tokenInfo, excludes, undefined));
        const runnable = baseContextProviders_1.TypeOfExpressionRunnable.create(session, languageService, context, this.tokenInfo, token);
        if (runnable !== undefined) {
            result.addPrimary(runnable);
        }
        result.addSecondary(new baseContextProviders_1.ImportsRunnable(session, languageService, context, this.tokenInfo, excludes, undefined));
        if (context.neighborFiles.length > 0) {
            result.addTertiary(new baseContextProviders_1.TypesOfNeighborFilesRunnable(session, languageService, context, this.tokenInfo, undefined));
        }
    }
}
exports.ModuleContextProvider = ModuleContextProvider;
//# sourceMappingURL=moduleContextProvider.js.map