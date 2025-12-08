"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const vitest_1 = require("vitest");
const configurationService_1 = require("../../../platform/configuration/common/configurationService");
const packagejson_1 = require("../../../platform/env/common/packagejson");
(0, vitest_1.describe)('Configurations', () => {
    (0, vitest_1.it)('package.json configuration contains stable, experimental, preview, and advanced sections', () => {
        const configurationContributions = packagejson_1.packageJson.contributes.configuration;
        // Should have 4 sections
        (0, vitest_1.expect)(configurationContributions, 'package.json should have exactly 4 sections').toHaveLength(4);
        // Should have a stable section
        const stableSection = configurationContributions.find(section => section.id === 'stable');
        const preview = configurationContributions.find(section => section.id === 'preview');
        const experimental = configurationContributions.find(section => section.id === 'experimental');
        const advanced = configurationContributions.find(section => section.id === 'advanced');
        (0, vitest_1.expect)(stableSection, 'stable configuration section is missing').toBeDefined();
        (0, vitest_1.expect)(preview, 'preview configuration section is missing').toBeDefined();
        (0, vitest_1.expect)(experimental, 'experimental configuration section is missing').toBeDefined();
        (0, vitest_1.expect)(advanced, 'advanced configuration section is missing').toBeDefined();
    });
    (0, vitest_1.it)('package.json configuration tags are correct for each section', () => {
        const configurationContributions = packagejson_1.packageJson.contributes.configuration;
        const stableSection = configurationContributions.find(section => section.id === 'stable');
        for (const settingId of Object.keys(stableSection?.properties)) {
            const setting = stableSection.properties[settingId];
            (0, vitest_1.expect)(setting.tags ?? [], settingId).not.toContain('preview');
            (0, vitest_1.expect)(setting.tags ?? [], settingId).not.toContain('experimental');
            (0, vitest_1.expect)(setting.tags ?? [], settingId).not.toContain('advanced');
        }
        const previewSection = configurationContributions.find(section => section.id === 'preview');
        for (const settingId of Object.keys(previewSection?.properties)) {
            const setting = previewSection.properties[settingId];
            (0, vitest_1.expect)(setting.tags ?? [], settingId).toContain('preview');
            (0, vitest_1.expect)(setting.tags ?? [], settingId).not.toContain('experimental');
            (0, vitest_1.expect)(setting.tags ?? [], settingId).not.toContain('advanced');
        }
        const experimentalSection = configurationContributions.find(section => section.id === 'experimental');
        for (const settingId of Object.keys(experimentalSection?.properties)) {
            const setting = experimentalSection.properties[settingId];
            (0, vitest_1.expect)(setting.tags ?? [], settingId).toContain('experimental');
            (0, vitest_1.expect)(setting.tags ?? [], settingId).not.toContain('preview');
            (0, vitest_1.expect)(setting.tags ?? [], settingId).not.toContain('advanced');
        }
        const advancedSection = configurationContributions.find(section => section.id === 'advanced');
        for (const settingId of Object.keys(advancedSection?.properties)) {
            const setting = advancedSection.properties[settingId];
            (0, vitest_1.expect)(setting.tags ?? [], settingId).toContain('advanced');
            (0, vitest_1.expect)(setting.tags ?? [], settingId).not.toContain('preview');
        }
    });
    (0, vitest_1.it)('settings in code should match package.json', () => {
        const configurationsInPackageJson = packagejson_1.packageJson.contributes.configuration.flatMap(section => Object.keys(section.properties));
        const advancedConfigurationsInPackageJson = packagejson_1.packageJson.contributes.configuration.filter(section => section.id === 'advanced').flatMap(section => Object.keys(section.properties));
        const otherConfigurationsInPackageJson = packagejson_1.packageJson.contributes.configuration.filter(section => section.id !== 'advanced').flatMap(section => Object.keys(section.properties));
        // Get keys from code
        const internalKeys = Object.values(configurationService_1.ConfigKey.Internal).map(setting => setting.fullyQualifiedId);
        const sharedKeys = Object.values(configurationService_1.ConfigKey.Shared).map(setting => setting.fullyQualifiedId);
        const advancedPublicKeys = [
            ...Object.values(configurationService_1.ConfigKey.AdvancedExperimental).map(setting => setting.fullyQualifiedId),
            ...Object.values(configurationService_1.ConfigKey.AdvancedExperimentalExperiments).map(setting => setting.fullyQualifiedId)
        ];
        const otherPublicKeys = Object.values(configurationService_1.ConfigKey).filter(key => key !== configurationService_1.ConfigKey.Internal && key !== configurationService_1.ConfigKey.Shared && key !== configurationService_1.ConfigKey.AdvancedExperimental && key !== configurationService_1.ConfigKey.AdvancedExperimentalExperiments).map(setting => setting.fullyQualifiedId);
        const registered = [...otherPublicKeys, ...advancedPublicKeys];
        const unregistered = [...internalKeys, ...sharedKeys];
        // Validate unregistered settings are not in package.json
        unregistered.forEach(key => {
            (0, vitest_1.expect)(configurationsInPackageJson, 'unregistered settings should not be defined in the package.json').not.toContain(key);
        });
        // Validate Internal settings have the correct prefix
        internalKeys.forEach(key => {
            (0, vitest_1.expect)(key, 'Internal settings must start with puku.chat.advanced.').toMatch(/^github\.copilot\.chat\.advanced\./);
        });
        // Validate public settings in code are in package.json
        otherPublicKeys.forEach(key => {
            (0, vitest_1.expect)(otherConfigurationsInPackageJson, 'Setting in code is not defined in the package.json').toContain(key);
        });
        // Validate advanced settings in code are in the advanced section of package.json
        advancedPublicKeys.forEach(key => {
            (0, vitest_1.expect)(key, 'Advanced settings must not start wih puku.chat.advanced.').not.toMatch(/^github\.copilot\.chat\.advanced\./);
            (0, vitest_1.expect)(advancedConfigurationsInPackageJson, `Advanced setting ${key} should be defined in the advanced section of package.json`).toContain(key);
        });
        // Validate settings in package.json are in code
        configurationsInPackageJson.forEach(key => {
            (0, vitest_1.expect)(registered, 'Setting in package.json is not defined in code').toContain(key);
        });
    });
    (0, vitest_1.it)('all localization strings in package.json are present in package.nls.json', async () => {
        // Get all keys from package.nls.json
        const packageJsonPath = path.join(__dirname, '../../../../package.json');
        const packageNlsPath = path.join(__dirname, '../../../../package.nls.json');
        const [packageJsonFileContents, packageNlsFileContents] = await Promise.all([
            fs.promises.readFile(packageJsonPath, 'utf-8'),
            fs.promises.readFile(packageNlsPath, 'utf-8'),
        ]);
        const packageNls = JSON.parse(packageNlsFileContents);
        const nlsKeys = Object.keys(packageNls);
        // Find all %key% references in package.json
        const nlsReferences = Array.from(packageJsonFileContents.matchAll(/"%([^"]+)%"/g)).map(match => match[1]);
        // Validate all references exist in package.nls.json
        const missingKeys = nlsReferences.filter(key => !nlsKeys.includes(key));
        if (missingKeys.length > 0) {
            throw new Error(`Missing localization keys in package.nls.json but present in package.json: ${missingKeys.map(key => `'%${key}%'`).join(', ')}`);
        }
    });
});
//# sourceMappingURL=configurations.spec.js.map