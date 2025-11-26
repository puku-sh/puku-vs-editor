/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize, localize2 } from '../../../../nls.js';
/**
 * An object holding strings shared by multiple parts of the terminal
 */
export const terminalStrings = {
    terminal: localize(12996, null),
    new: localize(12997, null),
    doNotShowAgain: localize(12998, null),
    currentSessionCategory: localize(12999, null),
    previousSessionCategory: localize(13000, null),
    typeTask: localize(13001, null),
    typeLocal: localize(13002, null),
    actionCategory: localize2(13005, "Terminal"),
    focus: localize2(13006, "Focus Terminal"),
    focusInstance: localize2(13007, "Focus Terminal"),
    focusAndHideAccessibleBuffer: localize2(13008, "Focus Terminal and Hide Accessible Buffer"),
    kill: {
        ...localize2(13009, "Kill Terminal"),
        short: localize(13003, null),
    },
    moveToEditor: localize2(13010, "Move Terminal into Editor Area"),
    moveIntoNewWindow: localize2(13011, "Move Terminal into New Window"),
    newInNewWindow: localize2(13012, "New Terminal Window"),
    moveToTerminalPanel: localize2(13013, "Move Terminal into Panel"),
    changeIcon: localize2(13014, "Change Icon..."),
    changeColor: localize2(13015, "Change Color..."),
    split: {
        ...localize2(13016, "Split Terminal"),
        short: localize(13004, null),
    },
    unsplit: localize2(13017, "Unsplit Terminal"),
    rename: localize2(13018, "Rename..."),
    toggleSizeToContentWidth: localize2(13019, "Toggle Size to Content Width"),
    focusHover: localize2(13020, "Focus Hover"),
    newWithCwd: localize2(13021, "Create New Terminal Starting in a Custom Working Directory"),
    renameWithArgs: localize2(13022, "Rename the Currently Active Terminal"),
    scrollToPreviousCommand: localize2(13023, "Scroll to Previous Command"),
    scrollToNextCommand: localize2(13024, "Scroll to Next Command"),
    revealCommand: localize2(13025, "Reveal Command in Terminal"),
};
//# sourceMappingURL=terminalStrings.js.map