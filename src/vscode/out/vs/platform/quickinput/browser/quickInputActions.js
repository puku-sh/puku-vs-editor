/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isMacintosh } from '../../../base/common/platform.js';
import { localize } from '../../../nls.js';
import { ContextKeyExpr } from '../../contextkey/common/contextkey.js';
import { InputFocusedContext } from '../../contextkey/common/contextkeys.js';
import { KeybindingsRegistry } from '../../keybinding/common/keybindingsRegistry.js';
import { endOfQuickInputBoxContext, inQuickInputContext, quickInputTypeContextKeyValue } from './quickInput.js';
import { IQuickInputService, QuickPickFocus } from '../common/quickInput.js';
function registerQuickInputCommandAndKeybindingRule(rule, options = {}) {
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        when: inQuickInputContext,
        metadata: { description: localize('quickInput', "Used while in the context of any kind of quick input. If you change one keybinding for this command, you should change all of the other keybindings (modifier variants) of this command as well.") },
        ...rule,
        secondary: getSecondary(rule.primary, rule.secondary ?? [], options)
    });
}
function registerQuickPickCommandAndKeybindingRule(rule, options = {}) {
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        when: ContextKeyExpr.and(ContextKeyExpr.or(
        // Only things that use Tree widgets
        ContextKeyExpr.equals(quickInputTypeContextKeyValue, "quickPick" /* QuickInputType.QuickPick */), ContextKeyExpr.equals(quickInputTypeContextKeyValue, "quickTree" /* QuickInputType.QuickTree */)), inQuickInputContext),
        metadata: { description: localize('quickPick', "Used while in the context of the quick pick. If you change one keybinding for this command, you should change all of the other keybindings (modifier variants) of this command as well.") },
        ...rule,
        secondary: getSecondary(rule.primary, rule.secondary ?? [], options)
    });
}
const ctrlKeyMod = isMacintosh ? 256 /* KeyMod.WinCtrl */ : 2048 /* KeyMod.CtrlCmd */;
// This function will generate all the combinations of keybindings for the given primary keybinding
function getSecondary(primary, secondary, options = {}) {
    if (options.withAltMod) {
        secondary.push(512 /* KeyMod.Alt */ + primary);
    }
    if (options.withCtrlMod) {
        secondary.push(ctrlKeyMod + primary);
        if (options.withAltMod) {
            secondary.push(512 /* KeyMod.Alt */ + ctrlKeyMod + primary);
        }
    }
    if (options.withCmdMod && isMacintosh) {
        secondary.push(2048 /* KeyMod.CtrlCmd */ + primary);
        if (options.withCtrlMod) {
            secondary.push(2048 /* KeyMod.CtrlCmd */ + 256 /* KeyMod.WinCtrl */ + primary);
        }
        if (options.withAltMod) {
            secondary.push(2048 /* KeyMod.CtrlCmd */ + 512 /* KeyMod.Alt */ + primary);
            if (options.withCtrlMod) {
                secondary.push(2048 /* KeyMod.CtrlCmd */ + 512 /* KeyMod.Alt */ + 256 /* KeyMod.WinCtrl */ + primary);
            }
        }
    }
    return secondary;
}
//#region Navigation
function focusHandler(focus, focusOnQuickNatigate) {
    return accessor => {
        // Assuming this is a quick pick due to above when clause
        const currentQuickPick = accessor.get(IQuickInputService).currentQuickInput;
        if (!currentQuickPick) {
            return;
        }
        if (focusOnQuickNatigate && currentQuickPick.quickNavigate) {
            return currentQuickPick.focus(focusOnQuickNatigate);
        }
        return currentQuickPick.focus(focus);
    };
}
registerQuickPickCommandAndKeybindingRule({ id: 'quickInput.pageNext', primary: 12 /* KeyCode.PageDown */, handler: focusHandler(QuickPickFocus.NextPage) }, { withAltMod: true, withCtrlMod: true, withCmdMod: true });
registerQuickPickCommandAndKeybindingRule({ id: 'quickInput.pagePrevious', primary: 11 /* KeyCode.PageUp */, handler: focusHandler(QuickPickFocus.PreviousPage) }, { withAltMod: true, withCtrlMod: true, withCmdMod: true });
registerQuickPickCommandAndKeybindingRule({ id: 'quickInput.first', primary: ctrlKeyMod + 14 /* KeyCode.Home */, handler: focusHandler(QuickPickFocus.First) }, { withAltMod: true, withCmdMod: true });
registerQuickPickCommandAndKeybindingRule({ id: 'quickInput.last', primary: ctrlKeyMod + 13 /* KeyCode.End */, handler: focusHandler(QuickPickFocus.Last) }, { withAltMod: true, withCmdMod: true });
registerQuickPickCommandAndKeybindingRule({ id: 'quickInput.next', primary: 18 /* KeyCode.DownArrow */, handler: focusHandler(QuickPickFocus.Next) }, { withCtrlMod: true });
registerQuickPickCommandAndKeybindingRule({ id: 'quickInput.previous', primary: 16 /* KeyCode.UpArrow */, handler: focusHandler(QuickPickFocus.Previous) }, { withCtrlMod: true });
// The next & previous separator commands are interesting because if we are in quick access mode, we are already holding a modifier key down.
// In this case, we want that modifier key+up/down to navigate to the next/previous item, not the next/previous separator.
// To handle this, we have a separate command for navigating to the next/previous separator when we are not in quick access mode.
// If, however, we are in quick access mode, and you hold down an additional modifier key, we will navigate to the next/previous separator.
const nextSeparatorFallbackDesc = localize('quickInput.nextSeparatorWithQuickAccessFallback', "If we're in quick access mode, this will navigate to the next item. If we are not in quick access mode, this will navigate to the next separator.");
const prevSeparatorFallbackDesc = localize('quickInput.previousSeparatorWithQuickAccessFallback', "If we're in quick access mode, this will navigate to the previous item. If we are not in quick access mode, this will navigate to the previous separator.");
if (isMacintosh) {
    registerQuickPickCommandAndKeybindingRule({
        id: 'quickInput.nextSeparatorWithQuickAccessFallback',
        primary: 2048 /* KeyMod.CtrlCmd */ + 18 /* KeyCode.DownArrow */,
        handler: focusHandler(QuickPickFocus.NextSeparator, QuickPickFocus.Next),
        metadata: { description: nextSeparatorFallbackDesc }
    });
    registerQuickPickCommandAndKeybindingRule({
        id: 'quickInput.nextSeparator',
        primary: 2048 /* KeyMod.CtrlCmd */ + 512 /* KeyMod.Alt */ + 18 /* KeyCode.DownArrow */,
        // Since macOS has the cmd key as the primary modifier, we need to add this additional
        // keybinding to capture cmd+ctrl+upArrow
        secondary: [2048 /* KeyMod.CtrlCmd */ + 256 /* KeyMod.WinCtrl */ + 18 /* KeyCode.DownArrow */],
        handler: focusHandler(QuickPickFocus.NextSeparator)
    }, { withCtrlMod: true });
    registerQuickPickCommandAndKeybindingRule({
        id: 'quickInput.previousSeparatorWithQuickAccessFallback',
        primary: 2048 /* KeyMod.CtrlCmd */ + 16 /* KeyCode.UpArrow */,
        handler: focusHandler(QuickPickFocus.PreviousSeparator, QuickPickFocus.Previous),
        metadata: { description: prevSeparatorFallbackDesc }
    });
    registerQuickPickCommandAndKeybindingRule({
        id: 'quickInput.previousSeparator',
        primary: 2048 /* KeyMod.CtrlCmd */ + 512 /* KeyMod.Alt */ + 16 /* KeyCode.UpArrow */,
        // Since macOS has the cmd key as the primary modifier, we need to add this additional
        // keybinding to capture cmd+ctrl+upArrow
        secondary: [2048 /* KeyMod.CtrlCmd */ + 256 /* KeyMod.WinCtrl */ + 16 /* KeyCode.UpArrow */],
        handler: focusHandler(QuickPickFocus.PreviousSeparator)
    }, { withCtrlMod: true });
}
else {
    registerQuickPickCommandAndKeybindingRule({
        id: 'quickInput.nextSeparatorWithQuickAccessFallback',
        primary: 512 /* KeyMod.Alt */ + 18 /* KeyCode.DownArrow */,
        handler: focusHandler(QuickPickFocus.NextSeparator, QuickPickFocus.Next),
        metadata: { description: nextSeparatorFallbackDesc }
    });
    registerQuickPickCommandAndKeybindingRule({
        id: 'quickInput.nextSeparator',
        primary: 2048 /* KeyMod.CtrlCmd */ + 512 /* KeyMod.Alt */ + 18 /* KeyCode.DownArrow */,
        handler: focusHandler(QuickPickFocus.NextSeparator)
    });
    registerQuickPickCommandAndKeybindingRule({
        id: 'quickInput.previousSeparatorWithQuickAccessFallback',
        primary: 512 /* KeyMod.Alt */ + 16 /* KeyCode.UpArrow */,
        handler: focusHandler(QuickPickFocus.PreviousSeparator, QuickPickFocus.Previous),
        metadata: { description: prevSeparatorFallbackDesc }
    });
    registerQuickPickCommandAndKeybindingRule({
        id: 'quickInput.previousSeparator',
        primary: 2048 /* KeyMod.CtrlCmd */ + 512 /* KeyMod.Alt */ + 16 /* KeyCode.UpArrow */,
        handler: focusHandler(QuickPickFocus.PreviousSeparator)
    });
}
//#endregion
//#region Accept
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'quickInput.accept',
    primary: 3 /* KeyCode.Enter */,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: ContextKeyExpr.and(
    // All other kinds of Quick things handle Accept, except Widget. In other words, Accepting is a detail on the things
    // that extend IQuickInput
    ContextKeyExpr.notEquals(quickInputTypeContextKeyValue, "quickWidget" /* QuickInputType.QuickWidget */), inQuickInputContext, ContextKeyExpr.not('isComposing')),
    metadata: { description: localize('nonQuickWidget', "Used while in the context of some quick input. If you change one keybinding for this command, you should change all of the other keybindings (modifier variants) of this command as well.") },
    handler: (accessor) => {
        const currentQuickPick = accessor.get(IQuickInputService).currentQuickInput;
        currentQuickPick?.accept();
    },
    secondary: getSecondary(3 /* KeyCode.Enter */, [], { withAltMod: true, withCtrlMod: true, withCmdMod: true })
});
registerQuickPickCommandAndKeybindingRule({
    id: 'quickInput.acceptInBackground',
    // If we are in the quick pick but the input box is not focused or our cursor is at the end of the input box
    when: ContextKeyExpr.and(inQuickInputContext, ContextKeyExpr.equals(quickInputTypeContextKeyValue, "quickPick" /* QuickInputType.QuickPick */), ContextKeyExpr.or(InputFocusedContext.negate(), endOfQuickInputBoxContext)),
    primary: 17 /* KeyCode.RightArrow */,
    // Need a little extra weight to ensure this keybinding is preferred over the default cmd+alt+right arrow keybinding
    // https://github.com/microsoft/vscode/blob/1451e4fbbbf074a4355cc537c35b547b80ce1c52/src/vs/workbench/browser/parts/editor/editorActions.ts#L1178-L1195
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 50,
    handler: (accessor) => {
        const currentQuickPick = accessor.get(IQuickInputService).currentQuickInput;
        currentQuickPick?.accept(true);
    },
}, { withAltMod: true, withCtrlMod: true, withCmdMod: true });
//#endregion
//#region Hide
registerQuickInputCommandAndKeybindingRule({
    id: 'quickInput.hide',
    primary: 9 /* KeyCode.Escape */,
    handler: (accessor) => {
        const currentQuickPick = accessor.get(IQuickInputService).currentQuickInput;
        currentQuickPick?.hide();
    }
}, { withAltMod: true, withCtrlMod: true, withCmdMod: true });
//#endregion
//#region Toggle Hover
registerQuickPickCommandAndKeybindingRule({
    id: 'quickInput.toggleHover',
    primary: ctrlKeyMod | 10 /* KeyCode.Space */,
    handler: accessor => {
        const quickInputService = accessor.get(IQuickInputService);
        quickInputService.toggleHover();
    }
});
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tJbnB1dEFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL3BvcmlkaGkvZGV2ZWxvcG1lbnQvcHVrdS12cy1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9xdWlja2lucHV0L2Jyb3dzZXIvcXVpY2tJbnB1dEFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRS9ELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUUzQyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDdkUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDN0UsT0FBTyxFQUErQyxtQkFBbUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2xJLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxtQkFBbUIsRUFBRSw2QkFBNkIsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQ2hILE9BQU8sRUFBYSxrQkFBa0IsRUFBMEMsY0FBYyxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFFaEksU0FBUywwQ0FBMEMsQ0FBQyxJQUFnRSxFQUFFLFVBQWlGLEVBQUU7SUFDeE0sbUJBQW1CLENBQUMsZ0NBQWdDLENBQUM7UUFDcEQsTUFBTSw2Q0FBbUM7UUFDekMsSUFBSSxFQUFFLG1CQUFtQjtRQUN6QixRQUFRLEVBQUUsRUFBRSxXQUFXLEVBQUUsUUFBUSxDQUFDLFlBQVksRUFBRSxrTUFBa00sQ0FBQyxFQUFFO1FBQ3JQLEdBQUcsSUFBSTtRQUNQLFNBQVMsRUFBRSxZQUFZLENBQUMsSUFBSSxDQUFDLE9BQVEsRUFBRSxJQUFJLENBQUMsU0FBUyxJQUFJLEVBQUUsRUFBRSxPQUFPLENBQUM7S0FDckUsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQUVELFNBQVMseUNBQXlDLENB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