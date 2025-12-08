"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoopSettingsEditorSearchService = exports.ISettingsEditorSearchService = void 0;
const services_1 = require("../../../util/common/services");
exports.ISettingsEditorSearchService = (0, services_1.createServiceIdentifier)('ISettingsEditorSearchService');
class NoopSettingsEditorSearchService {
    provideSettingsSearchResults(query, options, progress, token) {
        return Promise.resolve(undefined);
    }
}
exports.NoopSettingsEditorSearchService = NoopSettingsEditorSearchService;
//# sourceMappingURL=settingsEditorSearchService.js.map