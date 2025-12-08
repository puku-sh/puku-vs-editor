"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecoverableError = exports.ProgramContext = void 0;
class ProgramContext {
    /**
     * The symbol is skipped if it has no declarations or if one declaration
     * comes from a default or external library.
     */
    getSymbolInfo(symbol) {
        const declarations = symbol.declarations;
        if (declarations === undefined || declarations.length === 0) {
            return { skip: true };
        }
        let primary;
        let skipCount = 0;
        const program = this.getProgram();
        for (const declaration of declarations) {
            const sourceFile = declaration.getSourceFile();
            if (primary === undefined) {
                primary = sourceFile;
            }
            if (program.isSourceFileDefaultLibrary(sourceFile) || program.isSourceFileFromExternalLibrary(sourceFile)) {
                skipCount++;
            }
        }
        return skipCount > 0 ? { skip: true } : { skip: false, primary: primary };
    }
    skipDeclaration(declaration, sourceFile = declaration.getSourceFile()) {
        const program = this.getProgram();
        return program.isSourceFileDefaultLibrary(sourceFile) || program.isSourceFileFromExternalLibrary(sourceFile);
    }
}
exports.ProgramContext = ProgramContext;
class RecoverableError extends Error {
    static { this.SourceFileNotFound = 1; }
    static { this.NodeNotFound = 2; }
    static { this.NodeKindMismatch = 3; }
    static { this.SymbolNotFound = 4; }
    static { this.NoDeclaration = 5; }
    static { this.NoProgram = 6; }
    static { this.NoSourceFile = 7; }
    constructor(message, code) {
        super(message);
        this.code = code;
    }
}
exports.RecoverableError = RecoverableError;
//# sourceMappingURL=types.js.map