"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const path_1 = __importDefault(require("path"));
const vitest_1 = require("vitest");
// This is OK since we are running in a Node / CommonJS environment.
const typescript_1 = __importDefault(require("typescript"));
// Define variables in outer scope so they can be accessed in tests
let ContextKind;
let assertContextItems;
let computeContext;
let create;
// This is OK since we run tests in node loading a TS version installed in the workspace.
const root = path_1.default.join(__dirname, '../../../fixtures');
// Use before hook to ensure async setup completes before tests run
(0, vitest_1.beforeAll)(async function () {
    const TS = await Promise.resolve().then(() => __importStar(require('../../common/typescript')));
    TS.default.install(typescript_1.default);
    const [protocolModule, testingModule] = await Promise.all([
        Promise.resolve().then(() => __importStar(require('../../common/protocol'))),
        Promise.resolve().then(() => __importStar(require('./testing'))),
    ]);
    ContextKind = protocolModule.ContextKind;
    assertContextItems = testingModule.assertContextItems;
    computeContext = testingModule.computeContext;
    create = testingModule.create;
}, 10000);
(0, vitest_1.suite)('Class', () => {
    let session;
    let expected;
    (0, vitest_1.beforeAll)(() => {
        session = create(path_1.default.join(root, 'p1'));
        expected = [{
                kind: ContextKind.Snippet,
                value: 'export class X implements Name, NameLength { name() { return \'x\'; } length() { return \'x\'.length; } }',
                fileName: /p1\/source\/f2.ts$/
            }];
    });
    (0, vitest_1.test)('complete', function () {
        assertContextItems(computeContext(session, path_1.default.join(root, 'p1/source/f3.ts'), { line: 3, character: 0 }, ContextKind.Snippet), expected, 'contains');
    });
    (0, vitest_1.test)('signature', function () {
        const context = computeContext(session, path_1.default.join(root, 'p1/source/f4.ts'), { line: 2, character: 42 }, ContextKind.Snippet);
        assertContextItems(context, expected, 'contains');
    });
});
(0, vitest_1.suite)('Type Alias', () => {
    let session;
    let expected;
    (0, vitest_1.beforeAll)(() => {
        session = create(path_1.default.join(root, 'p4'));
        expected = [{
                kind: ContextKind.Snippet,
                value: 'export class X implements Name, NameLength { name() { return \'x\'; } length() { return \'x\'.length; } }',
                fileName: /p4\/source\/f2.ts$/
            }];
    });
    (0, vitest_1.test)('complete', () => {
        const context = computeContext(session, path_1.default.join(root, 'p4/source/f3.ts'), { line: 3, character: 0 }, ContextKind.Snippet);
        assertContextItems(context, expected, 'contains');
    });
    (0, vitest_1.test)('rename', () => {
        const context = computeContext(session, path_1.default.join(root, 'p4/source/f4.ts'), { line: 6, character: 0 }, ContextKind.Snippet);
        assertContextItems(context, expected, 'contains');
    });
    (0, vitest_1.test)('intersection', () => {
        const expected = [{
                kind: ContextKind.Snippet,
                value: 'export class W implements Both { name() { return \'w\'; } length() { return \'w\'.length; } }',
                fileName: /p4\/source\/f2.ts$/
            }, {
                kind: ContextKind.Snippet,
                value: 'export type Both = Name & NameLength;',
                fileName: /p4\/source\/f1.ts$/
            }, {
                kind: ContextKind.Snippet,
                value: 'interface Name { name(): string; }',
                fileName: /p4\/source\/f1.ts$/
            }, {
                kind: ContextKind.Snippet,
                value: 'type NameLength = { length(): number; }',
                fileName: /p4\/source\/f1.ts$/
            }];
        const context = computeContext(session, path_1.default.join(root, 'p4/source/f5.ts'), { line: 3, character: 0 }, ContextKind.Snippet);
        assertContextItems(context, expected);
    });
});
(0, vitest_1.suite)('Method - Simple', () => {
    let session;
    (0, vitest_1.beforeAll)(() => {
        session = create(path_1.default.join(root, 'p2'));
    });
    (0, vitest_1.test)('complete method', () => {
        const expected = [{
                kind: ContextKind.Snippet,
                value: 'declare class B { /** * The distance between two points. */ protected distance: number; /** * The length of the line. */ protected _length: number; /** * Returns the occurrence of \'foo\'. * * @returns the occurrence of \'foo\'. */ public foo(): number; }',
                fileName: /p2\/source\/f1.ts$/
            }];
        const context = computeContext(session, path_1.default.join(root, 'p2/source/f2.ts'), { line: 5, character: 0 }, ContextKind.Snippet);
        assertContextItems(context, expected);
    });
});
(0, vitest_1.suite)('Method - Search', () => {
    (0, vitest_1.test)('complete private method with blueprint', () => {
        const session = create(path_1.default.join(root, 'p5'));
        const expected = [
            {
                kind: ContextKind.Snippet,
                value: 'declare class Foo { }',
                fileName: /p5\/source\/f1.ts$/
            },
            {
                kind: ContextKind.Snippet,
                value: '/** * Javadoc */ export class Bar extends Foo { private name(): string { return \'Bar\'; } }',
                fileName: /p5\/source\/f2.ts$/
            }
        ];
        const context = computeContext(session, path_1.default.join(root, 'p5/source/f3.ts'), { line: 4, character: 0 }, ContextKind.Snippet);
        assertContextItems(context, expected);
    });
    (0, vitest_1.test)('complete public method with blueprint from interface', () => {
        const session = create(path_1.default.join(root, 'p9'));
        const expected = [{
                kind: ContextKind.Snippet,
                value: 'export class Bar implements Foo { public name(): string { return \'Bar\'; } }',
                fileName: /p9\/source\/f2.ts$/
            }];
        const context = computeContext(session, path_1.default.join(root, 'p9/source/f3.ts'), { line: 4, character: 0 }, ContextKind.Snippet);
        assertContextItems(context, expected, 'contains');
    });
    (0, vitest_1.test)('complete public method with blueprint from interface hierarchy', () => {
        const session = create(path_1.default.join(root, 'p10'));
        const expected = [{
                kind: ContextKind.Snippet,
                value: 'export class Bar implements Fooo { public name(): string { return \'Bar\'; } }',
                fileName: /p10\/source\/f2.ts$/
            }];
        const context = computeContext(session, path_1.default.join(root, 'p10/source/f3.ts'), { line: 4, character: 0 }, ContextKind.Snippet);
        assertContextItems(context, expected, 'contains');
    });
    (0, vitest_1.test)('complete public method with blueprint from type alias', () => {
        const session = create(path_1.default.join(root, 'p11'));
        const expected = [{
                kind: ContextKind.Snippet,
                value: 'export class Bar implements Foo { public name(): string { return \'Bar\'; } }',
                fileName: /p11\/source\/f2.ts$/
            }];
        const context = computeContext(session, path_1.default.join(root, 'p11/source/f3.ts'), { line: 4, character: 0 }, ContextKind.Snippet);
        assertContextItems(context, expected, 'contains');
    });
});
(0, vitest_1.suite)('Method - Signature', () => {
    let session;
    (0, vitest_1.beforeAll)(() => {
        session = create(path_1.default.join(root, 'p6'));
    });
    (0, vitest_1.test)('complete method signature types', () => {
        const expected = [{
                kind: ContextKind.Snippet,
                value: 'declare class Foo { public foo(): void; }',
                fileName: /p6\/source\/f1.ts$/
            }, {
                kind: ContextKind.Snippet,
                value: 'interface Bar { bar(): void; }',
                fileName: /p6\/source\/f1.ts$/
            }, {
                kind: ContextKind.Snippet,
                value: 'enum Enum { a = 1, b = 2 }',
                fileName: /p6\/source\/f1.ts$/
            }, {
                kind: ContextKind.Snippet,
                value: 'const enum CEnum { a = 1, b = 2 }',
                fileName: /p6\/source\/f1.ts$/
            }, {
                kind: ContextKind.Snippet,
                value: 'type Baz = { baz(): void; bazz: () => number; }',
                fileName: /p6\/source\/f1.ts$/
            }];
        const context = computeContext(session, path_1.default.join(root, 'p6/source/f2.ts'), { line: 7, character: 0 }, ContextKind.Snippet);
        assertContextItems(context, expected);
    });
});
(0, vitest_1.suite)('Function signature', () => {
    (0, vitest_1.test)('complete function signature types', () => {
        const session = create(path_1.default.join(root, 'p7'));
        const expected = [{
                kind: ContextKind.Snippet,
                value: 'declare class Foo { public foo(): void; }',
                fileName: /p7\/source\/f1.ts$/
            }, {
                kind: ContextKind.Snippet,
                value: 'interface Bar { bar(): void; }',
                fileName: /p7\/source\/f1.ts$/
            }, {
                kind: ContextKind.Snippet,
                value: 'enum Enum { a = 1, b = 2 }',
                fileName: /p7\/source\/f1.ts$/
            }, {
                kind: ContextKind.Snippet,
                value: 'const enum CEnum { a = 1, b = 2 }',
                fileName: /p7\/source\/f1.ts$/
            }, {
                kind: ContextKind.Snippet,
                value: 'type Baz = { baz(): void; bazz: () => number; }',
                fileName: /p7\/source\/f1.ts$/
            }];
        const context = computeContext(session, path_1.default.join(root, 'p7/source/f2.ts'), { line: 6, character: 0 }, ContextKind.Snippet);
        assertContextItems(context, expected);
    });
    (0, vitest_1.test)('Imported types in functions', () => {
        const session = create(path_1.default.join(root, 'p12'));
        const expected = [{
                kind: ContextKind.Snippet,
                value: 'declare class Person { constructor(age: number = 10); public getAlter(): number; }',
                fileName: /p12\/source\/f1.ts$/
            }];
        const context = computeContext(session, path_1.default.join(root, 'p12/source/f2.ts'), { line: 3, character: 0 }, ContextKind.Snippet);
        assertContextItems(context, expected);
    });
    (0, vitest_1.test)('Type of locals in functions', () => {
        const session = create(path_1.default.join(root, 'p12'));
        const expected = [{
                kind: ContextKind.Snippet,
                value: 'declare class Person { constructor(age: number = 10); public getAlter(): number; }',
                fileName: /p12\/source\/f1.ts$/
            }];
        const context = computeContext(session, path_1.default.join(root, 'p12/source/f3.ts'), { line: 4, character: 0 }, ContextKind.Snippet);
        assertContextItems(context, expected);
    });
    (0, vitest_1.test)('Top level code', () => {
        const session = create(path_1.default.join(root, 'p12'));
        const expected = [{
                kind: ContextKind.Snippet,
                value: 'declare class Person { constructor(age: number = 10); public getAlter(): number; }',
                fileName: /p12\/source\/f1.ts$/
            }];
        const context = computeContext(session, path_1.default.join(root, 'p12/source/f4.ts'), { line: 3, character: 0 }, ContextKind.Snippet);
        assertContextItems(context, expected);
    });
    (0, vitest_1.test)('Module code', () => {
        const session = create(path_1.default.join(root, 'p12'));
        const expected = [{
                kind: ContextKind.Snippet,
                value: 'declare class Person { constructor(age: number = 10); public getAlter(): number; }',
                fileName: /p12\/source\/f1.ts$/
            }];
        const context = computeContext(session, path_1.default.join(root, 'p12/source/f5.ts'), { line: 3, character: 0 }, ContextKind.Snippet);
        assertContextItems(context, expected);
    });
});
(0, vitest_1.suite)('Constructor', () => {
    let session;
    (0, vitest_1.beforeAll)(() => {
        session = create(path_1.default.join(root, 'p8'));
    });
    (0, vitest_1.test)('complete constructor', () => {
        const expected = [
            {
                kind: ContextKind.Snippet,
                value: 'declare class Foo { }',
                fileName: /p8\/source\/f1.ts$/
            },
            {
                kind: ContextKind.Snippet,
                value: '/** * Javadoc */ export class Bar extends Foo { private name: string; constructor() { super(); this.name = \'Bar\'; } }',
                fileName: /p8\/source\/f2.ts$/
            }
        ];
        const context = computeContext(session, path_1.default.join(root, 'p8/source/f3.ts'), { line: 5, character: 0 }, ContextKind.Snippet);
        assertContextItems(context, expected);
    });
});
(0, vitest_1.suite)('PropertyTypes', () => {
    let session;
    (0, vitest_1.beforeAll)(() => {
        session = create(path_1.default.join(root, 'p13'));
    });
    (0, vitest_1.test)('from same class', () => {
        const expected = [
            {
                kind: ContextKind.Snippet,
                value: 'type Age = { value: number; }',
                fileName: /p13\/source\/f1.ts$/
            },
            {
                kind: ContextKind.Snippet,
                value: 'declare class Street { constructor(name: string); public getName(); }',
                fileName: /p13\/source\/f1.ts$/
            }
        ];
        const context = computeContext(session, path_1.default.join(root, 'p13/source/f2.ts'), { line: 15, character: 0 }, ContextKind.Snippet);
        assertContextItems(context, expected);
    });
    (0, vitest_1.test)('from parent class', () => {
        const expected = [
            {
                kind: ContextKind.Snippet,
                value: 'declare class Person { constructor(age: Age = { value: 10 }); protected getStreet(): Street; public print(): void; }',
                fileName: /p13\/source\/f2.ts$/
            },
            {
                kind: ContextKind.Snippet,
                value: 'declare class Street { constructor(name: string); public getName(); }',
                fileName: /p13\/source\/f1.ts$/
            }
        ];
        const context = computeContext(session, path_1.default.join(root, 'p13/source/f3.ts'), { line: 4, character: 0 }, ContextKind.Snippet);
        assertContextItems(context, expected);
    });
});
(0, vitest_1.suite)('TypeOfExpressionRunnable', () => {
    let session;
    (0, vitest_1.beforeAll)(() => {
        session = create(path_1.default.join(root, 'p14'));
    });
    (0, vitest_1.test)('ignores property access without identifier', () => {
        const context = computeContext(session, path_1.default.join(root, 'p14/source/f2.ts'), { line: 3, character: 19 }, ContextKind.Snippet);
        assertContextItems(context, []);
    });
    (0, vitest_1.test)('type from method chain', () => {
        const expected = [{
                kind: ContextKind.Snippet,
                value: 'declare class Calculator { constructor(initial: number = 0); public add(x: number): Calculator; public getResult(): Result; }',
                fileName: /p14\/source\/f1.ts$/
            }];
        const context = computeContext(session, path_1.default.join(root, 'p14/source/f3.ts'), { line: 4, character: 22 }, ContextKind.Snippet);
        assertContextItems(context, expected, 'contains');
    });
    (0, vitest_1.test)('type from method return (interface)', () => {
        const expected = [{
                kind: ContextKind.Snippet,
                value: 'interface Result { value: number; message: string; }',
                fileName: /p14\/source\/f1.ts$/
            }];
        const context = computeContext(session, path_1.default.join(root, 'p14/source/f4.ts'), { line: 4, character: 25 }, ContextKind.Snippet);
        assertContextItems(context, expected, 'contains');
    });
    (0, vitest_1.test)('type from element access chain', () => {
        const expected = [{
                kind: ContextKind.Snippet,
                value: 'declare class Calculator { constructor(initial: number = 0); public add(x: number): Calculator; public getResult(): Result; }',
                fileName: /p14\/source\/f1.ts$/
            }];
        const context = computeContext(session, path_1.default.join(root, 'p14/source/f5.ts'), { line: 4, character: 19 }, ContextKind.Snippet);
        assertContextItems(context, expected, 'contains');
    });
    (0, vitest_1.test)('type from deeply nested property access', () => {
        const expected = [{
                kind: ContextKind.Snippet,
                value: 'declare class Calculator { constructor(initial: number = 0); public add(x: number): Calculator; public getResult(): Result; }',
                fileName: /p14\/source\/f1.ts$/
            }];
        const context = computeContext(session, path_1.default.join(root, 'p14/source/f6.ts'), { line: 7, character: 25 }, ContextKind.Snippet);
        assertContextItems(context, expected, 'contains');
    });
});
(0, vitest_1.suite)('Traits', () => {
    (0, vitest_1.test)('complete traits', () => {
        const session = create(path_1.default.join(root, 'p1'));
        const expected = [
            {
                kind: ContextKind.Trait,
                name: 'The TypeScript module system used in this project is ',
                value: 'Node16'
            },
            {
                kind: ContextKind.Trait,
                name: 'The TypeScript module resolution strategy used in this project is ',
                value: 'Node16'
            },
            {
                kind: ContextKind.Trait,
                name: 'The target version of JavaScript for this project is ',
                value: 'ES2022'
            },
            {
                kind: ContextKind.Trait,
                name: 'Library files that should be included in TypeScript compilation are ',
                value: 'lib.es2022.d.ts,lib.dom.d.ts'
            },
            {
                kind: ContextKind.Trait,
                name: 'The TypeScript version used in this project is ',
                value: '5.7.3'
            },
        ];
        const context = computeContext(session, path_1.default.join(root, 'p1/source/f1.ts'), { line: 0, character: 0 }, ContextKind.Trait);
        assertContextItems(context, expected);
    });
    (0, vitest_1.test)('limited traits', () => {
        const session = create(path_1.default.join(root, 'p2'));
        const expected = [
            {
                kind: ContextKind.Trait,
                name: 'The TypeScript module system used in this project is ',
                value: 'CommonJS'
            },
            {
                kind: ContextKind.Trait,
                name: 'The TypeScript version used in this project is ',
                value: '5.7.3'
            },
        ];
        const context = computeContext(session, path_1.default.join(root, 'p2/source/f1.ts'), { line: 0, character: 0 }, ContextKind.Trait);
        assertContextItems(context, expected);
    });
});
//# sourceMappingURL=simple.spec.js.map