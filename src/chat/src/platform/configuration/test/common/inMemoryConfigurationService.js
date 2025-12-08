"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryConfigurationService = void 0;
const configurationService_1 = require("../../common/configurationService");
/**
 * A IConfigurationService that allows overriding of config values.
 */
class InMemoryConfigurationService extends configurationService_1.AbstractConfigurationService {
    constructor(baseConfigurationService, overrides = new Map(), nonExtensionOverrides = new Map()) {
        super();
        this.baseConfigurationService = baseConfigurationService;
        this.overrides = overrides;
        this.nonExtensionOverrides = nonExtensionOverrides;
    }
    getConfig(key) {
        const override = this.overrides.get(key);
        if (override !== undefined) {
            return override;
        }
        return this.baseConfigurationService.getConfig(key);
    }
    inspectConfig(key, scope) {
        const inspect = this.baseConfigurationService.inspectConfig(key, scope);
        const override = this.overrides.get(key);
        if (override !== undefined) {
            return {
                defaultValue: this.getDefaultValue(key),
                globalValue: override
            };
        }
        return inspect;
    }
    getNonExtensionConfig(configKey) {
        return this.nonExtensionOverrides.get(configKey) ?? this.baseConfigurationService.getNonExtensionConfig(configKey);
    }
    setConfig(key, value) {
        this.overrides.set(key, value);
        return Promise.resolve();
    }
    setNonExtensionConfig(key, value) {
        this.nonExtensionOverrides.set(key, value);
        return Promise.resolve();
    }
    getExperimentBasedConfig(key, experimentationService, scope) {
        const override = this.overrides.get(key);
        if (override !== undefined) {
            return override;
        }
        return this.baseConfigurationService.getExperimentBasedConfig(key, experimentationService);
    }
    dumpConfig() {
        const config = this.baseConfigurationService.dumpConfig();
        this.overrides.forEach((value, key) => {
            config[key.id] = JSON.stringify(value);
        });
        return config;
    }
}
exports.InMemoryConfigurationService = InMemoryConfigurationService;
//# sourceMappingURL=inMemoryConfigurationService.js.map