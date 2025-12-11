/*---------------------------------------------------------------------------------------------
 *  Puku AI - Response Stream Aggregator
 *  Based on GitHub Copilot's ResponseStream architecture
 *--------------------------------------------------------------------------------------------*/

export interface CompletionChoice {
	text?: string;
	index: number;
	finish_reason: string | null;
	delta?: {
		content?: string;
		role?: string;
	};
}

export interface Completion {
	id?: string;
	object?: string;
	created?: number;
	model?: string;
	choices: CompletionChoice[];
}

/**
 * Aggregates a streaming response into a single completion.
 *
 * Architecture:
 * - Accepts SSE chunks as they arrive
 * - Accumulates text from all chunks
 * - Returns complete Completion object after stream finishes
 */
export class ResponseStream {
	private chunks: Completion[] = [];
	private _complete = false;
	private _error: Error | undefined;

	constructor() {}

	/**
	 * Add a chunk from the SSE stream
	 */
	addChunk(chunk: Completion): void {
		if (this._complete) {
			throw new Error('Cannot add chunks after stream is complete');
		}
		this.chunks.push(chunk);
	}

	/**
	 * Mark stream as complete
	 */
	complete(): void {
		this._complete = true;
	}

	/**
	 * Mark stream as errored
	 */
	error(err: Error): void {
		this._error = err;
		this._complete = true;
	}

	/**
	 * Get the aggregated response
	 * Throws if stream errored
	 */
	getResponse(): Completion {
		if (this._error) {
			throw this._error;
		}

		if (!this._complete) {
			throw new Error('Stream not yet complete');
		}

		return this.aggregateCompletions(this.chunks);
	}

	/**
	 * Aggregate multiple completion chunks into a single completion.
	 * Based on Copilot's aggregateCompletionsStream algorithm.
	 */
	private aggregateCompletions(stream: Completion[]): Completion {
		if (stream.length === 0) {
			throw new Error('Response stream is empty');
		}

		// Aggregate text from all chunks
		const texts: string[] = [];
		let finishReason: string | null = null;

		for (const completion of stream) {
			const choice = completion.choices[0]; // We only support n=1 for streaming

			// Support both `text` (non-streaming) and `delta.content` (streaming)
			if (choice?.text) {
				texts.push(choice.text);
			} else if (choice?.delta?.content) {
				texts.push(choice.delta.content);
			}

			if (choice?.finish_reason) {
				finishReason = choice.finish_reason;
			}
		}

		const aggregatedText = texts.join('');

		// Use metadata from first chunk
		const firstCompletion = stream[0];

		return {
			id: firstCompletion.id,
			object: firstCompletion.object,
			created: firstCompletion.created,
			model: firstCompletion.model,
			choices: [
				{
					text: aggregatedText,
					index: 0,
					finish_reason: finishReason,
				},
			],
		};
	}
}
