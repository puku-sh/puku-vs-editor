/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { shouldShowHover } from '../../browser/hoverUtils.js';
suite('Hover Utils', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('shouldShowHover', () => {
        function createMockMouseEvent(ctrlKey, altKey, metaKey) {
            return {
                event: {
                    ctrlKey,
                    altKey,
                    metaKey,
                    shiftKey: false,
                }
            };
        }
        test('returns true when enabled is "on"', () => {
            const mouseEvent = createMockMouseEvent(false, false, false);
            const result = shouldShowHover('on', 'altKey', mouseEvent);
            assert.strictEqual(result, true);
        });
        test('returns false when enabled is "off"', () => {
            const mouseEvent = createMockMouseEvent(false, false, false);
            const result = shouldShowHover('off', 'altKey', mouseEvent);
            assert.strictEqual(result, false);
        });
        test('returns true with ctrl pressed when multiCursorModifier is altKey', () => {
            const mouseEvent = createMockMouseEvent(true, false, false);
            const result = shouldShowHover('onKeyboardModifier', 'altKey', mouseEvent);
            assert.strictEqual(result, true);
        });
        test('returns false without ctrl pressed when multiCursorModifier is altKey', () => {
            const mouseEvent = createMockMouseEvent(false, false, false);
            const result = shouldShowHover('onKeyboardModifier', 'altKey', mouseEvent);
            assert.strictEqual(result, false);
        });
        test('returns true with metaKey pressed when multiCursorModifier is altKey', () => {
            const mouseEvent = createMockMouseEvent(false, false, true);
            const result = shouldShowHover('onKeyboardModifier', 'altKey', mouseEvent);
            assert.strictEqual(result, true);
        });
        test('returns true with alt pressed when multiCursorModifier is ctrlKey', () => {
            const mouseEvent = createMockMouseEvent(false, true, false);
            const result = shouldShowHover('onKeyboardModifier', 'ctrlKey', mouseEvent);
            assert.strictEqual(result, true);
        });
        test('returns false without alt pressed when multiCursorModifier is ctrlKey', () => {
            const mouseEvent = createMockMouseEvent(false, false, false);
            const result = shouldShowHover('onKeyboardModifier', 'ctrlKey', mouseEvent);
            assert.strictEqual(result, false);
        });
        test('returns true with alt pressed when multiCursorModifier is metaKey', () => {
            const mouseEvent = createMockMouseEvent(false, true, false);
            const result = shouldShowHover('onKeyboardModifier', 'metaKey', mouseEvent);
            assert.strictEqual(result, true);
        });
        test('ignores alt when multiCursorModifier is altKey', () => {
            const mouseEvent = createMockMouseEvent(false, true, false);
            const result = shouldShowHover('onKeyboardModifier', 'altKey', mouseEvent);
            assert.strictEqual(result, false);
        });
        test('ignores ctrl when multiCursorModifier is ctrlKey', () => {
            const mouseEvent = createMockMouseEvent(true, false, false);
            const result = shouldShowHover('onKeyboardModifier', 'ctrlKey', mouseEvent);
            assert.strictEqual(result, false);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG92ZXJVdGlscy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FoYW1lZC9EZXNrdG9wL3B1a3UtdnMtZWRpdG9yL3B1a3UtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaG92ZXIvdGVzdC9icm93c2VyL2hvdmVyVXRpbHMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBRzlELEtBQUssQ0FBQyxhQUFhLEVBQUUsR0FBRyxFQUFFO0lBRXpCLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsS0FBSyxDQUFDLGlCQUFpQixFQUFFLEdBQUcsRUFBRTtRQUU3QixTQUFTLG9CQUFvQixDQUFDLE9BQWdCLEVBQUUsTUFBZSxFQUFFLE9BQWdCO1lBQ2hGLE9BQU87Z0JBQ04sS0FBSyxFQUFFO29CQUNOLE9BQU87b0JBQ1AsTUFBTTtvQkFDTixPQUFPO29CQUNQLFFBQVEsRUFBRSxLQUFLO2lCQUNmO2FBQ29CLENBQUM7UUFDeEIsQ0FBQztRQUVELElBQUksQ0FBQyxtQ0FBbUMsRUFBRSxHQUFHLEVBQUU7WUFDOUMsTUFBTSxVQUFVLEdBQUcsb0JBQW9CLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztZQUM3RCxNQUFNLE1BQU0sR0FBRyxlQUFlLENBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRSxVQUFVLENBQUMsQ0FBQztZQUMzRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNsQyxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxxQ0FBcUMsRUFBRSxHQUFHLEVBQUU7WUFDaEQsTUFB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