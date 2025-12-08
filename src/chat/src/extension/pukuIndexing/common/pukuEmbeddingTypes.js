"use strict";
/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Copyright (c) Puku AI. All rights reserved.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.PukuEmbeddingTypesService = exports.IPukuEmbeddingTypesService = void 0;
const services_1 = require("../../../util/common/services");
const event_1 = require("../../../util/vs/base/common/event");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
exports.IPukuEmbeddingTypesService = (0, services_1.createServiceIdentifier)('IPukuEmbeddingTypesService');
/**
 * Puku Embedding Types Service - discovers available embedding models from Puku API
 */
class PukuEmbeddingTypesService extends lifecycle_1.Disposable {
    constructor(pukuEndpoint) {
        super();
        this._onDidChangeModels = this._register(new event_1.Emitter());
        this.onDidChangeModels = this._onDidChangeModels.event;
        this._models = [];
        this._initialized = false;
        this._pukuEndpoint = pukuEndpoint;
    }
    async getAvailableModels() {
        if (!this._initialized) {
            await this.refresh();
        }
        return this._models;
    }
    async getPreferredModel() {
        const models = await this.getAvailableModels();
        // Return first active model as preferred
        return models.find(m => m.active) ?? models[0];
    }
    async refresh() {
        try {
            const response = await fetch(`${this._pukuEndpoint}/puku/v1/models`);
            if (!response.ok) {
                console.error('[PukuEmbeddingTypes] Failed to fetch models:', response.status);
                return;
            }
            const data = await response.json();
            this._models = (data.models || []).map((m) => ({
                id: m.id,
                active: m.active ?? true,
                dimensions: m.dimensions,
            }));
            this._initialized = true;
            this._onDidChangeModels.fire();
            console.log('[PukuEmbeddingTypes] Available models:', this._models.map(m => m.id).join(', '));
        }
        catch (error) {
            console.error('[PukuEmbeddingTypes] Error fetching models:', error);
        }
    }
}
exports.PukuEmbeddingTypesService = PukuEmbeddingTypesService;
//# sourceMappingURL=pukuEmbeddingTypes.js.map