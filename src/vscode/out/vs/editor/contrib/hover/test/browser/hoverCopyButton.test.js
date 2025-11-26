/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/* eslint-disable no-restricted-syntax */
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { HoverCopyButton } from '../../browser/hoverCopyButton.js';
import { TestClipboardService } from '../../../../../platform/clipboard/test/common/testClipboardService.js';
import { NullHoverService } from '../../../../../platform/hover/test/browser/nullHoverService.js';
import { mainWindow } from '../../../../../base/browser/window.js';
suite('Hover Copy Button', () => {
    const disposables = new DisposableStore();
    let clipboardService;
    let hoverService;
    let container;
    setup(() => {
        clipboardService = new TestClipboardService();
        hoverService = NullHoverService;
        container = mainWindow.document.createElement('div');
        mainWindow.document.body.appendChild(container);
    });
    teardown(() => {
        disposables.clear();
        if (container.parentElement) {
            container.parentElement.removeChild(container);
        }
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('should create button element in container', () => {
        disposables.add(new HoverCopyButton(container, () => 'test content', clipboardService, hoverService));
        const buttonElement = container.querySelector('.hover-copy-button');
        assert.ok(buttonElement, 'Button element should be created');
        assert.strictEqual(buttonElement?.getAttribute('role'), 'button');
        assert.strictEqual(buttonElement?.getAttribute('tabindex'), '0');
        assert.strictEqual(buttonElement?.getAttribute('aria-label'), 'Copy');
    });
    test('should add hover-row-with-copy class to container', () => {
        assert.ok(!container.classList.contains('hover-row-with-copy'), 'Container should not have class before button creation');
        disposables.add(new HoverCopyButton(container, () => 'test content', clipboardService, hoverService));
        assert.ok(container.classList.contains('hover-row-with-copy'), 'Container should have hover-row-with-copy class after button creation');
    });
    test('should have copy icon', () => {
        disposables.add(new HoverCopyButton(container, () => 'test content', clipboardService, hoverService));
        const icon = container.querySelector('.codicon-copy');
        assert.ok(icon, 'Copy icon should be present');
    });
    test('should copy content on click', async () => {
        const testContent = 'test content to copy';
        disposables.add(new HoverCopyButton(container, () => testContent, clipboardService, hoverService));
        const buttonElement = container.querySelector('.hover-copy-button');
        assert.ok(buttonElement);
        buttonElement.click();
        const copiedText = await clipboardService.readText();
        assert.strictEqual(copiedText, testContent, 'Content should be copied to clipboard');
    });
    test('should copy content on Enter key', async () => {
        const testContent = 'test content for enter key';
        disposables.add(new HoverCopyButton(container, () => testContent, clipboardService, hoverService));
        const buttonElement = container.querySelector('.hover-copy-button');
        assert.ok(buttonElement);
        // Simulate Enter key press - need to override keyCode for StandardKeyboardEvent
        const keyEvent = new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            bubbles: true
        });
        Object.defineProperty(keyEvent, 'keyCode', { get: () => 13 }); // Enter keyCode
        buttonElement.dispatchEvent(keyEvent);
        const copiedText = await clipboardService.readText();
        assert.strictEqual(copiedText, testContent, 'Content should be copied on Enter key');
    });
    test('should copy content on Space key', async () => {
        const testContent = 'test content for space key';
        disposables.add(new HoverCopyButton(container, () => testContent, clipboardService, hoverService));
        const buttonElement = container.querySelector('.hover-copy-button');
        assert.ok(buttonElement);
        // Simulate Space key press - need to override keyCode for StandardKeyboardEvent
        const keyEvent = new KeyboardEvent('keydown', {
            key: ' ',
            code: 'Space',
            bubbles: true
        });
        Object.defineProperty(keyEvent, 'keyCode', { get: () => 32 }); // Space keyCode
        buttonElement.dispatchEvent(keyEvent);
        const copiedText = await clipboardService.readText();
        assert.strictEqual(copiedText, testContent, 'Content should be copied on Space key');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG92ZXJDb3B5QnV0dG9uLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWhhbWVkL0Rlc2t0b3AvcHVrdS12cy1lZGl0b3IvcHVrdS1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9ob3Zlci90ZXN0L2Jyb3dzZXIvaG92ZXJDb3B5QnV0dG9uLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcseUNBQXlDO0FBRXpDLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDMUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHVFQUF1RSxDQUFDO0FBRTdHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGdFQUFnRSxDQUFDO0FBQ2xHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUVuRSxLQUFLLENBQUMsbUJBQW1CLEVBQUUsR0FBRyxFQUFFO0lBQy9CLE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7SUFDMUMsSUFBSSxnQkFBc0MsQ0FBQztJQUMzQyxJQUFJLFlBQTJCLENBQUM7SUFDaEMsSUFBSSxTQUFzQixDQUFDO0lBRTNCLEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixnQkFBZ0IsR0FBRyxJQUFJLG9CQUFvQixFQUFFLENBQUM7UUFDOUMsWUFBWSxHQUFHLGdCQUFnQixDQUFDO1FBQ2hDLFNBQVMsR0FBRyxVQUFVLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNyRCxVQUFVLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMs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