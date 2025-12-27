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
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { debounce } from '../../../../base/common/decorators.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable, MandatoryMutableDisposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { ILogService } from '../../../log/common/log.js';
import { isString } from '../../../../base/common/types.js';
import { isFullTerminalCommand, PartialTerminalCommand, TerminalCommand } from './commandDetection/terminalCommand.js';
import { PromptInputModel } from './commandDetection/promptInputModel.js';
let CommandDetectionCapability = class CommandDetectionCapability extends Disposable {
    get promptInputModel() { return this._promptInputModel; }
    get hasRichCommandDetection() { return this._hasRichCommandDetection; }
    get commands() { return this._commands; }
    get executingCommand() { return this._currentCommand.command; }
    get executingCommandObject() {
        if (this._currentCommand.commandStartMarker) {
            // HACK: This does a lot more than the consumer of the API needs. It's also a little
            //       misleading since it's not promoting the current command yet.
            return this._currentCommand.promoteToFullCommand(this._cwd, undefined, this._handleCommandStartOptions?.ignoreCommandLine ?? false, undefined);
        }
        return undefined;
    }
    get executingCommandConfidence() {
        const casted = this._currentCommand;
        return isFullTerminalCommand(casted) ? casted.commandLineConfidence : undefined;
    }
    get currentCommand() {
        return this._currentCommand;
    }
    get cwd() { return this._cwd; }
    get promptTerminator() { return this._promptTerminator; }
    constructor(_terminal, _logService) {
        super();
        this._terminal = _terminal;
        this._logService = _logService;
        this.type = 2 /* TerminalCapability.CommandDetection */;
        this._commands = [];
        this._commandMarkers = [];
        this.__isCommandStorageDisabled = false;
        this._hasRichCommandDetection = false;
        this._onCommandStarted = this._register(new Emitter());
        this.onCommandStarted = this._onCommandStarted.event;
        this._onCommandStartChanged = this._register(new Emitter());
        this.onCommandStartChanged = this._onCommandStartChanged.event;
        this._onBeforeCommandFinished = this._register(new Emitter());
        this.onBeforeCommandFinished = this._onBeforeCommandFinished.event;
        this._onCommandFinished = this._register(new Emitter());
        this.onCommandFinished = this._onCommandFinished.event;
        this._onCommandExecuted = this._register(new Emitter());
        this.onCommandExecuted = this._onCommandExecuted.event;
        this._onCommandInvalidated = this._register(new Emitter());
        this.onCommandInvalidated = this._onCommandInvalidated.event;
        this._onCurrentCommandInvalidated = this._register(new Emitter());
        this.onCurrentCommandInvalidated = this._onCurrentCommandInvalidated.event;
        this._onSetRichCommandDetection = this._register(new Emitter());
        this.onSetRichCommandDetection = this._onSetRichCommandDetection.event;
        this._currentCommand = new PartialTerminalCommand(this._terminal);
        this._promptInputModel = this._register(new PromptInputModel(this._terminal, this.onCommandStarted, this.onCommandStartChanged, this.onCommandExecuted, this._logService));
        // Pull command line from the buffer if it was not set explicitly
        this._register(this.onCommandExecuted(command => {
            if (command.commandLineConfidence !== 'high') {
                // HACK: onCommandExecuted actually fired with PartialTerminalCommand
                const typedCommand = command;
                command.command = typedCommand.extractCommandLine();
                command.commandLineConfidence = 'low';
                // ITerminalCommand
                if (isFullTerminalCommand(typedCommand)) {
                    if (
                    // Markers exist
                    typedCommand.promptStartMarker && typedCommand.marker && typedCommand.executedMarker &&
                        // Single line command
                        command.command.indexOf('\n') === -1 &&
                        // Start marker is not on the left-most column
                        typedCommand.startX !== undefined && typedCommand.startX > 0) {
                        command.commandLineConfidence = 'medium';
                    }
                }
                // PartialTerminalCommand
                else {
                    if (
                    // Markers exist
                    typedCommand.promptStartMarker && typedCommand.commandStartMarker && typedCommand.commandExecutedMarker &&
                        // Single line command
                        command.command.indexOf('\n') === -1 &&
                        // Start marker is not on the left-most column
                        typedCommand.commandStartX !== undefined && typedCommand.commandStartX > 0) {
                        command.commandLineConfidence = 'medium';
                    }
                }
            }
        }));
        this._register(this._terminal.parser.registerCsiHandler({ final: 'J' }, params => {
            if (params.length >= 1 && params[0] === 2) {
                if (!this._terminal.options.scrollOnEraseInDisplay) {
                    this._clearCommandsInViewport();
                }
                this._currentCommand.wasCleared = true;
            }
            // We don't want to override xterm.js' default behavior, just augment it
            return false;
        }));
        // Set up platform-specific behaviors
        const that = this;
        this._ptyHeuristicsHooks = new class {
            get onCurrentCommandInvalidatedEmitter() { return that._onCurrentCommandInvalidated; }
            get onCommandStartedEmitter() { return that._onCommandStarted; }
            get onCommandExecutedEmitter() { return that._onCommandExecuted; }
            get dimensions() { return that._dimensions; }
            get isCommandStorageDisabled() { return that.__isCommandStorageDisabled; }
            get commandMarkers() { return that._commandMarkers; }
            set commandMarkers(value) { that._commandMarkers = value; }
            get clearCommandsInViewport() { return that._clearCommandsInViewport.bind(that); }
        };
        this._ptyHeuristics = this._register(new MandatoryMutableDisposable(new UnixPtyHeuristics(this._terminal, this, this._ptyHeuristicsHooks, this._logService)));
        this._dimensions = {
            cols: this._terminal.cols,
            rows: this._terminal.rows
        };
        this._register(this._terminal.onResize(e => this._handleResize(e)));
        this._register(this._terminal.onCursorMove(() => this._handleCursorMove()));
    }
    _handleResize(e) {
        this._ptyHeuristics.value.preHandleResize?.(e);
        this._dimensions.cols = e.cols;
        this._dimensions.rows = e.rows;
    }
    _handleCursorMove() {
        if (this._store.isDisposed) {
            return;
        }
        // Early versions of conpty do not have real support for an alt buffer, in addition certain
        // commands such as tsc watch will write to the top of the normal buffer. The following
        // checks when the cursor has moved while the normal buffer is empty and if it is above the
        // current command, all decorations within the viewport will be invalidated.
        //
        // This function is debounced so that the cursor is only checked when it is stable so
        // conpty's screen reprinting will not trigger decoration clearing.
        //
        // This is mostly a workaround for Windows but applies to all OS' because of the tsc watch
        // case.
        if (this._terminal.buffer.active === this._terminal.buffer.normal && this._currentCommand.commandStartMarker) {
            if (this._terminal.buffer.active.baseY + this._terminal.buffer.active.cursorY < this._currentCommand.commandStartMarker.line) {
                this._clearCommandsInViewport();
                this._currentCommand.isInvalid = true;
                this._onCurrentCommandInvalidated.fire({ reason: "windows" /* CommandInvalidationReason.Windows */ });
            }
        }
    }
    _clearCommandsInViewport() {
        // Find the number of commands on the tail end of the array that are within the viewport
        let count = 0;
        for (let i = this._commands.length - 1; i >= 0; i--) {
            const line = this._commands[i].marker?.line;
            if (line && line < this._terminal.buffer.active.baseY) {
                break;
            }
            count++;
        }
        // Remove them
        if (count > 0) {
            this._onCommandInvalidated.fire(this._commands.splice(this._commands.length - count, count));
        }
    }
    setContinuationPrompt(value) {
        this._promptInputModel.setContinuationPrompt(value);
    }
    // TODO: Simplify this, can everything work off the last line?
    setPromptTerminator(promptTerminator, lastPromptLine) {
        this._logService.debug('CommandDetectionCapability#setPromptTerminator', promptTerminator);
        this._promptTerminator = promptTerminator;
        this._promptInputModel.setLastPromptLine(lastPromptLine);
    }
    setCwd(value) {
        this._cwd = value;
    }
    setIsWindowsPty(value) {
        if (value && !(this._ptyHeuristics.value instanceof WindowsPtyHeuristics)) {
            const that = this;
            this._ptyHeuristics.value = new WindowsPtyHeuristics(this._terminal, this, new class {
                get onCurrentCommandInvalidatedEmitter() { return that._onCurrentCommandInvalidated; }
                get onCommandStartedEmitter() { return that._onCommandStarted; }
                get onCommandExecutedEmitter() { return that._onCommandExecuted; }
                get dimensions() { return that._dimensions; }
                get isCommandStorageDisabled() { return that.__isCommandStorageDisabled; }
                get commandMarkers() { return that._commandMarkers; }
                set commandMarkers(value) { that._commandMarkers = value; }
                get clearCommandsInViewport() { return that._clearCommandsInViewport.bind(that); }
            }, this._logService);
        }
        else if (!value && !(this._ptyHeuristics.value instanceof UnixPtyHeuristics)) {
            this._ptyHeuristics.value = new UnixPtyHeuristics(this._terminal, this, this._ptyHeuristicsHooks, this._logService);
        }
    }
    setHasRichCommandDetection(value) {
        this._hasRichCommandDetection = value;
        this._onSetRichCommandDetection.fire(value);
    }
    setIsCommandStorageDisabled() {
        this.__isCommandStorageDisabled = true;
    }
    getCommandForLine(line) {
        // Handle the current partial command first, anything below it's prompt is considered part
        // of the current command
        if (this._currentCommand.promptStartMarker && line >= this._currentCommand.promptStartMarker?.line) {
            return this._currentCommand;
        }
        // No commands
        if (this._commands.length === 0) {
            return undefined;
        }
        // Line is before any registered commands
        if ((this._commands[0].promptStartMarker ?? this._commands[0].marker).line > line) {
            return undefined;
        }
        // Iterate backwards through commands to find the right one
        for (let i = this.commands.length - 1; i >= 0; i--) {
            if ((this.commands[i].promptStartMarker ?? this.commands[i].marker).line <= line) {
                return this.commands[i];
            }
        }
        return undefined;
    }
    getCwdForLine(line) {
        // Handle the current partial command first, anything below it's prompt is considered part
        // of the current command
        if (this._currentCommand.promptStartMarker && line >= this._currentCommand.promptStartMarker?.line) {
            return this._cwd;
        }
        const command = this.getCommandForLine(line);
        if (command && isFullTerminalCommand(command)) {
            return command.cwd;
        }
        return undefined;
    }
    handlePromptStart(options) {
        // Adjust the last command's finished marker when needed. The standard position for the
        // finished marker `D` to appear is at the same position as the following prompt started
        // `A`. Only do this when it would not extend past the current cursor position.
        const lastCommand = this.commands.at(-1);
        if (lastCommand?.endMarker &&
            lastCommand?.executedMarker &&
            lastCommand.endMarker.line === lastCommand.executedMarker.line &&
            lastCommand.executedMarker.line < this._terminal.buffer.active.baseY + this._terminal.buffer.active.cursorY) {
            this._logService.debug('CommandDetectionCapability#handlePromptStart adjusted commandFinished', `${lastCommand.endMarker.line} -> ${lastCommand.executedMarker.line + 1}`);
            lastCommand.endMarker = cloneMarker(this._terminal, lastCommand.executedMarker, 1);
        }
        this._currentCommand.promptStartMarker = (options?.marker ||
            // Generally the prompt start should happen at the exact place the endmarker happened.
            // However, after ctrl+l is used to clear the display, we want to ensure the actual
            // prompt start marker position is used. This is mostly a workaround for Windows but we
            // apply it generally.
            (!this._currentCommand.wasCleared && lastCommand?.endMarker
                ? cloneMarker(this._terminal, lastCommand.endMarker)
                : this._terminal.registerMarker(0)));
        this._currentCommand.wasCleared = false;
    }
    handleContinuationStart() {
        this._currentCommand.currentContinuationMarker = this._terminal.registerMarker(0);
        this._logService.debug('CommandDetectionCapability#handleContinuationStart', this._currentCommand.currentContinuationMarker);
    }
    handleContinuationEnd() {
        if (!this._currentCommand.currentContinuationMarker) {
            this._logService.warn('CommandDetectionCapability#handleContinuationEnd Received continuation end without start');
            return;
        }
        if (!this._currentCommand.continuations) {
            this._currentCommand.continuations = [];
        }
        this._currentCommand.continuations.push({
            marker: this._currentCommand.currentContinuationMarker,
            end: this._terminal.buffer.active.cursorX
        });
        this._currentCommand.currentContinuationMarker = undefined;
        this._logService.debug('CommandDetectionCapability#handleContinuationEnd', this._currentCommand.continuations[this._currentCommand.continuations.length - 1]);
    }
    handleRightPromptStart() {
        this._currentCommand.commandRightPromptStartX = this._terminal.buffer.active.cursorX;
        this._logService.debug('CommandDetectionCapability#handleRightPromptStart', this._currentCommand.commandRightPromptStartX);
    }
    handleRightPromptEnd() {
        this._currentCommand.commandRightPromptEndX = this._terminal.buffer.active.cursorX;
        this._logService.debug('CommandDetectionCapability#handleRightPromptEnd', this._currentCommand.commandRightPromptEndX);
    }
    handleCommandStart(options) {
        this._handleCommandStartOptions = options;
        this._currentCommand.cwd = this._cwd;
        // Only update the column if the line has already been set
        this._currentCommand.commandStartMarker = options?.marker || this._currentCommand.commandStartMarker;
        if (this._currentCommand.commandStartMarker?.line === this._terminal.buffer.active.cursorY) {
            this._currentCommand.commandStartX = this._terminal.buffer.active.cursorX;
            this._onCommandStartChanged.fire();
            this._logService.debug('CommandDetectionCapability#handleCommandStart', this._currentCommand.commandStartX, this._currentCommand.commandStartMarker?.line);
            return;
        }
        this._ptyHeuristics.value.handleCommandStart(options);
    }
    /**
     * Sets the command ID to use for the next command that starts.
     * This is useful when you want to pre-assign an ID before the shell sends the command start sequence.
     */
    setNextCommandId(command, commandId) {
        this._nextCommandId = { command, commandId };
    }
    handleCommandExecuted(options) {
        this._ensureCurrentCommandId(this._currentCommand.command ?? this._currentCommand.extractCommandLine());
        this._ptyHeuristics.value.handleCommandExecuted(options);
        this._currentCommand.markExecutedTime();
    }
    handleCommandFinished(exitCode, options) {
        // Command executed may not have happened yet, if not handle it now so the expected events
        // properly propagate. This may cause the output to show up in the computed command line,
        // but the command line confidence will be low in the extension host for example and
        // therefore cannot be trusted anyway.
        if (!this._currentCommand.commandExecutedMarker) {
            this.handleCommandExecuted();
        }
        this._currentCommand.markFinishedTime();
        this._ptyHeuristics.value.preHandleCommandFinished?.();
        this._logService.debug('CommandDetectionCapability#handleCommandFinished', this._terminal.buffer.active.cursorX, options?.marker?.line, this._currentCommand.command, this._currentCommand);
        // HACK: Handle a special case on some versions of bash where identical commands get merged
        // in the output of `history`, this detects that case and sets the exit code to the last
        // command's exit code. This covered the majority of cases but will fail if the same command
        // runs with a different exit code, that will need a more robust fix where we send the
        // command ID and exit code over to the capability to adjust there.
        if (exitCode === undefined) {
            const lastCommand = this.commands.length > 0 ? this.commands[this.commands.length - 1] : undefined;
            if (this._currentCommand.command && this._currentCommand.command.length > 0 && lastCommand?.command === this._currentCommand.command) {
                exitCode = lastCommand.exitCode;
            }
        }
        if (this._currentCommand.commandStartMarker === undefined || !this._terminal.buffer.active) {
            return;
        }
        this._currentCommand.commandFinishedMarker = options?.marker || this._terminal.registerMarker(0);
        this._ptyHeuristics.value.postHandleCommandFinished?.();
        const newCommand = this._currentCommand.promoteToFullCommand(this._cwd, exitCode, this._handleCommandStartOptions?.ignoreCommandLine ?? false, options?.markProperties);
        if (newCommand) {
            this._commands.push(newCommand);
            this._onBeforeCommandFinished.fire(newCommand);
            // NOTE: onCommandFinished used to not fire if the command was invalid, but this causes
            // problems especially with the associated execution event never firing in the extension
            // API. See https://github.com/microsoft/vscode/issues/252489
            this._logService.debug('CommandDetectionCapability#onCommandFinished', newCommand);
            this._onCommandFinished.fire(newCommand);
        }
        // Create new command for next execution
        this._currentCommand = new PartialTerminalCommand(this._terminal);
        this._handleCommandStartOptions = undefined;
    }
    _ensureCurrentCommandId(commandLine) {
        if (this._nextCommandId?.commandId && isString(commandLine) && commandLine.trim() === this._nextCommandId.command.trim()) {
            if (this._currentCommand.id !== this._nextCommandId.commandId) {
                this._currentCommand.id = this._nextCommandId.commandId;
            }
            this._nextCommandId = undefined;
            return;
        }
    }
    setCommandLine(commandLine, isTrusted) {
        this._logService.debug('CommandDetectionCapability#setCommandLine', commandLine, isTrusted);
        this._currentCommand.command = commandLine;
        this._currentCommand.commandLineConfidence = 'high';
        this._currentCommand.isTrusted = isTrusted;
        if (isTrusted) {
            this._promptInputModel.setConfidentCommandLine(commandLine);
        }
    }
    serialize() {
        const commands = this.commands.map(e => e.serialize(this.__isCommandStorageDisabled));
        const partialCommand = this._currentCommand.serialize(this._cwd);
        if (partialCommand) {
            commands.push(partialCommand);
        }
        return {
            isWindowsPty: this._ptyHeuristics.value instanceof WindowsPtyHeuristics,
            hasRichCommandDetection: this._hasRichCommandDetection,
            commands,
            promptInputModel: this._promptInputModel.serialize(),
        };
    }
    deserialize(serialized) {
        if (serialized.isWindowsPty) {
            this.setIsWindowsPty(serialized.isWindowsPty);
        }
        if (serialized.hasRichCommandDetection) {
            this.setHasRichCommandDetection(serialized.hasRichCommandDetection);
        }
        const buffer = this._terminal.buffer.normal;
        for (const e of serialized.commands) {
            // Partial command
            if (!e.endLine) {
                // Check for invalid command
                const marker = e.startLine !== undefined ? this._terminal.registerMarker(e.startLine - (buffer.baseY + buffer.cursorY)) : undefined;
                if (!marker) {
                    continue;
                }
                this._currentCommand.commandStartMarker = e.startLine !== undefined ? this._terminal.registerMarker(e.startLine - (buffer.baseY + buffer.cursorY)) : undefined;
                this._currentCommand.commandStartX = e.startX;
                this._currentCommand.promptStartMarker = e.promptStartLine !== undefined ? this._terminal.registerMarker(e.promptStartLine - (buffer.baseY + buffer.cursorY)) : undefined;
                this._cwd = e.cwd;
                // eslint-disable-next-line local/code-no-dangerous-type-assertions
                this._onCommandStarted.fire({ marker });
                continue;
            }
            // Full command
            const newCommand = TerminalCommand.deserialize(this._terminal, e, this.__isCommandStorageDisabled);
            if (!newCommand) {
                continue;
            }
            this._commands.push(newCommand);
            this._logService.debug('CommandDetectionCapability#onCommandFinished', newCommand);
            this._onCommandFinished.fire(newCommand);
        }
        if (serialized.promptInputModel) {
            this._promptInputModel.deserialize(serialized.promptInputModel);
        }
    }
};
__decorate([
    debounce(500)
], CommandDetectionCapability.prototype, "_handleCursorMove", null);
CommandDetectionCapability = __decorate([
    __param(1, ILogService)
], CommandDetectionCapability);
export { CommandDetectionCapability };
/**
 * Non-Windows-specific behavior.
 */
