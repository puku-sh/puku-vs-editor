"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LanguageServicesSession = exports.LanguageServices = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const typescript_1 = __importDefault(require("../../common/typescript"));
const ts = (0, typescript_1.default)();
const contextProvider_1 = require("../../common/contextProvider");
const isWindows = process.platform === 'win32';
function _normalizePath(value) {
    if (isWindows) {
        value = value.replace(/\\/g, '/');
        if (/^[a-z]:/.test(value)) {
            value = value.charAt(0).toUpperCase() + value.substring(1);
        }
    }
    const result = path_1.default.posix.normalize(value);
    return result.length > 0 && result.charAt(result.length - 1) === '/' ? result.substr(0, result.length - 1) : result;
}
function makeAbsolute(p, root) {
    if (path_1.default.isAbsolute(p)) {
        return _normalizePath(p);
    }
    if (root === undefined) {
        return _normalizePath(path_1.default.join(process.cwd(), p));
    }
    else {
        return _normalizePath(path_1.default.join(root, p));
    }
}
var ParseCommandLine;
(function (ParseCommandLine) {
    function create(fileOrDirectory) {
        const stat = (0, fs_1.statSync)(fileOrDirectory);
        let configFilePath;
        if (stat.isFile()) {
            configFilePath = fileOrDirectory;
        }
        else if (stat.isDirectory()) {
            configFilePath = path_1.default.join(fileOrDirectory, 'tsconfig.json');
        }
        else {
            throw new Error('The provided path is neither a file nor a directory.');
        }
        return loadConfigFile(configFilePath);
    }
    ParseCommandLine.create = create;
    function getDefaultCompilerOptions(configFileName) {
        const options = configFileName && path_1.default.basename(configFileName) === 'jsconfig.json'
            ? { allowJs: true, maxNodeModuleJsDepth: 2, allowSyntheticDefaultImports: true, skipLibCheck: true, noEmit: true }
            : {};
        return options;
    }
    function loadConfigFile(filePath) {
        const readResult = ts.readConfigFile(filePath, ts.sys.readFile);
        if (readResult.error) {
            throw new Error(ts.formatDiagnostics([readResult.error], ts.createCompilerHost({})));
        }
        const config = readResult.config;
        if (config.compilerOptions !== undefined) {
            config.compilerOptions = Object.assign(config.compilerOptions, getDefaultCompilerOptions(filePath));
        }
        const result = ts.parseJsonConfigFileContent(config, ts.sys, path_1.default.dirname(filePath));
        if (result.errors.length > 0) {
            throw new Error(ts.formatDiagnostics(result.errors, ts.createCompilerHost({})));
        }
        return result;
    }
})(ParseCommandLine || (ParseCommandLine = {}));
var CompileOptions;
(function (CompileOptions) {
    function getConfigFilePath(options) {
        if (options.project) {
            const projectPath = path_1.default.resolve(options.project);
            if (ts.sys.directoryExists(projectPath)) {
                return _normalizePath(path_1.default.join(projectPath, 'tsconfig.json'));
            }
            else {
                return _normalizePath(projectPath);
            }
        }
        const result = options.configFilePath;
        return result && makeAbsolute(result);
    }
    CompileOptions.getConfigFilePath = getConfigFilePath;
})(CompileOptions || (CompileOptions = {}));
var LanguageServiceHost;
(function (LanguageServiceHost) {
    function useSourceOfProjectReferenceRedirect(host, value) {
        host.useSourceOfProjectReferenceRedirect = value;
    }
    LanguageServiceHost.useSourceOfProjectReferenceRedirect = useSourceOfProjectReferenceRedirect;
})(LanguageServiceHost || (LanguageServiceHost = {}));
var LanguageServices;
(function (LanguageServices) {
    function createLanguageService(fileOrDirectory) {
        const config = ParseCommandLine.create(fileOrDirectory);
        return LanguageServices._createLanguageService(config);
    }
    LanguageServices.createLanguageService = createLanguageService;
    function _createLanguageService(config) {
        const configFilePath = CompileOptions.getConfigFilePath(config.options);
        const scriptSnapshots = new Map();
        const host = {
            getScriptFileNames: () => {
                return config.fileNames;
            },
            getCompilationSettings: () => {
                return config.options;
            },
            getProjectReferences: () => {
                return config.projectReferences;
            },
            getScriptVersion: (_fileName) => {
                // The files are immutable.
                return '0';
            },
            // The project is immutable
            getProjectVersion: () => '0',
            getScriptSnapshot: (fileName) => {
                let result = scriptSnapshots.get(fileName);
                if (result === undefined) {
                    const content = ts.sys.fileExists(fileName) ? ts.sys.readFile(fileName) : undefined;
                    if (content === undefined) {
                        return undefined;
                    }
                    result = ts.ScriptSnapshot.fromString(content);
                    scriptSnapshots.set(fileName, result);
                }
                return result;
            },
            getCurrentDirectory: () => {
                if (configFilePath !== undefined) {
                    return path_1.default.dirname(configFilePath);
                }
                else {
                    return process.cwd();
                }
            },
            getDefaultLibFileName: (options) => {
                // We need to return the path since the language service needs
                // to know the full path and not only the name which is return
                // from ts.getDefaultLibFileName
                return ts.getDefaultLibFilePath(options);
            },
            directoryExists: ts.sys.directoryExists,
            getDirectories: ts.sys.getDirectories,
            fileExists: ts.sys.fileExists,
            readFile: ts.sys.readFile,
            readDirectory: ts.sys.readDirectory,
            // this is necessary to make source references work.
            realpath: ts.sys.realpath
        };
        LanguageServiceHost.useSourceOfProjectReferenceRedirect(host, () => {
            return !config.options.disableSourceOfProjectReferenceRedirect;
        });
        const languageService = ts.createLanguageService(host);
        const program = languageService.getProgram();
        if (program === undefined) {
            throw new Error('Couldn\'t create language service with underlying program.');
        }
        return languageService;
    }
    LanguageServices._createLanguageService = _createLanguageService;
})(LanguageServices || (exports.LanguageServices = LanguageServices = {}));
class ConsoleLogger {
    info(s) {
        console.info(s);
    }
    msg(s, type) {
        type = type ?? ts.server.Msg.Info;
        switch (type) {
            case ts.server.Msg.Err:
                console.error(s);
                break;
            case ts.server.Msg.Info:
                console.info(s);
                break;
            case ts.server.Msg.Perf:
                console.log(s);
                break;
            default:
                console.error(s);
        }
    }
    startGroup() {
        console.group();
    }
    endGroup() {
        console.groupEnd();
    }
}
class LanguageServicesSession extends contextProvider_1.ComputeContextSession {
    constructor(root, host) {
        super(host, true);
        this.logger = new ConsoleLogger();
        this.languageServices = new Map();
        let languageService;
        let key;
        if (typeof root === 'string') {
            languageService = LanguageServices.createLanguageService(root);
            key = makeAbsolute(root);
        }
        else {
            languageService = root;
            key = CompileOptions.getConfigFilePath(languageService.getProgram().getCompilerOptions());
        }
        if (key === undefined) {
            throw new Error('Failed to create key');
        }
        this.languageServices.set(key, languageService);
        this.createDeep(languageService);
    }
    logError(error, cmd) {
        console.error(`Error in ${cmd}: ${error.message}`, error);
    }
    getScriptVersion(_sourceFile) {
        return "1";
    }
    *getLanguageServices(sourceFile) {
        if (sourceFile === undefined) {
            yield* this.languageServices.values();
        }
        else {
            const file = ts.server.toNormalizedPath(sourceFile.fileName);
            for (const languageService of this.languageServices.values()) {
                const scriptInfo = languageService.getProgram()?.getSourceFile(file);
                if (scriptInfo === undefined) {
                    continue;
                }
                yield languageService;
            }
        }
    }
    entries() {
        return this.languageServices.values();
    }
    createDeep(languageService) {
        const program = languageService.getProgram();
        if (program === undefined) {
            throw new Error(`Failed to create program`);
        }
        const references = program.getResolvedProjectReferences();
        if (references !== undefined) {
            for (const reference of references) {
                if (reference === undefined) {
                    continue;
                }
                const configFilePath = CompileOptions.getConfigFilePath(reference.commandLine.options);
                const key = configFilePath ?? LanguageServicesSession.makeKey(reference.commandLine);
                if (this.languageServices.has(key)) {
                    continue;
                }
                const languageService = LanguageServices._createLanguageService(reference.commandLine);
                this.languageServices.set(key, languageService);
                this.createDeep(languageService);
            }
        }
    }
    static makeKey(config) {
        const hash = crypto_1.default.createHash('md5'); // CodeQL [SM04514] The 'md5' algorithm is used to compute a shorter string to represent command line arguments in a map. It has no security implications.
        hash.update(JSON.stringify(config.options, undefined, 0));
        return hash.digest('base64');
    }
}
exports.LanguageServicesSession = LanguageServicesSession;
//# sourceMappingURL=languageServices.js.map