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
exports.NodeFileSystemService = void 0;
exports.readFileFromTextBufferOrFS = readFileFromTextBufferOrFS;
const fs = __importStar(require("fs"));
const event_1 = require("../../../util/vs/base/common/event");
const resources_1 = require("../../../util/vs/base/common/resources");
const fileSystemService_1 = require("../common/fileSystemService");
const fileTypes_1 = require("../common/fileTypes");
class NodeFileSystemService {
    async stat(uri) {
        const stat = await fs.promises.stat(uri.fsPath);
        return {
            type: stat.isFile() ? fileTypes_1.FileType.File : fileTypes_1.FileType.Directory,
            ctime: stat.ctimeMs,
            mtime: stat.mtimeMs,
            size: stat.size
        };
    }
    async readDirectory(uri) {
        assetIsFileUri(uri);
        const readDir = await fs.promises.readdir(uri.fsPath, { withFileTypes: true });
        const result = [];
        for (const file of readDir) {
            result.push([file.name, file.isFile() ? fileTypes_1.FileType.File : fileTypes_1.FileType.Directory]);
        }
        return result;
    }
    async createDirectory(uri) {
        assetIsFileUri(uri);
        return fs.promises.mkdir(uri.fsPath);
    }
    async readFile(uri, disableLimit) {
        assetIsFileUri(uri);
        await (0, fileSystemService_1.assertReadFileSizeLimit)(this, uri, disableLimit);
        return fs.promises.readFile(uri.fsPath);
    }
    async writeFile(uri, content) {
        assetIsFileUri(uri);
        await fs.promises.mkdir((0, resources_1.dirname)(uri).fsPath, { recursive: true });
        return fs.promises.writeFile(uri.fsPath, content);
    }
    async delete(uri, options) {
        assetIsFileUri(uri);
        return fs.promises.rm(uri.fsPath, { recursive: options?.recursive ?? false });
    }
    async rename(oldURI, newURI, options) {
        assetIsFileUri(oldURI);
        assetIsFileUri(newURI);
        // Check if new path exists if overwrite is not set return
        if (!options?.overwrite && fs.existsSync(newURI.fsPath)) {
            return;
        }
        return fs.promises.rename(oldURI.fsPath, newURI.fsPath);
    }
    async copy(source, destination, options) {
        assetIsFileUri(source);
        assetIsFileUri(destination);
        // Calculate copy contants based on overwrite option
        const copyConstant = options?.overwrite ? fs.constants.COPYFILE_FICLONE : fs.constants.COPYFILE_EXCL;
        return fs.promises.copyFile(source.fsPath, destination.fsPath, copyConstant);
    }
    isWritableFileSystem(scheme) {
        return true;
    }
    createFileSystemWatcher(_glob) {
        return new class {
            constructor() {
                this.ignoreCreateEvents = false;
                this.ignoreChangeEvents = false;
                this.ignoreDeleteEvents = false;
                this.onDidCreate = event_1.Event.None;
                this.onDidChange = event_1.Event.None;
                this.onDidDelete = event_1.Event.None;
            }
            dispose() {
                // noop
            }
        };
    }
}
exports.NodeFileSystemService = NodeFileSystemService;
/**
 * A helper utility to read a file from the open text buffer if applicable otherwise from the filesystem.
 * This can be useful when you want to get the contents that are shown in the editor if a file is open, otherwise delegate to disk
 * @param fileSystemService The filesystem service
 * @param workspaceService The workspace service
 * @param uri The uri to read
 * @param maxBytesToRead An optional max bytes to read from the file system. If open, the entire document is always read.
 * @returns A promise that resolves to the file content or the file buffer
 */
async function readFileFromTextBufferOrFS(fileSystemService, workspaceService, uri, maxBytesToRead) {
    // First check open text documents
    const file = workspaceService.textDocuments.find(d => (0, resources_1.isEqual)(d.uri, uri));
    if (file) {
        return file.getText();
    }
    try {
        assetIsFileUri(uri);
        if (maxBytesToRead !== undefined) {
            const fileHandle = await fs.promises.open(uri.fsPath, 'r');
            try {
                const buffer = Buffer.alloc(maxBytesToRead);
                const { bytesRead } = await fileHandle.read(buffer, 0, maxBytesToRead, 0);
                return buffer.subarray(0, bytesRead);
            }
            finally {
                await fileHandle.close();
            }
        }
        return fileSystemService.readFile(uri);
    }
    catch {
        const buffer = await fileSystemService.readFile(uri);
        if (maxBytesToRead) {
            return buffer.subarray(0, maxBytesToRead);
        }
        return buffer;
    }
}
function assetIsFileUri(uri) {
    if (uri.scheme !== 'file') {
        throw new Error(`URI must be of file scheme, received ${uri.scheme}`);
    }
}
//# sourceMappingURL=fileSystemServiceImpl.js.map