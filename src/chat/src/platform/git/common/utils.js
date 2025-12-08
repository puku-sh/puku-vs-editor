"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseGitRemotes = parseGitRemotes;
exports.toGitUri = toGitUri;
class GitConfigParser {
    static { this._lineSeparator = /\r?\n/; }
    static { this._propertyRegex = /^\s*(\w+)\s*=\s*"?([^"]+)"?$/; }
    static { this._sectionRegex = /^\s*\[\s*([^\]]+?)\s*(\"[^"]+\")*\]\s*$/; }
    static parse(raw) {
        const config = { sections: [] };
        let section = { name: 'DEFAULT', properties: {} };
        const addSection = (section) => {
            if (!section) {
                return;
            }
            config.sections.push(section);
        };
        for (const line of raw.split(GitConfigParser._lineSeparator)) {
            // Section
            const sectionMatch = line.match(GitConfigParser._sectionRegex);
            if (sectionMatch?.length === 3) {
                addSection(section);
                section = { name: sectionMatch[1], subSectionName: sectionMatch[2]?.replaceAll('"', ''), properties: {} };
                continue;
            }
            // Property
            const propertyMatch = line.match(GitConfigParser._propertyRegex);
            if (propertyMatch?.length === 3 && !Object.keys(section.properties).includes(propertyMatch[1])) {
                section.properties[propertyMatch[1]] = propertyMatch[2];
            }
        }
        addSection(section);
        return config.sections;
    }
}
function parseGitRemotes(raw) {
    const remotes = [];
    for (const remoteSection of GitConfigParser.parse(raw).filter(s => s.name === 'remote')) {
        if (remoteSection.subSectionName) {
            remotes.push({
                name: remoteSection.subSectionName,
                fetchUrl: remoteSection.properties['url'],
                pushUrl: remoteSection.properties['pushurl'] ?? remoteSection.properties['url'],
                isReadOnly: false
            });
        }
    }
    return remotes;
}
// As a mitigation for extensions like ESLint showing warnings and errors
// for git URIs, let's change the file extension of these uris to .git,
// when `replaceFileExtension` is true.
function toGitUri(uri, ref, options = {}) {
    const params = {
        path: uri.fsPath,
        ref
    };
    if (options.submoduleOf) {
        params.submoduleOf = options.submoduleOf;
    }
    let path = uri.path;
    if (options.replaceFileExtension) {
        path = `${path}.git`;
    }
    else if (options.submoduleOf) {
        path = `${path}.diff`;
    }
    return uri.with({ scheme: options.scheme ?? 'git', path, query: JSON.stringify(params) });
}
//# sourceMappingURL=utils.js.map