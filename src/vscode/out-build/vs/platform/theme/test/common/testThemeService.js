/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Color } from '../../../../base/common/color.js';
import { Emitter } from '../../../../base/common/event.js';
import { ColorScheme } from '../../common/theme.js';
export class TestColorTheme {
    constructor(colors = {}, type = ColorScheme.DARK, semanticHighlighting = false) {
        this.colors = colors;
        this.type = type;
        this.semanticHighlighting = semanticHighlighting;
        this.label = 'test';
    }
    getColor(color, useDefault) {
        const value = this.colors[color];
        if (value) {
            return Color.fromHex(value);
        }
        return undefined;
    }
    defines(color) {
        throw new Error('Method not implemented.');
    }
    getTokenStyleMetadata(type, modifiers, modelLanguage) {
        return undefined;
    }
    get tokenColorMap() {
        return [];
    }
}
class TestFileIconTheme {
    constructor() {
        this.hasFileIcons = false;
        this.hasFolderIcons = false;
        this.hidesExplorerArrows = false;
    }
}
class UnthemedProductIconTheme {
    getIcon(contribution) {
        return undefined;
    }
}
export class TestThemeService {
    constructor(theme = new TestColorTheme(), fileIconTheme = new TestFileIconTheme(), productIconTheme = new UnthemedProductIconTheme()) {
        this._onThemeChange = new Emitter();
        this._onFileIconThemeChange = new Emitter();
        this._onProductIconThemeChange = new Emitter();
        this._colorTheme = theme;
        this._fileIconTheme = fileIconTheme;
        this._productIconTheme = productIconTheme;
    }
    getColorTheme() {
        return this._colorTheme;
    }
    setTheme(theme) {
        this._colorTheme = theme;
        this.fireThemeChange();
    }
    fireThemeChange() {
        this._onThemeChange.fire(this._colorTheme);
    }
    get onDidColorThemeChange() {
        return this._onThemeChange.event;
    }
    getFileIconTheme() {
        return this._fileIconTheme;
    }
    get onDidFileIconThemeChange() {
        return this._onFileIconThemeChange.event;
    }
    getProductIconTheme() {
        return this._productIconTheme;
    }
    get onDidProductIconThemeChange() {
        return this._onProductIconThemeChange.event;
    }
}
//# sourceMappingURL=testThemeService.js.map