class UnixPtyHeuristics extends Disposable {
    constructor(_terminal, _capability, _hooks, _logService) {
        super();
        this._terminal = _terminal;
        this._capability = _capability;
        this._hooks = _hooks;
        this._logService = _logService;
    }
    handleCommandStart(options) {
        const currentCommand = this._capability.currentCommand;
        currentCommand.commandStartX = this._terminal.buffer.active.cursorX;
        currentCommand.commandStartMarker = options?.marker || this._terminal.registerMarker(0);
        // Clear executed as it must happen after command start
        currentCommand.commandExecutedMarker?.dispose();
        currentCommand.commandExecutedMarker = undefined;
        currentCommand.commandExecutedX = undefined;
        for (const m of this._hooks.commandMarkers) {
            m.dispose();
        }
        this._hooks.commandMarkers.length = 0;
        // eslint-disable-next-line local/code-no-dangerous-type-assertions
        this._hooks.onCommandStartedEmitter.fire({ marker: options?.marker || currentCommand.commandStartMarker, markProperties: options?.markProperties });
        this._logService.debug('CommandDetectionCapability#handleCommandStart', currentCommand.commandStartX, currentCommand.commandStartMarker?.line);
    }
    handleCommandExecuted(options) {
        const currentCommand = this._capability.currentCommand;
        currentCommand.commandExecutedMarker = options?.marker || this._terminal.registerMarker(0);
        currentCommand.commandExecutedX = this._terminal.buffer.active.cursorX;
        this._logService.debug('CommandDetectionCapability#handleCommandExecuted', currentCommand.commandExecutedX, currentCommand.commandExecutedMarker?.line);
        // Sanity check optional props
        if (!currentCommand.commandStartMarker || !currentCommand.commandExecutedMarker || currentCommand.commandStartX === undefined) {
            return;
        }
        currentCommand.command = this._capability.promptInputModel.ghostTextIndex > -1 ? this._capability.promptInputModel.value.substring(0, this._capability.promptInputModel.ghostTextIndex) : this._capability.promptInputModel.value;
        this._hooks.onCommandExecutedEmitter.fire(currentCommand);
    }
}
var AdjustCommandStartMarkerConstants;
(function (AdjustCommandStartMarkerConstants) {
    AdjustCommandStartMarkerConstants[AdjustCommandStartMarkerConstants["MaxCheckLineCount"] = 10] = "MaxCheckLineCount";
    AdjustCommandStartMarkerConstants[AdjustCommandStartMarkerConstants["Interval"] = 20] = "Interval";
    AdjustCommandStartMarkerConstants[AdjustCommandStartMarkerConstants["MaximumPollCount"] = 10] = "MaximumPollCount";
})(AdjustCommandStartMarkerConstants || (AdjustCommandStartMarkerConstants = {}));
/**
 * An object that integrated with and decorates the command detection capability to add heuristics
 * that adjust various markers to work better with Windows and ConPTY. This isn't depended upon the
 * frontend OS, or even the backend OS, but the `IsWindows` property which technically a non-Windows
 * client can emit (for example in tests).
 */
