"use strict";
/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Copyright (c) Puku AI. All rights reserved.
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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PukuChatParticipant = void 0;
const vscode = __importStar(require("vscode"));
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const pukuIndexingService_1 = require("../../pukuIndexing/node/pukuIndexingService");
/**
 * Puku Status Bar
 *
 * Shows Puku indexing status in the status bar.
 * The chat is handled by the existing infrastructure (renamed from Copilot to Puku)
 * which uses Puku embeddings via ConditionalEmbeddingsComputer.
 */
let PukuChatParticipant = class PukuChatParticipant extends lifecycle_1.Disposable {
    constructor(_indexingService) {
        super();
        this._indexingService = _indexingService;
        // Create status bar
        this._createStatusBar();
        console.log('[Puku] Status bar initialized');
    }
    _createStatusBar() {
        this._statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 99);
        this._updateStatusBar();
        this._statusBarItem.show();
        this._register({ dispose: () => this._statusBarItem?.dispose() });
        // Listen for indexing status changes
        this._register(this._indexingService.onDidChangeStatus(() => {
            this._updateStatusBar();
        }));
    }
    _updateStatusBar() {
        if (!this._statusBarItem) {
            return;
        }
        const files = this._indexingService.getIndexedFiles();
        const chunks = files.reduce((sum, f) => sum + f.chunks, 0);
        switch (this._indexingService.status) {
            case pukuIndexingService_1.PukuIndexingStatus.Ready:
                this._statusBarItem.text = `$(sparkle) Puku`;
                this._statusBarItem.tooltip = `Puku AI Ready\nIndexed: ${files.length} files, ${chunks} chunks`;
                this._statusBarItem.backgroundColor = undefined;
                break;
            case pukuIndexingService_1.PukuIndexingStatus.Indexing:
                const progress = this._indexingService.progress;
                const percent = progress.totalFiles > 0
                    ? Math.round((progress.indexedFiles / progress.totalFiles) * 100)
                    : 0;
                this._statusBarItem.text = `$(sync~spin) Puku ${percent}%`;
                this._statusBarItem.tooltip = `Puku Indexing: ${progress.indexedFiles}/${progress.totalFiles} files`;
                this._statusBarItem.backgroundColor = undefined;
                break;
            case pukuIndexingService_1.PukuIndexingStatus.Error:
                this._statusBarItem.text = `$(error) Puku`;
                this._statusBarItem.tooltip = 'Puku: Error - Check proxy connection';
                this._statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
                break;
            default:
                this._statusBarItem.text = `$(circle-outline) Puku`;
                this._statusBarItem.tooltip = 'Puku: Initializing...';
                this._statusBarItem.backgroundColor = undefined;
        }
    }
};
exports.PukuChatParticipant = PukuChatParticipant;
exports.PukuChatParticipant = PukuChatParticipant = __decorate([
    __param(0, pukuIndexingService_1.IPukuIndexingService)
], PukuChatParticipant);
//# sourceMappingURL=pukuChatParticipant.js.map