/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { stub } from 'sinon';
export function mock() {
    // eslint-disable-next-line local/code-no-any-casts
    return function () { };
}
// Creates an object object that returns sinon mocks for every property. Optionally
// takes base properties.
export const mockObject = () => (properties) => {
    // eslint-disable-next-line local/code-no-any-casts
    return new Proxy({ ...properties }, {
        get(target, key) {
            if (!target.hasOwnProperty(key)) {
                target[key] = stub();
            }
            return target[key];
        },
        set(target, key, value) {
            target[key] = value;
            return true;
        },
    });
};
/**
 * Shortcut for type-safe partials in mocks. A shortcut for `obj as Partial<T> as T`.
 */
export function upcastPartial(partial) {
    return partial;
}
export function upcastDeepPartial(partial) {
    return partial;
}
//# sourceMappingURL=mock.js.map