/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { createManageTodoListToolData } from '../../../common/tools/manageTodoListTool.js';
suite('ManageTodoListTool Description Field Setting', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function getSchemaProperties(toolData) {
        assert.ok(toolData.inputSchema);
        // eslint-disable-next-line local/code-no-any-casts
        const schema = toolData.inputSchema;
        const properties = schema?.properties?.todoList?.items?.properties;
        const required = schema?.properties?.todoList?.items?.required;
        assert.ok(properties, 'Schema properties should be defined');
        assert.ok(required, 'Schema required fields should be defined');
        return { properties, required };
    }
    test('createManageTodoListToolData should include description field when enabled', () => {
        const toolData = createManageTodoListToolData(false, true);
        const { properties, required } = getSchemaProperties(toolData);
        assert.strictEqual('description' in properties, true);
        assert.strictEqual(required.includes('description'), true);
        assert.deepStrictEqual(required, ['id', 'title', 'description', 'status']);
    });
    test('createManageTodoListToolData should exclude description field when disabled', () => {
        const toolData = createManageTodoListToolData(false, false);
        const { properties, required } = getSchemaProperties(toolData);
        assert.strictEqual('description' in properties, false);
        assert.strictEqual(required.includes('description'), false);
        assert.deepStrictEqual(required, ['id', 'title', 'status']);
    });
    test('createManageTodoListToolData should use default value for includeDescription', () => {
        const toolDataDefault = createManageTodoListToolData(false);
        const { properties, required } = getSchemaProperties(toolDataDefault);
        // Default should be true (includes description)
        assert.strictEqual('description' in properties, true);
        assert.strictEqual(required.includes('description'), true);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFuYWdlVG9kb0xpc3RUb29sLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL3BvcmlkaGkvZGV2ZWxvcG1lbnQvcHVrdS12cy1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L3Rlc3QvY29tbW9uL3Rvb2xzL21hbmFnZVRvZG9MaXN0VG9vbC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUN0RyxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUczRixLQUFLLENBQUMsOENBQThDLEVBQUUsR0FBRyxFQUFFO0lBQzFELHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsU0FBUyxtQkFBbUIsQ0FBQyxRQUFtQjtRQUMvQyxNQUFNLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUNoQyxtREFBbUQ7UUFDbkQsTUFBTSxNQUFNLEdBQUcsUUFBUSxDQUFDLFdBQWtCLENBQUM7UUFDM0MsTUFBTSxVQUFVLEdBQUcsTUFBTSxFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLFVBQVUsQ0FBQztRQUNuRSxNQUFNLFFBQVEsR0FBRyxNQUFNLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDO1FBRS9ELE1BQU0sQ0FBQyxFQUFFLENBQUMsVUFBVSxFQUFFLHFDQUFxQyxDQUFDLENBQUM7UUFDN0QsTUFBTSxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsMENBQTBDLENBQUMsQ0FBQztRQUVoRSxPQUFPLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBRSxDQUFDO0lBQ2pDLENBQUM7SUFFRCxJQUFJLENBQUMsNEVBQTRFLEVBQUUsR0FBRyxFQUFFO1FBQ3ZGLE1BQU0sUUFBUSxHQUFHLDRCQUE0QixDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztRQUMzRCxNQUFNLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBRSxHQUFHLG1CQUFtQixDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBRS9ELE1BQU0sQ0FBQyxXQUFXLENBQUMsYUFBYSxJQUFJLFVBQVUsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUN0RCxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDM0QsTUFBTSxDQUFDLGVBQWUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDO0lBQzVFLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDZFQUE2RSxFQUFFLEdBQUcsRUFBRTtRQUN4RixNQUFNLFFBQVEsR0FBRyw0QkFBNEIsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDNUQsTUFBTSxFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUUsR0FBRyxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUUvRCxNQUFNLENBQUMsV0FBVyxDQUFDLGFBQWEsSUFBSSxVQUFVLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDdkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQzVELE1BQU0sQ0FBQyxlQUFlLENBQUMsUUFBUSxFQUFFLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDO0lBQzdELENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDhFQUE4RSxFQUFFLEdBQUcsRUFBRTtRQUN6RixNQUFNLGVBQWUsR0FBRyw0QkFBNEIsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUM1RCxNQUFNLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBRSxHQUFHLG1CQUFtQixDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBRXRFLGdEQUFnRDtRQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFDLGFBQWEsSUFBSSxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDdEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzVELENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMifQ==