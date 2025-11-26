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
import { getWindow } from '../../../../base/browser/dom.js';
import { raceCancellationError } from '../../../../base/common/async.js';
import { matchesMimeType } from '../../../../base/common/dataTransfer.js';
import { CancellationError } from '../../../../base/common/errors.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { autorun } from '../../../../base/common/observable.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import * as nls from '../../../../nls.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IWebviewService } from '../../../contrib/webview/browser/webview.js';
import { IExtensionService, isProposedApiEnabled } from '../../../services/extensions/common/extensions.js';
import { ExtensionsRegistry } from '../../../services/extensions/common/extensionsRegistry.js';
export const IChatOutputRendererService = createDecorator('chatOutputRendererService');
let ChatOutputRendererService = class ChatOutputRendererService extends Disposable {
    constructor(_webviewService, _extensionService) {
        super();
        this._webviewService = _webviewService;
        this._extensionService = _extensionService;
        this._contributions = new Map();
        this._renderers = new Map();
        this._register(chatOutputRenderContributionPoint.setHandler(extensions => {
            this.updateContributions(extensions);
        }));
    }
    registerRenderer(viewType, renderer, options) {
        this._renderers.set(viewType, { renderer, options });
        return {
            dispose: () => {
                this._renderers.delete(viewType);
            }
        };
    }
    async renderOutputPart(mime, data, parent, webviewOptions, token) {
        const rendererData = await this.getRenderer(mime, token);
        if (token.isCancellationRequested) {
            throw new CancellationError();
        }
        if (!rendererData) {
            throw new Error(`No renderer registered found for mime type: ${mime}`);
        }
        const store = new DisposableStore();
        const webview = store.add(this._webviewService.createWebviewElement({
            title: '',
            origin: webviewOptions.origin ?? generateUuid(),
            options: {
                enableFindWidget: false,
                purpose: "chatOutputItem" /* WebviewContentPurpose.ChatOutputItem */,
                tryRestoreScrollPosition: false,
            },
            contentOptions: {},
            extension: rendererData.options.extension ? rendererData.options.extension : undefined,
        }));
        const onDidChangeHeight = store.add(new Emitter());
        store.add(autorun(reader => {
            const height = reader.readObservable(webview.intrinsicContentSize);
            if (height) {
                onDidChangeHeight.fire(height.height);
                parent.style.height = `${height.height}px`;
            }
        }));
        webview.mountTo(parent, getWindow(parent));
        await rendererData.renderer.renderOutputPart(mime, data, webview, token);
        return {
            get webview() { return webview; },
            onDidChangeHeight: onDidChangeHeight.event,
            dispose: () => {
                store.dispose();
            },
            reinitialize: () => {
                webview.reinitializeAfterDismount();
            },
        };
    }
    async getRenderer(mime, token) {
        await raceCancellationError(this._extensionService.whenInstalledExtensionsRegistered(), token);
        for (const [id, value] of this._contributions) {
            if (value.mimes.some(m => matchesMimeType(m, [mime]))) {
                await raceCancellationError(this._extensionService.activateByEvent(`onChatOutputRenderer:${id}`), token);
                const rendererData = this._renderers.get(id);
                if (rendererData) {
                    return rendererData;
                }
            }
        }
        return undefined;
    }
    updateContributions(extensions) {
        this._contributions.clear();
        for (const extension of extensions) {
            if (!isProposedApiEnabled(extension.description, 'chatOutputRenderer')) {
                continue;
            }
            for (const contribution of extension.value) {
                if (this._contributions.has(contribution.viewType)) {
                    extension.collector.error(`Chat output renderer with view type '${contribution.viewType}' already registered`);
                    continue;
                }
                this._contributions.set(contribution.viewType, {
                    mimes: contribution.mimeTypes,
                });
            }
        }
    }
};
ChatOutputRendererService = __decorate([
    __param(0, IWebviewService),
    __param(1, IExtensionService)
], ChatOutputRendererService);
export { ChatOutputRendererService };
const chatOutputRendererContributionSchema = {
    type: 'object',
    additionalProperties: false,
    required: ['viewType', 'mimeTypes'],
    properties: {
        viewType: {
            type: 'string',
            description: nls.localize(5901, null),
        },
        mimeTypes: {
            type: 'array',
            description: nls.localize(5902, null),
            items: {
                type: 'string'
            }
        }
    }
};
const chatOutputRenderContributionPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'chatOutputRenderers',
    activationEventsGenerator: function* (contributions) {
        for (const contrib of contributions) {
            yield `onChatOutputRenderer:${contrib.viewType}`;
        }
    },
    jsonSchema: {
        description: nls.localize(5903, null),
        type: 'array',
        items: chatOutputRendererContributionSchema,
    }
});
//# sourceMappingURL=chatOutputItemRenderer.js.map