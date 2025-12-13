/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DeferredPromise, RunOnceScheduler } from '../../../../../../base/common/async.js';
import { DisposableStore } from '../../../../../../base/common/lifecycle.js';
export async function waitForIdle(onData, idleDurationMs) {
    // This is basically Event.debounce but with an initial event to trigger the debounce
    // immediately
    const store = new DisposableStore();
    const deferred = new DeferredPromise();
    const scheduler = store.add(new RunOnceScheduler(() => deferred.complete(), idleDurationMs));
    store.add(onData(() => scheduler.schedule()));
    scheduler.schedule();
    return deferred.p.finally(() => store.dispose());
}
/**
 * Detects if the given text content appears to end with a common prompt pattern.
 */
export function detectsCommonPromptPattern(cursorLine) {
    if (cursorLine.trim().length === 0) {
        return { detected: false, reason: 'Content is empty or contains only whitespace' };
    }
    // PowerShell prompt: PS C:\> or similar patterns
    if (/PS\s+[A-Z]:\\.*>\s*$/.test(cursorLine)) {
        return { detected: true, reason: `PowerShell prompt pattern detected: "${cursorLine}"` };
    }
    // Command Prompt: C:\path>
    if (/^[A-Z]:\\.*>\s*$/.test(cursorLine)) {
        return { detected: true, reason: `Command Prompt pattern detected: "${cursorLine}"` };
    }
    // Bash-style prompts ending with $
    if (/\$\s*$/.test(cursorLine)) {
        return { detected: true, reason: `Bash-style prompt pattern detected: "${cursorLine}"` };
    }
    // Root prompts ending with #
    if (/#\s*$/.test(cursorLine)) {
        return { detected: true, reason: `Root prompt pattern detected: "${cursorLine}"` };
    }
    // Python REPL prompt
    if (/^>>>\s*$/.test(cursorLine)) {
        return { detected: true, reason: `Python REPL prompt pattern detected: "${cursorLine}"` };
    }
    // Custom prompts ending with the starship character (\u276f)
    if (/\u276f\s*$/.test(cursorLine)) {
        return { detected: true, reason: `Starship prompt pattern detected: "${cursorLine}"` };
    }
    // Generic prompts ending with common prompt characters
    if (/[>%]\s*$/.test(cursorLine)) {
        return { detected: true, reason: `Generic prompt pattern detected: "${cursorLine}"` };
    }
    return { detected: false, reason: `No common prompt pattern found in last line: "${cursorLine}"` };
}
/**
 * Enhanced version of {@link waitForIdle} that uses prompt detection heuristics. After the terminal
 * idles for the specified period, checks if the terminal's cursor line looks like a common prompt.
 * If not, extends the timeout to give the command more time to complete.
 */
export async function waitForIdleWithPromptHeuristics(onData, instance, idlePollIntervalMs, extendedTimeoutMs) {
    await waitForIdle(onData, idlePollIntervalMs);
    const xterm = await instance.xtermReadyPromise;
    if (!xterm) {
        return { detected: false, reason: `Xterm not available, using ${idlePollIntervalMs}ms timeout` };
    }
    const startTime = Date.now();
    // Attempt to detect a prompt pattern after idle
    while (Date.now() - startTime < extendedTimeoutMs) {
        try {
            let content = '';
            const buffer = xterm.raw.buffer.active;
            const line = buffer.getLine(buffer.baseY + buffer.cursorY);
            if (line) {
                content = line.translateToString(true);
            }
            const promptResult = detectsCommonPromptPattern(content);
            if (promptResult.detected) {
                return promptResult;
            }
        }
        catch (error) {
            // Continue polling even if there's an error reading terminal content
        }
        await waitForIdle(onData, Math.min(idlePollIntervalMs, extendedTimeoutMs - (Date.now() - startTime)));
    }
    // Extended timeout reached without detecting a prompt
    try {
        let content = '';
        const buffer = xterm.raw.buffer.active;
        const line = buffer.getLine(buffer.baseY + buffer.cursorY);
        if (line) {
            content = line.translateToString(true) + '\n';
        }
        return { detected: false, reason: `Extended timeout reached without prompt detection. Last line: "${content.trim()}"` };
    }
    catch (error) {
        return { detected: false, reason: `Extended timeout reached. Error reading terminal content: ${error}` };
    }
}
/**
 * Tracks the terminal for being idle on a prompt input. This must be called before `executeCommand`
 * is called.
 */
