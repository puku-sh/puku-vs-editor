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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FilePathLinkifier = void 0;
const fileSystemService_1 = require("../../../platform/filesystem/common/fileSystemService");
const fileTypes_1 = require("../../../platform/filesystem/common/fileTypes");
const workspaceService_1 = require("../../../platform/workspace/common/workspaceService");
const extpath_1 = require("../../../util/vs/base/common/extpath");
const network_1 = require("../../../util/vs/base/common/network");
const path = __importStar(require("../../../util/vs/base/common/path"));
const platform_1 = require("../../../util/vs/base/common/platform");
const resources = __importStar(require("../../../util/vs/base/common/resources"));
const uri_1 = require("../../../util/vs/base/common/uri");
const vscodeTypes_1 = require("../../../vscodeTypes");
const linkifiedText_1 = require("./linkifiedText");
// Create a single regex which runs different regexp parts in a big `|` expression.
const pathMatchRe = new RegExp([
    // [path/to/file.md](path/to/file.md) or [`path/to/file.md`](path/to/file.md)
    /\[(`?)(?<mdLinkText>[^`\]\)\n]+)\1\]\((?<mdLinkPath>[^`\s]+)\)/.source,
    // Inline code paths
    /(?<!\[)`(?<inlineCodePath>[^`\s]+)`(?!\])/.source,
    // File paths rendered as plain text
    /(?<![\[`()<])(?<plainTextPath>[^\s`*]+\.[^\s`*]+)(?![\]`])/.source
].join('|'), 'gu');
/**
 * Linkifies file paths in responses. This includes:
 *
 * ```
 * [file.md](file.md)
 * `file.md`
 * ```
 */
let FilePathLinkifier = class FilePathLinkifier {
    constructor(fileSystem, workspaceService) {
        this.fileSystem = fileSystem;
        this.workspaceService = workspaceService;
    }
    async linkify(text, context, token) {
        const parts = [];
        let endLastMatch = 0;
        for (const match of text.matchAll(pathMatchRe)) {
            const prefix = text.slice(endLastMatch, match.index);
            if (prefix) {
                parts.push(prefix);
            }
            const matched = match[0];
            let pathText;
            // For a md style link, require that the text and path are the same
            // However we have to have extra logic since the path may be encoded: `[file name](file%20name)`
            if (match.groups?.['mdLinkPath']) {
                let mdLinkPath = match.groups?.['mdLinkPath'];
                try {
                    mdLinkPath = decodeURIComponent(mdLinkPath);
                }
                catch {
                    // noop
                }
                if (mdLinkPath !== match.groups?.['mdLinkText']) {
                    pathText = undefined;
                }
                else {
                    pathText = mdLinkPath;
                }
            }
            pathText ??= match.groups?.['inlineCodePath'] ?? match.groups?.['plainTextPath'] ?? '';
            parts.push(this.resolvePathText(pathText, context)
                .then(uri => uri ? new linkifiedText_1.LinkifyLocationAnchor(uri) : matched));
            endLastMatch = match.index + matched.length;
        }
        const suffix = text.slice(endLastMatch);
        if (suffix) {
            parts.push(suffix);
        }
        return { parts: (0, linkifiedText_1.coalesceParts)(await Promise.all(parts)) };
    }
    async resolvePathText(pathText, context) {
        const workspaceFolders = this.workspaceService.getWorkspaceFolders();
        // Don't linkify very short paths such as '/' or special paths such as '../'
        if (pathText.length < 2 || ['../', '..\\', '/.', './', '\\.', '..'].includes(pathText)) {
            return;
        }
        if (pathText.startsWith('/') || (platform_1.isWindows && (pathText.startsWith('\\') || (0, extpath_1.hasDriveLetter)(pathText)))) {
            try {
                const uri = await this.statAndNormalizeUri(vscodeTypes_1.Uri.file(pathText.startsWith('/') ? path.posix.normalize(pathText) : path.normalize(pathText)));
                if (uri) {
                    if (path.posix.normalize(uri.path) === '/') {
                        return undefined;
                    }
                    return uri;
                }
            }
            catch {
                // noop
            }
        }
        // Handle paths that look like uris
        const scheme = pathText.match(/^([a-z]+):/i)?.[1];
        if (scheme) {
            try {
                const uri = vscodeTypes_1.Uri.parse(pathText);
                if (uri.scheme === network_1.Schemas.file || workspaceFolders.some(folder => folder.scheme === uri.scheme && folder.authority === uri.authority)) {
                    const statedUri = await this.statAndNormalizeUri(uri);
                    if (statedUri) {
                        return statedUri;
                    }
                }
            }
            catch {
                // Noop, parsing error
            }
            return;
        }
        for (const workspaceFolder of workspaceFolders) {
            const uri = await this.statAndNormalizeUri(vscodeTypes_1.Uri.joinPath(workspaceFolder, pathText));
            if (uri) {
                return uri;
            }
        }
        // Then fallback to checking references based on filename
        const name = path.basename(pathText);
        const refUri = context.references
            .map(ref => {
            if ('variableName' in ref.anchor) {
                return (0, uri_1.isUriComponents)(ref.anchor.value) ? ref.anchor.value : ref.anchor.value?.uri;
            }
            return (0, uri_1.isUriComponents)(ref.anchor) ? ref.anchor : ref.anchor.uri;
        })
            .filter((item) => !!item)
            .find(refUri => resources.basename(refUri) === name);
        return refUri;
    }
    async statAndNormalizeUri(uri) {
        try {
            const stat = await this.fileSystem.stat(uri);
            if (stat.type === fileTypes_1.FileType.Directory) {
                // Ensure all dir paths have a trailing slash for icon rendering
                return uri.path.endsWith('/') ? uri : uri.with({ path: `${uri.path}/` });
            }
            return uri;
        }
        catch {
            return undefined;
        }
    }
};
exports.FilePathLinkifier = FilePathLinkifier;
exports.FilePathLinkifier = FilePathLinkifier = __decorate([
    __param(0, fileSystemService_1.IFileSystemService),
    __param(1, workspaceService_1.IWorkspaceService)
], FilePathLinkifier);
//# sourceMappingURL=filePathLinkifier.js.map