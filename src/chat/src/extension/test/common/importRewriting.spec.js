"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const importStatement_1 = require("../../prompt/common/importStatement");
(0, vitest_1.suite)('isImportStatement', () => {
    (0, vitest_1.test)('typescript', () => {
        vitest_1.assert.strictEqual((0, importStatement_1.isImportStatement)('import foo from "bar";', 'typescript'), true);
        vitest_1.assert.strictEqual((0, importStatement_1.isImportStatement)('  \timport foo from "bar";', 'typescript'), true);
        vitest_1.assert.strictEqual((0, importStatement_1.isImportStatement)('import * as foo from "bar";', 'typescript'), true);
        vitest_1.assert.strictEqual((0, importStatement_1.isImportStatement)('import { foo } from "bar";', 'typescript'), true);
        vitest_1.assert.strictEqual((0, importStatement_1.isImportStatement)('import { foo as bar } from "bar";', 'typescript'), true);
        vitest_1.assert.strictEqual((0, importStatement_1.isImportStatement)('import "bar";', 'typescript'), true);
        vitest_1.assert.strictEqual((0, importStatement_1.isImportStatement)(`const fs = require('fs');`, 'typescript'), true);
        vitest_1.assert.strictEqual((0, importStatement_1.isImportStatement)(`var fs = require("fs");`, 'typescript'), true);
        vitest_1.assert.strictEqual((0, importStatement_1.isImportStatement)(`import assert = require('assert');`, 'typescript'), true);
        vitest_1.assert.strictEqual((0, importStatement_1.isImportStatement)(`import*as fs from 'fs'`, 'typescript'), true);
        vitest_1.assert.strictEqual((0, importStatement_1.isImportStatement)(`import{arch} from 'os'`, 'typescript'), true);
        vitest_1.assert.strictEqual((0, importStatement_1.isImportStatement)('export { foo } from "bar";', 'typescript'), false);
        vitest_1.assert.strictEqual((0, importStatement_1.isImportStatement)(`const location = require.resolve('assert');`, 'typescript'), false);
    });
    (0, vitest_1.test)('javascript', () => {
        vitest_1.assert.strictEqual((0, importStatement_1.isImportStatement)('import foo from "bar";', 'javascript'), true);
        vitest_1.assert.strictEqual((0, importStatement_1.isImportStatement)('\t\t\timport foo from "bar";', 'javascript'), true);
        vitest_1.assert.strictEqual((0, importStatement_1.isImportStatement)('import * as foo from "bar";', 'javascript'), true);
        vitest_1.assert.strictEqual((0, importStatement_1.isImportStatement)('import { foo } from "bar";', 'javascript'), true);
        vitest_1.assert.strictEqual((0, importStatement_1.isImportStatement)('import { foo as bar } from "bar";', 'javascript'), true);
        vitest_1.assert.strictEqual((0, importStatement_1.isImportStatement)('import "bar";', 'javascript'), true);
        vitest_1.assert.strictEqual((0, importStatement_1.isImportStatement)(`const fs = require('fs');`, 'javascript'), true);
        vitest_1.assert.strictEqual((0, importStatement_1.isImportStatement)(`let fs = require("fs");`, 'javascript'), true);
        vitest_1.assert.strictEqual((0, importStatement_1.isImportStatement)(`var fs=require("fs");`, 'javascript'), true);
        vitest_1.assert.strictEqual((0, importStatement_1.isImportStatement)('export { foo } from "bar";', 'javascript'), false);
    });
    (0, vitest_1.test)('java', () => {
        vitest_1.assert.strictEqual((0, importStatement_1.isImportStatement)('import java.util.ArrayList;', 'java'), true);
        vitest_1.assert.strictEqual((0, importStatement_1.isImportStatement)('   import java.util.ArrayList;', 'java'), true);
        vitest_1.assert.strictEqual((0, importStatement_1.isImportStatement)('import static java.lang.Math.*;', 'java'), true);
        vitest_1.assert.strictEqual((0, importStatement_1.isImportStatement)('import java.util.*;', 'java'), true);
    });
    (0, vitest_1.test)('php', () => {
        vitest_1.assert.strictEqual((0, importStatement_1.isImportStatement)('use foo\\bar;', 'php'), true);
        vitest_1.assert.strictEqual((0, importStatement_1.isImportStatement)('  use foo\\bar;', 'php'), true);
        vitest_1.assert.strictEqual((0, importStatement_1.isImportStatement)('use foo\\bar as baz;', 'php'), true);
        vitest_1.assert.strictEqual((0, importStatement_1.isImportStatement)('use function foo\\bar;', 'php'), true);
        vitest_1.assert.strictEqual((0, importStatement_1.isImportStatement)('use const foo\\bar;', 'php'), true);
        vitest_1.assert.strictEqual((0, importStatement_1.isImportStatement)('use foo\\bar { baz };', 'php'), true);
        vitest_1.assert.strictEqual((0, importStatement_1.isImportStatement)('require_once "bar.php";', 'php'), false);
    });
    (0, vitest_1.test)('rust', () => {
        vitest_1.assert.strictEqual((0, importStatement_1.isImportStatement)('use foo;', 'rust'), true);
        vitest_1.assert.strictEqual((0, importStatement_1.isImportStatement)('\t\tuse foo;', 'rust'), true);
        vitest_1.assert.strictEqual((0, importStatement_1.isImportStatement)('use foo::bar;', 'rust'), true);
        vitest_1.assert.strictEqual((0, importStatement_1.isImportStatement)('use foo::{bar, baz};', 'rust'), true);
        vitest_1.assert.strictEqual((0, importStatement_1.isImportStatement)('use foo as bar;', 'rust'), true);
        vitest_1.assert.strictEqual((0, importStatement_1.isImportStatement)('extern crate foo;', 'rust'), false);
    });
    (0, vitest_1.test)('python', () => {
        vitest_1.assert.strictEqual((0, importStatement_1.isImportStatement)('  import foo', 'python'), true);
        vitest_1.assert.strictEqual((0, importStatement_1.isImportStatement)('import foo as bar', 'python'), true);
        vitest_1.assert.strictEqual((0, importStatement_1.isImportStatement)('from foo import bar', 'python'), true);
        vitest_1.assert.strictEqual((0, importStatement_1.isImportStatement)('from foo import bar, baz', 'python'), true);
        vitest_1.assert.strictEqual((0, importStatement_1.isImportStatement)('from foo import *', 'python'), true);
        vitest_1.assert.strictEqual((0, importStatement_1.isImportStatement)('import "bar"', 'python'), false);
        vitest_1.assert.strictEqual((0, importStatement_1.isImportStatement)('export { foo } from "bar";', 'python'), false);
        vitest_1.assert.strictEqual((0, importStatement_1.isImportStatement)('const foo = require("bar");', 'python'), false);
    });
});
//# sourceMappingURL=importRewriting.spec.js.map