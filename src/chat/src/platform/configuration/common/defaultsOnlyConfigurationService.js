"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultsOnlyConfigurationService = void 0;
const configurationService_1 = require("./configurationService");
/** Provides only the default values, ignoring the user's settings or exp. */
class DefaultsOnlyConfigurationService extends configurationService_1.AbstractConfigurationService {
    getConfig(key) {
        return this.getDefaultValue(key);
    }
    inspectConfig(key, scope) {
        return {
            defaultValue: this.getDefaultValue(key),
        };
    }
    setConfig() {
        return Promise.resolve();
    }
    getNonExtensionConfig(configKey) {
        return undefined;
    }
    getExperimentBasedConfig(key, experimentationService, scope) {
        return this.getDefaultValue(key);
    }
    dumpConfig() {
        return {};
    }
}
exports.DefaultsOnlyConfigurationService = DefaultsOnlyConfigurationService;
//# sourceMappingURL=defaultsOnlyConfigurationService.js.map