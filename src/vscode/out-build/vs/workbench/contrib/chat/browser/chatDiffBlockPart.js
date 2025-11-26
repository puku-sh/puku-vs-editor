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
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Emitter } from '../../../../base/common/event.js';
import { hashAsync } from '../../../../base/common/hash.js';
import { Disposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import { URI } from '../../../../base/common/uri.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { EditorModel } from '../../../common/editor/editorModel.js';
/**
 * Parses unified diff format into before/after content.
 * Supports standard unified diff format with - and + prefixes.
 */
export function parseUnifiedDiff(diffText) {
    const lines = diffText.split('\n');
    const beforeLines = [];
    const afterLines = [];
    for (const line of lines) {
        if (line.startsWith('- ')) {
            beforeLines.push(line.substring(2));
        }
        else if (line.startsWith('-')) {
            beforeLines.push(line.substring(1));
        }
        else if (line.startsWith('+ ')) {
            afterLines.push(line.substring(2));
        }
        else if (line.startsWith('+')) {
            afterLines.push(line.substring(1));
        }
        else if (line.startsWith(' ')) {
            // Context line - appears in both
            const content = line.substring(1);
            beforeLines.push(content);
            afterLines.push(content);
        }
        else if (!line.startsWith('@@') && !line.startsWith('---') && !line.startsWith('+++') && !line.startsWith('diff ')) {
            // Regular line without prefix - treat as context
            beforeLines.push(line);
            afterLines.push(line);
        }
    }
    return {
        before: beforeLines.join('\n'),
        after: afterLines.join('\n')
    };
}
/**
 * Simple diff editor model for inline diffs in markdown code blocks
 */
class SimpleDiffEditorModel extends EditorModel {
    constructor(_original, _modified) {
        super();
        this._original = _original;
        this._modified = _modified;
        this.original = this._original.object.textEditorModel;
        this.modified = this._modified.object.textEditorModel;
    }
    dispose() {
        super.dispose();
        this._original.dispose();
        this._modified.dispose();
    }
}
/**
 * Renders a diff block from markdown content.
 * This is a lightweight wrapper that uses CodeCompareBlockPart for the actual rendering.
 */
let MarkdownDiffBlockPart = class MarkdownDiffBlockPart extends Disposable {
    constructor(data, diffEditorPool, currentWidth, modelService, textModelService, languageService) {
        super();
        this.modelService = modelService;
        this.textModelService = textModelService;
        this.languageService = languageService;
        this._onDidChangeContentHeight = this._register(new Emitter());
        this.onDidChangeContentHeight = this._onDidChangeContentHeight.event;
        this.modelRef = this._register(new MutableDisposable());
        this.comparePart = this._register(diffEditorPool.get());
        this._register(this.comparePart.object.onDidChangeContentHeight(() => {
            this._onDidChangeContentHeight.fire();
        }));
        // Create in-memory models for the diff
        const originalUri = URI.from({
            scheme: Schemas.vscodeChatCodeBlock,
            path: `/chat-diff-original-${data.codeBlockIndex}-${generateUuid()}`,
        });
        const modifiedUri = URI.from({
            scheme: Schemas.vscodeChatCodeBlock,
            path: `/chat-diff-modified-${data.codeBlockIndex}-${generateUuid()}`,
        });
        const languageSelection = this.languageService.createById(data.languageId);
        // Create the models
        this._register(this.modelService.createModel(data.beforeContent, languageSelection, originalUri, false));
        this._register(this.modelService.createModel(data.afterContent, languageSelection, modifiedUri, false));
        const modelsPromise = Promise.all([
            this.textModelService.createModelReference(originalUri),
            this.textModelService.createModelReference(modifiedUri)
        ]).then(([originalRef, modifiedRef]) => {
            return new SimpleDiffEditorModel(originalRef, modifiedRef);
        });
        const compareData = {
            element: data.element,
            isReadOnly: data.isReadOnly,
            horizontalPadding: data.horizontalPadding,
            edit: {
                uri: data.codeBlockResource || modifiedUri,
                edits: [],
                kind: 'textEditGroup',
                done: true
            },
            diffData: modelsPromise.then(async (model) => {
                this.modelRef.value = model;
                const diffData = {
                    original: model.original,
                    modified: model.modified,
                    originalSha1: await hashAsync(model.original.getValue()),
                };
                return diffData;
            })
        };
        this.comparePart.object.render(compareData, currentWidth, CancellationToken.None);
        this.element = this.comparePart.object.element;
    }
    layout(width) {
        this.comparePart.object.layout(width);
    }
    reset() {
        this.modelRef.clear();
    }
};
MarkdownDiffBlockPart = __decorate([
    __param(3, IModelService),
    __param(4, ITextModelService),
    __param(5, ILanguageService)
], MarkdownDiffBlockPart);
export { MarkdownDiffBlockPart };
//# sourceMappingURL=chatDiffBlockPart.js.map