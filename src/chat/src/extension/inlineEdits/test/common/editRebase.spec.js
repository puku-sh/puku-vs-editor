"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const vitest_1 = require("vitest");
const editUtils_1 = require("../../../../platform/inlineEdits/common/dataTypes/editUtils");
const tracing_1 = require("../../../../util/common/tracing");
const stringEdit_1 = require("../../../../util/vs/editor/common/core/edits/stringEdit");
const offsetRange_1 = require("../../../../util/vs/editor/common/core/ranges/offsetRange");
const editRebase_1 = require("../../common/editRebase");
(0, vitest_1.suite)('NextEditCache', () => {
    (0, vitest_1.test)('tryRebase keeps index and full edit', async () => {
        const originalDocument = `
class Point3D {
	constructor(x, y) {
		this.x = x;
		this.y = y;
	}
}
`;
        const suggestedEdit = stringEdit_1.StringEdit.create([
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(17, 37), '	constructor(x, y, z) {'),
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(65, 65), '\n		this.z = z;'),
        ]);
        const userEdit = stringEdit_1.StringEdit.create([
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(34, 34), ', z'),
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(65, 65), '\n		this.'),
        ]);
        const final = suggestedEdit.apply(originalDocument);
        (0, vitest_1.expect)(final).toStrictEqual(`
class Point3D {
	constructor(x, y, z) {
		this.x = x;
		this.y = y;
		this.z = z;
	}
}
`);
        const currentDocument = userEdit.apply(originalDocument);
        (0, vitest_1.expect)(currentDocument).toStrictEqual(`
class Point3D {
	constructor(x, y, z) {
		this.x = x;
		this.y = y;
		this.
	}
}
`);
        const tracer = (0, tracing_1.createTracer)('nextEditCache.spec', console.log);
        {
            const res = (0, editRebase_1.tryRebase)(originalDocument, undefined, (0, editUtils_1.decomposeStringEdit)(suggestedEdit).edits, [], userEdit, currentDocument, [], 'strict', tracer);
            (0, vitest_1.expect)(res).toBeTypeOf('object');
            const result = res;
            (0, vitest_1.expect)(result[0].rebasedEditIndex).toBe(1);
            (0, vitest_1.expect)(result[0].rebasedEdit.toString()).toMatchInlineSnapshot(`"[68, 76) -> "\\n\\t\\tthis.z = z;""`);
        }
        {
            const res = (0, editRebase_1.tryRebase)(originalDocument, undefined, (0, editUtils_1.decomposeStringEdit)(suggestedEdit).edits, [], userEdit, currentDocument, [], 'lenient', tracer);
            (0, vitest_1.expect)(res).toBeTypeOf('object');
            const result = res;
            (0, vitest_1.expect)(result[0].rebasedEditIndex).toBe(1);
            (0, vitest_1.expect)(result[0].rebasedEdit.toString()).toMatchInlineSnapshot(`"[68, 76) -> "\\n\\t\\tthis.z = z;""`);
        }
    });
    (0, vitest_1.test)('tryRebase matches up edits', async () => {
        // Ambiguity with shifted edits.
        const originalDocument = `
function getEnvVar(name): string | undefined {
	const value = process.env[name] || undefined;
	if (!value) {
		console.warn(\`Environment variable \${name} is not set\`);
	}
	return value;
}

function main() {
	const foo = getEnvVar("FOO");
	if (!foo) {
		return;
	}
}
`;
        const suggestedEdit = stringEdit_1.StringEdit.create([
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(265, 266), `	// Do something with foo
}`),
        ]);
        const userEdit = stringEdit_1.StringEdit.create([
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(264, 264), `



	// Do something with foo`),
        ]);
        const final = suggestedEdit.apply(originalDocument);
        (0, vitest_1.expect)(final).toStrictEqual(`
function getEnvVar(name): string | undefined {
	const value = process.env[name] || undefined;
	if (!value) {
		console.warn(\`Environment variable \${name} is not set\`);
	}
	return value;
}

function main() {
	const foo = getEnvVar("FOO");
	if (!foo) {
		return;
	}
	// Do something with foo
}
`);
        const currentDocument = userEdit.apply(originalDocument);
        (0, vitest_1.expect)(currentDocument).toStrictEqual(`
function getEnvVar(name): string | undefined {
	const value = process.env[name] || undefined;
	if (!value) {
		console.warn(\`Environment variable \${name} is not set\`);
	}
	return value;
}

function main() {
	const foo = getEnvVar("FOO");
	if (!foo) {
		return;
	}



	// Do something with foo
}
`);
        const tracer = (0, tracing_1.createTracer)('nextEditCache.spec', console.log);
        (0, vitest_1.expect)((0, editRebase_1.tryRebase)(originalDocument, undefined, suggestedEdit.replacements, [], userEdit, currentDocument, [], 'strict', tracer)).toStrictEqual('rebaseFailed');
        (0, vitest_1.expect)((0, editRebase_1.tryRebase)(originalDocument, undefined, suggestedEdit.replacements, [], userEdit, currentDocument, [], 'lenient', tracer)).toStrictEqual('rebaseFailed');
    });
    (0, vitest_1.test)('tryRebase correct offsets', async () => {
        const originalDocument = `
#include <vector>
namespace
{
size_t func()
{
    std::vector<int> result42;
    if (result.empty())
        return result.size();
    result.clear();
    return result.size();
}
}


int main()
{
    return 0;
}
`;
        const suggestedEdit = stringEdit_1.StringEdit.create([
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(78, 178), `    if (result42.empty())
        return result42.size();
    result42.clear();
    return result42.size();
`),
        ]);
        const userEdit = stringEdit_1.StringEdit.create([
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(86, 92), `r`),
        ]);
        const final = suggestedEdit.apply(originalDocument);
        (0, vitest_1.expect)(final).toStrictEqual(`
#include <vector>
namespace
{
size_t func()
{
    std::vector<int> result42;
    if (result42.empty())
        return result42.size();
    result42.clear();
    return result42.size();
}
}


int main()
{
    return 0;
}
`);
        const currentDocument = userEdit.apply(originalDocument);
        (0, vitest_1.expect)(currentDocument).toStrictEqual(`
#include <vector>
namespace
{
size_t func()
{
    std::vector<int> result42;
    if (r.empty())
        return result.size();
    result.clear();
    return result.size();
}
}


int main()
{
    return 0;
}
`);
        const tracer = (0, tracing_1.createTracer)('nextEditCache.spec', console.log);
        {
            const res = (0, editRebase_1.tryRebase)(originalDocument, undefined, suggestedEdit.replacements, [], userEdit, currentDocument, [], 'strict', tracer);
            (0, vitest_1.expect)(res).toBeTypeOf('object');
            const result = res;
            (0, vitest_1.expect)(result[0].rebasedEditIndex).toBe(0);
            (0, vitest_1.expect)(stringEdit_1.StringEdit.single(result[0].rebasedEdit).apply(currentDocument)).toStrictEqual(final);
            (0, vitest_1.expect)(result[0].rebasedEdit.removeCommonSuffixAndPrefix(currentDocument).toString()).toMatchInlineSnapshot(`"[87, 164) -> "esult42.empty())\\n        return result42.size();\\n    result42.clear();\\n    return result42""`);
        }
        {
            const res = (0, editRebase_1.tryRebase)(originalDocument, undefined, suggestedEdit.replacements, [], userEdit, currentDocument, [], 'lenient', tracer);
            (0, vitest_1.expect)(res).toBeTypeOf('object');
            const result = res;
            (0, vitest_1.expect)(result[0].rebasedEditIndex).toBe(0);
            (0, vitest_1.expect)(stringEdit_1.StringEdit.single(result[0].rebasedEdit).apply(currentDocument)).toStrictEqual(final);
            (0, vitest_1.expect)(result[0].rebasedEdit.removeCommonSuffixAndPrefix(currentDocument).toString()).toMatchInlineSnapshot(`"[87, 164) -> "esult42.empty())\\n        return result42.size();\\n    result42.clear();\\n    return result42""`);
        }
    });
});
(0, vitest_1.suite)('NextEditCache.tryRebaseStringEdits', () => {
    (0, vitest_1.test)('insert', () => {
        const text = 'class Point3 {';
        const edit = stringEdit_1.StringEdit.create([
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(0, 14), 'class Point3D {'),
        ]);
        const base = stringEdit_1.StringEdit.create([
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(12, 12), 'D'),
        ]);
        (0, vitest_1.expect)(edit.apply(text)).toStrictEqual('class Point3D {');
        (0, vitest_1.expect)(base.apply(text)).toStrictEqual('class Point3D {');
        (0, vitest_1.expect)((0, editRebase_1.tryRebaseStringEdits)(text, edit, base, 'strict')?.replacements.toString()).toMatchInlineSnapshot(`"[0, 15) -> "class Point3D {""`);
        (0, vitest_1.expect)((0, editRebase_1.tryRebaseStringEdits)(text, edit, base, 'lenient')?.replacements.toString()).toMatchInlineSnapshot(`"[0, 15) -> "class Point3D {""`);
    });
    (0, vitest_1.test)('replace', () => {
        const text = 'class Point3d {';
        const edit = stringEdit_1.StringEdit.create([
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(0, 15), 'class Point3D {'),
        ]);
        const base = stringEdit_1.StringEdit.create([
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(12, 13), 'D'),
        ]);
        (0, vitest_1.expect)(edit.apply(text)).toStrictEqual('class Point3D {');
        (0, vitest_1.expect)(base.apply(text)).toStrictEqual('class Point3D {');
        (0, vitest_1.expect)((0, editRebase_1.tryRebaseStringEdits)(text, edit, base, 'strict')?.replacements.toString()).toMatchInlineSnapshot(`"[0, 15) -> "class Point3D {""`);
        (0, vitest_1.expect)((0, editRebase_1.tryRebaseStringEdits)(text, edit, base, 'lenient')?.replacements.toString()).toMatchInlineSnapshot(`"[0, 15) -> "class Point3D {""`);
    });
    (0, vitest_1.test)('delete', () => {
        const text = 'class Point34D {';
        const edit = stringEdit_1.StringEdit.create([
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(0, 16), 'class Point3D {'),
        ]);
        const base = stringEdit_1.StringEdit.create([
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(12, 13), ''),
        ]);
        (0, vitest_1.expect)(edit.apply(text)).toStrictEqual('class Point3D {');
        (0, vitest_1.expect)(base.apply(text)).toStrictEqual('class Point3D {');
        (0, vitest_1.expect)((0, editRebase_1.tryRebaseStringEdits)(text, edit, base, 'strict')?.replacements.toString()).toMatchInlineSnapshot(`"[0, 15) -> "class Point3D {""`);
        (0, vitest_1.expect)((0, editRebase_1.tryRebaseStringEdits)(text, edit, base, 'lenient')?.replacements.toString()).toMatchInlineSnapshot(`"[0, 15) -> "class Point3D {""`);
    });
    (0, vitest_1.test)('insert', () => {
        const text = 'class Point3 {';
        const edit = stringEdit_1.StringEdit.create([
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(0, 14), 'class Point3D {'),
        ]);
        const base = stringEdit_1.StringEdit.create([
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(12, 12), 'd'),
        ]);
        (0, vitest_1.expect)(edit.apply(text)).toStrictEqual('class Point3D {');
        (0, vitest_1.expect)(base.apply(text)).toStrictEqual('class Point3d {');
        (0, vitest_1.expect)((0, editRebase_1.tryRebaseStringEdits)(text, edit, base, 'strict')?.replacements.toString()).toBeUndefined();
        (0, vitest_1.expect)((0, editRebase_1.tryRebaseStringEdits)(text, edit, base, 'lenient')?.replacements.toString()).toBeUndefined();
    });
    (0, vitest_1.test)('insert 2 edits', () => {
        const text = `
class Point3D {
	constructor(x, y) {
		this.x = x;
		this.y = y;
	}
}
`;
        const edit = stringEdit_1.StringEdit.create([
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(17, 37), '	constructor(x, y, z) {'),
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(66, 66), '		this.z = z;\n'),
        ]);
        const base = stringEdit_1.StringEdit.create([
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(34, 34), ', z'),
        ]);
        const final = edit.apply(text);
        (0, vitest_1.expect)(final).toStrictEqual(`
class Point3D {
	constructor(x, y, z) {
		this.x = x;
		this.y = y;
		this.z = z;
	}
}
`);
        const current = base.apply(text);
        (0, vitest_1.expect)(current).toStrictEqual(`
class Point3D {
	constructor(x, y, z) {
		this.x = x;
		this.y = y;
	}
}
`);
        const strict = (0, editRebase_1.tryRebaseStringEdits)(text, edit, base, 'strict')?.removeCommonSuffixAndPrefix(current);
        (0, vitest_1.expect)(strict?.apply(current)).toStrictEqual(final);
        (0, vitest_1.expect)(strict?.replacements.toString()).toMatchInlineSnapshot(`"[69, 69) -> "\\t\\tthis.z = z;\\n""`);
        const lenient = (0, editRebase_1.tryRebaseStringEdits)(text, edit, base, 'lenient')?.removeCommonSuffixAndPrefix(current);
        (0, vitest_1.expect)(lenient?.apply(current)).toStrictEqual(final);
        (0, vitest_1.expect)(lenient?.replacements.toString()).toMatchInlineSnapshot(`"[69, 69) -> "\\t\\tthis.z = z;\\n""`);
    });
    (0, vitest_1.test)('insert 2 and 2 edits', () => {
        const text = `
class Point3D {
	constructor(x, y) {
		this.x = x;
		this.y = y;
	}
}
`;
        const edit = stringEdit_1.StringEdit.create([
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(17, 37), '	constructor(x, y, z) {'),
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(65, 65), '\n		this.z = z;'),
        ]);
        const base = stringEdit_1.StringEdit.create([
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(34, 34), ', z'),
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(65, 65), '\n		this.z = z;'),
        ]);
        const final = edit.apply(text);
        (0, vitest_1.expect)(final).toStrictEqual(`
class Point3D {
	constructor(x, y, z) {
		this.x = x;
		this.y = y;
		this.z = z;
	}
}
`);
        const current = base.apply(text);
        (0, vitest_1.expect)(current).toStrictEqual(`
class Point3D {
	constructor(x, y, z) {
		this.x = x;
		this.y = y;
		this.z = z;
	}
}
`);
        const strict = (0, editRebase_1.tryRebaseStringEdits)(text, edit, base, 'strict')?.removeCommonSuffixAndPrefix(current);
        (0, vitest_1.expect)(strict?.apply(current)).toStrictEqual(final);
        (0, vitest_1.expect)(strict?.replacements.toString()).toMatchInlineSnapshot(`""`);
        const lenient = (0, editRebase_1.tryRebaseStringEdits)(text, edit, base, 'lenient')?.removeCommonSuffixAndPrefix(current);
        (0, vitest_1.expect)(lenient?.apply(current)).toStrictEqual(final);
        (0, vitest_1.expect)(lenient?.replacements.toString()).toMatchInlineSnapshot(`""`);
    });
    (0, vitest_1.test)('insert 2 and 1 edits, 1 fully contained', () => {
        const text = `abcdefghi`;
        const suggestion = stringEdit_1.StringEdit.create([
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(4, 5), '234'),
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(7, 8), 'ABC'),
        ]);
        const userEdit = stringEdit_1.StringEdit.create([
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(1, 6), '123456'),
        ]);
        const intermediate = suggestion.apply(text);
        (0, vitest_1.expect)(intermediate).toStrictEqual(`abcd234fgABCi`);
        const current = userEdit.apply(text);
        (0, vitest_1.expect)(current).toStrictEqual(`a123456ghi`);
        (0, vitest_1.expect)((0, editRebase_1.tryRebaseStringEdits)(text, suggestion, userEdit, 'strict')).toBeUndefined();
        (0, vitest_1.expect)((0, editRebase_1.tryRebaseStringEdits)(text, suggestion, userEdit, 'lenient')).toBeUndefined();
    });
    (0, vitest_1.test)('2 user edits contained in 1', () => {
        const text = `abcdef`;
        const suggestion = stringEdit_1.StringEdit.create([
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(1, 4), 'b1c2d'),
        ]);
        const applied = suggestion.apply(text);
        (0, vitest_1.expect)(applied).toStrictEqual(`ab1c2def`);
        const userEdit = stringEdit_1.StringEdit.create([
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(2, 2), '1'),
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(3, 3), '2'),
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(5, 5), '3'),
        ]);
        const current = userEdit.apply(text);
        (0, vitest_1.expect)(current).toStrictEqual(`ab1c2de3f`);
        (0, vitest_1.expect)((0, editRebase_1.tryRebaseStringEdits)(text, suggestion, userEdit, 'strict')).toBeUndefined();
        const lenient = (0, editRebase_1.tryRebaseStringEdits)(text, suggestion, userEdit, 'lenient')?.removeCommonSuffixAndPrefix(current);
        (0, vitest_1.expect)(lenient?.apply(current)).toStrictEqual('ab1c2de3f');
        (0, vitest_1.expect)(lenient?.replacements.toString()).toMatchInlineSnapshot(`""`);
    });
    (0, vitest_1.test)('2 user edits contained in 1, conflicting 1', () => {
        const text = `abcde`;
        const suggestion = stringEdit_1.StringEdit.create([
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(1, 4), 'b1c2d'),
        ]);
        const applied = suggestion.apply(text);
        (0, vitest_1.expect)(applied).toStrictEqual(`ab1c2de`);
        const userEdit = stringEdit_1.StringEdit.create([
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(2, 2), '1'),
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(3, 3), '3'),
        ]);
        const current = userEdit.apply(text);
        (0, vitest_1.expect)(current).toStrictEqual(`ab1c3de`);
        (0, vitest_1.expect)((0, editRebase_1.tryRebaseStringEdits)(text, suggestion, userEdit, 'strict')).toBeUndefined();
        (0, vitest_1.expect)((0, editRebase_1.tryRebaseStringEdits)(text, suggestion, userEdit, 'lenient')).toBeUndefined();
    });
    (0, vitest_1.test)('2 user edits contained in 1, conflicting 2', () => {
        const text = `abcde`;
        const suggestion = stringEdit_1.StringEdit.create([
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(1, 4), 'b1c2d'),
        ]);
        const applied = suggestion.apply(text);
        (0, vitest_1.expect)(applied).toStrictEqual(`ab1c2de`);
        const userEdit = stringEdit_1.StringEdit.create([
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(2, 2), '2'),
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(3, 3), '1'),
        ]);
        const current = userEdit.apply(text);
        (0, vitest_1.expect)(current).toStrictEqual(`ab2c1de`);
        (0, vitest_1.expect)((0, editRebase_1.tryRebaseStringEdits)(text, suggestion, userEdit, 'strict')).toBeUndefined();
        (0, vitest_1.expect)((0, editRebase_1.tryRebaseStringEdits)(text, suggestion, userEdit, 'lenient')).toBeUndefined();
    });
    (0, vitest_1.test)('2 edits contained in 1 user edit', () => {
        const text = `abcdef`;
        const userEdit = stringEdit_1.StringEdit.create([
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(1, 4), 'b1c2d'),
        ]);
        const current = userEdit.apply(text);
        (0, vitest_1.expect)(current).toStrictEqual(`ab1c2def`);
        const suggestion = stringEdit_1.StringEdit.create([
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(2, 2), '1'),
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(3, 3), '2'),
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(5, 5), '3'),
        ]);
        const applied = suggestion.apply(text);
        (0, vitest_1.expect)(applied).toStrictEqual(`ab1c2de3f`);
        (0, vitest_1.expect)((0, editRebase_1.tryRebaseStringEdits)(text, suggestion, userEdit, 'strict')).toBeUndefined();
        (0, vitest_1.expect)((0, editRebase_1.tryRebaseStringEdits)(text, suggestion, userEdit, 'lenient')).toBeUndefined();
    });
    (0, vitest_1.test)('2 edits contained in 1 user edit, conflicting 1', () => {
        const text = `abcde`;
        const userEdit = stringEdit_1.StringEdit.create([
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(1, 4), 'b1c2d'),
        ]);
        const current = userEdit.apply(text);
        (0, vitest_1.expect)(current).toStrictEqual(`ab1c2de`);
        const suggestion = stringEdit_1.StringEdit.create([
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(2, 2), '1'),
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(3, 3), '3'),
        ]);
        const applied = suggestion.apply(text);
        (0, vitest_1.expect)(applied).toStrictEqual(`ab1c3de`);
        (0, vitest_1.expect)((0, editRebase_1.tryRebaseStringEdits)(text, suggestion, userEdit, 'strict')).toBeUndefined();
        (0, vitest_1.expect)((0, editRebase_1.tryRebaseStringEdits)(text, suggestion, userEdit, 'lenient')).toBeUndefined();
    });
    (0, vitest_1.test)('2 edits contained in 1 user edit, conflicting 2', () => {
        const text = `abcde`;
        const userEdit = stringEdit_1.StringEdit.create([
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(1, 4), 'b1c2d'),
        ]);
        const current = userEdit.apply(text);
        (0, vitest_1.expect)(current).toStrictEqual(`ab1c2de`);
        const suggestion = stringEdit_1.StringEdit.create([
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(2, 2), '2'),
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(3, 3), '1'),
        ]);
        const applied = suggestion.apply(text);
        (0, vitest_1.expect)(applied).toStrictEqual(`ab2c1de`);
        (0, vitest_1.expect)((0, editRebase_1.tryRebaseStringEdits)(text, suggestion, userEdit, 'strict')).toBeUndefined();
        (0, vitest_1.expect)((0, editRebase_1.tryRebaseStringEdits)(text, suggestion, userEdit, 'lenient')).toBeUndefined();
    });
    (0, vitest_1.test)('1 additional user edit', () => {
        const text = `abcdef`;
        const userEdit = stringEdit_1.StringEdit.create([
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(2, 2), '1'),
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(3, 3), '2'),
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(5, 5), '3'),
        ]);
        const current = userEdit.apply(text);
        (0, vitest_1.expect)(current).toStrictEqual(`ab1c2de3f`);
        const suggestion = stringEdit_1.StringEdit.create([
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(2, 2), '1'),
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(5, 5), '3'),
        ]);
        const applied = suggestion.apply(text);
        (0, vitest_1.expect)(applied).toStrictEqual(`ab1cde3f`);
        (0, vitest_1.expect)((0, editRebase_1.tryRebaseStringEdits)(text, suggestion, userEdit, 'strict')).toBeUndefined();
        const lenient = (0, editRebase_1.tryRebaseStringEdits)(text, suggestion, userEdit, 'lenient')?.removeCommonSuffixAndPrefix(current);
        (0, vitest_1.expect)(lenient?.apply(current)).toStrictEqual('ab1c2de3f');
        (0, vitest_1.expect)(lenient?.replacements.toString()).toMatchInlineSnapshot(`""`);
    });
    (0, vitest_1.test)('1 additional suggestion edit', () => {
        const text = `abcdef`;
        const userEdit = stringEdit_1.StringEdit.create([
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(2, 2), '1'),
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(5, 5), '3'),
        ]);
        const current = userEdit.apply(text);
        (0, vitest_1.expect)(current).toStrictEqual(`ab1cde3f`);
        const suggestion = stringEdit_1.StringEdit.create([
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(2, 2), '1'),
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(3, 3), '2'),
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(5, 5), '3'),
        ]);
        const applied = suggestion.apply(text);
        (0, vitest_1.expect)(applied).toStrictEqual(`ab1c2de3f`);
        const strict = (0, editRebase_1.tryRebaseStringEdits)(text, suggestion, userEdit, 'strict');
        (0, vitest_1.expect)(strict?.apply(current)).toStrictEqual('ab1c2de3f');
        (0, vitest_1.expect)(strict?.removeCommonSuffixAndPrefix(current).replacements.toString()).toMatchInlineSnapshot(`"[4, 4) -> "2""`);
        const lenient = (0, editRebase_1.tryRebaseStringEdits)(text, suggestion, userEdit, 'lenient');
        (0, vitest_1.expect)(lenient?.apply(current)).toStrictEqual('ab1c2de3f');
        (0, vitest_1.expect)(lenient?.removeCommonSuffixAndPrefix(current).replacements.toString()).toMatchInlineSnapshot(`"[4, 4) -> "2""`);
    });
    (0, vitest_1.test)('shifted edits 1', () => {
        const text = `abcde`;
        const userEdit = stringEdit_1.StringEdit.create([
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(2, 2), 'c1'),
        ]);
        const current = userEdit.apply(text);
        (0, vitest_1.expect)(current).toStrictEqual(`abc1cde`);
        const suggestion = stringEdit_1.StringEdit.create([
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(1, 1), '0'),
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(3, 3), '1c'),
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(4, 4), '2'),
        ]);
        const applied = suggestion.apply(text);
        (0, vitest_1.expect)(applied).toStrictEqual(`a0bc1cd2e`);
        const strict = (0, editRebase_1.tryRebaseStringEdits)(text, suggestion, userEdit, 'strict');
        (0, vitest_1.expect)(strict?.apply(current)).toStrictEqual('a0bc1cd2e');
        (0, vitest_1.expect)(strict?.removeCommonSuffixAndPrefix(current).replacements.toString()).toMatchInlineSnapshot(`"[1, 1) -> "0",[6, 6) -> "2""`);
        const lenient = (0, editRebase_1.tryRebaseStringEdits)(text, suggestion, userEdit, 'lenient');
        (0, vitest_1.expect)(lenient?.apply(current)).toStrictEqual('a0bc1cd2e');
        (0, vitest_1.expect)(lenient?.removeCommonSuffixAndPrefix(current).replacements.toString()).toMatchInlineSnapshot(`"[1, 1) -> "0",[6, 6) -> "2""`);
    });
    (0, vitest_1.test)('shifted edits 2', () => {
        const text = `abcde`;
        const userEdit = stringEdit_1.StringEdit.create([
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(3, 3), '1c'),
        ]);
        const current = userEdit.apply(text);
        (0, vitest_1.expect)(current).toStrictEqual(`abc1cde`);
        const suggestion = stringEdit_1.StringEdit.create([
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(1, 1), '0'),
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(2, 2), 'c1'),
        ]);
        const applied = suggestion.apply(text);
        (0, vitest_1.expect)(applied).toStrictEqual(`a0bc1cde`);
        const strict = (0, editRebase_1.tryRebaseStringEdits)(text, suggestion, userEdit, 'strict');
        (0, vitest_1.expect)(strict?.apply(current)).toStrictEqual('a0bc1cde');
        (0, vitest_1.expect)(strict?.removeCommonSuffixAndPrefix(current).replacements.toString()).toMatchInlineSnapshot(`"[1, 1) -> "0""`);
        const lenient = (0, editRebase_1.tryRebaseStringEdits)(text, suggestion, userEdit, 'lenient');
        (0, vitest_1.expect)(lenient?.apply(current)).toStrictEqual('a0bc1cde');
        (0, vitest_1.expect)(lenient?.removeCommonSuffixAndPrefix(current).replacements.toString()).toMatchInlineSnapshot(`"[1, 1) -> "0""`);
    });
    (0, vitest_1.test)('user deletes 1', () => {
        const text = `abcde`;
        const userEdit = stringEdit_1.StringEdit.create([
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(2, 3), ''),
        ]);
        const current = userEdit.apply(text);
        (0, vitest_1.expect)(current).toStrictEqual(`abde`);
        const suggestion = stringEdit_1.StringEdit.create([
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(3, 3), '1c'),
        ]);
        const applied = suggestion.apply(text);
        (0, vitest_1.expect)(applied).toStrictEqual(`abc1cde`);
        (0, vitest_1.expect)((0, editRebase_1.tryRebaseStringEdits)(text, suggestion, userEdit, 'strict')).toBeUndefined();
        (0, vitest_1.expect)((0, editRebase_1.tryRebaseStringEdits)(text, suggestion, userEdit, 'lenient')).toBeUndefined();
    });
    (0, vitest_1.test)('user deletes 2', () => {
        const text = `abcde`;
        const userEdit = stringEdit_1.StringEdit.create([
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(2, 3), ''),
        ]);
        const current = userEdit.apply(text);
        (0, vitest_1.expect)(current).toStrictEqual(`abde`);
        const suggestion = stringEdit_1.StringEdit.create([
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(2, 2), 'c1'),
        ]);
        const applied = suggestion.apply(text);
        (0, vitest_1.expect)(applied).toStrictEqual(`abc1cde`);
        (0, vitest_1.expect)((0, editRebase_1.tryRebaseStringEdits)(text, suggestion, userEdit, 'strict')).toBeUndefined();
        (0, vitest_1.expect)((0, editRebase_1.tryRebaseStringEdits)(text, suggestion, userEdit, 'lenient')).toBeUndefined();
    });
    (0, vitest_1.test)('overlap: suggestion replaces in disagreement', () => {
        const text = `this.myPet = g`;
        const userEdit = stringEdit_1.StringEdit.create([
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(14, 14), 'et'),
        ]);
        const current = userEdit.apply(text);
        (0, vitest_1.expect)(current).toStrictEqual(`this.myPet = get`);
        const suggestion = stringEdit_1.StringEdit.create([
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(13, 14), 'new Pet("Buddy", 3);'),
        ]);
        const applied = suggestion.apply(text);
        (0, vitest_1.expect)(applied).toStrictEqual(`this.myPet = new Pet("Buddy", 3);`);
        (0, vitest_1.expect)((0, editRebase_1.tryRebaseStringEdits)(text, suggestion, userEdit, 'strict')).toBeUndefined();
        (0, vitest_1.expect)((0, editRebase_1.tryRebaseStringEdits)(text, suggestion, userEdit, 'lenient')).toBeUndefined();
    });
    (0, vitest_1.test)('overlap: suggestion replaces in agreement', () => {
        const text = `this.myPet = g`;
        const userEdit = stringEdit_1.StringEdit.create([
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(14, 14), 'et'),
        ]);
        const current = userEdit.apply(text);
        (0, vitest_1.expect)(current).toStrictEqual(`this.myPet = get`);
        const suggestion = stringEdit_1.StringEdit.create([
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(13, 14), 'getPet();'),
        ]);
        const applied = suggestion.apply(text);
        (0, vitest_1.expect)(applied).toStrictEqual(`this.myPet = getPet();`);
        const strict = (0, editRebase_1.tryRebaseStringEdits)(text, suggestion, userEdit, 'strict');
        (0, vitest_1.expect)(strict?.apply(current)).toStrictEqual('this.myPet = getPet();');
        (0, vitest_1.expect)(strict?.removeCommonSuffixAndPrefix(current).replacements.toString()).toMatchInlineSnapshot(`"[16, 16) -> "Pet();""`);
        const lenient = (0, editRebase_1.tryRebaseStringEdits)(text, suggestion, userEdit, 'lenient');
        (0, vitest_1.expect)(lenient?.apply(current)).toStrictEqual('this.myPet = getPet();');
        (0, vitest_1.expect)(lenient?.removeCommonSuffixAndPrefix(current).replacements.toString()).toMatchInlineSnapshot(`"[16, 16) -> "Pet();""`);
    });
    (0, vitest_1.test)('overlap: both replace in agreement 1', () => {
        const text = `abcdefg`;
        const userEdit = stringEdit_1.StringEdit.create([
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(2, 5), 'CD'),
        ]);
        const current = userEdit.apply(text);
        (0, vitest_1.expect)(current).toStrictEqual(`abCDfg`);
        const suggestion = stringEdit_1.StringEdit.create([
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(1, 6), 'bCDEF'),
        ]);
        const applied = suggestion.apply(text);
        (0, vitest_1.expect)(applied).toStrictEqual(`abCDEFg`);
        const strict = (0, editRebase_1.tryRebaseStringEdits)(text, suggestion, userEdit, 'strict');
        (0, vitest_1.expect)(strict?.apply(current)).toStrictEqual('abCDEFg');
        (0, vitest_1.expect)(strict?.removeCommonSuffixAndPrefix(current).replacements.toString()).toMatchInlineSnapshot(`"[4, 5) -> "EF""`);
        const lenient = (0, editRebase_1.tryRebaseStringEdits)(text, suggestion, userEdit, 'lenient');
        (0, vitest_1.expect)(lenient?.apply(current)).toStrictEqual('abCDEFg');
        (0, vitest_1.expect)(lenient?.removeCommonSuffixAndPrefix(current).replacements.toString()).toMatchInlineSnapshot(`"[4, 5) -> "EF""`);
    });
    (0, vitest_1.test)('overlap: both replace in agreement 2', () => {
        const text = `abcdefg`;
        const userEdit = stringEdit_1.StringEdit.create([
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(1, 5), 'bC'),
        ]);
        const current = userEdit.apply(text);
        (0, vitest_1.expect)(current).toStrictEqual(`abCfg`);
        const suggestion = stringEdit_1.StringEdit.create([
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(2, 5), 'CDE'),
        ]);
        const applied = suggestion.apply(text);
        (0, vitest_1.expect)(applied).toStrictEqual(`abCDEfg`);
        const strict = (0, editRebase_1.tryRebaseStringEdits)(text, suggestion, userEdit, 'strict');
        (0, vitest_1.expect)(strict?.apply(current)).toStrictEqual('abCDEfg');
        (0, vitest_1.expect)(strict?.removeCommonSuffixAndPrefix(current).replacements.toString()).toMatchInlineSnapshot(`"[3, 3) -> "DE""`);
        const lenient = (0, editRebase_1.tryRebaseStringEdits)(text, suggestion, userEdit, 'lenient');
        (0, vitest_1.expect)(lenient?.apply(current)).toStrictEqual('abCDEfg');
        (0, vitest_1.expect)(lenient?.removeCommonSuffixAndPrefix(current).replacements.toString()).toMatchInlineSnapshot(`"[3, 3) -> "DE""`);
    });
    (0, vitest_1.test)('overlap: both insert in agreement with large offset', () => {
        const text = `abcdefg`;
        const userEdit = stringEdit_1.StringEdit.create([
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(7, 7), 'h'),
        ]);
        const current = userEdit.apply(text);
        (0, vitest_1.expect)(current).toStrictEqual(`abcdefgh`);
        const suggestion1 = stringEdit_1.StringEdit.create([
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(7, 7), 'x'.repeat(editRebase_1.maxAgreementOffset) + 'h'),
        ]);
        const applied1 = suggestion1.apply(text);
        (0, vitest_1.expect)(applied1).toStrictEqual(`abcdefg${'x'.repeat(editRebase_1.maxAgreementOffset)}h`);
        const strict1 = (0, editRebase_1.tryRebaseStringEdits)(text, suggestion1, userEdit, 'strict');
        (0, vitest_1.expect)(strict1?.apply(current)).toStrictEqual(applied1);
        (0, vitest_1.expect)(strict1?.removeCommonSuffixAndPrefix(current).replacements.toString()).toMatchInlineSnapshot(`"[7, 7) -> "${'x'.repeat(editRebase_1.maxAgreementOffset)}""`);
        const lenient1 = (0, editRebase_1.tryRebaseStringEdits)(text, suggestion1, userEdit, 'lenient');
        (0, vitest_1.expect)(lenient1?.apply(current)).toStrictEqual(applied1);
        (0, vitest_1.expect)(lenient1?.removeCommonSuffixAndPrefix(current).replacements.toString()).toMatchInlineSnapshot(`"[7, 7) -> "${'x'.repeat(editRebase_1.maxAgreementOffset)}""`);
        const suggestion2 = stringEdit_1.StringEdit.create([
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(7, 7), 'x'.repeat(editRebase_1.maxAgreementOffset + 1) + 'h'),
        ]);
        const applied2 = suggestion2.apply(text);
        (0, vitest_1.expect)(applied2).toStrictEqual(`abcdefg${'x'.repeat(editRebase_1.maxAgreementOffset + 1)}h`);
        (0, vitest_1.expect)((0, editRebase_1.tryRebaseStringEdits)(text, suggestion2, userEdit, 'strict')).toBeUndefined();
        const lenient2 = (0, editRebase_1.tryRebaseStringEdits)(text, suggestion2, userEdit, 'lenient');
        (0, vitest_1.expect)(lenient2?.apply(current)).toStrictEqual(applied2);
        (0, vitest_1.expect)(lenient2?.removeCommonSuffixAndPrefix(current).replacements.toString()).toMatchInlineSnapshot(`"[7, 7) -> "${'x'.repeat(editRebase_1.maxAgreementOffset + 1)}""`);
    });
    (0, vitest_1.test)('overlap: both insert in agreement with an offset with longish user edit', () => {
        const text = `abcdefg`;
        const userEdit1 = stringEdit_1.StringEdit.create([
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(7, 7), 'h'.repeat(editRebase_1.maxImperfectAgreementLength)),
        ]);
        const current1 = userEdit1.apply(text);
        (0, vitest_1.expect)(current1).toStrictEqual(`abcdefg${'h'.repeat(editRebase_1.maxImperfectAgreementLength)}`);
        const suggestion = stringEdit_1.StringEdit.create([
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(7, 7), `x${'h'.repeat(editRebase_1.maxImperfectAgreementLength + 2)}x`),
        ]);
        const applied = suggestion.apply(text);
        (0, vitest_1.expect)(applied).toStrictEqual(`abcdefgx${'h'.repeat(editRebase_1.maxImperfectAgreementLength + 2)}x`);
        const strict1 = (0, editRebase_1.tryRebaseStringEdits)(text, suggestion, userEdit1, 'strict');
        (0, vitest_1.expect)(strict1?.apply(current1)).toStrictEqual(applied);
        (0, vitest_1.expect)(strict1?.removeCommonSuffixAndPrefix(current1).replacements.toString()).toMatchInlineSnapshot(`"[7, ${7 + editRebase_1.maxImperfectAgreementLength}) -> "x${'h'.repeat(editRebase_1.maxImperfectAgreementLength + 2)}x""`);
        const lenient1 = (0, editRebase_1.tryRebaseStringEdits)(text, suggestion, userEdit1, 'lenient');
        (0, vitest_1.expect)(lenient1?.apply(current1)).toStrictEqual(applied);
        (0, vitest_1.expect)(lenient1?.removeCommonSuffixAndPrefix(current1).replacements.toString()).toMatchInlineSnapshot(`"[7, ${7 + editRebase_1.maxImperfectAgreementLength}) -> "x${'h'.repeat(editRebase_1.maxImperfectAgreementLength + 2)}x""`);
        const userEdit2 = stringEdit_1.StringEdit.create([
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(7, 7), 'h'.repeat(editRebase_1.maxImperfectAgreementLength + 1)),
        ]);
        const current2 = userEdit2.apply(text);
        (0, vitest_1.expect)(current2).toStrictEqual(`abcdefg${'h'.repeat(editRebase_1.maxImperfectAgreementLength + 1)}`);
        (0, vitest_1.expect)((0, editRebase_1.tryRebaseStringEdits)(text, suggestion, userEdit2, 'strict')).toBeUndefined();
        const lenient2 = (0, editRebase_1.tryRebaseStringEdits)(text, suggestion, userEdit2, 'lenient');
        (0, vitest_1.expect)(lenient2?.apply(current2)).toStrictEqual(applied);
        (0, vitest_1.expect)(lenient2?.removeCommonSuffixAndPrefix(current2).replacements.toString()).toMatchInlineSnapshot(`"[7, ${7 + editRebase_1.maxImperfectAgreementLength + 1}) -> "x${'h'.repeat(editRebase_1.maxImperfectAgreementLength + 2)}x""`);
    });
});
//# sourceMappingURL=editRebase.spec.js.map