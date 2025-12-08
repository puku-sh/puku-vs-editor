"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.NullSurveyService = exports.ISurveyService = void 0;
const services_1 = require("../../../util/common/services");
exports.ISurveyService = (0, services_1.createServiceIdentifier)('ISurveyService');
class NullSurveyService {
    async signalUsage(source, languageId) {
        // no-op
    }
}
exports.NullSurveyService = NullSurveyService;
//# sourceMappingURL=surveyService.js.map