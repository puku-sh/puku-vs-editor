"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestPromptPathRepresentationService = exports.PromptPathRepresentationService = exports.IPromptPathRepresentationService = void 0;
const services_1 = require("../../../util/common/services");
const extpath_1 = require("../../../util/vs/base/common/extpath");
const network_1 = require("../../../util/vs/base/common/network");
const platform_1 = require("../../../util/vs/base/common/platform");
const uri_1 = require("../../../util/vs/base/common/uri");
exports.IPromptPathRepresentationService = (0, services_1.createServiceIdentifier)('IPromptPathRepresentationService');
/**
 * Used to represent file URIs in prompts. Typically, this happens in code blocks using the `filepath` comment.
 * Using the service makes sure this happens in a consistent and portable way across prompt elements.
 * When creating a prompt, use `getFilePath` to get the string to use as a `filepath`.
 * When readong a LLM response, use `resolveFilePath` to get the URI from from a `filepath`
 *
 * Do not use this service for other usages than prompts.
 * We currently use the fsPath for local and remote filesystems, and URI.toString() for other schemes.
 */
class PromptPathRepresentationService {
    isWindows() {
        return platform_1.isWindows;
    }
    getFilePath(uri) {
        if (uri.scheme === network_1.Schemas.file || uri.scheme === network_1.Schemas.vscodeRemote) {
            return uri.fsPath;
        }
        return uri.toString();
    }
    /**
     * Resolves an `filepath` used in a prompt to a URI. The `filepath` should have been created by `getFilePath`.
     *
     * @param filepath The file path to resolve.
     * @param predominantScheme The predominant scheme to use if the path is a file path. Defaults to 'file'.
     *
     * @returns The resolved URI or undefined if filepath does not look like a file path or URI.
     */
    resolveFilePath(filepath, predominantScheme = network_1.Schemas.file) {
        // Always check for posix-like absolute paths, and also for platform-like
        // (i.e. Windows) absolute paths in case the model generates them.
        const isPosixPath = filepath.startsWith('/');
        const isWindowsPath = this.isWindows() && ((0, extpath_1.hasDriveLetter)(filepath) || filepath.startsWith('\\'));
        if (isPosixPath || isWindowsPath) {
            // Some models double-escape backslashes, which causes problems down the line.
            // Remove repeated backslashes from windows path (but preserve UNC paths)
            if (isWindowsPath) {
                const isUncPath = filepath.startsWith('\\\\');
                filepath = filepath.replace(/\\+/g, '\\');
                if (isUncPath) {
                    filepath = '\\' + filepath;
                }
            }
            const fileUri = uri_1.URI.file(filepath);
            return predominantScheme === network_1.Schemas.file ? fileUri : uri_1.URI.from({ scheme: predominantScheme, path: fileUri.path });
        }
        if (/\w[\w\d+.-]*:\S/.test(filepath)) { // starts with a scheme
            try {
                return uri_1.URI.parse(filepath);
            }
            catch (e) {
                return undefined;
            }
        }
        return undefined;
    }
    getExampleFilePath(absolutePosixFilePath) {
        if (this.isWindows()) {
            return this.getFilePath(uri_1.URI.parse(`file:///C:${absolutePosixFilePath}`));
        }
        else {
            return this.getFilePath(uri_1.URI.parse(`file://${absolutePosixFilePath}`));
        }
    }
}
exports.PromptPathRepresentationService = PromptPathRepresentationService;
/**
 * For testing we don't want OS dependent paths as they end up in the cache, so we use the posix path for all platforms.
 */
class TestPromptPathRepresentationService extends PromptPathRepresentationService {
    getFilePath(uri) {
        if (uri.scheme === network_1.Schemas.file || uri.scheme === network_1.Schemas.vscodeRemote) {
            return uri.path;
        }
        return uri.toString();
    }
    getExampleFilePath(absolutePosixFilePath) {
        return this.getFilePath(uri_1.URI.parse(`file://${absolutePosixFilePath}`));
    }
}
exports.TestPromptPathRepresentationService = TestPromptPathRepresentationService;
//# sourceMappingURL=promptPathRepresentationService.js.map