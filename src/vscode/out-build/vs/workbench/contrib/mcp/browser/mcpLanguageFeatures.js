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
import { computeLevenshteinDistance } from '../../../../base/common/diff/diff.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { createMarkdownCommandLink, MarkdownString } from '../../../../base/common/htmlContent.js';
import { findNodeAtLocation, parseTree } from '../../../../base/common/json.js';
import { Disposable, DisposableStore, dispose, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { isEqual } from '../../../../base/common/resources.js';
import { Range } from '../../../../editor/common/core/range.js';
import { ILanguageFeaturesService } from '../../../../editor/common/services/languageFeatures.js';
import { localize } from '../../../../nls.js';
import { IMarkerService, MarkerSeverity } from '../../../../platform/markers/common/markers.js';
import { IConfigurationResolverService } from '../../../services/configurationResolver/common/configurationResolver.js';
import { ConfigurationResolverExpression } from '../../../services/configurationResolver/common/configurationResolverExpression.js';
import { mcpConfigurationSection } from '../common/mcpConfiguration.js';
import { IMcpRegistry } from '../common/mcpRegistryTypes.js';
import { IMcpService, IMcpWorkbenchService } from '../common/mcpTypes.js';
const diagnosticOwner = 'vscode.mcp';
let McpLanguageFeatures = class McpLanguageFeatures extends Disposable {
    constructor(languageFeaturesService, _mcpRegistry, _mcpWorkbenchService, _mcpService, _markerService, _configurationResolverService) {
        super();
        this._mcpRegistry = _mcpRegistry;
        this._mcpWorkbenchService = _mcpWorkbenchService;
        this._mcpService = _mcpService;
        this._markerService = _markerService;
        this._configurationResolverService = _configurationResolverService;
        this._cachedMcpSection = this._register(new MutableDisposable());
        const patterns = [
            { pattern: '**/mcp.json' },
            { pattern: '**/workspace.json' },
        ];
        const onDidChangeCodeLens = this._register(new Emitter());
        const codeLensProvider = {
            onDidChange: onDidChangeCodeLens.event,
            provideCodeLenses: (model, range) => this._provideCodeLenses(model, () => onDidChangeCodeLens.fire(codeLensProvider)),
        };
        this._register(languageFeaturesService.codeLensProvider.register(patterns, codeLensProvider));
        this._register(languageFeaturesService.inlayHintsProvider.register(patterns, {
            onDidChangeInlayHints: _mcpRegistry.onDidChangeInputs,
            provideInlayHints: (model, range) => this._provideInlayHints(model, range),
        }));
    }
    /** Simple mechanism to avoid extra json parsing for hints+lenses */
    async _parseModel(model) {
        if (this._cachedMcpSection.value?.model === model) {
            return this._cachedMcpSection.value;
        }
        const uri = model.uri;
        const inConfig = await this._mcpWorkbenchService.getMcpConfigPath(model.uri);
        if (!inConfig) {
            return undefined;
        }
        const value = model.getValue();
        const tree = parseTree(value);
        const listeners = [
            model.onDidChangeContent(() => this._cachedMcpSection.clear()),
            model.onWillDispose(() => this._cachedMcpSection.clear()),
        ];
        this._addDiagnostics(model, value, tree, inConfig);
        return this._cachedMcpSection.value = {
            model,
            tree,
            inConfig,
            dispose: () => {
                this._markerService.remove(diagnosticOwner, [uri]);
                dispose(listeners);
            }
        };
    }
    _addDiagnostics(tm, value, tree, inConfig) {
        const serversNode = findNodeAtLocation(tree, inConfig.section ? [...inConfig.section, 'servers'] : ['servers']);
        if (!serversNode) {
            return;
        }
        const getClosestMatchingVariable = (name) => {
            let bestValue = '';
            let bestDistance = Infinity;
            for (const variable of this._configurationResolverService.resolvableVariables) {
                const distance = computeLevenshteinDistance(name, variable);
                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestValue = variable;
                }
            }
            return bestValue;
        };
        const diagnostics = [];
        forEachPropertyWithReplacement(serversNode, node => {
            const expr = ConfigurationResolverExpression.parse(node.value);
            for (const { id, name, arg } of expr.unresolved()) {
                if (!this._configurationResolverService.resolvableVariables.has(name)) {
                    const position = value.indexOf(id, node.offset);
                    if (position === -1) {
                        continue;
                    } // unreachable?
                    const start = tm.getPositionAt(position);
                    const end = tm.getPositionAt(position + id.length);
                    diagnostics.push({
                        severity: MarkerSeverity.Warning,
                        message: localize(9666, null, name, getClosestMatchingVariable(name) + (arg ? `:${arg}` : '')),
                        startLineNumber: start.lineNumber,
                        startColumn: start.column,
                        endLineNumber: end.lineNumber,
                        endColumn: end.column,
                        modelVersionId: tm.getVersionId(),
                    });
                }
            }
        });
        if (diagnostics.length) {
            this._markerService.changeOne(diagnosticOwner, tm.uri, diagnostics);
        }
        else {
            this._markerService.remove(diagnosticOwner, [tm.uri]);
        }
    }
    async _provideCodeLenses(model, onDidChangeCodeLens) {
        const parsed = await this._parseModel(model);
        if (!parsed) {
            return undefined;
        }
        const { tree, inConfig } = parsed;
        const serversNode = findNodeAtLocation(tree, inConfig.section ? [...inConfig.section, 'servers'] : ['servers']);
        if (!serversNode) {
            return undefined;
        }
        const store = new DisposableStore();
        const lenses = [];
        const lensList = { lenses, dispose: () => store.dispose() };
        const read = (observable) => {
            store.add(Event.fromObservableLight(observable)(onDidChangeCodeLens));
            return observable.get();
        };
        const collection = read(this._mcpRegistry.collections).find(c => isEqual(c.presentation?.origin, model.uri));
        if (!collection) {
            return lensList;
        }
        const mcpServers = read(this._mcpService.servers).filter(s => s.collection.id === collection.id);
        for (const node of serversNode.children || []) {
            if (node.type !== 'property' || node.children?.[0]?.type !== 'string') {
                continue;
            }
            const name = node.children[0].value;
            const server = mcpServers.find(s => s.definition.label === name);
            if (!server) {
                continue;
            }
            const range = Range.fromPositions(model.getPositionAt(node.children[0].offset));
            const canDebug = !!server.readDefinitions().get().server?.devMode?.debug;
            const state = read(server.connectionState).state;
            switch (state) {
                case 3 /* McpConnectionState.Kind.Error */:
                    lenses.push({
                        range,
                        command: {
                            id: "workbench.mcp.showOutput" /* McpCommandIds.ShowOutput */,
                            title: '$(error) ' + localize(9667, null),
                            arguments: [server.definition.id],
                        },
                    }, {
                        range,
                        command: {
                            id: "workbench.mcp.restartServer" /* McpCommandIds.RestartServer */,
                            title: localize(9668, null),
                            arguments: [server.definition.id, { autoTrustChanges: true }],
                        },
                    });
                    if (canDebug) {
                        lenses.push({
                            range,
                            command: {
                                id: "workbench.mcp.restartServer" /* McpCommandIds.RestartServer */,
                                title: localize(9669, null),
                                arguments: [server.definition.id, { debug: true, autoTrustChanges: true }],
                            },
                        });
                    }
                    break;
                case 1 /* McpConnectionState.Kind.Starting */:
                    lenses.push({
                        range,
                        command: {
                            id: "workbench.mcp.showOutput" /* McpCommandIds.ShowOutput */,
                            title: '$(loading~spin) ' + localize(9670, null),
                            arguments: [server.definition.id],
                        },
                    }, {
                        range,
                        command: {
                            id: "workbench.mcp.stopServer" /* McpCommandIds.StopServer */,
                            title: localize(9671, null),
                            arguments: [server.definition.id],
                        },
                    });
                    break;
                case 2 /* McpConnectionState.Kind.Running */:
                    lenses.push({
                        range,
                        command: {
                            id: "workbench.mcp.showOutput" /* McpCommandIds.ShowOutput */,
                            title: '$(check) ' + localize(9672, null),
                            arguments: [server.definition.id],
                        },
                    }, {
                        range,
                        command: {
                            id: "workbench.mcp.stopServer" /* McpCommandIds.StopServer */,
                            title: localize(9673, null),
                            arguments: [server.definition.id],
                        },
                    }, {
                        range,
                        command: {
                            id: "workbench.mcp.restartServer" /* McpCommandIds.RestartServer */,
                            title: localize(9674, null),
                            arguments: [server.definition.id, { autoTrustChanges: true }],
                        },
                    });
                    if (canDebug) {
                        lenses.push({
                            range,
                            command: {
                                id: "workbench.mcp.restartServer" /* McpCommandIds.RestartServer */,
                                title: localize(9675, null),
                                arguments: [server.definition.id, { autoTrustChanges: true, debug: true }],
                            },
                        });
                    }
                    break;
                case 0 /* McpConnectionState.Kind.Stopped */:
                    lenses.push({
                        range,
                        command: {
                            id: "workbench.mcp.startServer" /* McpCommandIds.StartServer */,
                            title: '$(debug-start) ' + localize(9676, null),
                            arguments: [server.definition.id, { autoTrustChanges: true }],
                        },
                    });
                    if (canDebug) {
                        lenses.push({
                            range,
                            command: {
                                id: "workbench.mcp.startServer" /* McpCommandIds.StartServer */,
                                title: localize(9677, null),
                                arguments: [server.definition.id, { autoTrustChanges: true, debug: true }],
                            },
                        });
                    }
            }
            if (state !== 3 /* McpConnectionState.Kind.Error */) {
                const toolCount = read(server.tools).length;
                if (toolCount) {
                    lenses.push({
                        range,
                        command: {
                            id: '',
                            title: localize(9678, null, toolCount),
                        }
                    });
                }
                const promptCount = read(server.prompts).length;
                if (promptCount) {
                    lenses.push({
                        range,
                        command: {
                            id: "workbench.mcp.startPromptForServer" /* McpCommandIds.StartPromptForServer */,
                            title: localize(9679, null, promptCount),
                            arguments: [server],
                        }
                    });
                }
                lenses.push({
                    range,
                    command: {
                        id: "workbench.mcp.serverOptions" /* McpCommandIds.ServerOptions */,
                        title: localize(9680, null),
                        arguments: [server.definition.id],
                    }
                });
            }
        }
        return lensList;
    }
    async _provideInlayHints(model, range) {
        const parsed = await this._parseModel(model);
        if (!parsed) {
            return undefined;
        }
        const { tree, inConfig } = parsed;
        const mcpSection = inConfig.section ? findNodeAtLocation(tree, [...inConfig.section]) : tree;
        if (!mcpSection) {
            return undefined;
        }
        const inputsNode = findNodeAtLocation(mcpSection, ['inputs']);
        if (!inputsNode) {
            return undefined;
        }
        const inputs = await this._mcpRegistry.getSavedInputs(inConfig.scope);
        const hints = [];
        const serversNode = findNodeAtLocation(mcpSection, ['servers']);
        if (serversNode) {
            annotateServers(serversNode);
        }
        annotateInputs(inputsNode);
        return { hints, dispose: () => { } };
        function annotateServers(servers) {
            forEachPropertyWithReplacement(servers, node => {
                const expr = ConfigurationResolverExpression.parse(node.value);
                for (const { id } of expr.unresolved()) {
                    const saved = inputs[id];
                    if (saved) {
                        pushAnnotation(id, node.offset + node.value.indexOf(id) + id.length, saved);
                    }
                }
            });
        }
        function annotateInputs(node) {
            if (node.type !== 'array' || !node.children) {
                return;
            }
            for (const input of node.children) {
                if (input.type !== 'object' || !input.children) {
                    continue;
                }
                const idProp = input.children.find(c => c.type === 'property' && c.children?.[0].value === 'id');
                if (!idProp) {
                    continue;
                }
                const id = idProp.children[1];
                if (!id || id.type !== 'string' || !id.value) {
                    continue;
                }
                const savedId = '${input:' + id.value + '}';
                const saved = inputs[savedId];
                if (saved) {
                    pushAnnotation(savedId, id.offset + 1 + id.length, saved);
                }
            }
        }
        function pushAnnotation(savedId, offset, saved) {
            const tooltip = new MarkdownString([
                createMarkdownCommandLink({ id: "workbench.mcp.editStoredInput" /* McpCommandIds.EditStoredInput */, title: localize(9681, null), arguments: [savedId, model.uri, mcpConfigurationSection, inConfig.target] }),
                createMarkdownCommandLink({ id: "workbench.mcp.removeStoredInput" /* McpCommandIds.RemoveStoredInput */, title: localize(9682, null), arguments: [inConfig.scope, savedId] }),
                createMarkdownCommandLink({ id: "workbench.mcp.removeStoredInput" /* McpCommandIds.RemoveStoredInput */, title: localize(9683, null), arguments: [inConfig.scope] }),
            ].join(' | '), { isTrusted: true });
            const hint = {
                label: '= ' + (saved.input?.type === 'promptString' && saved.input.password ? '*'.repeat(10) : (saved.value || '')),
                position: model.getPositionAt(offset),
                tooltip,
                paddingLeft: true,
            };
            hints.push(hint);
            return hint;
        }
    }
};
McpLanguageFeatures = __decorate([
    __param(0, ILanguageFeaturesService),
    __param(1, IMcpRegistry),
    __param(2, IMcpWorkbenchService),
    __param(3, IMcpService),
    __param(4, IMarkerService),
    __param(5, IConfigurationResolverService)
], McpLanguageFeatures);
export { McpLanguageFeatures };
function forEachPropertyWithReplacement(node, callback) {
    if (node.type === 'string' && typeof node.value === 'string' && node.value.includes(ConfigurationResolverExpression.VARIABLE_LHS)) {
        callback(node);
    }
    else if (node.type === 'property') {
        // skip the property name
        node.children?.slice(1).forEach(n => forEachPropertyWithReplacement(n, callback));
    }
    else {
        node.children?.forEach(n => forEachPropertyWithReplacement(n, callback));
    }
}
//# sourceMappingURL=mcpLanguageFeatures.js.map