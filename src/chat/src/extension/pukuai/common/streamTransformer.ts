/*---------------------------------------------------------------------------------------------
 *  Puku AI - Stream Transformer Utilities
 *  Based on GitHub Copilot's stream processing
 *--------------------------------------------------------------------------------------------*/

import { Completion } from './responseStream';

/**
 * Parse SSE (Server-Sent Events) stream into lines
 *
 * SSE format:
 *   data: {"choices":[{"text":"hello","index":0}]}
 *   data: {"choices":[{"text":" world","index":0}]}
 *   data: [DONE]
 */
export function parseSSEStream(text: string): string[] {
	const lines: string[] = [];
	const rawLines = text.split('\n');

	for (const line of rawLines) {
		const trimmed = line.trim();

		// Skip empty lines and comments
		if (!trimmed || trimmed.startsWith(':')) {
			continue;
		}

		// Parse SSE format: "data: <json>"
		if (trimmed.startsWith('data:')) {
			const data = trimmed.substring(5).trim();

			// Check for [DONE] signal
			if (data === '[DONE]') {
				continue;
			}

			lines.push(data);
		}
	}

	return lines;
}

/**
 * Parse JSONL (JSON Lines) into Completion objects
 */
export function parseJSONL(jsonlLines: string[]): Completion[] {
	const completions: Completion[] = [];

	for (const line of jsonlLines) {
		try {
			const parsed = JSON.parse(line);

			// Validate it's a completion object
			if (parsed.choices && Array.isArray(parsed.choices)) {
				completions.push(parsed as Completion);
			}
		} catch (err) {
			// Skip invalid JSON lines
			console.warn('[StreamTransformer] Invalid JSON line:', line);
		}
	}

	return completions;
}

/**
 * Combined SSE stream parser
 * Converts raw SSE text → Completion objects
 */
export function streamToCompletions(sseText: string): Completion[] {
	const jsonlLines = parseSSEStream(sseText);
	return parseJSONL(jsonlLines);
}
