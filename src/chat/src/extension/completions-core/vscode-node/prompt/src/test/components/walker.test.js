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
const walker_1 = require("../../components/walker");
const assert = __importStar(require("assert"));
suite('Snapshot Walker', function () {
    test('walks snapshot recursively', function () {
        const snapshot = createTestSnapshot(1, 1);
        const walker = new walker_1.SnapshotWalker(snapshot);
        const visitedValues = [];
        walker.walkSnapshot((node, parent, context) => {
            visitedValues.push(node.path ?? 'undefined');
            return true;
        });
        assert.deepStrictEqual(visitedValues, ['0', '0.0']);
    });
    test('stops walking after visitor returns false', function () {
        const snapshot = createTestSnapshot(2, 2);
        const walker = new walker_1.SnapshotWalker(snapshot);
        const visitedPaths = [];
        walker.walkSnapshot((node, parent, context) => {
            visitedPaths.push(node.path);
            return false;
        });
        assert.deepStrictEqual(visitedPaths, ['0']);
    });
    test('walks deeper nested snapshot', function () {
        const snapshot = createTestSnapshot(3, 2);
        const walker = new walker_1.SnapshotWalker(snapshot);
        const paths = [];
        walker.walkSnapshot((node, parent, context) => {
            paths.push(node.path);
            return true;
        });
        assert.deepStrictEqual(paths, [
            '0',
            '0.0',
            '0.0.0',
            '0.0.0.0',
            '0.0.0.1',
            '0.0.1',
            '0.0.1.0',
            '0.0.1.1',
            '0.1',
            '0.1.0',
            '0.1.0.0',
            '0.1.0.1',
            '0.1.1',
            '0.1.1.0',
            '0.1.1.1',
        ]);
    });
    test('carries weight relative to parent weight', function () {
        const snapshot = {
            name: 'root',
            path: '0',
            value: '0',
            props: { weight: 0.5 },
            children: [
                {
                    name: 'child',
                    path: '0.0',
                    value: '1',
                    props: { weight: 0.5 },
                    statistics: {},
                },
            ],
            statistics: {},
        };
        const walker = new walker_1.SnapshotWalker(snapshot);
        const weights = [];
        walker.walkSnapshot((node, parent, context) => {
            weights.push(context.weight);
            return true;
        });
        assert.deepStrictEqual(weights, [0.5, 0.25]); // root: 0.5, child: 0.5 * 0.5
    });
    test('propagates chunks to children', function () {
        const snapshot = {
            name: 'Chunk',
            path: '0',
            value: 'chunk1',
            statistics: {},
            children: [
                {
                    name: 'child',
                    path: '0.0',
                    value: 'child1',
                    statistics: {},
                },
            ],
        };
        const walker = new walker_1.SnapshotWalker(snapshot);
        const chunks = [];
        walker.walkSnapshot((node, parent, context) => {
            chunks.push(context.chunks);
            return true;
        });
        assert.deepStrictEqual(chunks.length, 2);
        const chunk = new Set(['0']);
        assert.deepStrictEqual(chunks[0], chunk);
        assert.deepStrictEqual(chunks[1], chunk);
    });
    test('propagates nested chunks', function () {
        const snapshot = {
            name: 'Chunk',
            path: '0',
            value: 'chunk1',
            statistics: {},
            children: [
                {
                    name: 'child',
                    path: '0.0',
                    value: 'child1',
                    statistics: {},
                },
                {
                    name: 'Chunk',
                    path: '0.1',
                    value: 'chunk2',
                    statistics: {},
                    children: [
                        {
                            name: 'child',
                            path: '0.1.0',
                            value: 'child2',
                            statistics: {},
                        },
                    ],
                },
            ],
        };
        const walker = new walker_1.SnapshotWalker(snapshot);
        const chunks = [];
        walker.walkSnapshot((node, parent, context) => {
            chunks.push(context.chunks);
            return true;
        });
        assert.deepStrictEqual(chunks.length, 4);
        const chunk = new Set(['0']);
        const nestedChunk = new Set(['0', '0.1']);
        assert.deepStrictEqual(chunks[0], chunk);
        assert.deepStrictEqual(chunks[1], chunk);
        assert.deepStrictEqual(chunks[2], nestedChunk);
        assert.deepStrictEqual(chunks[3], nestedChunk);
    });
    test('propagates source to children', function () {
        const snapshot = {
            name: 'root',
            path: '0',
            value: 'root',
            props: { source: 'source1' },
            statistics: {},
            children: [
                {
                    name: 'child',
                    path: '0.0',
                    value: 'child',
                    statistics: {},
                },
            ],
        };
        const walker = new walker_1.SnapshotWalker(snapshot);
        const sources = [];
        walker.walkSnapshot((node, parent, context) => {
            sources.push(context.source);
            return true;
        });
        assert.deepStrictEqual(sources, ['source1', 'source1']);
    });
    function createTestSnapshot(depth, childrenCount = 3, currentPath = '') {
        if (depth <= 0) {
            return {
                name: 'leaf',
                path: currentPath || '0',
                value: currentPath || '0',
                statistics: {},
            };
        }
        const children = [];
        const nodeIndex = currentPath || '0';
        // Create configurable number of children at each level
        for (let i = 0; i < childrenCount; i++) {
            const childPath = `${nodeIndex}.${i}`;
            children.push(createTestSnapshot(depth - 1, childrenCount, childPath));
        }
        return {
            name: `node-${nodeIndex}`,
            path: nodeIndex,
            value: nodeIndex,
            children,
            statistics: {},
        };
    }
});
//# sourceMappingURL=walker.test.js.map