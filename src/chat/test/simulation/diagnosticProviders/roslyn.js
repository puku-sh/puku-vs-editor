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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoslynDiagnosticsProvider = void 0;
const cp = __importStar(require("child_process"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const salts_1 = require("../../base/salts");
const simulationContext_1 = require("../../base/simulationContext");
const stestUtil_1 = require("../stestUtil");
const utils_1 = require("./utils");
/**
 * Class which finds roslyn diagnostics after compilation of C# files
 */
class RoslynDiagnosticsProvider extends utils_1.CachingDiagnosticsProvider {
    constructor() {
        super(...arguments);
        this.id = 'roslyn';
        this.cacheSalt = salts_1.TestingCacheSalts.roslynCacheSalt;
        this.cacheScope = simulationContext_1.CacheScope.Roslyn;
    }
    get csprojFile() {
        return [
            '<Project Sdk="Microsoft.NET.Sdk">',
            '	<PropertyGroup>',
            '		<OutputType>Library</OutputType>',
            '		<TargetFramework>net7.0</TargetFramework>',
            '		<ImplicitUsings>enable</ImplicitUsings>',
            '		<Nullable>enable</Nullable>',
            '		<AllowUnsafeBlocks>true</AllowUnsafeBlocks>',
            '		<ErrorLog>error_list.sarif,version=2.1</ErrorLog>',
            '		<CodeAnalysisRuleSet>CSharp.ruleset</CodeAnalysisRuleSet>',
            '	</PropertyGroup>',
            '	<ItemGroup>',
            '		<PackageReference Include="Microsoft.CodeAnalysis.CSharp" Version="3.2.1"/>',
            '		<PackageReference Include="System.Runtime.Loader" Version="4.0.0-*"/>',
            '	</ItemGroup>',
            '</Project>',
        ].join("\n");
    }
    get rulesetFile() {
        return [
            '<?xml version="1.0" encoding="utf-8" ?>',
            '<RuleSet Name="CSharp Ruleset" Description="Code analysis rules for CSharp project" ToolsVersion="14.0">',
            '	<Rules AnalyzerId="Microsoft.CodeAnalysis.CSharp" RuleNamespace="Microsoft.CodeAnalysis.CSharp">',
            '		<Rule Id="CS8981" Action="None"/>',
            '	</Rules>',
            '</RuleSet>',
        ].join("\n");
    }
    isInstalled() {
        if (this._isInstalled === undefined) {
            if ((0, utils_1.findIfInstalled)({ command: 'dotnet', arguments: ['--version'] }, /^(\d+[\.\d+]*)/g)) {
                this._isInstalled = 'local';
            }
            else if ((0, utils_1.findIfInstalled)({ command: 'docker', arguments: ['--version'] }, /\d+\.\d+\.\d+/)) {
                this._isInstalled = 'docker';
            }
            else {
                this._isInstalled = false;
            }
        }
        return this._isInstalled !== false;
    }
    async computeDiagnostics(_files) {
        if (!this.isInstalled()) {
            throw new Error('clang or dotnet must be available in this environment for csharp diagnostics.');
        }
        const temporaryDirectory = await (0, stestUtil_1.createTempDir)();
        try {
            return await this.runDotnetCompiler(temporaryDirectory, _files);
        }
        finally {
            await (0, stestUtil_1.cleanTempDirWithRetry)(temporaryDirectory);
        }
    }
    runInDocker(temporaryDirectory, basename, command) {
        const args = ['run', '--rm', '-v', `${temporaryDirectory}:/${basename}`, 'mcr.microsoft.com/dotnet/sdk:8.0', ...command];
        //console.log('docker ' + args.map(arg => `'${arg}'`).join(' '));
        const spawnResult = cp.spawnSync('docker', args, { shell: true, encoding: 'utf-8' });
        if (spawnResult.status !== 0) {
            throw new Error(`Error while running '${command.join(' ')}' in docker : ${spawnResult.stdout} , ${spawnResult.stderr}`);
        }
        return spawnResult.stdout;
    }
    runInLocal(command) {
        const spawnResult = cp.spawnSync(command[0], command.slice(1), { shell: true, encoding: 'utf-8' });
        if (spawnResult.status !== 0) {
            throw new Error(`Error while running '${command.join(' ')}' in local OS : ${spawnResult.stderr}`);
        }
        return spawnResult.stdout;
    }
    async runDotnetCompiler(temporaryDirectory, files) {
        const projectName = 'project123';
        const projectLocation = path.join(temporaryDirectory, projectName);
        await (0, utils_1.setupTemporaryWorkspace)(projectLocation, files);
        let outputLocation;
        if (this._isInstalled === 'docker') {
            const script = [
                `set -x`,
                `cd "$(dirname "$0")"`, // cd to the directory of the script
                `dotnet new classlib --force -o ${projectName}`,
                `cp CSharp.ruleset ${projectName}/CSharp.ruleset`,
                `cp proj.csproj ${projectName}/${projectName}.csproj`, // replace the csproj file
                `dotnet build ${projectName} --no-incremental`,
                `cp ${projectName}/error_list.sarif error_list.sarif`, // the error_list.sarif file is generated by dotnet build and has the output
                `rm -rfd ${projectName}`, // Docker might run as root, so clean up all generated files right away, we won't be able to do it from the outside
            ].join('\n');
            await fs.promises.writeFile(path.join(temporaryDirectory, `validate.sh`), script);
            await fs.promises.writeFile(path.join(temporaryDirectory, `error_list.sarif`), ''); // pre-create the file so it gets the permissions of the current user and we can delete it after
            await fs.promises.writeFile(path.join(temporaryDirectory, `CSharp.ruleset`), this.rulesetFile);
            await fs.promises.writeFile(path.join(temporaryDirectory, `proj.csproj`), this.csprojFile);
            const basename = path.basename(temporaryDirectory);
            this.runInDocker(temporaryDirectory, basename, ['/bin/sh', `/${basename}/validate.sh`]);
            outputLocation = temporaryDirectory;
        }
        else {
            this.runInLocal(['dotnet', 'new', 'classlib', '--force', '-o', projectLocation]);
            await fs.promises.writeFile(path.join(projectLocation, `${projectName}.csproj`), this.csprojFile);
            await fs.promises.writeFile(path.join(projectLocation, `CSharp.ruleset`), this.rulesetFile);
            this.runInLocal(['dotnet', 'build', projectLocation, '--no-incremental']);
            outputLocation = projectLocation;
        }
        const fileContents = await fs.promises.readFile(path.join(outputLocation, `error_list.sarif`), 'utf8');
        const parsedErrors = JSON.parse(fileContents).runs[0].results;
        const diagnostics = [];
        for (const error of parsedErrors) {
            const uri = error.locations[0].physicalLocation.artifactLocation.uri;
            const diagnostic = {
                file: path.basename(uri),
                message: error.message.text,
                code: error.ruleId,
                startLine: error.locations[0].physicalLocation.region.startLine - 1,
                startCharacter: error.locations[0].physicalLocation.region.startColumn - 1,
                endLine: error.locations[0].physicalLocation.region.endLine - 1,
                endCharacter: error.locations[0].physicalLocation.region.endColumn - 1,
                relatedInformation: undefined,
                source: 'roslyn'
            };
            diagnostics.push(diagnostic);
        }
        return diagnostics;
    }
}
exports.RoslynDiagnosticsProvider = RoslynDiagnosticsProvider;
//# sourceMappingURL=roslyn.js.map