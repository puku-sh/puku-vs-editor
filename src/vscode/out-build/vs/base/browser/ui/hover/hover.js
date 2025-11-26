/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export var HoverStyle;
(function (HoverStyle) {
    /**
     * The hover is anchored below the element with a pointer above it pointing at the target.
     */
    HoverStyle[HoverStyle["Pointer"] = 1] = "Pointer";
    /**
     * The hover is anchored to the bottom right of the cursor's location.
     */
    HoverStyle[HoverStyle["Mouse"] = 2] = "Mouse";
})(HoverStyle || (HoverStyle = {}));
export function isManagedHoverTooltipMarkdownString(obj) {
    const candidate = obj;
    return typeof candidate === 'object' && 'markdown' in candidate && 'markdownNotSupportedFallback' in candidate;
}
export function isManagedHoverTooltipHTMLElement(obj) {
    const candidate = obj;
    return typeof candidate === 'object' && 'element' in candidate;
}
// #endregion Managed hover
//# sourceMappingURL=hover.js.map