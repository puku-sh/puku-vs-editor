/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../nls.js';
import { registerColor, editorBackground, contrastBorder, transparent, editorWidgetBackground, textLinkForeground, lighten, darken, focusBorder, activeContrastBorder, editorWidgetForeground, editorErrorForeground, editorWarningForeground, editorInfoForeground, treeIndentGuidesStroke, errorForeground, listActiveSelectionBackground, listActiveSelectionForeground, editorForeground, toolbarHoverBackground, inputBorder, widgetBorder, scrollbarShadow } from '../../platform/theme/common/colorRegistry.js';
import { Color } from '../../base/common/color.js';
import { ColorScheme } from '../../platform/theme/common/theme.js';
// < --- Workbench (not customizable) --- >
export function WORKBENCH_BACKGROUND(theme) {
    switch (theme.type) {
        case ColorScheme.LIGHT:
            return Color.fromHex('#F3F3F3');
        case ColorScheme.HIGH_CONTRAST_LIGHT:
            return Color.fromHex('#FFFFFF');
        case ColorScheme.HIGH_CONTRAST_DARK:
            return Color.fromHex('#000000');
        default:
            return Color.fromHex('#252526');
    }
}
// < --- Tabs --- >
//#region Tab Background
export const TAB_ACTIVE_BACKGROUND = registerColor('tab.activeBackground', editorBackground, localize(4461, null));
export const TAB_UNFOCUSED_ACTIVE_BACKGROUND = registerColor('tab.unfocusedActiveBackground', TAB_ACTIVE_BACKGROUND, localize(4462, null));
export const TAB_INACTIVE_BACKGROUND = registerColor('tab.inactiveBackground', {
    dark: '#2D2D2D',
    light: '#ECECEC',
    hcDark: null,
    hcLight: null,
}, localize(4463, null));
export const TAB_UNFOCUSED_INACTIVE_BACKGROUND = registerColor('tab.unfocusedInactiveBackground', TAB_INACTIVE_BACKGROUND, localize(4464, null));
//#endregion
//#region Tab Foreground
export const TAB_ACTIVE_FOREGROUND = registerColor('tab.activeForeground', {
    dark: Color.white,
    light: '#333333',
    hcDark: Color.white,
    hcLight: '#292929'
}, localize(4465, null));
export const TAB_INACTIVE_FOREGROUND = registerColor('tab.inactiveForeground', {
    dark: transparent(TAB_ACTIVE_FOREGROUND, 0.5),
    light: transparent(TAB_ACTIVE_FOREGROUND, 0.7),
    hcDark: Color.white,
    hcLight: '#292929'
}, localize(4466, null));
export const TAB_UNFOCUSED_ACTIVE_FOREGROUND = registerColor('tab.unfocusedActiveForeground', {
    dark: transparent(TAB_ACTIVE_FOREGROUND, 0.5),
    light: transparent(TAB_ACTIVE_FOREGROUND, 0.7),
    hcDark: Color.white,
    hcLight: '#292929'
}, localize(4467, null));
export const TAB_UNFOCUSED_INACTIVE_FOREGROUND = registerColor('tab.unfocusedInactiveForeground', {
    dark: transparent(TAB_INACTIVE_FOREGROUND, 0.5),
    light: transparent(TAB_INACTIVE_FOREGROUND, 0.5),
    hcDark: Color.white,
    hcLight: '#292929'
}, localize(4468, null));
//#endregion
//#region Tab Hover Foreground/Background
export const TAB_HOVER_BACKGROUND = registerColor('tab.hoverBackground', null, localize(4469, null));
export const TAB_UNFOCUSED_HOVER_BACKGROUND = registerColor('tab.unfocusedHoverBackground', {
    dark: transparent(TAB_HOVER_BACKGROUND, 0.5),
    light: transparent(TAB_HOVER_BACKGROUND, 0.7),
    hcDark: null,
    hcLight: null
}, localize(4470, null));
export const TAB_HOVER_FOREGROUND = registerColor('tab.hoverForeground', null, localize(4471, null));
export const TAB_UNFOCUSED_HOVER_FOREGROUND = registerColor('tab.unfocusedHoverForeground', {
    dark: transparent(TAB_HOVER_FOREGROUND, 0.5),
    light: transparent(TAB_HOVER_FOREGROUND, 0.5),
    hcDark: null,
    hcLight: null
}, localize(4472, null));
//#endregion
//#region Tab Borders
export const TAB_BORDER = registerColor('tab.border', {
    dark: '#252526',
    light: '#F3F3F3',
    hcDark: contrastBorder,
    hcLight: contrastBorder,
}, localize(4473, null));
export const TAB_LAST_PINNED_BORDER = registerColor('tab.lastPinnedBorder', {
    dark: treeIndentGuidesStroke,
    light: treeIndentGuidesStroke,
    hcDark: contrastBorder,
    hcLight: contrastBorder
}, localize(4474, null));
export const TAB_ACTIVE_BORDER = registerColor('tab.activeBorder', null, localize(4475, null));
export const TAB_UNFOCUSED_ACTIVE_BORDER = registerColor('tab.unfocusedActiveBorder', {
    dark: transparent(TAB_ACTIVE_BORDER, 0.5),
    light: transparent(TAB_ACTIVE_BORDER, 0.7),
    hcDark: null,
    hcLight: null
}, localize(4476, null));
export const TAB_ACTIVE_BORDER_TOP = registerColor('tab.activeBorderTop', {
    dark: null,
    light: null,
    hcDark: null,
    hcLight: '#B5200D'
}, localize(4477, null));
export const TAB_UNFOCUSED_ACTIVE_BORDER_TOP = registerColor('tab.unfocusedActiveBorderTop', {
    dark: transparent(TAB_ACTIVE_BORDER_TOP, 0.5),
    light: transparent(TAB_ACTIVE_BORDER_TOP, 0.7),
    hcDark: null,
    hcLight: '#B5200D'
}, localize(4478, null));
export const TAB_SELECTED_BORDER_TOP = registerColor('tab.selectedBorderTop', TAB_ACTIVE_BORDER_TOP, localize(4479, null));
export const TAB_SELECTED_BACKGROUND = registerColor('tab.selectedBackground', TAB_ACTIVE_BACKGROUND, localize(4480, null));
export const TAB_SELECTED_FOREGROUND = registerColor('tab.selectedForeground', TAB_ACTIVE_FOREGROUND, localize(4481, null));
export const TAB_HOVER_BORDER = registerColor('tab.hoverBorder', null, localize(4482, null));
export const TAB_UNFOCUSED_HOVER_BORDER = registerColor('tab.unfocusedHoverBorder', {
    dark: transparent(TAB_HOVER_BORDER, 0.5),
    light: transparent(TAB_HOVER_BORDER, 0.7),
    hcDark: null,
    hcLight: contrastBorder
}, localize(4483, null));
//#endregion
//#region Tab Drag and Drop Border
export const TAB_DRAG_AND_DROP_BORDER = registerColor('tab.dragAndDropBorder', {
    dark: TAB_ACTIVE_FOREGROUND,
    light: TAB_ACTIVE_FOREGROUND,
    hcDark: activeContrastBorder,
    hcLight: activeContrastBorder
}, localize(4484, null));
//#endregion
//#region Tab Modified Border
export const TAB_ACTIVE_MODIFIED_BORDER = registerColor('tab.activeModifiedBorder', {
    dark: '#3399CC',
    light: '#33AAEE',
    hcDark: null,
    hcLight: contrastBorder
}, localize(4485, null));
export const TAB_INACTIVE_MODIFIED_BORDER = registerColor('tab.inactiveModifiedBorder', {
    dark: transparent(TAB_ACTIVE_MODIFIED_BORDER, 0.5),
    light: transparent(TAB_ACTIVE_MODIFIED_BORDER, 0.5),
    hcDark: Color.white,
    hcLight: contrastBorder
}, localize(4486, null));
export const TAB_UNFOCUSED_ACTIVE_MODIFIED_BORDER = registerColor('tab.unfocusedActiveModifiedBorder', {
    dark: transparent(TAB_ACTIVE_MODIFIED_BORDER, 0.5),
    light: transparent(TAB_ACTIVE_MODIFIED_BORDER, 0.7),
    hcDark: Color.white,
    hcLight: contrastBorder
}, localize(4487, null));
export const TAB_UNFOCUSED_INACTIVE_MODIFIED_BORDER = registerColor('tab.unfocusedInactiveModifiedBorder', {
    dark: transparent(TAB_INACTIVE_MODIFIED_BORDER, 0.5),
    light: transparent(TAB_INACTIVE_MODIFIED_BORDER, 0.5),
    hcDark: Color.white,
    hcLight: contrastBorder
}, localize(4488, null));
//#endregion
// < --- Editors --- >
export const EDITOR_PANE_BACKGROUND = registerColor('editorPane.background', editorBackground, localize(4489, null));
export const EDITOR_GROUP_EMPTY_BACKGROUND = registerColor('editorGroup.emptyBackground', null, localize(4490, null));
export const EDITOR_GROUP_FOCUSED_EMPTY_BORDER = registerColor('editorGroup.focusedEmptyBorder', {
    dark: null,
    light: null,
    hcDark: focusBorder,
    hcLight: focusBorder
}, localize(4491, null));
export const EDITOR_GROUP_HEADER_TABS_BACKGROUND = registerColor('editorGroupHeader.tabsBackground', {
    dark: '#252526',
    light: '#F3F3F3',
    hcDark: null,
    hcLight: null
}, localize(4492, null));
export const EDITOR_GROUP_HEADER_TABS_BORDER = registerColor('editorGroupHeader.tabsBorder', null, localize(4493, null));
export const EDITOR_GROUP_HEADER_NO_TABS_BACKGROUND = registerColor('editorGroupHeader.noTabsBackground', editorBackground, localize(4494, null));
export const EDITOR_GROUP_HEADER_BORDER = registerColor('editorGroupHeader.border', {
    dark: null,
    light: null,
    hcDark: contrastBorder,
    hcLight: contrastBorder
}, localize(4495, null));
export const EDITOR_GROUP_BORDER = registerColor('editorGroup.border', {
    dark: '#444444',
    light: '#E7E7E7',
    hcDark: contrastBorder,
    hcLight: contrastBorder
}, localize(4496, null));
export const EDITOR_DRAG_AND_DROP_BACKGROUND = registerColor('editorGroup.dropBackground', {
    dark: Color.fromHex('#53595D').transparent(0.5),
    light: Color.fromHex('#2677CB').transparent(0.18),
    hcDark: null,
    hcLight: Color.fromHex('#0F4A85').transparent(0.50)
}, localize(4497, null));
export const EDITOR_DROP_INTO_PROMPT_FOREGROUND = registerColor('editorGroup.dropIntoPromptForeground', editorWidgetForeground, localize(4498, null));
export const EDITOR_DROP_INTO_PROMPT_BACKGROUND = registerColor('editorGroup.dropIntoPromptBackground', editorWidgetBackground, localize(4499, null));
export const EDITOR_DROP_INTO_PROMPT_BORDER = registerColor('editorGroup.dropIntoPromptBorder', {
    dark: null,
    light: null,
    hcDark: contrastBorder,
    hcLight: contrastBorder
}, localize(4500, null));
export const SIDE_BY_SIDE_EDITOR_HORIZONTAL_BORDER = registerColor('sideBySideEditor.horizontalBorder', EDITOR_GROUP_BORDER, localize(4501, null));
export const SIDE_BY_SIDE_EDITOR_VERTICAL_BORDER = registerColor('sideBySideEditor.verticalBorder', EDITOR_GROUP_BORDER, localize(4502, null));
// < --- Output Editor -->
const OUTPUT_VIEW_BACKGROUND = registerColor('outputView.background', null, localize(4503, null));
registerColor('outputViewStickyScroll.background', OUTPUT_VIEW_BACKGROUND, localize(4504, null));
// < --- Banner --- >
export const BANNER_BACKGROUND = registerColor('banner.background', {
    dark: listActiveSelectionBackground,
    light: darken(listActiveSelectionBackground, 0.3),
    hcDark: listActiveSelectionBackground,
    hcLight: listActiveSelectionBackground
}, localize(4505, null));
export const BANNER_FOREGROUND = registerColor('banner.foreground', listActiveSelectionForeground, localize(4506, null));
export const BANNER_ICON_FOREGROUND = registerColor('banner.iconForeground', editorInfoForeground, localize(4507, null));
// < --- Status --- >
export const STATUS_BAR_FOREGROUND = registerColor('statusBar.foreground', {
    dark: '#FFFFFF',
    light: '#FFFFFF',
    hcDark: '#FFFFFF',
    hcLight: editorForeground
}, localize(4508, null));
export const STATUS_BAR_NO_FOLDER_FOREGROUND = registerColor('statusBar.noFolderForeground', STATUS_BAR_FOREGROUND, localize(4509, null));
export const STATUS_BAR_BACKGROUND = registerColor('statusBar.background', {
    dark: '#007ACC',
    light: '#007ACC',
    hcDark: null,
    hcLight: null,
}, localize(4510, null));
export const STATUS_BAR_NO_FOLDER_BACKGROUND = registerColor('statusBar.noFolderBackground', {
    dark: '#68217A',
    light: '#68217A',
    hcDark: null,
    hcLight: null,
}, localize(4511, null));
export const STATUS_BAR_BORDER = registerColor('statusBar.border', {
    dark: null,
    light: null,
    hcDark: contrastBorder,
    hcLight: contrastBorder
}, localize(4512, null));
export const STATUS_BAR_FOCUS_BORDER = registerColor('statusBar.focusBorder', {
    dark: STATUS_BAR_FOREGROUND,
    light: STATUS_BAR_FOREGROUND,
    hcDark: null,
    hcLight: STATUS_BAR_FOREGROUND
}, localize(4513, null));
export const STATUS_BAR_NO_FOLDER_BORDER = registerColor('statusBar.noFolderBorder', STATUS_BAR_BORDER, localize(4514, null));
export const STATUS_BAR_ITEM_ACTIVE_BACKGROUND = registerColor('statusBarItem.activeBackground', {
    dark: Color.white.transparent(0.18),
    light: Color.white.transparent(0.18),
    hcDark: Color.white.transparent(0.18),
    hcLight: Color.black.transparent(0.18)
}, localize(4515, null));
export const STATUS_BAR_ITEM_FOCUS_BORDER = registerColor('statusBarItem.focusBorder', {
    dark: STATUS_BAR_FOREGROUND,
    light: STATUS_BAR_FOREGROUND,
    hcDark: null,
    hcLight: activeContrastBorder
}, localize(4516, null));
export const STATUS_BAR_ITEM_HOVER_BACKGROUND = registerColor('statusBarItem.hoverBackground', {
    dark: Color.white.transparent(0.12),
    light: Color.black.transparent(0.12),
    hcDark: Color.black,
    hcLight: Color.white
}, localize(4517, null));
export const STATUS_BAR_ITEM_HOVER_FOREGROUND = registerColor('statusBarItem.hoverForeground', STATUS_BAR_FOREGROUND, localize(4518, null));
export const STATUS_BAR_ITEM_COMPACT_HOVER_BACKGROUND = registerColor('statusBarItem.compactHoverBackground', {
    dark: Color.white.transparent(0.12),
    light: Color.black.transparent(0.12),
    hcDark: Color.black,
    hcLight: Color.white
}, localize(4519, null));
export const STATUS_BAR_PROMINENT_ITEM_FOREGROUND = registerColor('statusBarItem.prominentForeground', STATUS_BAR_FOREGROUND, localize(4520, null));
export const STATUS_BAR_PROMINENT_ITEM_BACKGROUND = registerColor('statusBarItem.prominentBackground', Color.black.transparent(0.5), localize(4521, null));
export const STATUS_BAR_PROMINENT_ITEM_HOVER_FOREGROUND = registerColor('statusBarItem.prominentHoverForeground', STATUS_BAR_ITEM_HOVER_FOREGROUND, localize(4522, null));
export const STATUS_BAR_PROMINENT_ITEM_HOVER_BACKGROUND = registerColor('statusBarItem.prominentHoverBackground', STATUS_BAR_ITEM_HOVER_BACKGROUND, localize(4523, null));
export const STATUS_BAR_ERROR_ITEM_BACKGROUND = registerColor('statusBarItem.errorBackground', {
    dark: darken(errorForeground, .4),
    light: darken(errorForeground, .4),
    hcDark: null,
    hcLight: '#B5200D'
}, localize(4524, null));
export const STATUS_BAR_ERROR_ITEM_FOREGROUND = registerColor('statusBarItem.errorForeground', Color.white, localize(4525, null));
export const STATUS_BAR_ERROR_ITEM_HOVER_FOREGROUND = registerColor('statusBarItem.errorHoverForeground', STATUS_BAR_ITEM_HOVER_FOREGROUND, localize(4526, null));
export const STATUS_BAR_ERROR_ITEM_HOVER_BACKGROUND = registerColor('statusBarItem.errorHoverBackground', STATUS_BAR_ITEM_HOVER_BACKGROUND, localize(4527, null));
export const STATUS_BAR_WARNING_ITEM_BACKGROUND = registerColor('statusBarItem.warningBackground', {
    dark: darken(editorWarningForeground, .4),
    light: darken(editorWarningForeground, .4),
    hcDark: null,
    hcLight: '#895503'
}, localize(4528, null));
export const STATUS_BAR_WARNING_ITEM_FOREGROUND = registerColor('statusBarItem.warningForeground', Color.white, localize(4529, null));
export const STATUS_BAR_WARNING_ITEM_HOVER_FOREGROUND = registerColor('statusBarItem.warningHoverForeground', STATUS_BAR_ITEM_HOVER_FOREGROUND, localize(4530, null));
export const STATUS_BAR_WARNING_ITEM_HOVER_BACKGROUND = registerColor('statusBarItem.warningHoverBackground', STATUS_BAR_ITEM_HOVER_BACKGROUND, localize(4531, null));
// < --- Activity Bar --- >
export const ACTIVITY_BAR_BACKGROUND = registerColor('activityBar.background', {
    dark: '#333333',
    light: '#2C2C2C',
    hcDark: '#000000',
    hcLight: '#FFFFFF'
}, localize(4532, null));
export const ACTIVITY_BAR_FOREGROUND = registerColor('activityBar.foreground', {
    dark: Color.white,
    light: Color.white,
    hcDark: Color.white,
    hcLight: editorForeground
}, localize(4533, null));
export const ACTIVITY_BAR_INACTIVE_FOREGROUND = registerColor('activityBar.inactiveForeground', {
    dark: transparent(ACTIVITY_BAR_FOREGROUND, 0.4),
    light: transparent(ACTIVITY_BAR_FOREGROUND, 0.4),
    hcDark: Color.white,
    hcLight: editorForeground
}, localize(4534, null));
export const ACTIVITY_BAR_BORDER = registerColor('activityBar.border', {
    dark: null,
    light: null,
    hcDark: contrastBorder,
    hcLight: contrastBorder
}, localize(4535, null));
export const ACTIVITY_BAR_ACTIVE_BORDER = registerColor('activityBar.activeBorder', {
    dark: ACTIVITY_BAR_FOREGROUND,
    light: ACTIVITY_BAR_FOREGROUND,
    hcDark: contrastBorder,
    hcLight: contrastBorder
}, localize(4536, null));
export const ACTIVITY_BAR_ACTIVE_FOCUS_BORDER = registerColor('activityBar.activeFocusBorder', {
    dark: null,
    light: null,
    hcDark: null,
    hcLight: '#B5200D'
}, localize(4537, null));
export const ACTIVITY_BAR_ACTIVE_BACKGROUND = registerColor('activityBar.activeBackground', null, localize(4538, null));
export const ACTIVITY_BAR_DRAG_AND_DROP_BORDER = registerColor('activityBar.dropBorder', {
    dark: ACTIVITY_BAR_FOREGROUND,
    light: ACTIVITY_BAR_FOREGROUND,
    hcDark: null,
    hcLight: null,
}, localize(4539, null));
export const ACTIVITY_BAR_BADGE_BACKGROUND = registerColor('activityBarBadge.background', {
    dark: '#007ACC',
    light: '#007ACC',
    hcDark: '#000000',
    hcLight: '#0F4A85'
}, localize(4540, null));
export const ACTIVITY_BAR_BADGE_FOREGROUND = registerColor('activityBarBadge.foreground', Color.white, localize(4541, null));
export const ACTIVITY_BAR_TOP_FOREGROUND = registerColor('activityBarTop.foreground', {
    dark: '#E7E7E7',
    light: '#424242',
    hcDark: Color.white,
    hcLight: editorForeground
}, localize(4542, null));
export const ACTIVITY_BAR_TOP_ACTIVE_BORDER = registerColor('activityBarTop.activeBorder', {
    dark: ACTIVITY_BAR_TOP_FOREGROUND,
    light: ACTIVITY_BAR_TOP_FOREGROUND,
    hcDark: contrastBorder,
    hcLight: '#B5200D'
}, localize(4543, null));
export const ACTIVITY_BAR_TOP_ACTIVE_BACKGROUND = registerColor('activityBarTop.activeBackground', null, localize(4544, null));
export const ACTIVITY_BAR_TOP_INACTIVE_FOREGROUND = registerColor('activityBarTop.inactiveForeground', {
    dark: transparent(ACTIVITY_BAR_TOP_FOREGROUND, 0.6),
    light: transparent(ACTIVITY_BAR_TOP_FOREGROUND, 0.75),
    hcDark: Color.white,
    hcLight: editorForeground
}, localize(4545, null));
export const ACTIVITY_BAR_TOP_DRAG_AND_DROP_BORDER = registerColor('activityBarTop.dropBorder', ACTIVITY_BAR_TOP_FOREGROUND, localize(4546, null));
export const ACTIVITY_BAR_TOP_BACKGROUND = registerColor('activityBarTop.background', null, localize(4547, null));
// < --- Panels --- >
export const PANEL_BACKGROUND = registerColor('panel.background', editorBackground, localize(4548, null));
export const PANEL_BORDER = registerColor('panel.border', {
    dark: Color.fromHex('#808080').transparent(0.35),
    light: Color.fromHex('#808080').transparent(0.35),
    hcDark: contrastBorder,
    hcLight: contrastBorder
}, localize(4549, null));
export const PANEL_TITLE_BORDER = registerColor('panelTitle.border', {
    dark: null,
    light: null,
    hcDark: PANEL_BORDER,
    hcLight: PANEL_BORDER
}, localize(4550, null));
export const PANEL_ACTIVE_TITLE_FOREGROUND = registerColor('panelTitle.activeForeground', {
    dark: '#E7E7E7',
    light: '#424242',
    hcDark: Color.white,
    hcLight: editorForeground
}, localize(4551, null));
export const PANEL_INACTIVE_TITLE_FOREGROUND = registerColor('panelTitle.inactiveForeground', {
    dark: transparent(PANEL_ACTIVE_TITLE_FOREGROUND, 0.6),
    light: transparent(PANEL_ACTIVE_TITLE_FOREGROUND, 0.75),
    hcDark: Color.white,
    hcLight: editorForeground
}, localize(4552, null));
export const PANEL_ACTIVE_TITLE_BORDER = registerColor('panelTitle.activeBorder', {
    dark: PANEL_ACTIVE_TITLE_FOREGROUND,
    light: PANEL_ACTIVE_TITLE_FOREGROUND,
    hcDark: contrastBorder,
    hcLight: '#B5200D'
}, localize(4553, null));
export const PANEL_TITLE_BADGE_BACKGROUND = registerColor('panelTitleBadge.background', ACTIVITY_BAR_BADGE_BACKGROUND, localize(4554, null));
export const PANEL_TITLE_BADGE_FOREGROUND = registerColor('panelTitleBadge.foreground', ACTIVITY_BAR_BADGE_FOREGROUND, localize(4555, null));
export const PANEL_INPUT_BORDER = registerColor('panelInput.border', {
    dark: inputBorder,
    light: Color.fromHex('#ddd'),
    hcDark: inputBorder,
    hcLight: inputBorder
}, localize(4556, null));
export const PANEL_DRAG_AND_DROP_BORDER = registerColor('panel.dropBorder', PANEL_ACTIVE_TITLE_FOREGROUND, localize(4557, null));
export const PANEL_SECTION_DRAG_AND_DROP_BACKGROUND = registerColor('panelSection.dropBackground', EDITOR_DRAG_AND_DROP_BACKGROUND, localize(4558, null));
export const PANEL_SECTION_HEADER_BACKGROUND = registerColor('panelSectionHeader.background', {
    dark: Color.fromHex('#808080').transparent(0.2),
    light: Color.fromHex('#808080').transparent(0.2),
    hcDark: null,
    hcLight: null,
}, localize(4559, null));
export const PANEL_SECTION_HEADER_FOREGROUND = registerColor('panelSectionHeader.foreground', null, localize(4560, null));
export const PANEL_SECTION_HEADER_BORDER = registerColor('panelSectionHeader.border', contrastBorder, localize(4561, null));
export const PANEL_SECTION_BORDER = registerColor('panelSection.border', PANEL_BORDER, localize(4562, null));
export const PANEL_STICKY_SCROLL_BACKGROUND = registerColor('panelStickyScroll.background', PANEL_BACKGROUND, localize(4563, null));
export const PANEL_STICKY_SCROLL_BORDER = registerColor('panelStickyScroll.border', null, localize(4564, null));
export const PANEL_STICKY_SCROLL_SHADOW = registerColor('panelStickyScroll.shadow', scrollbarShadow, localize(4565, null));
// < --- Profiles --- >
export const PROFILE_BADGE_BACKGROUND = registerColor('profileBadge.background', {
    dark: '#4D4D4D',
    light: '#C4C4C4',
    hcDark: Color.white,
    hcLight: Color.black
}, localize(4566, null));
export const PROFILE_BADGE_FOREGROUND = registerColor('profileBadge.foreground', {
    dark: Color.white,
    light: '#333333',
    hcDark: Color.black,
    hcLight: Color.white
}, localize(4567, null));
// < --- Remote --- >
export const STATUS_BAR_REMOTE_ITEM_BACKGROUND = registerColor('statusBarItem.remoteBackground', ACTIVITY_BAR_BADGE_BACKGROUND, localize(4568, null));
export const STATUS_BAR_REMOTE_ITEM_FOREGROUND = registerColor('statusBarItem.remoteForeground', ACTIVITY_BAR_BADGE_FOREGROUND, localize(4569, null));
export const STATUS_BAR_REMOTE_ITEM_HOVER_FOREGROUND = registerColor('statusBarItem.remoteHoverForeground', STATUS_BAR_ITEM_HOVER_FOREGROUND, localize(4570, null));
export const STATUS_BAR_REMOTE_ITEM_HOVER_BACKGROUND = registerColor('statusBarItem.remoteHoverBackground', {
    dark: STATUS_BAR_ITEM_HOVER_BACKGROUND,
    light: STATUS_BAR_ITEM_HOVER_BACKGROUND,
    hcDark: STATUS_BAR_ITEM_HOVER_BACKGROUND,
    hcLight: null
}, localize(4571, null));
export const STATUS_BAR_OFFLINE_ITEM_BACKGROUND = registerColor('statusBarItem.offlineBackground', '#6c1717', localize(4572, null));
export const STATUS_BAR_OFFLINE_ITEM_FOREGROUND = registerColor('statusBarItem.offlineForeground', STATUS_BAR_REMOTE_ITEM_FOREGROUND, localize(4573, null));
export const STATUS_BAR_OFFLINE_ITEM_HOVER_FOREGROUND = registerColor('statusBarItem.offlineHoverForeground', STATUS_BAR_ITEM_HOVER_FOREGROUND, localize(4574, null));
export const STATUS_BAR_OFFLINE_ITEM_HOVER_BACKGROUND = registerColor('statusBarItem.offlineHoverBackground', {
    dark: STATUS_BAR_ITEM_HOVER_BACKGROUND,
    light: STATUS_BAR_ITEM_HOVER_BACKGROUND,
    hcDark: STATUS_BAR_ITEM_HOVER_BACKGROUND,
    hcLight: null
}, localize(4575, null));
export const EXTENSION_BADGE_BACKGROUND = registerColor('extensionBadge.remoteBackground', ACTIVITY_BAR_BADGE_BACKGROUND, localize(4576, null));
export const EXTENSION_BADGE_FOREGROUND = registerColor('extensionBadge.remoteForeground', ACTIVITY_BAR_BADGE_FOREGROUND, localize(4577, null));
// < --- Side Bar --- >
export const SIDE_BAR_BACKGROUND = registerColor('sideBar.background', {
    dark: '#252526',
    light: '#F3F3F3',
    hcDark: '#000000',
    hcLight: '#FFFFFF'
}, localize(4578, null));
export const SIDE_BAR_FOREGROUND = registerColor('sideBar.foreground', null, localize(4579, null));
export const SIDE_BAR_BORDER = registerColor('sideBar.border', {
    dark: null,
    light: null,
    hcDark: contrastBorder,
    hcLight: contrastBorder
}, localize(4580, null));
export const SIDE_BAR_TITLE_BACKGROUND = registerColor('sideBarTitle.background', SIDE_BAR_BACKGROUND, localize(4581, null));
export const SIDE_BAR_TITLE_FOREGROUND = registerColor('sideBarTitle.foreground', SIDE_BAR_FOREGROUND, localize(4582, null));
export const SIDE_BAR_TITLE_BORDER = registerColor('sideBarTitle.border', {
    dark: null,
    light: null,
    hcDark: SIDE_BAR_BORDER,
    hcLight: SIDE_BAR_BORDER
}, localize(4583, null));
export const SIDE_BAR_DRAG_AND_DROP_BACKGROUND = registerColor('sideBar.dropBackground', EDITOR_DRAG_AND_DROP_BACKGROUND, localize(4584, null));
export const SIDE_BAR_SECTION_HEADER_BACKGROUND = registerColor('sideBarSectionHeader.background', {
    dark: Color.fromHex('#808080').transparent(0.2),
    light: Color.fromHex('#808080').transparent(0.2),
    hcDark: null,
    hcLight: null
}, localize(4585, null));
export const SIDE_BAR_SECTION_HEADER_FOREGROUND = registerColor('sideBarSectionHeader.foreground', SIDE_BAR_FOREGROUND, localize(4586, null));
export const SIDE_BAR_SECTION_HEADER_BORDER = registerColor('sideBarSectionHeader.border', contrastBorder, localize(4587, null));
export const ACTIVITY_BAR_TOP_BORDER = registerColor('sideBarActivityBarTop.border', SIDE_BAR_SECTION_HEADER_BORDER, localize(4588, null));
export const SIDE_BAR_STICKY_SCROLL_BACKGROUND = registerColor('sideBarStickyScroll.background', SIDE_BAR_BACKGROUND, localize(4589, null));
export const SIDE_BAR_STICKY_SCROLL_BORDER = registerColor('sideBarStickyScroll.border', null, localize(4590, null));
export const SIDE_BAR_STICKY_SCROLL_SHADOW = registerColor('sideBarStickyScroll.shadow', scrollbarShadow, localize(4591, null));
// < --- Title Bar --- >
export const TITLE_BAR_ACTIVE_FOREGROUND = registerColor('titleBar.activeForeground', {
    dark: '#CCCCCC',
    light: '#333333',
    hcDark: '#FFFFFF',
    hcLight: '#292929'
}, localize(4592, null));
export const TITLE_BAR_INACTIVE_FOREGROUND = registerColor('titleBar.inactiveForeground', {
    dark: transparent(TITLE_BAR_ACTIVE_FOREGROUND, 0.6),
    light: transparent(TITLE_BAR_ACTIVE_FOREGROUND, 0.6),
    hcDark: null,
    hcLight: '#292929'
}, localize(4593, null));
export const TITLE_BAR_ACTIVE_BACKGROUND = registerColor('titleBar.activeBackground', {
    dark: '#3C3C3C',
    light: '#DDDDDD',
    hcDark: '#000000',
    hcLight: '#FFFFFF'
}, localize(4594, null));
export const TITLE_BAR_INACTIVE_BACKGROUND = registerColor('titleBar.inactiveBackground', {
    dark: transparent(TITLE_BAR_ACTIVE_BACKGROUND, 0.6),
    light: transparent(TITLE_BAR_ACTIVE_BACKGROUND, 0.6),
    hcDark: null,
    hcLight: null,
}, localize(4595, null));
export const TITLE_BAR_BORDER = registerColor('titleBar.border', {
    dark: null,
    light: null,
    hcDark: contrastBorder,
    hcLight: contrastBorder
}, localize(4596, null));
// < --- Menubar --- >
export const MENUBAR_SELECTION_FOREGROUND = registerColor('menubar.selectionForeground', TITLE_BAR_ACTIVE_FOREGROUND, localize(4597, null));
export const MENUBAR_SELECTION_BACKGROUND = registerColor('menubar.selectionBackground', {
    dark: toolbarHoverBackground,
    light: toolbarHoverBackground,
    hcDark: null,
    hcLight: null,
}, localize(4598, null));
export const MENUBAR_SELECTION_BORDER = registerColor('menubar.selectionBorder', {
    dark: null,
    light: null,
    hcDark: activeContrastBorder,
    hcLight: activeContrastBorder,
}, localize(4599, null));
// < --- Command Center --- >
// foreground (inactive and active)
export const COMMAND_CENTER_FOREGROUND = registerColor('commandCenter.foreground', TITLE_BAR_ACTIVE_FOREGROUND, localize(4600, null), false);
export const COMMAND_CENTER_ACTIVEFOREGROUND = registerColor('commandCenter.activeForeground', MENUBAR_SELECTION_FOREGROUND, localize(4601, null), false);
export const COMMAND_CENTER_INACTIVEFOREGROUND = registerColor('commandCenter.inactiveForeground', TITLE_BAR_INACTIVE_FOREGROUND, localize(4602, null), false);
// background (inactive and active)
export const COMMAND_CENTER_BACKGROUND = registerColor('commandCenter.background', { dark: Color.white.transparent(0.05), hcDark: null, light: Color.black.transparent(0.05), hcLight: null }, localize(4603, null), false);
export const COMMAND_CENTER_ACTIVEBACKGROUND = registerColor('commandCenter.activeBackground', { dark: Color.white.transparent(0.08), hcDark: MENUBAR_SELECTION_BACKGROUND, light: Color.black.transparent(0.08), hcLight: MENUBAR_SELECTION_BACKGROUND }, localize(4604, null), false);
// border: active and inactive. defaults to active background
export const COMMAND_CENTER_BORDER = registerColor('commandCenter.border', { dark: transparent(TITLE_BAR_ACTIVE_FOREGROUND, .20), hcDark: contrastBorder, light: transparent(TITLE_BAR_ACTIVE_FOREGROUND, .20), hcLight: contrastBorder }, localize(4605, null), false);
export const COMMAND_CENTER_ACTIVEBORDER = registerColor('commandCenter.activeBorder', { dark: transparent(TITLE_BAR_ACTIVE_FOREGROUND, .30), hcDark: TITLE_BAR_ACTIVE_FOREGROUND, light: transparent(TITLE_BAR_ACTIVE_FOREGROUND, .30), hcLight: TITLE_BAR_ACTIVE_FOREGROUND }, localize(4606, null), false);
// border: defaults to active background
export const COMMAND_CENTER_INACTIVEBORDER = registerColor('commandCenter.inactiveBorder', transparent(TITLE_BAR_INACTIVE_FOREGROUND, .25), localize(4607, null), false);
// < --- Notifications --- >
export const NOTIFICATIONS_CENTER_BORDER = registerColor('notificationCenter.border', {
    dark: widgetBorder,
    light: widgetBorder,
    hcDark: contrastBorder,
    hcLight: contrastBorder
}, localize(4608, null));
export const NOTIFICATIONS_TOAST_BORDER = registerColor('notificationToast.border', {
    dark: widgetBorder,
    light: widgetBorder,
    hcDark: contrastBorder,
    hcLight: contrastBorder
}, localize(4609, null));
export const NOTIFICATIONS_FOREGROUND = registerColor('notifications.foreground', editorWidgetForeground, localize(4610, null));
export const NOTIFICATIONS_BACKGROUND = registerColor('notifications.background', editorWidgetBackground, localize(4611, null));
export const NOTIFICATIONS_LINKS = registerColor('notificationLink.foreground', textLinkForeground, localize(4612, null));
export const NOTIFICATIONS_CENTER_HEADER_FOREGROUND = registerColor('notificationCenterHeader.foreground', null, localize(4613, null));
export const NOTIFICATIONS_CENTER_HEADER_BACKGROUND = registerColor('notificationCenterHeader.background', {
    dark: lighten(NOTIFICATIONS_BACKGROUND, 0.3),
    light: darken(NOTIFICATIONS_BACKGROUND, 0.05),
    hcDark: NOTIFICATIONS_BACKGROUND,
    hcLight: NOTIFICATIONS_BACKGROUND
}, localize(4614, null));
export const NOTIFICATIONS_BORDER = registerColor('notifications.border', NOTIFICATIONS_CENTER_HEADER_BACKGROUND, localize(4615, null));
export const NOTIFICATIONS_ERROR_ICON_FOREGROUND = registerColor('notificationsErrorIcon.foreground', editorErrorForeground, localize(4616, null));
export const NOTIFICATIONS_WARNING_ICON_FOREGROUND = registerColor('notificationsWarningIcon.foreground', editorWarningForeground, localize(4617, null));
export const NOTIFICATIONS_INFO_ICON_FOREGROUND = registerColor('notificationsInfoIcon.foreground', editorInfoForeground, localize(4618, null));
export const WINDOW_ACTIVE_BORDER = registerColor('window.activeBorder', {
    dark: null,
    light: null,
    hcDark: contrastBorder,
    hcLight: contrastBorder
}, localize(4619, null));
export const WINDOW_INACTIVE_BORDER = registerColor('window.inactiveBorder', {
    dark: null,
    light: null,
    hcDark: contrastBorder,
    hcLight: contrastBorder
}, localize(4620, null));
//# sourceMappingURL=theme.js.map