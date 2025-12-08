"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.looksLikeDirectory = looksLikeDirectory;
const FILES_WITHOUT_EXTENSION = ['dockerfile', 'license', 'makefile', 'readme', 'procfile', 'gemfile', 'rakefile', 'jenkinsfile', 'vagrantfile'];
function looksLikeDirectory(filePath) {
    return /\.[^/.]+$/.test(filePath) && FILES_WITHOUT_EXTENSION.indexOf(filePath.toLowerCase()) === -1;
}
//# sourceMappingURL=fileSystem.js.map