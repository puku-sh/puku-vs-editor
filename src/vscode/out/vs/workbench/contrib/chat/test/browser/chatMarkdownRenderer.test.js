/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { assertSnapshot } from '../../../../../base/test/common/snapshot.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { ChatContentMarkdownRenderer } from '../../browser/chatContentMarkdownRenderer.js';
import { workbenchInstantiationService } from '../../../../test/browser/workbenchTestServices.js';
suite('ChatMarkdownRenderer', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let testRenderer;
    setup(() => {
        const instantiationService = store.add(workbenchInstantiationService(undefined, store));
        testRenderer = instantiationService.createInstance(ChatContentMarkdownRenderer);
    });
    test('simple', async () => {
        const md = new MarkdownString('a');
        const result = store.add(testRenderer.render(md));
        await assertSnapshot(result.element.textContent);
    });
    test('supportHtml with one-line markdown', async () => {
        const md = new MarkdownString('**hello**');
        md.supportHtml = true;
        const result = store.add(testRenderer.render(md));
        await assertSnapshot(result.element.outerHTML);
        const md2 = new MarkdownString('1. [_hello_](https://example.com) test **text**');
        md2.supportHtml = true;
        const result2 = store.add(testRenderer.render(md2));
        await assertSnapshot(result2.element.outerHTML);
    });
    test('invalid HTML', async () => {
        const md = new MarkdownString('1<canvas>2<details>3</details></canvas>4');
        md.supportHtml = true;
        const result = store.add(testRenderer.render(md));
        await assertSnapshot(result.element.outerHTML);
    });
    test('invalid HTML with attributes', async () => {
        const md = new MarkdownString('1<details id="id1" style="display: none">2<details id="my id 2">3</details></details>4');
        md.supportHtml = true;
        const result = store.add(testRenderer.render(md));
        await assertSnapshot(result.element.outerHTML);
    });
    test('valid HTML', async () => {
        const md = new MarkdownString(`
<h1>heading</h1>
<ul>
	<li>1</li>
	<li><b>hi</b></li>
</ul>
<pre><code>code here</code></pre>`);
        md.supportHtml = true;
        const result = store.add(testRenderer.render(md));
        await assertSnapshot(result.element.outerHTML);
    });
    test('mixed valid and invalid HTML', async () => {
        const md = new MarkdownString(`
<h1>heading</h1>
<details>
<ul>
	<li><span><details><i>1</i></details></span></li>
	<li><b>hi</b></li>
</ul>
</details>
<pre><canvas>canvas here</canvas></pre><details></details>`);
        md.supportHtml = true;
        const result = store.add(testRenderer.render(md));
        await assertSnapshot(result.element.outerHTML);
    });
    test('self-closing elements', async () => {
        {
            const md = new MarkdownString('<area><hr><br><input type="text" value="test">');
            md.supportHtml = true;
            const result = store.add(testRenderer.render(md));
            await assertSnapshot(result.element.outerHTML);
        }
        {
            const md = new MarkdownString('<area><hr><br><input type="checkbox">');
            md.supportHtml = true;
            const result = store.add(testRenderer.render(md));
            await assertSnapshot(result.element.outerHTML);
        }
    });
    test('html comments', async () => {
        const md = new MarkdownString('<!-- comment1 <div></div> --><div>content</div><!-- comment2 -->');
        md.supportHtml = true;
        const result = store.add(testRenderer.render(md));
        await assertSnapshot(result.element.outerHTML);
    });
    test('CDATA', async () => {
        const md = new MarkdownString('<![CDATA[<div>content</div>]]>');
        md.supportHtml = true;
        const result = store.add(testRenderer.render(md));
        await assertSnapshot(result.element.outerHTML);
    });
    test('remote images are disallowed', async () => {
        const md = new MarkdownString('<img src="http://disallowed.com/image.jpg">');
        md.supportHtml = true;
        const result = store.add(testRenderer.render(md));
        await assertSnapshot(result.element.outerHTML);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdE1hcmtkb3duUmVuZGVyZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvcG9yaWRoaS9kZXZlbG9wbWVudC9wdWt1LXZzLWVkaXRvci9zcmMvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvdGVzdC9icm93c2VyL2NoYXRNYXJrZG93blJlbmRlcmVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUM3RSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUMzRixPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUVsRyxLQUFLLENBQUMsc0JBQXNCLEVBQUUsR0FBRyxFQUFFO0lBQ2xDLE1BQU0sS0FBSyxHQUFHLHVDQUF1QyxFQUFFLENBQUM7SUFFeEQsSUFBSSxZQUF5QyxDQUFDO0lBQzlDLEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixNQUFNLG9CQUFvQixHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsNkJBQTZCLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDeEYsWUFBWSxHQUFHLG9CQUFvQixDQUFDLGNBQWMsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO0lBQ2pGLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLFFBQVEsRUFBRSxLQUFLLElBQUksRUFBRTtRQUN6QixNQUFNLEVBQUUsR0FBRyxJQUFJLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNuQyxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNsRCxNQUFNLGNBQWMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ2xELENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLG9DQUFvQyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3JELE1BQU0sRUFBRSxHQUFHLElBQUksY0FBYyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQzNDLEVBQUUsQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDO1FBQ3RCLE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2xELE1BQU0sY0FBYyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7UUFFL0MsTUFBTSxHQUFHLEdBQUcsSUFBSSxjQUFjLENBQUMsaURBQWlELENBQUMsQ0FBQztRQUNsRixHQUFHLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQztRQUN2QixNQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUNwRCxNQUFNLGNBQWMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ2pELENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLGNBQWMsRUFBRSxLQUFLLElBQUksRUFBRTtRQUMvQixNQUFNLEVBQUUsR0FBRyxJQUFJLGNBQWMsQ0FBQywwQ0FBMEMsQ0FBQyxDQUFDO1FBQzFFLEVBQUUsQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDO1FBQ3RCLE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2xELE1BQU0sY0FBYyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDaEQsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsOEJBQThCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDL0MsTUFBTSxFQUFFLEdBQUcsSUFBSSxjQUFjLENBQUMsd0ZBQXdGLENBQUMsQ0FBQztRQUN4SCxFQUFFLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQztRQUN0QixNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNsRCxNQUFNLGNBQWMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ2hELENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLFlBQVksRUFBRSxLQUFLLElBQUksRUFBRTtRQUM3QixNQUFNLEVBQUUsR0FBRyxJQUFJLGNBQWMsQ0FBQzs7Ozs7O2tDQU1FLENBQUMsQ0FBQztRQUNsQyxFQUFFLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQztRQUN0QixNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNsRCxNQUFNLGNBQWMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ2hELENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDhCQUE4QixFQUFFLEtBQUssSUFBSSxFQUFFO1FBQy9DLE1BQU0sRUFBRSxHQUFHLElBQUksY0FBYyxDQUFDOzs7Ozs7OzsyREFRMkIsQ0FBQyxDQUFDO1FBQzNELEVBQUUsQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDO1FBQ3RCLE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2xELE1BQU0sY0FBYyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDaEQsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsdUJBQXVCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDeEMsQ0FBQztZQUNBLE1BQU0sRUFBRSxHQUFHLElBQUksY0FBYyxDQUFDLGdEQUFnRCxDQUFDLENBQUM7WUFDaEYsRUFBRSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUM7WUFDdEIsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDbEQsTUFBTSxjQUFjLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNoRCxDQUFDO1FBQ0QsQ0FBQztZQUNBLE1BQU0sRUFBRSxHQUFHLElBQUksY0FBYyxDQUFDLHVDQUF1QyxDQUFDLENBQUM7WUFDdkUsRUFBRSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUM7WUFDdEIsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDbEQsTUFBTSxjQUFjLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNoRCxDQUFDO0lBQ0YsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsZUFBZSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ2hDLE1BQU0sRUFBRSxHQUFHLElBQUksY0FBYyxDQUFDLGtFQUFrRSxDQUFDLENBQUM7UUFDbEcsRUFBRSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUM7UUFDdEIsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDbEQsTUFBTSxjQUFjLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUNoRCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDeEIsTUFBTSxFQUFFLEdBQUcsSUFBSSxjQUFjLENBQUMsZ0NBQWdDLENBQUMsQ0FBQztRQUNoRSxFQUFFLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQztRQUN0QixNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNsRCxNQUFNLGNBQWMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ2hELENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDhCQUE4QixFQUFFLEtBQUssSUFBSSxFQUFFO1FBQy9DLE1BQU0sRUFBRSxHQUFHLElBQUksY0FBYyxDQUFDLDZDQUE2QyxDQUFDLENBQUM7UUFDN0UsRUFBRSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUM7UUFDdEIsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDbEQsTUFBTSxjQUFjLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUNoRCxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIn0=