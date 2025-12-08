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
exports.PukuIndexingContribution = void 0;
const vscode = __importStar(require("vscode"));
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const pukuIndexingService_1 = require("../node/pukuIndexingService");
const pukuConfig_1 = require("../common/pukuConfig");
/**
 * Puku Indexing Contribution - auto-triggers workspace indexing on startup
 */
let PukuIndexingContribution = class PukuIndexingContribution extends lifecycle_1.Disposable {
    static { this.ID = 'pukuIndexing.contribution'; }
    constructor(_instantiationService) {
        super();
        this._instantiationService = _instantiationService;
        // Register search command
        this._registerCommands();
        // Initialize indexing after a short delay to let the workspace fully load
        setTimeout(() => this._initializeIndexing(), 3000);
    }
    _registerCommands() {
        // Puku Semantic Search command for testing
        this._register(vscode.commands.registerCommand('puku.semanticSearch', async () => {
            if (!this._indexingService) {
                vscode.window.showErrorMessage('Puku Indexing not initialized');
                return;
            }
            if (this._indexingService.status !== pukuIndexingService_1.PukuIndexingStatus.Ready) {
                vscode.window.showWarningMessage('Puku Indexing is not ready. Please wait for indexing to complete.');
                return;
            }
            const query = await vscode.window.showInputBox({
                prompt: 'Enter search query',
                placeHolder: 'Search for semantically similar code...',
            });
            if (!query) {
                return;
            }
            try {
                const results = await this._indexingService.search(query, 10);
                if (results.length === 0) {
                    vscode.window.showInformationMessage('No results found');
                    return;
                }
                // Show results in a quick pick
                const items = results.map((result, index) => ({
                    label: `$(file) ${vscode.workspace.asRelativePath(result.uri)}`,
                    description: `Score: ${(result.score * 100).toFixed(1)}%`,
                    detail: result.content.substring(0, 100).replace(/\n/g, ' ') + '...',
                    uri: result.uri,
                }));
                const selected = await vscode.window.showQuickPick(items, {
                    placeHolder: `Found ${results.length} results`,
                    matchOnDescription: true,
                    matchOnDetail: true,
                });
                if (selected) {
                    const document = await vscode.workspace.openTextDocument(selected.uri);
                    await vscode.window.showTextDocument(document);
                }
            }
            catch (error) {
                console.error('[PukuIndexing] Search failed:', error);
                vscode.window.showErrorMessage(`Search failed: ${error}`);
            }
        }));
        // Re-index command
        this._register(vscode.commands.registerCommand('puku.reindex', async () => {
            if (!this._indexingService) {
                vscode.window.showErrorMessage('Puku Indexing not initialized');
                return;
            }
            if (this._indexingService.status === pukuIndexingService_1.PukuIndexingStatus.Indexing) {
                vscode.window.showWarningMessage('Indexing already in progress');
                return;
            }
            vscode.window.showInformationMessage('Starting re-index...');
            await this._indexingService.startIndexing();
        }));
        // Clear cache command - useful for troubleshooting or after updates
        this._register(vscode.commands.registerCommand('puku.clearIndexCache', async () => {
            const confirm = await vscode.window.showWarningMessage('This will delete the embeddings cache and re-index the workspace. Continue?', { modal: true }, 'Clear Cache');
            if (confirm !== 'Clear Cache') {
                return;
            }
            // Get storage path and delete database
            const storageUri = vscode.workspace.workspaceFolders?.[0]
                ? vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, '.puku')
                : undefined;
            const { PukuEmbeddingsCache } = await Promise.resolve().then(() => __importStar(require('../node/pukuEmbeddingsCache')));
            const deleted = await PukuEmbeddingsCache.deleteDatabase(storageUri);
            if (deleted) {
                vscode.window.showInformationMessage('Cache cleared. Restarting indexing...');
                // Trigger re-index
                if (this._indexingService) {
                    await this._indexingService.startIndexing();
                }
            }
            else {
                vscode.window.showInformationMessage('No cache to clear or cache not found.');
            }
        }));
    }
    async _initializeIndexing() {
        try {
            // Initialize config service first
            const configService = this._instantiationService.invokeFunction((accessor) => {
                return accessor.get(pukuConfig_1.IPukuConfigService);
            });
            await configService.initialize();
            console.log('[PukuIndexing.contribution] Config service initialized');
            this._indexingService = this._instantiationService.invokeFunction((accessor) => {
                return accessor.get(pukuIndexingService_1.IPukuIndexingService);
            });
            const indexingService = this._indexingService;
            // Create status bar item
            this._statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
            this._statusBarItem.text = '$(sync~spin) Puku: Initializing...';
            this._statusBarItem.tooltip = 'Puku Indexing Service';
            this._statusBarItem.show();
            this._register({ dispose: () => this._statusBarItem?.dispose() });
            // Listen for status changes
            this._register(indexingService.onDidChangeStatus((progress) => {
                this._updateStatusBar(progress.status, progress);
            }));
            // Listen for completion
            this._register(indexingService.onDidCompleteIndexing(() => {
                const files = indexingService.getIndexedFiles();
                vscode.window.showInformationMessage(`Puku: Indexed ${files.length} files for semantic search`);
            }));
            // Initialize and start indexing
            await indexingService.initialize();
            if (indexingService.isAvailable()) {
                console.log('[PukuIndexing.contribution] Starting workspace indexing');
                await indexingService.startIndexing();
            }
            else {
                console.log('[PukuIndexing.contribution] Indexing not available');
                this._updateStatusBar(pukuIndexingService_1.PukuIndexingStatus.Disabled);
            }
        }
        catch (error) {
            console.error('[PukuIndexing.contribution] Failed to initialize indexing:', error);
            this._updateStatusBar(pukuIndexingService_1.PukuIndexingStatus.Error);
        }
    }
    _updateStatusBar(status, progress) {
        if (!this._statusBarItem) {
            return;
        }
        switch (status) {
            case pukuIndexingService_1.PukuIndexingStatus.Initializing:
                this._statusBarItem.text = '$(sync~spin) Puku: Initializing...';
                this._statusBarItem.backgroundColor = undefined;
                break;
            case pukuIndexingService_1.PukuIndexingStatus.Indexing:
                if (progress) {
                    const percent = progress.totalFiles > 0
                        ? Math.round((progress.indexedFiles / progress.totalFiles) * 100)
                        : 0;
                    this._statusBarItem.text = `$(sync~spin) Puku: Indexing ${percent}%`;
                    this._statusBarItem.tooltip = progress.currentFile
                        ? `Indexing: ${progress.currentFile}\n${progress.indexedFiles}/${progress.totalFiles} files`
                        : `${progress.indexedFiles}/${progress.totalFiles} files`;
                }
                else {
                    this._statusBarItem.text = '$(sync~spin) Puku: Indexing...';
                }
                this._statusBarItem.backgroundColor = undefined;
                break;
            case pukuIndexingService_1.PukuIndexingStatus.Ready:
                this._statusBarItem.text = '$(check) Puku: Ready';
                this._statusBarItem.tooltip = 'Puku Indexing: Ready for semantic search';
                this._statusBarItem.backgroundColor = undefined;
                break;
            case pukuIndexingService_1.PukuIndexingStatus.Error:
                this._statusBarItem.text = '$(error) Puku: Error';
                this._statusBarItem.tooltip = 'Puku Indexing: Error occurred';
                this._statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
                break;
            case pukuIndexingService_1.PukuIndexingStatus.Disabled:
                this._statusBarItem.text = '$(circle-slash) Puku: Disabled';
                this._statusBarItem.tooltip = 'Puku Indexing: Not available';
                this._statusBarItem.backgroundColor = undefined;
                break;
            case pukuIndexingService_1.PukuIndexingStatus.Idle:
            default:
                this._statusBarItem.text = '$(circle-outline) Puku: Idle';
                this._statusBarItem.tooltip = 'Puku Indexing: Idle';
                this._statusBarItem.backgroundColor = undefined;
                break;
        }
    }
};
exports.PukuIndexingContribution = PukuIndexingContribution;
exports.PukuIndexingContribution = PukuIndexingContribution = __decorate([
    __param(0, instantiation_1.IInstantiationService)
], PukuIndexingContribution);
//# sourceMappingURL=pukuIndexing.contribution.js.map