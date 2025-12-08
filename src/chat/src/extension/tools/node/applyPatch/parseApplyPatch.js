"use strict";
// Copyright 2025 OpenAI
Object.defineProperty(exports, "__esModule", { value: true });
exports.HUNK_DELETE_LINE_PREFIX = exports.HUNK_ADD_LINE_PREFIX = exports.END_OF_FILE_PREFIX = exports.MOVE_FILE_TO_PREFIX = exports.UPDATE_FILE_PREFIX = exports.DELETE_FILE_PREFIX = exports.ADD_FILE_PREFIX = exports.PATCH_SUFFIX = exports.PATCH_PREFIX = void 0;
exports.parseApplyPatch = parseApplyPatch;
exports.PATCH_PREFIX = "*** Begin Patch\n";
exports.PATCH_SUFFIX = "\n*** End Patch";
exports.ADD_FILE_PREFIX = "*** Add File: ";
exports.DELETE_FILE_PREFIX = "*** Delete File: ";
exports.UPDATE_FILE_PREFIX = "*** Update File: ";
exports.MOVE_FILE_TO_PREFIX = "*** Move to: ";
exports.END_OF_FILE_PREFIX = "*** End of File";
exports.HUNK_ADD_LINE_PREFIX = "+";
exports.HUNK_DELETE_LINE_PREFIX = "-";
/**
 * @returns null when the patch is invalid
 */
function parseApplyPatch(patch) {
    if (!patch.startsWith(exports.PATCH_PREFIX)) {
        // Patch must begin with '*** Begin Patch'
        return null;
    }
    else if (!patch.endsWith(exports.PATCH_SUFFIX)) {
        // Patch must end with '*** End Patch'
        return null;
    }
    const patchBody = patch.slice(exports.PATCH_PREFIX.length, patch.length - exports.PATCH_SUFFIX.length);
    const lines = patchBody.split("\n");
    const ops = [];
    for (const line of lines) {
        if (line.startsWith(exports.END_OF_FILE_PREFIX)) {
            continue;
        }
        else if (line.startsWith(exports.ADD_FILE_PREFIX)) {
            ops.push({
                type: "create",
                path: line.slice(exports.ADD_FILE_PREFIX.length).trim(),
                content: "",
            });
            continue;
        }
        else if (line.startsWith(exports.DELETE_FILE_PREFIX)) {
            ops.push({
                type: "delete",
                path: line.slice(exports.DELETE_FILE_PREFIX.length).trim(),
            });
            continue;
        }
        else if (line.startsWith(exports.UPDATE_FILE_PREFIX)) {
            ops.push({
                type: "update",
                path: line.slice(exports.UPDATE_FILE_PREFIX.length).trim(),
                update: "",
                added: 0,
                deleted: 0,
            });
            continue;
        }
        const lastOp = ops[ops.length - 1];
        if (lastOp?.type === "create") {
            lastOp.content = appendLine(lastOp.content, line.slice(exports.HUNK_ADD_LINE_PREFIX.length));
            continue;
        }
        if (lastOp?.type !== "update") {
            // Expected update op but got ${lastOp?.type} for line ${line}
            return null;
        }
        if (line.startsWith(exports.HUNK_ADD_LINE_PREFIX)) {
            lastOp.added += 1;
        }
        else if (line.startsWith(exports.HUNK_DELETE_LINE_PREFIX)) {
            lastOp.deleted += 1;
        }
        lastOp.update += lastOp.update ? "\n" + line : line;
    }
    return ops;
}
function appendLine(content, line) {
    if (!content.length) {
        return line;
    }
    return [content, line].join("\n");
}
//# sourceMappingURL=parseApplyPatch.js.map