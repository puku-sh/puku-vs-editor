/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../../base/common/uri.js';
import * as nls from '../../../../nls.js';
import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export const VIEWLET_ID = 'workbench.view.debug';
export const VARIABLES_VIEW_ID = 'workbench.debug.variablesView';
export const WATCH_VIEW_ID = 'workbench.debug.watchExpressionsView';
export const CALLSTACK_VIEW_ID = 'workbench.debug.callStackView';
export const LOADED_SCRIPTS_VIEW_ID = 'workbench.debug.loadedScriptsView';
export const BREAKPOINTS_VIEW_ID = 'workbench.debug.breakPointsView';
export const DISASSEMBLY_VIEW_ID = 'workbench.debug.disassemblyView';
export const DEBUG_PANEL_ID = 'workbench.panel.repl';
export const REPL_VIEW_ID = 'workbench.panel.repl.view';
export const CONTEXT_DEBUG_TYPE = new RawContextKey('debugType', undefined, { type: 'string', description: nls.localize(7636, null) });
export const CONTEXT_DEBUG_CONFIGURATION_TYPE = new RawContextKey('debugConfigurationType', undefined, { type: 'string', description: nls.localize(7637, null) });
export const CONTEXT_DEBUG_STATE = new RawContextKey('debugState', 'inactive', { type: 'string', description: nls.localize(7638, null) });
export const CONTEXT_DEBUG_UX_KEY = 'debugUx';
export const CONTEXT_DEBUG_UX = new RawContextKey(CONTEXT_DEBUG_UX_KEY, 'default', { type: 'string', description: nls.localize(7639, null) });
export const CONTEXT_HAS_DEBUGGED = new RawContextKey('hasDebugged', false, { type: 'boolean', description: nls.localize(7640, null) });
export const CONTEXT_IN_DEBUG_MODE = new RawContextKey('inDebugMode', false, { type: 'boolean', description: nls.localize(7641, null) });
export const CONTEXT_IN_DEBUG_REPL = new RawContextKey('inDebugRepl', false, { type: 'boolean', description: nls.localize(7642, null) });
export const CONTEXT_BREAKPOINT_WIDGET_VISIBLE = new RawContextKey('breakpointWidgetVisible', false, { type: 'boolean', description: nls.localize(7643, null) });
export const CONTEXT_IN_BREAKPOINT_WIDGET = new RawContextKey('inBreakpointWidget', false, { type: 'boolean', description: nls.localize(7644, null) });
export const CONTEXT_BREAKPOINTS_FOCUSED = new RawContextKey('breakpointsFocused', true, { type: 'boolean', description: nls.localize(7645, null) });
export const CONTEXT_WATCH_EXPRESSIONS_FOCUSED = new RawContextKey('watchExpressionsFocused', true, { type: 'boolean', description: nls.localize(7646, null) });
export const CONTEXT_WATCH_EXPRESSIONS_EXIST = new RawContextKey('watchExpressionsExist', false, { type: 'boolean', description: nls.localize(7647, null) });
export const CONTEXT_VARIABLES_FOCUSED = new RawContextKey('variablesFocused', true, { type: 'boolean', description: nls.localize(7648, null) });
export const CONTEXT_EXPRESSION_SELECTED = new RawContextKey('expressionSelected', false, { type: 'boolean', description: nls.localize(7649, null) });
export const CONTEXT_BREAKPOINT_INPUT_FOCUSED = new RawContextKey('breakpointInputFocused', false, { type: 'boolean', description: nls.localize(7650, null) });
export const CONTEXT_CALLSTACK_ITEM_TYPE = new RawContextKey('callStackItemType', undefined, { type: 'string', description: nls.localize(7651, null) });
export const CONTEXT_CALLSTACK_SESSION_IS_ATTACH = new RawContextKey('callStackSessionIsAttach', false, { type: 'boolean', description: nls.localize(7652, null) });
export const CONTEXT_CALLSTACK_ITEM_STOPPED = new RawContextKey('callStackItemStopped', false, { type: 'boolean', description: nls.localize(7653, null) });
export const CONTEXT_CALLSTACK_SESSION_HAS_ONE_THREAD = new RawContextKey('callStackSessionHasOneThread', false, { type: 'boolean', description: nls.localize(7654, null) });
export const CONTEXT_CALLSTACK_FOCUSED = new RawContextKey('callStackFocused', true, { type: 'boolean', description: nls.localize(7655, null) });
export const CONTEXT_WATCH_ITEM_TYPE = new RawContextKey('watchItemType', undefined, { type: 'string', description: nls.localize(7656, null) });
export const CONTEXT_CAN_VIEW_MEMORY = new RawContextKey('canViewMemory', undefined, { type: 'boolean', description: nls.localize(7657, null) });
export const CONTEXT_BREAKPOINT_ITEM_TYPE = new RawContextKey('breakpointItemType', undefined, { type: 'string', description: nls.localize(7658, null) });
export const CONTEXT_BREAKPOINT_ITEM_IS_DATA_BYTES = new RawContextKey('breakpointItemBytes', undefined, { type: 'boolean', description: nls.localize(7659, null) });
export const CONTEXT_BREAKPOINT_HAS_MODES = new RawContextKey('breakpointHasModes', false, { type: 'boolean', description: nls.localize(7660, null) });
export const CONTEXT_BREAKPOINT_SUPPORTS_CONDITION = new RawContextKey('breakpointSupportsCondition', false, { type: 'boolean', description: nls.localize(7661, null) });
export const CONTEXT_LOADED_SCRIPTS_SUPPORTED = new RawContextKey('loadedScriptsSupported', false, { type: 'boolean', description: nls.localize(7662, null) });
export const CONTEXT_LOADED_SCRIPTS_ITEM_TYPE = new RawContextKey('loadedScriptsItemType', undefined, { type: 'string', description: nls.localize(7663, null) });
export const CONTEXT_FOCUSED_SESSION_IS_ATTACH = new RawContextKey('focusedSessionIsAttach', false, { type: 'boolean', description: nls.localize(7664, null) });
export const CONTEXT_FOCUSED_SESSION_IS_NO_DEBUG = new RawContextKey('focusedSessionIsNoDebug', false, { type: 'boolean', description: nls.localize(7665, null) });
export const CONTEXT_STEP_BACK_SUPPORTED = new RawContextKey('stepBackSupported', false, { type: 'boolean', description: nls.localize(7666, null) });
export const CONTEXT_RESTART_FRAME_SUPPORTED = new RawContextKey('restartFrameSupported', false, { type: 'boolean', description: nls.localize(7667, null) });
export const CONTEXT_STACK_FRAME_SUPPORTS_RESTART = new RawContextKey('stackFrameSupportsRestart', false, { type: 'boolean', description: nls.localize(7668, null) });
export const CONTEXT_JUMP_TO_CURSOR_SUPPORTED = new RawContextKey('jumpToCursorSupported', false, { type: 'boolean', description: nls.localize(7669, null) });
export const CONTEXT_STEP_INTO_TARGETS_SUPPORTED = new RawContextKey('stepIntoTargetsSupported', false, { type: 'boolean', description: nls.localize(7670, null) });
export const CONTEXT_BREAKPOINTS_EXIST = new RawContextKey('breakpointsExist', false, { type: 'boolean', description: nls.localize(7671, null) });
export const CONTEXT_DEBUGGERS_AVAILABLE = new RawContextKey('debuggersAvailable', false, { type: 'boolean', description: nls.localize(7672, null) });
export const CONTEXT_DEBUG_EXTENSION_AVAILABLE = new RawContextKey('debugExtensionAvailable', true, { type: 'boolean', description: nls.localize(7673, null) });
export const CONTEXT_DEBUG_PROTOCOL_VARIABLE_MENU_CONTEXT = new RawContextKey('debugProtocolVariableMenuContext', undefined, { type: 'string', description: nls.localize(7674, null) });
export const CONTEXT_SET_VARIABLE_SUPPORTED = new RawContextKey('debugSetVariableSupported', false, { type: 'boolean', description: nls.localize(7675, null) });
export const CONTEXT_SET_DATA_BREAKPOINT_BYTES_SUPPORTED = new RawContextKey('debugSetDataBreakpointAddressSupported', false, { type: 'boolean', description: nls.localize(7676, null) });
export const CONTEXT_SET_EXPRESSION_SUPPORTED = new RawContextKey('debugSetExpressionSupported', false, { type: 'boolean', description: nls.localize(7677, null) });
export const CONTEXT_BREAK_WHEN_VALUE_CHANGES_SUPPORTED = new RawContextKey('breakWhenValueChangesSupported', false, { type: 'boolean', description: nls.localize(7678, null) });
export const CONTEXT_BREAK_WHEN_VALUE_IS_ACCESSED_SUPPORTED = new RawContextKey('breakWhenValueIsAccessedSupported', false, { type: 'boolean', description: nls.localize(7679, null) });
export const CONTEXT_BREAK_WHEN_VALUE_IS_READ_SUPPORTED = new RawContextKey('breakWhenValueIsReadSupported', false, { type: 'boolean', description: nls.localize(7680, null) });
export const CONTEXT_TERMINATE_DEBUGGEE_SUPPORTED = new RawContextKey('terminateDebuggeeSupported', false, { type: 'boolean', description: nls.localize(7681, null) });
export const CONTEXT_SUSPEND_DEBUGGEE_SUPPORTED = new RawContextKey('suspendDebuggeeSupported', false, { type: 'boolean', description: nls.localize(7682, null) });
export const CONTEXT_TERMINATE_THREADS_SUPPORTED = new RawContextKey('terminateThreadsSupported', false, { type: 'boolean', description: nls.localize(7683, null) });
export const CONTEXT_VARIABLE_EVALUATE_NAME_PRESENT = new RawContextKey('variableEvaluateNamePresent', false, { type: 'boolean', description: nls.localize(7684, null) });
export const CONTEXT_VARIABLE_IS_READONLY = new RawContextKey('variableIsReadonly', false, { type: 'boolean', description: nls.localize(7685, null) });
export const CONTEXT_VARIABLE_VALUE = new RawContextKey('variableValue', false, { type: 'string', description: nls.localize(7686, null) });
export const CONTEXT_VARIABLE_TYPE = new RawContextKey('variableType', false, { type: 'string', description: nls.localize(7687, null) });
export const CONTEXT_VARIABLE_INTERFACES = new RawContextKey('variableInterfaces', false, { type: 'array', description: nls.localize(7688, null) });
export const CONTEXT_VARIABLE_NAME = new RawContextKey('variableName', false, { type: 'string', description: nls.localize(7689, null) });
export const CONTEXT_VARIABLE_LANGUAGE = new RawContextKey('variableLanguage', false, { type: 'string', description: nls.localize(7690, null) });
export const CONTEXT_VARIABLE_EXTENSIONID = new RawContextKey('variableExtensionId', false, { type: 'string', description: nls.localize(7691, null) });
export const CONTEXT_EXCEPTION_WIDGET_VISIBLE = new RawContextKey('exceptionWidgetVisible', false, { type: 'boolean', description: nls.localize(7692, null) });
export const CONTEXT_MULTI_SESSION_REPL = new RawContextKey('multiSessionRepl', false, { type: 'boolean', description: nls.localize(7693, null) });
export const CONTEXT_MULTI_SESSION_DEBUG = new RawContextKey('multiSessionDebug', false, { type: 'boolean', description: nls.localize(7694, null) });
export const CONTEXT_DISASSEMBLE_REQUEST_SUPPORTED = new RawContextKey('disassembleRequestSupported', false, { type: 'boolean', description: nls.localize(7695, null) });
export const CONTEXT_DISASSEMBLY_VIEW_FOCUS = new RawContextKey('disassemblyViewFocus', false, { type: 'boolean', description: nls.localize(7696, null) });
export const CONTEXT_LANGUAGE_SUPPORTS_DISASSEMBLE_REQUEST = new RawContextKey('languageSupportsDisassembleRequest', false, { type: 'boolean', description: nls.localize(7697, null) });
export const CONTEXT_FOCUSED_STACK_FRAME_HAS_INSTRUCTION_POINTER_REFERENCE = new RawContextKey('focusedStackFrameHasInstructionReference', false, { type: 'boolean', description: nls.localize(7698, null) });
export const debuggerDisabledMessage = (debugType) => nls.localize(7699, null, debugType);
export const EDITOR_CONTRIBUTION_ID = 'editor.contrib.debug';
export const BREAKPOINT_EDITOR_CONTRIBUTION_ID = 'editor.contrib.breakpoint';
export const DEBUG_SCHEME = 'debug';
export const INTERNAL_CONSOLE_OPTIONS_SCHEMA = {
    enum: ['neverOpen', 'openOnSessionStart', 'openOnFirstSessionStart'],
    default: 'openOnFirstSessionStart',
    description: nls.localize(7700, null)
};
export var State;
(function (State) {
    State[State["Inactive"] = 0] = "Inactive";
    State[State["Initializing"] = 1] = "Initializing";
    State[State["Stopped"] = 2] = "Stopped";
    State[State["Running"] = 3] = "Running";
})(State || (State = {}));
export function getStateLabel(state) {
    switch (state) {
        case 1 /* State.Initializing */: return 'initializing';
        case 2 /* State.Stopped */: return 'stopped';
        case 3 /* State.Running */: return 'running';
        default: return 'inactive';
    }
}
export var MemoryRangeType;
(function (MemoryRangeType) {
    MemoryRangeType[MemoryRangeType["Valid"] = 0] = "Valid";
    MemoryRangeType[MemoryRangeType["Unreadable"] = 1] = "Unreadable";
    MemoryRangeType[MemoryRangeType["Error"] = 2] = "Error";
})(MemoryRangeType || (MemoryRangeType = {}));
export const DEBUG_MEMORY_SCHEME = 'vscode-debug-memory';
export function isFrameDeemphasized(frame) {
    const hint = frame.presentationHint ?? frame.source.presentationHint;
    return hint === 'deemphasize' || hint === 'subtle';
}
export var DataBreakpointSetType;
(function (DataBreakpointSetType) {
    DataBreakpointSetType[DataBreakpointSetType["Variable"] = 0] = "Variable";
    DataBreakpointSetType[DataBreakpointSetType["Address"] = 1] = "Address";
})(DataBreakpointSetType || (DataBreakpointSetType = {}));
export var DebugConfigurationProviderTriggerKind;
(function (DebugConfigurationProviderTriggerKind) {
    /**
     *	`DebugConfigurationProvider.provideDebugConfigurations` is called to provide the initial debug configurations for a newly created launch.json.
     */
    DebugConfigurationProviderTriggerKind[DebugConfigurationProviderTriggerKind["Initial"] = 1] = "Initial";
    /**
     * `DebugConfigurationProvider.provideDebugConfigurations` is called to provide dynamically generated debug configurations when the user asks for them through the UI (e.g. via the "Select and Start Debugging" command).
     */
    DebugConfigurationProviderTriggerKind[DebugConfigurationProviderTriggerKind["Dynamic"] = 2] = "Dynamic";
})(DebugConfigurationProviderTriggerKind || (DebugConfigurationProviderTriggerKind = {}));
export var DebuggerString;
(function (DebuggerString) {
    DebuggerString["UnverifiedBreakpoints"] = "unverifiedBreakpoints";
})(DebuggerString || (DebuggerString = {}));
// Debug service interfaces
export const IDebugService = createDecorator('debugService');
// Editor interfaces
export var BreakpointWidgetContext;
(function (BreakpointWidgetContext) {
    BreakpointWidgetContext[BreakpointWidgetContext["CONDITION"] = 0] = "CONDITION";
    BreakpointWidgetContext[BreakpointWidgetContext["HIT_COUNT"] = 1] = "HIT_COUNT";
    BreakpointWidgetContext[BreakpointWidgetContext["LOG_MESSAGE"] = 2] = "LOG_MESSAGE";
    BreakpointWidgetContext[BreakpointWidgetContext["TRIGGER_POINT"] = 3] = "TRIGGER_POINT";
})(BreakpointWidgetContext || (BreakpointWidgetContext = {}));
export var DebugVisualizationType;
(function (DebugVisualizationType) {
    DebugVisualizationType[DebugVisualizationType["Command"] = 0] = "Command";
    DebugVisualizationType[DebugVisualizationType["Tree"] = 1] = "Tree";
})(DebugVisualizationType || (DebugVisualizationType = {}));
export var DebugTreeItemCollapsibleState;
(function (DebugTreeItemCollapsibleState) {
    DebugTreeItemCollapsibleState[DebugTreeItemCollapsibleState["None"] = 0] = "None";
    DebugTreeItemCollapsibleState[DebugTreeItemCollapsibleState["Collapsed"] = 1] = "Collapsed";
    DebugTreeItemCollapsibleState[DebugTreeItemCollapsibleState["Expanded"] = 2] = "Expanded";
})(DebugTreeItemCollapsibleState || (DebugTreeItemCollapsibleState = {}));
export var IDebugVisualizationTreeItem;
(function (IDebugVisualizationTreeItem) {
    IDebugVisualizationTreeItem.deserialize = (v) => v;
    IDebugVisualizationTreeItem.serialize = (item) => item;
})(IDebugVisualizationTreeItem || (IDebugVisualizationTreeItem = {}));
export var IDebugVisualization;
(function (IDebugVisualization) {
    IDebugVisualization.deserialize = (v) => ({
        id: v.id,
        name: v.name,
        iconPath: v.iconPath && { light: URI.revive(v.iconPath.light), dark: URI.revive(v.iconPath.dark) },
        iconClass: v.iconClass,
        visualization: v.visualization,
    });
    IDebugVisualization.serialize = (visualizer) => visualizer;
})(IDebugVisualization || (IDebugVisualization = {}));
//# sourceMappingURL=debug.js.map