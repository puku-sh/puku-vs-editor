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
exports.LoggingActionsContrib = void 0;
exports.collectFetcherTelemetry = collectFetcherTelemetry;
exports.sanitizeValue = sanitizeValue;
const dns = __importStar(require("dns"));
const http = __importStar(require("http"));
const https = __importStar(require("https"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const tls = __importStar(require("tls"));
const util = __importStar(require("util"));
const vscode = __importStar(require("vscode"));
const pukuRequestTypes_1 = require("../../../platform/api/common/pukuRequestTypes");
const authentication_1 = require("../../../platform/authentication/common/authentication");
const configurationService_1 = require("../../../platform/configuration/common/configurationService");
const capiClient_1 = require("../../../platform/endpoint/common/capiClient");
const capiClientImpl_1 = require("../../../platform/endpoint/node/capiClientImpl");
const envService_1 = require("../../../platform/env/common/envService");
const extensionContext_1 = require("../../../platform/extContext/common/extensionContext");
const logService_1 = require("../../../platform/log/common/logService");
const fetcherService_1 = require("../../../platform/networking/common/fetcherService");
const networking_1 = require("../../../platform/networking/common/networking");
const nodeFetcher_1 = require("../../../platform/networking/node/nodeFetcher");
const nodeFetchFetcher_1 = require("../../../platform/networking/node/nodeFetchFetcher");
const electronFetcher_1 = require("../../../platform/networking/vscode-node/electronFetcher");
const fetcherServiceImpl_1 = require("../../../platform/networking/vscode-node/fetcherServiceImpl");
const nullExperimentationService_1 = require("../../../platform/telemetry/common/nullExperimentationService");
const telemetry_1 = require("../../../platform/telemetry/common/telemetry");
const crypto_1 = require("../../../util/common/crypto");
const arrays_1 = require("../../../util/vs/base/common/arrays");
const async_1 = require("../../../util/vs/base/common/async");
const uuid_1 = require("../../../util/vs/base/common/uuid");
const descriptors_1 = require("../../../util/vs/platform/instantiation/common/descriptors");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const serviceCollection_1 = require("../../../util/vs/platform/instantiation/common/serviceCollection");
const constants_1 = require("../../common/constants");
let LoggingActionsContrib = class LoggingActionsContrib {
    constructor(_context, envService, configurationService, experimentationService, authService, capiClientService, fetcherService, logService) {
        this._context = _context;
        this.envService = envService;
        this.configurationService = configurationService;
        this.experimentationService = experimentationService;
        this.authService = authService;
        this.capiClientService = capiClientService;
        this.fetcherService = fetcherService;
        this.logService = logService;
        this._context.subscriptions.push(vscode.commands.registerCommand('puku.debug.collectDiagnostics', async () => {
            const document = await vscode.workspace.openTextDocument({ language: 'markdown' });
            const editor = await vscode.window.showTextDocument(document);
            const electronConfig = (0, fetcherServiceImpl_1.getShadowedConfig)(this.configurationService, this.experimentationService, configurationService_1.ConfigKey.Shared.DebugUseElectronFetcher, configurationService_1.ConfigKey.Internal.DebugExpUseElectronFetcher);
            const nodeConfig = (0, fetcherServiceImpl_1.getShadowedConfig)(this.configurationService, this.experimentationService, configurationService_1.ConfigKey.Shared.DebugUseNodeFetcher, configurationService_1.ConfigKey.Internal.DebugExpUseNodeFetcher);
            const nodeFetchConfig = (0, fetcherServiceImpl_1.getShadowedConfig)(this.configurationService, this.experimentationService, configurationService_1.ConfigKey.Shared.DebugUseNodeFetchFetcher, configurationService_1.ConfigKey.Internal.DebugExpUseNodeFetchFetcher);
            const ext = vscode.extensions.getExtension(constants_1.EXTENSION_ID);
            const product = require(path.join(vscode.env.appRoot, 'product.json'));
            await appendText(editor, `## GitHub Copilot Chat

- Extension: ${this.envService.getVersion()} (${this.envService.getBuildType()})
- VS Code: ${vscode.version} (${product.commit || 'out-of-source'})
- OS: ${os.platform()} ${os.release()} ${os.arch()}${vscode.env.remoteName ? `
- Remote Name: ${vscode.env.remoteName}` : ''}${vscode.env.remoteName && ext ? `
- Extension Kind: ${vscode.ExtensionKind[ext.extensionKind]}` : ''}
- GitHub Account: ${this.authService.anyGitHubSession?.account.label || 'Signed Out'}

## Network

User Settings:
\`\`\`json${getNonDefaultSettings()}
  "puku.advanced.debug.useElectronFetcher": ${electronConfig},
  "puku.advanced.debug.useNodeFetcher": ${nodeConfig},
  "puku.advanced.debug.useNodeFetchFetcher": ${nodeFetchConfig}
\`\`\`${getProxyEnvVariables()}
`);
            const proxyAgent = loadVSCodeModule('@vscode/proxy-agent');
            const loadSystemCertificatesFromNode = this.configurationService.getNonExtensionConfig('http.systemCertificatesNode');
            const osCertificates = proxyAgent?.loadSystemCertificates ? await loadSystemCertificates(proxyAgent.loadSystemCertificates, loadSystemCertificatesFromNode, this.logService) : undefined;
            const urls = [
                this.capiClientService.dotcomAPIURL,
                this.capiClientService.capiPingURL,
                this.capiClientService.proxyBaseURL + '/_ping',
            ];
            const isGHEnterprise = this.capiClientService.dotcomAPIURL !== 'https://api.github.com';
            const timeoutSeconds = 10;
            const electronFetcher = electronFetcher_1.ElectronFetcher.create(this.envService);
            const electronCurrent = !!electronFetcher && electronConfig;
            const nodeCurrent = !electronCurrent && nodeConfig;
            const nodeFetchCurrent = !electronCurrent && !nodeCurrent && nodeFetchConfig;
            const nodeCurrentFallback = !electronCurrent && !nodeFetchCurrent;
            const activeFetcher = this.fetcherService.getUserAgentLibrary();
            const nodeFetcher = new nodeFetcher_1.NodeFetcher(this.envService);
            const fetchers = {
                ['Electron fetch']: {
                    fetcher: electronFetcher,
                    current: electronCurrent,
                },
                ['Node.js https']: {
                    fetcher: nodeFetcher,
                    current: nodeCurrent || nodeCurrentFallback,
                },
                ['Node.js fetch']: {
                    fetcher: new nodeFetchFetcher_1.NodeFetchFetcher(this.envService),
                    current: nodeFetchCurrent,
                },
            };
            const dnsLookup = util.promisify(dns.lookup);
            for (const url of urls) {
                const authHeaders = await this.getAuthHeaders(isGHEnterprise, url);
                const host = new URL(url).hostname;
                await appendText(editor, `\nConnecting to ${url}:\n`);
                for (const family of [4, 6]) {
                    await appendText(editor, `- DNS ipv${family} Lookup: `);
                    const start = Date.now();
                    try {
                        const dnsResult = await Promise.race([dnsLookup(host, { family }), (0, async_1.timeout)(timeoutSeconds * 1000)]);
                        if (dnsResult) {
                            await appendText(editor, `${dnsResult.address} (${Date.now() - start} ms)\n`);
                        }
                        else {
                            await appendText(editor, `timed out after ${timeoutSeconds} seconds\n`);
                        }
                    }
                    catch (err) {
                        await appendText(editor, `Error (${Date.now() - start} ms): ${err?.message}\n`);
                    }
                }
                let probeProxyURL;
                if (proxyAgent?.resolveProxyURL) {
                    await appendText(editor, `- Proxy URL: `);
                    const start = Date.now();
                    try {
                        const proxyURL = await Promise.race([proxyAgent.resolveProxyURL(url), timeoutAfter(timeoutSeconds * 1000)]);
                        if (proxyURL === 'timeout') {
                            await appendText(editor, `timed out after ${timeoutSeconds} seconds\n`);
                        }
                        else {
                            await appendText(editor, `${proxyURL || 'None'} (${Date.now() - start} ms)\n`);
                            probeProxyURL = proxyURL;
                        }
                    }
                    catch (err) {
                        await appendText(editor, `Error (${Date.now() - start} ms): ${err?.message}\n`);
                    }
                }
                if (proxyAgent?.loadSystemCertificates && probeProxyURL?.startsWith('https:')) {
                    const tlsOrig = tls.__vscodeOriginal;
                    if (tlsOrig) {
                        await appendText(editor, `- Proxy TLS: `);
                        if (!osCertificates) {
                            await appendText(editor, `(failed to load system certificates) `);
                        }
                        const start = Date.now();
                        try {
                            const result = await Promise.race([tlsConnect(tlsOrig, probeProxyURL, [...tls.rootCertificates, ...(osCertificates || [])]), (0, async_1.timeout)(timeoutSeconds * 1000)]);
                            if (result) {
                                await appendText(editor, `${result} (${Date.now() - start} ms)\n`);
                            }
                            else {
                                await appendText(editor, `timed out after ${timeoutSeconds} seconds\n`);
                            }
                        }
                        catch (err) {
                            await appendText(editor, `Error (${Date.now() - start} ms): ${err?.message}\n`);
                        }
                    }
                }
                if (probeProxyURL) {
                    const httpx = probeProxyURL.startsWith('https:') ? https.__vscodeOriginal : http.__vscodeOriginal;
                    if (httpx) {
                        await appendText(editor, `- Proxy Connection: `);
                        const start = Date.now();
                        try {
                            const result = await Promise.race([proxyConnect(httpx, probeProxyURL, url), (0, async_1.timeout)(timeoutSeconds * 1000)]);
                            if (result) {
                                const headers = Object.keys(result.headers).map(header => `\n	${header}: ${result.headers[header]}`);
                                const text = `${result.statusCode} ${result.statusMessage}${headers.join('')}`;
                                await appendText(editor, `${text} (${Date.now() - start} ms)\n`);
                            }
                            else {
                                await appendText(editor, `timed out after ${timeoutSeconds} seconds\n`);
                            }
                        }
                        catch (err) {
                            await appendText(editor, `Error (${Date.now() - start} ms): ${err?.message}\n`);
                        }
                    }
                }
                for (const [name, fetcher] of Object.entries(fetchers)) {
                    await appendText(editor, `- ${name}${fetcher.current ? ' (configured)' : fetcher.fetcher?.getUserAgentLibrary() === activeFetcher ? ' (active)' : ''}: `);
                    if (fetcher.fetcher) {
                        const start = Date.now();
                        try {
                            const response = await Promise.race([fetcher.fetcher.fetch(url, { headers: authHeaders }), (0, async_1.timeout)(timeoutSeconds * 1000)]);
                            if (response) {
                                await appendText(editor, `HTTP ${response.status} (${Date.now() - start} ms)\n`);
                            }
                            else {
                                await appendText(editor, `timed out after ${timeoutSeconds} seconds\n`);
                            }
                        }
                        catch (err) {
                            await appendText(editor, `Error (${Date.now() - start} ms): ${(0, logService_1.collectErrorMessages)(err)}\n`);
                        }
                    }
                    else {
                        await appendText(editor, 'Unavailable\n');
                    }
                }
            }
            // Using NodeFetcher since this is what telemetry currently uses.
            const secondaryUrls = [
                'https://github.com',
                vscode.Uri.parse(this.capiClientService.copilotTelemetryURL).with({ path: '/_ping' }).toString(),
            ];
            await appendText(editor, `\n`);
            for (const url of secondaryUrls) {
                const authHeaders = await this.getAuthHeaders(isGHEnterprise, url);
                await appendText(editor, `Connecting to ${url}: `);
                const start = Date.now();
                try {
                    const response = await Promise.race([nodeFetcher.fetch(url, { headers: authHeaders }), (0, async_1.timeout)(timeoutSeconds * 1000)]);
                    if (response) {
                        await appendText(editor, `HTTP ${response.status} (${Date.now() - start} ms)\n`);
                    }
                    else {
                        await appendText(editor, `timed out after ${timeoutSeconds} seconds\n`);
                    }
                }
                catch (err) {
                    await appendText(editor, `Error (${Date.now() - start} ms): ${(0, logService_1.collectErrorMessages)(err)}\n`);
                }
            }
            await appendText(editor, `\nNumber of system certificates: ${osCertificates?.length ?? 'failed to load'}\n`);
            await appendText(editor, `
## Documentation

In corporate networks: [Troubleshooting firewall settings for GitHub Copilot](https://docs.github.com/en/copilot/troubleshooting-github-copilot/troubleshooting-firewall-settings-for-github-copilot).`);
        }));
    }
    async getAuthHeaders(isGHEnterprise, url) {
        const authHeaders = {};
        if (isGHEnterprise) {
            let token = '';
            if (url === this.capiClientService.dotcomAPIURL) {
                token = this.authService.anyGitHubSession?.accessToken || '';
            }
            else {
                try {
                    token = (await this.authService.getCopilotToken()).token;
                }
                catch (_err) {
                    // Ignore error
                    token = '';
                }
            }
            authHeaders['Authorization'] = `Bearer ${token}`;
        }
        return authHeaders;
    }
};
exports.LoggingActionsContrib = LoggingActionsContrib;
exports.LoggingActionsContrib = LoggingActionsContrib = __decorate([
    __param(0, extensionContext_1.IVSCodeExtensionContext),
    __param(1, envService_1.IEnvService),
    __param(2, configurationService_1.IConfigurationService),
    __param(3, nullExperimentationService_1.IExperimentationService),
    __param(4, authentication_1.IAuthenticationService),
    __param(5, capiClient_1.ICAPIClientService),
    __param(6, fetcherService_1.IFetcherService),
    __param(7, logService_1.ILogService)
], LoggingActionsContrib);
async function appendText(editor, string) {
    await editor.edit(builder => {
        builder.insert(editor.document.lineAt(editor.document.lineCount - 1).range.end, string);
    });
}
function timeoutAfter(ms) {
    return new Promise(resolve => setTimeout(() => resolve('timeout'), ms));
}
function loadVSCodeModule(moduleName) {
    const appRoot = vscode.env.appRoot;
    try {
        return require(`${appRoot}/node_modules.asar/${moduleName}`);
    }
    catch (err) {
        // Not in ASAR.
    }
    try {
        return require(`${appRoot}/node_modules/${moduleName}`);
    }
    catch (err) {
        // Not available.
    }
    return undefined;
}
async function loadSystemCertificates(load, loadSystemCertificatesFromNode, logService) {
    try {
        const certificates = await load({
            log: {
                trace(message, ..._args) {
                    logService.trace(message);
                },
                debug(message, ..._args) {
                    logService.debug(message);
                },
                info(message, ..._args) {
                    logService.info(message);
                },
                warn(message, ..._args) {
                    logService.warn(message);
                },
                error(message, ..._args) {
                    logService.error(typeof message === 'string' ? message : String(message));
                },
            },
            loadSystemCertificatesFromNode: () => loadSystemCertificatesFromNode,
        });
        return Array.isArray(certificates) ? certificates : undefined;
    }
    catch (err) {
        logService.error(err);
        return undefined;
    }
}
async function tlsConnect(tlsOrig, proxyURL, ca) {
    return new Promise((resolve, reject) => {
        const proxyUrlObj = new URL(proxyURL);
        const socket = tlsOrig.connect({
            host: proxyUrlObj.hostname,
            port: parseInt(proxyUrlObj.port, 10),
            servername: proxyUrlObj.hostname,
            ca,
        }, () => {
            socket.end();
            resolve('Succeeded');
        });
        socket.on('error', reject);
    });
}
async function proxyConnect(httpx, proxyUrl, targetUrl, sanitize = false) {
    return new Promise((resolve, reject) => {
        const proxyUrlObj = new URL(proxyUrl);
        const targetUrlObj = new URL(targetUrl);
        const targetHost = `${targetUrlObj.hostname}:${targetUrlObj.port || (targetUrlObj.protocol === 'https:' ? 443 : 80)}`;
        const options = {
            method: 'CONNECT',
            host: proxyUrlObj.hostname,
            port: proxyUrlObj.port,
            path: targetHost,
            headers: {
                Host: targetHost,
            },
            rejectUnauthorized: false,
        };
        const req = httpx.request(options);
        req.on('connect', (res, socket, head) => {
            const headers = ['proxy-authenticate', 'proxy-agent', 'server', 'via'].reduce((acc, header) => {
                const value = res.headers[header];
                if (value) {
                    const doSanitize = sanitize && !['proxy-agent', 'server'].includes(header);
                    acc[header] = doSanitize ? Array.isArray(value) ? value.map(sanitizeValue) : sanitizeValue(value) : value;
                }
                return acc;
            }, {});
            socket.end();
            resolve({ statusCode: res.statusCode, statusMessage: res.statusMessage, headers });
        });
        req.on('error', reject);
        req.end();
    });
}
function getNonDefaultSettings() {
    const configuration = vscode.workspace.getConfiguration();
    return [
        'http.proxy',
        'http.noProxy',
        'http.proxyAuthorization',
        'http.proxyStrictSSL',
        'http.proxySupport',
        'http.electronFetch',
        'http.fetchAdditionalSupport',
        'http.proxyKerberosServicePrincipal',
        'http.systemCertificates',
        'http.experimental.systemCertificatesV2',
        'http.systemCertificatesNode',
    ].map(key => {
        const i = configuration.inspect(key);
        const v = configuration.get(key, i?.defaultValue);
        if (v !== i?.defaultValue && !(Array.isArray(v) && Array.isArray(i?.defaultValue) && v.length === 0 && i?.defaultValue.length === 0)) {
            return `\n  "${key}": ${JSON.stringify(v)},`;
        }
        return '';
    }).join('');
}
function getProxyEnvVariables() {
    const res = [];
    const envVars = ['http_proxy', 'https_proxy', 'ftp_proxy', 'all_proxy', 'no_proxy'];
    for (const env in process.env) {
        if (envVars.includes(env.toLowerCase())) {
            res.push(`\n- ${env}=${process.env[env]}`);
        }
    }
    return res.length ? `\n\nEnvironment Variables:${res.join('')}` : '';
}
function collectFetcherTelemetry(accessor, error) {
    const extensionContext = accessor.get(extensionContext_1.IVSCodeExtensionContext);
    const fetcherService = accessor.get(fetcherService_1.IFetcherService);
    const envService = accessor.get(envService_1.IEnvService);
    const telemetryService = accessor.get(telemetry_1.ITelemetryService);
    const logService = accessor.get(logService_1.ILogService);
    const authService = accessor.get(authentication_1.IAuthenticationService);
    const configurationService = accessor.get(configurationService_1.IConfigurationService);
    const expService = accessor.get(nullExperimentationService_1.IExperimentationService);
    const capiClientService = accessor.get(capiClient_1.ICAPIClientService);
    const instantiationService = accessor.get(instantiation_1.IInstantiationService);
    if (extensionContext.extensionMode === vscode.ExtensionMode.Test || envService_1.isScenarioAutomation) {
        return;
    }
    if (!configurationService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.DebugCollectFetcherTelemetry, expService)) {
        return;
    }
    const now = Date.now();
    const previous = extensionContext.globalState.get('lastCollectFetcherTelemetryTime', 0);
    const isInsiders = vscode.env.appName.includes('Insiders');
    const hours = isInsiders ? 5 : 26;
    if (now - previous < hours * 60 * 60 * 1000) {
        logService.debug(`Refetch model metadata: Skipped.`);
        return;
    }
    (async () => {
        await extensionContext.globalState.update('lastCollectFetcherTelemetryTime', now);
        logService.debug(`Refetch model metadata: Exclude other windows.`);
        const windowUUID = (0, uuid_1.generateUuid)();
        await extensionContext.globalState.update('lastCollectFetcherTelemetryUUID', windowUUID);
        await (0, async_1.timeout)(5000);
        if (extensionContext.globalState.get('lastCollectFetcherTelemetryUUID') !== windowUUID) {
            logService.debug(`Refetch model metadata: Other window won.`);
            return;
        }
        logService.debug(`Refetch model metadata: This window won.`);
        const proxy = await findProxyInfo(capiClientService);
        const ext = vscode.extensions.getExtension(constants_1.EXTENSION_ID);
        const extKind = (ext ? ext.extensionKind === vscode.ExtensionKind.UI : !vscode.env.remoteName) ? 'local' : 'remote';
        const remoteName = sanitizeValue(vscode.env.remoteName) || 'none';
        const platform = process.platform;
        const originalLibrary = fetcherService.getUserAgentLibrary();
        const originalError = error ? (sanitizeValue(error.message) || 'unknown') : 'none';
        const userAgentLibraryUpdate = (library) => JSON.stringify({ extKind, remoteName, platform, library, originalLibrary, originalError, proxy });
        const fetchers = [
            electronFetcher_1.ElectronFetcher.create(envService, userAgentLibraryUpdate),
            new nodeFetchFetcher_1.NodeFetchFetcher(envService, userAgentLibraryUpdate),
            new nodeFetcher_1.NodeFetcher(envService, userAgentLibraryUpdate),
        ].filter(fetcher => fetcher);
        // Randomize to offset any order dependency in telemetry.
        (0, arrays_1.shuffle)(fetchers);
        for (const fetcher of fetchers) {
            const requestId = (0, uuid_1.generateUuid)();
            const copilotToken = (await authService.getCopilotToken()).token;
            const requestStartTime = Date.now();
            const modifiedInstaService = instantiationService.createChild(new serviceCollection_1.ServiceCollection([fetcherService_1.IFetcherService, new descriptors_1.SyncDescriptor(fetcherServiceImpl_1.FetcherService, [fetcher])]));
            try {
                const modifiedCapiClientService = modifiedInstaService.createInstance(capiClientImpl_1.CAPIClientImpl);
                const response = await (0, networking_1.getRequest)(fetcher, telemetryService, modifiedCapiClientService, { type: pukuRequestTypes_1.RequestType.Models }, copilotToken, await (0, crypto_1.createRequestHMAC)(process.env.HMAC_SECRET), 'model-access', requestId);
                if (response.status < 200 || response.status >= 300) {
                    await response.text();
                }
                else {
                    await response.json();
                }
                logService.info(`Refetch model metadata: Succeeded in ${Date.now() - requestStartTime}ms ${requestId} (${response.headers.get('x-github-request-id')}) using ${fetcher.getUserAgentLibrary()} with status ${response.status}.`);
            }
            catch (e) {
                logService.info(`Refetch model metadata: Failed in ${Date.now() - requestStartTime}ms ${requestId} using ${fetcher.getUserAgentLibrary()}.`);
            }
            finally {
                modifiedInstaService.dispose();
            }
        }
    })().catch(err => {
        logService.error(err);
    });
}
async function findProxyInfo(capiClientService) {
    const timeoutSeconds = 5;
    let proxy;
    try {
        const proxyAgent = loadVSCodeModule('@vscode/proxy-agent');
        if (proxyAgent?.resolveProxyURL) {
            const url = capiClientService.capiPingURL; // Assuming this gets the same proxy as for the models request.
            const proxyURL = await Promise.race([proxyAgent.resolveProxyURL(url), timeoutAfter(timeoutSeconds * 1000)]);
            if (proxyURL === 'timeout') {
                proxy = { status: 'resolveProxyURL timeout' };
            }
            else if (proxyURL) {
                const httpx = proxyURL.startsWith('https:') ? https.__vscodeOriginal : http.__vscodeOriginal;
                if (httpx) {
                    const result = await Promise.race([proxyConnect(httpx, proxyURL, url, true), (0, async_1.timeout)(timeoutSeconds * 1000)]);
                    if (result) {
                        proxy = { status: 'success', ...result };
                    }
                    else {
                        proxy = { status: 'proxyConnect timeout' };
                    }
                }
                else {
                    proxy = { status: 'no original http/s module' };
                }
            }
            else {
                proxy = { status: 'no proxy' };
            }
        }
        else {
            proxy = { status: 'no resolveProxyURL' };
        }
    }
    catch (err) {
        proxy = { status: 'error', message: sanitizeValue(err?.message) };
    }
    return proxy;
}
const ids_paths = /(^|\b)[\p{L}\p{Nd}]+((=""?[^"]+""?)|(([.:=/"_-]+[\p{L}\p{Nd}]+)+))(\b|$)/giu;
function sanitizeValue(input) {
    return (input || '').replace(ids_paths, (m) => maskByClass(m));
}
function maskByClass(s) {
    if (/^net::[A-Z_]+$/.test(s) || ['dev-container', 'attached-container', 'k8s-container', 'ssh-remote'].includes(s)) {
        return s;
    }
    return s.replace(/\p{Lu}|\p{Ll}|\p{Nd}/gu, (ch) => {
        if (/\p{Lu}/u.test(ch)) {
            return 'A';
        }
        if (/\p{Ll}/u.test(ch)) {
            return 'a';
        }
        return '0';
    });
}
//# sourceMappingURL=loggingActions.js.map