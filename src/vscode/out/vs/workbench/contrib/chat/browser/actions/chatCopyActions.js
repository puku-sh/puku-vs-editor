/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from '../../../../../base/browser/dom.js';
import { localize2 } from '../../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { IClipboardService } from '../../../../../platform/clipboard/common/clipboardService.js';
import { CHAT_CATEGORY, stringifyItem } from './chatActions.js';
import { IChatWidgetService } from '../chat.js';
import { ChatContextKeys } from '../../common/chatContextKeys.js';
import { isChatTreeItem, isRequestVM, isResponseVM } from '../../common/chatViewModel.js';
import { katexContainerClassName, katexContainerLatexAttributeName } from '../../../markdown/common/markedKatexExtension.js';
export function registerChatCopyActions() {
    registerAction2(class CopyAllAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.copyAll',
                title: localize2('interactive.copyAll.label', "Copy All"),
                f1: false,
                category: CHAT_CATEGORY,
                menu: {
                    id: MenuId.ChatContext,
                    when: ChatContextKeys.responseIsFiltered.negate(),
                    group: 'copy',
                }
            });
        }
        run(accessor, ...args) {
            const clipboardService = accessor.get(IClipboardService);
            const chatWidgetService = accessor.get(IChatWidgetService);
            const widget = chatWidgetService.lastFocusedWidget;
            if (widget) {
                const viewModel = widget.viewModel;
                const sessionAsText = viewModel?.getItems()
                    .filter((item) => isRequestVM(item) || (isResponseVM(item) && !item.errorDetails?.responseIsFiltered))
                    .map(item => stringifyItem(item))
                    .join('\n\n');
                if (sessionAsText) {
                    clipboardService.writeText(sessionAsText);
                }
            }
        }
    });
    registerAction2(class CopyItemAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.copyItem',
                title: localize2('interactive.copyItem.label', "Copy"),
                f1: false,
                category: CHAT_CATEGORY,
                menu: {
                    id: MenuId.ChatContext,
                    when: ChatContextKeys.responseIsFiltered.negate(),
                    group: 'copy',
                }
            });
        }
        async run(accessor, ...args) {
            const chatWidgetService = accessor.get(IChatWidgetService);
            const clipboardService = accessor.get(IClipboardService);
            const widget = chatWidgetService.lastFocusedWidget;
            let item = args[0];
            if (!isChatTreeItem(item)) {
                item = widget?.getFocus();
                if (!item) {
                    return;
                }
            }
            // If there is a text selection, and focus is inside the widget, copy the selected text.
            // Otherwise, context menu with no selection -> copy the full item
            const nativeSelection = dom.getActiveWindow().getSelection();
            const selectedText = nativeSelection?.toString();
            if (widget && selectedText && selectedText.length > 0 && dom.isAncestor(dom.getActiveElement(), widget.domNode)) {
                await clipboardService.writeText(selectedText);
                return;
            }
            const text = stringifyItem(item, false);
            await clipboardService.writeText(text);
        }
    });
    registerAction2(class CopyKatexMathSourceAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.copyKatexMathSource',
                title: localize2('chat.copyKatexMathSource.label', "Copy Math Source"),
                f1: false,
                category: CHAT_CATEGORY,
                menu: {
                    id: MenuId.ChatContext,
                    group: 'copy',
                    when: ChatContextKeys.isKatexMathElement,
                }
            });
        }
        async run(accessor, ...args) {
            const chatWidgetService = accessor.get(IChatWidgetService);
            const clipboardService = accessor.get(IClipboardService);
            const widget = chatWidgetService.lastFocusedWidget;
            let item = args[0];
            if (!isChatTreeItem(item)) {
                item = widget?.getFocus();
                if (!item) {
                    return;
                }
            }
            // Try to find a KaTeX element from the selection or active element
            let selectedElement = null;
            // If there is a selection, and focus is inside the widget, extract the inner KaTeX element.
            const activeElement = dom.getActiveElement();
            const nativeSelection = dom.getActiveWindow().getSelection();
            if (widget && nativeSelection && nativeSelection.rangeCount > 0 && dom.isAncestor(activeElement, widget.domNode)) {
                const range = nativeSelection.getRangeAt(0);
                selectedElement = range.commonAncestorContainer;
                // If it's a text node, get its parent element
                if (selectedElement.nodeType === Node.TEXT_NODE) {
                    selectedElement = selectedElement.parentElement;
                }
            }
            // Otherwise, fallback to querying from the active element
            if (!selectedElement) {
                // eslint-disable-next-line no-restricted-syntax
                selectedElement = activeElement?.querySelector(`.${katexContainerClassName}`) ?? null;
            }
            // Extract the LaTeX source from the annotation element
            const katexElement = dom.isHTMLElement(selectedElement) ? selectedElement.closest(`.${katexContainerClassName}`) : null;
            const latexSource = katexElement?.getAttribute(katexContainerLatexAttributeName) || '';
            if (latexSource) {
                await clipboardService.writeText(latexSource);
            }
        }
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdENvcHlBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FoYW1lZC9EZXNrdG9wL3B1a3UtdnMtZWRpdG9yL3B1a3UtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2FjdGlvbnMvY2hhdENvcHlBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0NBQW9DLENBQUM7QUFFMUQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ2xELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLGVBQWUsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ3JHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDhEQUE4RCxDQUFDO0FBQ2pHLE9BQU8sRUFBRSxhQUFhLEVBQUUsYUFBYSxFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFDaEUsT0FBTyxFQUFnQixrQkFBa0IsRUFBRSxNQUFNLFlBQVksQ0FBQztBQUM5RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDbEUsT0FBTyxFQUFpRCxjQUFjLEVBQUUsV0FBVyxFQUFFLFlBQVksRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3pJLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBRTdILE1BQU0sVUFBVSx1QkFBdUI7SUFDdEMsZUFBZSxDQUFDLE1BQU0sYUFBYyxTQUFRLE9BQU87UUFDbEQ7WUFDQyxLQUFLLENBQUM7Z0JBQ0wsRUFBRSxFQUFFLCtCQUErQjtnQkFDbkMsS0FBSyxFQUFFLFNBQVMsQ0FBQywyQkFBMkIsRUFBRSxVQUFVLENBQUM7Z0JBQ3pELEVBQUUsRUFBRSxLQUFLO2dCQUNULFFBQVEsRUFBRSxhQUFhO2dCQUN2QixJQUFJLEVBQUU7b0JBQ0wsRUFBRSxFQUFFLE1BQU0sQ0FBQyxXQUFXO29CQUN0QixJQUFJLEVBQUUsZUFBZSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sRUFBRTtvQkFDakQsS0FBSyxFQUFFLE1BQU07aUJBQ2I7YUFDRCxDQUFDLENBQUM7UUFDSixDQUFDO1FBRUQsR0FBRyxDQUFDLFFBQTBCLEVBQUUsR0FBRyxJQUFlO1lBQ2pELE1BQU0sZ0JBQWdCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1lBQ3pELE1BQU0saUJBQWlCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1lBQzNELE1BQU0sTUFBTSxHQUFHLGlCQUFpQixDQUFDLGlCQUFpQixDQUFDO1lBQ25ELElBQUksTUFBTSxFQUFFLENBQUM7Z0JBQ1osTUFBTSxTQUFTLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQztnQkFDbkMsTUFBTSxhQUFhLEdBQUcsU0FBUyxFQUFFLFFBQVEsRUFBRTtxQkFDekMsTUFBTSxDQUFDLENBQUMsSUFBSSxFQUE0RCxFQUFFLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO3FCQUMvSixHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUM7cUJBQ2hDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDZixJQUFJLGFBQWEsRUFBRSxDQUFDO29CQUNuQixnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLENBQUM7Z0JBQzNDLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztLQUNELENBQUMsQ0FBQztJQUVILGVBQWUsQ0FBQyxNQUFNLGNBQWUsU0FBUSxPQUFPO1FBQ25EO1lBQ0MsS0FBSyxDQUFDO2dCQUNMLEVBQUUsRUFBRSxnQ0FBZ0M7Z0JBQ3BDLEtBQUssRUFBRSxTQUFTLENBQUMsNEJBQTRCLEVBQUUsTUFBTSxDQUFDO2dCQUN0RCxFQUFFLEVBQUUsS0FBSztnQkFDVCxRQUFRLEVBQUUsYUFBYTtnQkFDdkIsSUFBSSxFQUFFO29CQUNMLEVBQUUsRUFBRSxNQUFNLENBQUMsV0FBVztvQkFDdEIsSUFBSSxFQUFFLGVBQWUsQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLEVBQUU7b0JBQ2pELEtBQUssRUFBRSxNQUFNO2lCQUNiO2FBQ0QsQ0FBQyxDQUFDO1FBQ0osQ0FBQztRQUVELEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEIsRUFBRSxHQUFHLElBQWU7WUFDdkQsTUFBTSxpQkFBaUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUM7WUFDM0QsTUFBTSxnQkFBZ0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLENBQUM7WUFFekQsTUFBTSxNQUFNLEdBQUcsaUJBQWlCLENBQUMsaUJBQWlCLENBQUM7WUFDbkQsSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBNkIsQ0FBQztZQUMvQyxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7Z0JBQzNCLElBQUksR0FBRyxNQUFNLEVBQUUsUUFBUSxFQUFFLENBQUM7Z0JBQzFCLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztvQkFDWCxPQUFPO2dCQUNSLENBQUM7WUFDRixDQUFDO1lBRUQsd0ZBQXdGO1lBQ3hGLGtFQUFrRTtZQUNsRSxNQUFNLGVBQWUsR0FBRyxHQUFHLENBQUMsZUFBZSxFQUFFLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDN0QsTUFBTSxZQUFZLEdBQUcsZUFBZSxFQUFFLFFBQVEsRUFBRSxDQUFDO1lBQ2pELElBQUksTUFBTSxJQUFJLFlBQVksSUFBSSxZQUFZLENBQUMsTUFBTSxHQUFHLENBQUMsSUFBSSxHQUFHLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO2dCQUNqSCxNQUFNLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsQ0FBQztnQkFDL0MsT0FBTztZQUNSLENBQUM7WUFFRCxNQUFNLElBQUksR0FBRyxhQUFhLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ3hDLE1BQU0sZ0JBQWdCLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3hDLENBQUM7S0FDRCxDQUFDLENBQUM7SUFFSCxlQUFlLENBQUMsTUFBTSx5QkFBMEIsU0FBUSxPQUFPO1FBQzlEO1lBQ0MsS0FBSyxDQUFDO2dCQUNMLEVBQUUsRUFBRSwyQ0FBMkM7Z0JBQy9DLEtBQUssRUFBRSxTQUFTLENBQUMsZ0NBQWdDLEVBQUUsa0JBQWtCLENBQUM7Z0JBQ3RFLEVBQUUsRUFBRSxLQUFLO2dCQUNULFFBQVEsRUFBRSxhQUFhO2dCQUN2QixJQUFJLEVBQUU7b0JBQ0wsRUFBRSxFQUFFLE1BQU0sQ0FBQyxXQUFXO29CQUN0QixLQUFLLEVBQUUsTUFBTTtvQkFDYixJQUFJLEVBQUUsZUFBZSxDQUFDLGtCQUFrQjtpQkFDeEM7YUFDRCxDQUFDLENBQUM7UUFDSixDQUFDO1FBRUQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQixFQUFFLEdBQUcsSUFBZTtZQUN2RCxNQUFNLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQztZQUMzRCxNQUFNLGdCQUFnQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsQ0FBQztZQUV6RCxNQUFNLE1BQU0sR0FBRyxpQkFBaUIsQ0FBQyxpQkFBaUIsQ0FBQztZQUNuRCxJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUE2QixDQUFDO1lBQy9DLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztnQkFDM0IsSUFBSSxHQUFHLE1BQU0sRUFBRSxRQUFRLEVBQUUsQ0FBQztnQkFDMUIsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO29CQUNYLE9BQU87Z0JBQ1IsQ0FBQztZQUNGLENBQUM7WUFFRCxtRUFBbUU7WUFDbkUsSUFBSSxlQUFlLEdBQWdCLElBQUksQ0FBQztZQUV4Qyw0RkFBNEY7WUFDNUYsTUFBTSxhQUFhLEdBQUcsR0FBRyxDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFDN0MsTUFBTSxlQUFlLEdBQUcsR0FBRyxDQUFDLGVBQWUsRUFBRSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQzdELElBQUksTUFBTSxJQUFJLGVBQWUsSUFBSSxlQUFlLENBQUMsVUFBVSxHQUFHLENBQUMsSUFBSSxHQUFHLENBQUMsVUFBVSxDQUFDLGFBQWEsRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztnQkFDbEgsTUFBTSxLQUFLLEdBQUcsZUFBZSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDNUMsZUFBZSxHQUFHLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQztnQkFFaEQsOENBQThDO2dCQUM5QyxJQUFJLGVBQWUsQ0FBQyxRQUFRLEtBQUssSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO29CQUNqRCxlQUFlLEdBQUcsZUFBZSxDQUFDLGFBQWEsQ0FBQztnQkFDakQsQ0FBQztZQUNGLENBQUM7WUFFRCwwREFBMEQ7WUFDMUQsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO2dCQUN0QixnREFBZ0Q7Z0JBQ2hELGVBQWUsR0FBRyxhQUFhLEVBQUUsYUFBYSxDQUFDLElBQUksdUJBQXVCLEVBQUUsQ0FBQyxJQUFJLElBQUksQ0FBQztZQUN2RixDQUFDO1lBRUQsdURBQXVEO1lBQ3ZELE1BQU0sWUFBWSxHQUFHLEdBQUcsQ0FBQyxhQUFhLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsSUFBSSx1QkFBdUIsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUN4SCxNQUFNLFdBQVcsR0FBRyxZQUFZLEVBQUUsWUFBWSxDQUFDLGdDQUFnQyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ3ZGLElBQUksV0FBVyxFQUFFLENBQUM7Z0JBQ2pCLE1BQU0sZ0JBQWdCLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQy9DLENBQUM7UUFDRixDQUFDO0tBQ0QsQ0FBQyxDQUFDO0FBQ0osQ0FBQyJ9