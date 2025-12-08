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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TabsAndEditorsServiceImpl = void 0;
const vscode = __importStar(require("vscode"));
const event_1 = require("../../../util/vs/base/common/event");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const map_1 = require("../../../util/vs/base/common/map");
class TabsAndEditorsServiceImpl {
    constructor() {
        this._store = new lifecycle_1.DisposableStore();
        this._tabGroupsUseInfo = new Map();
        this._tabClock = 0;
        this.onDidChangeActiveTextEditor = vscode.window.onDidChangeActiveTextEditor;
        this._onDidChangeTabs = this._store.add(new event_1.Emitter());
        this.onDidChangeTabs = this._onDidChangeTabs.event;
        // Set the activeTabGroup as the most recently used
        const updateActiveTabGroup = () => this._tabGroupsUseInfo.set(vscode.window.tabGroups.activeTabGroup, this._tabClock++);
        updateActiveTabGroup();
        this._store.add(vscode.window.tabGroups.onDidChangeTabGroups(e => {
            // remove all tab groups!
            e.closed.forEach(item => this._tabGroupsUseInfo.delete(item));
            updateActiveTabGroup();
        }));
        this._store.add(vscode.window.tabGroups.onDidChangeTabs(e => {
            this._onDidChangeTabs.fire({
                changed: e.changed.map(t => this._asTabInfo(t)),
                closed: e.closed.map(t => this._asTabInfo(t)),
                opened: e.opened.map(t => this._asTabInfo(t))
            });
        }));
    }
    dispose() {
        this._store.dispose();
    }
    /**
     * Returns the active text editor in the VS Code window.
     *
     * Uses vscode.window.activTextEditor but _ignores_ output editors. When no text editor is active,
     * the most recent tab group that shows a text editor is used.
     */
    get activeTextEditor() {
        const candidate = vscode.window.activeTextEditor;
        if (candidate && candidate.document.uri.scheme !== 'output') {
            return candidate;
        }
        const allEditors = new map_1.ResourceMap();
        vscode.window.visibleTextEditors.forEach(e => allEditors.set(e.document.uri, e));
        const groups = [...this._tabGroupsUseInfo];
        groups.sort((a, b) => b[1] - a[1]);
        for (const [group] of groups) {
            if (group.activeTab) {
                const info = this._asTabInfo(group.activeTab);
                if (info.uri && allEditors.has(info.uri)) {
                    const candidate = allEditors.get(info.uri);
                    return candidate;
                }
            }
        }
        return undefined;
    }
    get visibleTextEditors() {
        return vscode.window.visibleTextEditors;
    }
    get activeNotebookEditor() {
        return vscode.window.activeNotebookEditor;
    }
    get visibleNotebookEditors() {
        return vscode.window.visibleNotebookEditors;
    }
    get tabs() {
        return vscode.window.tabGroups.all.flatMap(g => g.tabs).map(this._asTabInfo, this);
    }
    _asTabInfo(tab) {
        let uri;
        if (tab.input instanceof vscode.TabInputText || tab.input instanceof vscode.TabInputNotebook) {
            uri = tab.input.uri;
        }
        else if (tab.input instanceof vscode.TabInputTextDiff || tab.input instanceof vscode.TabInputNotebookDiff) {
            uri = tab.input.modified;
        }
        return {
            tab,
            uri
        };
    }
}
exports.TabsAndEditorsServiceImpl = TabsAndEditorsServiceImpl;
//# sourceMappingURL=tabsAndEditorsServiceImpl.js.map