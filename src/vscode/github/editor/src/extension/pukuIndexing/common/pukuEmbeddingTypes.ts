/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Copyright (c) Puku AI. All rights reserved.
 *--------------------------------------------------------------------------------------------*/

import { createServiceIdentifier } from '../../../util/common/services';
import { Emitter, Event } from '../../../util/vs/base/common/event';
import { Disposable } from '../../../util/vs/base/common/lifecycle';

/**
 * Embedding model info
 */
export interface PukuEmbeddingModel {
	readonly id: string;
	readonly active: boolean;
	readonly dimensions?: number;
}

export const IPukuEmbeddingTypesService = createServiceIdentifier<IPukuEmbeddingTypesService>('IPukuEmbeddingTypesService');

export interface IPukuEmbeddingTypesService {
	readonly _serviceBrand: undefined;

	/**
	 * Event fired when available models change
	 */
	readonly onDidChangeModels: Event<void>;

	/**
	 * Get all available embedding models
	 */
	getAvailableModels(): Promise<PukuEmbeddingModel[]>;

	/**
	 * Get the preferred/default embedding model
	 */
	getPreferredModel(): Promise<PukuEmbeddingModel | undefined>;

	/**
	 * Refresh the list of available models
	 */
	refresh(): Promise<void>;
}

/**
 * Puku Embedding Types Service - discovers available embedding models from Puku API
 */
export class PukuEmbeddingTypesService extends Disposable implements IPukuEmbeddingTypesService {
	declare readonly _serviceBrand: undefined;

	private readonly _onDidChangeModels = this._register(new Emitter<void>());
	readonly onDidChangeModels = this._onDidChangeModels.event;

	private _models: PukuEmbeddingModel[] = [];
	private _initialized = false;

	private readonly _pukuEndpoint: string;

	constructor(pukuEndpoint: string) {
		super();
		this._pukuEndpoint = pukuEndpoint;
	}

	async getAvailableModels(): Promise<PukuEmbeddingModel[]> {
		if (!this._initialized) {
			await this.refresh();
		}
		return this._models;
	}

	async getPreferredModel(): Promise<PukuEmbeddingModel | undefined> {
		const models = await this.getAvailableModels();
		// Return first active model as preferred
		return models.find(m => m.active) ?? models[0];
	}

	async refresh(): Promise<void> {
		try {
			const response = await fetch(`${this._pukuEndpoint}/puku/v1/models`);
			if (!response.ok) {
				console.error('[PukuEmbeddingTypes] Failed to fetch models:', response.status);
				return;
			}

			const data = await response.json();
			this._models = (data.models || []).map((m: any) => ({
				id: m.id,
				active: m.active ?? true,
				dimensions: m.dimensions,
			}));
			this._initialized = true;
			this._onDidChangeModels.fire();

			console.log('[PukuEmbeddingTypes] Available models:', this._models.map(m => m.id).join(', '));
		} catch (error) {
			console.error('[PukuEmbeddingTypes] Error fetching models:', error);
		}
	}
}
