/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { fromNow } from '../../../base/common/date.js';
import { isLinuxSnap } from '../../../base/common/platform.js';
import { localize } from '../../../nls.js';
import { process } from '../../../base/parts/sandbox/electron-browser/globals.js';
export function createNativeAboutDialogDetails(productService, osProps) {
    let version = productService.version;
    if (productService.target) {
        version = `${version} (${productService.target} setup)`;
    }
    else if (productService.darwinUniversalAssetId) {
        version = `${version} (Universal)`;
    }
    const getDetails = (useAgo) => {
        return localize(1878, null, version, productService.commit || 'Unknown', productService.date ? `${productService.date}${useAgo ? ' (' + fromNow(new Date(productService.date), true) + ')' : ''}` : 'Unknown', process.versions['electron'], process.versions['microsoft-build'], process.versions['chrome'], process.versions['node'], process.versions['v8'], `${osProps.type} ${osProps.arch} ${osProps.release}${isLinuxSnap ? ' snap' : ''}`);
    };
    const details = getDetails(true);
    const detailsToCopy = getDetails(false);
    return {
        title: productService.nameLong,
        details: details,
        detailsToCopy: detailsToCopy
    };
}
//# sourceMappingURL=dialog.js.map