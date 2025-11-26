/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { timeout } from '../../../../../base/common/async.js';
import severity from '../../../../../base/common/severity.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { RawDebugSession } from '../../browser/rawDebugSession.js';
import { ReplFilter } from '../../browser/replFilter.js';
import { StackFrame, Thread } from '../../common/debugModel.js';
import { RawObjectReplElement, ReplModel } from '../../common/replModel.js';
import { createTestSession } from './callStack.test.js';
import { createMockDebugModel } from './mockDebugModel.js';
import { MockDebugAdapter, MockRawSession } from '../common/mockDebug.js';
suite('Debug - REPL', () => {
    let model;
    let rawSession;
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    const configurationService = new TestConfigurationService({ debug: { console: { collapseIdenticalLines: true } } });
    setup(() => {
        model = createMockDebugModel(disposables);
        rawSession = new MockRawSession();
    });
    test('repl output', () => {
        const session = disposables.add(createTestSession(model));
        const repl = new ReplModel(configurationService);
        repl.appendToRepl(session, { output: 'first line\n', sev: severity.Error });
        repl.appendToRepl(session, { output: 'second line ', sev: severity.Error });
        repl.appendToRepl(session, { output: 'third line ', sev: severity.Error });
        repl.appendToRepl(session, { output: 'fourth line', sev: severity.Error });
        let elements = repl.getReplElements();
        assert.strictEqual(elements.length, 2);
        assert.strictEqual(elements[0].value, 'first line\n');
        assert.strictEqual(elements[0].severity, severity.Error);
        assert.strictEqual(elements[1].value, 'second line third line fourth line');
        assert.strictEqual(elements[1].severity, severity.Error);
        repl.appendToRepl(session, { output: '1', sev: severity.Warning });
        elements = repl.getReplElements();
        assert.strictEqual(elements.length, 3);
        assert.strictEqual(elements[2].value, '1');
        assert.strictEqual(elements[2].severity, severity.Warning);
        const keyValueObject = { 'key1': 2, 'key2': 'value' };
        repl.appendToRepl(session, { output: '', expression: new RawObjectReplElement('fakeid', 'fake', keyValueObject), sev: severity.Info });
        const element = repl.getReplElements()[3];
        assert.strictEqual(element.expression.value, 'Object');
        assert.deepStrictEqual(element.expression.valueObj, keyValueObject);
        repl.removeReplExpressions();
        assert.strictEqual(repl.getReplElements().length, 0);
        repl.appendToRepl(session, { output: '1\n', sev: severity.Info });
        repl.appendToRepl(session, { output: '2', sev: severity.Info });
        repl.appendToRepl(session, { output: '3\n4', sev: severity.Info });
        repl.appendToRepl(session, { output: '5\n', sev: severity.Info });
        repl.appendToRepl(session, { output: '6', sev: severity.Info });
        elements = repl.getReplElements();
        assert.deepStrictEqual(elements.map(e => e.toString()), ['1\n', '23\n', '45\n', '6']);
        repl.removeReplExpressions();
    });
    test('repl output count', () => {
        const session = disposables.add(createTestSession(model));
        const repl = new ReplModel(configurationService);
        repl.appendToRepl(session, { output: 'first line\n', sev: severity.Info });
        repl.appendToRepl(session, { output: 'first line\n', sev: severity.Info });
        repl.appendToRepl(session, { output: 'first line\n', sev: severity.Info });
        repl.appendToRepl(session, { output: 'second line\n', sev: severity.Info });
        repl.appendToRepl(session, { output: 'second line\n', sev: severity.Info });
        repl.appendToRepl(session, { output: 'third line\n', sev: severity.Info });
        const elements = repl.getReplElements();
        assert.deepStrictEqual(elements.map(e => ({ value: e.value, count: e.count })), [
            { value: 'first line\n', count: 3 },
            { value: 'second line\n', count: 2 },
            { value: 'third line\n', count: 1 }
        ]);
    });
    test('repl merging', () => {
        // 'mergeWithParent' should be ignored when there is no parent.
        const parent = disposables.add(createTestSession(model, 'parent', { repl: 'mergeWithParent' }));
        const child1 = disposables.add(createTestSession(model, 'child1', { parentSession: parent, repl: 'separate' }));
        const child2 = disposables.add(createTestSession(model, 'child2', { parentSession: parent, repl: 'mergeWithParent' }));
        const grandChild = disposables.add(createTestSession(model, 'grandChild', { parentSession: child2, repl: 'mergeWithParent' }));
        const child3 = disposables.add(createTestSession(model, 'child3', { parentSession: parent }));
        let parentChanges = 0;
        disposables.add(parent.onDidChangeReplElements(() => ++parentChanges));
        parent.appendToRepl({ output: '1\n', sev: severity.Info });
        assert.strictEqual(parentChanges, 1);
        assert.strictEqual(parent.getReplElements().length, 1);
        assert.strictEqual(child1.getReplElements().length, 0);
        assert.strictEqual(child2.getReplElements().length, 1);
        assert.strictEqual(grandChild.getReplElements().length, 1);
        assert.strictEqual(child3.getReplElements().length, 0);
        grandChild.appendToRepl({ output: '2\n', sev: severity.Info });
        assert.strictEqual(parentChanges, 2);
        assert.strictEqual(parent.getReplElements().length, 2);
        assert.strictEqual(child1.getReplElements().length, 0);
        assert.strictEqual(child2.getReplElements().length, 2);
        assert.strictEqual(grandChild.getReplElements().length, 2);
        assert.strictEqual(child3.getReplElements().length, 0);
        child3.appendToRepl({ output: '3\n', sev: severity.Info });
        assert.strictEqual(parentChanges, 2);
        assert.strictEqual(parent.getReplElements().length, 2);
        assert.strictEqual(child1.getReplElements().length, 0);
        assert.strictEqual(child2.getReplElements().length, 2);
        assert.strictEqual(grandChild.getReplElements().length, 2);
        assert.strictEqual(child3.getReplElements().length, 1);
        child1.appendToRepl({ output: '4\n', sev: severity.Info });
        assert.strictEqual(parentChanges, 2);
        assert.strictEqual(parent.getReplElements().length, 2);
        assert.strictEqual(child1.getReplElements().length, 1);
        assert.strictEqual(child2.getReplElements().length, 2);
        assert.strictEqual(grandChild.getReplElements().length, 2);
        assert.strictEqual(child3.getReplElements().length, 1);
    });
    test('repl expressions', () => {
        const session = disposables.add(createTestSession(model));
        assert.strictEqual(session.getReplElements().length, 0);
        model.addSession(session);
        // eslint-disable-next-line local/code-no-any-casts
        session['raw'] = rawSession;
        const thread = new Thread(session, 'mockthread', 1);
        // eslint-disable-next-line local/code-no-any-casts
        const stackFrame = new StackFrame(thread, 1, undefined, 'app.js', 'normal', { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 10 }, 1, true);
        const replModel = new ReplModel(configurationService);
        replModel.addReplExpression(session, stackFrame, 'myVariable').then();
        replModel.addReplExpression(session, stackFrame, 'myVariable').then();
        replModel.addReplExpression(session, stackFrame, 'myVariable').then();
        assert.strictEqual(replModel.getReplElements().length, 3);
        replModel.getReplElements().forEach(re => {
            assert.strictEqual(re.value, 'myVariable');
        });
        replModel.removeReplExpressions();
        assert.strictEqual(replModel.getReplElements().length, 0);
    });
    test('repl ordering', async () => {
        const session = disposables.add(createTestSession(model));
        model.addSession(session);
        const adapter = new MockDebugAdapter();
        const raw = disposables.add(new RawDebugSession(adapter, undefined, '', '', undefined, undefined, undefined, undefined));
        session.initializeForTest(raw);
        await session.addReplExpression(undefined, 'before.1');
        assert.strictEqual(session.getReplElements().length, 3);
        assert.strictEqual(session.getReplElements()[0].value, 'before.1');
        assert.strictEqual(session.getReplElements()[1].value, 'before.1');
        assert.strictEqual(session.getReplElements()[2].value, '=before.1');
        await session.addReplExpression(undefined, 'after.2');
        await timeout(0);
        assert.strictEqual(session.getReplElements().length, 6);
        assert.strictEqual(session.getReplElements()[3].value, 'after.2');
        assert.strictEqual(session.getReplElements()[4].value, '=after.2');
        assert.strictEqual(session.getReplElements()[5].value, 'after.2');
    });
    test('repl groups', async () => {
        const session = disposables.add(createTestSession(model));
        const repl = new ReplModel(configurationService);
        repl.appendToRepl(session, { output: 'first global line', sev: severity.Info });
        repl.startGroup(session, 'group_1', true);
        repl.appendToRepl(session, { output: 'first line in group', sev: severity.Info });
        repl.appendToRepl(session, { output: 'second line in group', sev: severity.Info });
        const elements = repl.getReplElements();
        assert.strictEqual(elements.length, 2);
        const group = elements[1];
        assert.strictEqual(group.name, 'group_1');
        assert.strictEqual(group.autoExpand, true);
        assert.strictEqual(group.hasChildren, true);
        assert.strictEqual(group.hasEnded, false);
        repl.startGroup(session, 'group_2', false);
        repl.appendToRepl(session, { output: 'first line in subgroup', sev: severity.Info });
        repl.appendToRepl(session, { output: 'second line in subgroup', sev: severity.Info });
        const children = group.getChildren();
        assert.strictEqual(children.length, 3);
        assert.strictEqual(children[0].value, 'first line in group');
        assert.strictEqual(children[1].value, 'second line in group');
        assert.strictEqual(children[2].name, 'group_2');
        assert.strictEqual(children[2].hasEnded, false);
        assert.strictEqual(children[2].getChildren().length, 2);
        repl.endGroup();
        assert.strictEqual(children[2].hasEnded, true);
        repl.appendToRepl(session, { output: 'third line in group', sev: severity.Info });
        assert.strictEqual(group.getChildren().length, 4);
        assert.strictEqual(group.hasEnded, false);
        repl.endGroup();
        assert.strictEqual(group.hasEnded, true);
        repl.appendToRepl(session, { output: 'second global line', sev: severity.Info });
        assert.strictEqual(repl.getReplElements().length, 3);
        assert.strictEqual(repl.getReplElements()[2].value, 'second global line');
    });
    test('repl identical line collapsing - character by character', () => {
        const session = disposables.add(createTestSession(model));
        const repl = new ReplModel(configurationService);
        // Test case 1: Character-by-character output should NOT be collapsed
        // These should print "111\n", not "(3)1"
        repl.appendToRepl(session, { output: '1', sev: severity.Info });
        repl.appendToRepl(session, { output: '1', sev: severity.Info });
        repl.appendToRepl(session, { output: '1', sev: severity.Info });
        repl.appendToRepl(session, { output: '\n', sev: severity.Info });
        let elements = repl.getReplElements();
        // Should be one element with "111\n" value, not collapsed
        assert.strictEqual(elements.length, 1);
        assert.strictEqual(elements[0].value, '111\n');
        assert.strictEqual(elements[0].count, 1);
        repl.removeReplExpressions();
        // Test case 2: Character-by-character with mixed output
        repl.appendToRepl(session, { output: '5', sev: severity.Info });
        repl.appendToRepl(session, { output: '5', sev: severity.Info });
        repl.appendToRepl(session, { output: '\n', sev: severity.Info });
        elements = repl.getReplElements();
        // Should be one element with "55\n" value, not "(2)5"
        assert.strictEqual(elements.length, 1);
        assert.strictEqual(elements[0].value, '55\n');
        assert.strictEqual(elements[0].count, 1);
    });
    test('repl identical line collapsing - single event multiple lines', () => {
        const session = disposables.add(createTestSession(model));
        const repl = new ReplModel(configurationService);
        // Test case: Single event with multiple identical lines should be collapsed
        // This should be collapsed into "(2)hello"
        repl.appendToRepl(session, { output: 'hello\nhello\n', sev: severity.Info });
        const elements = repl.getReplElements();
        // Should be one collapsed element with count 2
        assert.strictEqual(elements.length, 1);
        assert.strictEqual(elements[0].value, 'hello\n');
        assert.strictEqual(elements[0].count, 2);
    });
    test('repl identical line collapsing - mixed scenarios', () => {
        const session = disposables.add(createTestSession(model));
        const repl = new ReplModel(configurationService);
        // Test case: Mix of single events and multi-line events
        repl.appendToRepl(session, { output: 'test\n', sev: severity.Info });
        repl.appendToRepl(session, { output: 'test\ntest\n', sev: severity.Info });
        const elements = repl.getReplElements();
        // Should be one collapsed element with count 3
        assert.strictEqual(elements.length, 1);
        assert.strictEqual(elements[0].value, 'test\n');
        assert.strictEqual(elements[0].count, 3);
    });
    test('repl filter', async () => {
        const session = disposables.add(createTestSession(model));
        const repl = new ReplModel(configurationService);
        const replFilter = new ReplFilter();
        const getFilteredElements = () => {
            const elements = repl.getReplElements();
            return elements.filter((e) => {
                const filterResult = replFilter.filter(e, 1 /* TreeVisibility.Visible */);
                return filterResult === true || filterResult === 1 /* TreeVisibility.Visible */;
            });
        };
        repl.appendToRepl(session, { output: 'first line\n', sev: severity.Info });
        repl.appendToRepl(session, { output: 'second line\n', sev: severity.Info });
        repl.appendToRepl(session, { output: 'third line\n', sev: severity.Info });
        repl.appendToRepl(session, { output: 'fourth line\n', sev: severity.Info });
        replFilter.filterQuery = 'first';
        const r1 = getFilteredElements();
        assert.strictEqual(r1.length, 1);
        assert.strictEqual(r1[0].value, 'first line\n');
        replFilter.filterQuery = '!first';
        const r2 = getFilteredElements();
        assert.strictEqual(r1.length, 1);
        assert.strictEqual(r2[0].value, 'second line\n');
        assert.strictEqual(r2[1].value, 'third line\n');
        assert.strictEqual(r2[2].value, 'fourth line\n');
        replFilter.filterQuery = 'first, line';
        const r3 = getFilteredElements();
        assert.strictEqual(r3.length, 4);
        assert.strictEqual(r3[0].value, 'first line\n');
        assert.strictEqual(r3[1].value, 'second line\n');
        assert.strictEqual(r3[2].value, 'third line\n');
        assert.strictEqual(r3[3].value, 'fourth line\n');
        replFilter.filterQuery = 'line, !second';
        const r4 = getFilteredElements();
        assert.strictEqual(r4.length, 3);
        assert.strictEqual(r4[0].value, 'first line\n');
        assert.strictEqual(r4[1].value, 'third line\n');
        assert.strictEqual(r4[2].value, 'fourth line\n');
        replFilter.filterQuery = '!second, line';
        const r4_same = getFilteredElements();
        assert.strictEqual(r4.length, r4_same.length);
        replFilter.filterQuery = '!line';
        const r5 = getFilteredElements();
        assert.strictEqual(r5.length, 0);
        replFilter.filterQuery = 'smth';
        const r6 = getFilteredElements();
        assert.strictEqual(r6.length, 0);
    });
});
//# sourceMappingURL=repl.test.js.map