"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeContext = computeContext;
const typescript_1 = __importDefault(require("./typescript"));
const ts = (0, typescript_1.default)();
const baseContextProviders_1 = require("./baseContextProviders");
const classContextProvider_1 = require("./classContextProvider");
const contextProvider_1 = require("./contextProvider");
const functionContextProvider_1 = require("./functionContextProvider");
const methodContextProvider_1 = require("./methodContextProvider");
const moduleContextProvider_1 = require("./moduleContextProvider");
const sourceFileContextProvider_1 = require("./sourceFileContextProvider");
const types_1 = require("./types");
const typescripts_1 = __importDefault(require("./typescripts"));
class ProviderComputeContextImpl {
    constructor() {
        this.firstCallableProvider = undefined;
    }
    update(contextProvider) {
        if (this.firstCallableProvider === undefined && contextProvider.isCallableProvider !== undefined && contextProvider.isCallableProvider === true) {
            this.firstCallableProvider = contextProvider;
        }
        return contextProvider;
    }
    isFirstCallableProvider(contextProvider) {
        return this.firstCallableProvider === contextProvider;
    }
}
class ContextProviders {
    static { this.Factories = new Map([
        [ts.SyntaxKind.SourceFile, (_node, tokenInfo, computeContext) => new sourceFileContextProvider_1.SourceFileContextProvider(tokenInfo, computeContext)],
        [ts.SyntaxKind.FunctionDeclaration, (node, tokenInfo, computeContext) => new functionContextProvider_1.FunctionContextProvider(node, tokenInfo, computeContext)],
        [ts.SyntaxKind.ArrowFunction, (node, tokenInfo, computeContext) => new functionContextProvider_1.FunctionContextProvider(node, tokenInfo, computeContext)],
        [ts.SyntaxKind.FunctionExpression, (node, tokenInfo, computeContext) => new functionContextProvider_1.FunctionContextProvider(node, tokenInfo, computeContext)],
        [ts.SyntaxKind.GetAccessor, (node, tokenInfo, computeContext) => new methodContextProvider_1.AccessorProvider(node, tokenInfo, computeContext)],
        [ts.SyntaxKind.SetAccessor, (node, tokenInfo, computeContext) => new methodContextProvider_1.AccessorProvider(node, tokenInfo, computeContext)],
        [ts.SyntaxKind.ClassDeclaration, classContextProvider_1.ClassContextProvider.create],
        [ts.SyntaxKind.Constructor, (node, tokenInfo, computeContext) => new methodContextProvider_1.ConstructorContextProvider(node, tokenInfo, computeContext)],
        [ts.SyntaxKind.MethodDeclaration, (node, tokenInfo, computeContext) => new methodContextProvider_1.MethodContextProvider(node, tokenInfo, computeContext)],
        [ts.SyntaxKind.ModuleDeclaration, (node, tokenInfo, computeContext) => new moduleContextProvider_1.ModuleContextProvider(node, tokenInfo, computeContext)],
    ]); }
    constructor(tokenInfo) {
        this.tokenInfo = tokenInfo;
        this.computeInfo = new ProviderComputeContextImpl();
    }
    execute(result, session, languageService, token) {
        const collector = this.getContextRunnables(session, languageService, result.context, token);
        result.addPath(typescripts_1.default.StableSyntaxKinds.getPath(this.tokenInfo.touching ?? this.tokenInfo.token));
        for (const runnable of collector.entries()) {
            runnable.initialize(result);
        }
        this.executeRunnables(collector.getPrimaryRunnables(), result, token);
        this.executeRunnables(collector.getSecondaryRunnables(), result, token);
        this.executeRunnables(collector.getTertiaryRunnables(), result, token);
        result.done();
    }
    executeRunnables(runnables, result, token) {
        for (const runnable of runnables) {
            token.throwIfCancellationRequested();
            try {
                runnable.compute(token);
            }
            catch (error) {
                if (error instanceof types_1.RecoverableError) {
                    result.addErrorData(error);
                }
                else {
                    throw error;
                }
            }
        }
    }
    getContextRunnables(session, languageService, context, token) {
        const result = new contextProvider_1.ContextRunnableCollector(context.clientSideRunnableResults);
        result.addPrimary(new baseContextProviders_1.CompilerOptionsRunnable(session, languageService, context, this.tokenInfo.token.getSourceFile()));
        const providers = this.computeProviders();
        for (const provider of providers) {
            provider.provide(result, session, languageService, context, token);
        }
        return result;
    }
    computeProviders() {
        const result = [];
        let token = this.tokenInfo.touching;
        if (token === undefined) {
            if (this.tokenInfo.token === undefined || this.tokenInfo.token.kind === ts.SyntaxKind.EndOfFileToken) {
                token = this.tokenInfo.previous;
            }
            else {
                token = this.tokenInfo.token;
            }
        }
        if (token === undefined || token.kind === ts.SyntaxKind.EndOfFileToken) {
            return result;
        }
        let current = token;
        while (current !== undefined) {
            const factory = ContextProviders.Factories.get(current.kind);
            if (factory !== undefined) {
                const provider = factory(current, this.tokenInfo, this.computeInfo);
                if (provider !== undefined) {
                    result.push(this.computeInfo.update(provider));
                }
            }
            current = current.parent;
        }
        return result;
    }
}
function computeContext(result, session, languageService, document, position, token) {
    const program = languageService.getProgram();
    if (program === undefined) {
        result.addErrorData(new types_1.RecoverableError(`No program found on language service`, types_1.RecoverableError.NoProgram));
        return;
    }
    const sourceFile = program.getSourceFile(document);
    if (sourceFile === undefined) {
        result.addErrorData(new types_1.RecoverableError(`No source file found for document`, types_1.RecoverableError.NoSourceFile));
        return;
    }
    const tokenInfo = typescripts_1.default.getRelevantTokens(sourceFile, position);
    const providers = new ContextProviders(tokenInfo);
    providers.execute(result, session, languageService, token);
}
//# sourceMappingURL=api.js.map