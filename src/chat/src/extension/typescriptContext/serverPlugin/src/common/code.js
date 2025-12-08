"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeSnippetBuilder = void 0;
const typescript_1 = __importDefault(require("./typescript"));
const ts = (0, typescript_1.default)();
const protocol_1 = require("./protocol");
const types_1 = require("./types");
const typescripts_1 = require("./typescripts");
var Nodes;
(function (Nodes) {
    function getLines(node, includeJSDocComment, sourceFile) {
        sourceFile ??= node.getSourceFile();
        const textStartPosition = node.getStart(sourceFile, includeJSDocComment);
        const startRange = sourceFile.getLineAndCharacterOfPosition(textStartPosition);
        const text = sourceFile.text.substring(textStartPosition, node.getEnd());
        const lines = text.split(/\r?\n/g);
        // We have an indentation on the start line
        if (startRange.character > 0) {
            const lineStartPosition = sourceFile.getPositionOfLineAndCharacter(startRange.line, 0);
            const indent = sourceFile.text.substring(lineStartPosition, textStartPosition);
            stripIndent(lines, indent);
        }
        trimLines(lines);
        return lines;
    }
    Nodes.getLines = getLines;
    function getDocumentation(node) {
        const fullText = node.getFullText();
        const ranges = ts.getLeadingCommentRanges(fullText, 0);
        if (ranges !== undefined && ranges.length > 0) {
            const start = ranges.at(-1).pos;
            const end = ranges.at(-1).end;
            const text = fullText.substring(start, end).trim();
            const lines = text.split(/\r?\n/);
            trimLines(lines);
            if (lines.length > 1) {
                const line = lines[1];
                const match = line.match(/^\s+/);
                if (match !== null) {
                    stripIndent(lines, match[0]);
                }
            }
            return lines;
        }
        return undefined;
    }
    Nodes.getDocumentation = getDocumentation;
    function stripIndent(lines, indent, start = 1) {
        let allHaveIndent = true;
        for (let index = start; index < lines.length; index++) {
            if (!lines[index].startsWith(indent)) {
                allHaveIndent = false;
                break;
            }
        }
        if (allHaveIndent) {
            for (let index = start; index < lines.length; index++) {
                lines[index] = lines[index].substring(indent.length);
            }
        }
    }
    function trimLines(lines) {
        while (lines.length > 0 && lines[0].trim() === '') {
            lines.shift();
        }
        while (lines.length > 0 && lines.at(-1).trim() === '') {
            lines.pop();
        }
    }
})(Nodes || (Nodes = {}));
class AbstractEmitter {
    constructor(context, source, indent = 0) {
        this.context = context;
        this.indent = indent;
        this.source = source.fileName;
        this.lines = [];
        this.additionalSources = new Set();
    }
    makeKey(symbols) {
        if (Array.isArray(symbols)) {
            if (symbols.length === 0) {
                return undefined;
            }
            let keys = [];
            for (const symbol of symbols) {
                const key = typescripts_1.Symbols.createVersionedKey(symbol, this.context.session);
                if (key !== undefined) {
                    keys.push(key);
                }
                else {
                    keys = undefined;
                    break;
                }
            }
            return keys === undefined ? undefined : keys.join(';');
        }
        else {
            return typescripts_1.Symbols.createVersionedKey(symbols, this.context.session);
        }
    }
    getLines() {
        return this.lines;
    }
    getAdditionalSources() {
        this.additionalSources.delete(this.source);
        return this.additionalSources;
    }
    increaseIndent() {
        this.indent++;
    }
    decreaseIndent() {
        this.indent--;
    }
    addLine(line) {
        if (this.indent === 0) {
            this.lines.push(line);
        }
        else {
            this.lines.push('\t'.repeat(this.indent) + line);
        }
    }
    addLines(lines) {
        for (const line of lines) {
            this.addLine(line);
        }
    }
    addConstructorDeclaration(declaration) {
        this.addDocumentation(declaration);
        const elements = [];
        if (declaration.modifiers !== undefined) {
            elements.push(declaration.modifiers.map(m => m.getText()).join(' '));
            elements.push(' ');
        }
        elements.push('constructor');
        elements.push('(');
        elements.push(this.getParameters(declaration.parameters));
        elements.push(');');
        this.addLine(elements.join(''));
    }
    addPropertyDeclaration(declaration) {
        this.addLines(Nodes.getLines(declaration, this.context.includeDocumentation));
    }
    addMethodDeclaration(declaration) {
        this.addDocumentation(declaration);
        const elements = [];
        if (declaration.modifiers !== undefined) {
            elements.push(declaration.modifiers.map(m => m.getText()).join(' '));
            elements.push(' ');
        }
        elements.push(declaration.name.getText());
        if (declaration.typeParameters !== undefined) {
            elements.push('<');
            elements.push(declaration.typeParameters.map(p => p.getText()).join(', '));
            elements.push('>');
        }
        elements.push('(');
        if (declaration.parameters !== undefined) {
            elements.push(declaration.parameters.map(p => p.getText()).join(', '));
        }
        elements.push(')');
        if (declaration.type !== undefined) {
            elements.push(': ');
            elements.push(declaration.type.getText());
        }
        elements.push(';');
        this.addLine(elements.join(''));
    }
    addCallSignatureDeclaration(declaration) {
        this.addDocumentation(declaration);
        const elements = [];
        if (declaration.typeParameters !== undefined) {
            elements.push('<');
            elements.push(declaration.typeParameters.map(p => p.getText()).join(', '));
            elements.push('>');
        }
        elements.push('(');
        if (declaration.parameters !== undefined) {
            elements.push(declaration.parameters.map(p => p.getText()).join(', '));
        }
        elements.push(')');
        if (declaration.type !== undefined) {
            elements.push(': ');
            elements.push(declaration.type.getText());
        }
        elements.push(';');
        this.addLine(elements.join(''));
    }
    addGetAccessorDeclaration(declaration) {
        this.addAccessorDeclaration(declaration, 'get');
    }
    addSetAccessorDeclaration(declaration) {
        this.addAccessorDeclaration(declaration, 'set');
    }
    addAccessorDeclaration(declaration, prefix) {
        this.addDocumentation(declaration);
        const elements = [];
        if (declaration.modifiers !== undefined) {
            elements.push(declaration.modifiers.map(m => m.getText()).join(' '));
            elements.push(' ');
        }
        elements.push(`${prefix} `);
        elements.push(declaration.name.getText());
        if (declaration.type !== undefined) {
            elements.push(': ');
            elements.push(declaration.type.getText());
        }
        elements.push(';');
        this.addLine(elements.join(''));
    }
    addFunctionDeclaration(declaration, name, ensureModifier) {
        name ??= declaration.name?.getText() ?? '';
        this.addDocumentation(declaration);
        const elements = [];
        elements.push(this.getModifiers(declaration.modifiers, ensureModifier));
        elements.push(' function ');
        elements.push(name);
        elements.push(this.getTypeParameters(declaration.typeParameters));
        elements.push('(');
        elements.push(this.getParameters(declaration.parameters));
        elements.push(')');
        elements.push(this.getReturnTypes(declaration));
        elements.push(';');
        this.addLine(elements.join(''));
    }
    addDocumentation(declaration) {
        if (!this.context.includeDocumentation) {
            return;
        }
        const documentation = Nodes.getDocumentation(declaration);
        if (documentation !== undefined) {
            this.addLines(documentation);
        }
    }
    getModifiers(modifiers, prefix) {
        if (modifiers === undefined) {
            return '';
        }
        const result = [];
        if (prefix !== undefined) {
            result.push(prefix);
        }
        for (const modifier of modifiers) {
            if (modifier.kind === ts.SyntaxKind.AsyncKeyword || modifier.kind === ts.SyntaxKind.DeclareKeyword || modifier.kind === ts.SyntaxKind.ExportKeyword) {
                continue;
            }
            result.push(modifier.getText());
        }
        return result.join(' ');
    }
    getTypeParameters(typeParameters) {
        if (typeParameters === undefined) {
            return '';
        }
        const result = [];
        result.push('<');
        result.push(typeParameters.map(p => p.getText()).join(', '));
        result.push('>');
        return result.join('');
    }
    getParameters(parameters) {
        if (parameters === undefined) {
            return '';
        }
        return parameters.map(p => p.getText()).join(', ');
    }
    getReturnTypes(declaration) {
        if (declaration.type === undefined) {
            return '';
        }
        return `: ${declaration.type.getText()}`;
    }
}
class TypeEmitter extends AbstractEmitter {
    constructor(context, source, type, name) {
        super(context, source);
        this.type = type;
        this.name = name;
        this.seen = new Set();
    }
    processMembers(members) {
        for (const [_name, member] of members) {
            if (!this.seen.has(_name)) {
                this.seen.add(_name);
                this.processMember(member);
            }
        }
    }
    processMember(member) {
        const declarations = member.declarations;
        if (declarations === undefined) {
            return;
        }
        if (typescripts_1.Symbols.isProperty(member)) {
            const declaration = declarations[0];
            if (ts.isPropertyDeclaration(declaration) || ts.isPropertySignature(declaration)) {
                this.addPropertyDeclaration(declaration);
            }
        }
        else if (typescripts_1.Symbols.isMethod(member)) {
            for (const declaration of declarations) {
                if (ts.isMethodDeclaration(declaration) || ts.isMethodSignature(declaration)) {
                    this.addMethodDeclaration(declaration);
                }
            }
        }
        else if (typescripts_1.Symbols.isSetAccessor(member) || typescripts_1.Symbols.isGetAccessor(member)) {
            for (const declaration of declarations) {
                if (ts.isGetAccessorDeclaration(declaration)) {
                    this.addGetAccessorDeclaration(declaration);
                }
                else if (ts.isSetAccessorDeclaration(declaration)) {
                    this.addSetAccessorDeclaration(declaration);
                }
            }
        }
        else if (typescripts_1.Symbols.isSignature(member)) {
            for (const declaration of declarations) {
                if (ts.isCallSignatureDeclaration(declaration)) {
                    this.addCallSignatureDeclaration(declaration);
                }
            }
        }
        else if (typescripts_1.Symbols.isConstructor(member)) {
            for (const declaration of declarations) {
                if (ts.isConstructorDeclaration(declaration)) {
                    this.addConstructorDeclaration(declaration);
                }
            }
        }
    }
    getTypeParameters() {
        const declarations = this.type.declarations;
        if (declarations === undefined || declarations.length === 0) {
            return '';
        }
        const declaration = declarations[0];
        if (ts.isClassDeclaration(declaration) || ts.isInterfaceDeclaration(declaration) || ts.isTypeAliasDeclaration(declaration)) {
            if (declaration.typeParameters !== undefined) {
                return super.getTypeParameters(declaration.typeParameters);
            }
        }
        return '';
    }
}
class ClassEmitter extends TypeEmitter {
    constructor(context, symbols, source, clazz, name, includeSuperClasses, includePrivates) {
        super(context, source, clazz, name);
        this.includePrivates = includePrivates;
        this.key = undefined;
        if (includeSuperClasses) {
            this.superClasses = new Array(...symbols.getAllSuperClasses(clazz));
            this.key = this.makeKey([clazz, ...this.superClasses]);
        }
        else {
            this.key = this.makeKey(clazz);
            this.superClasses = undefined;
        }
    }
    emit() {
        this.addLine(`declare class ${this.name}${this.getTypeParameters()} {`);
        this.increaseIndent();
        if (this.type.members !== undefined) {
            typescripts_1.Symbols.fillSources(this.additionalSources, this.type);
            this.processMembers(this.type.members);
        }
        if (this.superClasses !== undefined) {
            for (let i = this.superClasses.length - 1; i >= 0; i--) {
                const superClass = this.superClasses[i];
                if (superClass.members !== undefined) {
                    typescripts_1.Symbols.fillSources(this.additionalSources, superClass);
                    this.processMembers(superClass.members);
                }
            }
        }
        this.decreaseIndent();
        this.addLine('}');
    }
    processMember(member) {
        if (!this.includePrivates && typescripts_1.Symbols.isPrivate(member)) {
            return;
        }
        super.processMember(member);
    }
}
class InterfaceEmitter extends TypeEmitter {
    constructor(context, symbols, source, type, name) {
        super(context, source, type, name);
        this.superTypes = new Array(...symbols.getAllSuperTypes(type)).filter(t => typescripts_1.Symbols.isInterface(t));
        if (this.superTypes.length === 0) {
            this.key = this.makeKey(type);
        }
        else {
            this.key = this.makeKey([type, ...this.superTypes]);
        }
    }
    emit() {
        this.addLine(`interface ${this.name}${this.getTypeParameters()} {`);
        this.increaseIndent();
        if (this.type.members !== undefined) {
            typescripts_1.Symbols.fillSources(this.additionalSources, this.type);
            this.processMembers(this.type.members);
        }
        for (let i = this.superTypes.length - 1; i >= 0; i--) {
            const superType = this.superTypes[i];
            if (superType.members !== undefined) {
                typescripts_1.Symbols.fillSources(this.additionalSources, superType);
                this.processMembers(superType.members);
            }
        }
        this.decreaseIndent();
        this.addLine('}');
    }
}
class EnumEmitter extends AbstractEmitter {
    constructor(context, source, type, name) {
        super(context, source);
        this.type = type;
        this.name = name;
        this.key = this.makeKey(type);
    }
    emit() {
        this.addLine(`${typescripts_1.Symbols.isConstEnum(this.type) ? "const " : ""}enum ${this.name} {`);
        this.increaseIndent();
        if (this.type.exports !== undefined) {
            let index = 0;
            const last = this.type.exports.size - 1;
            for (const [_name, member] of this.type.exports) {
                const declarations = member.declarations;
                if (declarations === undefined) {
                    continue;
                }
                const declaration = declarations[0];
                if (ts.isEnumMember(declaration)) {
                    const lines = Nodes.getLines(declaration, this.context.includeDocumentation);
                    if (index < last) {
                        lines[lines.length - 1] += ',';
                    }
                    this.addLines(lines);
                }
                index++;
            }
        }
        this.decreaseIndent();
        this.addLine('}');
    }
}
class TypeLiteralEmitter extends TypeEmitter {
    constructor(context, source, type, name) {
        super(context, source, type, name);
    }
    emit() {
        this.addLine(`type ${this.name} = {`);
        this.increaseIndent();
        if (this.type.members !== undefined) {
            this.processMembers(this.type.members);
        }
        this.decreaseIndent();
        this.addLine('}');
    }
}
class FunctionEmitter extends AbstractEmitter {
    constructor(context, source, func, name) {
        super(context, source);
        this.func = func;
        this.name = name ?? func.getName();
    }
    get key() {
        return undefined;
    }
    emit(currentSourceFile) {
        const declarations = this.func.declarations;
        if (declarations !== undefined) {
            for (const declaration of declarations) {
                const fileName = declaration.getSourceFile().fileName;
                if (fileName === currentSourceFile.fileName) {
                    continue;
                }
                if (ts.isFunctionDeclaration(declaration)) {
                    this.addFunctionDeclaration(declaration, this.name, 'declare');
                    this.additionalSources.add(fileName);
                }
            }
        }
    }
}
class ModuleEmitter extends AbstractEmitter {
    constructor(context, source, module, name) {
        super(context, source);
        this.module = module;
        this.name = name ?? module.getName();
    }
    get key() {
        return undefined;
    }
    emit(currentSourceFile) {
        this.addLine(`declare namespace ${this.name} {`);
        this.increaseIndent();
        const exports = this.module.exports;
        if (exports !== undefined) {
            this.addExports(exports, currentSourceFile);
        }
        this.decreaseIndent();
        this.addLine('}');
    }
    addExports(members, currentSourceFile) {
        for (const [_name, member] of members) {
            const declarations = member.declarations;
            if (declarations === undefined) {
                continue;
            }
            // For now we only emit function declarations. We could also emit variable declarations.
            if (typescripts_1.Symbols.isFunction(member)) {
                for (const declaration of declarations) {
                    const fileName = declaration.getSourceFile().fileName;
                    if (fileName === currentSourceFile.fileName) {
                        continue;
                    }
                    if (ts.isFunctionDeclaration(declaration)) {
                        this.addFunctionDeclaration(declaration, undefined, 'declare');
                        this.additionalSources.add(fileName);
                    }
                }
            }
        }
    }
}
class CodeSnippetBuilder extends types_1.ProgramContext {
    constructor(context, symbols, currentSourceFile) {
        super();
        this.indent = 0;
        this.lines = [];
        this.source = undefined;
        this.additionalSources = new Set();
        this.context = context;
        this.symbols = symbols;
        this.currentSourceFile = currentSourceFile;
    }
    getSymbolInfo(symbol) {
        const result = super.getSymbolInfo(symbol);
        if (result.skip === false && result.primary.fileName === this.currentSourceFile.fileName) {
            return { skip: true };
        }
        return result;
    }
    increaseIndent() {
        this.indent++;
    }
    decreaseIndent() {
        this.indent--;
    }
    getProgram() {
        return this.symbols.getProgram();
    }
    addSource(source) {
        if (this.source === undefined) {
            this.source = source;
        }
        else {
            this.additionalSources.add(source);
        }
    }
    addAdditionalSource(sources) {
        if (sources === undefined) {
            return;
        }
        for (const source of sources) {
            this.additionalSources.add(source);
        }
    }
    isEmpty() {
        return this.lines.length === 0 || this.source === undefined;
    }
    snippet(key) {
        if (this.source === undefined) {
            throw new types_1.RecoverableError('No source', types_1.RecoverableError.NoSourceFile);
        }
        this.additionalSources.delete(this.source);
        return protocol_1.CodeSnippet.create(key, this.source, this.additionalSources.size === 0 ? undefined : [...this.additionalSources], this.lines.join('\n'));
    }
    addDeclaration(declaration) {
        const sourceFile = declaration.getSourceFile();
        if (sourceFile.fileName === this.currentSourceFile.fileName || this.skipDeclaration(declaration, sourceFile)) {
            return;
        }
        this.addLines(Nodes.getLines(declaration, this.context.includeDocumentation, sourceFile));
        this.addSource(sourceFile.fileName);
    }
    addLines(lines) {
        if (lines.length === 0) {
            return;
        }
        if (this.indent === 0) {
            this.lines.push(...lines);
        }
        else {
            this.lines.push(...lines.map(line => `${'\t'.repeat(this.indent)}${line}`));
        }
    }
    addClassSymbol(clazz, name, includeSuperClasses = true, includePrivates = false) {
        if (!typescripts_1.Symbols.isClass(clazz)) {
            return;
        }
        const info = this.getSymbolInfo(clazz);
        if (info.skip) {
            return;
        }
        this.addEmitter(new ClassEmitter(this.context, this.symbols, info.primary, clazz, name, includeSuperClasses, includePrivates));
    }
    addTypeLiteralSymbol(type, name) {
        if (!typescripts_1.Symbols.isTypeLiteral(type)) {
            return;
        }
        const info = this.getSymbolInfo(type);
        if (info.skip) {
            return;
        }
        this.addEmitter(new TypeLiteralEmitter(this.context, info.primary, type, name));
    }
    addInterfaceSymbol(iface, name) {
        if (!typescripts_1.Symbols.isInterface(iface)) {
            return;
        }
        const info = this.getSymbolInfo(iface);
        if (info.skip) {
            return;
        }
        this.addEmitter(new InterfaceEmitter(this.context, this.symbols, info.primary, iface, name));
    }
    addTypeAliasSymbol(symbol, _name) {
        if (!typescripts_1.Symbols.isTypeAlias(symbol)) {
            return;
        }
        // This should not happens since we flatten the type aliases in the symbols.
    }
    addEnumSymbol(enm, name) {
        if (!typescripts_1.Symbols.isEnum(enm)) {
            return;
        }
        const info = this.getSymbolInfo(enm);
        if (info.skip) {
            return;
        }
        this.addEmitter(new EnumEmitter(this.context, info.primary, enm, name));
    }
    addFunctionSymbol(func, name) {
        if (!typescripts_1.Symbols.isFunction(func)) {
            return;
        }
        const info = this.getSymbolInfo(func);
        if (info.skip) {
            return;
        }
        this.addEmitter(new FunctionEmitter(this.context, info.primary, func, name));
    }
    addModuleSymbol(module, name) {
        if (!typescripts_1.Symbols.isValueModule(module)) {
            return;
        }
        const info = this.getSymbolInfo(module);
        if (info.skip) {
            return;
        }
        this.addEmitter(new ModuleEmitter(this.context, info.primary, module, name));
    }
    addTypeSymbol(type, name) {
        if (name === undefined && typescripts_1.Symbols.isInternal(type)) {
            return;
        }
        const symbolName = name ?? type.getName();
        if (typescripts_1.Symbols.isClass(type)) {
            this.addClassSymbol(type, symbolName);
        }
        else if (typescripts_1.Symbols.isInterface(type)) {
            this.addInterfaceSymbol(type, symbolName);
        }
        else if (typescripts_1.Symbols.isTypeAlias(type)) {
            this.addTypeAliasSymbol(type, symbolName);
        }
        else if (typescripts_1.Symbols.isEnum(type)) {
            this.addEnumSymbol(type, symbolName);
        }
        else if (typescripts_1.Symbols.isFunction(type)) {
            this.addFunctionSymbol(type, symbolName);
        }
        else if (typescripts_1.Symbols.isValueModule(type)) {
            this.addModuleSymbol(type, symbolName);
        }
        else if (typescripts_1.Symbols.isTypeLiteral(type) && symbolName !== undefined) {
            this.addTypeLiteralSymbol(type, symbolName);
        }
    }
    addEmitter(emitter) {
        let lines;
        let uri;
        let additionalUris;
        const session = this.context.session;
        if (emitter.key !== undefined) {
            const code = session.getCachedCode(emitter.key);
            if (code !== undefined) {
                lines = code.value;
                uri = code.uri;
                additionalUris = code.additionalUris;
            }
        }
        if (lines === undefined || uri === undefined) {
            emitter.emit(this.currentSourceFile);
            lines = emitter.getLines();
            uri = emitter.source;
            additionalUris = emitter.getAdditionalSources();
            if (emitter.key !== undefined) {
                session.cacheCode(emitter.key, { value: lines, uri, additionalUris });
            }
        }
        if (this.indent === 0) {
            this.lines.push(...lines);
        }
        else {
            this.lines.push(...lines.map(line => `${'\t'.repeat(this.indent)}${line}`));
        }
        this.addSource(uri);
        this.addAdditionalSource(additionalUris);
    }
}
exports.CodeSnippetBuilder = CodeSnippetBuilder;
//# sourceMappingURL=code.js.map