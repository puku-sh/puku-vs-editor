"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DebuggableCommandIdentifier = exports.IDebuggableCommandIdentifier = void 0;
// import * as vscode from 'vscode';
const configurationService_1 = require("../../../platform/configuration/common/configurationService");
const extensionContext_1 = require("../../../platform/extContext/common/extensionContext");
const fileSystemService_1 = require("../../../platform/filesystem/common/fileSystemService");
const workspaceService_1 = require("../../../platform/workspace/common/workspaceService");
const services_1 = require("../../../util/common/services");
const arrays_1 = require("../../../util/vs/base/common/arrays");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const path = __importStar(require("../../../util/vs/base/common/path"));
const uri_1 = require("../../../util/vs/base/common/uri");
const languageToolsProvider_1 = require("./languageToolsProvider");
exports.IDebuggableCommandIdentifier = (0, services_1.createServiceIdentifier)('IDebuggableCommandIdentifier');
let DebuggableCommandIdentifier = class DebuggableCommandIdentifier extends lifecycle_1.Disposable {
    constructor(configurationService, context, workspaceService, languageToolsProvider, fileSystemService) {
        super();
        this.configurationService = configurationService;
        this.context = context;
        this.languageToolsProvider = languageToolsProvider;
        this.fileSystemService = fileSystemService;
        this.recentlySeenLanguages = new Set();
        this._register(workspaceService.onDidOpenTextDocument(e => {
            if (!KNOWN_DEBUGGABLE_LANGUAGES.includes(e.languageId)) {
                this.recentlySeenLanguages.add(e.languageId);
            }
        }));
    }
    /**
     * @inheritdoc
     *
     * This logic is as follows:
     *
     * - If the user has configured specific inclusions or exclusions for
     *   the command, then use those.
     * - If the command being run is a relative path or within the CWD, assume
     *   it's debuggable. This might be native code compiled to an executable.
     * - If one of the debuggable commands we know about matches, then it's
     *   debuggable.
     * - If the user has interacted with languages for which we don't know the
     *   appropriate debuggable commands, ask the language model and update
     *   our storage.
     *
     */
    async isDebuggable(cwd, commandLine, token) {
        if (!this.isGloballyEnabled()) {
            return false;
        }
        const command = extractCommandNameFromCLI(commandLine).toLowerCase();
        return this.getSpecificTreatment(command)
            ?? this.isWellKnownCommand(command)
            ?? await this.isWorkspaceLocal(cwd, command)
            ?? await this.isModelSuggestedCommand(command, token)
            ?? false;
    }
    isGloballyEnabled() {
        return this.configurationService.getConfig(configurationService_1.ConfigKey.TerminalToDebuggerEnabled);
    }
    async isWorkspaceLocal(cwd, command) {
        const abs = path.isAbsolute(command) ? uri_1.URI.file(command) : cwd && uri_1.URI.joinPath(cwd, command);
        if (!abs) {
            return undefined;
        }
        try {
            await this.fileSystemService.stat(abs);
            return true;
        }
        catch {
            // no-op
        }
    }
    async isModelSuggestedCommand(command, token) {
        const known = this.loadModelKnownCommands();
        // check ones we queried for previously and don't query for them again.
        for (const language of known.languages) {
            this.recentlySeenLanguages.delete(language);
        }
        if (known.commands.some(c => this.commandIncludes(command, c))) {
            return true;
        }
        if (!this.recentlySeenLanguages.size) {
            return false;
        }
        const languages = [...this.recentlySeenLanguages];
        this.recentlySeenLanguages.clear();
        const { commands, ok } = await this.languageToolsProvider.getToolsForLanguages(languages, token);
        if (ok) {
            this.storeModelKnownCommands({
                languages: known.languages.concat(languages),
                commands: (0, arrays_1.distinct)(known.commands.concat(commands)),
            });
        }
        return commands.some(c => this.commandIncludes(command, c));
    }
    isWellKnownCommand(command) {
        // an 'include' check to handle things like pip3 vs pip
        return KNOWN_DEBUGGABLE_COMMANDS.some(tool => this.commandIncludes(command, tool)) || undefined;
    }
    getSpecificTreatment(command) {
        const patterns = this.configurationService.getConfig(configurationService_1.ConfigKey.AdvancedExperimental.TerminalToDebuggerPatterns);
        for (const pattern of patterns) {
            if (pattern.startsWith('!') && this.commandIncludes(command, pattern)) {
                return false;
            }
            else if (this.commandIncludes(command, pattern)) {
                return true;
            }
        }
    }
    commandIncludes(command, needle) {
        const idx = command.indexOf(needle);
        return idx >= 0 &&
            (idx === 0 || command[idx - 1] === ' ') &&
            (idx + needle.length === command.length || command[idx + needle.length] === ' ');
    }
    loadModelKnownCommands() {
        return this.context.globalState.get(DEBUGGABLE_COMMAND_STORAGE_KEY, {
            languages: [],
            commands: [],
        });
    }
    storeModelKnownCommands(commands) {
        return this.context.globalState.update(DEBUGGABLE_COMMAND_STORAGE_KEY, commands);
    }
};
exports.DebuggableCommandIdentifier = DebuggableCommandIdentifier;
exports.DebuggableCommandIdentifier = DebuggableCommandIdentifier = __decorate([
    __param(0, configurationService_1.IConfigurationService),
    __param(1, extensionContext_1.IVSCodeExtensionContext),
    __param(2, workspaceService_1.IWorkspaceService),
    __param(3, languageToolsProvider_1.ILanguageToolsProvider),
    __param(4, fileSystemService_1.IFileSystemService)
], DebuggableCommandIdentifier);
const DEBUGGABLE_COMMAND_STORAGE_KEY = 'chat.debuggableCommands';
function extractCommandNameFromCLI(command) {
    // todo: support less common cases of quoting and environment variables
    const re = /\s*([^\s]+)/;
    const match = re.exec(command);
    return match ? match[1] : command;
}
/**
 * Seed some built-in patterns to avoid LM lookups for common cases.
 * Generated in test/simulation/debugTools.stest.ts, do not edit directly!
 */
