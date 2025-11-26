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
var TerminalHistoryContribution_1;
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../../base/common/network.js';
import { localize2 } from '../../../../../nls.js';
import { CONTEXT_ACCESSIBILITY_MODE_ENABLED } from '../../../../../platform/accessibility/common/accessibility.js';
import { MenuId } from '../../../../../platform/actions/common/actions.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { TerminalLocation } from '../../../../../platform/terminal/common/terminal.js';
import { ResourceContextKey } from '../../../../common/contextkeys.js';
import { accessibleViewCurrentProviderId, accessibleViewIsShown } from '../../../accessibility/browser/accessibilityConfiguration.js';
import { registerActiveInstanceAction, registerTerminalAction } from '../../../terminal/browser/terminalActions.js';
import { registerTerminalContribution } from '../../../terminal/browser/terminalExtensions.js';
import { TERMINAL_VIEW_ID } from '../../../terminal/common/terminal.js';
import { TerminalContextKeys } from '../../../terminal/common/terminalContextKey.js';
import { clearShellFileHistory, getCommandHistory, getDirectoryHistory } from '../common/history.js';
import { showRunRecentQuickPick } from './terminalRunRecentQuickPick.js';
// #region Terminal Contributions
let TerminalHistoryContribution = class TerminalHistoryContribution extends Disposable {
    static { TerminalHistoryContribution_1 = this; }
    static { this.ID = 'terminal.history'; }
    static get(instance) {
        return instance.getContribution(TerminalHistoryContribution_1.ID);
    }
    constructor(_ctx, contextKeyService, _instantiationService) {
        super();
        this._ctx = _ctx;
        this._instantiationService = _instantiationService;
        this._terminalInRunCommandPicker = TerminalContextKeys.inTerminalRunCommandPicker.bindTo(contextKeyService);
        this._register(_ctx.instance.capabilities.onDidAddCapability(e => {
            switch (e.id) {
                case 0 /* TerminalCapability.CwdDetection */: {
                    this._register(e.capability.onDidChangeCwd(e => {
                        this._instantiationService.invokeFunction(getDirectoryHistory)?.add(e, { remoteAuthority: _ctx.instance.remoteAuthority });
                    }));
                    break;
                }
                case 2 /* TerminalCapability.CommandDetection */: {
                    this._register(e.capability.onCommandFinished(e => {
                        if (e.command.trim().length > 0) {
                            this._instantiationService.invokeFunction(getCommandHistory)?.add(e.command, { shellType: _ctx.instance.shellType });
                        }
                    }));
                    break;
                }
            }
        }));
    }
    /**
     * Triggers a quick pick that displays recent commands or cwds. Selecting one will
     * rerun it in the active terminal.
     */
    async runRecent(type, filterMode, value) {
        return this._instantiationService.invokeFunction(showRunRecentQuickPick, this._ctx.instance, this._terminalInRunCommandPicker, type, filterMode, value);
    }
};
TerminalHistoryContribution = TerminalHistoryContribution_1 = __decorate([
    __param(1, IContextKeyService),
    __param(2, IInstantiationService)
], TerminalHistoryContribution);
registerTerminalContribution(TerminalHistoryContribution.ID, TerminalHistoryContribution);
// #endregion
// #region Actions
const precondition = ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated);
registerTerminalAction({
    id: "workbench.action.terminal.clearPreviousSessionHistory" /* TerminalHistoryCommandId.ClearPreviousSessionHistory */,
    title: localize2(13269, 'Clear Previous Session History'),
    precondition,
    run: async (c, accessor) => {
        getCommandHistory(accessor).clear();
        clearShellFileHistory();
    }
});
registerActiveInstanceAction({
    id: "workbench.action.terminal.goToRecentDirectory" /* TerminalHistoryCommandId.GoToRecentDirectory */,
    title: localize2(13270, 'Go to Recent Directory...'),
    metadata: {
        description: localize2(13271, 'Goes to a recent folder'),
    },
    precondition,
    keybinding: {
        primary: 2048 /* KeyMod.CtrlCmd */ | 37 /* KeyCode.KeyG */,
        when: TerminalContextKeys.focus,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */
    },
    menu: [
        {
            id: MenuId.ViewTitle,
            group: 'shellIntegration',
            order: 0,
            when: ContextKeyExpr.equals('view', TERMINAL_VIEW_ID),
            isHiddenByDefault: true
        },
        ...[MenuId.EditorTitle, MenuId.CompactWindowEditorTitle].map(id => ({
            id,
            group: '1_shellIntegration',
            order: 0,
            when: ResourceContextKey.Scheme.isEqualTo(Schemas.vscodeTerminal),
            isHiddenByDefault: true
        })),
    ],
    run: async (activeInstance, c) => {
        const history = TerminalHistoryContribution.get(activeInstance);
        if (!history) {
            return;
        }
        await history.runRecent('cwd');
        if (activeInstance?.target === TerminalLocation.Editor) {
            await c.editorService.revealActiveEditor();
        }
        else {
            await c.groupService.showPanel(false);
        }
    }
});
registerTerminalAction({
    id: "workbench.action.terminal.runRecentCommand" /* TerminalHistoryCommandId.RunRecentCommand */,
    title: localize2(13272, 'Run Recent Command...'),
    precondition,
    keybinding: [
        {
            primary: 2048 /* KeyMod.CtrlCmd */ | 48 /* KeyCode.KeyR */,
            when: ContextKeyExpr.and(CONTEXT_ACCESSIBILITY_MODE_ENABLED, ContextKeyExpr.or(TerminalContextKeys.focus, ContextKeyExpr.and(accessibleViewIsShown, accessibleViewCurrentProviderId.isEqualTo("terminal" /* AccessibleViewProviderId.Terminal */)))),
            weight: 200 /* KeybindingWeight.WorkbenchContrib */
        },
        {
            primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 48 /* KeyCode.KeyR */,
            mac: { primary: 256 /* KeyMod.WinCtrl */ | 512 /* KeyMod.Alt */ | 48 /* KeyCode.KeyR */ },
            when: ContextKeyExpr.and(TerminalContextKeys.focus, CONTEXT_ACCESSIBILITY_MODE_ENABLED.negate()),
            weight: 200 /* KeybindingWeight.WorkbenchContrib */
        }
    ],
    menu: [
        {
            id: MenuId.ViewTitle,
            group: 'shellIntegration',
            order: 1,
            when: ContextKeyExpr.equals('view', TERMINAL_VIEW_ID),
            isHiddenByDefault: true
        },
        ...[MenuId.EditorTitle, MenuId.CompactWindowEditorTitle].map(id => ({
            id,
            group: '1_shellIntegration',
            order: 1,
            when: ResourceContextKey.Scheme.isEqualTo(Schemas.vscodeTerminal),
            isHiddenByDefault: true
        })),
    ],
    run: async (c, accessor) => {
        let activeInstance = c.service.activeInstance;
        // If an instanec doesn't exist, create one and wait for shell type to be set
        if (!activeInstance) {
            const newInstance = activeInstance = await c.service.getActiveOrCreateInstance();
            await c.service.revealActiveTerminal();
            const store = new DisposableStore();
            const wasDisposedPrematurely = await new Promise(r => {
                store.add(newInstance.onDidChangeShellType(() => r(false)));
                store.add(newInstance.onDisposed(() => r(true)));
            });
            store.dispose();
            if (wasDisposedPrematurely) {
                return;
            }
        }
        const history = TerminalHistoryContribution.get(activeInstance);
        if (!history) {
            return;
        }
        await history.runRecent('command');
        if (activeInstance?.target === TerminalLocation.Editor) {
            await c.editorService.revealActiveEditor();
        }
        else {
            await c.groupService.showPanel(false);
        }
    }
});
// #endregion
//# sourceMappingURL=terminal.history.contribution.js.map