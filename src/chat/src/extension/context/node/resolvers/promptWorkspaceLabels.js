"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromptWorkspaceLabels = exports.IPromptWorkspaceLabels = void 0;
const configurationService_1 = require("../../../../platform/configuration/common/configurationService");
const fileSystemService_1 = require("../../../../platform/filesystem/common/fileSystemService");
const ignoreService_1 = require("../../../../platform/ignore/common/ignoreService");
const nullExperimentationService_1 = require("../../../../platform/telemetry/common/nullExperimentationService");
const telemetry_1 = require("../../../../platform/telemetry/common/telemetry");
const workspaceService_1 = require("../../../../platform/workspace/common/workspaceService");
const services_1 = require("../../../../util/common/services");
const instantiation_1 = require("../../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../../vscodeTypes");
exports.IPromptWorkspaceLabels = (0, services_1.createServiceIdentifier)('IPromptWorkspaceLabels');
let PromptWorkspaceLabels = class PromptWorkspaceLabels {
    get workspaceLabels() {
        return this.strategy === 0 /* PromptWorkspaceLabelsStrategy.Basic */ ? this.basicWorkspaceLabels : this.expandedWorkspaceLabels;
    }
    constructor(_experimentationService, _configurationService, _telemetryService, _instantiationService) {
        this._experimentationService = _experimentationService;
        this._configurationService = _configurationService;
        this._telemetryService = _telemetryService;
        this._instantiationService = _instantiationService;
        this.strategy = 0 /* PromptWorkspaceLabelsStrategy.Basic */;
        this.basicWorkspaceLabels = this._instantiationService.createInstance(BasicPromptWorkspaceLabels);
        this.expandedWorkspaceLabels = this._instantiationService.createInstance(ExpandedPromptWorkspaceLabels);
    }
    get labels() {
        const uniqueLabels = [...new Set(this.workspaceLabels.labels)].sort();
        return uniqueLabels;
    }
    async collectContext() {
        const expandedLabels = this._configurationService.getExperimentBasedConfig(configurationService_1.ConfigKey.AdvancedExperimentalExperiments.ProjectLabelsExpanded, this._experimentationService);
        this.strategy = expandedLabels ? 1 /* PromptWorkspaceLabelsStrategy.Expanded */ : 0 /* PromptWorkspaceLabelsStrategy.Basic */;
        await this.workspaceLabels.collectContext();
        const uniqueLabels = [...new Set(this.labels)].sort();
        /* __GDPR__
            "projectLabels" : {
                "owner": "digitarald",
                "comment": "Reports quality of labels detected in a workspace",
                "labels": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Unique workspace label count." },
                "count": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Unique workspace labels in context." }
            }
        */
        this._telemetryService.sendMSFTTelemetryEvent('projectLabels', {
            labels: uniqueLabels.join(',').replaceAll('@', ' ')
        }, {
            count: uniqueLabels.length,
        });
    }
};
exports.PromptWorkspaceLabels = PromptWorkspaceLabels;
exports.PromptWorkspaceLabels = PromptWorkspaceLabels = __decorate([
    __param(0, nullExperimentationService_1.IExperimentationService),
    __param(1, configurationService_1.IConfigurationService),
    __param(2, telemetry_1.ITelemetryService),
    __param(3, instantiation_1.IInstantiationService)
], PromptWorkspaceLabels);
let BasicPromptWorkspaceLabels = class BasicPromptWorkspaceLabels {
    constructor(_workspaceService, _fileSystemService, _ignoreService) {
        this._workspaceService = _workspaceService;
        this._fileSystemService = _fileSystemService;
        this._ignoreService = _ignoreService;
        this.indicators = new Map();
        this.contentIndicators = new Map();
        this._labels = [];
        this.initIndicators();
    }
    get labels() {
        // Check if labels have both javascript and typescript and remove javascript
        // This can confuse the LLM and typescript should take precedent so types are returned.
        if (this._labels.includes('javascript') && this._labels.includes('typescript')) {
            const index = this._labels.indexOf('javascript');
            this._labels.splice(index, 1);
        }
        return this._labels;
    }
    async collectContext() {
        const folders = this._workspaceService.getWorkspaceFolders();
        if (folders) {
            for (let i = 0; i < folders.length; i++) {
                await this.addContextForFolders(folders[i]);
            }
        }
    }
    async addContextForFolders(f) {
        for (const [filename, labels] of this.indicators.entries()) {
            await this.addLabelIfApplicable(f, filename, labels);
        }
    }
    async addLabelIfApplicable(rootFolder, filename, labels) {
        const uri = vscodeTypes_1.Uri.joinPath(rootFolder, filename);
        if (await this._ignoreService.isCopilotIgnored(uri)) {
            return;
        }
        try {
            await this._fileSystemService.stat(uri);
            labels.forEach(label => this._labels.push(label));
            const parseCallback = this.contentIndicators.get(filename);
            if (parseCallback) {
                const b = await this._fileSystemService.readFile(uri);
                try {
                    const contentLabels = parseCallback(new TextDecoder().decode(b));
                    contentLabels.forEach(label => this._labels.push(label));
                }
                catch (e) {
                    // it's ok if we can't parse those files
                }
            }
        }
        catch (e) {
            // ignore non-existing files
        }
    }
    initIndicators() {
        this.addIndicator('package.json', 'javascript', 'npm');
        this.addIndicator('tsconfig.json', 'typescript');
        this.addIndicator('pom.xml', 'java', 'maven');
        this.addIndicator('build.gradle', 'java', 'gradle');
        this.addIndicator('requirements.txt', 'python', 'pip');
        this.addIndicator('Pipfile', 'python', 'pip');
        this.addIndicator('Cargo.toml', 'rust', 'cargo');
        this.addIndicator('go.mod', 'go', 'go.mod');
        this.addIndicator('pubspec.yaml', 'dart', 'pub');
        this.addIndicator('build.sbt', 'scala', 'sbt');
        this.addIndicator('build.boot', 'clojure', 'boot');
        this.addIndicator('project.clj', 'clojure', 'lein');
        this.addIndicator('mix.exs', 'elixir', 'mix');
        this.addIndicator('composer.json', 'php', 'composer');
        this.addIndicator('Gemfile', 'ruby', 'bundler');
        this.addIndicator('build.xml', 'java', 'ant');
        this.addIndicator('build.gradle.kts', 'java', 'gradle');
        this.addIndicator('yarn.lock', 'yarn');
        this.addIndicator('CMakeLists.txt', 'c++', 'cmake');
        this.addIndicator('vcpkg.json', 'c++');
        this.addIndicator('Makefile', 'c++', 'makefile');
        this.addContentIndicator('CMakeLists.txt', this.collectCMakeListsTxtIndicators);
        this.addContentIndicator('package.json', this.collectPackageJsonIndicators);
    }
    addIndicator(filename, ...labels) {
        this.indicators.set(filename, labels);
    }
    addContentIndicator(filename, callback) {
        this.contentIndicators.set(filename, callback);
    }
    collectCMakeListsTxtIndicators(contents) {
        function parseStandardVersion(contents, regex, allowedList) {
            try {
                const matchResult = Array.from(contents.matchAll(regex));
                if (matchResult && matchResult[0] && matchResult[0][1]) {
                    const version = parseInt(matchResult[0][1]);
                    if (allowedList.includes(version)) {
                        return version;
                    }
                }
            }
            catch (e) {
                // It's ok if the parsing of the standard version fails.
            }
            return undefined;
        }
        const tags = [];
        const cppLangStdVer = parseStandardVersion(contents, /set\s*\(\s*CMAKE_CXX_STANDARD\s*(\d+)/gmi, [98, 11, 14, 17, 20, 23, 26]);
        if (cppLangStdVer) {
            tags.push(`C++${cppLangStdVer}`);
        }
        const cLangStdVer = parseStandardVersion(contents, /set\s*\(\s*CMAKE_C_STANDARD\s*(\d+)/gmi, [90, 99, 11, 17, 23]);
        if (cLangStdVer) {
            tags.push(`C${cLangStdVer}`);
        }
        return tags;
    }
    collectPackageJsonIndicators(contents) {
        const tags = [];
        const json = JSON.parse(contents);
        const dependencies = json.dependencies;
        const devDependencies = json.devDependencies;
        if (dependencies) {
            if (dependencies['@angular/core']) {
                tags.push('angular');
            }
            if (dependencies['react']) {
                tags.push('react');
            }
            if (dependencies['vue']) {
                tags.push('vue');
            }
        }
        if (devDependencies) {
            if (devDependencies['typescript']) {
                tags.push('typescript');
            }
        }
        const engines = json.engines;
        if (engines) {
            if (engines['node']) {
                tags.push('node');
            }
            if (engines['vscode']) {
                tags.push('vscode extension');
            }
        }
        return tags;
    }
};
BasicPromptWorkspaceLabels = __decorate([
    __param(0, workspaceService_1.IWorkspaceService),
    __param(1, fileSystemService_1.IFileSystemService),
    __param(2, ignoreService_1.IIgnoreService)
], BasicPromptWorkspaceLabels);
let ExpandedPromptWorkspaceLabels = class ExpandedPromptWorkspaceLabels extends BasicPromptWorkspaceLabels {
    constructor(workspaceService, fileSystemService, ignoreService) {
        super(workspaceService, fileSystemService, ignoreService);
        this.popularPackages = [
            // Data Science and Machine Learning
            'numpy', 'pandas', 'scipy', 'scikit-learn', 'matplotlib', 'tensorflow', 'keras',
            'torch', 'seaborn', 'plotly', 'dash', 'jupyter', 'notebook', 'ipython', 'openai', 'pyspark',
            'airflow', 'nltk', 'sympy', 'spacy', 'langchain',
            // Web Development
            'Flask', 'Django', 'fastapi', 'pydantic', 'requests', 'beautifulsoup4',
            'gunicorn', 'uvicorn', 'httpx', 'Jinja2', 'aiohttp',
            // Testing
            'pytest', 'tox', 'nox', 'selenium', 'playwright', 'coverage', 'hypothesis',
            // Documentation
            'Sphinx',
            // Task Queue
            'celery', 'asyncio',
            // Cloud and DevOps
            'boto3', 'google-cloud-storage', 'azure-storage-blob', 'docker', 'kubernetes', 'azure', 'google', 'ansible',
            // Security
            'cryptography', 'paramiko', 'PyJWT',
            // Enterprise, Legacy & data storage
            'xlrd', 'xlrd-2024', 'openpyxl', 'pywin32', 'pywin', 'psycopg2', 'mysqlclient', 'SQLite4', 'Werkzeug', 'pymongo', 'redis', 'PyMySQL',
            // Utilities
            'Pillow', 'SQLAlchemy', 'lxml', 'html5lib', 'Markdown', 'pytz', 'Click',
            'attrs', 'PyYAML', 'configparser', 'loguru', 'structlog', 'pygame', 'discord'
        ];
        this.addContentIndicator('package.json', this.collectPackageJsonIndicatorsExpanded);
        this.addContentIndicator('requirements.txt', this.collectPythonRequirementsIndicators);
        this.addContentIndicator('pyproject.toml', this.collectPythonTomlIndicators);
    }
    collectPackageJsonIndicatorsExpanded(contents) {
        const tags = [];
        const extractMajorMinorVersion = (version) => {
            const [major, minor] = version.split('.');
            return `${major.replace(/[^0-9]/g, '')}.${minor.replace(/[^0-9]/g, '')}`;
        };
        const checkDependencies = (dependencies, list) => {
            if (!dependencies) {
                return;
            }
            list.forEach(({ dependency, prefix }) => {
                if (dependencies[dependency]) {
                    const version = extractMajorMinorVersion(dependencies[dependency]);
                    tags.push(`${prefix || dependency}@${version}`);
                }
            });
        };
        let json;
        try {
            json = JSON.parse(contents);
        }
        catch {
            return tags;
        }
        const allDependenciesFields = [
            json.dependencies,
            json.devDependencies,
            json.peerDependencies,
            json.optionalDependencies
        ];
        const dependenciesList = [
            // Frontend Frameworks
            { dependency: 'react' },
            { dependency: 'vue' },
            { dependency: '@angular/core' },
            { dependency: 'svelte' },
            { dependency: 'solid-js' },
            { dependency: 'alpinejs' },
            // State Management Libraries
            { dependency: 'redux' },
            { dependency: 'mobx' },
            { dependency: 'vuex' },
            { dependency: 'ngrx' },
            // UI Libraries
            { dependency: 'antd' },
            { dependency: 'bootstrap' },
            { dependency: 'bulma' },
            { dependency: '@mui/material' },
            { dependency: 'semantic-ui-react' },
            // Rendering Frameworks
            { dependency: 'next' },
            { dependency: 'gatsby' },
            { dependency: 'remix' },
            { dependency: 'astro' },
            { dependency: 'sveltekit' },
            { dependency: 'nuxt' },
            // Testing Tools
            { dependency: 'jest' },
            { dependency: 'mocha' },
            { dependency: 'cypress' },
            { dependency: '@testing-library/react' },
            { dependency: '@playwright/test' },
            { dependency: 'vitest' },
            { dependency: '@storybook/react' },
            // CSS Tools
            { dependency: 'tailwindcss' },
            { dependency: 'sass' },
            { dependency: 'styled-components' },
            { dependency: 'css-modules' },
            { dependency: 'postcss' },
            { dependency: '@emotion/react' },
            // Build Tools
            { dependency: 'vite' },
            { dependency: 'webpack' },
            { dependency: 'parcel' },
            { dependency: 'rollup' },
            { dependency: 'snowpack' },
            { dependency: 'esbuild' },
            { dependency: '@swc/core' },
            // Real-time Communication
            { dependency: 'socket.io' },
            // API and Data Handling
            { dependency: 'd3' },
            { dependency: 'graphql' },
            // Utility Libraries
            { dependency: 'lodash' },
            { dependency: 'moment' },
            { dependency: 'rxjs' },
            { dependency: 'underscore' },
            // Task Runners
            { dependency: 'gulp' },
            // Older Libraries
            { dependency: 'backbone' },
            { dependency: 'ember-source' },
            { dependency: 'handlebars' },
            { dependency: 'jquery' },
            { dependency: 'knockout' },
            // Cloud SDKs
            { dependency: 'aws-sdk' },
            { dependency: 'cloudinary' },
            { dependency: 'firebase' },
            { dependency: '@azure/storage-blob' },
            { dependency: '@google-cloud/storage' },
            // Cloud Functions
            { dependency: '@aws-lambda' },
            { dependency: '@azure/functions' },
            { dependency: '@google-cloud/functions' },
            { dependency: 'firebase-functions' },
            // Cloud Databases
            { dependency: '@azure/cosmos' },
            { dependency: '@google-cloud/firestore' },
            { dependency: 'mongoose' },
            // Containerization and Orchestration
            { dependency: 'dockerode' },
            { dependency: 'kubernetes-client' },
            // Monitoring and Logging
            { dependency: '@elastic/elasticsearch' },
            { dependency: '@sentry/node' },
            { dependency: 'log4js' },
            { dependency: 'winston' },
            // Security
            { dependency: 'bcrypt' },
            { dependency: 'helmet' },
            { dependency: 'jsonwebtoken' },
            { dependency: 'passport' },
            // Azure Libraries
            { dependency: '@azure/identity' },
            { dependency: '@azure/keyvault-certificates' },
            { dependency: '@azure/keyvault-keys' },
            { dependency: '@azure/keyvault-secrets' },
            { dependency: '@azure/service-bus' },
            { dependency: '@azure/event-hubs' },
            { dependency: '@azure/data-tables' },
            { dependency: '@azure/monitor-query' },
            { dependency: '@azure/app-configuration' },
            // Development Tools
            { dependency: 'babel' },
            { dependency: 'eslint' },
            { dependency: 'parcel' },
            { dependency: 'prettier' },
            { dependency: 'rollup' },
            { dependency: 'typescript' },
            { dependency: 'webpack' },
            { dependency: 'vite' },
        ];
        const enginesList = [
            // Engines
            { dependency: 'node' },
            { dependency: 'vscode', prefix: 'vscode extension' }
        ];
        allDependenciesFields.forEach((deps) => checkDependencies(deps, dependenciesList));
        checkDependencies(json.engines, enginesList);
        return tags;
    }
    collectPythonRequirementsIndicators(contents) {
        const tags = [];
        const lines = contents.split('\n');
        lines.forEach(line => {
            const [pkg, version] = line.split('==');
            if (this.popularPackages.includes(pkg)) {
                tags.push(`${pkg}-${version || 'latest'}`);
            }
        });
        return tags;
    }
    collectPythonTomlIndicators(contents) {
        const tags = [];
        const lines = contents.split('\n');
        let inDependenciesSection = false;
        // TODO@digitarald: Should use npm `toml` package, but this is avoiding a dependency for now
        lines.forEach(line => {
            line = line.trim();
            if (line === '[tool.poetry.dependencies]') {
                inDependenciesSection = true;
            }
            else if (line.startsWith('[') && line.endsWith(']')) {
                inDependenciesSection = false;
            }
            else if (inDependenciesSection && line) {
                const [pkg, version] = line.split('=').map(s => s.trim().replace(/"|'/g, ''));
                if (this.popularPackages.includes(pkg)) {
                    tags.push(`${pkg}-${version || 'latest'}`);
                }
            }
        });
        return tags;
    }
};
ExpandedPromptWorkspaceLabels = __decorate([
    __param(0, workspaceService_1.IWorkspaceService),
    __param(1, fileSystemService_1.IFileSystemService),
    __param(2, ignoreService_1.IIgnoreService)
], ExpandedPromptWorkspaceLabels);
//# sourceMappingURL=promptWorkspaceLabels.js.map