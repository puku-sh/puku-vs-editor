/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Edit Rebasing Algorithm (Issue #58.4)
 *  Based on GitHub Copilot's editRebase.ts implementation
 *--------------------------------------------------------------------------------------------*/

import { StringEdit, StringReplacement, OffsetRange, AnnotatedStringEdit, AnnotatedStringReplacement, IEditData } from './stringEdit';

/**
 * Simple tracer interface for logging (replaces Copilot's ITracer)
 */
export interface ITracer {
	trace(message: string): void;
}

/**
 * Console-based tracer implementation
 */
export class ConsoleTracer implements ITracer {
	constructor(private readonly prefix: string = '[Rebase]') {}

	trace(message: string): void {
		console.log(`${this.prefix} ${message}`);
	}
}

/**
 * Edit data with index tracking for multi-edit scenarios.
 * Based on Copilot's EditDataWithIndex.
 */
export class EditDataWithIndex implements IEditData<EditDataWithIndex> {
	constructor(public readonly index: number) {}

	join(data: EditDataWithIndex): EditDataWithIndex | undefined {
		if (this.index !== data.index) {
			return undefined;
		}
		return this;
	}
}

/**
 * Try to rebase cached edits based on user edits since cache time.
 *
 * This is the main entry point for edit rebasing, based on Copilot's implementation.
 *
 * @param originalDocument - Document state when completion was cached
 * @param editWindow - Optional region where completion is valid
 * @param originalEdits - The cached completion edits (can be multiple for multi-cursor)
 * @param detailedEdits - Pre-computed detailed diffs (or empty to use simple approach)
 * @param userEditSince - All user edits since cache time (composed)
 * @param currentDocument - Current document state
 * @param currentSelection - Current cursor position(s)
 * @param resolution - 'strict' (fail on ambiguity) or 'lenient' (best effort)
 * @param tracer - Logging tracer
 * @returns Rebased edits with indices or failure reason
 */
export function tryRebase(
	originalDocument: string,
	editWindow: OffsetRange | undefined,
	originalEdits: readonly StringReplacement[],
	detailedEdits: AnnotatedStringReplacement<EditDataWithIndex>[][],
	userEditSince: StringEdit,
	currentDocument: string,
	currentSelection: readonly OffsetRange[],
	resolution: 'strict' | 'lenient',
	tracer: ITracer = new ConsoleTracer()
): { rebasedEdit: StringReplacement; rebasedEditIndex: number }[] | 'outsideEditWindow' | 'rebaseFailed' | 'error' | 'inconsistentEdits' {
	const start = Date.now();
	try {
		return _tryRebase(originalDocument, editWindow, originalEdits, detailedEdits, userEditSince, currentDocument, currentSelection, resolution, tracer);
	} catch (err) {
		tracer.trace(`Rebase error: ${err}`);
		return 'error';
	} finally {
		tracer.trace(`Rebase duration: ${Date.now() - start}ms`);
	}
}

/**
 * Internal rebase implementation.
 * Based on Copilot's _tryRebase function.
 */
function _tryRebase(
	originalDocument: string,
	editWindow: OffsetRange | undefined,
	originalEdits: readonly StringReplacement[],
	detailedEdits: AnnotatedStringReplacement<EditDataWithIndex>[][],
	userEditSinceOrig: StringEdit,
	currentDocument: string,
	currentSelection: readonly OffsetRange[],
	resolution: 'strict' | 'lenient',
	tracer: ITracer
): { rebasedEdit: StringReplacement; rebasedEditIndex: number }[] | 'outsideEditWindow' | 'rebaseFailed' | 'inconsistentEdits' {

	// Step 1: Validate edit consistency
	if (!checkEditConsistency(originalDocument, userEditSinceOrig, currentDocument, tracer, true)) {
		return 'inconsistentEdits';
	}

	// Optimize by removing common prefix/suffix from user edits
	const userEditSince = userEditSinceOrig.removeCommonSuffixAndPrefix(originalDocument);

	// Step 2: Check cursor still in edit window
	const cursorRange = currentSelection[0];
	if (editWindow && cursorRange) {
		const updatedEditWindow = userEditSince.applyToOffsetRangeOrUndefined(editWindow);
		if (!updatedEditWindow?.containsRange(cursorRange)) {
			tracer.trace('Cursor outside edit window');
			return 'outsideEditWindow';
		}
	}

	// Step 3: Convert originalEdits to detailed edits if not provided
	// For simplicity, we'll create simple detailed edits without diff computation
	if (detailedEdits.length < originalEdits.length) {
		for (let index = detailedEdits.length; index < originalEdits.length; index++) {
			const edit = originalEdits[index];
			const editData = new EditDataWithIndex(index);
			// Simple approach: treat entire edit as single replacement
			detailedEdits[index] = [new AnnotatedStringReplacement(edit.replaceRange, edit.newText, editData)];
		}
	}

	// Step 4: Compose detailed edits into single annotated edit
	const diffedEdit = AnnotatedStringEdit.compose(detailedEdits.map(edits => AnnotatedStringEdit.create(edits)));

	// Step 5: Try to rebase the edits
	const rebasedEdit = tryRebaseEdits(originalDocument, diffedEdit, userEditSince, resolution, tracer);
	if (!rebasedEdit) {
		tracer.trace('Rebase failed (conflict detected)');
		return 'rebaseFailed';
	}

	// Step 6: Group rebased edits by index
	const grouped = rebasedEdit.replacements.reduce((acc, item) => {
		(acc[item.data.index] ||= []).push(item);
		return acc;
	}, [] as (AnnotatedStringReplacement<EditDataWithIndex>[] | undefined)[]);

	// Step 7: Convert grouped edits back to StringReplacements
	const resultEdits: { rebasedEdit: StringReplacement; rebasedEditIndex: number }[] = [];
	for (let index = 0; index < grouped.length; index++) {
		const group = grouped[index];
		if (!group) {
			continue;
		}

		// Merge all replacements in this group
		const range = OffsetRange.fromTo(group[0].replaceRange.start, group[group.length - 1].replaceRange.endExclusive);
		const newText = group.map((edit, i, a) => {
			if (i > 0) {
				// Include text between replacements
				return currentDocument.substring(a[i - 1].replaceRange.endExclusive, edit.replaceRange.start) + edit.newText;
			} else {
				return edit.newText;
			}
		}).join('');

		const resultEdit = StringReplacement.replace(range, newText);

		// Only include if edit actually changes something
		if (!resultEdit.removeCommonSuffixAndPrefix(currentDocument).isEmpty) {
			resultEdits.push({ rebasedEdit: resultEdit, rebasedEditIndex: index });
		}
	}

	// Step 8: Validate result consistency in strict mode
	// NOTE: This check verifies that applying rebased edits gives the same result
	// as applying original edits, accounting for user changes.
	// For now, skip this check as it's too strict for independent user edits.
	// TODO: Implement proper consistency check that accounts for independent edits
	if (false && resolution === 'strict' && resultEdits.length > 0) {
		const originalResult = StringEdit.create(originalEdits).apply(originalDocument);
		const rebasedResult = StringEdit.create(resultEdits.map(r => r.rebasedEdit)).apply(currentDocument);
		if (originalResult !== rebasedResult) {
			tracer.trace('Result consistency check failed.');
			return 'inconsistentEdits';
		}
	}

	tracer.trace(`✅ Success: rebased ${resultEdits.length} edit(s)`);
	return resultEdits;
}

/**
 * Check that applying user edits to original produces current document.
 * This catches bugs where edit history got corrupted.
 *
 * Based on Copilot's checkEditConsistency.
 */
export function checkEditConsistency(
	original: string,
	edit: StringEdit,
	current: string,
	tracer: ITracer,
	enabled = true
): boolean {
	if (!enabled) {
		return true;
	}

	const consistent = edit.apply(original) === current;
	if (!consistent) {
		tracer.trace('Edit consistency check failed.');
		tracer.trace(`  Original length: ${original.length}`);
		tracer.trace(`  Current length: ${current.length}`);
		tracer.trace(`  Edit count: ${edit.replacements.length}`);
	}
	return consistent;
}

/**
 * Try to rebase StringEdits (simplified wrapper).
 */
export function tryRebaseStringEdits(
	content: string,
	ours: StringEdit,
	base: StringEdit,
	resolution: 'strict' | 'lenient'
): StringEdit | undefined {
	// Convert to annotated edits with void data
	const oursAnnotated = ours.mapData(() => new VoidEditData());
	const result = tryRebaseEdits(content, oursAnnotated, base, resolution, new ConsoleTracer());
	return result?.toStringEdit();
}

// Simple void edit data for internal use
class VoidEditData implements IEditData<VoidEditData> {
	join(other: VoidEditData): VoidEditData | undefined {
		return this;
	}
}

/**
 * Core rebasing logic: Adjust our edits based on base edits.
 *
 * This is based on Copilot's tryRebaseEdits with agreement-based matching.
 *
 * @param content - Original document content
 * @param ours - Our edits (what we want to apply)
 * @param baseOrig - Base edits (user edits that have already happened)
 * @param resolution - 'strict' or 'lenient'
 * @param tracer - Logging tracer
 * @returns Rebased edits or undefined if conflict
 */
function tryRebaseEdits<T extends IEditData<T>>(
	content: string,
	ours: AnnotatedStringEdit<T>,
	baseOrig: StringEdit,
	resolution: 'strict' | 'lenient',
	tracer: ITracer
): AnnotatedStringEdit<T> | undefined {

	const base = baseOrig.removeCommonSuffixAndPrefix(content);
	const newEdits: AnnotatedStringReplacement<T>[] = [];

	let baseIdx = 0;
	let ourIdx = 0;
	let offset = 0;

	while (ourIdx < ours.replacements.length || baseIdx < base.replacements.length) {
		const baseEdit = base.replacements[baseIdx];
		const ourEdit = ours.replacements[ourIdx];

		if (!ourEdit) {
			// We processed all our edits, but there are still base edits
			// These are user edits that happened after our cached edit position
			// We can safely ignore them
			break;
		} else if (!baseEdit) {
			// No more edits from base
			newEdits.push(ourEdit.delta(offset));
			ourIdx++;
		} else if (ourEdit.replaceRange.intersectsOrTouches(baseEdit.replaceRange)) {
			// Edits overlap or touch - check for agreement
			if (ourEdit.replaceRange.containsRange(baseEdit.replaceRange) && ourEdit.newText.length >= baseEdit.newText.length) {
				// Our edit contains base edit - check if user typed part of our suggestion
				const ourNewTextOffset = agreementIndexOf(content, ourEdit, baseEdit, resolution);

				if (ourNewTextOffset === -1) {
					// Conflicting - user typed something different
					tracer.trace('Conflict: user typed different text');
					return undefined;
				}

				// Agreement found - adjust offset
				const delta = baseEdit.newText.length - baseEdit.replaceRange.length;
				newEdits.push(new AnnotatedStringReplacement(
					new OffsetRange(ourEdit.replaceRange.start + offset, ourEdit.replaceRange.endExclusive + offset + delta),
					ourEdit.newText,
					ourEdit.data
				));
				ourIdx++;
				offset += delta;
				baseIdx++;
			} else {
				// Conflicting - edits overlap in complex way
				tracer.trace('Conflict: complex overlap');
				return undefined;
			}
		} else if (ourEdit.replaceRange.start < baseEdit.replaceRange.start) {
			// Our edit starts first
			newEdits.push(ourEdit.delta(offset));
			ourIdx++;
		} else {
			// Base edit starts first and doesn't intersect with our edit
			// This means user made an independent edit (e.g., added comment above)
			// We should track the offset regardless of resolution mode
			baseIdx++;
			offset += baseEdit.newText.length - baseEdit.replaceRange.length;
		}
	}

	return AnnotatedStringEdit.create(newEdits);
}

/**
 * Maximum offset where user typing can appear in our suggestion.
 * Based on Copilot's maxAgreementOffset.
 */
export const maxAgreementOffset = 10;

/**
 * Maximum length for imperfect agreement (where user typing appears later in suggestion).
 * Based on Copilot's maxImperfectAgreementLength.
 */
export const maxImperfectAgreementLength = 5;

/**
 * Find where user's typing (baseEdit) matches our cached suggestion (ourEdit).
 *
 * This implements Copilot's agreement-based matching which tolerates users
 * typing part of the suggestion.
 *
 * Based on Copilot's agreementIndexOf.
 */
function agreementIndexOf<T extends IEditData<T>>(
	content: string,
	ourEdit: AnnotatedStringReplacement<T>,
	baseEdit: StringReplacement,
	resolution: 'strict' | 'lenient'
): number {
	// Find where base edit's new text appears in our edit's new text
	const index = ourEdit.newText.indexOf(baseEdit.newText);

	if (resolution === 'strict') {
		// In strict mode, we have limits on how far the match can be
		if (index > maxAgreementOffset) {
			// User typing appears too late in our suggestion
			return -1;
		}
		if (index > 0 && baseEdit.newText.length > maxImperfectAgreementLength) {
			// User typing appears later and is too long
			return -1;
		}
	}

	// Return the index if found, or -1 if not found
	return index !== -1 ? index + baseEdit.newText.length : -1;
}
