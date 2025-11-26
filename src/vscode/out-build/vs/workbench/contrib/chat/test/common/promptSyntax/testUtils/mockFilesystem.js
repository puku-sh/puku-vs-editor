/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { URI } from '../../../../../../../base/common/uri.js';
import { VSBuffer } from '../../../../../../../base/common/buffer.js';
import { IFileService } from '../../../../../../../platform/files/common/files.js';
import { dirname } from '../../../../../../../base/common/resources.js';
/**
 * Creates mock filesystem from provided file entries.
 * @param fileService File service instance
 * @param files Array of file entries with path and contents
 */
export function mockFiles(fileService, files, parentFolder) {
    return new MockFilesystem(files, fileService).mock(parentFolder);
}
/**
 * Utility to recursively creates provided filesystem structure.
 */
let MockFilesystem = class MockFilesystem {
    constructor(input, fileService) {
        this.input = input;
        this.fileService = fileService;
        this.createdFiles = [];
        this.createdFolders = [];
        this.createdRootFolders = [];
    }
    /**
     * Starts the mock process.
     */
    async mock(parentFolder) {
        // Check if input is the new simplified format
        if (this.input.length > 0 && 'path' in this.input[0]) {
            return this.mockFromFileEntries(this.input);
        }
        // Use the old format
        return this.mockFromFolders(this.input, parentFolder);
    }
    /**
     * Mock using the new simplified file entry format.
     */
    async mockFromFileEntries(fileEntries) {
        // Create all files and their parent directories
        for (const fileEntry of fileEntries) {
            const fileUri = URI.file(fileEntry.path);
            // Ensure parent directories exist
            await this.ensureParentDirectories(dirname(fileUri));
            // Create the file
            const contents = fileEntry.contents.join('\n');
            await this.fileService.writeFile(fileUri, VSBuffer.fromString(contents));
            this.createdFiles.push(fileUri);
        }
    }
    /**
     * Mock using the old nested folder format.
     */
    async mockFromFolders(folders, parentFolder) {
        const result = await Promise.all(folders.map((folder) => this.mockFolder(folder, parentFolder)));
        this.createdRootFolders.push(...result);
    }
    async delete() {
        // Delete files created by the new format
        for (const fileUri of this.createdFiles) {
            if (await this.fileService.exists(fileUri)) {
                await this.fileService.del(fileUri, { useTrash: false });
            }
        }
        for (const folderUri of this.createdFolders.reverse()) { // reverse to delete children first
            if (await this.fileService.exists(folderUri)) {
                await this.fileService.del(folderUri, { recursive: true, useTrash: false });
            }
        }
        // Delete root folders created by the old format
        for (const folder of this.createdRootFolders) {
            await this.fileService.del(folder, { recursive: true, useTrash: false });
        }
    }
    /**
     * The internal implementation of the filesystem mocking process for the old format.
     */
    async mockFolder(folder, parentFolder) {
        const folderUri = parentFolder
            ? URI.joinPath(parentFolder, folder.name)
            : URI.file(folder.name);
        if (!(await this.fileService.exists(folderUri))) {
            try {
                await this.fileService.createFolder(folderUri);
            }
            catch (error) {
                throw new Error(`Failed to create folder '${folderUri.fsPath}': ${error}.`);
            }
        }
        const resolvedChildren = [];
        for (const child of folder.children) {
            const childUri = URI.joinPath(folderUri, child.name);
            // create child file
            if ('contents' in child) {
                const contents = (typeof child.contents === 'string')
                    ? child.contents
                    : child.contents.join('\n');
                await this.fileService.writeFile(childUri, VSBuffer.fromString(contents));
                resolvedChildren.push(childUri);
                continue;
            }
            // recursively create child filesystem structure
            resolvedChildren.push(await this.mockFolder(child, folderUri));
        }
        return folderUri;
    }
    /**
     * Ensures that all parent directories of the given file URI exist.
     */
    async ensureParentDirectories(dirUri) {
        if (!await this.fileService.exists(dirUri)) {
            if (dirUri.path === '/') {
                try {
                    await this.fileService.createFolder(dirUri);
                    this.createdFolders.push(dirUri);
                }
                catch (error) {
                    throw new Error(`Failed to create directory '${dirUri.toString()}': ${error}.`);
                }
            }
            else {
                await this.ensureParentDirectories(dirname(dirUri));
            }
        }
    }
};
MockFilesystem = __decorate([
    __param(1, IFileService)
], MockFilesystem);
export { MockFilesystem };
//# sourceMappingURL=mockFilesystem.js.map