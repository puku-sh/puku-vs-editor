/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { memoize } from '../../../../base/common/decorators.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
export class TerminalCapabilityStore extends Disposable {
    constructor() {
        super(...arguments);
        this._map = new Map();
        this._onDidAddCapability = this._register(new Emitter());
        this._onDidRemoveCapability = this._register(new Emitter());
    }
    get onDidAddCapability() { return this._onDidAddCapability.event; }
    get onDidRemoveCapability() { return this._onDidRemoveCapability.event; }
    get onDidChangeCapabilities() {
        return Event.map(Event.any(this._onDidAddCapability.event, this._onDidRemoveCapability.event), () => void 0, this._store);
    }
    get onDidAddCommandDetectionCapability() {
        return Event.map(Event.filter(this.onDidAddCapability, e => e.id === 2 /* TerminalCapability.CommandDetection */, this._store), e => e.capability, this._store);
    }
    get onDidRemoveCommandDetectionCapability() {
        return Event.map(Event.filter(this.onDidRemoveCapability, e => e.id === 2 /* TerminalCapability.CommandDetection */, this._store), () => void 0, this._store);
    }
    get onDidAddCwdDetectionCapability() {
        return Event.map(Event.filter(this.onDidAddCapability, e => e.id === 0 /* TerminalCapability.CwdDetection */, this._store), e => e.capability, this._store);
    }
    get onDidRemoveCwdDetectionCapability() {
        return Event.map(Event.filter(this.onDidRemoveCapability, e => e.id === 0 /* TerminalCapability.CwdDetection */, this._store), () => void 0, this._store);
    }
    get items() {
        return this._map.keys();
    }
    createOnDidRemoveCapabilityOfTypeEvent(type) {
        return Event.map(Event.filter(this.onDidRemoveCapability, e => e.id === type), e => e.capability);
    }
    createOnDidAddCapabilityOfTypeEvent(type) {
        return Event.map(Event.filter(this.onDidAddCapability, e => e.id === type), e => e.capability);
    }
    add(capability, impl) {
        this._map.set(capability, impl);
        this._onDidAddCapability.fire(createCapabilityEvent(capability, impl));
    }
    get(capability) {
        // HACK: This isn't totally safe since the Map key and value are not connected
        return this._map.get(capability);
    }
    remove(capability) {
        const impl = this._map.get(capability);
        if (!impl) {
            return;
        }
        this._map.delete(capability);
        this._onDidRemoveCapability.fire(createCapabilityEvent(capability, impl));
    }
    has(capability) {
        return this._map.has(capability);
    }
}
__decorate([
    memoize
], TerminalCapabilityStore.prototype, "onDidChangeCapabilities", null);
__decorate([
    memoize
], TerminalCapabilityStore.prototype, "onDidAddCommandDetectionCapability", null);
__decorate([
    memoize
], TerminalCapabilityStore.prototype, "onDidRemoveCommandDetectionCapability", null);
__decorate([
    memoize
], TerminalCapabilityStore.prototype, "onDidAddCwdDetectionCapability", null);
__decorate([
    memoize
], TerminalCapabilityStore.prototype, "onDidRemoveCwdDetectionCapability", null);
export class TerminalCapabilityStoreMultiplexer extends Disposable {
    constructor() {
        super(...arguments);
        this._stores = [];
        this._onDidAddCapability = this._register(new Emitter());
        this._onDidRemoveCapability = this._register(new Emitter());
    }
    get onDidAddCapability() { return this._onDidAddCapability.event; }
    get onDidRemoveCapability() { return this._onDidRemoveCapability.event; }
    get onDidChangeCapabilities() {
        return Event.map(Event.any(this._onDidAddCapability.event, this._onDidRemoveCapability.event), () => void 0, this._store);
    }
    get onDidAddCommandDetectionCapability() {
        return Event.map(Event.filter(this.onDidAddCapability, e => e.id === 2 /* TerminalCapability.CommandDetection */, this._store), e => e.capability, this._store);
    }
    get onDidRemoveCommandDetectionCapability() {
        return Event.map(Event.filter(this.onDidRemoveCapability, e => e.id === 2 /* TerminalCapability.CommandDetection */, this._store), () => void 0, this._store);
    }
    get onDidAddCwdDetectionCapability() {
        return Event.map(Event.filter(this.onDidAddCapability, e => e.id === 0 /* TerminalCapability.CwdDetection */, this._store), e => e.capability, this._store);
    }
    get onDidRemoveCwdDetectionCapability() {
        return Event.map(Event.filter(this.onDidRemoveCapability, e => e.id === 0 /* TerminalCapability.CwdDetection */, this._store), () => void 0, this._store);
    }
    get items() {
        return this._items();
    }
    createOnDidRemoveCapabilityOfTypeEvent(type) {
        return Event.map(Event.filter(this.onDidRemoveCapability, e => e.id === type), e => e.capability);
    }
    createOnDidAddCapabilityOfTypeEvent(type) {
        return Event.map(Event.filter(this.onDidAddCapability, e => e.id === type), e => e.capability);
    }
    *_items() {
        for (const store of this._stores) {
            for (const c of store.items) {
                yield c;
            }
        }
    }
    has(capability) {
        for (const store of this._stores) {
            for (const c of store.items) {
                if (c === capability) {
                    return true;
                }
            }
        }
        return false;
    }
    get(capability) {
        for (const store of this._stores) {
            const c = store.get(capability);
            if (c) {
                return c;
            }
        }
        return undefined;
    }
    add(store) {
        this._stores.push(store);
        for (const capability of store.items) {
            this._onDidAddCapability.fire(createCapabilityEvent(capability, store.get(capability)));
        }
        this._register(store.onDidAddCapability(e => this._onDidAddCapability.fire(e)));
        this._register(store.onDidRemoveCapability(e => this._onDidRemoveCapability.fire(e)));
    }
}
__decorate([
    memoize
], TerminalCapabilityStoreMultiplexer.prototype, "onDidChangeCapabilities", null);
__decorate([
    memoize
], TerminalCapabilityStoreMultiplexer.prototype, "onDidAddCommandDetectionCapability", null);
__decorate([
    memoize
], TerminalCapabilityStoreMultiplexer.prototype, "onDidRemoveCommandDetectionCapability", null);
__decorate([
    memoize
], TerminalCapabilityStoreMultiplexer.prototype, "onDidAddCwdDetectionCapability", null);
__decorate([
    memoize
], TerminalCapabilityStoreMultiplexer.prototype, "onDidRemoveCwdDetectionCapability", null);
function createCapabilityEvent(capability, impl) {
    // HACK: This cast is required to convert a generic type to a discriminated union, this is
    // necessary in order to enable type narrowing on the event consumer side.
    // eslint-disable-next-line local/code-no-dangerous-type-assertions
    return { id: capability, capability: impl };
}
//# sourceMappingURL=terminalCapabilityStore.js.map