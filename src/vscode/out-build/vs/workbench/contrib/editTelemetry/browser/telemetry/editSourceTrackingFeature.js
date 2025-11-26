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
import { CachedFunction } from '../../../../../base/common/cache.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { autorun, mapObservableArrayCached, derived, observableValue, derivedWithSetter, observableFromEvent } from '../../../../../base/common/observable.js';
import { DynamicCssRules } from '../../../../../editor/browser/editorDom.js';
import { observableCodeEditor } from '../../../../../editor/browser/observableCodeEditor.js';
import { CodeEditorWidget } from '../../../../../editor/browser/widget/codeEditor/codeEditorWidget.js';
import { CommandsRegistry } from '../../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { observableConfigValue } from '../../../../../platform/observable/common/platformObservableUtils.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { IStatusbarService } from '../../../../services/statusbar/browser/statusbar.js';
import { EditSourceTrackingImpl } from './editSourceTrackingImpl.js';
import { DataChannelForwardingTelemetryService } from '../../../../../platform/dataChannel/browser/forwardingTelemetryService.js';
import { EDIT_TELEMETRY_DETAILS_SETTING_ID, EDIT_TELEMETRY_SHOW_DECORATIONS, EDIT_TELEMETRY_SHOW_STATUS_BAR } from '../settings.js';
import { IExtensionService } from '../../../../services/extensions/common/extensions.js';
let EditTrackingFeature = class EditTrackingFeature extends Disposable {
    constructor(_workspace, _annotatedDocuments, _configurationService, _instantiationService, _statusbarService, _editorService, _extensionService) {
        super();
        this._workspace = _workspace;
        this._annotatedDocuments = _annotatedDocuments;
        this._configurationService = _configurationService;
        this._instantiationService = _instantiationService;
        this._statusbarService = _statusbarService;
        this._editorService = _editorService;
        this._extensionService = _extensionService;
        this._showStateInMarkdownDoc = 'editTelemetry.showDebugDetails';
        this._toggleDecorations = 'editTelemetry.toggleDebugDecorations';
        this._editSourceTrackingShowDecorations = makeSettable(observableConfigValue(EDIT_TELEMETRY_SHOW_DECORATIONS, false, this._configurationService));
        this._editSourceTrackingShowStatusBar = observableConfigValue(EDIT_TELEMETRY_SHOW_STATUS_BAR, false, this._configurationService);
        const editSourceDetailsEnabled = observableConfigValue(EDIT_TELEMETRY_DETAILS_SETTING_ID, false, this._configurationService);
        const extensions = observableFromEvent(this._extensionService.onDidChangeExtensions, () => {
            return this._extensionService.extensions;
        });
        const extensionIds = derived(reader => new Set(extensions.read(reader).map(e => e.id?.toLowerCase())));
        function getExtensionInfoObs(extensionId, extensionService) {
            const extIdLowerCase = extensionId.toLowerCase();
            return derived(reader => extensionIds.read(reader).has(extIdLowerCase));
        }
        const copilotInstalled = getExtensionInfoObs('GitHub.copilot', this._extensionService);
        const copilotChatInstalled = getExtensionInfoObs('GitHub.copilot-chat', this._extensionService);
        const shouldSendDetails = derived(reader => editSourceDetailsEnabled.read(reader) || !!copilotInstalled.read(reader) || !!copilotChatInstalled.read(reader));
        const instantiationServiceWithInterceptedTelemetry = this._instantiationService.createChild(new ServiceCollection([ITelemetryService, this._instantiationService.createInstance(DataChannelForwardingTelemetryService)]));
        const impl = this._register(instantiationServiceWithInterceptedTelemetry.createInstance(EditSourceTrackingImpl, shouldSendDetails, this._annotatedDocuments));
        this._register(autorun((reader) => {
            if (!this._editSourceTrackingShowDecorations.read(reader)) {
                return;
            }
            const visibleEditors = observableFromEvent(this, this._editorService.onDidVisibleEditorsChange, () => this._editorService.visibleTextEditorControls);
            mapObservableArrayCached(this, visibleEditors, (editor, store) => {
                if (editor instanceof CodeEditorWidget) {
                    const obsEditor = observableCodeEditor(editor);
                    const cssStyles = new DynamicCssRules(editor);
                    const decorations = new CachedFunction((source) => {
                        const r = store.add(cssStyles.createClassNameRef({
                            backgroundColor: source.getColor(),
                        }));
                        return r.className;
                    });
                    store.add(obsEditor.setDecorations(derived(reader => {
                        const uri = obsEditor.model.read(reader)?.uri;
                        if (!uri) {
                            return [];
                        }
                        const doc = this._workspace.getDocument(uri);
                        if (!doc) {
                            return [];
                        }
                        const docsState = impl.docsState.read(reader).get(doc);
                        if (!docsState) {
                            return [];
                        }
                        const ranges = (docsState.longtermTracker.read(reader)?.getTrackedRanges(reader)) ?? [];
                        return ranges.map(r => ({
                            range: doc.value.read(undefined).getTransformer().getRange(r.range),
                            options: {
                                description: 'editSourceTracking',
                                inlineClassName: decorations.get(r.source),
                            }
                        }));
                    })));
                }
            }).recomputeInitiallyAndOnChange(reader.store);
        }));
        this._register(autorun(reader => {
            if (!this._editSourceTrackingShowStatusBar.read(reader)) {
                return;
            }
            const statusBarItem = reader.store.add(this._statusbarService.addEntry({
                name: '',
                text: '',
                command: this._showStateInMarkdownDoc,
                tooltip: 'Edit Source Tracking',
                ariaLabel: '',
            }, 'editTelemetry', 1 /* StatusbarAlignment.RIGHT */, 100));
            const sumChangedCharacters = derived(reader => {
                const docs = impl.docsState.read(reader);
                let sum = 0;
                for (const state of docs.values()) {
                    const t = state.longtermTracker.read(reader);
                    if (!t) {
                        continue;
                    }
                    const d = state.getTelemetryData(t.getTrackedRanges(reader));
                    sum += d.totalModifiedCharactersInFinalState;
                }
                return sum;
            });
            const tooltipMarkdownString = derived(reader => {
                const docs = impl.docsState.read(reader);
                const docsDataInTooltip = [];
                const editSources = [];
                for (const [doc, state] of docs) {
                    const tracker = state.longtermTracker.read(reader);
                    if (!tracker) {
                        continue;
                    }
                    const trackedRanges = tracker.getTrackedRanges(reader);
                    const data = state.getTelemetryData(trackedRanges);
                    if (data.totalModifiedCharactersInFinalState === 0) {
                        continue; // Don't include unmodified documents in tooltip
                    }
                    editSources.push(...trackedRanges.map(r => r.source));
                    // Filter out unmodified properties as these are not interesting to see in the hover
                    const filteredData = Object.fromEntries(Object.entries(data).filter(([_, value]) => !(typeof value === 'number') || value !== 0));
                    docsDataInTooltip.push([
                        `### ${doc.uri.fsPath}`,
                        '```json',
                        JSON.stringify(filteredData, undefined, '\t'),
                        '```',
                        '\n'
                    ].join('\n'));
                }
                let tooltipContent;
                if (docsDataInTooltip.length === 0) {
                    tooltipContent = 'No modified documents';
                }
                else if (docsDataInTooltip.length <= 3) {
                    tooltipContent = docsDataInTooltip.join('\n\n');
                }
                else {
                    const lastThree = docsDataInTooltip.slice(-3);
                    tooltipContent = '...\n\n' + lastThree.join('\n\n');
                }
                const agenda = this._createEditSourceAgenda(editSources);
                const tooltipWithCommand = new MarkdownString(tooltipContent + '\n\n[View Details](command:' + this._showStateInMarkdownDoc + ')');
                tooltipWithCommand.appendMarkdown('\n\n' + agenda + '\n\nToggle decorations: [Click here](command:' + this._toggleDecorations + ')');
                tooltipWithCommand.isTrusted = { enabledCommands: [this._toggleDecorations] };
                tooltipWithCommand.supportHtml = true;
                return tooltipWithCommand;
            });
            reader.store.add(autorun(reader => {
                statusBarItem.update({
                    name: 'editTelemetry',
                    text: `$(edit) ${sumChangedCharacters.read(reader)} chars inserted`,
                    ariaLabel: `Edit Source Tracking: ${sumChangedCharacters.read(reader)} modified characters`,
                    tooltip: tooltipMarkdownString.read(reader),
                    command: this._showStateInMarkdownDoc,
                });
            }));
            reader.store.add(CommandsRegistry.registerCommand(this._toggleDecorations, () => {
                this._editSourceTrackingShowDecorations.set(!this._editSourceTrackingShowDecorations.read(undefined), undefined);
            }));
        }));
    }
    _createEditSourceAgenda(editSources) {
        // Collect all edit sources from the tracked documents
        const editSourcesSeen = new Set();
        const editSourceInfo = [];
        for (const editSource of editSources) {
            if (!editSourcesSeen.has(editSource.toString())) {
                editSourcesSeen.add(editSource.toString());
                editSourceInfo.push({ name: editSource.toString(), color: editSource.getColor() });
            }
        }
        const agendaItems = editSourceInfo.map(info => `<span style="background-color:${info.color};border-radius:3px;">${info.name}</span>`);
        return agendaItems.join(' ');
    }
};
EditTrackingFeature = __decorate([
    __param(2, IConfigurationService),
    __param(3, IInstantiationService),
    __param(4, IStatusbarService),
    __param(5, IEditorService),
    __param(6, IExtensionService)
], EditTrackingFeature);
export { EditTrackingFeature };
function makeSettable(obs) {
    const overrideObs = observableValue('overrideObs', undefined);
    return derivedWithSetter(overrideObs, (reader) => {
        return overrideObs.read(reader) ?? obs.read(reader);
    }, (value, tx) => {
        overrideObs.set(value, tx);
    });
}
//# sourceMappingURL=editSourceTrackingFeature.js.map