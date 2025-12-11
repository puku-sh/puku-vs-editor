/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Copyright (c) Puku AI. All rights reserved.
 *  String edit utilities for edit rebasing (Issue #58)
 *  Based on microsoft/vscode stringEdit implementation
 *--------------------------------------------------------------------------------------------*/

/**
 * Helper functions from microsoft/vscode strings.ts
 */
function commonPrefixLength(a: string, b: string): number {
	const len = Math.min(a.length, b.length);
	let i: number;

	for (i = 0; i < len; i++) {
		if (a.charCodeAt(i) !== b.charCodeAt(i)) {
			return i;
		}
	}

	return len;
}

function commonSuffixLength(a: string, b: string): number {
	const len = Math.min(a.length, b.length);
	let i: number;

	const aLastIndex = a.length - 1;
	const bLastIndex = b.length - 1;

	for (i = 0; i < len; i++) {
		if (a.charCodeAt(aLastIndex - i) !== b.charCodeAt(bLastIndex - i)) {
			return i;
		}
	}

	return len;
}

/**
 * Represents a character offset range in a string.
 * Range is [start, endExclusive) - start is inclusive, end is exclusive.
 *
 * Based on microsoft/vscode OffsetRange implementation.
 */
export class OffsetRange {
	public static fromTo(start: number, endExclusive: number): OffsetRange {
		return new OffsetRange(start, endExclusive);
	}

	public static tryCreate(start: number, endExclusive: number): OffsetRange | undefined {
		if (start > endExclusive) {
			return undefined;
		}
		return new OffsetRange(start, endExclusive);
	}

	public static ofLength(length: number): OffsetRange {
		return new OffsetRange(0, length);
	}

	public static ofStartAndLength(start: number, length: number): OffsetRange {
		return new OffsetRange(start, start + length);
	}

	public static emptyAt(offset: number): OffsetRange {
		return new OffsetRange(offset, offset);
	}

	constructor(public readonly start: number, public readonly endExclusive: number) {
		if (start > endExclusive) {
			throw new Error(`Invalid range: [${start}, ${endExclusive})`);
		}
	}

	get isEmpty(): boolean {
		return this.start === this.endExclusive;
	}

	public delta(offset: number): OffsetRange {
		return new OffsetRange(this.start + offset, this.endExclusive + offset);
	}

	public deltaStart(offset: number): OffsetRange {
		return new OffsetRange(this.start + offset, this.endExclusive);
	}

	public deltaEnd(offset: number): OffsetRange {
		return new OffsetRange(this.start, this.endExclusive + offset);
	}

	public get length(): number {
		return this.endExclusive - this.start;
	}

	public toString() {
		return `[${this.start}, ${this.endExclusive})`;
	}

	public equals(other: OffsetRange): boolean {
		return this.start === other.start && this.endExclusive === other.endExclusive;
	}

	public containsRange(other: OffsetRange): boolean {
		return this.start <= other.start && other.endExclusive <= this.endExclusive;
	}

	public contains(offset: number): boolean {
		return this.start <= offset && offset < this.endExclusive;
	}

	public join(other: OffsetRange): OffsetRange {
		return new OffsetRange(Math.min(this.start, other.start), Math.max(this.endExclusive, other.endExclusive));
	}

	public intersect(other: OffsetRange): OffsetRange | undefined {
		const start = Math.max(this.start, other.start);
		const end = Math.min(this.endExclusive, other.endExclusive);
		if (start <= end) {
			return new OffsetRange(start, end);
		}
		return undefined;
	}

	public intersects(other: OffsetRange): boolean {
		const start = Math.max(this.start, other.start);
		const end = Math.min(this.endExclusive, other.endExclusive);
		return start < end;
	}

	public intersectsOrTouches(other: OffsetRange): boolean {
		const start = Math.max(this.start, other.start);
		const end = Math.min(this.endExclusive, other.endExclusive);
		return start <= end;
	}

	public isBefore(other: OffsetRange): boolean {
		return this.endExclusive <= other.start;
	}

	public isAfter(other: OffsetRange): boolean {
		return this.start >= other.endExclusive;
	}

	public substring(str: string): string {
		return str.substring(this.start, this.endExclusive);
	}
}

/**
 * Represents replacing text in a range with new text.
 *
 * Based on microsoft/vscode StringReplacement implementation.
 */
export class StringReplacement {
	public static insert(offset: number, text: string): StringReplacement {
		return new StringReplacement(OffsetRange.emptyAt(offset), text);
	}

	public static replace(range: OffsetRange, text: string): StringReplacement {
		return new StringReplacement(range, text);
	}

	public static delete(range: OffsetRange): StringReplacement {
		return new StringReplacement(range, '');
	}

	constructor(
		public readonly replaceRange: OffsetRange,
		public readonly newText: string
	) {}

	get isEmpty(): boolean {
		return this.replaceRange.isEmpty && this.newText.length === 0;
	}

	public delta(offset: number): StringReplacement {
		return new StringReplacement(this.replaceRange.delta(offset), this.newText);
	}

	public apply(text: string): string {
		return text.substring(0, this.replaceRange.start) + this.newText + text.substring(this.replaceRange.endExclusive);
	}

	public equals(other: StringReplacement): boolean {
		return this.replaceRange.equals(other.replaceRange) && this.newText === other.newText;
	}

	public removeCommonSuffixAndPrefix(originalText: string): StringReplacement {
		const oldText = originalText.substring(this.replaceRange.start, this.replaceRange.endExclusive);

		const prefixLen = commonPrefixLength(oldText, this.newText);
		const suffixLen = Math.min(
			oldText.length - prefixLen,
			this.newText.length - prefixLen,
			commonSuffixLength(oldText, this.newText)
		);

		const replaceRange = new OffsetRange(
			this.replaceRange.start + prefixLen,
			this.replaceRange.endExclusive - suffixLen,
		);
		const newText = this.newText.substring(prefixLen, this.newText.length - suffixLen);

		return new StringReplacement(replaceRange, newText);
	}

	public toString(): string {
		return `${this.replaceRange} -> ${JSON.stringify(this.newText)}`;
	}
}

/**
 * Represents a sequence of non-overlapping text replacements.
 * Replacements are stored in order by offset.
 *
 * Based on microsoft/vscode StringEdit implementation.
 */
export class StringEdit {
	public static readonly empty = new StringEdit([]);

	public static create(replacements: readonly StringReplacement[]): StringEdit {
		return new StringEdit(replacements);
	}

	public static single(replacement: StringReplacement): StringEdit {
		return new StringEdit([replacement]);
	}

	public static replace(range: OffsetRange, replacement: string): StringEdit {
		return new StringEdit([new StringReplacement(range, replacement)]);
	}

	public static insert(offset: number, replacement: string): StringEdit {
		return new StringEdit([new StringReplacement(OffsetRange.emptyAt(offset), replacement)]);
	}

	public static delete(range: OffsetRange): StringEdit {
		return new StringEdit([new StringReplacement(range, '')]);
	}

	/**
	 * The replacements are applied in order!
	 * Equals `StringEdit.compose(replacements.map(r => r.toEdit()))`, but is much more performant.
	 *
	 * Based on microsoft/vscode StringEdit.composeSequentialReplacements.
	 */
	public static composeSequentialReplacements(replacements: readonly StringReplacement[]): StringEdit {
		let edit = StringEdit.empty;
		let curEditReplacements: StringReplacement[] = []; // These are reverse sorted

		for (const r of replacements) {
			const last = curEditReplacements.at(-1);
			if (!last || r.replaceRange.isBefore(last.replaceRange)) {
				// Detect subsequences of reverse sorted replacements
				curEditReplacements.push(r);
			} else {
				// Once the subsequence is broken, compose the current replacements and look for a new subsequence.
				edit = edit.compose(StringEdit.create(curEditReplacements.reverse()));
				curEditReplacements = [r];
			}
		}

		edit = edit.compose(StringEdit.create(curEditReplacements.reverse()));
		return edit;
	}

	constructor(public readonly replacements: readonly StringReplacement[]) {
		// Validate non-overlapping and sorted
		let lastEndEx = -1;
		for (const replacement of replacements) {
			if (!(replacement.replaceRange.start >= lastEndEx)) {
				throw new Error('StringEdit replacements must be non-overlapping and sorted');
			}
			lastEndEx = replacement.replaceRange.endExclusive;
		}
	}

	get isEmpty(): boolean {
		return this.replacements.length === 0 || this.replacements.every(r => r.isEmpty);
	}

	public equals(other: StringEdit): boolean {
		if (this.replacements.length !== other.replacements.length) {
			return false;
		}
		for (let i = 0; i < this.replacements.length; i++) {
			if (!this.replacements[i].equals(other.replacements[i])) {
				return false;
			}
		}
		return true;
	}

	public apply(text: string): string {
		const resultText: string[] = [];
		let pos = 0;
		for (const edit of this.replacements) {
			resultText.push(text.substring(pos, edit.replaceRange.start));
			resultText.push(edit.newText);
			pos = edit.replaceRange.endExclusive;
		}
		resultText.push(text.substring(pos));
		return resultText.join('');
	}

	/**
	 * Compose this edit with another edit applied after it.
	 * Returns a new StringEdit representing both edits.
	 *
	 * Invariant: other.apply(this.apply(s0)) = this.compose(other).apply(s0)
	 *
	 * Based on microsoft/vscode BaseEdit.compose implementation.
	 */
	public compose(other: StringEdit): StringEdit {
		const edits1 = this.normalize();
		const edits2 = other.normalize();

		if (edits1.isEmpty) { return edits2; }
		if (edits2.isEmpty) { return edits1; }

		const edit1Queue = [...edits1.replacements];
		const result: StringReplacement[] = [];

		let edit1ToEdit2 = 0;

		for (const r2 of edits2.replacements) {
			// Copy over edit1 unmodified until it touches edit2.
			while (true) {
				const r1 = edit1Queue[0]!;
				if (!r1 || r1.replaceRange.start + edit1ToEdit2 + r1.newText.length >= r2.replaceRange.start) {
					break;
				}
				edit1Queue.shift();

				result.push(r1);
				edit1ToEdit2 += r1.newText.length - r1.replaceRange.length;
			}

			const firstEdit1ToEdit2 = edit1ToEdit2;
			let firstIntersecting: StringReplacement | undefined;
			let lastIntersecting: StringReplacement | undefined;

			while (true) {
				const r1 = edit1Queue[0];
				if (!r1 || r1.replaceRange.start + edit1ToEdit2 > r2.replaceRange.endExclusive) {
					break;
				}

				if (!firstIntersecting) {
					firstIntersecting = r1;
				}
				lastIntersecting = r1;
				edit1Queue.shift();

				edit1ToEdit2 += r1.newText.length - r1.replaceRange.length;
			}

			if (!firstIntersecting) {
				result.push(r2.delta(-edit1ToEdit2));
			} else {
				const start = Math.min(
					firstIntersecting.replaceRange.start,
					r2.replaceRange.start - firstEdit1ToEdit2
				);
				const endEx = Math.max(
					lastIntersecting!.replaceRange.endExclusive,
					r2.replaceRange.endExclusive - edit1ToEdit2
				);

				result.push(new StringReplacement(
					new OffsetRange(start, endEx),
					r2.newText
				));
			}
		}

		// Append remaining edits from edit1
		for (const r1 of edit1Queue) {
			result.push(r1);
		}

		return new StringEdit(result).normalize();
	}

	/**
	 * Normalize the edit by removing empty replacements.
	 */
	public normalize(): StringEdit {
		const newReplacements: StringReplacement[] = [];
		for (const r of this.replacements) {
			if (r.newText.length === 0 && r.replaceRange.length === 0) {
				continue;
			}
			newReplacements.push(r);
		}
		return new StringEdit(newReplacements);
	}

	/**
	 * Try to rebase this edit on top of a base edit.
	 * Returns undefined if rebasing fails due to conflicts.
	 *
	 * Based on microsoft/vscode BaseStringEdit._tryRebase implementation.
	 */
	public tryRebase(base: StringEdit): StringEdit | undefined {
		const newEdits: StringReplacement[] = [];

		let baseIdx = 0;
		let ourIdx = 0;
		let offset = 0;

		while (ourIdx < this.replacements.length || baseIdx < base.replacements.length) {
			const baseEdit = base.replacements[baseIdx];
			const ourEdit = this.replacements[ourIdx];

			if (!ourEdit) {
				// We processed all our edits
				break;
			} else if (!baseEdit) {
				// No more edits from base
				newEdits.push(new StringReplacement(
					ourEdit.replaceRange.delta(offset),
					ourEdit.newText
				));
				ourIdx++;
			} else if (ourEdit.replaceRange.intersectsOrTouches(baseEdit.replaceRange)) {
				// Conflict - skip our edit
				return undefined;
			} else if (ourEdit.replaceRange.start < baseEdit.replaceRange.start) {
				// Our edit starts first
				newEdits.push(new StringReplacement(
					ourEdit.replaceRange.delta(offset),
					ourEdit.newText
				));
				ourIdx++;
			} else {
				baseIdx++;
				offset += baseEdit.newText.length - baseEdit.replaceRange.length;
			}
		}

		return new StringEdit(newEdits);
	}

	/**
	 * Rebase this edit on top of a base edit, skipping conflicting edits.
	 */
	public rebaseSkipConflicting(base: StringEdit): StringEdit {
		const newEdits: StringReplacement[] = [];

		let baseIdx = 0;
		let ourIdx = 0;
		let offset = 0;

		while (ourIdx < this.replacements.length || baseIdx < base.replacements.length) {
			const baseEdit = base.replacements[baseIdx];
			const ourEdit = this.replacements[ourIdx];

			if (!ourEdit) {
				break;
			} else if (!baseEdit) {
				newEdits.push(new StringReplacement(
					ourEdit.replaceRange.delta(offset),
					ourEdit.newText
				));
				ourIdx++;
			} else if (ourEdit.replaceRange.intersectsOrTouches(baseEdit.replaceRange)) {
				// Skip conflicting edit (don't return undefined)
				ourIdx++;
			} else if (ourEdit.replaceRange.start < baseEdit.replaceRange.start) {
				newEdits.push(new StringReplacement(
					ourEdit.replaceRange.delta(offset),
					ourEdit.newText
				));
				ourIdx++;
			} else {
				baseIdx++;
				offset += baseEdit.newText.length - baseEdit.replaceRange.length;
			}
		}

		return new StringEdit(newEdits);
	}

	/**
	 * Remove common prefix/suffix to optimize
	 */
	public removeCommonSuffixAndPrefix(text: string): StringEdit {
		if (this.isEmpty) {
			return this;
		}

		const optimized = this.replacements.map(r => r.removeCommonSuffixAndPrefix(text));
		return new StringEdit(optimized.filter(r => !r.isEmpty));
	}

	public toString(): string {
		return `StringEdit(${this.replacements.length} replacement${this.replacements.length === 1 ? '' : 's'})`;
	}

	/**
	 * Map this StringEdit to an AnnotatedStringEdit with data attached to each replacement.
	 */
	public mapData<T extends IEditData<T>>(createData: (replacement: StringReplacement) => T): AnnotatedStringEdit<T> {
		return new AnnotatedStringEdit(this.replacements.map(r => new AnnotatedStringReplacement(r.replaceRange, r.newText, createData(r))));
	}

	/**
	 * Apply this edit to an offset range to compute its new position.
	 * Returns undefined if the range is invalidated by the edit.
	 *
	 * Example:
	 *   Original range: [10, 20)
	 *   User inserts 5 chars at offset 0
	 *   New range: [15, 25)
	 */
	public applyToOffsetRangeOrUndefined(range: OffsetRange): OffsetRange | undefined {
		let startOffset = 0;
		let endOffset = 0;

		for (const replacement of this.replacements) {
			const delta = replacement.newText.length - replacement.replaceRange.length;

			// Adjust start
			if (replacement.replaceRange.endExclusive <= range.start) {
				// Edit is entirely before range start
				startOffset += delta;
			} else if (replacement.replaceRange.intersects(new OffsetRange(range.start, range.start + 1))) {
				// Edit overlaps range start - range is invalidated
				return undefined;
			}

			// Adjust end
			if (replacement.replaceRange.endExclusive <= range.endExclusive) {
				// Edit is before or at range end
				endOffset += delta;
			} else if (replacement.replaceRange.intersects(new OffsetRange(range.endExclusive - 1, range.endExclusive))) {
				// Edit overlaps range end - range is invalidated
				return undefined;
			}
		}

		return new OffsetRange(
			range.start + startOffset,
			range.endExclusive + endOffset
		);
	}
}

/**
 * Interface for edit metadata that can be attached to StringReplacements.
 * Based on microsoft/vscode IEditData implementation.
 */
export interface IEditData<T> {
	/**
	 * Try to join this data with another.
	 * Returns undefined if they cannot be joined (e.g., from different edits).
	 */
	join(other: T): T | undefined;
}

/**
 * Void edit data for when no metadata is needed.
 */
export class VoidEditData implements IEditData<VoidEditData> {
	join(other: VoidEditData): VoidEditData | undefined {
		return this;
	}
}

/**
 * Annotated string replacement with typed metadata.
 * Based on microsoft/vscode AnnotatedStringReplacement implementation.
 */
export class AnnotatedStringReplacement<T extends IEditData<T>> {
	public static insert<T extends IEditData<T>>(offset: number, text: string, data: T): AnnotatedStringReplacement<T> {
		return new AnnotatedStringReplacement<T>(OffsetRange.emptyAt(offset), text, data);
	}

	public static replace<T extends IEditData<T>>(range: OffsetRange, text: string, data: T): AnnotatedStringReplacement<T> {
		return new AnnotatedStringReplacement<T>(range, text, data);
	}

	public static delete<T extends IEditData<T>>(range: OffsetRange, data: T): AnnotatedStringReplacement<T> {
		return new AnnotatedStringReplacement<T>(range, '', data);
	}

	constructor(
		public readonly replaceRange: OffsetRange,
		public readonly newText: string,
		public readonly data: T
	) {}

	get isEmpty(): boolean {
		return this.replaceRange.isEmpty && this.newText.length === 0;
	}

	public delta(offset: number): AnnotatedStringReplacement<T> {
		return new AnnotatedStringReplacement(this.replaceRange.delta(offset), this.newText, this.data);
	}

	public apply(text: string): string {
		return text.substring(0, this.replaceRange.start) + this.newText + text.substring(this.replaceRange.endExclusive);
	}

	public equals(other: AnnotatedStringReplacement<T>): boolean {
		return this.replaceRange.equals(other.replaceRange) && this.newText === other.newText && this.data === other.data;
	}

	public toString(): string {
		return `${this.replaceRange} -> ${JSON.stringify(this.newText)}`;
	}
}

/**
 * Annotated string edit with typed metadata on each replacement.
 * Based on microsoft/vscode AnnotatedStringEdit implementation.
 */
export class AnnotatedStringEdit<T extends IEditData<T>> {
	public static readonly empty = new AnnotatedStringEdit<VoidEditData>([]);

	public static create<T extends IEditData<T>>(replacements: readonly AnnotatedStringReplacement<T>[]): AnnotatedStringEdit<T> {
		return new AnnotatedStringEdit(replacements);
	}

	public static single<T extends IEditData<T>>(replacement: AnnotatedStringReplacement<T>): AnnotatedStringEdit<T> {
		return new AnnotatedStringEdit([replacement]);
	}

	public static replace<T extends IEditData<T>>(range: OffsetRange, replacement: string, data: T): AnnotatedStringEdit<T> {
		return new AnnotatedStringEdit([new AnnotatedStringReplacement(range, replacement, data)]);
	}

	public static insert<T extends IEditData<T>>(offset: number, replacement: string, data: T): AnnotatedStringEdit<T> {
		return new AnnotatedStringEdit([new AnnotatedStringReplacement(OffsetRange.emptyAt(offset), replacement, data)]);
	}

	public static delete<T extends IEditData<T>>(range: OffsetRange, data: T): AnnotatedStringEdit<T> {
		return new AnnotatedStringEdit([new AnnotatedStringReplacement(range, '', data)]);
	}

	public static compose<T extends IEditData<T>>(edits: readonly AnnotatedStringEdit<T>[]): AnnotatedStringEdit<T> {
		if (edits.length === 0) {
			return AnnotatedStringEdit.empty as AnnotatedStringEdit<T>;
		}
		let result = edits[0];
		for (let i = 1; i < edits.length; i++) {
			result = result.compose(edits[i]);
		}
		return result;
	}

	constructor(public readonly replacements: readonly AnnotatedStringReplacement<T>[]) {
		// Validate non-overlapping and sorted
		let lastEndEx = -1;
		for (const replacement of replacements) {
			if (!(replacement.replaceRange.start >= lastEndEx)) {
				throw new Error('AnnotatedStringEdit replacements must be non-overlapping and sorted');
			}
			lastEndEx = replacement.replaceRange.endExclusive;
		}
	}

	get isEmpty(): boolean {
		return this.replacements.length === 0 || this.replacements.every(r => r.isEmpty);
	}

	public apply(text: string): string {
		const resultText: string[] = [];
		let pos = 0;
		for (const edit of this.replacements) {
			resultText.push(text.substring(pos, edit.replaceRange.start));
			resultText.push(edit.newText);
			pos = edit.replaceRange.endExclusive;
		}
		resultText.push(text.substring(pos));
		return resultText.join('');
	}

	/**
	 * Compose this edit with another edit applied after it.
	 * Simplified version without full Copilot complexity.
	 */
	public compose(other: AnnotatedStringEdit<T>): AnnotatedStringEdit<T> {
		// For now, use a simplified implementation
		// Full Copilot implementation would handle data joining
		const allReplacements: AnnotatedStringReplacement<T>[] = [];

		// This is a simplified merge - production code would need proper composition logic
		let offset = 0;
		for (const r1 of this.replacements) {
			allReplacements.push(r1);
			offset += r1.newText.length - r1.replaceRange.length;
		}

		for (const r2 of other.replacements) {
			allReplacements.push(r2.delta(offset));
		}

		return new AnnotatedStringEdit(allReplacements);
	}

	/**
	 * Convert to plain StringEdit (discarding metadata).
	 */
	public toStringEdit(filter?: (replacement: AnnotatedStringReplacement<T>) => boolean): StringEdit {
		const newReplacements: StringReplacement[] = [];
		for (const r of this.replacements) {
			if (!filter || filter(r)) {
				newReplacements.push(new StringReplacement(r.replaceRange, r.newText));
			}
		}
		return new StringEdit(newReplacements);
	}

	public toString(): string {
		return `AnnotatedStringEdit(${this.replacements.length} replacement${this.replacements.length === 1 ? '' : 's'})`;
	}
}