let WindowsPtyHeuristics = class WindowsPtyHeuristics extends Disposable {
    constructor(_terminal, _capability, _hooks, _logService) {
        super();
        this._terminal = _terminal;
        this._capability = _capability;
        this._hooks = _hooks;
        this._logService = _logService;
        this._onCursorMoveListener = this._register(new MutableDisposable());
        this._tryAdjustCommandStartMarkerScannedLineCount = 0;
        this._tryAdjustCommandStartMarkerPollCount = 0;
        this._register(this._capability.onBeforeCommandFinished(command => {
            // For older Windows backends we cannot listen to CSI J, instead we assume running clear
            // or cls will clear all commands in the viewport. This is not perfect but it's right
            // most of the time.
            if (command.command.trim().toLowerCase() === 'clear' || command.command.trim().toLowerCase() === 'cls') {
                this._tryAdjustCommandStartMarkerScheduler?.cancel();
                this._tryAdjustCommandStartMarkerScheduler = undefined;
                this._hooks.clearCommandsInViewport();
                this._capability.currentCommand.isInvalid = true;
                this._hooks.onCurrentCommandInvalidatedEmitter.fire({ reason: "windows" /* CommandInvalidationReason.Windows */ });
            }
        }));
    }
    preHandleResize(e) {
        // Resize behavior is different under conpty; instead of bringing parts of the scrollback
        // back into the viewport, new lines are inserted at the bottom (ie. the same behavior as if
        // there was no scrollback).
        //
        // On resize this workaround will wait for a conpty reprint to occur by waiting for the
        // cursor to move, it will then calculate the number of lines that the commands within the
        // viewport _may have_ shifted. After verifying the content of the current line is
        // incorrect, the line after shifting is checked and if that matches delete events are fired
        // on the xterm.js buffer to move the markers.
        //
        // While a bit hacky, this approach is quite safe and seems to work great at least for pwsh.
        const baseY = this._terminal.buffer.active.baseY;
        const rowsDifference = e.rows - this._hooks.dimensions.rows;
        // Only do when rows increase, do in the next frame as this needs to happen after
        // conpty reprints the screen
        if (rowsDifference > 0) {
            this._waitForCursorMove().then(() => {
                // Calculate the number of lines the content may have shifted, this will max out at
                // scrollback count since the standard behavior will be used then
                const potentialShiftedLineCount = Math.min(rowsDifference, baseY);
                // For each command within the viewport, assume commands are in the correct order
                for (let i = this._capability.commands.length - 1; i >= 0; i--) {
                    const command = this._capability.commands[i];
                    if (!command.marker || command.marker.line < baseY || command.commandStartLineContent === undefined) {
                        break;
                    }
                    const line = this._terminal.buffer.active.getLine(command.marker.line);
                    if (!line || line.translateToString(true) === command.commandStartLineContent) {
                        continue;
                    }
                    const shiftedY = command.marker.line - potentialShiftedLineCount;
                    const shiftedLine = this._terminal.buffer.active.getLine(shiftedY);
                    if (shiftedLine?.translateToString(true) !== command.commandStartLineContent) {
                        continue;
                    }
                    this._terminal._core._bufferService.buffer.lines.onDeleteEmitter.fire({
                        index: this._terminal.buffer.active.baseY,
                        amount: potentialShiftedLineCount
                    });
                }
            });
        }
    }
    handleCommandStart() {
        this._capability.currentCommand.commandStartX = this._terminal.buffer.active.cursorX;
        // On Windows track all cursor movements after the command start sequence
        this._hooks.commandMarkers.length = 0;
        const initialCommandStartMarker = this._capability.currentCommand.commandStartMarker = (this._capability.currentCommand.promptStartMarker
            ? cloneMarker(this._terminal, this._capability.currentCommand.promptStartMarker)
            : this._terminal.registerMarker(0));
        this._capability.currentCommand.commandStartX = 0;
        // DEBUG: Add a decoration for the original unadjusted command start position
        // if ('registerDecoration' in this._terminal) {
        // 	const d = (this._terminal as any).registerDecoration({
        // 		marker: this._capability.currentCommand.commandStartMarker,
        // 		x: this._capability.currentCommand.commandStartX
        // 	});
        // 	d?.onRender((e: HTMLElement) => {
        // 		e.textContent = 'b';
        // 		e.classList.add('xterm-sequence-decoration', 'top', 'right');
        // 		e.title = 'Initial command start position';
        // 	});
        // }
        // The command started sequence may be printed before the actual prompt is, for example a
        // multi-line prompt will typically look like this where D, A and B signify the command
        // finished, prompt started and command started sequences respectively:
        //
        //     D/my/cwdB
        //     > C
        //
        // Due to this, it's likely that this will be called before the line has been parsed.
        // Unfortunately, it is also the case that the actual command start data may not be parsed
        // by the end of the task either, so a microtask cannot be used.
        //
        // The strategy used is to begin polling and scanning downwards for up to the next 5 lines.
        // If it looks like a prompt is found, the command started location is adjusted. If the
        // command executed sequences comes in before polling is done, polling is canceled and the
        // final polling task is executed synchronously.
        this._tryAdjustCommandStartMarkerScannedLineCount = 0;
        this._tryAdjustCommandStartMarkerPollCount = 0;
        this._tryAdjustCommandStartMarkerScheduler = new RunOnceScheduler(() => this._tryAdjustCommandStartMarker(initialCommandStartMarker), 20 /* AdjustCommandStartMarkerConstants.Interval */);
        this._tryAdjustCommandStartMarkerScheduler.schedule();
        // TODO: Cache details about polling for the future - eg. if it always fails, stop bothering
    }
    _tryAdjustCommandStartMarker(start) {
        if (this._store.isDisposed) {
            return;
        }
        const buffer = this._terminal.buffer.active;
        let scannedLineCount = this._tryAdjustCommandStartMarkerScannedLineCount;
        while (scannedLineCount < 10 /* AdjustCommandStartMarkerConstants.MaxCheckLineCount */ && start.line + scannedLineCount < buffer.baseY + this._terminal.rows) {
            if (this._cursorOnNextLine()) {
                const prompt = this._getWindowsPrompt(start.line + scannedLineCount);
                if (prompt) {
                    const adjustedPrompt = isString(prompt) ? prompt : prompt.prompt;
                    this._capability.currentCommand.commandStartMarker = this._terminal.registerMarker(0);
                    if (!isString(prompt) && prompt.likelySingleLine) {
                        this._logService.debug('CommandDetectionCapability#_tryAdjustCommandStartMarker adjusted promptStart', `${this._capability.currentCommand.promptStartMarker?.line} -> ${this._capability.currentCommand.commandStartMarker.line}`);
                        this._capability.currentCommand.promptStartMarker?.dispose();
                        this._capability.currentCommand.promptStartMarker = cloneMarker(this._terminal, this._capability.currentCommand.commandStartMarker);
                        // Adjust the last command if it's not in the same position as the following
                        // prompt start marker
                        const lastCommand = this._capability.commands.at(-1);
                        if (lastCommand && this._capability.currentCommand.commandStartMarker.line !== lastCommand.endMarker?.line) {
                            lastCommand.endMarker?.dispose();
                            lastCommand.endMarker = cloneMarker(this._terminal, this._capability.currentCommand.commandStartMarker);
                        }
                    }
                    // use the regex to set the position as it's possible input has occurred
                    this._capability.currentCommand.commandStartX = adjustedPrompt.length;
                    this._logService.debug('CommandDetectionCapability#_tryAdjustCommandStartMarker adjusted commandStart', `${start.line} -> ${this._capability.currentCommand.commandStartMarker.line}:${this._capability.currentCommand.commandStartX}`);
                    this._flushPendingHandleCommandStartTask();
                    return;
                }
            }
            scannedLineCount++;
        }
        if (scannedLineCount < 10 /* AdjustCommandStartMarkerConstants.MaxCheckLineCount */) {
            this._tryAdjustCommandStartMarkerScannedLineCount = scannedLineCount;
            if (++this._tryAdjustCommandStartMarkerPollCount < 10 /* AdjustCommandStartMarkerConstants.MaximumPollCount */) {
                this._tryAdjustCommandStartMarkerScheduler?.schedule();
            }
            else {
                this._flushPendingHandleCommandStartTask();
            }
        }
        else {
            this._flushPendingHandleCommandStartTask();
        }
    }
    _flushPendingHandleCommandStartTask() {
        // Perform final try adjust if necessary
        if (this._tryAdjustCommandStartMarkerScheduler) {
            // Max out poll count to ensure it's the last run
            this._tryAdjustCommandStartMarkerPollCount = 10 /* AdjustCommandStartMarkerConstants.MaximumPollCount */;
            this._tryAdjustCommandStartMarkerScheduler.flush();
            this._tryAdjustCommandStartMarkerScheduler = undefined;
        }
        if (!this._capability.currentCommand.commandExecutedMarker) {
            this._onCursorMoveListener.value = this._terminal.onCursorMove(() => {
                if (this._hooks.commandMarkers.length === 0 || this._hooks.commandMarkers[this._hooks.commandMarkers.length - 1].line !== this._terminal.buffer.active.cursorY) {
                    const marker = this._terminal.registerMarker(0);
                    if (marker) {
                        this._hooks.commandMarkers.push(marker);
                    }
                }
            });
        }
        if (this._capability.currentCommand.commandStartMarker) {
            const line = this._terminal.buffer.active.getLine(this._capability.currentCommand.commandStartMarker.line);
            if (line) {
                this._capability.currentCommand.commandStartLineContent = line.translateToString(true);
            }
        }
        // eslint-disable-next-line local/code-no-dangerous-type-assertions
        this._hooks.onCommandStartedEmitter.fire({ marker: this._capability.currentCommand.commandStartMarker });
        this._logService.debug('CommandDetectionCapability#_handleCommandStartWindows', this._capability.currentCommand.commandStartX, this._capability.currentCommand.commandStartMarker?.line);
    }
    handleCommandExecuted(options) {
        if (this._tryAdjustCommandStartMarkerScheduler) {
            this._flushPendingHandleCommandStartTask();
        }
        // Use the gathered cursor move markers to correct the command start and executed markers
        this._onCursorMoveListener.clear();
        this._evaluateCommandMarkers();
        this._capability.currentCommand.commandExecutedX = this._terminal.buffer.active.cursorX;
        this._hooks.onCommandExecutedEmitter.fire(this._capability.currentCommand);
        this._logService.debug('CommandDetectionCapability#handleCommandExecuted', this._capability.currentCommand.commandExecutedX, this._capability.currentCommand.commandExecutedMarker?.line);
    }
    preHandleCommandFinished() {
        if (this._capability.currentCommand.commandExecutedMarker) {
            return;
        }
        // This is done on command finished just in case command executed never happens (for example
        // PSReadLine tab completion)
        if (this._hooks.commandMarkers.length === 0) {
            // If the command start timeout doesn't happen before command finished, just use the
            // current marker.
            if (!this._capability.currentCommand.commandStartMarker) {
                this._capability.currentCommand.commandStartMarker = this._terminal.registerMarker(0);
            }
            if (this._capability.currentCommand.commandStartMarker) {
                this._hooks.commandMarkers.push(this._capability.currentCommand.commandStartMarker);
            }
        }
        this._evaluateCommandMarkers();
    }
    postHandleCommandFinished() {
        const currentCommand = this._capability.currentCommand;
        const commandText = currentCommand.command;
        const commandLine = currentCommand.commandStartMarker?.line;
        const executedLine = currentCommand.commandExecutedMarker?.line;
        if (!commandText || commandText.length === 0 ||
            commandLine === undefined || commandLine === -1 ||
            executedLine === undefined || executedLine === -1) {
            return;
        }
        // Scan downwards from the command start line and search for every character in the actual
        // command line. This may end up matching the wrong characters, but it shouldn't matter at
        // least in the typical case as the entire command will still get matched.
        let current = 0;
        let found = false;
        for (let i = commandLine; i <= executedLine; i++) {
            const line = this._terminal.buffer.active.getLine(i);
            if (!line) {
                break;
            }
            const text = line.translateToString(true);
            for (let j = 0; j < text.length; j++) {
                // Skip whitespace in case it was not actually rendered or could be trimmed from the
                // end of the line
                while (commandText.length < current && commandText[current] === ' ') {
                    current++;
                }
                // Character match
                if (text[j] === commandText[current]) {
                    current++;
                }
                // Full command match
                if (current === commandText.length) {
                    // It's ambiguous whether the command executed marker should ideally appear at
                    // the end of the line or at the beginning of the next line. Since it's more
                    // useful for extracting the command at the end of the current line we go with
                    // that.
                    const wrapsToNextLine = j >= this._terminal.cols - 1;
                    currentCommand.commandExecutedMarker = this._terminal.registerMarker(i - (this._terminal.buffer.active.baseY + this._terminal.buffer.active.cursorY) + (wrapsToNextLine ? 1 : 0));
                    currentCommand.commandExecutedX = wrapsToNextLine ? 0 : j + 1;
                    found = true;
                    break;
                }
            }
            if (found) {
                break;
            }
        }
    }
    _evaluateCommandMarkers() {
        // On Windows, use the gathered cursor move markers to correct the command start and
        // executed markers.
        if (this._hooks.commandMarkers.length === 0) {
            return;
        }
        this._hooks.commandMarkers = this._hooks.commandMarkers.sort((a, b) => a.line - b.line);
        this._capability.currentCommand.commandStartMarker = this._hooks.commandMarkers[0];
        if (this._capability.currentCommand.commandStartMarker) {
            const line = this._terminal.buffer.active.getLine(this._capability.currentCommand.commandStartMarker.line);
            if (line) {
                this._capability.currentCommand.commandStartLineContent = line.translateToString(true);
            }
        }
        this._capability.currentCommand.commandExecutedMarker = this._hooks.commandMarkers[this._hooks.commandMarkers.length - 1];
        // Fire this now to prevent issues like #197409
        this._hooks.onCommandExecutedEmitter.fire(this._capability.currentCommand);
    }
    _cursorOnNextLine() {
        const lastCommand = this._capability.commands.at(-1);
        // There is only a single command, so this check is unnecessary
        if (!lastCommand) {
            return true;
        }
        const cursorYAbsolute = this._terminal.buffer.active.baseY + this._terminal.buffer.active.cursorY;
        // If the cursor position is within the last command, we should poll.
        const lastCommandYAbsolute = (lastCommand.endMarker ? lastCommand.endMarker.line : lastCommand.marker?.line) ?? -1;
        return cursorYAbsolute > lastCommandYAbsolute;
    }
    _waitForCursorMove() {
        const cursorX = this._terminal.buffer.active.cursorX;
        const cursorY = this._terminal.buffer.active.cursorY;
        let totalDelay = 0;
        return new Promise((resolve, reject) => {
            const interval = setInterval(() => {
                if (cursorX !== this._terminal.buffer.active.cursorX || cursorY !== this._terminal.buffer.active.cursorY) {
                    resolve();
                    clearInterval(interval);
                    return;
                }
                totalDelay += 10;
                if (totalDelay > 1000) {
                    clearInterval(interval);
                    resolve();
                }
            }, 10);
        });
    }
    _getWindowsPrompt(y = this._terminal.buffer.active.baseY + this._terminal.buffer.active.cursorY) {
        const line = this._terminal.buffer.active.getLine(y);
        if (!line) {
            return;
        }
        const lineText = line.translateToString(true);
        if (!lineText) {
            return;
        }
        // PowerShell
        const pwshPrompt = lineText.match(/(?<prompt>(\(.+\)\s)?(?:PS.+>\s?))/)?.groups?.prompt;
        if (pwshPrompt) {
            const adjustedPrompt = this._adjustPrompt(pwshPrompt, lineText, '>');
            if (adjustedPrompt) {
                return {
                    prompt: adjustedPrompt,
                    likelySingleLine: true
                };
            }
        }
        // Custom prompts like starship end in the common \u276f character
        const customPrompt = lineText.match(/.*\u276f(?=[^\u276f]*$)/g)?.[0];
        if (customPrompt) {
            const adjustedPrompt = this._adjustPrompt(customPrompt, lineText, '\u276f');
            if (adjustedPrompt) {
                return adjustedPrompt;
            }
        }
        // Bash Prompt
        const bashPrompt = lineText.match(/^(?<prompt>\$)/)?.groups?.prompt;
        if (bashPrompt) {
            const adjustedPrompt = this._adjustPrompt(bashPrompt, lineText, '$');
            if (adjustedPrompt) {
                return adjustedPrompt;
            }
        }
        // Python Prompt
        const pythonPrompt = lineText.match(/^(?<prompt>>>> )/g)?.groups?.prompt;
        if (pythonPrompt) {
            return {
                prompt: pythonPrompt,
                likelySingleLine: true
            };
        }
        // Dynamic prompt detection
        if (this._capability.promptTerminator && (lineText === this._capability.promptTerminator || lineText.trim().endsWith(this._capability.promptTerminator))) {
            const adjustedPrompt = this._adjustPrompt(lineText, lineText, this._capability.promptTerminator);
            if (adjustedPrompt) {
                return adjustedPrompt;
            }
        }
        // Command Prompt
        const cmdMatch = lineText.match(/^(?<prompt>(\(.+\)\s)?(?:[A-Z]:\\.*>))/);
        return cmdMatch?.groups?.prompt ? {
            prompt: cmdMatch.groups.prompt,
            likelySingleLine: true
        } : undefined;
    }
    _adjustPrompt(prompt, lineText, char) {
        if (!prompt) {
            return;
        }
        // Conpty may not 'render' the space at the end of the prompt
        if (lineText === prompt && prompt.endsWith(char)) {
            prompt += ' ';
        }
        return prompt;
    }
};
WindowsPtyHeuristics = __decorate([
    __param(3, ILogService)
], WindowsPtyHeuristics);
export function getLinesForCommand(buffer, command, cols, outputMatcher) {
    if (!outputMatcher) {
        return undefined;
    }
    const executedMarker = command.executedMarker;
    const endMarker = command.endMarker;
    if (!executedMarker || !endMarker) {
        return undefined;
    }
    const startLine = executedMarker.line;
    const endLine = endMarker.line;
    const linesToCheck = outputMatcher.length;
    const lines = [];
    if (outputMatcher.anchor === 'bottom') {
        for (let i = endLine - (outputMatcher.offset || 0); i >= startLine; i--) {
            let wrappedLineStart = i;
            const wrappedLineEnd = i;
            while (wrappedLineStart >= startLine && buffer.getLine(wrappedLineStart)?.isWrapped) {
                wrappedLineStart--;
            }
            i = wrappedLineStart;
            lines.unshift(getXtermLineContent(buffer, wrappedLineStart, wrappedLineEnd, cols));
            if (lines.length > linesToCheck) {
                lines.pop();
            }
        }
    }
    else {
        for (let i = startLine + (outputMatcher.offset || 0); i < endLine; i++) {
            const wrappedLineStart = i;
            let wrappedLineEnd = i;
            while (wrappedLineEnd + 1 < endLine && buffer.getLine(wrappedLineEnd + 1)?.isWrapped) {
                wrappedLineEnd++;
            }
            i = wrappedLineEnd;
            lines.push(getXtermLineContent(buffer, wrappedLineStart, wrappedLineEnd, cols));
            if (lines.length === linesToCheck) {
                lines.shift();
            }
        }
    }
    return lines;
}
function getXtermLineContent(buffer, lineStart, lineEnd, cols) {
    // Cap the maximum number of lines generated to prevent potential performance problems. This is
    // more of a sanity check as the wrapped line should already be trimmed down at this point.
    const maxLineLength = Math.max(2048 / cols * 2);
    lineEnd = Math.min(lineEnd, lineStart + maxLineLength);
    let content = '';
    for (let i = lineStart; i <= lineEnd; i++) {
        // Make sure only 0 to cols are considered as resizing when windows mode is enabled will
        // retain buffer data outside of the terminal width as reflow is disabled.
        const line = buffer.getLine(i);
        if (line) {
            content += line.translateToString(true, 0, cols);
        }
    }
    return content;
}
function cloneMarker(xterm, marker, offset = 0) {
    return xterm.registerMarker(marker.line - (xterm.buffer.active.baseY + xterm.buffer.active.cursorY) + offset);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZERldGVjdGlvbkNhcGFiaWxpdHkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL3BvcmlkaGkvZGV2ZWxvcG1lbnQvcHVrdS12cy1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90ZXJtaW5hbC9jb21tb24vY2FwYWJpbGl0aWVzL2NvbW1hbmREZXRlY3Rpb25DYXBhYmlsaXR5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNqRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDM0QsT0FBTyxFQUFFLFVBQVUsRUFBRSwwQkFBMEIsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2pILE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUN6RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFHNUQsT0FBTyxFQUEwQixxQkFBcUIsRUFBRSxzQkFBc0IsRUFBRSxlQUFlLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUMvSSxPQUFPLEVBQUUsZ0JBQWdCLEVBQTBCLE1BQU0sd0NBQXdDLENBQUM7QUFRM0YsSUFBTSwwQkFBMEIsR0FBaEMsTUFBTSwwQkFBMkIsU0FBUSxVQUFVO0lBSXpELElBQUksZ0JBQWdCLEtBQXdCLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQztJQVc1RSxJQUFJLHVCQUF1QixLQUFLLE9BQU8sSUFBSSxDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQztJQU12RSxJQUFJLFFBQVEsS0FBaUMsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztJQUNyRSxJQUFJLGdCQUFn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