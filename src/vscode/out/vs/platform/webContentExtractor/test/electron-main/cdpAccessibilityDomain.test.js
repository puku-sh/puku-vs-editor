/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { URI } from '../../../../base/common/uri.js';
import { convertAXTreeToMarkdown } from '../../electron-main/cdpAccessibilityDomain.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
suite('CDP Accessibility Domain', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const testUri = URI.parse('https://example.com/test');
    function createAXValue(type, value) {
        return { type, value };
    }
    function createAXProperty(name, value, type = 'string') {
        return {
            // eslint-disable-next-line local/code-no-any-casts
            name: name,
            value: createAXValue(type, value)
        };
    }
    test('empty tree returns empty string', () => {
        const result = convertAXTreeToMarkdown(testUri, []);
        assert.strictEqual(result, '');
    });
    //#region Heading Tests
    test('simple heading conversion', () => {
        const nodes = [
            {
                nodeId: 'node1',
                childIds: ['node2'],
                ignored: false,
                role: createAXValue('role', 'heading'),
                name: createAXValue('string', 'Test Heading'),
                properties: [
                    createAXProperty('level', 2, 'integer')
                ]
            },
            {
                nodeId: 'node2',
                childIds: [],
                ignored: false,
                role: createAXValue('role', 'StaticText'),
                name: createAXValue('string', 'Test Heading')
            }
        ];
        const result = convertAXTreeToMarkdown(testUri, nodes);
        assert.strictEqual(result.trim(), '## Test Heading');
    });
    //#endregion
    //#region Paragraph Tests
    test('paragraph with text conversion', () => {
        const nodes = [
            {
                nodeId: 'node1',
                ignored: false,
                role: createAXValue('role', 'paragraph'),
                childIds: ['node2']
            },
            {
                nodeId: 'node2',
                ignored: false,
                role: createAXValue('role', 'StaticText'),
                name: createAXValue('string', 'This is a paragraph of text.')
            }
        ];
        const result = convertAXTreeToMarkdown(testUri, nodes);
        assert.strictEqual(result.trim(), 'This is a paragraph of text.');
    });
    test('really long paragraph should insert newlines at the space before 80 characters', () => {
        const longStr = [
            'This is a paragraph of text. It is really long. Like really really really really',
            'really really really really really really really long. That long.'
        ];
        const nodes = [
            {
                nodeId: 'node2',
                ignored: false,
                role: createAXValue('role', 'StaticText'),
                name: createAXValue('string', longStr.join(' '))
            }
        ];
        const result = convertAXTreeToMarkdown(testUri, nodes);
        assert.strictEqual(result.trim(), longStr.join('\n'));
    });
    //#endregion
    //#region List Tests
    test('list conversion', () => {
        const nodes = [
            {
                nodeId: 'node1',
                ignored: false,
                role: createAXValue('role', 'list'),
                childIds: ['node2', 'node3']
            },
            {
                nodeId: 'node2',
                ignored: false,
                role: createAXValue('role', 'listitem'),
                childIds: ['node4', 'node6']
            },
            {
                nodeId: 'node3',
                ignored: false,
                role: createAXValue('role', 'listitem'),
                childIds: ['node5', 'node7']
            },
            {
                nodeId: 'node4',
                ignored: false,
                role: createAXValue('role', 'ListMarker'),
                name: createAXValue('string', '1. ')
            },
            {
                nodeId: 'node5',
                ignored: false,
                role: createAXValue('role', 'ListMarker'),
                name: createAXValue('string', '2. ')
            },
            {
                nodeId: 'node6',
                ignored: false,
                role: createAXValue('role', 'StaticText'),
                name: createAXValue('string', 'Item 1')
            },
            {
                nodeId: 'node7',
                ignored: false,
                role: createAXValue('role', 'StaticText'),
                name: createAXValue('string', 'Item 2')
            }
        ];
        const result = convertAXTreeToMarkdown(testUri, nodes);
        const expected = `
1. Item 1
2. Item 2

`;
        assert.strictEqual(result, expected);
    });
    test('nested list conversion', () => {
        const nodes = [
            {
                nodeId: 'list1',
                ignored: false,
                role: createAXValue('role', 'list'),
                childIds: ['item1', 'item2']
            },
            {
                nodeId: 'item1',
                ignored: false,
                role: createAXValue('role', 'listitem'),
                childIds: ['marker1', 'text1', 'nestedList'],
                properties: [
                    createAXProperty('level', 1, 'integer')
                ]
            },
            {
                nodeId: 'marker1',
                ignored: false,
                role: createAXValue('role', 'ListMarker'),
                name: createAXValue('string', '- ')
            },
            {
                nodeId: 'text1',
                ignored: false,
                role: createAXValue('role', 'StaticText'),
                name: createAXValue('string', 'Item 1')
            },
            {
                nodeId: 'nestedList',
                ignored: false,
                role: createAXValue('role', 'list'),
                childIds: ['nestedItem']
            },
            {
                nodeId: 'nestedItem',
                ignored: false,
                role: createAXValue('role', 'listitem'),
                childIds: ['nestedMarker', 'nestedText'],
                properties: [
                    createAXProperty('level', 2, 'integer')
                ]
            },
            {
                nodeId: 'nestedMarker',
                ignored: false,
                role: createAXValue('role', 'ListMarker'),
                name: createAXValue('string', '- ')
            },
            {
                nodeId: 'nestedText',
                ignored: false,
                role: createAXValue('role', 'StaticText'),
                name: createAXValue('string', 'Item 1a')
            },
            {
                nodeId: 'item2',
                ignored: false,
                role: createAXValue('role', 'listitem'),
                childIds: ['marker2', 'text2'],
                properties: [
                    createAXProperty('level', 1, 'integer')
                ]
            },
            {
                nodeId: 'marker2',
                ignored: false,
                role: createAXValue('role', 'ListMarker'),
                name: createAXValue('string', '- ')
            },
            {
                nodeId: 'text2',
                ignored: false,
                role: createAXValue('role', 'StaticText'),
                name: createAXValue('string', 'Item 2')
            }
        ];
        const result = convertAXTreeToMarkdown(testUri, nodes);
        const indent = '  ';
        const expected = `
- Item 1
${indent}- Item 1a
- Item 2

`;
        assert.strictEqual(result, expected);
    });
    //#endregion
    //#region Links Tests
    test('links conversion', () => {
        const nodes = [
            {
                nodeId: 'node1',
                ignored: false,
                role: createAXValue('role', 'paragraph'),
                childIds: ['node2']
            },
            {
                nodeId: 'node2',
                ignored: false,
                role: createAXValue('role', 'link'),
                name: createAXValue('string', 'Test Link'),
                properties: [
                    createAXProperty('url', 'https://test.com')
                ]
            }
        ];
        const result = convertAXTreeToMarkdown(testUri, nodes);
        assert.strictEqual(result.trim(), '[Test Link](https://test.com)');
    });
    test('links to same page are not converted to markdown links', () => {
        const pageUri = URI.parse('https://example.com/page');
        const nodes = [
            {
                nodeId: 'link',
                ignored: false,
                role: createAXValue('role', 'link'),
                name: createAXValue('string', 'Current page link'),
                properties: [createAXProperty('url', 'https://example.com/page?section=1#header')]
            }
        ];
        const result = convertAXTreeToMarkdown(pageUri, nodes);
        assert.strictEqual(result.includes('Current page link'), true);
        assert.strictEqual(result.includes('[Current page link]'), false);
    });
    //#endregion
    //#region Image Tests
    test('image conversion', () => {
        const nodes = [
            {
                nodeId: 'node1',
                ignored: false,
                role: createAXValue('role', 'image'),
                name: createAXValue('string', 'Alt text'),
                properties: [
                    createAXProperty('url', 'https://test.com/image.png')
                ]
            }
        ];
        const result = convertAXTreeToMarkdown(testUri, nodes);
        assert.strictEqual(result.trim(), '![Alt text](https://test.com/image.png)');
    });
    test('image without URL shows alt text', () => {
        const nodes = [
            {
                nodeId: 'node1',
                ignored: false,
                role: createAXValue('role', 'image'),
                name: createAXValue('string', 'Alt text')
            }
        ];
        const result = convertAXTreeToMarkdown(testUri, nodes);
        assert.strictEqual(result.trim(), '[Image: Alt text]');
    });
    //#endregion
    //#region Description List Tests
    test('description list conversion', () => {
        const nodes = [
            {
                nodeId: 'dl',
                ignored: false,
                role: createAXValue('role', 'DescriptionList'),
                childIds: ['term1', 'def1', 'term2', 'def2']
            },
            {
                nodeId: 'term1',
                ignored: false,
                role: createAXValue('role', 'term'),
                childIds: ['termText1']
            },
            {
                nodeId: 'termText1',
                ignored: false,
                role: createAXValue('role', 'StaticText'),
                name: createAXValue('string', 'Term 1')
            },
            {
                nodeId: 'def1',
                ignored: false,
                role: createAXValue('role', 'definition'),
                childIds: ['defText1']
            },
            {
                nodeId: 'defText1',
                ignored: false,
                role: createAXValue('role', 'StaticText'),
                name: createAXValue('string', 'Definition 1')
            },
            {
                nodeId: 'term2',
                ignored: false,
                role: createAXValue('role', 'term'),
                childIds: ['termText2']
            },
            {
                nodeId: 'termText2',
                ignored: false,
                role: createAXValue('role', 'StaticText'),
                name: createAXValue('string', 'Term 2')
            },
            {
                nodeId: 'def2',
                ignored: false,
                role: createAXValue('role', 'definition'),
                childIds: ['defText2']
            },
            {
                nodeId: 'defText2',
                ignored: false,
                role: createAXValue('role', 'StaticText'),
                name: createAXValue('string', 'Definition 2')
            }
        ];
        const result = convertAXTreeToMarkdown(testUri, nodes);
        assert.strictEqual(result.includes('- **Term 1** Definition 1'), true);
        assert.strictEqual(result.includes('- **Term 2** Definition 2'), true);
    });
    //#endregion
    //#region Blockquote Tests
    test('blockquote conversion', () => {
        const nodes = [
            {
                nodeId: 'node1',
                ignored: false,
                role: createAXValue('role', 'blockquote'),
                name: createAXValue('string', 'This is a blockquote\nWith multiple lines')
            }
        ];
        const result = convertAXTreeToMarkdown(testUri, nodes);
        const expected = `> This is a blockquote
> With multiple lines`;
        assert.strictEqual(result.trim(), expected);
    });
    //#endregion
    //#region Code Tests
    test('preformatted text conversion', () => {
        const nodes = [
            {
                nodeId: 'node1',
                ignored: false,
                role: createAXValue('role', 'pre'),
                name: createAXValue('string', 'function test() {\n  return true;\n}')
            }
        ];
        const result = convertAXTreeToMarkdown(testUri, nodes);
        const expected = '```\nfunction test() {\n  return true;\n}\n```';
        assert.strictEqual(result.trim(), expected);
    });
    test('code block conversion', () => {
        const nodes = [
            {
                nodeId: 'code',
                ignored: false,
                role: createAXValue('role', 'code'),
                childIds: ['codeText']
            },
            {
                nodeId: 'codeText',
                ignored: false,
                role: createAXValue('role', 'StaticText'),
                name: createAXValue('string', 'const x = 42;\nconsole.log(x);')
            }
        ];
        const result = convertAXTreeToMarkdown(testUri, nodes);
        assert.strictEqual(result.includes('```'), true);
        assert.strictEqual(result.includes('const x = 42;'), true);
        assert.strictEqual(result.includes('console.log(x);'), true);
    });
    test('inline code conversion', () => {
        const nodes = [
            {
                nodeId: 'code',
                ignored: false,
                role: createAXValue('role', 'code'),
                childIds: ['codeText']
            },
            {
                nodeId: 'codeText',
                ignored: false,
                role: createAXValue('role', 'StaticText'),
                name: createAXValue('string', 'const x = 42;')
            }
        ];
        const result = convertAXTreeToMarkdown(testUri, nodes);
        assert.strictEqual(result.includes('`const x = 42;`'), true);
    });
    //#endregion
    //#region Table Tests
    test('table conversion', () => {
        const nodes = [
            {
                nodeId: 'table1',
                ignored: false,
                role: createAXValue('role', 'table'),
                childIds: ['row1', 'row2']
            },
            {
                nodeId: 'row1',
                ignored: false,
                role: createAXValue('role', 'row'),
                childIds: ['cell1', 'cell2']
            },
            {
                nodeId: 'row2',
                ignored: false,
                role: createAXValue('role', 'row'),
                childIds: ['cell3', 'cell4']
            },
            {
                nodeId: 'cell1',
                ignored: false,
                role: createAXValue('role', 'cell'),
                name: createAXValue('string', 'Header 1')
            },
            {
                nodeId: 'cell2',
                ignored: false,
                role: createAXValue('role', 'cell'),
                name: createAXValue('string', 'Header 2')
            },
            {
                nodeId: 'cell3',
                ignored: false,
                role: createAXValue('role', 'cell'),
                name: createAXValue('string', 'Data 1')
            },
            {
                nodeId: 'cell4',
                ignored: false,
                role: createAXValue('role', 'cell'),
                name: createAXValue('string', 'Data 2')
            }
        ];
        const result = convertAXTreeToMarkdown(testUri, nodes);
        const expected = `
| Header 1 | Header 2 |
| --- | --- |
| Data 1 | Data 2 |
`;
        assert.strictEqual(result.trim(), expected.trim());
    });
    test('table with columnheader role (th elements)', () => {
        const nodes = [
            {
                nodeId: 'table1',
                ignored: false,
                role: createAXValue('role', 'table'),
                childIds: ['row1', 'row2']
            },
            {
                nodeId: 'row1',
                ignored: false,
                role: createAXValue('role', 'row'),
                childIds: ['header1', 'header2']
            },
            {
                nodeId: 'row2',
                ignored: false,
                role: createAXValue('role', 'row'),
                childIds: ['cell3', 'cell4']
            },
            {
                nodeId: 'header1',
                ignored: false,
                role: createAXValue('role', 'columnheader'),
                name: createAXValue('string', 'Header 1')
            },
            {
                nodeId: 'header2',
                ignored: false,
                role: createAXValue('role', 'columnheader'),
                name: createAXValue('string', 'Header 2')
            },
            {
                nodeId: 'cell3',
                ignored: false,
                role: createAXValue('role', 'cell'),
                name: createAXValue('string', 'Data 1')
            },
            {
                nodeId: 'cell4',
                ignored: false,
                role: createAXValue('role', 'cell'),
                name: createAXValue('string', 'Data 2')
            }
        ];
        const result = convertAXTreeToMarkdown(testUri, nodes);
        const expected = `
| Header 1 | Header 2 |
| --- | --- |
| Data 1 | Data 2 |
`;
        assert.strictEqual(result.trim(), expected.trim());
    });
    test('table with rowheader role', () => {
        const nodes = [
            {
                nodeId: 'table1',
                ignored: false,
                role: createAXValue('role', 'table'),
                childIds: ['row1', 'row2']
            },
            {
                nodeId: 'row1',
                ignored: false,
                role: createAXValue('role', 'row'),
                childIds: ['rowheader1', 'cell2']
            },
            {
                nodeId: 'row2',
                ignored: false,
                role: createAXValue('role', 'row'),
                childIds: ['rowheader2', 'cell4']
            },
            {
                nodeId: 'rowheader1',
                ignored: false,
                role: createAXValue('role', 'rowheader'),
                name: createAXValue('string', 'Row 1')
            },
            {
                nodeId: 'cell2',
                ignored: false,
                role: createAXValue('role', 'cell'),
                name: createAXValue('string', 'Data 1')
            },
            {
                nodeId: 'rowheader2',
                ignored: false,
                role: createAXValue('role', 'rowheader'),
                name: createAXValue('string', 'Row 2')
            },
            {
                nodeId: 'cell4',
                ignored: false,
                role: createAXValue('role', 'cell'),
                name: createAXValue('string', 'Data 2')
            }
        ];
        const result = convertAXTreeToMarkdown(testUri, nodes);
        const expected = `
| Row 1 | Data 1 |
| --- | --- |
| Row 2 | Data 2 |
`;
        assert.strictEqual(result.trim(), expected.trim());
    });
    test('table with mixed cell types', () => {
        const nodes = [
            {
                nodeId: 'table1',
                ignored: false,
                role: createAXValue('role', 'table'),
                childIds: ['row1', 'row2', 'row3']
            },
            {
                nodeId: 'row1',
                ignored: false,
                role: createAXValue('role', 'row'),
                childIds: ['header1', 'header2', 'header3']
            },
            {
                nodeId: 'row2',
                ignored: false,
                role: createAXValue('role', 'row'),
                childIds: ['rowheader1', 'cell2', 'cell3']
            },
            {
                nodeId: 'row3',
                ignored: false,
                role: createAXValue('role', 'row'),
                childIds: ['rowheader2', 'cell4', 'cell5']
            },
            {
                nodeId: 'header1',
                ignored: false,
                role: createAXValue('role', 'columnheader'),
                name: createAXValue('string', 'Name')
            },
            {
                nodeId: 'header2',
                ignored: false,
                role: createAXValue('role', 'columnheader'),
                name: createAXValue('string', 'Age')
            },
            {
                nodeId: 'header3',
                ignored: false,
                role: createAXValue('role', 'columnheader'),
                name: createAXValue('string', 'City')
            },
            {
                nodeId: 'rowheader1',
                ignored: false,
                role: createAXValue('role', 'rowheader'),
                name: createAXValue('string', 'John')
            },
            {
                nodeId: 'cell2',
                ignored: false,
                role: createAXValue('role', 'cell'),
                name: createAXValue('string', '25')
            },
            {
                nodeId: 'cell3',
                ignored: false,
                role: createAXValue('role', 'cell'),
                name: createAXValue('string', 'NYC')
            },
            {
                nodeId: 'rowheader2',
                ignored: false,
                role: createAXValue('role', 'rowheader'),
                name: createAXValue('string', 'Jane')
            },
            {
                nodeId: 'cell4',
                ignored: false,
                role: createAXValue('role', 'cell'),
                name: createAXValue('string', '30')
            },
            {
                nodeId: 'cell5',
                ignored: false,
                role: createAXValue('role', 'cell'),
                name: createAXValue('string', 'LA')
            }
        ];
        const result = convertAXTreeToMarkdown(testUri, nodes);
        const expected = `
| Name | Age | City |
| --- | --- | --- |
| John | 25 | NYC |
| Jane | 30 | LA |
`;
        assert.strictEqual(result.trim(), expected.trim());
    });
    test('table with gridcell role', () => {
        const nodes = [
            {
                nodeId: 'table1',
                ignored: false,
                role: createAXValue('role', 'table'),
                childIds: ['row1', 'row2']
            },
            {
                nodeId: 'row1',
                ignored: false,
                role: createAXValue('role', 'row'),
                childIds: ['cell1', 'cell2']
            },
            {
                nodeId: 'row2',
                ignored: false,
                role: createAXValue('role', 'row'),
                childIds: ['cell3', 'cell4']
            },
            {
                nodeId: 'cell1',
                ignored: false,
                role: createAXValue('role', 'gridcell'),
                name: createAXValue('string', 'Header 1')
            },
            {
                nodeId: 'cell2',
                ignored: false,
                role: createAXValue('role', 'gridcell'),
                name: createAXValue('string', 'Header 2')
            },
            {
                nodeId: 'cell3',
                ignored: false,
                role: createAXValue('role', 'gridcell'),
                name: createAXValue('string', 'Data 1')
            },
            {
                nodeId: 'cell4',
                ignored: false,
                role: createAXValue('role', 'gridcell'),
                name: createAXValue('string', 'Data 2')
            }
        ];
        const result = convertAXTreeToMarkdown(testUri, nodes);
        const expected = `
| Header 1 | Header 2 |
| --- | --- |
| Data 1 | Data 2 |
`;
        assert.strictEqual(result.trim(), expected.trim());
    });
    //#endregion
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2RwQWNjZXNzaWJpbGl0eURvbWFpbi50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FoYW1lZC9EZXNrdG9wL3B1a3UtdnMtZWRpdG9yL3B1a3UtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vd2ViQ29udGVudEV4dHJhY3Rvci90ZXN0L2VsZWN0cm9uLW1haW4vY2RwQWNjZXNzaWJpbGl0eURvbWFpbi50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQ2pDLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQW1DLHVCQUF1QixFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDekgsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFaEcsS0FBSyxDQUFDLDBCQUEwQixFQUFFLEdBQUcsRUFBRTtJQUN0Qyx1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLE1BQU0sT0FBTyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsMEJBQTBCLENBQUMsQ0FBQztJQUV0RCxTQUFTLGFBQWEsQ0FBQyxJQUFpQixFQUFFLEtBQVU7UUFDbkQsT0FBTyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQztJQUN4QixDQUFDO0lBRUQsU0FBUyxnQkFBZ0IsQ0FBQyxJQUFZLEVBQUUsS0FBVSxFQUFFLE9BQW9CLFFBQVE7UUFDL0UsT0FBTztZQUNOLG1EQUFtRDtZQUNuRCxJQUFJLEVBQUUsSUFBVztZQUNqQixLQUFLLEVBQUUsYUFBYSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUM7U0FDakMsQ0FBQztJQUNILENBQUM7SUFFRCxJQUFJLENBQUMsaUNBQWlDLEVBQUUsR0FBRyxFQUFFO1FBQzVDLE1BQU0sTUFBTSxHQUFHLHVCQUF1QixDQUFDLE9BQU8sRUFBRSxFQUFF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