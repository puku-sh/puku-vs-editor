/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../base/common/codicons.js';
import { localize } from '../../../../nls.js';
import { registerColor, textLinkForeground } from '../../../../platform/theme/common/colorRegistry.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
export const extensionDefaultIcon = registerIcon('extension-default-icon', Codicon.extensionsLarge, localize(15345, null));
export const verifiedPublisherIcon = registerIcon('extensions-verified-publisher', Codicon.verifiedFilled, localize(15346, null));
export const extensionVerifiedPublisherIconColor = registerColor('extensionIcon.verifiedForeground', textLinkForeground, localize(15347, null), false);
//# sourceMappingURL=extensionsIcons.js.map