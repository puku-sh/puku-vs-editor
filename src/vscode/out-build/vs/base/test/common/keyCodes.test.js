/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { EVENT_KEY_CODE_MAP, IMMUTABLE_CODE_TO_KEY_CODE, IMMUTABLE_KEY_CODE_TO_CODE, KeyChord, KeyCodeUtils, NATIVE_WINDOWS_KEY_CODE_TO_KEY_CODE, ScanCodeUtils } from '../../common/keyCodes.js';
import { decodeKeybinding, KeyCodeChord, Keybinding } from '../../common/keybindings.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
suite('keyCodes', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function testBinaryEncoding(expected, k, OS) {
        assert.deepStrictEqual(decodeKeybinding(k, OS), expected);
    }
    test('mapping for Minus', () => {
        // [147, 83, 0, ScanCode.Minus, 'Minus', KeyCode.US_MINUS, '-', 189, 'VK_OEM_MINUS', '-', 'OEM_MINUS'],
        assert.strictEqual(EVENT_KEY_CODE_MAP[189], 88 /* KeyCode.Minus */);
        assert.strictEqual(NATIVE_WINDOWS_KEY_CODE_TO_KEY_CODE['VK_OEM_MINUS'], 88 /* KeyCode.Minus */);
        assert.strictEqual(ScanCodeUtils.lowerCaseToEnum('minus'), 51 /* ScanCode.Minus */);
        assert.strictEqual(ScanCodeUtils.toEnum('Minus'), 51 /* ScanCode.Minus */);
        assert.strictEqual(ScanCodeUtils.toString(51 /* ScanCode.Minus */), 'Minus');
        assert.strictEqual(IMMUTABLE_CODE_TO_KEY_CODE[51 /* ScanCode.Minus */], -1 /* KeyCode.DependsOnKbLayout */);
        assert.strictEqual(IMMUTABLE_KEY_CODE_TO_CODE[88 /* KeyCode.Minus */], -1 /* ScanCode.DependsOnKbLayout */);
        assert.strictEqual(KeyCodeUtils.toString(88 /* KeyCode.Minus */), '-');
        assert.strictEqual(KeyCodeUtils.fromString('-'), 88 /* KeyCode.Minus */);
        assert.strictEqual(KeyCodeUtils.toUserSettingsUS(88 /* KeyCode.Minus */), '-');
        assert.strictEqual(KeyCodeUtils.toUserSettingsGeneral(88 /* KeyCode.Minus */), 'OEM_MINUS');
        assert.strictEqual(KeyCodeUtils.fromUserSettings('-'), 88 /* KeyCode.Minus */);
        assert.strictEqual(KeyCodeUtils.fromUserSettings('OEM_MINUS'), 88 /* KeyCode.Minus */);
        assert.strictEqual(KeyCodeUtils.fromUserSettings('oem_minus'), 88 /* KeyCode.Minus */);
    });
    test('mapping for Space', () => {
        // [21, 10, 1, ScanCode.Space, 'Space', KeyCode.Space, 'Space', 32, 'VK_SPACE', empty, empty],
        assert.strictEqual(EVENT_KEY_CODE_MAP[32], 10 /* KeyCode.Space */);
        assert.strictEqual(NATIVE_WINDOWS_KEY_CODE_TO_KEY_CODE['VK_SPACE'], 10 /* KeyCode.Space */);
        assert.strictEqual(ScanCodeUtils.lowerCaseToEnum('space'), 50 /* ScanCode.Space */);
        assert.strictEqual(ScanCodeUtils.toEnum('Space'), 50 /* ScanCode.Space */);
        assert.strictEqual(ScanCodeUtils.toString(50 /* ScanCode.Space */), 'Space');
        assert.strictEqual(IMMUTABLE_CODE_TO_KEY_CODE[50 /* ScanCode.Space */], 10 /* KeyCode.Space */);
        assert.strictEqual(IMMUTABLE_KEY_CODE_TO_CODE[10 /* KeyCode.Space */], 50 /* ScanCode.Space */);
        assert.strictEqual(KeyCodeUtils.toString(10 /* KeyCode.Space */), 'Space');
        assert.strictEqual(KeyCodeUtils.fromString('Space'), 10 /* KeyCode.Space */);
        assert.strictEqual(KeyCodeUtils.toUserSettingsUS(10 /* KeyCode.Space */), 'Space');
        assert.strictEqual(KeyCodeUtils.toUserSettingsGeneral(10 /* KeyCode.Space */), 'Space');
        assert.strictEqual(KeyCodeUtils.fromUserSettings('Space'), 10 /* KeyCode.Space */);
        assert.strictEqual(KeyCodeUtils.fromUserSettings('space'), 10 /* KeyCode.Space */);
    });
    test('MAC binary encoding', () => {
        function test(expected, k) {
            testBinaryEncoding(expected, k, 2 /* OperatingSystem.Macintosh */);
        }
        test(null, 0);
        test(new KeyCodeChord(false, false, false, false, 3 /* KeyCode.Enter */).toKeybinding(), 3 /* KeyCode.Enter */);
        test(new KeyCodeChord(true, false, false, false, 3 /* KeyCode.Enter */).toKeybinding(), 256 /* KeyMod.WinCtrl */ | 3 /* KeyCode.Enter */);
        test(new KeyCodeChord(false, false, true, false, 3 /* KeyCode.Enter */).toKeybinding(), 512 /* KeyMod.Alt */ | 3 /* KeyCode.Enter */);
        test(new KeyCodeChord(true, false, true, false, 3 /* KeyCode.Enter */).toKeybinding(), 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 3 /* KeyCode.Enter */);
        test(new KeyCodeChord(false, true, false, false, 3 /* KeyCode.Enter */).toKeybinding(), 1024 /* KeyMod.Shift */ | 3 /* KeyCode.Enter */);
        test(new KeyCodeChord(true, true, false, false, 3 /* KeyCode.Enter */).toKeybinding(), 1024 /* KeyMod.Shift */ | 256 /* KeyMod.WinCtrl */ | 3 /* KeyCode.Enter */);
        test(new KeyCodeChord(false, true, true, false, 3 /* KeyCode.Enter */).toKeybinding(), 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 3 /* KeyCode.Enter */);
        test(new KeyCodeChord(true, true, true, false, 3 /* KeyCode.Enter */).toKeybinding(), 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 3 /* KeyCode.Enter */);
        test(new KeyCodeChord(false, false, false, true, 3 /* KeyCode.Enter */).toKeybinding(), 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */);
        test(new KeyCodeChord(true, false, false, true, 3 /* KeyCode.Enter */).toKeybinding(), 2048 /* KeyMod.CtrlCmd */ | 256 /* KeyMod.WinCtrl */ | 3 /* KeyCode.Enter */);
        test(new KeyCodeChord(false, false, true, true, 3 /* KeyCode.Enter */).toKeybinding(), 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 3 /* KeyCode.Enter */);
        test(new KeyCodeChord(true, false, true, true, 3 /* KeyCode.Enter */).toKeybinding(), 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 3 /* KeyCode.Enter */);
        test(new KeyCodeChord(false, true, false, true, 3 /* KeyCode.Enter */).toKeybinding(), 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 3 /* KeyCode.Enter */);
        test(new KeyCodeChord(true, true, false, true, 3 /* KeyCode.Enter */).toKeybinding(), 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 256 /* KeyMod.WinCtrl */ | 3 /* KeyCode.Enter */);
        test(new KeyCodeChord(false, true, true, true, 3 /* KeyCode.Enter */).toKeybinding(), 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 3 /* KeyCode.Enter */);
        test(new KeyCodeChord(true, true, true, true, 3 /* KeyCode.Enter */).toKeybinding(), 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 3 /* KeyCode.Enter */);
        test(new Keybinding([
            new KeyCodeChord(false, false, false, false, 3 /* KeyCode.Enter */),
            new KeyCodeChord(false, false, false, false, 2 /* KeyCode.Tab */)
        ]), KeyChord(3 /* KeyCode.Enter */, 2 /* KeyCode.Tab */));
        test(new Keybinding([
            new KeyCodeChord(false, false, false, true, 55 /* KeyCode.KeyY */),
            new KeyCodeChord(false, false, false, false, 56 /* KeyCode.KeyZ */)
        ]), KeyChord(2048 /* KeyMod.CtrlCmd */ | 55 /* KeyCode.KeyY */, 56 /* KeyCode.KeyZ */));
    });
    test('WINDOWS & LINUX binary encoding', () => {
        [3 /* OperatingSystem.Linux */, 1 /* OperatingSystem.Windows */].forEach((OS) => {
            function test(expected, k) {
                testBinaryEncoding(expected, k, OS);
            }
            test(null, 0);
            test(new KeyCodeChord(false, false, false, false, 3 /* KeyCode.Enter */).toKeybinding(), 3 /* KeyCode.Enter */);
            test(new KeyCodeChord(false, false, false, true, 3 /* KeyCode.Enter */).toKeybinding(), 256 /* KeyMod.WinCtrl */ | 3 /* KeyCode.Enter */);
            test(new KeyCodeChord(false, false, true, false, 3 /* KeyCode.Enter */).toKeybinding(), 512 /* KeyMod.Alt */ | 3 /* KeyCode.Enter */);
            test(new KeyCodeChord(false, false, true, true, 3 /* KeyCode.Enter */).toKeybinding(), 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 3 /* KeyCode.Enter */);
            test(new KeyCodeChord(false, true, false, false, 3 /* KeyCode.Enter */).toKeybinding(), 1024 /* KeyMod.Shift */ | 3 /* KeyCode.Enter */);
            test(new KeyCodeChord(false, true, false, true, 3 /* KeyCode.Enter */).toKeybinding(), 1024 /* KeyMod.Shift */ | 256 /* KeyMod.WinCtrl */ | 3 /* KeyCode.Enter */);
            test(new KeyCodeChord(false, true, true, false, 3 /* KeyCode.Enter */).toKeybinding(), 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 3 /* KeyCode.Enter */);
            test(new KeyCodeChord(false, true, true, true, 3 /* KeyCode.Enter */).toKeybinding(), 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 3 /* KeyCode.Enter */);
            test(new KeyCodeChord(true, false, false, false, 3 /* KeyCode.Enter */).toKeybinding(), 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */);
            test(new KeyCodeChord(true, false, false, true, 3 /* KeyCode.Enter */).toKeybinding(), 2048 /* KeyMod.CtrlCmd */ | 256 /* KeyMod.WinCtrl */ | 3 /* KeyCode.Enter */);
            test(new KeyCodeChord(true, false, true, false, 3 /* KeyCode.Enter */).toKeybinding(), 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 3 /* KeyCode.Enter */);
            test(new KeyCodeChord(true, false, true, true, 3 /* KeyCode.Enter */).toKeybinding(), 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 3 /* KeyCode.Enter */);
            test(new KeyCodeChord(true, true, false, false, 3 /* KeyCode.Enter */).toKeybinding(), 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 3 /* KeyCode.Enter */);
            test(new KeyCodeChord(true, true, false, true, 3 /* KeyCode.Enter */).toKeybinding(), 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 256 /* KeyMod.WinCtrl */ | 3 /* KeyCode.Enter */);
            test(new KeyCodeChord(true, true, true, false, 3 /* KeyCode.Enter */).toKeybinding(), 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 3 /* KeyCode.Enter */);
            test(new KeyCodeChord(true, true, true, true, 3 /* KeyCode.Enter */).toKeybinding(), 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 256 /* KeyMod.WinCtrl */ | 3 /* KeyCode.Enter */);
            test(new Keybinding([
                new KeyCodeChord(false, false, false, false, 3 /* KeyCode.Enter */),
                new KeyCodeChord(false, false, false, false, 2 /* KeyCode.Tab */)
            ]), KeyChord(3 /* KeyCode.Enter */, 2 /* KeyCode.Tab */));
            test(new Keybinding([
                new KeyCodeChord(true, false, false, false, 55 /* KeyCode.KeyY */),
                new KeyCodeChord(false, false, false, false, 56 /* KeyCode.KeyZ */)
            ]), KeyChord(2048 /* KeyMod.CtrlCmd */ | 55 /* KeyCode.KeyY */, 56 /* KeyCode.KeyZ */));
        });
    });
});
//# sourceMappingURL=keyCodes.test.js.map