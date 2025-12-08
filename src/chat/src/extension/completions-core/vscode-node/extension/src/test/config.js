"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtensionTestConfigProvider = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const config_1 = require("../../../lib/src/config");
const config_2 = require("../config");
/**
 * Provides the default configurations, except lets through the configured value
 * of test-only settings like the proxy override URL.
 */
class ExtensionTestConfigProvider extends config_1.InMemoryConfigProvider {
    constructor() {
        super(new config_1.DefaultsOnlyConfigProvider());
        this.vscConfigProvider = new config_2.VSCodeConfigProvider();
    }
    getConfig(key) {
        if (key === config_1.ConfigKey.DebugTestOverrideProxyUrl) {
            return this.vscConfigProvider.getConfig(key);
        }
        return super.getConfig(key);
    }
}
exports.ExtensionTestConfigProvider = ExtensionTestConfigProvider;
//# sourceMappingURL=config.js.map