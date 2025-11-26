/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { EventHelper } from '../../../base/browser/dom.js';
import { fromNow } from '../../../base/common/date.js';
import { localize } from '../../../nls.js';
import { defaultButtonStyles, defaultCheckboxStyles, defaultInputBoxStyles, defaultDialogStyles } from '../../theme/browser/defaultStyles.js';
const defaultDialogAllowableCommands = [
    'workbench.action.quit',
    'workbench.action.reloadWindow',
    'copy',
    'cut',
    'editor.action.selectAll',
    'editor.action.clipboardCopyAction',
    'editor.action.clipboardCutAction',
    'editor.action.clipboardPasteAction'
];
export function createWorkbenchDialogOptions(options, keybindingService, layoutService, allowableCommands = defaultDialogAllowableCommands) {
    return {
        keyEventProcessor: (event) => {
            const resolved = keybindingService.softDispatch(event, layoutService.activeContainer);
            if (resolved.kind === 2 /* ResultKind.KbFound */ && resolved.commandId) {
                if (!allowableCommands.includes(resolved.commandId)) {
                    EventHelper.stop(event, true);
                }
            }
        },
        buttonStyles: defaultButtonStyles,
        checkboxStyles: defaultCheckboxStyles,
        inputBoxStyles: defaultInputBoxStyles,
        dialogStyles: defaultDialogStyles,
        ...options
    };
}
export function createBrowserAboutDialogDetails(productService) {
    const detailString = (useAgo) => {
        return localize('aboutDetail', "Version: {0}\nCommit: {1}\nDate: {2}\nBrowser: {3}", productService.version || 'Unknown', productService.commit || 'Unknown', productService.date ? `${productService.date}${useAgo ? ' (' + fromNow(new Date(productService.date), true) + ')' : ''}` : 'Unknown', navigator.userAgent);
    };
    const details = detailString(true);
    const detailsToCopy = detailString(false);
    return {
        title: productService.nameLong,
        details: details,
        detailsToCopy: detailsToCopy
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlhbG9nLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FoYW1lZC9EZXNrdG9wL3B1a3UtdnMtZWRpdG9yL3B1a3UtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZGlhbG9ncy9icm93c2VyL2RpYWxvZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFHM0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3ZELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUszQyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUscUJBQXFCLEVBQUUscUJBQXFCLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUU5SSxNQUFNLDhCQUE4QixHQUFHO0lBQ3RDLHVCQUF1QjtJQUN2QiwrQkFBK0I7SUFDL0IsTUFBTTtJQUNOLEtBQUs7SUFDTCx5QkFBeUI7SUFDekIsbUNBQW1DO0lBQ25DLGtDQUFrQztJQUNsQyxvQ0FBb0M7Q0FDcEMsQ0FBQztBQUVGLE1BQU0sVUFBVSw0QkFBNEIsQ0FBQyxPQUFnQyxFQUFFLGlCQUFxQyxFQUFFLGFBQTZCLEVBQUUsaUJBQWlCLEdBQUcsOEJBQThCO0lBQ3RNLE9BQU87UUFDTixpQkFBaUIsRUFBRSxDQUFDLEtBQTRCLEVBQUUsRUFBRTtZQUNuRCxNQUFNLFFBQVEsR0FBRyxpQkFBaUIsQ0FBQyxZQUFZLENBQUMsS0FBSyxFQUFFLGFBQWEsQ0FBQyxlQUFlLENBQUMsQ0FBQztZQUN0RixJQUFJLFFBQVEsQ0FBQyxJQUFJLCtCQUF1QixJQUFJLFFBQVEsQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDaEUsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztvQkFDckQsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQy9CLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUNELFlBQVksRUFBRSxtQkFBbUI7UUFDakMsY0FBYyxFQUFFLHFCQUFxQjtRQUNyQyxjQUFjLEVBQUUscUJBQXFCO1FBQ3JDLFlBQVksRUFBRSxtQkFBbUI7UUFDakMsR0FBRyxPQUFPO0tBQ1YsQ0FBQztBQUNILENBQUM7QUFFRCxNQUFNLFVBQVUsK0JBQStCLENBQUMsY0FBK0I7SUFDOUUsTUFBTSxZQUFZLEdBQUcsQ0FBQyxNQUFlLEVBQVUsRUFBRTtRQUNoRCxPQUFPLFFBQVEsQ0FBQyxhQUFhLEVBQzVCLG9EQUFvRCxFQUNwRCxjQUFjLENBQUMsT0FBTyxJQUFJLFNBQVMsRUFDbkMsY0FBYyxDQUFDLE1BQU0sSUFBSSxTQUFTLEVBQ2xDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsY0FBYyxDQUFDLElBQUksR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxPQUFPLENBQUMsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFDcEksU0FBUyxDQUFDLFNBQVMsQ0FDbkIsQ0FBQztJQUNILENBQUMsQ0FBQztJQUVGLE1BQU0sT0FBTyxHQUFHLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNuQyxNQUFNLGFBQWEsR0FBRyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUM7SUFFMUMsT0FBTztRQUNOLEtBQUssRUFBRSxjQUFjLENBQUMsUUFBUTtRQUM5QixPQUFPLEVBQUUsT0FBTztRQUNoQixhQUFhLEVBQUUsYUFBYTtLQUM1QixDQUFDO0FBQ0gsQ0FBQyJ9