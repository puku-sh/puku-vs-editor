/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../base/common/codicons.js';
import { localize } from '../../../../nls.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
export const debugConsoleViewIcon = registerIcon('debug-console-view-icon', Codicon.debugConsole, localize(7367, null));
export const runViewIcon = registerIcon('run-view-icon', Codicon.debugAlt, localize(7368, null));
export const variablesViewIcon = registerIcon('variables-view-icon', Codicon.debugAlt, localize(7369, null));
export const watchViewIcon = registerIcon('watch-view-icon', Codicon.debugAlt, localize(7370, null));
export const callStackViewIcon = registerIcon('callstack-view-icon', Codicon.debugAlt, localize(7371, null));
export const breakpointsViewIcon = registerIcon('breakpoints-view-icon', Codicon.debugAlt, localize(7372, null));
export const loadedScriptsViewIcon = registerIcon('loaded-scripts-view-icon', Codicon.debugAlt, localize(7373, null));
export const breakpoint = {
    regular: registerIcon('debug-breakpoint', Codicon.debugBreakpoint, localize(7374, null)),
    disabled: registerIcon('debug-breakpoint-disabled', Codicon.debugBreakpointDisabled, localize(7375, null)),
    unverified: registerIcon('debug-breakpoint-unverified', Codicon.debugBreakpointUnverified, localize(7376, null)),
    pending: registerIcon('debug-breakpoint-pending', Codicon.debugBreakpointPending, localize(7377, null)),
};
export const functionBreakpoint = {
    regular: registerIcon('debug-breakpoint-function', Codicon.debugBreakpointFunction, localize(7378, null)),
    disabled: registerIcon('debug-breakpoint-function-disabled', Codicon.debugBreakpointFunctionDisabled, localize(7379, null)),
    unverified: registerIcon('debug-breakpoint-function-unverified', Codicon.debugBreakpointFunctionUnverified, localize(7380, null))
};
export const conditionalBreakpoint = {
    regular: registerIcon('debug-breakpoint-conditional', Codicon.debugBreakpointConditional, localize(7381, null)),
    disabled: registerIcon('debug-breakpoint-conditional-disabled', Codicon.debugBreakpointConditionalDisabled, localize(7382, null)),
    unverified: registerIcon('debug-breakpoint-conditional-unverified', Codicon.debugBreakpointConditionalUnverified, localize(7383, null))
};
export const dataBreakpoint = {
    regular: registerIcon('debug-breakpoint-data', Codicon.debugBreakpointData, localize(7384, null)),
    disabled: registerIcon('debug-breakpoint-data-disabled', Codicon.debugBreakpointDataDisabled, localize(7385, null)),
    unverified: registerIcon('debug-breakpoint-data-unverified', Codicon.debugBreakpointDataUnverified, localize(7386, null)),
};
export const logBreakpoint = {
    regular: registerIcon('debug-breakpoint-log', Codicon.debugBreakpointLog, localize(7387, null)),
    disabled: registerIcon('debug-breakpoint-log-disabled', Codicon.debugBreakpointLogDisabled, localize(7388, null)),
    unverified: registerIcon('debug-breakpoint-log-unverified', Codicon.debugBreakpointLogUnverified, localize(7389, null)),
};
export const debugBreakpointHint = registerIcon('debug-hint', Codicon.debugHint, localize(7390, null));
export const debugBreakpointUnsupported = registerIcon('debug-breakpoint-unsupported', Codicon.debugBreakpointUnsupported, localize(7391, null));
export const allBreakpoints = [breakpoint, functionBreakpoint, conditionalBreakpoint, dataBreakpoint, logBreakpoint];
export const debugStackframe = registerIcon('debug-stackframe', Codicon.debugStackframe, localize(7392, null));
export const debugStackframeFocused = registerIcon('debug-stackframe-focused', Codicon.debugStackframeFocused, localize(7393, null));
export const debugGripper = registerIcon('debug-gripper', Codicon.gripper, localize(7394, null));
export const debugRestartFrame = registerIcon('debug-restart-frame', Codicon.debugRestartFrame, localize(7395, null));
export const debugStop = registerIcon('debug-stop', Codicon.debugStop, localize(7396, null));
export const debugDisconnect = registerIcon('debug-disconnect', Codicon.debugDisconnect, localize(7397, null));
export const debugRestart = registerIcon('debug-restart', Codicon.debugRestart, localize(7398, null));
export const debugStepOver = registerIcon('debug-step-over', Codicon.debugStepOver, localize(7399, null));
export const debugStepInto = registerIcon('debug-step-into', Codicon.debugStepInto, localize(7400, null));
export const debugStepOut = registerIcon('debug-step-out', Codicon.debugStepOut, localize(7401, null));
export const debugStepBack = registerIcon('debug-step-back', Codicon.debugStepBack, localize(7402, null));
export const debugPause = registerIcon('debug-pause', Codicon.debugPause, localize(7403, null));
export const debugContinue = registerIcon('debug-continue', Codicon.debugContinue, localize(7404, null));
export const debugReverseContinue = registerIcon('debug-reverse-continue', Codicon.debugReverseContinue, localize(7405, null));
export const debugRun = registerIcon('debug-run', Codicon.run, localize(7406, null));
export const debugStart = registerIcon('debug-start', Codicon.debugStart, localize(7407, null));
export const debugConfigure = registerIcon('debug-configure', Codicon.gear, localize(7408, null));
export const debugConsole = registerIcon('debug-console', Codicon.gear, localize(7409, null));
export const debugRemoveConfig = registerIcon('debug-remove-config', Codicon.trash, localize(7410, null));
export const debugCollapseAll = registerIcon('debug-collapse-all', Codicon.collapseAll, localize(7411, null));
export const callstackViewSession = registerIcon('callstack-view-session', Codicon.bug, localize(7412, null));
export const debugConsoleClearAll = registerIcon('debug-console-clear-all', Codicon.clearAll, localize(7413, null));
export const watchExpressionsRemoveAll = registerIcon('watch-expressions-remove-all', Codicon.closeAll, localize(7414, null));
export const watchExpressionRemove = registerIcon('watch-expression-remove', Codicon.removeClose, localize(7415, null));
export const watchExpressionsAdd = registerIcon('watch-expressions-add', Codicon.add, localize(7416, null));
export const watchExpressionsAddFuncBreakpoint = registerIcon('watch-expressions-add-function-breakpoint', Codicon.add, localize(7417, null));
export const watchExpressionsAddDataBreakpoint = registerIcon('watch-expressions-add-data-breakpoint', Codicon.variableGroup, localize(7418, null));
export const breakpointsRemoveAll = registerIcon('breakpoints-remove-all', Codicon.closeAll, localize(7419, null));
export const breakpointsActivate = registerIcon('breakpoints-activate', Codicon.activateBreakpoints, localize(7420, null));
export const debugConsoleEvaluationInput = registerIcon('debug-console-evaluation-input', Codicon.arrowSmallRight, localize(7421, null));
export const debugConsoleEvaluationPrompt = registerIcon('debug-console-evaluation-prompt', Codicon.chevronRight, localize(7422, null));
export const debugInspectMemory = registerIcon('debug-inspect-memory', Codicon.fileBinary, localize(7423, null));
//# sourceMappingURL=debugIcons.js.map