/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Color } from '../../../../../base/common/color.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Registry } from '../../../../../platform/registry/common/platform.js';
import { Extensions } from '../../../../../platform/theme/common/colorRegistry.js';
suite('ColorRegistry', () => {
    if (process.env.VSCODE_COLOR_REGISTRY_EXPORT) {
        test('exports', () => {
            const themingRegistry = Registry.as(Extensions.ColorContribution);
            const colors = themingRegistry.getColors();
            const replacer = (_key, value) => value instanceof Color ? Color.Format.CSS.formatHexA(value) : value;
            console.log(`#colors:${JSON.stringify(colors, replacer)}\n`);
        });
    }
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=colorRegistryExport.test.js.map