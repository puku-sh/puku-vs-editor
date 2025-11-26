/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { MutableDisposable, toDisposable } from '../../../../../../base/common/lifecycle.js';
/**
 * Sets up a recreating start marker which is resilient to prompts that clear/re-render (eg. transient
 * or powerlevel10k style prompts). The marker is recreated at the cursor position whenever the
 * existing marker is disposed. The caller is responsible for adding the startMarker to the store.
 */
export function setupRecreatingStartMarker(xterm, startMarker, fire, store, log) {
    const markerListener = new MutableDisposable();
    const recreateStartMarker = () => {
        if (store.isDisposed) {
            return;
        }
        const marker = xterm.raw.registerMarker();
        startMarker.value = marker ?? undefined;
        fire(marker);
        if (!marker) {
            markerListener.clear();
            return;
        }
        markerListener.value = marker.onDispose(() => {
            log?.('Start marker was disposed, recreating');
            recreateStartMarker();
        });
    };
    recreateStartMarker();
    store.add(toDisposable(() => {
        markerListener.dispose();
        startMarker.clear();
        fire(undefined);
    }));
    store.add(startMarker);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RyYXRlZ3lIZWxwZXJzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FoYW1lZC9EZXNrdG9wL3B1a3UtdnMtZWRpdG9yL3B1a3UtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2NoYXRBZ2VudFRvb2xzL2Jyb3dzZXIvZXhlY3V0ZVN0cmF0ZWd5L3N0cmF0ZWd5SGVscGVycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQW1CLGlCQUFpQixFQUFFLFlBQVksRUFBb0IsTUFBTSw0Q0FBNEMsQ0FBQztBQUdoSTs7OztHQUlHO0FBQ0gsTUFBTSxVQUFVLDBCQUEwQixDQUN6QyxLQUE4RCxFQUM5RCxXQUE0QyxFQUM1QyxJQUFnRCxFQUNoRCxLQUFzQixFQUN0QixHQUErQjtJQUUvQixNQUFNLGNBQWMsR0FBRyxJQUFJLGlCQUFpQixFQUFlLENBQUM7SUFDNUQsTUFBTSxtQkFBbUIsR0FBRyxHQUFHLEVBQUU7UUFDaEMsSUFBSSxLQUFLLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDdEIsT0FBTztRQUNSLENBQUM7UUFDRCxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBQzFDLFdBQVcsQ0FBQyxLQUFLLEdBQUcsTUFBTSxJQUFJLFNBQVMsQ0FBQztRQUN4QyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDYixJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDYixjQUFjLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDdkIsT0FBTztRQUNSLENBQUM7UUFDRCxjQUFjLENBQUMsS0FBSyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFO1lBQzVDLEdBQUcsRUFBRSxDQUFDLHVDQUF1QyxDQUFDLENBQUM7WUFDL0MsbUJBQW1CLEVBQUUsQ0FBQztRQUN2QixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQztJQUNGLG1CQUFtQixFQUFFLENBQUM7SUFDdEIsS0FBSyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFO1FBQzNCLGNBQWMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUN6QixXQUFXLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDcEIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ2pCLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDSixLQUFLLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBQ3hCLENBQUMifQ==