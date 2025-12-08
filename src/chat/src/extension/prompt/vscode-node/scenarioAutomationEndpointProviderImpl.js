"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScenarioAutomationEndpointProviderImpl = void 0;
const vscode_1 = require("vscode");
const extChatEndpoint_1 = require("../../../platform/endpoint/vscode-node/extChatEndpoint");
const endpointProviderImpl_1 = require("./endpointProviderImpl");
class ScenarioAutomationEndpointProviderImpl extends endpointProviderImpl_1.ProductionEndpointProvider {
    async getChatEndpoint(requestOrFamilyOrModel) {
        if (this._authService.copilotToken?.isNoAuthUser) {
            // When using no auth in scenario automation, we want to force using a custom model / non-copilot for all requests
            const getFirstNonCopilotModel = async () => {
                const allModels = await vscode_1.lm.selectChatModels();
                const firstNonCopilotModel = allModels.find(m => m.vendor !== 'copilot');
                if (firstNonCopilotModel) {
                    this._logService.trace(`Using custom contributed chat model`);
                    return this._instantiationService.createInstance(extChatEndpoint_1.ExtensionContributedChatEndpoint, firstNonCopilotModel);
                }
                else {
                    throw new Error('No custom contributed chat models found.');
                }
            };
            // Check if we have a hard-coded family which indicates a copilot model
            if (typeof requestOrFamilyOrModel === 'string') {
                return getFirstNonCopilotModel();
            }
            // Check if a copilot model was explicitly requested in the picker
            const model = 'model' in requestOrFamilyOrModel ? requestOrFamilyOrModel.model : requestOrFamilyOrModel;
            if (model.vendor === 'copilot') {
                return getFirstNonCopilotModel();
            }
        }
        return super.getChatEndpoint(requestOrFamilyOrModel);
    }
}
exports.ScenarioAutomationEndpointProviderImpl = ScenarioAutomationEndpointProviderImpl;
//# sourceMappingURL=scenarioAutomationEndpointProviderImpl.js.map