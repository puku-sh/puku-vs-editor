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
exports.BaseSuggestionsPanel = void 0;
const vscode_1 = require("vscode");
const extensionContext_1 = require("../../../../../../platform/extContext/common/extensionContext");
const debounce_1 = require("../../../../../../util/common/debounce");
const highlighter_1 = require("./highlighter");
const utils_1 = require("./utils");
let BaseSuggestionsPanel = class BaseSuggestionsPanel {
    #items;
    #batchItems;
    #percentage;
    #highlighter;
    #documentUri;
    #cts;
    get cancellationToken() {
        return this.#cts.token;
    }
    constructor(webviewPanel, document, suggestionsPanelManager, config, contextService) {
        this.webviewPanel = webviewPanel;
        this.suggestionsPanelManager = suggestionsPanelManager;
        this.config = config;
        this.contextService = contextService;
        this._disposables = [];
        this.#items = [];
        this.#batchItems = [];
        this.#percentage = 0;
        this._isDisposed = false;
        this.#cts = new vscode_1.CancellationTokenSource();
        this._onDidDispose = new vscode_1.EventEmitter();
        this.onDidDispose = this._onDidDispose.event;
        this.render = (0, debounce_1.debounce)(10, () => this.renderSolutions());
        webviewPanel.onDidDispose(() => this._dispose(), null, this._disposables);
        webviewPanel.webview.html = this._getWebviewContent();
        this.#documentUri = document.uri;
        this.#highlighter = highlighter_1.Highlighter.create(document.languageId);
        vscode_1.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('workbench.colorTheme')) {
                return this.render();
            }
        });
        webviewPanel.webview.onDidReceiveMessage(async (message) => {
            // First lest the subclass handle custom messages
            if ((await this.handleCustomMessage(message)) === true) {
                return;
            }
            switch (message.command) {
                case 'focusSolution':
                    this._focusedSolution = this.#items[message.solutionIndex];
                    return;
                case 'webviewReady':
                    // Send the config to the webview
                    void this.postMessage({
                        command: 'updateConfig',
                        config: {
                            renderingMode: this.config.renderingMode,
                            shuffleSolutions: this.config.shuffleSolutions,
                        },
                    });
                    return;
            }
        }, undefined);
        webviewPanel.onDidChangeViewState(e => {
            if (e.webviewPanel?.visible) {
                this.suggestionsPanelManager.activeWebviewPanel = this;
            }
        });
    }
    async handleCustomMessage(message) {
        return Promise.resolve(false);
    }
    _buildExtensionUri(...path) {
        const extensionPath = vscode_1.Uri.joinPath(this.contextService.extensionUri, ...path);
        return this.webviewPanel.webview.asWebviewUri(extensionPath);
    }
    _getWebviewContent() {
        const nonce = (0, utils_1.getNonce)();
        const scriptUri = this._buildExtensionUri('dist', this.config.webviewScriptName);
        return `
		<!DOCTYPE html>
			<html lang="en">
				<head>
					<meta charset="UTF-8">
					<meta name="viewport" content="width=device-width, initial-scale=1.0">
					<meta
						http-equiv="Content-Security-Policy"
						content="default-src 'none'; font-src ${this.webviewPanel.webview.cspSource}; style-src 'unsafe-inline' ${this.webviewPanel.webview.cspSource}; script-src 'nonce-${nonce}';"
					/>
					<title>${this.config.panelTitle}</title>
					<style>
						.solutionHeading {
							margin-top: 40px;
						}
						pre:focus-visible {
							border: 1px solid var(--vscode-focusBorder);
							outline: none;
						}
						pre {
							margin-bottom: 6px;
							display: block;
							padding: 9.5px;
							line-height: 1.42857143;
							word-break: break-all;
							word-wrap: break-word;
							border: 1px solid #ccc;
							border-radius: 4px;
							border: 1px solid var(--vscode-notebook-cellBorderColor);
							white-space: pre-wrap;
							font-size: var(--vscode-editor-font-size);
						}
						pre.shiki {
							padding: 0.5em 0.7em;
							margin-top: 1em;
							margin-bottom: 1em;
							border-radius: 4px;
						}
						code {
							background-color: transparent;
						}
					</style>
				</head>
				<body>
					<h2>${this.config.panelTitle}</h2>
					<div id="loadingContainer" aria-live="assertive" aria-atomic="true">
						<label for="progress-bar">Loading suggestions:</label>
						<progress id="progress-bar" max="100" value="0"></progress>
					</div>
					<div id="solutionsContainer" aria-busy="true" aria-describedby="progress-bar"></div>
					<script nonce="${nonce}" type="module" src="${scriptUri.toString()}"></script>
				</body>
			</html>
		`;
    }
    onWorkDone({ percentage }) {
        this.#percentage = percentage;
        void this.render();
    }
    onItem(item) {
        // If rendering mode is 'batch', we collect items and render them later
        // Otherwise, we render immediately
        if (this.config.renderingMode === 'batch') {
            this.#batchItems.push(item);
        }
        else {
            this.#items.push(item);
            void this.render();
        }
    }
    clearSolutions() {
        // Cancel any ongoing operations
        this.#cts.cancel();
        // Create a new cancellation token source for the next operation
        this.#cts = new vscode_1.CancellationTokenSource();
        // Clear all solutions and reset state
        this.#items = [];
        this.#batchItems = [];
        this._focusedSolution = undefined;
        this.#percentage = 0;
        void this.render();
    }
    onFinished() {
        this.#percentage = 100;
        // If we have batch items, add them to the main items list, shuffle if needed, and render
        if (this.#batchItems.length > 0) {
            this.#items.push(...this.#batchItems);
            if (this.config.shuffleSolutions) {
                this.#items = this.#items.sort(() => Math.random() - 0.5);
            }
            this.#batchItems = [];
        }
        void this.render();
    }
    async acceptSolution(solution, closePanel = true) {
        if (this._isDisposed === false && solution?.range) {
            const edit = new vscode_1.WorkspaceEdit();
            edit.replace(this.#documentUri, solution.range, solution.insertText);
            await vscode_1.workspace.applyEdit(edit);
            this.#cts.cancel();
            if (closePanel) {
                await vscode_1.commands.executeCommand('workbench.action.closeActiveEditor');
            }
            await solution.postInsertionCallback();
        }
    }
    items() {
        return this.#items;
    }
    async acceptFocusedSolution() {
        const solution = this._focusedSolution;
        if (solution) {
            return this.acceptSolution(solution);
        }
    }
    async renderSolutions() {
        const highlighter = await this.#highlighter;
        const content = this.#items.map(item => {
            const firstCitation = item.copilotAnnotations?.ip_code_citations?.[0];
            const details = firstCitation?.details.citations;
            let renderedCitatation;
            if (details && details.length > 0) {
                const licensesSet = new Set(details.map(d => d.license));
                if (licensesSet.has('NOASSERTION')) {
                    licensesSet.delete('NOASSERTION');
                    licensesSet.add('unknown');
                }
                const allLicenses = Array.from(licensesSet).sort();
                const licenseString = allLicenses.length === 1 ? allLicenses[0] : `[${allLicenses.join(', ')}]`;
                renderedCitatation = {
                    message: `Similar code with ${(0, utils_1.pluralize)(allLicenses.length, 'license type')} ${licenseString} detected.`,
                    url: details[0].url,
                };
            }
            const baseContent = {
                htmlSnippet: highlighter.createSnippet(item.insertText.trim()),
                citation: renderedCitatation,
            };
            return this.renderSolutionContent(item, baseContent);
        });
        const message = this.createSolutionsMessage(content, this.#percentage);
        await this.postMessage(message);
    }
    postMessage(message) {
        if (this._isDisposed === false) {
            return this.webviewPanel.webview.postMessage(message);
        }
    }
    _dispose() {
        this._isDisposed = true;
        this._onDidDispose.fire();
        this.suggestionsPanelManager.decrementPanelCount();
        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
        this._onDidDispose.dispose();
    }
};
exports.BaseSuggestionsPanel = BaseSuggestionsPanel;
exports.BaseSuggestionsPanel = BaseSuggestionsPanel = __decorate([
    __param(4, extensionContext_1.IVSCodeExtensionContext)
], BaseSuggestionsPanel);
//# sourceMappingURL=baseSuggestionsPanel.js.map