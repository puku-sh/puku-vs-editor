/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { editorOverviewRulerBorder } from '../../../../editor/common/core/editorColorRegistry.js';
import * as nls from '../../../../nls.js';
import { registerColor, editorFindMatch, editorFindMatchHighlight, overviewRulerFindMatchForeground, editorSelectionBackground, transparent, editorHoverHighlight } from '../../../../platform/theme/common/colorRegistry.js';
import { EDITOR_DRAG_AND_DROP_BACKGROUND, PANEL_BORDER, TAB_ACTIVE_BORDER } from '../../../common/theme.js';
/**
 * The color identifiers for the terminal's ansi colors. The index in the array corresponds to the index
 * of the color in the terminal color table.
 */
export const ansiColorIdentifiers = [];
export const TERMINAL_BACKGROUND_COLOR = registerColor('terminal.background', null, nls.localize(12796, null));
export const TERMINAL_FOREGROUND_COLOR = registerColor('terminal.foreground', {
    light: '#333333',
    dark: '#CCCCCC',
    hcDark: '#FFFFFF',
    hcLight: '#292929'
}, nls.localize(12797, null));
export const TERMINAL_CURSOR_FOREGROUND_COLOR = registerColor('terminalCursor.foreground', null, nls.localize(12798, null));
export const TERMINAL_CURSOR_BACKGROUND_COLOR = registerColor('terminalCursor.background', null, nls.localize(12799, null));
export const TERMINAL_SELECTION_BACKGROUND_COLOR = registerColor('terminal.selectionBackground', editorSelectionBackground, nls.localize(12800, null));
export const TERMINAL_INACTIVE_SELECTION_BACKGROUND_COLOR = registerColor('terminal.inactiveSelectionBackground', {
    light: transparent(TERMINAL_SELECTION_BACKGROUND_COLOR, 0.5),
    dark: transparent(TERMINAL_SELECTION_BACKGROUND_COLOR, 0.5),
    hcDark: transparent(TERMINAL_SELECTION_BACKGROUND_COLOR, 0.7),
    hcLight: transparent(TERMINAL_SELECTION_BACKGROUND_COLOR, 0.5)
}, nls.localize(12801, null));
export const TERMINAL_SELECTION_FOREGROUND_COLOR = registerColor('terminal.selectionForeground', {
    light: null,
    dark: null,
    hcDark: '#000000',
    hcLight: '#ffffff'
}, nls.localize(12802, null));
export const TERMINAL_COMMAND_DECORATION_DEFAULT_BACKGROUND_COLOR = registerColor('terminalCommandDecoration.defaultBackground', {
    light: '#00000040',
    dark: '#ffffff40',
    hcDark: '#ffffff80',
    hcLight: '#00000040',
}, nls.localize(12803, null));
export const TERMINAL_COMMAND_DECORATION_SUCCESS_BACKGROUND_COLOR = registerColor('terminalCommandDecoration.successBackground', {
    dark: '#1B81A8',
    light: '#2090D3',
    hcDark: '#1B81A8',
    hcLight: '#007100'
}, nls.localize(12804, null));
export const TERMINAL_COMMAND_DECORATION_ERROR_BACKGROUND_COLOR = registerColor('terminalCommandDecoration.errorBackground', {
    dark: '#F14C4C',
    light: '#E51400',
    hcDark: '#F14C4C',
    hcLight: '#B5200D'
}, nls.localize(12805, null));
export const TERMINAL_OVERVIEW_RULER_CURSOR_FOREGROUND_COLOR = registerColor('terminalOverviewRuler.cursorForeground', '#A0A0A0CC', nls.localize(12806, null));
export const TERMINAL_BORDER_COLOR = registerColor('terminal.border', PANEL_BORDER, nls.localize(12807, null));
export const TERMINAL_OVERVIEW_RULER_BORDER_COLOR = registerColor('terminalOverviewRuler.border', editorOverviewRulerBorder, nls.localize(12808, null));
export const TERMINAL_FIND_MATCH_BACKGROUND_COLOR = registerColor('terminal.findMatchBackground', {
    dark: editorFindMatch,
    light: editorFindMatch,
    // Use regular selection background in high contrast with a thick border
    hcDark: null,
    hcLight: '#0F4A85'
}, nls.localize(12809, null), true);
export const TERMINAL_HOVER_HIGHLIGHT_BACKGROUND_COLOR = registerColor('terminal.hoverHighlightBackground', transparent(editorHoverHighlight, 0.5), nls.localize(12810, null));
export const TERMINAL_FIND_MATCH_BORDER_COLOR = registerColor('terminal.findMatchBorder', {
    dark: null,
    light: null,
    hcDark: '#f38518',
    hcLight: '#0F4A85'
}, nls.localize(12811, null));
export const TERMINAL_FIND_MATCH_HIGHLIGHT_BACKGROUND_COLOR = registerColor('terminal.findMatchHighlightBackground', {
    dark: editorFindMatchHighlight,
    light: editorFindMatchHighlight,
    hcDark: null,
    hcLight: null
}, nls.localize(12812, null), true);
export const TERMINAL_FIND_MATCH_HIGHLIGHT_BORDER_COLOR = registerColor('terminal.findMatchHighlightBorder', {
    dark: null,
    light: null,
    hcDark: '#f38518',
    hcLight: '#0F4A85'
}, nls.localize(12813, null));
export const TERMINAL_OVERVIEW_RULER_FIND_MATCH_FOREGROUND_COLOR = registerColor('terminalOverviewRuler.findMatchForeground', {
    dark: overviewRulerFindMatchForeground,
    light: overviewRulerFindMatchForeground,
    hcDark: '#f38518',
    hcLight: '#0F4A85'
}, nls.localize(12814, null));
export const TERMINAL_DRAG_AND_DROP_BACKGROUND = registerColor('terminal.dropBackground', EDITOR_DRAG_AND_DROP_BACKGROUND, nls.localize(12815, null), true);
export const TERMINAL_TAB_ACTIVE_BORDER = registerColor('terminal.tab.activeBorder', TAB_ACTIVE_BORDER, nls.localize(12816, null));
export const TERMINAL_INITIAL_HINT_FOREGROUND = registerColor('terminal.initialHintForeground', {
    dark: '#ffffff56',
    light: '#0007',
    hcDark: null,
    hcLight: null
}, nls.localize(12817, null));
export const ansiColorMap = {
    'terminal.ansiBlack': {
        index: 0,
        defaults: {
            light: '#000000',
            dark: '#000000',
            hcDark: '#000000',
            hcLight: '#292929'
        }
    },
    'terminal.ansiRed': {
        index: 1,
        defaults: {
            light: '#cd3131',
            dark: '#cd3131',
            hcDark: '#cd0000',
            hcLight: '#cd3131'
        }
    },
    'terminal.ansiGreen': {
        index: 2,
        defaults: {
            light: '#107C10',
            dark: '#0DBC79',
            hcDark: '#00cd00',
            hcLight: '#136C13'
        }
    },
    'terminal.ansiYellow': {
        index: 3,
        defaults: {
            light: '#949800',
            dark: '#e5e510',
            hcDark: '#cdcd00',
            hcLight: '#949800'
        }
    },
    'terminal.ansiBlue': {
        index: 4,
        defaults: {
            light: '#0451a5',
            dark: '#2472c8',
            hcDark: '#0000ee',
            hcLight: '#0451a5'
        }
    },
    'terminal.ansiMagenta': {
        index: 5,
        defaults: {
            light: '#bc05bc',
            dark: '#bc3fbc',
            hcDark: '#cd00cd',
            hcLight: '#bc05bc'
        }
    },
    'terminal.ansiCyan': {
        index: 6,
        defaults: {
            light: '#0598bc',
            dark: '#11a8cd',
            hcDark: '#00cdcd',
            hcLight: '#0598bc'
        }
    },
    'terminal.ansiWhite': {
        index: 7,
        defaults: {
            light: '#555555',
            dark: '#e5e5e5',
            hcDark: '#e5e5e5',
            hcLight: '#555555'
        }
    },
    'terminal.ansiBrightBlack': {
        index: 8,
        defaults: {
            light: '#666666',
            dark: '#666666',
            hcDark: '#7f7f7f',
            hcLight: '#666666'
        }
    },
    'terminal.ansiBrightRed': {
        index: 9,
        defaults: {
            light: '#cd3131',
            dark: '#f14c4c',
            hcDark: '#ff0000',
            hcLight: '#cd3131'
        }
    },
    'terminal.ansiBrightGreen': {
        index: 10,
        defaults: {
            light: '#14CE14',
            dark: '#23d18b',
            hcDark: '#00ff00',
            hcLight: '#00bc00'
        }
    },
    'terminal.ansiBrightYellow': {
        index: 11,
        defaults: {
            light: '#b5ba00',
            dark: '#f5f543',
            hcDark: '#ffff00',
            hcLight: '#b5ba00'
        }
    },
    'terminal.ansiBrightBlue': {
        index: 12,
        defaults: {
            light: '#0451a5',
            dark: '#3b8eea',
            hcDark: '#5c5cff',
            hcLight: '#0451a5'
        }
    },
    'terminal.ansiBrightMagenta': {
        index: 13,
        defaults: {
            light: '#bc05bc',
            dark: '#d670d6',
            hcDark: '#ff00ff',
            hcLight: '#bc05bc'
        }
    },
    'terminal.ansiBrightCyan': {
        index: 14,
        defaults: {
            light: '#0598bc',
            dark: '#29b8db',
            hcDark: '#00ffff',
            hcLight: '#0598bc'
        }
    },
    'terminal.ansiBrightWhite': {
        index: 15,
        defaults: {
            light: '#a5a5a5',
            dark: '#e5e5e5',
            hcDark: '#ffffff',
            hcLight: '#a5a5a5'
        }
    }
};
export function registerColors() {
    for (const id in ansiColorMap) {
        const entry = ansiColorMap[id];
        const colorName = id.substring(13);
        ansiColorIdentifiers[entry.index] = registerColor(id, entry.defaults, nls.localize(12818, null, colorName));
    }
}
//# sourceMappingURL=terminalColorRegistry.js.map