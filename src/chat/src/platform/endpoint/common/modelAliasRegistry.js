"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelAliasRegistry = void 0;
class ModelAliasRegistry {
    static { this._instance = new ModelAliasRegistry(); }
    constructor() {
        this._aliasToModelId = new Map();
        this._modelIdToAliases = new Map();
    }
    static _updateAliasesForModelId(modelId) {
        const aliases = [];
        for (const [alias, mappedModelId] of this._instance._aliasToModelId.entries()) {
            if (mappedModelId === modelId) {
                aliases.push(alias);
            }
        }
        if (aliases.length > 0) {
            this._instance._modelIdToAliases.set(modelId, aliases);
        }
        else {
            this._instance._modelIdToAliases.delete(modelId);
        }
    }
    static registerAlias(alias, modelId) {
        this._instance._aliasToModelId.set(alias, modelId);
        this._updateAliasesForModelId(modelId);
    }
    static deregisterAlias(alias) {
        const modelId = this._instance._aliasToModelId.get(alias);
        this._instance._aliasToModelId.delete(alias);
        if (modelId) {
            this._updateAliasesForModelId(modelId);
        }
    }
    static resolveAlias(alias) {
        return this._instance._aliasToModelId.get(alias) ?? alias;
    }
    static getAliases(modelId) {
        return this._instance._modelIdToAliases.get(modelId) ?? [];
    }
}
exports.ModelAliasRegistry = ModelAliasRegistry;
ModelAliasRegistry.registerAlias('copilot-fast', 'gpt-4o-mini');
//# sourceMappingURL=modelAliasRegistry.js.map