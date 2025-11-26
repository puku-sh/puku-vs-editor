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
import { Event, Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { observableFromEvent } from '../../../../base/common/observable.js';
import * as nls from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { CellKind, NotebookCellExecutionState } from '../common/notebookCommon.js';
import { INotebookExecutionStateService, NotebookExecutionType } from '../common/notebookExecutionStateService.js';
import { getAllOutputsText } from './viewModel/cellOutputTextHelper.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { alert } from '../../../../base/browser/ui/aria/aria.js';
let NotebookAccessibilityProvider = class NotebookAccessibilityProvider extends Disposable {
    constructor(viewModel, isReplHistory, notebookExecutionStateService, keybindingService, configurationService, accessibilityService) {
        super();
        this.viewModel = viewModel;
        this.isReplHistory = isReplHistory;
        this.notebookExecutionStateService = notebookExecutionStateService;
        this.keybindingService = keybindingService;
        this.configurationService = configurationService;
        this.accessibilityService = accessibilityService;
        this._onDidAriaLabelChange = new Emitter();
        this.onDidAriaLabelChange = this._onDidAriaLabelChange.event;
        this._register(Event.debounce(this.notebookExecutionStateService.onDidChangeExecution, (last, e) => this.mergeEvents(last, e), 100)((updates) => {
            if (!updates.length) {
                return;
            }
            const viewModel = this.viewModel();
            if (viewModel) {
                for (const update of updates) {
                    const cellModel = viewModel.getCellByHandle(update.cellHandle);
                    if (cellModel) {
                        this._onDidAriaLabelChange.fire(cellModel);
                    }
                }
                const lastUpdate = updates[updates.length - 1];
                if (this.shouldReadCellOutputs(lastUpdate.state)) {
                    const cell = viewModel.getCellByHandle(lastUpdate.cellHandle);
                    if (cell && cell.outputsViewModels.length) {
                        const text = getAllOutputsText(viewModel.notebookDocument, cell, true);
                        alert(text);
                    }
                }
            }
        }, this));
    }
    shouldReadCellOutputs(state) {
        return state === undefined // execution completed
            && this.isReplHistory
            && this.accessibilityService.isScreenReaderOptimized()
            && this.configurationService.getValue('accessibility.replEditor.readLastExecutionOutput');
    }
    get verbositySettingId() {
        return this.isReplHistory ?
            "accessibility.verbosity.replEditor" /* AccessibilityVerbositySettingId.ReplEditor */ :
            "accessibility.verbosity.notebook" /* AccessibilityVerbositySettingId.Notebook */;
    }
    getAriaLabel(element) {
        const event = Event.filter(this.onDidAriaLabelChange, e => e === element);
        return observableFromEvent(this, event, () => {
            const viewModel = this.viewModel();
            if (!viewModel) {
                return '';
            }
            const index = viewModel.getCellIndex(element);
            if (index >= 0) {
                return this.getLabel(element);
            }
            return '';
        });
    }
    createItemLabel(executionLabel, cellKind) {
        return this.isReplHistory ?
            `cell${executionLabel}` :
            `${cellKind === CellKind.Markup ? 'markdown' : 'code'} cell${executionLabel}`;
    }
    getLabel(element) {
        const executionState = this.notebookExecutionStateService.getCellExecution(element.uri)?.state;
        const executionLabel = executionState === NotebookCellExecutionState.Executing
            ? ', executing'
            : executionState === NotebookCellExecutionState.Pending
                ? ', pending'
                : '';
        return this.createItemLabel(executionLabel, element.cellKind);
    }
    get widgetAriaLabelName() {
        return this.isReplHistory ?
            nls.localize(10469, null) :
            nls.localize(10470, null);
    }
    getWidgetAriaLabel() {
        const keybinding = this.keybindingService.lookupKeybinding("editor.action.accessibilityHelp" /* AccessibilityCommandId.OpenAccessibilityHelp */)?.getLabel();
        if (this.configurationService.getValue(this.verbositySettingId)) {
            return keybinding
                ? nls.localize(10471, null, this.widgetAriaLabelName, keybinding)
                : nls.localize(10472, null, this.widgetAriaLabelName);
        }
        return this.widgetAriaLabelName;
    }
    mergeEvents(last, e) {
        const viewModel = this.viewModel();
        const result = last || [];
        if (viewModel && e.type === NotebookExecutionType.cell && e.affectsNotebook(viewModel.uri)) {
            const index = result.findIndex(update => update.cellHandle === e.cellHandle);
            if (index >= 0) {
                result.splice(index, 1);
            }
            result.push({ cellHandle: e.cellHandle, state: e.changed?.state });
        }
        return result;
    }
};
NotebookAccessibilityProvider = __decorate([
    __param(2, INotebookExecutionStateService),
    __param(3, IKeybindingService),
    __param(4, IConfigurationService),
    __param(5, IAccessibilityService)
], NotebookAccessibilityProvider);
export { NotebookAccessibilityProvider };
//# sourceMappingURL=notebookAccessibilityProvider.js.map