export async function trackIdleOnPrompt(instance, idleDurationMs, store) {
    const idleOnPrompt = new DeferredPromise();
    const onData = instance.onData;
    const scheduler = store.add(new RunOnceScheduler(() => {
        idleOnPrompt.complete();
    }, idleDurationMs));
    let state = 0 /* TerminalState.Initial */;
    // Fallback in case prompt sequences are not seen but the terminal goes idle.
    const promptFallbackScheduler = store.add(new RunOnceScheduler(() => {
        if (state === 2 /* TerminalState.Executing */ || state === 3 /* TerminalState.PromptAfterExecuting */) {
            promptFallbackScheduler.cancel();
            return;
        }
        state = 3 /* TerminalState.PromptAfterExecuting */;
        scheduler.schedule();
    }, 1000));
    // Only schedule when a prompt sequence (A) is seen after an execute sequence (C). This prevents
    // cases where the command is executed before the prompt is written. While not perfect, sitting
    // on an A without a C following shortly after is a very good indicator that the command is done
    // and the terminal is idle. Note that D is treated as a signal for executed since shell
    // integration sometimes lacks the C sequence either due to limitations in the integation or the
    // required hooks aren't available.
    let TerminalState;
    (function (TerminalState) {
        TerminalState[TerminalState["Initial"] = 0] = "Initial";
        TerminalState[TerminalState["Prompt"] = 1] = "Prompt";
        TerminalState[TerminalState["Executing"] = 2] = "Executing";
        TerminalState[TerminalState["PromptAfterExecuting"] = 3] = "PromptAfterExecuting";
    })(TerminalState || (TerminalState = {}));
    store.add(onData(e => {
        // Update state
        // p10k fires C as `133;C;`
        const matches = e.matchAll(/(?:\x1b\]|\x9d)[16]33;(?<type>[ACD])(?:;.*)?(?:\x1b\\|\x07|\x9c)/g);
        for (const match of matches) {
            if (match.groups?.type === 'A') {
                if (state === 0 /* TerminalState.Initial */) {
                    state = 1 /* TerminalState.Prompt */;
                }
                else if (state === 2 /* TerminalState.Executing */) {
                    state = 3 /* TerminalState.PromptAfterExecuting */;
                }
            }
            else if (match.groups?.type === 'C' || match.groups?.type === 'D') {
                state = 2 /* TerminalState.Executing */;
            }
        }
        // Re-schedule on every data event as we're tracking data idle
        if (state === 3 /* TerminalState.PromptAfterExecuting */) {
            promptFallbackScheduler.cancel();
            scheduler.schedule();
        }
        else {
            scheduler.cancel();
            if (state === 0 /* TerminalState.Initial */ || state === 1 /* TerminalState.Prompt */) {
                promptFallbackScheduler.schedule();
            }
            else {
                promptFallbackScheduler.cancel();
            }
        }
    }));
    return idleOnPrompt.p;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhlY3V0ZVN0cmF0ZWd5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9wb3JpZGhpL2RldmVsb3BtZW50L3B1a3UtdnMtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2NoYXRBZ2VudFRvb2xzL2Jyb3dzZXIvZXhlY3V0ZVN0cmF0ZWd5L2V4ZWN1dGVTdHJhdGVneS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLGdCQUFnQixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFHM0YsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBeUI3RSxNQUFNLENBQUMsS0FBSyxVQUFVLFdBQVcsQ0FBQyxNQUFzQixFQUFFLGNBQXNCO0lBQy9FLHFGQUFxRjtJQUNyRixjQUFjO0lBQ2QsTUFBTSxLQUFLLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztJQUNwQyxNQUFNLFFBQVEsR0FBRyxJQUFJLGVBQWUsRUFBUSxDQUFDO0lBQzdDLE1BQU0sU0FBUyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxnQkFBZ0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQztJQUM3RixLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzlDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsQ0FBQztJQUNyQixPQUFPLFFBQVEsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO0FBQ2xELENBQUM7QUFhRDs7R0FFRztBQUNILE1BQU0sVUFBVSwwQkFBMEIsQ0FBQyxVQUFrQjtJ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