"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoopLanguageFeaturesService = exports.ILanguageFeaturesService = void 0;
exports.isLocationLink = isLocationLink;
const services_1 = require("../../../util/common/services");
exports.ILanguageFeaturesService = (0, services_1.createServiceIdentifier)('ILanguageFeaturesService');
class NoopLanguageFeaturesService {
    getDocumentSymbols(uri) {
        return Promise.resolve([]);
    }
    getDefinitions(uri, position) {
        return Promise.resolve([]);
    }
    getImplementations(uri, position) {
        return Promise.resolve([]);
    }
    getReferences(uri, position) {
        return Promise.resolve([]);
    }
    getWorkspaceSymbols(query) {
        return Promise.resolve([]);
    }
    getDiagnostics(uri) {
        return [];
    }
}
exports.NoopLanguageFeaturesService = NoopLanguageFeaturesService;
function isLocationLink(thing) {
    return typeof thing === 'object' && thing !== null && 'targetUri' in thing;
}
//# sourceMappingURL=languageFeaturesService.js.map