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
Object.defineProperty(exports, "__esModule", { value: true });
exports.compareTreeWithSpec = compareTreeWithSpec;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const indentation_1 = require("../indentation");
const assert = __importStar(require("assert"));
/**
 * Asserts that two trees are isomorphic.
 * @param actual The tree to test.
 * @param expected The tree expected to be equal (source lines can be abbreviated with '...').
 * @param strictness Should the tree be deeply equal (including indentation and line numbers),
 * or is in enough for the children and types of each node match?
 * @param treeParent The tree's parent for context (optional)
 * @param parentIndex The index for the tree in its parent's subs (optional)
 */
function compareTreeWithSpec(actual, expected, strictness = 'strict', treeParent, parentIndex) {
    if (actual.type !== expected.type) {
        failCompare(actual, expected, `type of tree doesn't match, ${actual.type} ${expected.type}`, treeParent, parentIndex);
    }
    if (actual.subs.length !== expected.subs.length) {
        failCompare(actual, expected, 'number of children do not match', treeParent, parentIndex);
    }
    if (strictness === 'strict' && (0, indentation_1.isLine)(actual)) {
        if (actual.indentation !== expected.indentation) {
            failCompare(actual, expected, "virtual node indentation doesn't match", treeParent, parentIndex);
        }
    }
    for (let i = 0; i < actual.subs.length; ++i) {
        compareTreeWithSpec(actual.subs[i], expected.subs[i], strictness, actual, i);
    }
}
function failCompare(tree, expected, reason, treeParent, parentIndex) {
    assert.fail(`Reason: ${reason}
	Tree: ${(0, indentation_1.describeTree)(tree)}
	Expected: ${(0, indentation_1.describeTree)(expected)}`);
}
//# sourceMappingURL=testHelpers.js.map