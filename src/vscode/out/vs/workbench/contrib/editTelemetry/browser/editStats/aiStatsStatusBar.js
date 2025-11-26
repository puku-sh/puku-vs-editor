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
import { n } from '../../../../../base/browser/dom.js';
import { ActionBar } from '../../../../../base/browser/ui/actionbar/actionbar.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { createHotClass } from '../../../../../base/common/hotReloadHelpers.js';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { autorun, derived } from '../../../../../base/common/observable.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { localize } from '../../../../../nls.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { nativeHoverDelegate } from '../../../../../platform/hover/browser/hover.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { IStatusbarService } from '../../../../services/statusbar/browser/statusbar.js';
import { AI_STATS_SETTING_ID } from '../settingIds.js';
import './media.css';
let AiStatsStatusBar = class AiStatsStatusBar extends Disposable {
    static { this.hot = createHotClass(this); }
    constructor(_aiStatsFeature, _statusbarService, _commandService, _telemetryService) {
        super();
        this._aiStatsFeature = _aiStatsFeature;
        this._statusbarService = _statusbarService;
        this._commandService = _commandService;
        this._telemetryService = _telemetryService;
        this._register(autorun((reader) => {
            const statusBarItem = this._createStatusBar().keepUpdated(reader.store);
            const store = this._register(new DisposableStore());
            reader.store.add(this._statusbarService.addEntry({
                name: localize('inlineSuggestions', "Inline Suggestions"),
                ariaLabel: localize('inlineSuggestionsStatusBar', "Inline suggestions status bar"),
                text: '',
                tooltip: {
                    element: async (_token) => {
                        this._sendHoverTelemetry();
                        store.clear();
                        const elem = this._createStatusBarHover();
                        return elem.keepUpdated(store).element;
                    },
                    markdownNotSupportedFallback: undefined,
                },
                content: statusBarItem.element,
            }, 'aiStatsStatusBar', 1 /* StatusbarAlignment.RIGHT */, 100));
        }));
    }
    _sendHoverTelemetry() {
        this._telemetryService.publicLog2('aiStatsStatusBar.hover', {
            aiRate: this._aiStatsFeature.aiRate.get(),
        });
    }
    _createStatusBar() {
        return n.div({
            style: {
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: '3px',
                marginRight: '3px',
            }
        }, [
            n.div({
                class: 'ai-stats-status-bar',
                style: {
                    display: 'flex',
                    flexDirection: 'column',
                    width: 50,
                    height: 6,
                    borderRadius: 6,
                    borderWidth: '1px',
                    borderStyle: 'solid',
                }
            }, [
                n.div({
                    style: {
                        flex: 1,
                        display: 'flex',
                        overflow: 'hidden',
                        borderRadius: 6,
                        border: '1px solid transparent',
                    }
                }, [
                    n.div({
                        style: {
                            width: this._aiStatsFeature.aiRate.map(v => `${v * 100}%`),
                            backgroundColor: 'currentColor',
                        }
                    })
                ])
            ])
        ]);
    }
    _createStatusBarHover() {
        const aiRatePercent = this._aiStatsFeature.aiRate.map(r => `${Math.round(r * 100)}%`);
        return n.div({
            class: 'ai-stats-status-bar',
        }, [
            n.div({
                class: 'header',
                style: {
                    minWidth: '200px',
                }
            }, [
                n.div({ style: { flex: 1 } }, [localize('aiStatsStatusBarHeader', "AI Usage Statistics")]),
                n.div({ style: { marginLeft: 'auto' } }, actionBar([
                    {
                        action: {
                            id: 'aiStats.statusBar.settings',
                            label: '',
                            enabled: true,
                            run: () => openSettingsCommand({ ids: [AI_STATS_SETTING_ID] }).run(this._commandService),
                            class: ThemeIcon.asClassName(Codicon.gear),
                            tooltip: localize('aiStats.statusBar.configure', "Configure")
                        },
                        options: { icon: true, label: false, hoverDelegate: nativeHoverDelegate }
                    }
                ]))
            ]),
            n.div({ style: { display: 'flex' } }, [
                n.div({ style: { flex: 1, paddingRight: '4px' } }, [
                    localize('text1', "AI vs Typing Average: {0}", aiRatePercent.get()),
                ]),
                /*
                TODO: Write article that explains the ratio and link to it.

                n.div({ style: { marginLeft: 'auto' } }, actionBar([
                    {
                        action: {
                            id: 'aiStatsStatusBar.openSettings',
                            label: '',
                            enabled: true,
                            run: () => { },
                            class: ThemeIcon.asClassName(Codicon.info),
                            tooltip: ''
                        },
                        options: { icon: true, label: true, }
                    }
                ]))*/
            ]),
            n.div({ style: { flex: 1, paddingRight: '4px' } }, [
                localize('text2', "Accepted inline suggestions today: {0}", this._aiStatsFeature.acceptedInlineSuggestionsToday.get()),
            ]),
        ]);
    }
};
AiStatsStatusBar = __decorate([
    __param(1, IStatusbarService),
    __param(2, ICommandService),
    __param(3, ITelemetryService)
], AiStatsStatusBar);
export { AiStatsStatusBar };
function actionBar(actions, options) {
    return derived((_reader) => n.div({
        class: [],
        style: {},
        ref: elem => {
            const actionBar = _reader.store.add(new ActionBar(elem, options));
            for (const { action, options } of actions) {
                actionBar.push(action, options);
            }
        }
    }));
}
class CommandWithArgs {
    constructor(commandId, args = []) {
        this.commandId = commandId;
        this.args = args;
    }
    run(commandService) {
        commandService.executeCommand(this.commandId, ...this.args);
    }
}
function openSettingsCommand(options = {}) {
    return new CommandWithArgs('workbench.action.openSettings', [{
            query: options.ids ? options.ids.map(id => `@id:${id}`).join(' ') : undefined,
        }]);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWlTdGF0c1N0YXR1c0Jhci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhaGFtZWQvRGVza3RvcC9wdWt1LXZzLWVkaXRvci9wdWt1LWVkaXRvci9zcmMvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2VkaXRUZWxlbWV0cnkvYnJvd3Nlci9lZGl0U3RhdHMvYWlTdGF0c1N0YXR1c0Jhci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDdkQsT0FBTyxFQUFFLFNBQVMsRUFBcUMsTUFBTSx1REFBdUQsQ0FBQztBQUVySCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDakUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDdEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDcEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ2pELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUN0RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNyRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUMxRixPQUFPLEVBQUUsaUJBQWlCLEVBQXNCLE1BQU0scURBQXFELENBQUM7QUFDNUcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFFdkQsT0FBTyxhQUFhLENBQUM7QUFFZCxJQUFNLGdCQUFnQixHQUF0QixNQUFN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