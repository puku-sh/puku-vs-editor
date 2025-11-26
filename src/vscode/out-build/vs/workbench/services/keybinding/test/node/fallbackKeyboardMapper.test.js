/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { KeyChord } from '../../../../../base/common/keyCodes.js';
import { KeyCodeChord, decodeKeybinding, ScanCodeChord, Keybinding } from '../../../../../base/common/keybindings.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { FallbackKeyboardMapper } from '../../common/fallbackKeyboardMapper.js';
import { assertResolveKeyboardEvent, assertResolveKeybinding } from './keyboardMapperTestUtils.js';
suite('keyboardMapper - MAC fallback', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const mapper = new FallbackKeyboardMapper(false, 2 /* OperatingSystem.Macintosh */);
    function _assertResolveKeybinding(k, expected) {
        assertResolveKeybinding(mapper, decodeKeybinding(k, 2 /* OperatingSystem.Macintosh */), expected);
    }
    test('resolveKeybinding Cmd+Z', () => {
        _assertResolveKeybinding(2048 /* KeyMod.CtrlCmd */ | 56 /* KeyCode.KeyZ */, [{
                label: '⌘Z',
                ariaLabel: 'Command+Z',
                electronAccelerator: 'Cmd+Z',
                userSettingsLabel: 'cmd+z',
                isWYSIWYG: true,
                isMultiChord: false,
                dispatchParts: ['meta+Z'],
                singleModifierDispatchParts: [null],
            }]);
    });
    test('resolveKeybinding Cmd+K Cmd+=', () => {
        _assertResolveKeybinding(KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 86 /* KeyCode.Equal */), [{
                label: '⌘K ⌘=',
                ariaLabel: 'Command+K Command+=',
                electronAccelerator: null,
                userSettingsLabel: 'cmd+k cmd+=',
                isWYSIWYG: true,
                isMultiChord: true,
                dispatchParts: ['meta+K', 'meta+='],
                singleModifierDispatchParts: [null, null],
            }]);
    });
    test('resolveKeyboardEvent Cmd+Z', () => {
        assertResolveKeyboardEvent(mapper, {
            _standardKeyboardEventBrand: true,
            ctrlKey: false,
            shiftKey: false,
            altKey: false,
            metaKey: true,
            altGraphKey: false,
            keyCode: 56 /* KeyCode.KeyZ */,
            code: null
        }, {
            label: '⌘Z',
            ariaLabel: 'Command+Z',
            electronAccelerator: 'Cmd+Z',
            userSettingsLabel: 'cmd+z',
            isWYSIWYG: true,
            isMultiChord: false,
            dispatchParts: ['meta+Z'],
            singleModifierDispatchParts: [null],
        });
    });
    test('resolveUserBinding Cmd+[Comma] Cmd+/', () => {
        assertResolveKeybinding(mapper, new Keybinding([
            new ScanCodeChord(false, false, false, true, 60 /* ScanCode.Comma */),
            new KeyCodeChord(false, false, false, true, 90 /* KeyCode.Slash */),
        ]), [{
                label: '⌘, ⌘/',
                ariaLabel: 'Command+, Command+/',
                electronAccelerator: null,
                userSettingsLabel: 'cmd+, cmd+/',
                isWYSIWYG: true,
                isMultiChord: true,
                dispatchParts: ['meta+,', 'meta+/'],
                singleModifierDispatchParts: [null, null],
            }]);
    });
    test('resolveKeyboardEvent Single Modifier Meta+', () => {
        assertResolveKeyboardEvent(mapper, {
            _standardKeyboardEventBrand: true,
            ctrlKey: false,
            shiftKey: false,
            altKey: false,
            metaKey: true,
            altGraphKey: false,
            keyCode: 57 /* KeyCode.Meta */,
            code: null
        }, {
            label: '⌘',
            ariaLabel: 'Command',
            electronAccelerator: null,
            userSettingsLabel: 'cmd',
            isWYSIWYG: true,
            isMultiChord: false,
            dispatchParts: [null],
            singleModifierDispatchParts: ['meta'],
        });
    });
    test('resolveKeyboardEvent Single Modifier Shift+', () => {
        assertResolveKeyboardEvent(mapper, {
            _standardKeyboardEventBrand: true,
            ctrlKey: false,
            shiftKey: true,
            altKey: false,
            metaKey: false,
            altGraphKey: false,
            keyCode: 4 /* KeyCode.Shift */,
            code: null
        }, {
            label: '⇧',
            ariaLabel: 'Shift',
            electronAccelerator: null,
            userSettingsLabel: 'shift',
            isWYSIWYG: true,
            isMultiChord: false,
            dispatchParts: [null],
            singleModifierDispatchParts: ['shift'],
        });
    });
    test('resolveKeyboardEvent Single Modifier Alt+', () => {
        assertResolveKeyboardEvent(mapper, {
            _standardKeyboardEventBrand: true,
            ctrlKey: false,
            shiftKey: false,
            altKey: true,
            metaKey: false,
            altGraphKey: false,
            keyCode: 6 /* KeyCode.Alt */,
            code: null
        }, {
            label: '⌥',
            ariaLabel: 'Option',
            electronAccelerator: null,
            userSettingsLabel: 'alt',
            isWYSIWYG: true,
            isMultiChord: false,
            dispatchParts: [null],
            singleModifierDispatchParts: ['alt'],
        });
    });
    test('resolveKeyboardEvent Only Modifiers Ctrl+Shift+', () => {
        assertResolveKeyboardEvent(mapper, {
            _standardKeyboardEventBrand: true,
            ctrlKey: true,
            shiftKey: true,
            altKey: false,
            metaKey: false,
            altGraphKey: false,
            keyCode: 4 /* KeyCode.Shift */,
            code: null
        }, {
            label: '⌃⇧',
            ariaLabel: 'Control+Shift',
            electronAccelerator: null,
            userSettingsLabel: 'ctrl+shift',
            isWYSIWYG: true,
            isMultiChord: false,
            dispatchParts: [null],
            singleModifierDispatchParts: [null],
        });
    });
    test('resolveKeyboardEvent mapAltGrToCtrlAlt AltGr+Z', () => {
        const mapper = new FallbackKeyboardMapper(true, 2 /* OperatingSystem.Macintosh */);
        assertResolveKeyboardEvent(mapper, {
            _standardKeyboardEventBrand: true,
            ctrlKey: false,
            shiftKey: false,
            altKey: false,
            metaKey: false,
            altGraphKey: true,
            keyCode: 56 /* KeyCode.KeyZ */,
            code: null
        }, {
            label: '⌃⌥Z',
            ariaLabel: 'Control+Option+Z',
            electronAccelerator: 'Ctrl+Alt+Z',
            userSettingsLabel: 'ctrl+alt+z',
            isWYSIWYG: true,
            isMultiChord: false,
            dispatchParts: ['ctrl+alt+Z'],
            singleModifierDispatchParts: [null],
        });
    });
});
suite('keyboardMapper - LINUX fallback', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const mapper = new FallbackKeyboardMapper(false, 3 /* OperatingSystem.Linux */);
    function _assertResolveKeybinding(k, expected) {
        assertResolveKeybinding(mapper, decodeKeybinding(k, 3 /* OperatingSystem.Linux */), expected);
    }
    test('resolveKeybinding Ctrl+Z', () => {
        _assertResolveKeybinding(2048 /* KeyMod.CtrlCmd */ | 56 /* KeyCode.KeyZ */, [{
                label: 'Ctrl+Z',
                ariaLabel: 'Control+Z',
                electronAccelerator: 'Ctrl+Z',
                userSettingsLabel: 'ctrl+z',
                isWYSIWYG: true,
                isMultiChord: false,
                dispatchParts: ['ctrl+Z'],
                singleModifierDispatchParts: [null],
            }]);
    });
    test('resolveKeybinding Ctrl+K Ctrl+=', () => {
        _assertResolveKeybinding(KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 86 /* KeyCode.Equal */), [{
                label: 'Ctrl+K Ctrl+=',
                ariaLabel: 'Control+K Control+=',
                electronAccelerator: null,
                userSettingsLabel: 'ctrl+k ctrl+=',
                isWYSIWYG: true,
                isMultiChord: true,
                dispatchParts: ['ctrl+K', 'ctrl+='],
                singleModifierDispatchParts: [null, null],
            }]);
    });
    test('resolveKeyboardEvent Ctrl+Z', () => {
        assertResolveKeyboardEvent(mapper, {
            _standardKeyboardEventBrand: true,
            ctrlKey: true,
            shiftKey: false,
            altKey: false,
            metaKey: false,
            altGraphKey: false,
            keyCode: 56 /* KeyCode.KeyZ */,
            code: null
        }, {
            label: 'Ctrl+Z',
            ariaLabel: 'Control+Z',
            electronAccelerator: 'Ctrl+Z',
            userSettingsLabel: 'ctrl+z',
            isWYSIWYG: true,
            isMultiChord: false,
            dispatchParts: ['ctrl+Z'],
            singleModifierDispatchParts: [null],
        });
    });
    test('resolveUserBinding Ctrl+[Comma] Ctrl+/', () => {
        assertResolveKeybinding(mapper, new Keybinding([
            new ScanCodeChord(true, false, false, false, 60 /* ScanCode.Comma */),
            new KeyCodeChord(true, false, false, false, 90 /* KeyCode.Slash */),
        ]), [{
                label: 'Ctrl+, Ctrl+/',
                ariaLabel: 'Control+, Control+/',
                electronAccelerator: null,
                userSettingsLabel: 'ctrl+, ctrl+/',
                isWYSIWYG: true,
                isMultiChord: true,
                dispatchParts: ['ctrl+,', 'ctrl+/'],
                singleModifierDispatchParts: [null, null],
            }]);
    });
    test('resolveUserBinding Ctrl+[Comma]', () => {
        assertResolveKeybinding(mapper, new Keybinding([
            new ScanCodeChord(true, false, false, false, 60 /* ScanCode.Comma */),
        ]), [{
                label: 'Ctrl+,',
                ariaLabel: 'Control+,',
                electronAccelerator: 'Ctrl+,',
                userSettingsLabel: 'ctrl+,',
                isWYSIWYG: true,
                isMultiChord: false,
                dispatchParts: ['ctrl+,'],
                singleModifierDispatchParts: [null],
            }]);
    });
    test('resolveKeyboardEvent Single Modifier Ctrl+', () => {
        assertResolveKeyboardEvent(mapper, {
            _standardKeyboardEventBrand: true,
            ctrlKey: true,
            shiftKey: false,
            altKey: false,
            metaKey: false,
            altGraphKey: false,
            keyCode: 5 /* KeyCode.Ctrl */,
            code: null
        }, {
            label: 'Ctrl',
            ariaLabel: 'Control',
            electronAccelerator: null,
            userSettingsLabel: 'ctrl',
            isWYSIWYG: true,
            isMultiChord: false,
            dispatchParts: [null],
            singleModifierDispatchParts: ['ctrl'],
        });
    });
    test('resolveKeyboardEvent mapAltGrToCtrlAlt AltGr+Z', () => {
        const mapper = new FallbackKeyboardMapper(true, 3 /* OperatingSystem.Linux */);
        assertResolveKeyboardEvent(mapper, {
            _standardKeyboardEventBrand: true,
            ctrlKey: false,
            shiftKey: false,
            altKey: false,
            metaKey: false,
            altGraphKey: true,
            keyCode: 56 /* KeyCode.KeyZ */,
            code: null
        }, {
            label: 'Ctrl+Alt+Z',
            ariaLabel: 'Control+Alt+Z',
            electronAccelerator: 'Ctrl+Alt+Z',
            userSettingsLabel: 'ctrl+alt+z',
            isWYSIWYG: true,
            isMultiChord: false,
            dispatchParts: ['ctrl+alt+Z'],
            singleModifierDispatchParts: [null],
        });
    });
});
//# sourceMappingURL=fallbackKeyboardMapper.test.js.map