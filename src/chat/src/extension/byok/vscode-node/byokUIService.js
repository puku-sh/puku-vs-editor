"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isBackButtonClick = isBackButtonClick;
exports.promptForAPIKey = promptForAPIKey;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const vscode_1 = require("vscode");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
function isBackButtonClick(value) {
    return typeof value === 'object' && value?.back === true;
}
// Helper function for creating an input box with a back button
function createInputBoxWithBackButton(options, hideBackButton) {
    const disposableStore = new lifecycle_1.DisposableStore();
    const inputBox = disposableStore.add(vscode_1.window.createInputBox());
    inputBox.ignoreFocusOut = true;
    inputBox.title = options.title;
    inputBox.password = options.password || false;
    inputBox.prompt = options.prompt;
    inputBox.placeholder = options.placeHolder;
    inputBox.value = options.value || '';
    inputBox.buttons = hideBackButton ? [] : [vscode_1.QuickInputButtons.Back];
    return new Promise(resolve => {
        disposableStore.add(inputBox.onDidTriggerButton(button => {
            if (button === vscode_1.QuickInputButtons.Back) {
                resolve({ back: true });
                disposableStore.dispose();
            }
        }));
        disposableStore.add(inputBox.onDidAccept(async () => {
            const value = inputBox.value;
            if (options.validateInput) {
                const validation = options.validateInput(value);
                if (validation) {
                    // Show validation message but don't hide
                    inputBox.validationMessage = (await validation) || undefined;
                    return;
                }
            }
            resolve(value);
            disposableStore.dispose();
        }));
        disposableStore.add(inputBox.onDidHide(() => {
            // This resolves undefined if the input box is dismissed without accepting
            resolve(undefined);
            disposableStore.dispose();
        }));
        inputBox.show();
    });
}
async function promptForAPIKey(contextName, reconfigure = false) {
    const prompt = reconfigure ? `Enter new ${contextName} API Key or leave blank to delete saved key` : `Enter ${contextName} API Key`;
    const title = reconfigure ? `Reconfigure ${contextName} API Key - Preview` : `Enter ${contextName} API Key - Preview`;
    const result = await createInputBoxWithBackButton({
        prompt: prompt,
        title: title,
        placeHolder: `${contextName} API Key`,
        ignoreFocusOut: true,
        password: true,
        validateInput: (value) => {
            // Allow empty input only when reconfiguring (to delete the key)
            return (value.trim().length > 0 || reconfigure) ? null : 'API Key cannot be empty';
        }
    }, true);
    if (isBackButtonClick(result)) {
        return undefined;
    }
    return result;
}
//# sourceMappingURL=byokUIService.js.map