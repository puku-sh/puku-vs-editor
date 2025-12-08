"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Highlighter = void 0;
const core_1 = require("shiki/core");
const langs = __importStar(require("shiki/langs"));
const wasm_1 = __importDefault(require("shiki/wasm"));
const vscode_1 = require("vscode");
const languages = __importStar(require("./languages"));
const themes = __importStar(require("./themes"));
class Highlighter {
    constructor(languageId, highlighter) {
        this.languageId = languageId;
        this.highlighter = highlighter;
    }
    static async create(languageId = vscode_1.window.activeTextEditor?.document.languageId) {
        if (!languageId) {
            return new Highlighter(undefined, undefined);
        }
        const highlighter = await (0, core_1.getSingletonHighlighterCore)({
            langs: Object.values(langs.bundledLanguages),
            loadWasm: wasm_1.default,
        });
        // Load additional language if not out of the box for shiki
        if (!langs.bundledLanguages[languageId]) {
            const additionalLang = vscLanguageMap[languageId];
            if (additionalLang) {
                await highlighter.loadLanguage(additionalLang);
            }
        }
        return new Highlighter(languageId, highlighter);
    }
    createSnippet(text) {
        if (!this.highlighter || !this.languageId || !this.languageSupported()) {
            return `<pre>${text}</pre>`;
        }
        return this.highlighter.codeToHtml(text, { lang: this.languageId, theme: getCurrentTheme() });
    }
    languageSupported() {
        if (!this.languageId) {
            return false;
        }
        if (this.highlighter?.getLoadedLanguages().includes(this.languageId)) {
            return true;
        }
        return false;
    }
}
exports.Highlighter = Highlighter;
function getCurrentTheme() {
    const workbenchConfig = vscode_1.workspace.getConfiguration('workbench');
    if (workbenchConfig) {
        const vsCodeTheme = workbenchConfig.get('colorTheme');
        if (vsCodeTheme && isSupportedTheme(vsCodeTheme)) {
            return vscThemeMap[vsCodeTheme];
        }
        const themeType = vscode_1.window.activeColorTheme;
        const defaultTheme = vscDefaultMap[themeType.kind]; // fall back to default themes if we don't have a match
        return defaultTheme;
    }
    else {
        return vscThemeMap['Default Dark Modern'];
    }
}
const vscDefaultMap = {
    [vscode_1.ColorThemeKind.Dark]: themes.darkModern,
    [vscode_1.ColorThemeKind.Light]: themes.lightModern,
    [vscode_1.ColorThemeKind.HighContrast]: themes.darkHC,
    [vscode_1.ColorThemeKind.HighContrastLight]: themes.lightHC,
};
// These are vs code themes that aren't out of the box in shiki but come standard with vs code
const vscThemeMap = {
    Abyss: themes.abyss,
    'Dark High Contrast': themes.darkHC,
    'Light High Constrast': themes.lightHC,
    'Default Dark Modern': themes.darkModern,
    'Kimbie Dark': themes.kimbieDark,
    'Default Light Modern': themes.lightModern,
    'Monokai Dimmed': themes.monokaiDim,
    'Quiet Light': themes.quietLight,
    Red: themes.red,
    'Tomorrow Night Blue': themes.tomorrowNightBlue,
    'Visual Studio Dark': themes.vsDark,
    'Visual Studio Light': themes.vsLight,
    'Default Dark+': themes.darkPlus,
    'Default Light+': themes.lightPlus,
    Monokai: themes.monokai,
    'Solarized Dark': themes.solarizedDark,
    'Solarized Light': themes.solarizedLight,
};
function isSupportedTheme(theme) {
    return theme in vscThemeMap;
}
// These are vs code themes that aren't out of the box in shiki but come standard with vs code
const vscLanguageMap = {
    'cuda-cpp': languages.cudaCpp,
    javascriptreact: languages.javascriptreact,
    markdown_latex_combined: languages.markdownLatexCombined,
    'markdown-math': languages.markdownMath,
    restructuredtext: languages.restructuredtext,
    'search-result': languages.searchResult,
    typescriptreact: languages.typescriptreact,
};
//# sourceMappingURL=highlighter.js.map