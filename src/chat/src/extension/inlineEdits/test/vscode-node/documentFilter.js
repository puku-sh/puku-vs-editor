"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const configurationService_1 = require("../../../../platform/configuration/common/configurationService");
const defaultsOnlyConfigurationService_1 = require("../../../../platform/configuration/common/defaultsOnlyConfigurationService");
const inMemoryConfigurationService_1 = require("../../../../platform/configuration/test/common/inMemoryConfigurationService");
const ignoreService_1 = require("../../../../platform/ignore/common/ignoreService");
const uri_1 = require("../../../../util/vs/base/common/uri");
const documentFilter_1 = require("../../vscode-node/parts/documentFilter");
(0, vitest_1.describe)('DocumentFilter', () => {
    const js = 'javascript';
    function createDoc(languageId) {
        return {
            uri: uri_1.URI.parse('file:///foo/bar'),
            languageId,
        };
    }
    let ignoreService;
    (0, vitest_1.beforeAll)(() => {
        ignoreService = ignoreService_1.NullIgnoreService.Instance;
    });
    (0, vitest_1.it)('returns enabled for js by default', async () => {
        const defaultsConfigService = new defaultsOnlyConfigurationService_1.DefaultsOnlyConfigurationService();
        const documentFilter = new documentFilter_1.DocumentFilter(ignoreService, defaultsConfigService);
        const doc = createDoc(js);
        const isEnabled = await documentFilter.isTrackingEnabled(doc);
        (0, vitest_1.expect)(isEnabled).toBe(true);
    });
    (0, vitest_1.it)('can react to copilot.enable config changes for off-by-default language id', async () => {
        const defaultsConfigService = new defaultsOnlyConfigurationService_1.DefaultsOnlyConfigurationService();
        const defaultConfig = defaultsConfigService.getConfig(configurationService_1.ConfigKey.Enable);
        const configService = new inMemoryConfigurationService_1.InMemoryConfigurationService(defaultsConfigService);
        const documentFilter = new documentFilter_1.DocumentFilter(ignoreService, configService);
        const doc = createDoc('markdown');
        const isEnabled0 = await documentFilter.isTrackingEnabled(doc);
        (0, vitest_1.expect)(isEnabled0).toBe(false);
        configService.setConfig(configurationService_1.ConfigKey.Enable, {
            ...defaultConfig,
            'markdown': true,
        });
        const isEnabled1 = await documentFilter.isTrackingEnabled(doc);
        (0, vitest_1.expect)(isEnabled1).toBe(true);
    });
    (0, vitest_1.it)('can react to copilot.enable config changes for javascript', async () => {
        const defaultsConfigService = new defaultsOnlyConfigurationService_1.DefaultsOnlyConfigurationService();
        const defaultConfig = defaultsConfigService.getConfig(configurationService_1.ConfigKey.Enable);
        const configService = new inMemoryConfigurationService_1.InMemoryConfigurationService(defaultsConfigService, new Map([
            [configurationService_1.ConfigKey.Enable, {
                    ...defaultConfig,
                    [js]: false,
                }],
        ]));
        const documentFilter = new documentFilter_1.DocumentFilter(ignoreService, configService);
        const doc = createDoc(js);
        const isEnabled0 = await documentFilter.isTrackingEnabled(doc);
        (0, vitest_1.expect)(isEnabled0).toBe(false);
        configService.setConfig(configurationService_1.ConfigKey.Enable, {
            ...defaultConfig,
            [js]: true,
        });
        const isEnabled1 = await documentFilter.isTrackingEnabled(doc);
        (0, vitest_1.expect)(isEnabled1).toBe(true);
    });
});
//# sourceMappingURL=documentFilter.js.map