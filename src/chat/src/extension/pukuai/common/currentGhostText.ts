/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code completion
 *  Adapted from GitHub Copilot's CurrentGhostText implementation
 *--------------------------------------------------------------------------------------------*/

/**
 * Stores the currently shown completion and detects "typing-as-suggested" scenarios.
 *
 * When a user types forward through an existing completion, this class returns the
 * cached completion instantly without triggering an API call, providing a snappy UX.
 *
 * Example:
 * 1. Completion shown: "function calculateTotal(items) { ... }"
 * 2. User types "To" → Instantly returns "tal(items) { ... }" from cache
 * 3. No API call, 0ms delay
 */
export class CurrentGhostText {
	/** The document prefix at the start of the typing-as-suggested flow */
	private prefix?: string;

	/** The prompt suffix at the start of the typing-as-suggested flow */
	private suffix?: string;

	/** The completion text shown to the user */
	private completionText?: string;

	/** The request ID that generated this completion */
	private requestId?: string;

	/**
	 * Stores the current completion being shown to the user.
	 * Should be called when a completion is displayed.
	 */
	setCompletion(prefix: string, suffix: string, completionText: string, requestId: string): void {
		this.prefix = prefix;
		this.suffix = suffix;
		this.completionText = completionText;
		this.requestId = requestId;
	}

	/**
	 * Returns the completion if the user is typing forward through it.
	 * Returns undefined if not typing-as-suggested (falls through to cache or API).
	 */
	getCompletionForTyping(prefix: string, suffix: string): string | undefined {
		const remainingPrefix = this.getRemainingPrefix(prefix, suffix);
		if (remainingPrefix === undefined) {
			return undefined;
		}

		// Check if the completion text matches what the user typed
		if (!this.completionText || !startsWithAndExceeds(this.completionText, remainingPrefix)) {
			return undefined;
		}

		// Return the remaining completion after removing what user typed
		return this.completionText.substring(remainingPrefix.length);
	}

	/**
	 * Checks if the user has fully typed the current completion.
	 * Used to determine if we should prefetch the next completion.
	 */
	hasAcceptedCurrentCompletion(prefix: string, suffix: string): boolean {
		const remainingPrefix = this.getRemainingPrefix(prefix, suffix);
		if (remainingPrefix === undefined) {
			return false;
		}

		// Check if what the user typed exactly matches the completion
		return remainingPrefix === this.completionText;
	}

	/**
	 * Clears the current completion state.
	 * Called when completion is rejected or document changes significantly.
	 */
	clear(): void {
		this.prefix = undefined;
		this.suffix = undefined;
		this.completionText = undefined;
		this.requestId = undefined;
	}

	/**
	 * Returns the remaining prefix after the stored prefix if typing forward.
	 * Returns undefined if not typing-as-suggested.
	 */
	private getRemainingPrefix(prefix: string, suffix: string): string | undefined {
		// Check that there is a current completion
		if (this.prefix === undefined || this.suffix === undefined || !this.completionText) {
			return undefined;
		}

		// Check that the suffix is unchanged (cursor hasn't moved)
		if (this.suffix !== suffix) {
			return undefined;
		}

		// Check that user is typing forward (new prefix starts with old prefix)
		// This excludes backspace, cut, paste, etc.
		if (!prefix.startsWith(this.prefix)) {
			return undefined;
		}

		// Return what the user has typed since the completion was shown
		return prefix.substring(this.prefix.length);
	}
}

/**
 * Returns true if `text` starts with `prefix` and has more characters.
 */
function startsWithAndExceeds(text: string, prefix: string): boolean {
	return text.startsWith(prefix) && text.length > prefix.length;
}
