/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { NullLogService } from '../../../../../log/common/log.js';
import { PromptInputModel } from '../../../../common/capabilities/commandDetection/promptInputModel.js';
import { Emitter } from '../../../../../../base/common/event.js';
import { ok, notDeepStrictEqual, strictEqual } from 'assert';
import { timeout } from '../../../../../../base/common/async.js';
import { importAMDNodeModule } from '../../../../../../amdX.js';
import { runWithFakedTimers } from '../../../../../../base/test/common/timeTravelScheduler.js';
suite('PromptInputModel', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let promptInputModel;
    let xterm;
    let onCommandStart;
    let onCommandStartChanged;
    let onCommandExecuted;
    async function writePromise(data) {
        await new Promise(r => xterm.write(data, r));
    }
    function fireCommandStart() {
        onCommandStart.fire({ marker: xterm.registerMarker() });
    }
    function fireCommandExecuted() {
        onCommandExecuted.fire(null);
    }
    function setContinuationPrompt(prompt) {
        promptInputModel.setContinuationPrompt(prompt);
    }
    async function assertPromptInput(valueWithCursor) {
        await timeout(0);
        if (promptInputModel.cursorIndex !== -1 && !valueWithCursor.includes('|')) {
            throw new Error('assertPromptInput must contain | character');
        }
        const actualValueWithCursor = promptInputModel.getCombinedString();
        strictEqual(actualValueWithCursor, valueWithCursor.replaceAll('\n', '\u23CE'));
        // This is required to ensure the cursor index is correctly resolved for non-ascii characters
        const value = valueWithCursor.replace(/[\|\[\]]/g, '');
        const cursorIndex = valueWithCursor.indexOf('|');
        strictEqual(promptInputModel.value, value);
        strictEqual(promptInputModel.cursorIndex, cursorIndex, `value=${promptInputModel.value}`);
        ok(promptInputModel.ghostTextIndex === -1 || cursorIndex <= promptInputModel.ghostTextIndex, `cursorIndex (${cursorIndex}) must be before ghostTextIndex (${promptInputModel.ghostTextIndex})`);
    }
    setup(async () => {
        const TerminalCtor = (await importAMDNodeModule('@xterm/xterm', 'lib/xterm.js')).Terminal;
        xterm = store.add(new TerminalCtor({ allowProposedApi: true }));
        onCommandStart = store.add(new Emitter());
        onCommandStartChanged = store.add(new Emitter());
        onCommandExecuted = store.add(new Emitter());
        promptInputModel = store.add(new PromptInputModel(xterm, onCommandStart.event, onCommandStartChanged.event, onCommandExecuted.event, new NullLogService));
    });
    test('basic input and execute', async () => {
        await writePromise('$ ');
        fireCommandStart();
        await assertPromptInput('|');
        await writePromise('foo bar');
        await assertPromptInput('foo bar|');
        await writePromise('\r\n');
        fireCommandExecuted();
        await assertPromptInput('foo bar');
        await writePromise('(command output)\r\n$ ');
        fireCommandStart();
        await assertPromptInput('|');
    });
    test('should not fire onDidChangeInput events when nothing changes', async () => {
        const events = [];
        store.add(promptInputModel.onDidChangeInput(e => events.push(e)));
        await writePromise('$ ');
        fireCommandStart();
        await assertPromptInput('|');
        await writePromise('foo');
        await assertPromptInput('foo|');
        await writePromise(' bar');
        await assertPromptInput('foo bar|');
        await writePromise('\r\n');
        fireCommandExecuted();
        await assertPromptInput('foo bar');
        await writePromise('$ ');
        fireCommandStart();
        await assertPromptInput('|');
        await writePromise('foo bar');
        await assertPromptInput('foo bar|');
        for (let i = 0; i < events.length - 1; i++) {
            notDeepStrictEqual(events[i], events[i + 1], 'not adjacent events should fire with the same value');
        }
    });
    test('should fire onDidInterrupt followed by onDidFinish when ctrl+c is pressed', async () => {
        await writePromise('$ ');
        fireCommandStart();
        await assertPromptInput('|');
        await writePromise('foo');
        await assertPromptInput('foo|');
        await new Promise(r => {
            store.add(promptInputModel.onDidInterrupt(() => {
                // Fire onDidFinishInput immediately after onDidInterrupt
                store.add(promptInputModel.onDidFinishInput(() => {
                    r();
                }));
            }));
            xterm.input('\x03');
            writePromise('^C').then(() => fireCommandExecuted());
        });
    });
    test('cursor navigation', async () => {
        await writePromise('$ ');
        fireCommandStart();
        await assertPromptInput('|');
        await writePromise('foo bar');
        await assertPromptInput('foo bar|');
        await writePromise('\x1b[3D');
        await assertPromptInput('foo |bar');
        await writePromise('\x1b[4D');
        await assertPromptInput('|foo bar');
        await writePromise('\x1b[3C');
        await assertPromptInput('foo| bar');
        await writePromise('\x1b[4C');
        await assertPromptInput('foo bar|');
        await writePromise('\x1b[D');
        await assertPromptInput('foo ba|r');
        await writePromise('\x1b[C');
        await assertPromptInput('foo bar|');
    });
    suite('ghost text', () => {
        test('basic ghost text', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('foo\x1b[2m bar\x1b[0m\x1b[4D');
            await assertPromptInput('foo|[ bar]');
            await writePromise('\x1b[2D');
            await assertPromptInput('f|oo[ bar]');
        });
        test('trailing whitespace', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('foo    ');
            await writePromise('\x1b[4D');
            await assertPromptInput('foo|    ');
        });
        test('basic ghost text one word', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('pw\x1b[2md\x1b[1D');
            await assertPromptInput('pw|[d]');
        });
        test('ghost text with cursor navigation', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('foo\x1b[2m bar\x1b[0m\x1b[4D');
            await assertPromptInput('foo|[ bar]');
            await writePromise('\x1b[2D');
            await assertPromptInput('f|oo[ bar]');
            await writePromise('\x1b[C');
            await assertPromptInput('fo|o[ bar]');
            await writePromise('\x1b[C');
            await assertPromptInput('foo|[ bar]');
        });
        test('ghost text with different foreground colors only', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('foo\x1b[38;2;255;0;0m bar\x1b[0m\x1b[4D');
            await assertPromptInput('foo|[ bar]');
            await writePromise('\x1b[2D');
            await assertPromptInput('f|oo[ bar]');
        });
        test('no ghost text when foreground color matches earlier text', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('\x1b[38;2;255;0;0mred1\x1b[0m ' + // Red "red1"
                '\x1b[38;2;0;255;0mgreen\x1b[0m ' + // Green "green"
                '\x1b[38;2;255;0;0mred2\x1b[0m' // Red "red2" (same as red1)
            );
            await assertPromptInput('red1 green red2|'); // No ghost text expected
        });
        test('ghost text detected when foreground color is unique at the end', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('\x1b[38;2;255;0;0mcmd\x1b[0m ' + // Red "cmd"
                '\x1b[38;2;0;255;0marg\x1b[0m ' + // Green "arg"
                '\x1b[38;2;0;0;255mfinal\x1b[5D' // Blue "final" (ghost text)
            );
            await assertPromptInput('cmd arg |[final]');
        });
        test('no ghost text when background color matches earlier text', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('\x1b[48;2;255;0;0mred_bg1\x1b[0m ' + // Red background
                '\x1b[48;2;0;255;0mgreen_bg\x1b[0m ' + // Green background
                '\x1b[48;2;255;0;0mred_bg2\x1b[0m' // Red background again
            );
            await assertPromptInput('red_bg1 green_bg red_bg2|'); // No ghost text expected
        });
        test('ghost text detected when background color is unique at the end', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('\x1b[48;2;255;0;0mred_bg\x1b[0m ' + // Red background
                '\x1b[48;2;0;255;0mgreen_bg\x1b[0m ' + // Green background
                '\x1b[48;2;0;0;255mblue_bg\x1b[7D' // Blue background (ghost text)
            );
            await assertPromptInput('red_bg green_bg |[blue_bg]');
        });
        test('ghost text detected when bold style is unique at the end', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('text ' +
                '\x1b[1mBOLD\x1b[4D' // Bold "BOLD" (ghost text)
            );
            await assertPromptInput('text |[BOLD]');
        });
        test('no ghost text when earlier text has the same bold style', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('\x1b[1mBOLD1\x1b[0m ' + // Bold "BOLD1"
                'normal ' +
                '\x1b[1mBOLD2\x1b[0m' // Bold "BOLD2" (same style as "BOLD1")
            );
            await assertPromptInput('BOLD1 normal BOLD2|'); // No ghost text expected
        });
        test('ghost text detected when italic style is unique at the end', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('text ' +
                '\x1b[3mITALIC\x1b[6D' // Italic "ITALIC" (ghost text)
            );
            await assertPromptInput('text |[ITALIC]');
        });
        test('no ghost text when earlier text has the same italic style', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('\x1b[3mITALIC1\x1b[0m ' + // Italic "ITALIC1"
                'normal ' +
                '\x1b[3mITALIC2\x1b[0m' // Italic "ITALIC2" (same style as "ITALIC1")
            );
            await assertPromptInput('ITALIC1 normal ITALIC2|'); // No ghost text expected
        });
        test('ghost text detected when underline style is unique at the end', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('text ' +
                '\x1b[4mUNDERLINE\x1b[9D' // Underlined "UNDERLINE" (ghost text)
            );
            await assertPromptInput('text |[UNDERLINE]');
        });
        test('no ghost text when earlier text has the same underline style', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('\x1b[4mUNDERLINE1\x1b[0m ' + // Underlined "UNDERLINE1"
                'normal ' +
                '\x1b[4mUNDERLINE2\x1b[0m' // Underlined "UNDERLINE2" (same style as "UNDERLINE1")
            );
            await assertPromptInput('UNDERLINE1 normal UNDERLINE2|'); // No ghost text expected
        });
        test('ghost text detected when strikethrough style is unique at the end', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('text ' +
                '\x1b[9mSTRIKE\x1b[6D' // Strikethrough "STRIKE" (ghost text)
            );
            await assertPromptInput('text |[STRIKE]');
        });
        test('no ghost text when earlier text has the same strikethrough style', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('\x1b[9mSTRIKE1\x1b[0m ' + // Strikethrough "STRIKE1"
                'normal ' +
                '\x1b[9mSTRIKE2\x1b[0m' // Strikethrough "STRIKE2" (same style as "STRIKE1")
            );
            await assertPromptInput('STRIKE1 normal STRIKE2|'); // No ghost text expected
        });
        suite('With wrapping', () => {
            test('Fish ghost text in long line with wrapped content', async () => {
                promptInputModel.setShellType("fish" /* PosixShellType.Fish */);
                await writePromise('$ ');
                fireCommandStart();
                await assertPromptInput('|');
                // Write a command with ghost text that will wrap
                await writePromise('find . -name');
                await assertPromptInput(`find . -name|`);
                // Add ghost text with dim style
                await writePromise('\x1b[2m test\x1b[0m\x1b[4D');
                await assertPromptInput(`find . -name |[test]`);
                // Move cursor within the ghost text
                await writePromise('\x1b[C');
                await assertPromptInput(`find . -name t|[est]`);
                // Accept ghost text
                await writePromise('\x1b[C\x1b[C\x1b[C\x1b[C\x1b[C');
                await assertPromptInput(`find . -name test|`);
            });
            test('Pwsh ghost text in long line with wrapped content', async () => {
                promptInputModel.setShellType("pwsh" /* GeneralShellType.PowerShell */);
                await writePromise('$ ');
                fireCommandStart();
                await assertPromptInput('|');
                // Write a command with ghost text that will wrap
                await writePromise('find . -name');
                await assertPromptInput(`find . -name|`);
                // Add ghost text with dim style
                await writePromise('\x1b[2m test\x1b[0m\x1b[4D');
                await assertPromptInput(`find . -name |[test]`);
                // Move cursor within the ghost text
                await writePromise('\x1b[C');
                await assertPromptInput(`find . -name t|[est]`);
                // Accept ghost text
                await writePromise('\x1b[C\x1b[C\x1b[C\x1b[C\x1b[C');
                await assertPromptInput(`find . -name test|`);
            });
        });
        test('Does not detect right prompt as ghost text', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('cmd' + ' '.repeat(6) + '\x1b[38;2;255;0;0mRP\x1b[0m\x1b[8D');
            await assertPromptInput('cmd|' + ' '.repeat(6) + 'RP');
        });
    });
    test('wide input (Korean)', async () => {
        await writePromise('$ ');
        fireCommandStart();
        await assertPromptInput('|');
        await writePromise('안영');
        await assertPromptInput('안영|');
        await writePromise('\r\n컴퓨터');
        await assertPromptInput('안영\n컴퓨터|');
        await writePromise('\r\n사람');
        await assertPromptInput('안영\n컴퓨터\n사람|');
        await writePromise('\x1b[G');
        await assertPromptInput('안영\n컴퓨터\n|사람');
        await writePromise('\x1b[A');
        await assertPromptInput('안영\n|컴퓨터\n사람');
        await writePromise('\x1b[4C');
        await assertPromptInput('안영\n컴퓨|터\n사람');
        await writePromise('\x1b[1;4H');
        await assertPromptInput('안|영\n컴퓨터\n사람');
        await writePromise('\x1b[D');
        await assertPromptInput('|안영\n컴퓨터\n사람');
    });
    test('emoji input', async () => {
        await writePromise('$ ');
        fireCommandStart();
        await assertPromptInput('|');
        await writePromise('✌️👍');
        await assertPromptInput('✌️👍|');
        await writePromise('\r\n😎😕😅');
        await assertPromptInput('✌️👍\n😎😕😅|');
        await writePromise('\r\n🤔🤷😩');
        await assertPromptInput('✌️👍\n😎😕😅\n🤔🤷😩|');
        await writePromise('\x1b[G');
        await assertPromptInput('✌️👍\n😎😕😅\n|🤔🤷😩');
        await writePromise('\x1b[A');
        await assertPromptInput('✌️👍\n|😎😕😅\n🤔🤷😩');
        await writePromise('\x1b[2C');
        await assertPromptInput('✌️👍\n😎😕|😅\n🤔🤷😩');
        await writePromise('\x1b[1;4H');
        await assertPromptInput('✌️|👍\n😎😕😅\n🤔🤷😩');
        await writePromise('\x1b[D');
        await assertPromptInput('|✌️👍\n😎😕😅\n🤔🤷😩');
    });
    suite('trailing whitespace', () => {
        test('cursor index calculation with whitespace', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('echo   ');
            await assertPromptInput('echo   |');
            await writePromise('\x1b[3D');
            await assertPromptInput('echo|   ');
            await writePromise('\x1b[C');
            await assertPromptInput('echo |  ');
            await writePromise('\x1b[C');
            await assertPromptInput('echo  | ');
            await writePromise('\x1b[C');
            await assertPromptInput('echo   |');
        });
        test('cursor index should not exceed command line length', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('cmd');
            await assertPromptInput('cmd|');
            await writePromise('\x1b[10C');
            await assertPromptInput('cmd|');
        });
        test('whitespace preservation in cursor calculation', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('ls   -la');
            await assertPromptInput('ls   -la|');
            await writePromise('\x1b[3D');
            await assertPromptInput('ls   |-la');
            await writePromise('\x1b[3D');
            await assertPromptInput('ls|   -la');
            await writePromise('\x1b[2C');
            await assertPromptInput('ls  | -la');
        });
        test('delete whitespace with backspace', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise(' ');
            await assertPromptInput(` |`);
            xterm.input('\x7F', true); // Backspace
            await writePromise('\x1b[D');
            await assertPromptInput('|');
            xterm.input(' '.repeat(4), true);
            await writePromise(' '.repeat(4));
            await assertPromptInput(`    |`);
            xterm.input('\x1b[D'.repeat(2), true); // Left
            await writePromise('\x1b[2D');
            await assertPromptInput(`  |  `);
            xterm.input('\x7F', true); // Backspace
            await writePromise('\x1b[D');
            await assertPromptInput(` |  `);
            xterm.input('\x7F', true); // Backspace
            await writePromise('\x1b[D');
            await assertPromptInput(`|  `);
            xterm.input(' ', true);
            await writePromise(' ');
            await assertPromptInput(` |  `);
            xterm.input(' ', true);
            await writePromise(' ');
            await assertPromptInput(`  |  `);
            xterm.input('\x1b[C', true); // Right
            await writePromise('\x1b[C');
            await assertPromptInput(`   | `);
            xterm.input('a', true);
            await writePromise('a');
            await assertPromptInput(`   a| `);
            xterm.input('\x7F', true); // Backspace
            await writePromise('\x1b[D\x1b[K');
            await assertPromptInput(`   | `);
            xterm.input('\x1b[D'.repeat(2), true); // Left
            await writePromise('\x1b[2D');
            await assertPromptInput(` |   `);
            xterm.input('\x1b[3~', true); // Delete
            await writePromise('');
            await assertPromptInput(` |  `);
        });
        // TODO: This doesn't work correctly but it doesn't matter too much as it only happens when
        // there is a lot of whitespace at the end of a prompt input
        test.skip('track whitespace when ConPTY deletes whitespace unexpectedly', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            xterm.input('ls', true);
            await writePromise('ls');
            await assertPromptInput(`ls|`);
            xterm.input(' '.repeat(4), true);
            await writePromise(' '.repeat(4));
            await assertPromptInput(`ls    |`);
            xterm.input(' ', true);
            await writePromise('\x1b[4D\x1b[5X\x1b[5C'); // Cursor left x(N-1), delete xN, cursor right xN
            await assertPromptInput(`ls     |`);
        });
        test('track whitespace beyond cursor', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise(' '.repeat(8));
            await assertPromptInput(`${' '.repeat(8)}|`);
            await writePromise('\x1b[4D');
            await assertPromptInput(`${' '.repeat(4)}|${' '.repeat(4)}`);
        });
    });
    suite('multi-line', () => {
        test('basic 2 line', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('echo "a');
            await assertPromptInput(`echo "a|`);
            await writePromise('\n\r\∙ ');
            setContinuationPrompt('∙ ');
            await assertPromptInput(`echo "a\n|`);
            await writePromise('b');
            await assertPromptInput(`echo "a\nb|`);
        });
        test('basic 3 line', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('echo "a');
            await assertPromptInput(`echo "a|`);
            await writePromise('\n\r\∙ ');
            setContinuationPrompt('∙ ');
            await assertPromptInput(`echo "a\n|`);
            await writePromise('b');
            await assertPromptInput(`echo "a\nb|`);
            await writePromise('\n\r\∙ ');
            setContinuationPrompt('∙ ');
            await assertPromptInput(`echo "a\nb\n|`);
            await writePromise('c');
            await assertPromptInput(`echo "a\nb\nc|`);
        });
        test('navigate left in multi-line', async () => {
            return runWithFakedTimers({}, async () => {
                await writePromise('$ ');
                fireCommandStart();
                await assertPromptInput('|');
                await writePromise('echo "a');
                await assertPromptInput(`echo "a|`);
                await writePromise('\n\r\∙ ');
                setContinuationPrompt('∙ ');
                await assertPromptInput(`echo "a\n|`);
                await writePromise('b');
                await assertPromptInput(`echo "a\nb|`);
                await writePromise('\x1b[D');
                await assertPromptInput(`echo "a\n|b`);
                await writePromise('\x1b[@c');
                await assertPromptInput(`echo "a\nc|b`);
                await writePromise('\x1b[K\n\r\∙ ');
                await assertPromptInput(`echo "a\nc\n|`);
                await writePromise('b');
                await assertPromptInput(`echo "a\nc\nb|`);
                await writePromise(' foo');
                await assertPromptInput(`echo "a\nc\nb foo|`);
                await writePromise('\x1b[3D');
                await assertPromptInput(`echo "a\nc\nb |foo`);
            });
        });
        test('navigate up in multi-line', async () => {
            return runWithFakedTimers({}, async () => {
                await writePromise('$ ');
                fireCommandStart();
                await assertPromptInput('|');
                await writePromise('echo "foo');
                await assertPromptInput(`echo "foo|`);
                await writePromise('\n\r\∙ ');
                setContinuationPrompt('∙ ');
                await assertPromptInput(`echo "foo\n|`);
                await writePromise('bar');
                await assertPromptInput(`echo "foo\nbar|`);
                await writePromise('\n\r\∙ ');
                setContinuationPrompt('∙ ');
                await assertPromptInput(`echo "foo\nbar\n|`);
                await writePromise('baz');
                await assertPromptInput(`echo "foo\nbar\nbaz|`);
                await writePromise('\x1b[A');
                await assertPromptInput(`echo "foo\nbar|\nbaz`);
                await writePromise('\x1b[D');
                await assertPromptInput(`echo "foo\nba|r\nbaz`);
                await writePromise('\x1b[D');
                await assertPromptInput(`echo "foo\nb|ar\nbaz`);
                await writePromise('\x1b[D');
                await assertPromptInput(`echo "foo\n|bar\nbaz`);
                await writePromise('\x1b[1;9H');
                await assertPromptInput(`echo "|foo\nbar\nbaz`);
                await writePromise('\x1b[C');
                await assertPromptInput(`echo "f|oo\nbar\nbaz`);
                await writePromise('\x1b[C');
                await assertPromptInput(`echo "fo|o\nbar\nbaz`);
                await writePromise('\x1b[C');
                await assertPromptInput(`echo "foo|\nbar\nbaz`);
            });
        });
        test('navigating up when first line contains invalid/stale trailing whitespace', async () => {
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('echo "foo      \x1b[6D');
            await assertPromptInput(`echo "foo|`);
            await writePromise('\n\r\∙ ');
            setContinuationPrompt('∙ ');
            await assertPromptInput(`echo "foo\n|`);
            await writePromise('bar');
            await assertPromptInput(`echo "foo\nbar|`);
            await writePromise('\x1b[D');
            await assertPromptInput(`echo "foo\nba|r`);
            await writePromise('\x1b[D');
            await assertPromptInput(`echo "foo\nb|ar`);
            await writePromise('\x1b[D');
            await assertPromptInput(`echo "foo\n|bar`);
        });
    });
    suite('multi-line wrapped (no continuation prompt)', () => {
        test('basic wrapped line', async () => {
            return runWithFakedTimers({}, async () => {
                xterm.resize(5, 10);
                await writePromise('$ ');
                fireCommandStart();
                await assertPromptInput('|');
                await writePromise('ech');
                await assertPromptInput(`ech|`);
                await writePromise('o ');
                await assertPromptInput(`echo |`);
                await writePromise('"a"');
                // HACK: Trailing whitespace is due to flaky detection in wrapped lines (but it doesn't matter much)
                await assertPromptInput(`echo "a"| `);
                await writePromise('\n\r\ b');
                await assertPromptInput(`echo "a"\n b|`);
                await writePromise('\n\r\ c');
                await assertPromptInput(`echo "a"\n b\n c|`);
            });
        });
    });
    suite('multi-line wrapped (continuation prompt)', () => {
        test('basic wrapped line', async () => {
            xterm.resize(5, 10);
            promptInputModel.setContinuationPrompt('∙ ');
            await writePromise('$ ');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('ech');
            await assertPromptInput(`ech|`);
            await writePromise('o ');
            await assertPromptInput(`echo |`);
            await writePromise('"a"');
            // HACK: Trailing whitespace is due to flaky detection in wrapped lines (but it doesn't matter much)
            await assertPromptInput(`echo "a"| `);
            await writePromise('\n\r\∙ ');
            await assertPromptInput(`echo "a"\n|`);
            await writePromise('b');
            await assertPromptInput(`echo "a"\nb|`);
            await writePromise('\n\r\∙ ');
            await assertPromptInput(`echo "a"\nb\n|`);
            await writePromise('c');
            await assertPromptInput(`echo "a"\nb\nc|`);
            await writePromise('\n\r\∙ ');
            await assertPromptInput(`echo "a"\nb\nc\n|`);
        });
    });
    suite('multi-line wrapped fish', () => {
        test('forward slash continuation', async () => {
            promptInputModel.setShellType("fish" /* PosixShellType.Fish */);
            await writePromise('$ ');
            await assertPromptInput('|');
            await writePromise('[I] meganrogge@Megans-MacBook-Pro ~ (main|BISECTING)>');
            fireCommandStart();
            await writePromise('ech\\');
            await assertPromptInput(`ech\\|`);
            await writePromise('\no bye');
            await assertPromptInput(`echo bye|`);
        });
        test('newline with no continuation', async () => {
            promptInputModel.setShellType("fish" /* PosixShellType.Fish */);
            await writePromise('$ ');
            await assertPromptInput('|');
            await writePromise('[I] meganrogge@Megans-MacBook-Pro ~ (main|BISECTING)>');
            fireCommandStart();
            await assertPromptInput('|');
            await writePromise('echo "hi');
            await assertPromptInput(`echo "hi|`);
            await writePromise('\nand bye\nwhy"');
            await assertPromptInput(`echo "hi\nand bye\nwhy"|`);
        });
    });
    // To "record a session" for these tests:
    // - Enable debug logging
    // - Open and clear Terminal output channel
    // - Open terminal and perform the test
    // - Extract all "parsing data" lines from the terminal
    suite('recorded sessions', () => {
        async function replayEvents(events) {
            for (const data of events) {
                await writePromise(data);
            }
        }
        suite('Windows 11 (10.0.22621.3447), pwsh 7.4.2, starship prompt 1.10.2', () => {
            test('input with ignored ghost text', async () => {
                return runWithFakedTimers({}, async () => {
                    await replayEvents([
                        '[?25l[2J[m[H]0;C:\\Program Files\\WindowsApps\\Microsoft.PowerShell_7.4.2.0_x64__8wekyb3d8bbwe\\pwsh.exe[?25h',
                        '[?25l[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K[H[?25h',
                        ']633;P;IsWindows=True',
                        ']633;P;ContinuationPrompt=\x1b[38\x3b5\x3b8m∙\x1b[0m ',
                        ']633;A]633;P;Cwd=C:\x5cGithub\x5cmicrosoft\x5cvscode]633;B',
                        '[34m\r\n[38;2;17;17;17m[44m03:13:47 [34m[41m [38;2;17;17;17mvscode [31m[43m [38;2;17;17;17m tyriar/prompt_input_model [33m[46m [38;2;17;17;17m$⇡ [36m[49m [mvia [32m[1m v18.18.2 \r\n❯[m ',
                    ]);
                    fireCommandStart();
                    await assertPromptInput('|');
                    await replayEvents([
                        '[?25l[93mf[97m[2m[3makecommand[3;4H[?25h',
                        '[m',
                        '[93mfo[9X',
                        '[m',
                        '[?25l[93m[3;3Hfoo[?25h',
                        '[m',
                    ]);
                    await assertPromptInput('foo|');
                });
            });
            test('input with accepted and run ghost text', async () => {
                return runWithFakedTimers({}, async () => {
                    await replayEvents([
                        '[?25l[2J[m[H]0;C:\\Program Files\\WindowsApps\\Microsoft.PowerShell_7.4.2.0_x64__8wekyb3d8bbwe\\pwsh.exe[?25h',
                        '[?25l[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K[H[?25h',
                        ']633;P;IsWindows=True',
                        ']633;P;ContinuationPrompt=\x1b[38\x3b5\x3b8m∙\x1b[0m ',
                        ']633;A]633;P;Cwd=C:\x5cGithub\x5cmicrosoft\x5cvscode]633;B',
                        '[34m\r\n[38;2;17;17;17m[44m03:41:36 [34m[41m [38;2;17;17;17mvscode [31m[43m [38;2;17;17;17m tyriar/prompt_input_model [33m[46m [38;2;17;17;17m$ [36m[49m [mvia [32m[1m v18.18.2 \r\n❯[m ',
                    ]);
                    promptInputModel.setContinuationPrompt('∙ ');
                    fireCommandStart();
                    await assertPromptInput('|');
                    await replayEvents([
                        '[?25l[93me[97m[2m[3mcho "hello world"[3;4H[?25h',
                        '[m',
                    ]);
                    await assertPromptInput('e|[cho "hello world"]');
                    await replayEvents([
                        '[?25l[93mec[97m[2m[3mho "hello world"[3;5H[?25h',
                        '[m',
                    ]);
                    await assertPromptInput('ec|[ho "hello world"]');
                    await replayEvents([
                        '[?25l[93m[3;3Hech[97m[2m[3mo "hello world"[3;6H[?25h',
                        '[m',
                    ]);
                    await assertPromptInput('ech|[o "hello world"]');
                    await replayEvents([
                        '[?25l[93m[3;3Hecho[97m[2m[3m "hello world"[3;7H[?25h',
                        '[m',
                    ]);
                    await assertPromptInput('echo|[ "hello world"]');
                    await replayEvents([
                        '[?25l[93m[3;3Hecho [97m[2m[3m"hello world"[3;8H[?25h',
                        '[m',
                    ]);
                    await assertPromptInput('echo |["hello world"]');
                    await replayEvents([
                        '[?25l[93m[3;3Hecho [36m"hello world"[?25h',
                        '[m',
                    ]);
                    await assertPromptInput('echo "hello world"|');
                    await replayEvents([
                        ']633;E;echo "hello world";ff464d39-bc80-4bae-9ead-b1cafc4adf6f]633;C',
                    ]);
                    fireCommandExecuted();
                    await assertPromptInput('echo "hello world"');
                    await replayEvents([
                        '\r\n',
                        'hello world\r\n',
                    ]);
                    await assertPromptInput('echo "hello world"');
                    await replayEvents([
                        ']633;D;0]633;A]633;P;Cwd=C:\x5cGithub\x5cmicrosoft\x5cvscode]633;B',
                        '[34m\r\n[38;2;17;17;17m[44m03:41:42 [34m[41m [38;2;17;17;17mvscode [31m[43m [38;2;17;17;17m tyriar/prompt_input_model [33m[46m [38;2;17;17;17m$ [36m[49m [mvia [32m[1m v18.18.2 \r\n❯[m ',
                    ]);
                    fireCommandStart();
                    await assertPromptInput('|');
                });
            });
            test('input, go to start (ctrl+home), delete word in front (ctrl+delete)', async () => {
                return runWithFakedTimers({}, async () => {
                    await replayEvents([
                        '[?25l[2J[m[H]0;C:\Program Files\WindowsApps\Microsoft.PowerShell_7.4.2.0_x64__8wekyb3d8bbwe\pwsh.exe[?25h',
                        '[?25l[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K\r\n[K[H[?25h',
                        ']633;P;IsWindows=True',
                        ']633;P;ContinuationPrompt=\x1b[38\x3b5\x3b8m∙\x1b[0m ',
                        ']633;A]633;P;Cwd=C:\x5cGithub\x5cmicrosoft\x5cvscode]633;B',
                        '[34m\r\n[38;2;17;17;17m[44m16:07:06 [34m[41m [38;2;17;17;17mvscode [31m[43m [38;2;17;17;17m tyriar/210662 [33m[46m [38;2;17;17;17m$! [36m[49m [mvia [32m[1m v18.18.2 \r\n❯[m ',
                    ]);
                    fireCommandStart();
                    await assertPromptInput('|');
                    await replayEvents([
                        '[?25l[93mG[97m[2m[3mit push[3;4H[?25h',
                        '[m',
                        '[?25l[93mGe[97m[2m[3mt-ChildItem -Path a[3;5H[?25h',
                        '[m',
                        '[?25l[93m[3;3HGet[97m[2m[3m-ChildItem -Path a[3;6H[?25h',
                    ]);
                    await assertPromptInput('Get|[-ChildItem -Path a]');
                    await replayEvents([
                        '[m',
                        '[?25l[3;3H[?25h',
                        '[21X',
                    ]);
                    // Don't force a sync, the prompt input model should update by itself
                    await timeout(0);
                    const actualValueWithCursor = promptInputModel.getCombinedString();
                    strictEqual(actualValueWithCursor, '|'.replaceAll('\n', '\u23CE'));
                });
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0SW5wdXRNb2RlbC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FoYW1lZC9EZXNrdG9wL3B1a3UtdnMtZWRpdG9yL3B1a3UtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdGVybWluYWwvdGVzdC9jb21tb24vY2FwYWJpbGl0aWVzL2NvbW1hbmREZXRlY3Rpb24vcHJvbXB0SW5wdXRNb2RlbC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQStCLE1BQU0sc0VBQXNFLENBQUM7QUFDckksT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBRWpFLE9BQU8sRUFBRSxFQUFFLEVBQUUsa0JBQWtCLEVBQUUsV0FBVyxFQUFFLE1BQU0sUUFBUSxDQUFDO0FBQzdELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUVoRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUUvRixLQUFLLENBQUMsa0JBQWtCLEVBQUUsR0FBRyxFQUFFO0lBQzlCLE1BQU0sS0FBSyxHQUFHLHVDQUF1QyxFQUFFLENBQUM7SUFFeEQsSUFBSSxnQkFBa0MsQ0FBQztJQUN2QyxJQUFJLEtBQWUsQ0FBQztJQUNwQixJQUFJLGNBQXlDLENBQUM7SUFDOUMsSUFBSSxxQkFBb0MsQ0FBQztJQUN6QyxJQUFJLGlCQUE0QyxDQUFDO0lBRWpELEtBQUssVUFBVSxZQUFZLENBQUMsSUFBWTtRQUN2QyxNQUFNLElBQUksT0FBTyxDQUFPLENBQUMsQ0FB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