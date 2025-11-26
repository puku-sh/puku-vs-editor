/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { AbstractCommonMcpManagementService } from '../../common/mcpManagementService.js';
import { Event } from '../../../../base/common/event.js';
import { NullLogService } from '../../../log/common/log.js';
class TestMcpManagementService extends AbstractCommonMcpManagementService {
    constructor() {
        super(...arguments);
        this.onInstallMcpServer = Event.None;
        this.onDidInstallMcpServers = Event.None;
        this.onDidUpdateMcpServers = Event.None;
        this.onUninstallMcpServer = Event.None;
        this.onDidUninstallMcpServer = Event.None;
    }
    getInstalled(mcpResource) {
        throw new Error('Method not implemented.');
    }
    install(server, options) {
        throw new Error('Method not implemented.');
    }
    installFromGallery(server, options) {
        throw new Error('Method not implemented.');
    }
    updateMetadata(local, server, profileLocation) {
        throw new Error('Method not implemented.');
    }
    uninstall(server, options) {
        throw new Error('Method not implemented.');
    }
    canInstall(server) {
        throw new Error('Not supported');
    }
}
suite('McpManagementService - getMcpServerConfigurationFromManifest', () => {
    let service;
    setup(() => {
        service = new TestMcpManagementService(new NullLogService());
    });
    teardown(() => {
        service.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('NPM Package Tests', () => {
        test('basic NPM package configuration', () => {
            const manifest = {
                packages: [{
                        registryType: "npm" /* RegistryType.NODE */,
                        registryBaseUrl: 'https://registry.npmjs.org',
                        identifier: '@modelcontextprotocol/server-brave-search',
                        transport: { type: "stdio" /* TransportType.STDIO */ },
                        version: '1.0.2',
                        environmentVariables: [{
                                name: 'BRAVE_API_KEY',
                                value: 'test-key'
                            }]
                    }]
            };
            const result = service.getMcpServerConfigurationFromManifest(manifest, "npm" /* RegistryType.NODE */);
            assert.strictEqual(result.mcpServerConfiguration.config.type, "stdio" /* McpServerType.LOCAL */);
            if (result.mcpServerConfiguration.config.type === "stdio" /* McpServerType.LOCAL */) {
                assert.strictEqual(result.mcpServerConfiguration.config.command, 'npx');
                assert.deepStrictEqual(result.mcpServerConfiguration.config.args, ['@modelcontextprotocol/server-brave-search@1.0.2']);
                assert.deepStrictEqual(result.mcpServerConfiguration.config.env, { 'BRAVE_API_KEY': 'test-key' });
            }
            assert.strictEqual(result.mcpServerConfiguration.inputs, undefined);
        });
        test('NPM package without version', () => {
            const manifest = {
                packages: [{
                        registryType: "npm" /* RegistryType.NODE */,
                        registryBaseUrl: 'https://registry.npmjs.org',
                        identifier: '@modelcontextprotocol/everything',
                        version: '',
                        transport: { type: "stdio" /* TransportType.STDIO */ }
                    }]
            };
            const result = service.getMcpServerConfigurationFromManifest(manifest, "npm" /* RegistryType.NODE */);
            assert.strictEqual(result.mcpServerConfiguration.config.type, "stdio" /* McpServerType.LOCAL */);
            if (result.mcpServerConfiguration.config.type === "stdio" /* McpServerType.LOCAL */) {
                assert.strictEqual(result.mcpServerConfiguration.config.command, 'npx');
                assert.deepStrictEqual(result.mcpServerConfiguration.config.args, ['@modelcontextprotocol/everything']);
            }
        });
        test('NPM package with environment variables containing variables', () => {
            const manifest = {
                packages: [{
                        registryType: "npm" /* RegistryType.NODE */,
                        transport: { type: "stdio" /* TransportType.STDIO */ },
                        identifier: 'test-server',
                        version: '1.0.0',
                        environmentVariables: [{
                                name: 'API_KEY',
                                value: 'key-{api_token}',
                                variables: {
                                    api_token: {
                                        description: 'Your API token',
                                        isSecret: true,
                                        isRequired: true
                                    }
                                }
                            }]
                    }]
            };
            const result = service.getMcpServerConfigurationFromManifest(manifest, "npm" /* RegistryType.NODE */);
            assert.strictEqual(result.mcpServerConfiguration.config.type, "stdio" /* McpServerType.LOCAL */);
            if (result.mcpServerConfiguration.config.type === "stdio" /* McpServerType.LOCAL */) {
                assert.deepStrictEqual(result.mcpServerConfiguration.config.env, { 'API_KEY': 'key-${input:api_token}' });
            }
            assert.strictEqual(result.mcpServerConfiguration.inputs?.length, 1);
            assert.strictEqual(result.mcpServerConfiguration.inputs?.[0].id, 'api_token');
            assert.strictEqual(result.mcpServerConfiguration.inputs?.[0].type, "promptString" /* McpServerVariableType.PROMPT */);
            assert.strictEqual(result.mcpServerConfiguration.inputs?.[0].description, 'Your API token');
            assert.strictEqual(result.mcpServerConfiguration.inputs?.[0].password, true);
        });
        test('environment variable with empty value should create input variable (GitHub issue #266106)', () => {
            const manifest = {
                packages: [{
                        registryType: "npm" /* RegistryType.NODE */,
                        transport: { type: "stdio" /* TransportType.STDIO */ },
                        identifier: '@modelcontextprotocol/server-brave-search',
                        version: '1.0.2',
                        environmentVariables: [{
                                name: 'BRAVE_API_KEY',
                                value: '', // Empty value should create input variable
                                description: 'Brave Search API Key',
                                isRequired: true,
                                isSecret: true
                            }]
                    }]
            };
            const result = service.getMcpServerConfigurationFromManifest(manifest, "npm" /* RegistryType.NODE */);
            // BUG: Currently this creates env with empty string instead of input variable
            // Should create an input variable since no meaningful value is provided
            assert.strictEqual(result.mcpServerConfiguration.inputs?.length, 1);
            assert.strictEqual(result.mcpServerConfiguration.inputs?.[0].id, 'BRAVE_API_KEY');
            assert.strictEqual(result.mcpServerConfiguration.inputs?.[0].description, 'Brave Search API Key');
            assert.strictEqual(result.mcpServerConfiguration.inputs?.[0].password, true);
            assert.strictEqual(result.mcpServerConfiguration.inputs?.[0].type, "promptString" /* McpServerVariableType.PROMPT */);
            // Environment should use input variable interpolation
            if (result.mcpServerConfiguration.config.type === "stdio" /* McpServerType.LOCAL */) {
                assert.deepStrictEqual(result.mcpServerConfiguration.config.env, { 'BRAVE_API_KEY': '${input:BRAVE_API_KEY}' });
            }
        });
        test('environment variable with choices but empty value should create pick input (GitHub issue #266106)', () => {
            const manifest = {
                packages: [{
                        registryType: "npm" /* RegistryType.NODE */,
                        transport: { type: "stdio" /* TransportType.STDIO */ },
                        identifier: 'test-server',
                        version: '1.0.0',
                        environmentVariables: [{
                                name: 'SSL_MODE',
                                value: '', // Empty value should create input variable
                                description: 'SSL connection mode',
                                default: 'prefer',
                                choices: ['disable', 'prefer', 'require']
                            }]
                    }]
            };
            const result = service.getMcpServerConfigurationFromManifest(manifest, "npm" /* RegistryType.NODE */);
            // BUG: Currently this creates env with empty string instead of input variable
            // Should create a pick input variable since choices are provided
            assert.strictEqual(result.mcpServerConfiguration.inputs?.length, 1);
            assert.strictEqual(result.mcpServerConfiguration.inputs?.[0].id, 'SSL_MODE');
            assert.strictEqual(result.mcpServerConfiguration.inputs?.[0].description, 'SSL connection mode');
            assert.strictEqual(result.mcpServerConfiguration.inputs?.[0].default, 'prefer');
            assert.strictEqual(result.mcpServerConfiguration.inputs?.[0].type, "pickString" /* McpServerVariableType.PICK */);
            assert.deepStrictEqual(result.mcpServerConfiguration.inputs?.[0].options, ['disable', 'prefer', 'require']);
            // Environment should use input variable interpolation
            if (result.mcpServerConfiguration.config.type === "stdio" /* McpServerType.LOCAL */) {
                assert.deepStrictEqual(result.mcpServerConfiguration.config.env, { 'SSL_MODE': '${input:SSL_MODE}' });
            }
        });
        test('NPM package with package arguments', () => {
            const manifest = {
                packages: [{
                        registryType: "npm" /* RegistryType.NODE */,
                        transport: { type: "stdio" /* TransportType.STDIO */ },
                        identifier: 'snyk',
                        version: '1.1298.0',
                        packageArguments: [
                            { type: 'positional', value: 'mcp', valueHint: 'command', isRepeated: false },
                            {
                                type: 'named',
                                name: '-t',
                                value: 'stdio',
                                isRepeated: false
                            }
                        ]
                    }]
            };
            const result = service.getMcpServerConfigurationFromManifest(manifest, "npm" /* RegistryType.NODE */);
            assert.strictEqual(result.mcpServerConfiguration.config.type, "stdio" /* McpServerType.LOCAL */);
            if (result.mcpServerConfiguration.config.type === "stdio" /* McpServerType.LOCAL */) {
                assert.deepStrictEqual(result.mcpServerConfiguration.config.args, ['snyk@1.1298.0', 'mcp', '-t', 'stdio']);
            }
        });
    });
    suite('Python Package Tests', () => {
        test('basic Python package configuration', () => {
            const manifest = {
                packages: [{
                        registryType: "pypi" /* RegistryType.PYTHON */,
                        transport: { type: "stdio" /* TransportType.STDIO */ },
                        registryBaseUrl: 'https://pypi.org',
                        identifier: 'weather-mcp-server',
                        version: '0.5.0',
                        environmentVariables: [{
                                name: 'WEATHER_API_KEY',
                                value: 'test-key'
                            }, {
                                name: 'WEATHER_UNITS',
                                value: 'celsius'
                            }]
                    }]
            };
            const result = service.getMcpServerConfigurationFromManifest(manifest, "pypi" /* RegistryType.PYTHON */);
            assert.strictEqual(result.mcpServerConfiguration.config.type, "stdio" /* McpServerType.LOCAL */);
            if (result.mcpServerConfiguration.config.type === "stdio" /* McpServerType.LOCAL */) {
                assert.strictEqual(result.mcpServerConfiguration.config.command, 'uvx');
                assert.deepStrictEqual(result.mcpServerConfiguration.config.args, ['weather-mcp-server==0.5.0']);
                assert.deepStrictEqual(result.mcpServerConfiguration.config.env, {
                    'WEATHER_API_KEY': 'test-key',
                    'WEATHER_UNITS': 'celsius'
                });
            }
        });
        test('Python package without version', () => {
            const manifest = {
                packages: [{
                        registryType: "pypi" /* RegistryType.PYTHON */,
                        transport: { type: "stdio" /* TransportType.STDIO */ },
                        identifier: 'weather-mcp-server',
                        version: ''
                    }]
            };
            const result = service.getMcpServerConfigurationFromManifest(manifest, "pypi" /* RegistryType.PYTHON */);
            if (result.mcpServerConfiguration.config.type === "stdio" /* McpServerType.LOCAL */) {
                assert.deepStrictEqual(result.mcpServerConfiguration.config.args, ['weather-mcp-server']);
            }
        });
    });
    suite('Docker Package Tests', () => {
        test('basic Docker package configuration', () => {
            const manifest = {
                packages: [{
                        registryType: "oci" /* RegistryType.DOCKER */,
                        transport: { type: "stdio" /* TransportType.STDIO */ },
                        registryBaseUrl: 'https://docker.io',
                        identifier: 'mcp/filesystem',
                        version: '1.0.2',
                        runtimeArguments: [{
                                type: 'named',
                                name: '--mount',
                                value: 'type=bind,src=/host/path,dst=/container/path',
                                isRepeated: false
                            }],
                        environmentVariables: [{
                                name: 'LOG_LEVEL',
                                value: 'info'
                            }],
                        packageArguments: [{
                                type: 'positional',
                                value: '/project',
                                valueHint: 'directory',
                                isRepeated: false
                            }]
                    }]
            };
            const result = service.getMcpServerConfigurationFromManifest(manifest, "oci" /* RegistryType.DOCKER */);
            assert.strictEqual(result.mcpServerConfiguration.config.type, "stdio" /* McpServerType.LOCAL */);
            if (result.mcpServerConfiguration.config.type === "stdio" /* McpServerType.LOCAL */) {
                assert.strictEqual(result.mcpServerConfiguration.config.command, 'docker');
                assert.deepStrictEqual(result.mcpServerConfiguration.config.args, [
                    'run', '-i', '--rm',
                    '--mount', 'type=bind,src=/host/path,dst=/container/path',
                    '-e', 'LOG_LEVEL',
                    'mcp/filesystem:1.0.2',
                    '/project'
                ]);
                assert.deepStrictEqual(result.mcpServerConfiguration.config.env, { 'LOG_LEVEL': 'info' });
            }
        });
        test('Docker package with variables in runtime arguments', () => {
            const manifest = {
                packages: [{
                        registryType: "oci" /* RegistryType.DOCKER */,
                        transport: { type: "stdio" /* TransportType.STDIO */ },
                        identifier: 'example/database-manager-mcp',
                        version: '3.1.0',
                        runtimeArguments: [{
                                type: 'named',
                                name: '-e',
                                value: 'DB_TYPE={db_type}',
                                isRepeated: false,
                                variables: {
                                    db_type: {
                                        description: 'Type of database',
                                        choices: ['postgres', 'mysql', 'mongodb', 'redis'],
                                        isRequired: true
                                    }
                                }
                            }]
                    }]
            };
            const result = service.getMcpServerConfigurationFromManifest(manifest, "oci" /* RegistryType.DOCKER */);
            assert.strictEqual(result.mcpServerConfiguration.config.type, "stdio" /* McpServerType.LOCAL */);
            if (result.mcpServerConfiguration.config.type === "stdio" /* McpServerType.LOCAL */) {
                assert.deepStrictEqual(result.mcpServerConfiguration.config.args, [
                    'run', '-i', '--rm',
                    '-e', 'DB_TYPE=${input:db_type}',
                    'example/database-manager-mcp:3.1.0'
                ]);
            }
            assert.strictEqual(result.mcpServerConfiguration.inputs?.length, 1);
            assert.strictEqual(result.mcpServerConfiguration.inputs?.[0].id, 'db_type');
            assert.strictEqual(result.mcpServerConfiguration.inputs?.[0].type, "pickString" /* McpServerVariableType.PICK */);
            assert.deepStrictEqual(result.mcpServerConfiguration.inputs?.[0].options, ['postgres', 'mysql', 'mongodb', 'redis']);
        });
        test('Docker package arguments without values should create input variables (GitHub issue #266106)', () => {
            const manifest = {
                packages: [{
                        registryType: "oci" /* RegistryType.DOCKER */,
                        transport: { type: "stdio" /* TransportType.STDIO */ },
                        identifier: 'example/database-manager-mcp',
                        version: '3.1.0',
                        packageArguments: [{
                                type: 'named',
                                name: '--host',
                                description: 'Database host',
                                default: 'localhost',
                                isRequired: true,
                                isRepeated: false
                                // Note: No 'value' field - should create input variable
                            }, {
                                type: 'positional',
                                valueHint: 'database_name',
                                description: 'Name of the database to connect to',
                                isRequired: true,
                                isRepeated: false
                                // Note: No 'value' field - should create input variable
                            }]
                    }]
            };
            const result = service.getMcpServerConfigurationFromManifest(manifest, "oci" /* RegistryType.DOCKER */);
            // BUG: Currently named args without value are ignored, positional uses value_hint as literal
            // Should create input variables for both arguments
            assert.strictEqual(result.mcpServerConfiguration.inputs?.length, 2);
            const hostInput = result.mcpServerConfiguration.inputs?.find((i) => i.id === 'host');
            assert.strictEqual(hostInput?.description, 'Database host');
            assert.strictEqual(hostInput?.default, 'localhost');
            assert.strictEqual(hostInput?.type, "promptString" /* McpServerVariableType.PROMPT */);
            const dbNameInput = result.mcpServerConfiguration.inputs?.find((i) => i.id === 'database_name');
            assert.strictEqual(dbNameInput?.description, 'Name of the database to connect to');
            assert.strictEqual(dbNameInput?.type, "promptString" /* McpServerVariableType.PROMPT */);
            // Args should use input variable interpolation
            if (result.mcpServerConfiguration.config.type === "stdio" /* McpServerType.LOCAL */) {
                assert.deepStrictEqual(result.mcpServerConfiguration.config.args, [
                    'run', '-i', '--rm',
                    'example/database-manager-mcp:3.1.0',
                    '--host', '${input:host}',
                    '${input:database_name}'
                ]);
            }
        });
        test('Docker Hub backward compatibility', () => {
            const manifest = {
                packages: [{
                        registryType: "oci" /* RegistryType.DOCKER */,
                        identifier: 'example/test-image',
                        transport: { type: "stdio" /* TransportType.STDIO */ },
                        version: '1.0.0'
                    }]
            };
            const result = service.getMcpServerConfigurationFromManifest(manifest, "oci" /* RegistryType.DOCKER */);
            assert.strictEqual(result.mcpServerConfiguration.config.type, "stdio" /* McpServerType.LOCAL */);
            if (result.mcpServerConfiguration.config.type === "stdio" /* McpServerType.LOCAL */) {
                assert.strictEqual(result.mcpServerConfiguration.config.command, 'docker');
                assert.deepStrictEqual(result.mcpServerConfiguration.config.args, [
                    'run', '-i', '--rm',
                    'example/test-image:1.0.0'
                ]);
            }
        });
    });
    suite('NuGet Package Tests', () => {
        test('basic NuGet package configuration', () => {
            const manifest = {
                packages: [{
                        registryType: "nuget" /* RegistryType.NUGET */,
                        transport: { type: "stdio" /* TransportType.STDIO */ },
                        registryBaseUrl: 'https://api.nuget.org',
                        identifier: 'Knapcode.SampleMcpServer',
                        version: '0.5.0',
                        environmentVariables: [{
                                name: 'WEATHER_CHOICES',
                                value: 'sunny,cloudy,rainy'
                            }]
                    }]
            };
            const result = service.getMcpServerConfigurationFromManifest(manifest, "nuget" /* RegistryType.NUGET */);
            assert.strictEqual(result.mcpServerConfiguration.config.type, "stdio" /* McpServerType.LOCAL */);
            if (result.mcpServerConfiguration.config.type === "stdio" /* McpServerType.LOCAL */) {
                assert.strictEqual(result.mcpServerConfiguration.config.command, 'dnx');
                assert.deepStrictEqual(result.mcpServerConfiguration.config.args, ['Knapcode.SampleMcpServer@0.5.0', '--yes']);
                assert.deepStrictEqual(result.mcpServerConfiguration.config.env, { 'WEATHER_CHOICES': 'sunny,cloudy,rainy' });
            }
        });
        test('NuGet package with package arguments', () => {
            const manifest = {
                packages: [{
                        registryType: "nuget" /* RegistryType.NUGET */,
                        transport: { type: "stdio" /* TransportType.STDIO */ },
                        identifier: 'Knapcode.SampleMcpServer',
                        version: '0.4.0-beta',
                        packageArguments: [{
                                type: 'positional',
                                value: 'mcp',
                                valueHint: 'command',
                                isRepeated: false
                            }, {
                                type: 'positional',
                                value: 'start',
                                valueHint: 'action',
                                isRepeated: false
                            }]
                    }]
            };
            const result = service.getMcpServerConfigurationFromManifest(manifest, "nuget" /* RegistryType.NUGET */);
            if (result.mcpServerConfiguration.config.type === "stdio" /* McpServerType.LOCAL */) {
                assert.deepStrictEqual(result.mcpServerConfiguration.config.args, [
                    'Knapcode.SampleMcpServer@0.4.0-beta',
                    '--yes',
                    '--',
                    'mcp',
                    'start'
                ]);
            }
        });
    });
    suite('Remote Server Tests', () => {
        test('SSE remote server configuration', () => {
            const manifest = {
                remotes: [{
                        type: "sse" /* TransportType.SSE */,
                        url: 'http://mcp-fs.anonymous.modelcontextprotocol.io/sse'
                    }]
            };
            const result = service.getMcpServerConfigurationFromManifest(manifest, "remote" /* RegistryType.REMOTE */);
            assert.strictEqual(result.mcpServerConfiguration.config.type, "http" /* McpServerType.REMOTE */);
            if (result.mcpServerConfiguration.config.type === "http" /* McpServerType.REMOTE */) {
                assert.strictEqual(result.mcpServerConfiguration.config.url, 'http://mcp-fs.anonymous.modelcontextprotocol.io/sse');
                assert.strictEqual(result.mcpServerConfiguration.config.headers, undefined);
            }
        });
        test('SSE remote server with headers and variables', () => {
            const manifest = {
                remotes: [{
                        type: "sse" /* TransportType.SSE */,
                        url: 'https://mcp.anonymous.modelcontextprotocol.io/sse',
                        headers: [{
                                name: 'X-API-Key',
                                value: '{api_key}',
                                variables: {
                                    api_key: {
                                        description: 'API key for authentication',
                                        isRequired: true,
                                        isSecret: true
                                    }
                                }
                            }, {
                                name: 'X-Region',
                                value: 'us-east-1'
                            }]
                    }]
            };
            const result = service.getMcpServerConfigurationFromManifest(manifest, "remote" /* RegistryType.REMOTE */);
            assert.strictEqual(result.mcpServerConfiguration.config.type, "http" /* McpServerType.REMOTE */);
            if (result.mcpServerConfiguration.config.type === "http" /* McpServerType.REMOTE */) {
                assert.deepStrictEqual(result.mcpServerConfiguration.config.headers, {
                    'X-API-Key': '${input:api_key}',
                    'X-Region': 'us-east-1'
                });
            }
            assert.strictEqual(result.mcpServerConfiguration.inputs?.length, 1);
            assert.strictEqual(result.mcpServerConfiguration.inputs?.[0].id, 'api_key');
            assert.strictEqual(result.mcpServerConfiguration.inputs?.[0].password, true);
        });
        test('streamable HTTP remote server', () => {
            const manifest = {
                remotes: [{
                        type: "streamable-http" /* TransportType.STREAMABLE_HTTP */,
                        url: 'https://mcp.anonymous.modelcontextprotocol.io/http'
                    }]
            };
            const result = service.getMcpServerConfigurationFromManifest(manifest, "remote" /* RegistryType.REMOTE */);
            assert.strictEqual(result.mcpServerConfiguration.config.type, "http" /* McpServerType.REMOTE */);
            if (result.mcpServerConfiguration.config.type === "http" /* McpServerType.REMOTE */) {
                assert.strictEqual(result.mcpServerConfiguration.config.url, 'https://mcp.anonymous.modelcontextprotocol.io/http');
            }
        });
        test('remote headers without values should create input variables', () => {
            const manifest = {
                remotes: [{
                        type: "sse" /* TransportType.SSE */,
                        url: 'https://api.example.com/mcp',
                        headers: [{
                                name: 'Authorization',
                                description: 'API token for authentication',
                                isSecret: true,
                                isRequired: true
                                // Note: No 'value' field - should create input variable
                            }, {
                                name: 'X-Custom-Header',
                                description: 'Custom header value',
                                default: 'default-value',
                                choices: ['option1', 'option2', 'option3']
                                // Note: No 'value' field - should create input variable with choices
                            }]
                    }]
            };
            const result = service.getMcpServerConfigurationFromManifest(manifest, "remote" /* RegistryType.REMOTE */);
            assert.strictEqual(result.mcpServerConfiguration.config.type, "http" /* McpServerType.REMOTE */);
            if (result.mcpServerConfiguration.config.type === "http" /* McpServerType.REMOTE */) {
                assert.strictEqual(result.mcpServerConfiguration.config.url, 'https://api.example.com/mcp');
                assert.deepStrictEqual(result.mcpServerConfiguration.config.headers, {
                    'Authorization': '${input:Authorization}',
                    'X-Custom-Header': '${input:X-Custom-Header}'
                });
            }
            // Should create input variables for headers without values
            assert.strictEqual(result.mcpServerConfiguration.inputs?.length, 2);
            const authInput = result.mcpServerConfiguration.inputs?.find((i) => i.id === 'Authorization');
            assert.strictEqual(authInput?.description, 'API token for authentication');
            assert.strictEqual(authInput?.password, true);
            assert.strictEqual(authInput?.type, "promptString" /* McpServerVariableType.PROMPT */);
            const customInput = result.mcpServerConfiguration.inputs?.find((i) => i.id === 'X-Custom-Header');
            assert.strictEqual(customInput?.description, 'Custom header value');
            assert.strictEqual(customInput?.default, 'default-value');
            assert.strictEqual(customInput?.type, "pickString" /* McpServerVariableType.PICK */);
            assert.deepStrictEqual(customInput?.options, ['option1', 'option2', 'option3']);
        });
    });
    suite('Variable Interpolation Tests', () => {
        test('multiple variables in single value', () => {
            const manifest = {
                packages: [{
                        registryType: "npm" /* RegistryType.NODE */,
                        identifier: 'test-server',
                        transport: { type: "stdio" /* TransportType.STDIO */ },
                        version: '1.0.0',
                        environmentVariables: [{
                                name: 'CONNECTION_STRING',
                                value: 'server={host};port={port};database={db_name}',
                                variables: {
                                    host: {
                                        description: 'Database host',
                                        default: 'localhost'
                                    },
                                    port: {
                                        description: 'Database port',
                                        format: 'number',
                                        default: '5432'
                                    },
                                    db_name: {
                                        description: 'Database name',
                                        isRequired: true
                                    }
                                }
                            }]
                    }]
            };
            const result = service.getMcpServerConfigurationFromManifest(manifest, "npm" /* RegistryType.NODE */);
            if (result.mcpServerConfiguration.config.type === "stdio" /* McpServerType.LOCAL */) {
                assert.deepStrictEqual(result.mcpServerConfiguration.config.env, {
                    'CONNECTION_STRING': 'server=${input:host};port=${input:port};database=${input:db_name}'
                });
            }
            assert.strictEqual(result.mcpServerConfiguration.inputs?.length, 3);
            const hostInput = result.mcpServerConfiguration.inputs?.find((i) => i.id === 'host');
            assert.strictEqual(hostInput?.default, 'localhost');
            assert.strictEqual(hostInput?.type, "promptString" /* McpServerVariableType.PROMPT */);
            const portInput = result.mcpServerConfiguration.inputs?.find((i) => i.id === 'port');
            assert.strictEqual(portInput?.default, '5432');
            const dbNameInput = result.mcpServerConfiguration.inputs?.find((i) => i.id === 'db_name');
            assert.strictEqual(dbNameInput?.description, 'Database name');
        });
        test('variable with choices creates pick input', () => {
            const manifest = {
                packages: [{
                        registryType: "npm" /* RegistryType.NODE */,
                        identifier: 'test-server',
                        transport: { type: "stdio" /* TransportType.STDIO */ },
                        version: '1.0.0',
                        runtimeArguments: [{
                                type: 'named',
                                name: '--log-level',
                                value: '{level}',
                                isRepeated: false,
                                variables: {
                                    level: {
                                        description: 'Log level',
                                        choices: ['debug', 'info', 'warn', 'error'],
                                        default: 'info'
                                    }
                                }
                            }]
                    }]
            };
            const result = service.getMcpServerConfigurationFromManifest(manifest, "npm" /* RegistryType.NODE */);
            assert.strictEqual(result.mcpServerConfiguration.inputs?.length, 1);
            assert.strictEqual(result.mcpServerConfiguration.inputs?.[0].type, "pickString" /* McpServerVariableType.PICK */);
            assert.deepStrictEqual(result.mcpServerConfiguration.inputs?.[0].options, ['debug', 'info', 'warn', 'error']);
            assert.strictEqual(result.mcpServerConfiguration.inputs?.[0].default, 'info');
        });
        test('variables in package arguments', () => {
            const manifest = {
                packages: [{
                        registryType: "oci" /* RegistryType.DOCKER */,
                        identifier: 'test-image',
                        transport: { type: "stdio" /* TransportType.STDIO */ },
                        version: '1.0.0',
                        packageArguments: [{
                                type: 'named',
                                name: '--host',
                                value: '{db_host}',
                                isRepeated: false,
                                variables: {
                                    db_host: {
                                        description: 'Database host',
                                        default: 'localhost'
                                    }
                                }
                            }, {
                                type: 'positional',
                                value: '{database_name}',
                                valueHint: 'database_name',
                                isRepeated: false,
                                variables: {
                                    database_name: {
                                        description: 'Name of the database to connect to',
                                        isRequired: true
                                    }
                                }
                            }]
                    }]
            };
            const result = service.getMcpServerConfigurationFromManifest(manifest, "oci" /* RegistryType.DOCKER */);
            if (result.mcpServerConfiguration.config.type === "stdio" /* McpServerType.LOCAL */) {
                assert.deepStrictEqual(result.mcpServerConfiguration.config.args, [
                    'run', '-i', '--rm',
                    'test-image:1.0.0',
                    '--host', '${input:db_host}',
                    '${input:database_name}'
                ]);
            }
            assert.strictEqual(result.mcpServerConfiguration.inputs?.length, 2);
        });
        test('positional arguments with value_hint should create input variables (GitHub issue #266106)', () => {
            const manifest = {
                packages: [{
                        registryType: "npm" /* RegistryType.NODE */,
                        identifier: '@example/math-tool',
                        transport: { type: "stdio" /* TransportType.STDIO */ },
                        version: '2.0.1',
                        packageArguments: [{
                                type: 'positional',
                                valueHint: 'calculation_type',
                                description: 'Type of calculation to enable',
                                isRequired: true,
                                isRepeated: false
                                // Note: No 'value' field, only value_hint - should create input variable
                            }]
                    }]
            };
            const result = service.getMcpServerConfigurationFromManifest(manifest, "npm" /* RegistryType.NODE */);
            // BUG: Currently value_hint is used as literal value instead of creating input variable
            // Should create input variable instead
            assert.strictEqual(result.mcpServerConfiguration.inputs?.length, 1);
            assert.strictEqual(result.mcpServerConfiguration.inputs?.[0].id, 'calculation_type');
            assert.strictEqual(result.mcpServerConfiguration.inputs?.[0].description, 'Type of calculation to enable');
            assert.strictEqual(result.mcpServerConfiguration.inputs?.[0].type, "promptString" /* McpServerVariableType.PROMPT */);
            // Args should use input variable interpolation
            if (result.mcpServerConfiguration.config.type === "stdio" /* McpServerType.LOCAL */) {
                assert.deepStrictEqual(result.mcpServerConfiguration.config.args, [
                    '@example/math-tool@2.0.1',
                    '${input:calculation_type}'
                ]);
            }
        });
    });
    suite('Edge Cases and Error Handling', () => {
        test('empty manifest should throw error', () => {
            const manifest = {};
            assert.throws(() => {
                service.getMcpServerConfigurationFromManifest(manifest, "npm" /* RegistryType.NODE */);
            }, /No server package found/);
        });
        test('manifest with no matching package type should use first package', () => {
            const manifest = {
                packages: [{
                        registryType: "pypi" /* RegistryType.PYTHON */,
                        transport: { type: "stdio" /* TransportType.STDIO */ },
                        identifier: 'python-server',
                        version: '1.0.0'
                    }]
            };
            const result = service.getMcpServerConfigurationFromManifest(manifest, "npm" /* RegistryType.NODE */);
            assert.strictEqual(result.mcpServerConfiguration.config.type, "stdio" /* McpServerType.LOCAL */);
            if (result.mcpServerConfiguration.config.type === "stdio" /* McpServerType.LOCAL */) {
                assert.strictEqual(result.mcpServerConfiguration.config.command, 'uvx'); // Python command since that's the package type
                assert.deepStrictEqual(result.mcpServerConfiguration.config.args, ['python-server==1.0.0']);
            }
        });
        test('manifest with matching package type should use that package', () => {
            const manifest = {
                packages: [{
                        registryType: "pypi" /* RegistryType.PYTHON */,
                        transport: { type: "stdio" /* TransportType.STDIO */ },
                        identifier: 'python-server',
                        version: '1.0.0'
                    }, {
                        registryType: "npm" /* RegistryType.NODE */,
                        transport: { type: "stdio" /* TransportType.STDIO */ },
                        identifier: 'node-server',
                        version: '2.0.0'
                    }]
            };
            const result = service.getMcpServerConfigurationFromManifest(manifest, "npm" /* RegistryType.NODE */);
            if (result.mcpServerConfiguration.config.type === "stdio" /* McpServerType.LOCAL */) {
                assert.strictEqual(result.mcpServerConfiguration.config.command, 'npx');
                assert.deepStrictEqual(result.mcpServerConfiguration.config.args, ['node-server@2.0.0']);
            }
        });
        test('undefined environment variables should be omitted', () => {
            const manifest = {
                packages: [{
                        registryType: "npm" /* RegistryType.NODE */,
                        transport: { type: "stdio" /* TransportType.STDIO */ },
                        identifier: 'test-server',
                        version: '1.0.0'
                    }]
            };
            const result = service.getMcpServerConfigurationFromManifest(manifest, "npm" /* RegistryType.NODE */);
            if (result.mcpServerConfiguration.config.type === "stdio" /* McpServerType.LOCAL */) {
                assert.strictEqual(result.mcpServerConfiguration.config.env, undefined);
            }
        });
        test('named argument without value should only add name', () => {
            const manifest = {
                packages: [{
                        registryType: "npm" /* RegistryType.NODE */,
                        transport: { type: "stdio" /* TransportType.STDIO */ },
                        identifier: 'test-server',
                        version: '1.0.0',
                        runtimeArguments: [{
                                type: 'named',
                                name: '--verbose',
                                isRepeated: false
                            }]
                    }]
            };
            const result = service.getMcpServerConfigurationFromManifest(manifest, "npm" /* RegistryType.NODE */);
            if (result.mcpServerConfiguration.config.type === "stdio" /* McpServerType.LOCAL */) {
                assert.deepStrictEqual(result.mcpServerConfiguration.config.args, ['--verbose', 'test-server@1.0.0']);
            }
        });
        test('positional argument with undefined value should use value_hint', () => {
            const manifest = {
                packages: [{
                        registryType: "npm" /* RegistryType.NODE */,
                        identifier: 'test-server',
                        transport: { type: "stdio" /* TransportType.STDIO */ },
                        version: '1.0.0',
                        packageArguments: [{
                                type: 'positional',
                                valueHint: 'target_directory',
                                isRepeated: false
                            }]
                    }]
            };
            const result = service.getMcpServerConfigurationFromManifest(manifest, "npm" /* RegistryType.NODE */);
            if (result.mcpServerConfiguration.config.type === "stdio" /* McpServerType.LOCAL */) {
                assert.deepStrictEqual(result.mcpServerConfiguration.config.args, ['test-server@1.0.0', 'target_directory']);
            }
        });
        test('named argument with no name should generate notice', () => {
            const manifest = {
                packages: [{
                        registryType: "npm" /* RegistryType.NODE */,
                        identifier: 'test-server',
                        transport: { type: "stdio" /* TransportType.STDIO */ },
                        version: '1.0.0',
                        runtimeArguments: [{
                                type: 'named',
                                value: 'some-value',
                                isRepeated: false
                            }]
                    }]
            };
            const result = service.getMcpServerConfigurationFromManifest(manifest, "npm" /* RegistryType.NODE */);
            // Should generate a notice about the missing name
            assert.strictEqual(result.notices.length, 1);
            assert.ok(result.notices[0].includes('Named argument is missing a name'));
            assert.ok(result.notices[0].includes('some-value')); // Should include the argument details in JSON format
            if (result.mcpServerConfiguration.config.type === "stdio" /* McpServerType.LOCAL */) {
                assert.deepStrictEqual(result.mcpServerConfiguration.config.args, ['test-server@1.0.0']);
            }
        });
        test('named argument with empty name should generate notice', () => {
            const manifest = {
                packages: [{
                        registryType: "npm" /* RegistryType.NODE */,
                        identifier: 'test-server',
                        transport: { type: "stdio" /* TransportType.STDIO */ },
                        version: '1.0.0',
                        runtimeArguments: [{
                                type: 'named',
                                name: '',
                                value: 'some-value',
                                isRepeated: false
                            }]
                    }]
            };
            const result = service.getMcpServerConfigurationFromManifest(manifest, "npm" /* RegistryType.NODE */);
            // Should generate a notice about the missing name
            assert.strictEqual(result.notices.length, 1);
            assert.ok(result.notices[0].includes('Named argument is missing a name'));
            assert.ok(result.notices[0].includes('some-value')); // Should include the argument details in JSON format
            if (result.mcpServerConfiguration.config.type === "stdio" /* McpServerType.LOCAL */) {
                assert.deepStrictEqual(result.mcpServerConfiguration.config.args, ['test-server@1.0.0']);
            }
        });
    });
    suite('Variable Processing Order', () => {
        test('should use explicit variables instead of auto-generating when both are possible', () => {
            const manifest = {
                packages: [{
                        registryType: "npm" /* RegistryType.NODE */,
                        identifier: 'test-server',
                        transport: { type: "stdio" /* TransportType.STDIO */ },
                        version: '1.0.0',
                        environmentVariables: [{
                                name: 'API_KEY',
                                value: 'Bearer {api_key}',
                                description: 'Should not be used', // This should be ignored since we have explicit variables
                                variables: {
                                    api_key: {
                                        description: 'Your API key',
                                        isSecret: true
                                    }
                                }
                            }]
                    }]
            };
            const result = service.getMcpServerConfigurationFromManifest(manifest, "npm" /* RegistryType.NODE */);
            assert.strictEqual(result.mcpServerConfiguration.inputs?.length, 1);
            assert.strictEqual(result.mcpServerConfiguration.inputs?.[0].id, 'api_key');
            assert.strictEqual(result.mcpServerConfiguration.inputs?.[0].description, 'Your API key');
            assert.strictEqual(result.mcpServerConfiguration.inputs?.[0].password, true);
            if (result.mcpServerConfiguration.config.type === "stdio" /* McpServerType.LOCAL */) {
                assert.strictEqual(result.mcpServerConfiguration.config.env?.['API_KEY'], 'Bearer ${input:api_key}');
            }
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwTWFuYWdlbWVudFNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhaGFtZWQvRGVza3RvcC9wdWt1LXZzLWVkaXRvci9wdWt1LWVkaXRvci9zcmMvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL21jcC90ZXN0L2NvbW1vbi9tY3BNYW5hZ2VtZW50U2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRyxPQUFPLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUkxRixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFekQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBRTVELE1BQU0sd0JBQXlCLFNBQVEsa0NBQWtDO0lBQXpFOztRQUVVLHVCQUFrQixHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUM7UUFDaEMsMkJBQXNCLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQztRQUNwQywwQkFBcUIsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDO1FBQ25DLHlCQUFvQixHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUM7UUFDbEMsNEJBQXVCLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQztJQXFCL0MsQ0FBQztJQW5CUyxZQUFZLENBQUMsV0FBaUI7UUFDdEMsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0lBQzVDLENBQUM7SUFDUSxPQUFPLENBQUMsTUFBNkIsRUFBRSxPQUF3QjtRQUN2RSxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUM7SUFDNUMsQ0FBQztJQUNRLGtCQUFrQixDQUFDLE1BQXlCLEVBQUUsT0FBd0I7UUFDOUUsTUFBTSxJ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