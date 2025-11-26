/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class MockLanguageModelToolsConfirmationService {
    manageConfirmationPreferences(tools, options) {
        throw new Error('Method not implemented.');
    }
    registerConfirmationContribution(toolName, contribution) {
        throw new Error('Method not implemented.');
    }
    resetToolAutoConfirmation() {
    }
    getPreConfirmAction(ref) {
        return undefined;
    }
    getPostConfirmAction(ref) {
        return undefined;
    }
    getPreConfirmActions(ref) {
        return [];
    }
    getPostConfirmActions(ref) {
        return [];
    }
}
//# sourceMappingURL=mockLanguageModelToolsConfirmationService.js.map