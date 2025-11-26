/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { fromNow, getDurationString } from '../../../../../base/common/date.js';
import { isNumber } from '../../../../../base/common/types.js';
import { localize } from '../../../../../nls.js';
import { terminalDecorationError, terminalDecorationIncomplete, terminalDecorationSuccess } from '../terminalIcons.js';
var DecorationStyles;
(function (DecorationStyles) {
    DecorationStyles[DecorationStyles["DefaultDimension"] = 16] = "DefaultDimension";
    DecorationStyles[DecorationStyles["MarginLeft"] = -17] = "MarginLeft";
})(DecorationStyles || (DecorationStyles = {}));
export var DecorationSelector;
(function (DecorationSelector) {
    DecorationSelector["CommandDecoration"] = "terminal-command-decoration";
    DecorationSelector["Hide"] = "hide";
    DecorationSelector["ErrorColor"] = "error";
    DecorationSelector["DefaultColor"] = "default-color";
    DecorationSelector["Default"] = "default";
    DecorationSelector["Codicon"] = "codicon";
    DecorationSelector["XtermDecoration"] = "xterm-decoration";
    DecorationSelector["OverviewRuler"] = ".xterm-decoration-overview-ruler";
})(DecorationSelector || (DecorationSelector = {}));
export function getTerminalDecorationHoverContent(command, hoverMessage, showCommandActions) {
    let hoverContent = showCommandActions ? `${localize(12771, null)}\n\n---\n\n` : '';
    if (!command) {
        if (hoverMessage) {
            hoverContent = hoverMessage;
        }
        else {
            return '';
        }
    }
    else if (command.markProperties || hoverMessage) {
        if (command.markProperties?.hoverMessage || hoverMessage) {
            hoverContent = command.markProperties?.hoverMessage || hoverMessage || '';
        }
        else {
            return '';
        }
    }
    else {
        if (isNumber(command.duration)) {
            const durationText = getDurationString(command.duration);
            if (command.exitCode) {
                if (command.exitCode === -1) {
                    hoverContent += localize(12772, null, fromNow(command.timestamp, true), durationText);
                }
                else {
                    hoverContent += localize(12773, null, fromNow(command.timestamp, true), durationText, command.exitCode);
                }
            }
            else {
                hoverContent += localize(12774, null, fromNow(command.timestamp, true), durationText);
            }
        }
        else {
            if (command.exitCode) {
                if (command.exitCode === -1) {
                    hoverContent += localize(12775, null, fromNow(command.timestamp, true));
                }
                else {
                    hoverContent += localize(12776, null, fromNow(command.timestamp, true), command.exitCode);
                }
            }
            else {
                hoverContent += localize(12777, null);
            }
        }
    }
    return hoverContent;
}
export var TerminalCommandDecorationStatus;
(function (TerminalCommandDecorationStatus) {
    TerminalCommandDecorationStatus["Unknown"] = "unknown";
    TerminalCommandDecorationStatus["Running"] = "running";
    TerminalCommandDecorationStatus["Success"] = "success";
    TerminalCommandDecorationStatus["Error"] = "error";
})(TerminalCommandDecorationStatus || (TerminalCommandDecorationStatus = {}));
const unknownText = localize(12778, null);
const runningText = localize(12779, null);
export function getTerminalCommandDecorationTooltip(command, storedState) {
    if (command) {
        return getTerminalDecorationHoverContent(command);
    }
    if (!storedState) {
        return '';
    }
    const timestamp = storedState.timestamp;
    const exitCode = storedState.exitCode;
    const duration = storedState.duration;
    if (typeof timestamp !== 'number' || timestamp === undefined) {
        return '';
    }
    let hoverContent = '';
    const fromNowText = fromNow(timestamp, true);
    if (typeof duration === 'number') {
        const durationText = getDurationString(Math.max(duration, 0));
        if (exitCode) {
            if (exitCode === -1) {
                hoverContent += localize(12780, null, fromNowText, durationText);
            }
            else {
                hoverContent += localize(12781, null, fromNowText, durationText, exitCode);
            }
        }
        else {
            hoverContent += localize(12782, null, fromNowText, durationText);
        }
    }
    else {
        if (exitCode) {
            if (exitCode === -1) {
                hoverContent += localize(12783, null, fromNowText);
            }
            else {
                hoverContent += localize(12784, null, fromNowText, exitCode);
            }
        }
        else {
            hoverContent += localize(12785, null, fromNowText);
        }
    }
    return hoverContent;
}
export function getTerminalCommandDecorationState(command, storedState, now = Date.now()) {
    let status = "unknown" /* TerminalCommandDecorationStatus.Unknown */;
    const exitCode = command?.exitCode ?? storedState?.exitCode;
    let exitCodeText = unknownText;
    const startTimestamp = command?.timestamp ?? storedState?.timestamp;
    let startText = unknownText;
    let durationMs;
    let durationText = unknownText;
    if (typeof startTimestamp === 'number') {
        startText = new Date(startTimestamp).toLocaleString();
    }
    if (command) {
        if (command.exitCode === undefined) {
            status = "running" /* TerminalCommandDecorationStatus.Running */;
            exitCodeText = runningText;
            durationMs = startTimestamp !== undefined ? Math.max(0, now - startTimestamp) : undefined;
        }
        else if (command.exitCode !== 0) {
            status = "error" /* TerminalCommandDecorationStatus.Error */;
            exitCodeText = String(command.exitCode);
            durationMs = command.duration ?? (startTimestamp !== undefined ? Math.max(0, now - startTimestamp) : undefined);
        }
        else {
            status = "success" /* TerminalCommandDecorationStatus.Success */;
            exitCodeText = String(command.exitCode);
            durationMs = command.duration ?? (startTimestamp !== undefined ? Math.max(0, now - startTimestamp) : undefined);
        }
    }
    else if (storedState) {
        if (storedState.exitCode === undefined) {
            status = "running" /* TerminalCommandDecorationStatus.Running */;
            exitCodeText = runningText;
            durationMs = startTimestamp !== undefined ? Math.max(0, now - startTimestamp) : undefined;
        }
        else if (storedState.exitCode !== 0) {
            status = "error" /* TerminalCommandDecorationStatus.Error */;
            exitCodeText = String(storedState.exitCode);
            durationMs = storedState.duration;
        }
        else {
            status = "success" /* TerminalCommandDecorationStatus.Success */;
            exitCodeText = String(storedState.exitCode);
            durationMs = storedState.duration;
        }
    }
    if (typeof durationMs === 'number') {
        durationText = getDurationString(Math.max(durationMs, 0));
    }
    const classNames = [];
    let icon = terminalDecorationIncomplete;
    switch (status) {
        case "running" /* TerminalCommandDecorationStatus.Running */:
        case "unknown" /* TerminalCommandDecorationStatus.Unknown */:
            classNames.push("default-color" /* DecorationSelector.DefaultColor */, "default" /* DecorationSelector.Default */);
            icon = terminalDecorationIncomplete;
            break;
        case "error" /* TerminalCommandDecorationStatus.Error */:
            classNames.push("error" /* DecorationSelector.ErrorColor */);
            icon = terminalDecorationError;
            break;
        case "success" /* TerminalCommandDecorationStatus.Success */:
            classNames.push('success');
            icon = terminalDecorationSuccess;
            break;
    }
    const hoverMessage = getTerminalCommandDecorationTooltip(command, storedState);
    return {
        status,
        icon,
        classNames,
        exitCode,
        exitCodeText,
        startTimestamp,
        startText,
        duration: durationMs,
        durationText,
        hoverMessage
    };
}
export function updateLayout(configurationService, element) {
    if (!element) {
        return;
    }
    const fontSize = configurationService.inspect("terminal.integrated.fontSize" /* TerminalSettingId.FontSize */).value;
    const defaultFontSize = configurationService.inspect("terminal.integrated.fontSize" /* TerminalSettingId.FontSize */).defaultValue;
    const lineHeight = configurationService.inspect("terminal.integrated.lineHeight" /* TerminalSettingId.LineHeight */).value;
    if (isNumber(fontSize) && isNumber(defaultFontSize) && isNumber(lineHeight)) {
        const scalar = (fontSize / defaultFontSize) <= 1 ? (fontSize / defaultFontSize) : 1;
        // must be inlined to override the inlined styles from xterm
        element.style.width = `${scalar * 16 /* DecorationStyles.DefaultDimension */}px`;
        element.style.height = `${scalar * 16 /* DecorationStyles.DefaultDimension */ * lineHeight}px`;
        element.style.fontSize = `${scalar * 16 /* DecorationStyles.DefaultDimension */}px`;
        element.style.marginLeft = `${scalar * -17 /* DecorationStyles.MarginLeft */}px`;
    }
}
//# sourceMappingURL=decorationStyles.js.map