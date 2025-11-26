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
import { Codicon } from '../../../../base/common/codicons.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { randomPort } from '../../../../base/common/ports.js';
import * as nls from '../../../../nls.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { Action2, MenuId } from '../../../../platform/actions/common/actions.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IProgressService } from '../../../../platform/progress/common/progress.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ActiveEditorContext } from '../../../common/contextkeys.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { IDebugService } from '../../debug/common/debug.js';
import { RuntimeExtensionsEditor } from './runtimeExtensionsEditor.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
export class DebugExtensionHostInDevToolsAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.extensions.action.devtoolsExtensionHost',
            title: nls.localize2(8563, 'Debug Extension Host In Dev Tools'),
            category: Categories.Developer,
            f1: true,
            icon: Codicon.debugStart,
        });
    }
    async run(accessor) {
        const extensionService = accessor.get(IExtensionService);
        const nativeHostService = accessor.get(INativeHostService);
        const quickInputService = accessor.get(IQuickInputService);
        const inspectPorts = await extensionService.getInspectPorts(1 /* ExtensionHostKind.LocalProcess */, true);
        if (inspectPorts.length === 0) {
            console.log('[devtoolsExtensionHost] No extension host inspect ports found.');
            return;
        }
        const items = inspectPorts.filter(portInfo => portInfo.devtoolsUrl).map(portInfo => ({
            label: portInfo.devtoolsLabel ?? `${portInfo.host}:${portInfo.port}`,
            detail: `${portInfo.host}:${portInfo.port}`,
            portInfo: portInfo
        }));
        if (items.length === 1) {
            const portInfo = items[0].portInfo;
            nativeHostService.openDevToolsWindow(portInfo.devtoolsUrl);
            return;
        }
        const selected = await quickInputService.pick(items, {
            placeHolder: nls.localize(8557, null),
            matchOnDetail: true,
        });
        if (selected) {
            const portInfo = selected.portInfo;
            nativeHostService.openDevToolsWindow(portInfo.devtoolsUrl);
        }
    }
}
export class DebugExtensionHostInNewWindowAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.extensions.action.debugExtensionHost',
            title: nls.localize2(8564, "Debug Extension Host In New Window"),
            category: Categories.Developer,
            f1: true,
            icon: Codicon.debugStart,
            menu: {
                id: MenuId.EditorTitle,
                when: ActiveEditorContext.isEqualTo(RuntimeExtensionsEditor.ID),
                group: 'navigation',
            }
        });
    }
    run(accessor) {
        const nativeHostService = accessor.get(INativeHostService);
        const dialogService = accessor.get(IDialogService);
        const extensionService = accessor.get(IExtensionService);
        const productService = accessor.get(IProductService);
        const instantiationService = accessor.get(IInstantiationService);
        const hostService = accessor.get(IHostService);
        extensionService.getInspectPorts(1 /* ExtensionHostKind.LocalProcess */, false).then(async (inspectPorts) => {
            if (inspectPorts.length === 0) {
                const res = await dialogService.confirm({
                    message: nls.localize(8558, null),
                    detail: nls.localize(8559, null, productService.nameLong),
                    primaryButton: nls.localize(8560, null)
                });
                if (res.confirmed) {
                    await nativeHostService.relaunch({ addArgs: [`--inspect-extensions=${randomPort()}`] });
                }
                return;
            }
            if (inspectPorts.length > 1) {
                // TODO
                console.warn(`There are multiple extension hosts available for debugging. Picking the first one...`);
            }
            const s = instantiationService.createInstance(Storage);
            s.storeDebugOnNewWindow(inspectPorts[0].port);
            hostService.openWindow();
        });
    }
}
let Storage = class Storage {
    constructor(_storageService) {
        this._storageService = _storageService;
    }
    storeDebugOnNewWindow(targetPort) {
        this._storageService.store('debugExtensionHost.debugPort', targetPort, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
    }
    getAndDeleteDebugPortIfSet() {
        const port = this._storageService.getNumber('debugExtensionHost.debugPort', -1 /* StorageScope.APPLICATION */);
        if (port !== undefined) {
            this._storageService.remove('debugExtensionHost.debugPort', -1 /* StorageScope.APPLICATION */);
        }
        return port;
    }
};
Storage = __decorate([
    __param(0, IStorageService)
], Storage);
let DebugExtensionsContribution = class DebugExtensionsContribution extends Disposable {
    constructor(_debugService, _instantiationService, _progressService) {
        super();
        this._debugService = _debugService;
        this._instantiationService = _instantiationService;
        const storage = this._instantiationService.createInstance(Storage);
        const port = storage.getAndDeleteDebugPortIfSet();
        if (port !== undefined) {
            _progressService.withProgress({
                location: 15 /* ProgressLocation.Notification */,
                title: nls.localize(8561, null),
            }, async (p) => {
                // eslint-disable-next-line local/code-no-dangerous-type-assertions
                await this._debugService.startDebugging(undefined, {
                    type: 'node',
                    name: nls.localize(8562, null),
                    request: 'attach',
                    port,
                    trace: true,
                    // resolve source maps everywhere:
                    resolveSourceMapLocations: null,
                    // announces sources eagerly for the loaded scripts view:
                    eagerSources: true,
                    // source maps of published VS Code are on the CDN and can take a while to load
                    timeouts: {
                        sourceMapMinPause: 30_000,
                        sourceMapCumulativePause: 300_000,
                    },
                });
            });
        }
    }
};
DebugExtensionsContribution = __decorate([
    __param(0, IDebugService),
    __param(1, IInstantiationService),
    __param(2, IProgressService)
], DebugExtensionsContribution);
export { DebugExtensionsContribution };
//# sourceMappingURL=debugExtensionHostAction.js.map