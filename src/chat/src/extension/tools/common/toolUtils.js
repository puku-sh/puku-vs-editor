"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatUriForFileWidget = formatUriForFileWidget;
const uri_1 = require("../../../util/vs/base/common/uri");
function formatUriForFileWidget(uriOrLocation) {
    const uri = uri_1.URI.isUri(uriOrLocation) ? uriOrLocation : uriOrLocation.uri;
    const rangePart = uri_1.URI.isUri(uriOrLocation) ?
        '' :
        `#${uriOrLocation.range.start.line + 1}-${uriOrLocation.range.end.line + 1}`;
    // Empty link text -> rendered as file widget
    return `[](${uri.toString()}${rangePart})`;
}
//# sourceMappingURL=toolUtils.js.map