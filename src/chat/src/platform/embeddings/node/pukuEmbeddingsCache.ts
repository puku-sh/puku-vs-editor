/* eslint-disable header/header */
import { URI } from '../../../util/vs/base/common/uri';
import { Disposable } from '../../../util/vs/base/common/lifecycle';
import { StringSHA1 } from '../../../util/vs/base/common/hash';
import { IFileSystemService } from '../../filesystem/common/fileSystemService';
import { ILogService } from '../../log/common/logService';
import { Embedding, EmbeddingType } from '../common/embeddingsComputer';

interface CacheEntry {
	embedding: number[];
	hash: string;
	timestamp: number;
	embeddingTypeId: string;
}

export class PukuEmbeddingsCache extends Disposable {
	private _cache = new Map<string, CacheEntry>();
	private _cacheFile: URI | undefined;

	constructor(
		private readonly storageUri: URI | undefined,
		@IFileSystemService private readonly _fileSystemService: IFileSystemService,
		@ILogService private readonly _logService: ILogService,
	) {
		super();
		if (storageUri) {
			this._cacheFile = URI.joinPath(storageUri, 'puku-embeddings-cache.json');
		}
	}

	async get(key: string, contentHash: string): Promise<Embedding | undefined> {
		const entry = this._cache.get(key);
		if (entry && entry.hash === contentHash) {
			// Determine embedding type from stored type ID
			let embeddingType: EmbeddingType;
			if (entry.embeddingTypeId === EmbeddingType.voyageCode3_1024.id) {
				embeddingType = EmbeddingType.voyageCode3_1024;
			} else if (entry.embeddingTypeId === EmbeddingType.metis_1024_I16_Binary.id) {
				embeddingType = EmbeddingType.metis_1024_I16_Binary;
			} else {
				embeddingType = EmbeddingType.text3small_512;
			}
			return {
				type: embeddingType,
				value: entry.embedding.slice(0),
			};
		}
		return undefined;
	}

	async set(key: string, contentHash: string, embedding: Embedding): Promise<void> {
		this._cache.set(key, {
			embedding: [...embedding.value],
			hash: contentHash,
			timestamp: Date.now(),
			embeddingTypeId: embedding.type.id,
		});
	}

	/**
	 * Compute a hash for the input content to use as cache key
	 */
	static computeHash(content: string): string {
		const sha = new StringSHA1();
		sha.update(content);
		return sha.digest();
	}

	async persist(): Promise<void> {
		if (!this._cacheFile || !this.storageUri) {
			return;
		}

		try {
			// Ensure directory exists
			try {
				await this._fileSystemService.stat(this.storageUri);
			} catch {
				await this._fileSystemService.createDirectory(this.storageUri);
			}

			// Write cache to disk
			const cacheData = Array.from(this._cache.entries()).map(([key, entry]) => ({
				key,
				embedding: entry.embedding,
				hash: entry.hash,
				timestamp: entry.timestamp,
				embeddingTypeId: entry.embeddingTypeId,
			}));

			await this._fileSystemService.writeFile(
				this._cacheFile,
				Buffer.from(JSON.stringify(cacheData, null, 2))
			);

			this._logService.trace(`PukuEmbeddingsCache: Persisted ${cacheData.length} entries to ${this._cacheFile.fsPath}`);
		} catch (error) {
			this._logService.error('PukuEmbeddingsCache: Failed to persist cache', error);
		}
	}

	async load(): Promise<void> {
		if (!this._cacheFile) {
			return;
		}

		try {
			const fileContent = await this._fileSystemService.readFile(this._cacheFile);
			const cacheData = JSON.parse(fileContent.toString()) as Array<{
				key: string;
				embedding: number[];
				hash: string;
				timestamp: number;
				embeddingTypeId?: string;
			}>;

			this._cache.clear();
			for (const entry of cacheData) {
				this._cache.set(entry.key, {
					embedding: entry.embedding,
					hash: entry.hash,
					timestamp: entry.timestamp,
					embeddingTypeId: entry.embeddingTypeId || EmbeddingType.text3small_512.id, // Default for backward compatibility
				});
			}

			this._logService.trace(`PukuEmbeddingsCache: Loaded ${cacheData.length} entries from ${this._cacheFile.fsPath}`);
		} catch (error) {
			// Cache file doesn't exist or is invalid, start with empty cache
			this._logService.trace('PukuEmbeddingsCache: No existing cache found, starting fresh');
		}
	}

	clear(): void {
		this._cache.clear();
	}

	get size(): number {
		return this._cache.size;
	}
}

