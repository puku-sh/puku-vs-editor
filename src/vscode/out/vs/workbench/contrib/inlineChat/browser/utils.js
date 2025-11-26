/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { EditOperation } from '../../../../editor/common/core/editOperation.js';
import { AsyncIterableSource } from '../../../../base/common/async.js';
import { getNWords } from '../../chat/common/chatWordCounter.js';
export async function performAsyncTextEdit(model, edit, progress, obs, editSource) {
    const [id] = model.deltaDecorations([], [{
            range: edit.range,
            options: {
                description: 'asyncTextEdit',
                stickiness: 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */
            }
        }]);
    let first = true;
    for await (const part of edit.newText) {
        if (model.isDisposed()) {
            break;
        }
        const range = model.getDecorationRange(id);
        if (!range) {
            throw new Error('FAILED to perform async replace edit because the anchor decoration was removed');
        }
        const edit = first
            ? EditOperation.replace(range, part) // first edit needs to override the "anchor"
            : EditOperation.insert(range.getEndPosition(), part);
        obs?.start();
        model.pushEditOperations(null, [edit], (undoEdits) => {
            progress?.report(undoEdits);
            return null;
        }, undefined, editSource);
        obs?.stop();
        first = false;
    }
}
export function asProgressiveEdit(interval, edit, wordsPerSec, token) {
    wordsPerSec = Math.max(30, wordsPerSec);
    const stream = new AsyncIterableSource();
    let newText = edit.text ?? '';
    interval.cancelAndSet(() => {
        if (token.isCancellationRequested) {
            return;
        }
        const r = getNWords(newText, 1);
        stream.emitOne(r.value);
        newText = newText.substring(r.value.length);
        if (r.isFullString) {
            interval.cancel();
            stream.resolve();
            d.dispose();
        }
    }, 1000 / wordsPerSec);
    // cancel ASAP
    const d = token.onCancellationRequested(() => {
        interval.cancel();
        stream.resolve();
        d.dispose();
    });
    return {
        range: edit.range,
        newText: stream.asyncIterable
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWhhbWVkL0Rlc2t0b3AvcHVrdS12cy1lZGl0b3IvcHVrdS1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9pbmxpbmVDaGF0L2Jyb3dzZXIvdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBS2hGLE9BQU8sRUFBaUIsbUJBQW1CLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUV0RixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFZakUsTUFBTSxDQUFDLEtBQUssVUFBVSxvQkFBb0IsQ0FBQyxLQUFpQixFQUFFLElBQW1CLEVBQUUsUUFBMkMsRUFBRSxHQUFtQixFQUFFLFVBQWdDO0lBRXBMLE1BQU0sQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDeEMsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLO1lBQ2pCLE9BQU8sRUFBRTtnQkFDUixXQUFXLEVBQUUsZUFBZTtnQkFDNUIsVUFBVSw2REFBcUQ7YUFDL0Q7U0FDRCxDQUFDLENBQUMsQ0FBQztJQUVKLElBQUksS0FBSyxHQUFHLElBQUksQ0FBQztJQUNqQixJQUFJLEtBQUssRUFBRSxNQUFNLElBQUksSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7UUFFdkMsSUFBSSxLQUFLLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQztZQUN4QixNQUFNO1FBQ1AsQ0FBQztRQUVELE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUMzQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDWixNQUFNLElBQUksS0FBSyxDQUFDLGdGQUFnRixDQUFDLENBQUM7UUFDbkcsQ0FBQztRQUVELE1BQU0sSUFBSSxHQUFHLEtBQUs7WUFDakIsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDLDRDQUE0QztZQUNqRixDQUFDLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsY0FBYyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDdEQsR0FBRyxFQUFFLEtBQUssRUFBRSxDQUFDO1FBRWIsS0FBSyxDQUFDLGtCQUFrQixDQUFDLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsU0FBUyxFQUFFLEVBQUU7WUFDcEQsUUFBUSxFQUFFLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUM1QixPQUFPLElBQUksQ0FBQztRQUNiLENBQUMsRUFBRSxTQUFTLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFFMUIsR0FBRyxFQUFFLElBQUksRUFBRSxDQUFDO1FBQ1osS0FBSyxHQUFHLEtBQUssQ0FBQztJQUNmLENBQUM7QUFDRixDQUFDO0FBRUQsTUFBTSxVQUFVLGlCQUFpQixDQUFDLFFBQXVCLEVBQUUsSUFBb0MsRUFBRSxXQUFtQixFQUFFLEtBQXdCO0lBRTdJLFdBQVcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxXQUFXLENBQUMsQ0FBQztJQUV4QyxNQUFNLE1BQU0sR0FBRyxJQUFJLG1CQUFtQixFQUFVLENBQUM7SUFDakQsSUFBSSxPQUFPLEdBQUcsSUFBSSxDQUFDLElBQUksSUFBSSxFQUFFLENBQUM7SUFFOUIsUUFBUSxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUU7UUFDMUIsSUFBSSxLQUFLLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztZQUNuQyxPQUFPO1FBQ1IsQ0FBQztRQUNELE1BQU0sQ0FBQyxHQUFHLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDaEMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDeEIsT0FBTyxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUM1QyxJQUFJLENBQUMsQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUNwQixRQUFRLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDbEIsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2pCLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNiLENBQUM7SUFFRixDQUFDLEVBQUUsSUFBSSxHQUFHLFdBQVcsQ0FBQyxDQUFDO0lBRXZCLGNBQWM7SUFDZCxNQUFNLENBQUMsR0FBRyxLQUFLLENBQUMsdUJBQXVCLENBQUMsR0FBRyxFQUFFO1FBQzVDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUNsQixNQUFNLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDakIsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ2IsQ0FBQyxDQUFDLENBQUM7SUFFSCxPQUFPO1FBQ04sS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLO1FBQ2pCLE9BQU8sRUFBRSxNQUFNLENBQUMsYUFBYTtLQUM3QixDQUFDO0FBQ0gsQ0FBQyJ9