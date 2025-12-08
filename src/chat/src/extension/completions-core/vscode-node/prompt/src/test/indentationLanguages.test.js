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
const assert = __importStar(require("assert"));
const ts_dedent_1 = __importDefault(require("ts-dedent"));
const indentation_1 = require("../indentation");
const testHelpers_1 = require("./testHelpers");
/** Test some language specific parsing techniques */
suite('Java', function () {
    test('method detection in Java', function () {
        const source = (0, ts_dedent_1.default) `
		// first an import
		import java.util.List;

		@Override
		public class Test {
			public static void main(String[] args) {
				System.out.println("Hello World!");

			}

			@Override
			private List<String> list;
		}`;
        const javaParsedTree = (0, indentation_1.parseTree)(source, 'java');
        // we should have picked up the correct labels
        const lineLabels = [];
        (0, indentation_1.visitTree)(javaParsedTree, node => {
            if ((0, indentation_1.isLine)(node) && node.label) {
                lineLabels.push(node.label);
            }
        }, 'topDown');
        assert.deepStrictEqual(lineLabels, [
            'comment_single',
            'import',
            // blank
            'annotation',
            'class',
            'member',
            // not labelled
            'closer',
            // blank
            'member', // as per explicit comment, the annotations within a class are relabeled 'member,
            'member',
            'closer',
        ]);
    });
    test('labelLines java', function () {
        const tree = (0, indentation_1.parseTree)((0, ts_dedent_1.default) `
package com.example;
import java.awt.*;
@annotation
final public class A {
    /** A javadoc
     *  Second line
     */
    public static void main(String[] args) {
        // single-line comment
        /* Multiline
         * comment
         */
        System.out.println("Hello, world!");
    }
}
public interface I { }
`, 'java');
        (0, testHelpers_1.compareTreeWithSpec)(tree, (0, indentation_1.topNode)([
            (0, indentation_1.lineNode)(0, 0, 'pa...', [], 'package'),
            (0, indentation_1.lineNode)(0, 1, 'imp..', [], 'import'),
            (0, indentation_1.lineNode)(0, 2, '@ann...', [], 'annotation'),
            (0, indentation_1.lineNode)(0, 3, 'cla...', [
                (0, indentation_1.lineNode)(4, 4, '/**...', [(0, indentation_1.lineNode)(5, 5, '* ...', []), (0, indentation_1.lineNode)(5, 6, '* ...', [])], 'javadoc'),
                (0, indentation_1.lineNode)(4, 7, 'public...', [
                    (0, indentation_1.lineNode)(8, 8, '//...', [], 'comment_single'),
                    (0, indentation_1.lineNode)(8, 9, '/*...', [(0, indentation_1.lineNode)(9, 10, '* ...', []), (0, indentation_1.lineNode)(9, 11, '*/', [])], 'comment_multi'),
                    (0, indentation_1.lineNode)(8, 12, 'System ...', []),
                    (0, indentation_1.lineNode)(4, 13, '}', [], 'closer'),
                ]),
                (0, indentation_1.lineNode)(0, 14, '}', [], 'closer'),
            ], 'class'),
            (0, indentation_1.lineNode)(0, 15, 'public...', [], 'interface'),
        ]));
    });
    test('parse Java fields', function () {
        //TODO: Add a field with annotation on separate line
        const tree = (0, indentation_1.parseTree)((0, ts_dedent_1.default) `
class A {
    int a;
    /** Javadoc */
    int b;
    // Comment
    @Native int c;
}
`, 'java');
        (0, testHelpers_1.compareTreeWithSpec)(tree, (0, indentation_1.topNode)([
            (0, indentation_1.lineNode)(0, 0, 'class...', [
                (0, indentation_1.lineNode)(4, 1, 'int a;', [], 'member'),
                (0, indentation_1.lineNode)(4, 2, '/**...', [], 'javadoc'),
                (0, indentation_1.lineNode)(4, 3, 'int b;', [], 'member'),
                (0, indentation_1.lineNode)(4, 4, '//...', [], 'comment_single'),
                (0, indentation_1.lineNode)(4, 5, '@Native int c;', [], 'member'),
                (0, indentation_1.lineNode)(0, 6, '}', [], 'closer'),
            ], 'class'),
        ]));
    });
    test('parse Java inner class', function () {
        const tree = (0, indentation_1.parseTree)((0, ts_dedent_1.default) `
class A {
    int a;

    class Inner {
        int b;
    }

    interface InnerInterface {
        int myMethod();
    }
}
`, 'java');
        (0, testHelpers_1.compareTreeWithSpec)(tree, (0, indentation_1.topNode)([
            (0, indentation_1.lineNode)(0, 0, 'class A {', [
                (0, indentation_1.lineNode)(4, 1, 'int a;', [], 'member'),
                (0, indentation_1.blankNode)(2),
                (0, indentation_1.lineNode)(4, 3, 'class Inner ...', [(0, indentation_1.lineNode)(8, 4, 'int b;', [], 'member'), (0, indentation_1.lineNode)(4, 5, '}', [], 'closer')], 'class'),
                (0, indentation_1.blankNode)(6),
                (0, indentation_1.lineNode)(4, 7, 'interface InnerInterface ...', [(0, indentation_1.lineNode)(8, 8, 'int myMethod();', [], 'member'), (0, indentation_1.lineNode)(4, 9, '}', [], 'closer')], 'interface'),
                (0, indentation_1.lineNode)(0, 10, '}', [], 'closer'),
            ], 'class'),
        ]));
    });
});
suite('Markdown', function () {
    test('header processing in markdown', function () {
        const source = (0, ts_dedent_1.default) `
A

# B
C
D

## E
F
G

# H
I

### J
K

L
M
`;
        const mdParsedTree = (0, indentation_1.parseTree)(source, 'markdown');
        (0, testHelpers_1.compareTreeWithSpec)(mdParsedTree, (0, indentation_1.topNode)([
            (0, indentation_1.virtualNode)(0, [(0, indentation_1.lineNode)(0, 0, 'A', []), (0, indentation_1.blankNode)(1)]),
            (0, indentation_1.virtualNode)(0, [
                (0, indentation_1.lineNode)(0, 2, '# B', [
                    (0, indentation_1.virtualNode)(0, [(0, indentation_1.lineNode)(0, 3, 'C', []), (0, indentation_1.lineNode)(0, 4, 'D', []), (0, indentation_1.blankNode)(5)]),
                    (0, indentation_1.lineNode)(0, 6, '## E', [(0, indentation_1.lineNode)(0, 7, 'F', []), (0, indentation_1.lineNode)(0, 8, 'G', []), (0, indentation_1.blankNode)(9)], 'subheading'),
                ], 'heading'),
                (0, indentation_1.lineNode)(0, 10, '# H', [
                    (0, indentation_1.virtualNode)(0, [(0, indentation_1.lineNode)(0, 11, 'I', []), (0, indentation_1.blankNode)(12)]),
                    (0, indentation_1.lineNode)(0, 13, '### J', [
                        (0, indentation_1.virtualNode)(0, [(0, indentation_1.lineNode)(0, 14, 'K', []), (0, indentation_1.blankNode)(15)]),
                        (0, indentation_1.virtualNode)(0, [(0, indentation_1.lineNode)(0, 16, 'L', []), (0, indentation_1.lineNode)(0, 17, 'M', [])]),
                    ], 'subsubheading'),
                ], 'heading'),
            ]),
        ]));
    });
});
//# sourceMappingURL=indentationLanguages.test.js.map