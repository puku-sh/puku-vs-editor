"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const assert = __importStar(require("assert"));
const subject_1 = require("../subject");
suite('Subject', function () {
    let subject;
    let observer;
    let nextCount;
    let lastValue;
    let errorCount;
    let lastError;
    let completeCount;
    setup(function () {
        subject = new subject_1.Subject();
        nextCount = 0;
        errorCount = 0;
        completeCount = 0;
        lastValue = undefined;
        lastError = undefined;
        observer = {
            next: (value) => {
                nextCount++;
                lastValue = value;
            },
            error: (err) => {
                errorCount++;
                lastError = err;
            },
            complete: () => {
                completeCount++;
            },
        };
    });
    test('should notify subscribed observers on next', function () {
        subject.subscribe(observer);
        subject.next(1);
        assert.strictEqual(nextCount, 1);
        assert.strictEqual(lastValue, 1);
    });
    test('should notify subscribed observers on error', function () {
        const error = new Error('test error');
        subject.subscribe(observer);
        subject.error(error);
        assert.strictEqual(errorCount, 1);
        assert.strictEqual(lastError, error);
    });
    test('should notify subscribed observers on complete', function () {
        subject.subscribe(observer);
        subject.complete();
        assert.strictEqual(completeCount, 1);
    });
    test('should not notify unsubscribed observers', function () {
        const unsubscribe = subject.subscribe(observer);
        unsubscribe();
        subject.next(1);
        subject.error(new Error());
        subject.complete();
        assert.strictEqual(nextCount, 0);
        assert.strictEqual(errorCount, 0);
        assert.strictEqual(completeCount, 0);
    });
    test('should notify multiple observers', function () {
        let nextCount2 = 0;
        let lastValue2;
        const observer2 = {
            next: (value) => {
                nextCount2++;
                lastValue2 = value;
            },
            error: () => { },
            complete: () => { },
        };
        subject.subscribe(observer);
        subject.subscribe(observer2);
        subject.next(1);
        assert.strictEqual(nextCount, 1);
        assert.strictEqual(lastValue, 1);
        assert.strictEqual(nextCount2, 1);
        assert.strictEqual(lastValue2, 1);
    });
    suite('ReplaySubject', function () {
        setup(function () {
            subject = new subject_1.ReplaySubject();
        });
        test('should notify late subscribed observers', function () {
            subject.next(1);
            subject.subscribe(observer);
            assert.strictEqual(nextCount, 1);
            assert.strictEqual(lastValue, 1);
        });
    });
});
//# sourceMappingURL=subject.test.js.map