const KNOWN_DEBUGGABLE_COMMANDS = ["abap", "ant", "automake", "autotools", "ava", "babel", "bcp", "behat", "behave", "biber", "bibtex", "bmake", "boot", "broccoli-sass", "browserify", "build_runner", "bundler", "busted", "cabal", "cargo", "cargo-bench", "cargo-fuzz", "cargo-make", "cargo-run", "cargo-test", "cargo-watch", "carthage", "carton", "clang", "clippy-driver", "clj", "clojure", "cmake", "cocoapods", "codeception", "common_test", "composer", "conan", "coverage", "cpan", "cpanm", "csc", "ct_run", "ctest", "cucumber", "cuda-gdb", "cuda-memcheck", "cypress", "dart", "dart-sass", "dart2js", "dartanalyzer", "dartdevc", "db2cli", "ddemangle", "devenv", "devtools", "dfix", "dialyzer", "dmd", "doctest", "dotnet", "dotnet-script", "dotnet-test-nunit", "dotnet-test-xunit", "dpp", "dscanner", "dsymutil", "dub", "dune", "dustmite", "dvilualatex", "dvipdf", "dvipdfmx", "dvips", "erl", "erlang", "erlc", "esbuild", "escript", "eunit", "eyeglass", "fastlane", "fennel", "flutter", "forever", "fpc", "fsharpc", "fsi", "g", "gaiden", "gcc", "gcov", "gdb", "gdc", "ghc", "ghcid", "gmake", "gmaven", "go", "gpars", "gradle", "grape", "griffon", "grinder", "grip", "groovy", "groovyc", "grunt", "grunt-sass", "gulp", "gulp-sass", "hdevtools", "hlint", "hspec", "irb", "isql", "jasmine", "java", "javac", "jazzy", "jdeps", "jest", "jlink", "julia", "junit", "kaocha", "karma", "kobalt", "kotest", "kotlin-dsl", "kotlinc", "kscript", "latexmk", "lazbuild", "lcov", "ld", "ldc2", "ldoc", "leiningen", "lldb", "lua", "luacheck", "luajit", "lualatex", "luarocks", "luaunit", "make", "markdown", "markdown-it", "markdown-pdf", "marked", "matlab", "maven", "mbuild", "mcc", "md2pdf", "mdbook", "merlin", "mex", "midje", "minitest", "mlint", "mmake", "mocha", "mockk", "mono", "moonscript", "msbuild", "mssql-cli", "mstest", "multimarkdown", "mysql", "ncu", "ninja", "nmake", "node", "node-sass", "nose", "npm", "npx", "nrepl", "nsight", "nsys", "nunit-console", "nvcc", "ocamlbuild", "ocamlc", "ocamldebug", "ocamlfind", "ocamlopt", "ocamlrun", "opam", "otest", "otool", "paket", "panda", "pandoc", "parcel", "pdflatex", "perl", "perl6", "perlbrew", "pgbench", "phing", "php", "php-cs-fixer", "phpcs", "phpdbg", "phpstan", "phpunit", "pip", "pipenv", "plackup", "playwright", "pm2", "pmake", "powershell", "ppc386", "ppcrossarm", "ppcrossavr", "ppcrossmips", "ppcrossppc", "ppcrosssparc", "ppcrosswin32", "ppcrossx64", "protractor", "prove", "pry", "psql", "psysh", "pub", "pwsh", "pytest", "python", "qmake", "quickcheck", "rails", "rake", "rakudo", "rdmd", "react-scripts", "rebar3", "relx", "remake", "rollup", "rspec", "rubocop", "ruby", "runghc", "rustc", "rustup", "sass", "sassc", "scons", "showdown", "sinatra", "speclj", "spek", "spock", "spring-boot", "sqlcmd", "sqlite3", "sqsh", "stack", "svelte-kit", "swift", "swiftc", "test", "test-runner", "testng", "testthat", "tools", "torch", "tox", "ts-node", "tsc", "unittest", "utop", "valgrind", "vbc", "virtualenv", "vite", "vstest", "vue-cli-service", "vue-test-utils", "webdev", "webpack", "x", "xcodebuild", "xctest", "xelatex", "xunit", "yarn", "zef", "zig"];
/**
 * Languages the {@link KNOWN_DEBUGGABLE_COMMANDS} covers.
 * Generated in test/simulation/debugTools.stest.ts, do not edit directly!
 */
const KNOWN_DEBUGGABLE_LANGUAGES = ["abap", "bat", "bibtex", "c", "clojure", "code-refactoring", "coffeescript", "cpp", "csharp", "css", "cuda-cpp", "d", "dart", "diff", "dockercompose", "dockerfile", "erlang", "fsharp", "git-commit", "git-rebase", "github-issues", "go", "graphql", "groovy", "haml", "handlebars", "haskell", "html", "ini", "jade", "java", "javascript", "javascriptreact", "json", "jsonc", "julia", "kotlin", "latex", "less", "log", "lua", "makefile", "markdown", "matlab", "objective-c", "objective-cpp", "ocaml", "pascal", "perl", "perl6", "php", "pip-requirements", "plaintext", "powershell", "pug", "python", "r", "razor", "ruby", "rust", "sass", "scss", "shaderlab", "shellscript", "slim", "snippets", "sql", "stylus", "svelte", "swift", "tex", "text", "toml", "typescript", "typescriptreact", "vb", "vue", "vue-html", "xml", "xsl", "yaml", "zig"];
//# sourceMappingURL=debuggableCommandIdentifier.js.map