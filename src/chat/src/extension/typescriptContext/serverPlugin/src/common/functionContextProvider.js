"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FunctionContextProvider = void 0;
const baseContextProviders_1 = require("./baseContextProviders");
class FunctionContextProvider extends baseContextProviders_1.FunctionLikeContextProvider {
    constructor(functionDeclaration, tokenInfo, computeContext) {
        super(functionDeclaration, tokenInfo, computeContext);
        this.functionDeclaration = functionDeclaration;
    }
    provide(result, session, languageService, context, token) {
        super.provide(result, session, languageService, context, token);
    }
    getTypeExcludes() {
        return new Set();
    }
}
exports.FunctionContextProvider = FunctionContextProvider;
//# sourceMappingURL=functionContextProvider.js.map