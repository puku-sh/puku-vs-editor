"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.NullFeedbackReporter = exports.NullFeedbackReporterImpl = exports.IFeedbackReporter = void 0;
const services_1 = require("../../../util/common/services");
const observableInternal_1 = require("../../../util/vs/base/common/observableInternal");
exports.IFeedbackReporter = (0, services_1.createServiceIdentifier)('IFeedbackReporter');
class NullFeedbackReporterImpl {
    constructor() {
        this.canReport = (0, observableInternal_1.constObservable)(false);
    }
    async reportInline(conversation, promptQuery, interactionOutcome) {
        // nothing
    }
    async reportChat(turn) {
        // nothing
    }
    async reportSearch() {
        // nothing
    }
}
exports.NullFeedbackReporterImpl = NullFeedbackReporterImpl;
exports.NullFeedbackReporter = new NullFeedbackReporterImpl();
//# sourceMappingURL=feedbackReporter.js.map