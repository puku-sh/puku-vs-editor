"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigurationMigrationContribution = exports.Extensions = exports.applicationConfigurationNodeBase = void 0;
/**
 * Heavily lifted from https://github.com/microsoft/vscode/tree/main/src/vs/workbench/common/configuration.ts
 * It is a little simplified and does not handle overrides, but currently we are only migrating experimental configurations
 */
const vscode_1 = require("vscode");
const configurationService_1 = require("../../../platform/configuration/common/configurationService");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const nls_1 = require("../../../util/vs/nls");
exports.applicationConfigurationNodeBase = Object.freeze({
    'id': 'application',
    'order': 100,
    'title': (0, nls_1.localize)('applicationConfigurationTitle', "Application"),
    'type': 'object'
});
exports.Extensions = {
    ConfigurationMigration: 'base.contributions.configuration.migration'
};
class ConfigurationMigrationContribution {
    constructor() {
        this._disposables = new lifecycle_1.DisposableStore();
        this._register(vscode_1.workspace.onDidChangeWorkspaceFolders(async (e) => {
            for (const folder of e.added) {
                await this.migrateConfigurationForFolder(folder, configurationService_1.ConfigurationMigrationRegistry.migrations);
            }
        }));
        this.migrateConfigurations(configurationService_1.ConfigurationMigrationRegistry.migrations);
        this._register(configurationService_1.ConfigurationMigrationRegistry.onDidRegisterConfigurationMigration(migration => this.migrateConfigurations(migration)));
    }
    async migrateConfigurations(migrations) {
        if (vscode_1.window.state.focused) {
            await this.migrateConfigurationForFolder(undefined, migrations);
            for (const folder of vscode_1.workspace.workspaceFolders ?? []) {
                await this.migrateConfigurationForFolder(folder, migrations);
            }
        }
    }
    async migrateConfigurationForFolder(folder, migrations) {
        await Promise.all([migrations.map(migration => this.migrateConfigurationsForFolder(migration, folder?.uri))]);
    }
    async migrateConfigurationsForFolder(migration, resource) {
        const configuration = vscode_1.workspace.getConfiguration(undefined, resource);
        const inspectData = configuration.inspect(migration.key);
        if (!inspectData) {
            return;
        }
        const targetPairs = [
            [inspectData.globalValue, vscode_1.ConfigurationTarget.Global],
            [inspectData.workspaceValue, vscode_1.ConfigurationTarget.Workspace],
        ];
        for (const [inspectValue, target] of targetPairs) {
            if (!inspectValue) {
                continue;
            }
            const migrationValues = [];
            if (inspectValue !== undefined) {
                const keyValuePairs = await this.runMigration(migration, inspectValue);
                for (const keyValuePair of keyValuePairs ?? []) {
                    migrationValues.push(keyValuePair);
                }
            }
            if (migrationValues.length) {
                // apply migrations
                await Promise.allSettled(migrationValues.map(async ([key, value]) => {
                    configuration.update(key, value.value, target);
                }));
            }
        }
    }
    async runMigration(migration, value) {
        const result = await migration.migrateFn(value);
        return Array.isArray(result) ? result : [[migration.key, result]];
    }
    _register(disposable) {
        this._disposables.add(disposable);
    }
    dispose() {
        this._disposables.dispose();
    }
}
exports.ConfigurationMigrationContribution = ConfigurationMigrationContribution;
configurationService_1.ConfigurationMigrationRegistry.registerConfigurationMigrations([{
        key: 'puku.chat.experimental.setupTests.enabled',
        migrateFn: async (value) => {
            return [
                ['puku.chat.setupTests.enabled', { value }],
                ['puku.chat.experimental.setupTests.enabled', { value: undefined }]
            ];
        }
    }]);
configurationService_1.ConfigurationMigrationRegistry.registerConfigurationMigrations([{
        key: 'puku.chat.experimental.codeGeneration.instructions',
        migrateFn: async (value) => {
            return [
                ['puku.chat.codeGeneration.instructions', { value }],
                ['puku.chat.experimental.codeGeneration.instructions', { value: undefined }]
            ];
        }
    }]);
configurationService_1.ConfigurationMigrationRegistry.registerConfigurationMigrations([{
        key: 'puku.chat.experimental.codeGeneration.useInstructionFiles',
        migrateFn: async (value) => {
            return [
                ['puku.chat.codeGeneration.useInstructionFiles', { value }],
                ['puku.chat.experimental.codeGeneration.useInstructionFiles', { value: undefined }]
            ];
        }
    }]);
configurationService_1.ConfigurationMigrationRegistry.registerConfigurationMigrations([{
        key: 'puku.chat.experimental.testGeneration.instructions',
        migrateFn: async (value) => {
            return [
                ['puku.chat.testGeneration.instructions', { value }],
                ['puku.chat.experimental.testGeneration.instructions', { value: undefined }]
            ];
        }
    }]);
configurationService_1.ConfigurationMigrationRegistry.registerConfigurationMigrations([{
        key: 'puku.chat.experimental.generateTests.codeLens',
        migrateFn: async (value) => {
            return [
                ['puku.chat.generateTests.codeLens', { value }],
                ['puku.chat.experimental.generateTests.codeLens', { value: undefined }]
            ];
        }
    }]);
//# sourceMappingURL=configurationMigration.js.map