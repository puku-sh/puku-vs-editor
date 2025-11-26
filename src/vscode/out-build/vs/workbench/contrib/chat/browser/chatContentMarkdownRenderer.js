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
import { $ } from '../../../../base/browser/dom.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { IMarkdownRendererService } from '../../../../platform/markdown/browser/markdownRenderer.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import product from '../../../../platform/product/common/product.js';
export const allowedChatMarkdownHtmlTags = Object.freeze([
    'b',
    'blockquote',
    'br',
    'code',
    'del',
    'em',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'hr',
    'i',
    'ins',
    'li',
    'ol',
    'p',
    'pre',
    's',
    'strong',
    'sub',
    'sup',
    'table',
    'tbody',
    'td',
    'th',
    'thead',
    'tr',
    'ul',
    'a',
    'img',
    // TODO@roblourens when we sanitize attributes in markdown source, we can ban these elements at that step. microsoft/vscode-copilot#5091
    // Not in the official list, but used for codicons and other vscode markdown extensions
    'span',
    'div',
    'input', // Allowed for rendering checkboxes. Other types of inputs are removed and the inputs are always disabled
]);
/**
 * This wraps the MarkdownRenderer and applies sanitizer options needed for chat content.
 */
let ChatContentMarkdownRenderer = class ChatContentMarkdownRenderer {
    constructor(languageService, openerService, configurationService, hoverService, markdownRendererService) {
        this.hoverService = hoverService;
        this.markdownRendererService = markdownRendererService;
    }
    render(markdown, options, outElement) {
        options = {
            ...options,
            sanitizerConfig: {
                replaceWithPlaintext: true,
                allowedTags: {
                    override: allowedChatMarkdownHtmlTags,
                },
                ...options?.sanitizerConfig,
                allowedLinkSchemes: { augment: [product.urlProtocol] },
                remoteImageIsAllowed: (_uri) => false,
            }
        };
        const mdWithBody = (markdown && markdown.supportHtml) ?
            {
                ...markdown,
                // dompurify uses DOMParser, which strips leading comments. Wrapping it all in 'body' prevents this.
                // The \n\n prevents marked.js from parsing the body contents as just text in an 'html' token, instead of actual markdown.
                value: `<body>\n\n${markdown.value}</body>`,
            }
            : markdown;
        const result = this.markdownRendererService.render(mdWithBody, options, outElement);
        // In some cases, the renderer can return top level text nodes  but our CSS expects
        // all text to be in a <p> for margin to be applied properly.
        // So just normalize it.
        result.element.normalize();
        for (const child of result.element.childNodes) {
            if (child.nodeType === Node.TEXT_NODE && child.textContent?.trim()) {
                child.replaceWith($('p', undefined, child.textContent));
            }
        }
        return this.attachCustomHover(result);
    }
    attachCustomHover(result) {
        const store = new DisposableStore();
        // eslint-disable-next-line no-restricted-syntax
        result.element.querySelectorAll('a').forEach((element) => {
            if (element.title) {
                const title = element.title;
                element.title = '';
                store.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('element'), element, title));
            }
        });
        return {
            element: result.element,
            dispose: () => {
                result.dispose();
                store.dispose();
            }
        };
    }
};
ChatContentMarkdownRenderer = __decorate([
    __param(0, ILanguageService),
    __param(1, IOpenerService),
    __param(2, IConfigurationService),
    __param(3, IHoverService),
    __param(4, IMarkdownRendererService)
], ChatContentMarkdownRenderer);
export { ChatContentMarkdownRenderer };
//# sourceMappingURL=chatContentMarkdownRenderer.js.map