/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize, localize2 } from '../../../nls.js';
import { Action2 } from '../../../platform/actions/common/actions.js';
import product from '../../../platform/product/common/product.js';
import { IDialogService } from '../../../platform/dialogs/common/dialogs.js';
import { INativeHostService } from '../../../platform/native/common/native.js';
import { toErrorMessage } from '../../../base/common/errorMessage.js';
import { IProductService } from '../../../platform/product/common/productService.js';
import { isCancellationError } from '../../../base/common/errors.js';
const shellCommandCategory = localize2(14768, 'Shell Command');
export class InstallShellScriptAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.installCommandLine',
            title: localize2(14769, "Install '{0}' command in PATH", product.applicationName),
            category: shellCommandCategory,
            f1: true
        });
    }
    async run(accessor) {
        const nativeHostService = accessor.get(INativeHostService);
        const dialogService = accessor.get(IDialogService);
        const productService = accessor.get(IProductService);
        try {
            await nativeHostService.installShellCommand();
            dialogService.info(localize(14766, null, productService.applicationName));
        }
        catch (error) {
            if (isCancellationError(error)) {
                return;
            }
            dialogService.error(toErrorMessage(error));
        }
    }
}
export class UninstallShellScriptAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.uninstallCommandLine',
            title: localize2(14770, "Uninstall '{0}' command from PATH", product.applicationName),
            category: shellCommandCategory,
            f1: true
        });
    }
    async run(accessor) {
        const nativeHostService = accessor.get(INativeHostService);
        const dialogService = accessor.get(IDialogService);
        const productService = accessor.get(IProductService);
        try {
            await nativeHostService.uninstallShellCommand();
            dialogService.info(localize(14767, null, productService.applicationName));
        }
        catch (error) {
            if (isCancellationError(error)) {
                return;
            }
            dialogService.error(toErrorMessage(error));
        }
    }
}
//# sourceMappingURL=installActions.js.map