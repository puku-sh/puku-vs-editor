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
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { CancellationError } from '../../../../base/common/errors.js';
import { Disposable, DisposableStore, MutableDisposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { autorun, observableValue } from '../../../../base/common/observable.js';
import { localize } from '../../../../nls.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { log, LogLevel } from '../../../../platform/log/common/log.js';
import { McpServerRequestHandler } from './mcpServerRequestHandler.js';
import { McpConnectionState } from './mcpTypes.js';
let McpServerConnection = class McpServerConnection extends Disposable {
    constructor(_collection, definition, _delegate, launchDefinition, _logger, _errorOnUserInteraction, _instantiationService) {
        super();
        this._collection = _collection;
        this.definition = definition;
        this._delegate = _delegate;
        this.launchDefinition = launchDefinition;
        this._logger = _logger;
        this._errorOnUserInteraction = _errorOnUserInteraction;
        this._instantiationService = _instantiationService;
        this._launch = this._register(new MutableDisposable());
        this._state = observableValue('mcpServerState', { state: 0 /* McpConnectionState.Kind.Stopped */ });
        this._requestHandler = observableValue('mcpServerRequestHandler', undefined);
        this.state = this._state;
        this.handler = this._requestHandler;
    }
    /** @inheritdoc */
    async start(methods) {
        const currentState = this._state.get();
        if (!McpConnectionState.canBeStarted(currentState.state)) {
            return this._waitForState(2 /* McpConnectionState.Kind.Running */, 3 /* McpConnectionState.Kind.Error */);
        }
        this._launch.value = undefined;
        this._state.set({ state: 1 /* McpConnectionState.Kind.Starting */ }, undefined);
        this._logger.info(localize('mcpServer.starting', 'Starting server {0}', this.definition.label));
        try {
            const launch = this._delegate.start(this._collection, this.definition, this.launchDefinition, { errorOnUserInteraction: this._errorOnUserInteraction });
            this._launch.value = this.adoptLaunch(launch, methods);
            return this._waitForState(2 /* McpConnectionState.Kind.Running */, 3 /* McpConnectionState.Kind.Error */);
        }
        catch (e) {
            const errorState = {
                state: 3 /* McpConnectionState.Kind.Error */,
                message: e instanceof Error ? e.message : String(e)
            };
            this._state.set(errorState, undefined);
            return errorState;
        }
    }
    adoptLaunch(launch, methods) {
        const store = new DisposableStore();
        const cts = new CancellationTokenSource();
        store.add(toDisposable(() => cts.dispose(true)));
        store.add(launch);
        store.add(launch.onDidLog(({ level, message }) => {
            log(this._logger, level, message);
        }));
        let didStart = false;
        store.add(autorun(reader => {
            const state = launch.state.read(reader);
            this._state.set(state, undefined);
            this._logger.info(localize('mcpServer.state', 'Connection state: {0}', McpConnectionState.toString(state)));
            if (state.state === 2 /* McpConnectionState.Kind.Running */ && !didStart) {
                didStart = true;
                McpServerRequestHandler.create(this._instantiationService, {
                    launch,
                    logger: this._logger,
                    requestLogLevel: this.definition.devMode ? LogLevel.Info : LogLevel.Debug,
                    ...methods,
                }, cts.token).then(handler => {
                    if (!store.isDisposed) {
                        this._requestHandler.set(handler, undefined);
                    }
                    else {
                        handler.dispose();
                    }
                }, err => {
                    if (!store.isDisposed && McpConnectionState.isRunning(this._state.read(undefined))) {
                        let message = err.message;
                        if (err instanceof CancellationError) {
                            message = 'Server exited before responding to `initialize` request.';
                            this._logger.error(message);
                        }
                        else {
                            this._logger.error(err);
                        }
                        this._state.set({ state: 3 /* McpConnectionState.Kind.Error */, message }, undefined);
                    }
                    store.dispose();
                });
            }
        }));
        return { dispose: () => store.dispose(), object: launch };
    }
    async stop() {
        this._logger.info(localize('mcpServer.stopping', 'Stopping server {0}', this.definition.label));
        this._launch.value?.object.stop();
        await this._waitForState(0 /* McpConnectionState.Kind.Stopped */, 3 /* McpConnectionState.Kind.Error */);
    }
    dispose() {
        this._requestHandler.get()?.dispose();
        super.dispose();
        this._state.set({ state: 0 /* McpConnectionState.Kind.Stopped */ }, undefined);
    }
    _waitForState(...kinds) {
        const current = this._state.get();
        if (kinds.includes(current.state)) {
            return Promise.resolve(current);
        }
        return new Promise(resolve => {
            const disposable = autorun(reader => {
                const state = this._state.read(reader);
                if (kinds.includes(state.state)) {
                    disposable.dispose();
                    resolve(state);
                }
            });
        });
    }
};
McpServerConnection = __decorate([
    __param(6, IInstantiationService)
], McpServerConnection);
export { McpServerConnection };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwU2VydmVyQ29ubmVjdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhaGFtZWQvRGVza3RvcC9wdWt1LXZzLWVkaXRvci9wdWt1LWVkaXRvci9zcmMvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21jcC9jb21tb24vbWNwU2VydmVyQ29ubmVjdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNsRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBYyxpQkFBaUIsRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNoSSxPQUFPLEVBQUUsT0FBTyxFQUFlLGVBQWUsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQzlGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQVcsR0FBRyxFQUFFLFFBQVEsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBRWhGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3ZFLE9BQU8sRUFBb0Usa0JBQWtCLEVBQXdDLE1BQU0sZUFBZSxDQUFDO0FBRXBKLElBQU0sbUJBQW1CLEdBQXpCLE1BQU0sbUJBQW9CLFNBQVEsVUFBVTtJQVFsRCxZQUNrQixXQUFvQyxFQUNyQyxVQUErQixFQUM5QixTQUEyQixFQUM1QixnQkFBaUMsRUFDaEMsT0FBZ0IsRUFDaEIsdUJBQTRDLEVBQ3RDLHFCQUE2RDtRQUVwRixLQUFLLEVBQUUsQ0FBQztRQVJTLGdCQUFXLEdBQVgsV0FBVyxDQUF5QjtRQUNyQyxlQUFVLEdBQVYs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