/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../../../base/common/uri.js';
import { MainThreadTestCollection } from '../../common/mainThreadTestCollection.js';
import { TestId } from '../../common/testId.js';
import { createTestItemChildren, TestItemCollection } from '../../common/testItemCollection.js';
export class TestTestItem {
    get tags() {
        return this.props.tags.map(id => ({ id }));
    }
    set tags(value) {
        this.api.listener?.({ op: 1 /* TestItemEventOp.SetTags */, new: value, old: this.props.tags.map(t => ({ id: t })) });
        this.props.tags = value.map(tag => tag.id);
    }
    get canResolveChildren() {
        return this._canResolveChildren;
    }
    set canResolveChildren(value) {
        this._canResolveChildren = value;
        this.api.listener?.({ op: 2 /* TestItemEventOp.UpdateCanResolveChildren */, state: value });
    }
    get parent() {
        return this.api.parent;
    }
    get id() {
        return this._extId.localId;
    }
    constructor(_extId, label, uri) {
        this._extId = _extId;
        this._canResolveChildren = false;
        this.api = { controllerId: this._extId.controllerId };
        this.children = createTestItemChildren(this.api, i => i.api, TestTestItem);
        this.props = {
            extId: _extId.toString(),
            busy: false,
            description: null,
            error: null,
            label,
            range: null,
            sortText: null,
            tags: [],
            uri,
        };
    }
    get(key) {
        return this.props[key];
    }
    set(key, value) {
        this.props[key] = value;
        this.api.listener?.({ op: 4 /* TestItemEventOp.SetProp */, update: { [key]: value } });
    }
    toTestItem() {
        const props = { ...this.props };
        props.extId = this._extId.toString();
        return props;
    }
}
export class TestTestCollection extends TestItemCollection {
    constructor(controllerId = 'ctrlId') {
        const root = new TestTestItem(new TestId([controllerId]), 'root');
        root._isRoot = true;
        super({
            controllerId,
            getApiFor: t => t.api,
            toITestItem: t => t.toTestItem(),
            getChildren: t => t.children,
            getDocumentVersion: () => undefined,
            root,
        });
    }
    get currentDiff() {
        return this.diff;
    }
    setDiff(diff) {
        this.diff = diff;
    }
}
/**
 * Gets a main thread test collection initialized with the given set of
 * roots/stubs.
 */
export const getInitializedMainTestCollection = async (singleUse = testStubs.nested()) => {
    const c = new MainThreadTestCollection({ asCanonicalUri: u => u }, async (t, l) => singleUse.expand(t, l));
    await singleUse.expand(singleUse.root.id, Infinity);
    c.apply(singleUse.collectDiff());
    singleUse.dispose();
    return c;
};
export const makeSimpleStubTree = (ids) => {
    const collection = new TestTestCollection();
    const add = (parent, children, path) => {
        for (const id of Object.keys(children)) {
            const item = new TestTestItem(new TestId([...path, id]), id);
            parent.children.add(item);
            if (children[id]) {
                add(item, children[id], [...path, id]);
            }
        }
    };
    add(collection.root, ids, ['ctrlId']);
    return collection;
};
export const testStubs = {
    nested: (idPrefix = 'id-') => {
        const collection = new TestTestCollection();
        collection.resolveHandler = item => {
            if (item === undefined) {
                const a = new TestTestItem(new TestId(['ctrlId', 'id-a']), 'a', URI.file('/'));
                a.canResolveChildren = true;
                const b = new TestTestItem(new TestId(['ctrlId', 'id-b']), 'b', URI.file('/'));
                collection.root.children.add(a);
                collection.root.children.add(b);
            }
            else if (item.id === idPrefix + 'a') {
                item.children.add(new TestTestItem(new TestId(['ctrlId', 'id-a', 'id-aa']), 'aa', URI.file('/')));
                item.children.add(new TestTestItem(new TestId(['ctrlId', 'id-a', 'id-ab']), 'ab', URI.file('/')));
            }
        };
        return collection;
    },
};
//# sourceMappingURL=testStubs.js.map