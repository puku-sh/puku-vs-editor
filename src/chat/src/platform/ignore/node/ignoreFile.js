"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgnoreFile = void 0;
const gitignore_to_minimatch_1 = require("@humanwhocodes/gitignore-to-minimatch");
const ignore_1 = __importDefault(require("ignore"));
const path_1 = require("../../../util/vs/base/common/path");
const strings_1 = require("../../../util/vs/base/common/strings");
class IgnoreFile {
    constructor() {
        this._ignoreMap = new Map();
        this._ignoreCache = new Map();
        this._searchRankCache = null;
    }
    /**
     * With a given ignore file, create the ignore instance and add its contents
     */
    setIgnoreFile(workspaceRoot, ignoreFile, contents) {
        let scope = '';
        if (workspaceRoot) {
            scope = (0, path_1.relative)(workspaceRoot.fsPath, (0, path_1.dirname)(ignoreFile.fsPath));
            if (scope.startsWith('..')) {
                scope = '';
            }
        }
        this._ignoreMap.set(ignoreFile.fsPath, {
            ignore: (0, ignore_1.default)().add(contents),
            patterns: (0, strings_1.splitLines)(contents)
                // Remove comments and empty lines
                .filter(x => x.trim() && !x.startsWith('#'))
                .map(gitignore_to_minimatch_1.gitignoreToMinimatch)
                .map(pattern => scope ? path_1.posix.join(scope, pattern) : pattern)
        });
        this._searchRankCache = null;
        this._ignoreCache.clear();
    }
    /**
     * Removes the ignore file from being tracked
     * @param ignoreFile The ignore file URI
     */
    removeIgnoreFile(ignoreFile) {
        this._ignoreMap.delete(ignoreFile.fsPath);
        this._searchRankCache = null;
        this._ignoreCache.clear();
    }
    /**
        * Remove all ignore instances for a given workspace
    */
    removeWorkspace(workspace) {
        let count = 0;
        for (const f of this._ignoreMap.keys()) {
            if (isDescendant(workspace.fsPath, f)) {
                this._ignoreMap.delete(f);
                count += 1;
            }
        }
        if (count > 0) {
            // Invalidate the search rank cache
            this._searchRankCache = null;
            this._ignoreCache.clear();
        }
    }
    asMinimatchPatterns() {
        return [...this._ignoreMap.values()].flatMap(x => x.patterns);
    }
    /**
     * Check if a given file is ignored finding its ignore instance first
     */
    isIgnored(file) {
        if (this._ignoreMap.size === 0) {
            return false;
        }
        const target = file.fsPath;
        if (this._ignoreCache.has(target)) {
            return this._ignoreCache.get(target);
        }
        let ignoreIterations = 0;
        let result = { ignored: false, unignored: false };
        try {
            // We need to traverse up the tree using the first file we see, if it doesnt exist continue looking
            const searchRank = this._searchRank;
            for (const cur of searchRank) {
                ignoreIterations += 1;
                const dir = (0, path_1.dirname)(cur); // is like /Users/username/Project/
                const rel = (0, path_1.relative)(dir, target); // is like src/index.ts
                if (rel.startsWith('..')) {
                    continue; // is outside of the scope of this file
                }
                // if the target is a descendant of the ignore location, check this ignore file
                if (dir !== target && isDescendant(dir, target)) {
                    const entry = this._ignoreMap.get(cur);
                    if (!entry) {
                        throw new Error(`No ignore patterns found for ${cur}`);
                    }
                    result = entry.ignore.test(rel);
                    if (result.ignored || result.unignored) {
                        break;
                    }
                }
            }
            this._ignoreCache.set(target, result.ignored);
            return result.ignored;
        }
        catch {
            return false;
        }
    }
    get _searchRank() {
        if (this._searchRankCache !== null) {
            return this._searchRankCache;
        }
        const cache = {};
        const toRank = (value) => value.split(path_1.sep).length;
        return (this._searchRankCache = [...this._ignoreMap.keys()].sort((a, b) => (cache[b] ||= toRank(b)) - (cache[a] ||= toRank(a))));
    }
}
exports.IgnoreFile = IgnoreFile;
/**
 * Checks if a path is a descendant of another path
 * @param parent The parent path
 * @param descendant The descendant path
 * @returns True if a descendant, false otherwise
 */
function isDescendant(parent, descendant) {
    if (parent === descendant) {
        return true;
    }
    if (parent.charAt(parent.length - 1) !== path_1.sep) {
        parent += path_1.sep;
    }
    return (0, path_1.normalize)(descendant).startsWith((0, path_1.normalize)(parent));
}
//# sourceMappingURL=ignoreFile.js.map