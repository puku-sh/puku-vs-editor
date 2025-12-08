"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotebookCellLinkifier = void 0;
const logService_1 = require("../../../platform/log/common/logService");
const helpers_1 = require("../../../platform/notebook/common/helpers");
const workspaceService_1 = require("../../../platform/workspace/common/workspaceService");
const linkifiedText_1 = require("../common/linkifiedText");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
/**
 * Linkifies notebook cell IDs in chat responses.
 * The linkified text will show as "<Cell ID> (Cell <number>)" where number is the cell's index + 1.
 */
let NotebookCellLinkifier = class NotebookCellLinkifier extends lifecycle_1.Disposable {
    constructor(workspaceService, logger) {
        super();
        this.workspaceService = workspaceService;
        this.logger = logger;
        this.cells = new Map();
        this.notebookCellIds = new WeakMap();
        this.initialized = false;
    }
    async linkify(text, context, token) {
        const parts = [];
        // Safety check
        if (!text || !this.workspaceService?.notebookDocuments) {
            return { parts: [text] };
        }
        // Early bail if no notebook documents are open
        const notebookDocuments = this.workspaceService.notebookDocuments;
        if (!notebookDocuments || notebookDocuments.length === 0) {
            return { parts: [text] };
        }
        let lastIndex = 0;
        for (const match of text.matchAll(helpers_1.CellIdPatternRe)) {
            const fullMatch = match[0];
            const cellId = match[2];
            const index = match.index;
            // Add text before the match
            if (index > lastIndex) {
                parts.push(text.slice(lastIndex, index));
            }
            // Try to resolve the cell ID to a linkable cell
            const resolved = this.resolveCellId(cellId);
            if (resolved) {
                parts.push(fullMatch.slice(0, fullMatch.indexOf(cellId) + cellId.length));
                parts.push(' ');
                parts.push(resolved);
                parts.push(fullMatch.slice(fullMatch.indexOf(cellId) + cellId.length));
            }
            else {
                parts.push(fullMatch);
            }
            lastIndex = index + fullMatch.length;
        }
        // Add remaining text after the last match
        if (lastIndex < text.length) {
            parts.push(text.slice(lastIndex));
        }
        return { parts };
    }
    resolveCellId(cellId) {
        try {
            this.initializeCellIds();
            const cell = this.cells.get(cellId)?.deref();
            if (!cell) {
                return;
            }
            return new linkifiedText_1.LinkifyLocationAnchor(cell.document.uri, `Cell ${cell.index + 1}`);
        }
        catch (error) {
            this.logger.error(error, `Error resolving cell ID: ${cellId}`);
            return undefined;
        }
    }
    initializeCellIds() {
        if (this.initialized) {
            return;
        }
        const updateNbCellIds = (notebook) => {
            const ids = this.notebookCellIds.get(notebook) ?? new Set();
            ids.forEach(id => this.cells.delete(id));
            (0, helpers_1.getCellIdMap)(notebook).forEach((cell, cellId) => {
                this.cells.set(cellId, new WeakRef(cell));
                ids.add(cellId);
            });
            this.notebookCellIds.set(notebook, ids);
        };
        this._register(this.workspaceService.onDidOpenNotebookDocument(notebook => updateNbCellIds(notebook)));
        this._register(this.workspaceService.onDidCloseNotebookDocument(notebook => {
            if (this.workspaceService.notebookDocuments.length === 0) {
                this.cells.clear();
                return;
            }
            const ids = this.notebookCellIds.get(notebook) ?? new Set();
            ids.forEach(id => this.cells.delete(id));
        }));
        this._register(this.workspaceService.onDidChangeNotebookDocument(e => {
            if (e.contentChanges.length) {
                updateNbCellIds(e.notebook);
            }
        }));
        this.workspaceService.notebookDocuments.forEach(notebook => updateNbCellIds(notebook));
    }
};
exports.NotebookCellLinkifier = NotebookCellLinkifier;
exports.NotebookCellLinkifier = NotebookCellLinkifier = __decorate([
    __param(0, workspaceService_1.IWorkspaceService),
    __param(1, logService_1.ILogService)
], NotebookCellLinkifier);
//# sourceMappingURL=notebookCellLinkifier.js.map