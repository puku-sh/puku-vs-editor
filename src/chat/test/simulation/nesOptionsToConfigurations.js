"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nesOptionsToConfigurations = nesOptionsToConfigurations;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const configurationService_1 = require("../../src/platform/configuration/common/configurationService");
function nesOptionsToConfigurations(options) {
    const configs = [];
    if (options.nesUrl) {
        configs.push({
            key: configurationService_1.ConfigKey.Internal.InlineEditsXtabProviderUrl,
            value: options.nesUrl,
        });
    }
    if (options.nesApiKey) {
        configs.push({
            key: configurationService_1.ConfigKey.Internal.InlineEditsXtabProviderApiKey,
            value: options.nesApiKey,
        });
    }
    return configs;
}
//# sourceMappingURL=nesOptionsToConfigurations.js.map