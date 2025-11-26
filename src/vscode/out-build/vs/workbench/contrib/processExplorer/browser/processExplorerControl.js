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
import './media/processExplorer.css';
import { localize } from '../../../../nls.js';
import { $, append, getDocument } from '../../../../base/browser/dom.js';
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import { isRemoteDiagnosticError } from '../../../../platform/diagnostics/common/diagnostics.js';
import { ByteSize } from '../../../../platform/files/common/files.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { WorkbenchDataTree } from '../../../../platform/list/browser/listService.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { Separator, toAction } from '../../../../base/common/actions.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { coalesce } from '../../../../base/common/arrays.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { RenderIndentGuides } from '../../../../base/browser/ui/tree/abstractTree.js';
import { Delayer } from '../../../../base/common/async.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { IRemoteAgentService } from '../../../services/remote/common/remoteAgentService.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { Schemas } from '../../../../base/common/network.js';
import { isWeb } from '../../../../base/common/platform.js';
const DEBUG_FLAGS_PATTERN = /\s--inspect(?:-brk|port)?=(?<port>\d+)?/;
const DEBUG_PORT_PATTERN = /\s--inspect-port=(?<port>\d+)/;
function isMachineProcessInformation(item) {
    const candidate = item;
    return !!candidate?.name && !!candidate?.rootProcess;
}
function isProcessInformation(item) {
    const candidate = item;
    return !!candidate?.processRoots;
}
function isProcessItem(item) {
    const candidate = item;
    return typeof candidate?.pid === 'number';
}
class ProcessListDelegate {
    getHeight() {
        return 22;
    }
    getTemplateId(element) {
        if (isProcessItem(element)) {
            return 'process';
        }
        if (isMachineProcessInformation(element)) {
            return 'machine';
        }
        if (isRemoteDiagnosticError(element)) {
            return 'error';
        }
        if (isProcessInformation(element)) {
            return 'header';
        }
        return '';
    }
}
class ProcessTreeDataSource {
    hasChildren(element) {
        if (isRemoteDiagnosticError(element)) {
            return false;
        }
        if (isProcessItem(element)) {
            return !!element.children?.length;
        }
        return true;
    }
    getChildren(element) {
        if (isProcessItem(element)) {
            return element.children ?? [];
        }
        if (isRemoteDiagnosticError(element)) {
            return [];
        }
        if (isProcessInformation(element)) {
            if (element.processRoots.length > 1) {
                return element.processRoots; // If there are multiple process roots, return these, otherwise go directly to the root process
            }
            if (element.processRoots.length > 0) {
                return [element.processRoots[0].rootProcess];
            }
            return [];
        }
        if (isMachineProcessInformation(element)) {
            return [element.rootProcess];
        }
        return element.processes ? [element.processes] : [];
    }
}
function createRow(container, extraClass) {
    const row = append(container, $('.row'));
    if (extraClass) {
        row.classList.add(extraClass);
    }
    const name = append(row, $('.cell.name'));
    const cpu = append(row, $('.cell.cpu'));
    const memory = append(row, $('.cell.memory'));
    const pid = append(row, $('.cell.pid'));
    return { name, cpu, memory, pid };
}
class ProcessHeaderTreeRenderer {
    constructor() {
        this.templateId = 'header';
    }
    renderTemplate(container) {
        container.previousElementSibling?.classList.add('force-no-twistie'); // hack, but no API for hiding twistie on tree
        return createRow(container, 'header');
    }
    renderElement(node, index, templateData) {
        templateData.name.textContent = localize(11127, null);
        templateData.cpu.textContent = localize(11128, null);
        templateData.pid.textContent = localize(11129, null);
        templateData.memory.textContent = localize(11130, null);
    }
    disposeTemplate(templateData) {
        // Nothing to do
    }
}
class MachineRenderer {
    constructor() {
        this.templateId = 'machine';
    }
    renderTemplate(container) {
        return createRow(container);
    }
    renderElement(node, index, templateData) {
        templateData.name.textContent = node.element.name;
    }
    disposeTemplate(templateData) {
        // Nothing to do
    }
}
class ErrorRenderer {
    constructor() {
        this.templateId = 'error';
    }
    renderTemplate(container) {
        return createRow(container);
    }
    renderElement(node, index, templateData) {
        templateData.name.textContent = node.element.errorMessage;
    }
    disposeTemplate(templateData) {
        // Nothing to do
    }
}
let ProcessItemHover = class ProcessItemHover extends Disposable {
    constructor(container, hoverService) {
        super();
        this.content = '';
        this.hover = this._register(hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), container, this.content));
    }
    update(content) {
        if (this.content !== content) {
            this.content = content;
            this.hover.update(content);
        }
    }
};
ProcessItemHover = __decorate([
    __param(1, IHoverService)
], ProcessItemHover);
let ProcessRenderer = class ProcessRenderer {
    constructor(model, hoverService) {
        this.model = model;
        this.hoverService = hoverService;
        this.templateId = 'process';
    }
    renderTemplate(container) {
        const row = createRow(container);
        return {
            name: row.name,
            cpu: row.cpu,
            memory: row.memory,
            pid: row.pid,
            hover: new ProcessItemHover(row.name, this.hoverService)
        };
    }
    renderElement(node, index, templateData) {
        const { element } = node;
        const pid = element.pid.toFixed(0);
        templateData.name.textContent = this.model.getName(element.pid, element.name);
        templateData.cpu.textContent = element.load.toFixed(0);
        templateData.memory.textContent = (element.mem / ByteSize.MB).toFixed(0);
        templateData.pid.textContent = pid;
        templateData.pid.parentElement.id = `pid-${pid}`;
        templateData.hover?.update(element.cmd);
    }
    disposeTemplate(templateData) {
        templateData.hover?.dispose();
    }
};
ProcessRenderer = __decorate([
    __param(1, IHoverService)
], ProcessRenderer);
class ProcessAccessibilityProvider {
    getWidgetAriaLabel() {
        return localize(11131, null);
    }
    getAriaLabel(element) {
        if (isProcessItem(element) || isMachineProcessInformation(element)) {
            return element.name;
        }
        if (isRemoteDiagnosticError(element)) {
            return element.hostName;
        }
        return null;
    }
}
class ProcessIdentityProvider {
    getId(element) {
        if (isProcessItem(element)) {
            return element.pid.toString();
        }
        if (isRemoteDiagnosticError(element)) {
            return element.hostName;
        }
        if (isProcessInformation(element)) {
            return 'processes';
        }
        if (isMachineProcessInformation(element)) {
            return element.name;
        }
        return 'header';
    }
}
//#endregion
let ProcessExplorerControl = class ProcessExplorerControl extends Disposable {
    constructor(instantiationService, productService, contextMenuService, commandService, clipboardService) {
        super();
        this.instantiationService = instantiationService;
        this.productService = productService;
        this.contextMenuService = contextMenuService;
        this.commandService = commandService;
        this.clipboardService = clipboardService;
        this.dimensions = undefined;
        this.delayer = this._register(new Delayer(1000));
        this.model = new ProcessExplorerModel(this.productService);
    }
    create(container) {
        this.createProcessTree(container);
        this.update();
    }
    createProcessTree(container) {
        container.classList.add('process-explorer');
        container.id = 'process-explorer';
        const renderers = [
            this.instantiationService.createInstance(ProcessRenderer, this.model),
            new ProcessHeaderTreeRenderer(),
            new MachineRenderer(),
            new ErrorRenderer()
        ];
        this.tree = this._register(this.instantiationService.createInstance((WorkbenchDataTree), 'processExplorer', container, new ProcessListDelegate(), renderers, new ProcessTreeDataSource(), {
            accessibilityProvider: new ProcessAccessibilityProvider(),
            identityProvider: new ProcessIdentityProvider(),
            expandOnlyOnTwistieClick: true,
            renderIndentGuides: RenderIndentGuides.OnHover
        }));
        this._register(this.tree.onKeyDown(e => this.onTreeKeyDown(e)));
        this._register(this.tree.onContextMenu(e => this.onTreeContextMenu(container, e)));
        this.tree.setInput(this.model);
        this.layoutTree();
    }
    async onTreeKeyDown(e) {
        const event = new StandardKeyboardEvent(e);
        if (event.keyCode === 35 /* KeyCode.KeyE */ && event.altKey) {
            const selectionPids = this.getSelectedPids();
            await Promise.all(selectionPids.map(pid => this.killProcess?.(pid, 'SIGTERM')));
        }
    }
    onTreeContextMenu(container, e) {
        if (!isProcessItem(e.element)) {
            return;
        }
        const item = e.element;
        const pid = Number(item.pid);
        const actions = [];
        if (typeof this.killProcess === 'function') {
            actions.push(toAction({ id: 'killProcess', label: localize(11132, null), run: () => this.killProcess?.(pid, 'SIGTERM') }));
            actions.push(toAction({ id: 'forceKillProcess', label: localize(11133, null), run: () => this.killProcess?.(pid, 'SIGKILL') }));
            actions.push(new Separator());
        }
        actions.push(toAction({
            id: 'copy',
            label: localize(11134, null),
            run: () => {
                const selectionPids = this.getSelectedPids();
                if (!selectionPids?.includes(pid)) {
                    selectionPids.length = 0; // If the selection does not contain the right clicked item, copy the right clicked item only.
                    selectionPids.push(pid);
                }
                // eslint-disable-next-line no-restricted-syntax
                const rows = selectionPids?.map(e => getDocument(container).getElementById(`pid-${e}`)).filter(e => !!e);
                if (rows) {
                    const text = rows.map(e => e.innerText).filter(e => !!e);
                    this.clipboardService.writeText(text.join('\n'));
                }
            }
        }));
        actions.push(toAction({
            id: 'copyAll',
            label: localize(11135, null),
            run: () => {
                // eslint-disable-next-line no-restricted-syntax
                const processList = getDocument(container).getElementById('process-explorer');
                if (processList) {
                    this.clipboardService.writeText(processList.innerText);
                }
            }
        }));
        if (this.isDebuggable(item.cmd)) {
            actions.push(new Separator());
            actions.push(toAction({ id: 'debug', label: localize(11136, null), run: () => this.attachTo(item) }));
        }
        this.contextMenuService.showContextMenu({
            getAnchor: () => e.anchor,
            getActions: () => actions
        });
    }
    isDebuggable(cmd) {
        if (isWeb) {
            return false;
        }
        const matches = DEBUG_FLAGS_PATTERN.exec(cmd);
        return (matches && matches.groups.port !== '0') || cmd.indexOf('node ') >= 0 || cmd.indexOf('node.exe') >= 0;
    }
    attachTo(item) {
        const config = {
            type: 'node',
            request: 'attach',
            name: `process ${item.pid}`
        };
        let matches = DEBUG_FLAGS_PATTERN.exec(item.cmd);
        if (matches) {
            config.port = Number(matches.groups.port);
        }
        else {
            config.processId = String(item.pid); // no port -> try to attach via pid (send SIGUSR1)
        }
        // a debug-port=n or inspect-port=n overrides the port
        matches = DEBUG_PORT_PATTERN.exec(item.cmd);
        if (matches) {
            config.port = Number(matches.groups.port); // override port
        }
        this.commandService.executeCommand('debug.startFromConfig', config);
    }
    getSelectedPids() {
        return coalesce(this.tree?.getSelection()?.map(e => {
            if (!isProcessItem(e)) {
                return undefined;
            }
            return e.pid;
        }) ?? []);
    }
    async update() {
        const { processes, pidToNames } = await this.resolveProcesses();
        this.model.update(processes, pidToNames);
        this.tree?.updateChildren();
        this.layoutTree();
        this.delayer.trigger(() => this.update());
    }
    focus() {
        this.tree?.domFocus();
    }
    layout(dimension) {
        this.dimensions = dimension;
        this.layoutTree();
    }
    layoutTree() {
        if (this.dimensions && this.tree) {
            this.tree.layout(this.dimensions.height, this.dimensions.width);
        }
    }
};
ProcessExplorerControl = __decorate([
    __param(0, IInstantiationService),
    __param(1, IProductService),
    __param(2, IContextMenuService),
    __param(3, ICommandService),
    __param(4, IClipboardService)
], ProcessExplorerControl);
export { ProcessExplorerControl };
let ProcessExplorerModel = class ProcessExplorerModel {
    constructor(productService) {
        this.productService = productService;
        this.processes = { processRoots: [] };
        this.mapPidToName = new Map();
    }
    update(processRoots, pidToNames) {
        // PID to Names
        this.mapPidToName.clear();
        for (const [pid, name] of pidToNames) {
            this.mapPidToName.set(pid, name);
        }
        // Processes
        processRoots.forEach((info, index) => {
            if (isProcessItem(info.rootProcess)) {
                info.rootProcess.name = index === 0 ? this.productService.applicationName : 'remote-server';
            }
        });
        this.processes = { processRoots };
    }
    getName(pid, fallback) {
        return this.mapPidToName.get(pid) ?? fallback;
    }
};
ProcessExplorerModel = __decorate([
    __param(0, IProductService)
], ProcessExplorerModel);
let BrowserProcessExplorerControl = class BrowserProcessExplorerControl extends ProcessExplorerControl {
    constructor(container, instantiationService, productService, contextMenuService, commandService, clipboardService, remoteAgentService, labelService) {
        super(instantiationService, productService, contextMenuService, commandService, clipboardService);
        this.remoteAgentService = remoteAgentService;
        this.labelService = labelService;
        this.create(container);
    }
    async resolveProcesses() {
        const connection = this.remoteAgentService.getConnection();
        if (!connection) {
            return { pidToNames: [], processes: [] };
        }
        const processes = [];
        const hostName = this.labelService.getHostLabel(Schemas.vscodeRemote, connection.remoteAuthority);
        const result = await this.remoteAgentService.getDiagnosticInfo({ includeProcesses: true });
        if (result) {
            if (isRemoteDiagnosticError(result)) {
                processes.push({ name: result.hostName, rootProcess: result });
            }
            else if (result.processes) {
                processes.push({ name: hostName, rootProcess: result.processes });
            }
        }
        return { pidToNames: [], processes };
    }
};
BrowserProcessExplorerControl = __decorate([
    __param(1, IInstantiationService),
    __param(2, IProductService),
    __param(3, IContextMenuService),
    __param(4, ICommandService),
    __param(5, IClipboardService),
    __param(6, IRemoteAgentService),
    __param(7, ILabelService)
], BrowserProcessExplorerControl);
export { BrowserProcessExplorerControl };
//# sourceMappingURL=processExplorerControl.js.map