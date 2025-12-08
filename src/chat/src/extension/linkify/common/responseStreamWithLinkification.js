"use strict";
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
exports.ResponseStreamWithLinkification = void 0;
const workspaceService_1 = require("../../../platform/workspace/common/workspaceService");
const cancellation_1 = require("../../../util/vs/base/common/cancellation");
const vscodeTypes_1 = require("../../../vscodeTypes");
const linkifiedText_1 = require("./linkifiedText");
const linkifyService_1 = require("./linkifyService");
/**
 * Proxy of {@linkcode ChatResponseStream} that linkifies paths and symbols in emitted Markdown.
 */
let ResponseStreamWithLinkification = class ResponseStreamWithLinkification {
    constructor(context, progress, additionalLinkifiers, token, linkifyService, workspaceService) {
        this.workspaceService = workspaceService;
        //#endregion
        this.sequencer = Promise.resolve();
        this._linkifier = linkifyService.createLinkifier(context, additionalLinkifiers);
        this._progress = progress;
        this._token = token;
    }
    get totalAddedLinkCount() {
        return this._linkifier.totalAddedLinkCount;
    }
    clearToPreviousToolInvocation(reason) {
        this._linkifier.flush(cancellation_1.CancellationToken.None);
        this._progress.clearToPreviousToolInvocation(reason);
    }
    //#region ChatResponseStream
    markdown(value) {
        this.appendMarkdown(typeof value === 'string' ? new vscodeTypes_1.MarkdownString(value) : value);
        return this;
    }
    anchor(value, title) {
        this.enqueue(() => this._progress.anchor(value, title), false);
        return this;
    }
    button(command) {
        this.enqueue(() => this._progress.button(command), true);
        return this;
    }
    filetree(value, baseUri) {
        this.enqueue(() => this._progress.filetree(value, baseUri), true);
        return this;
    }
    progress(value) {
        this.enqueue(() => this._progress.progress(value), false);
        return this;
    }
    thinkingProgress(thinkingDelta) {
        this.enqueue(() => this._progress.thinkingProgress(thinkingDelta), false);
        return this;
    }
    warning(value) {
        this.enqueue(() => this._progress.warning(value), false);
        return this;
    }
    reference(value) {
        this.enqueue(() => this._progress.reference(value), false);
        return this;
    }
    reference2(value) {
        this.enqueue(() => this._progress.reference(value), false);
        return this;
    }
    codeCitation(value, license, snippet) {
        this.enqueue(() => this._progress.codeCitation(value, license, snippet), false);
        return this;
    }
    externalEdit(target, callback) {
        return this.enqueue(() => this._progress.externalEdit(target, callback), true);
    }
    push(part) {
        if (part instanceof vscodeTypes_1.ChatResponseMarkdownPart) {
            this.appendMarkdown(part.value);
        }
        else {
            this.enqueue(() => this._progress.push(part), this.isBlockPart(part));
        }
        return this;
    }
    isBlockPart(part) {
        return part instanceof vscodeTypes_1.ChatResponseFileTreePart
            || part instanceof vscodeTypes_1.ChatResponseCommandButtonPart
            || part instanceof vscodeTypes_1.ChatResponseConfirmationPart
            || part instanceof vscodeTypes_1.ChatPrepareToolInvocationPart
            || part instanceof vscodeTypes_1.ChatToolInvocationPart
            || part instanceof vscodeTypes_1.ChatResponseThinkingProgressPart;
    }
    textEdit(target, editsOrDone) {
        // TS makes me do this
        if (editsOrDone === true) {
            this.enqueue(() => this._progress.textEdit(target, editsOrDone), false);
        }
        else {
            this.enqueue(() => this._progress.textEdit(target, editsOrDone), false);
        }
        return this;
    }
    notebookEdit(target, editsOrDone) {
        // TS makes me do this
        if (editsOrDone === true) {
            this.enqueue(() => this._progress.notebookEdit(target, editsOrDone), false);
        }
        else {
            this.enqueue(() => this._progress.notebookEdit(target, editsOrDone), false);
        }
        return this;
    }
    markdownWithVulnerabilities(value, vulnerabilities) {
        this.enqueue(() => this._progress.markdownWithVulnerabilities(value, vulnerabilities), false);
        return this;
    }
    codeblockUri(uri, isEdit) {
        if ('codeblockUri' in this._progress) {
            this.enqueue(() => this._progress.codeblockUri(uri, isEdit), false);
        }
    }
    confirmation(title, message, data) {
        this.enqueue(() => this._progress.confirmation(title, message, data), true);
        return this;
    }
    prepareToolInvocation(toolName) {
        this.enqueue(() => this._progress.prepareToolInvocation(toolName), false);
        return this;
    }
    enqueue(f, flush) {
        if (flush) {
            this.sequencer = this.sequencer.then(() => this.doFinalize());
        }
        this.sequencer = this.sequencer.then(f);
        return this.sequencer;
    }
    async appendMarkdown(md) {
        if (!md.value) {
            return;
        }
        this.enqueue(async () => {
            const output = await this._linkifier.append(md.value, this._token);
            if (this._token.isCancellationRequested) {
                return;
            }
            this.outputMarkdown(output);
        }, false);
    }
    async finalize() {
        await this.enqueue(() => this.doFinalize(), false);
    }
    async doFinalize() {
        const textToApply = await this._linkifier.flush(this._token);
        if (this._token.isCancellationRequested) {
            return;
        }
        if (textToApply) {
            this.outputMarkdown(textToApply);
        }
    }
    outputMarkdown(textToApply) {
        for (const part of textToApply.parts) {
            if (typeof part === 'string') {
                if (!part.length) {
                    continue;
                }
                const content = new vscodeTypes_1.MarkdownString(part);
                const folder = this.workspaceService.getWorkspaceFolders()?.at(0);
                if (folder) {
                    content.baseUri = folder.path.endsWith('/') ? folder : folder.with({ path: folder.path + '/' });
                }
                this._progress.markdown(content);
            }
            else {
                if (part instanceof linkifiedText_1.LinkifySymbolAnchor) {
                    const chatPart = new vscodeTypes_1.ChatResponseAnchorPart(part.symbolInformation);
                    if (part.resolve) {
                        chatPart.resolve = () => part.resolve(this._token);
                    }
                    this._progress.push(chatPart);
                }
                else {
                    this._progress.anchor(part.value, part.title);
                }
            }
        }
    }
};
exports.ResponseStreamWithLinkification = ResponseStreamWithLinkification;
exports.ResponseStreamWithLinkification = ResponseStreamWithLinkification = __decorate([
    __param(4, linkifyService_1.ILinkifyService),
    __param(5, workspaceService_1.IWorkspaceService)
], ResponseStreamWithLinkification);
//# sourceMappingURL=responseStreamWithLinkification.js.map