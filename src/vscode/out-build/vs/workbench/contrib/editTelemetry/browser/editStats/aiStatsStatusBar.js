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
                name: localize(7865, null),
                ariaLabel: localize(7866, null),
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
                n.div({ style: { flex: 1 } }, [localize(7867, null)]),
                n.div({ style: { marginLeft: 'auto' } }, actionBar([
                    {
                        action: {
                            id: 'aiStats.statusBar.settings',
                            label: '',
                            enabled: true,
                            run: () => openSettingsCommand({ ids: [AI_STATS_SETTING_ID] }).run(this._commandService),
                            class: ThemeIcon.asClassName(Codicon.gear),
                            tooltip: localize(7868, null)
                        },
                        options: { icon: true, label: false, hoverDelegate: nativeHoverDelegate }
                    }
                ]))
            ]),
            n.div({ style: { display: 'flex' } }, [
                n.div({ style: { flex: 1, paddingRight: '4px' } }, [
                    localize(7869, null, aiRatePercent.get()),
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
                localize(7870, null, this._aiStatsFeature.acceptedInlineSuggestionsToday.get()),
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
//# sourceMappingURL=aiStatsStatusBar.js.map