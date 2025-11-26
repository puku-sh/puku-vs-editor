/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Event } from '../../../../base/common/event.js';
import Severity from '../../../../base/common/severity.js';
export class TestDialogService {
    constructor(defaultConfirmResult = undefined, defaultPromptResult = undefined) {
        this.defaultConfirmResult = defaultConfirmResult;
        this.defaultPromptResult = defaultPromptResult;
        this.onWillShowDialog = Event.None;
        this.onDidShowDialog = Event.None;
        this.confirmResult = undefined;
    }
    setConfirmResult(result) {
        this.confirmResult = result;
    }
    async confirm(confirmation) {
        if (this.confirmResult) {
            const confirmResult = this.confirmResult;
            this.confirmResult = undefined;
            return confirmResult;
        }
        return this.defaultConfirmResult ?? { confirmed: false };
    }
    async prompt(prompt) {
        if (this.defaultPromptResult) {
            return this.defaultPromptResult;
        }
        const promptButtons = [...(prompt.buttons ?? [])];
        if (prompt.cancelButton && typeof prompt.cancelButton !== 'string' && typeof prompt.cancelButton !== 'boolean') {
            promptButtons.push(prompt.cancelButton);
        }
        return { result: await promptButtons[0]?.run({ checkboxChecked: false }) };
    }
    async info(message, detail) {
        await this.prompt({ type: Severity.Info, message, detail });
    }
    async warn(message, detail) {
        await this.prompt({ type: Severity.Warning, message, detail });
    }
    async error(message, detail) {
        await this.prompt({ type: Severity.Error, message, detail });
    }
    async input() { {
        return { confirmed: true, values: [] };
    } }
    async about() { }
}
//# sourceMappingURL=testDialogService.js.map