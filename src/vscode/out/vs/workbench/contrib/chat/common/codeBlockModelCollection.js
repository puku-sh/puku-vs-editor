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
import { encodeBase64, VSBuffer } from '../../../../base/common/buffer.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import { URI } from '../../../../base/common/uri.js';
import { Range } from '../../../../editor/common/core/range.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { PLAINTEXT_LANGUAGE_ID } from '../../../../editor/common/languages/modesRegistry.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { extractCodeblockUrisFromText, extractVulnerabilitiesFromText } from './annotations.js';
import { isResponseVM } from './chatViewModel.js';
let CodeBlockModelCollection = class CodeBlockModelCollection extends Disposable {
    constructor(tag, languageService, textModelService) {
        super();
        this.tag = tag;
        this.languageService = languageService;
        this.textModelService = textModelService;
        this._models = new Map();
        /**
         * Max number of models to keep in memory.
         *
         * Currently always maintains the most recently created models.
         */
        this.maxModelCount = 100;
        this._register(this.languageService.onDidChange(async () => {
            for (const entry of this._models.values()) {
                if (!entry.inLanguageId) {
                    continue;
                }
                const model = (await entry.model).object;
                const existingLanguageId = model.getLanguageId();
                if (!existingLanguageId || existingLanguageId === PLAINTEXT_LANGUAGE_ID) {
                    this.trySetTextModelLanguage(entry.inLanguageId, model.textEditorModel);
                }
            }
        }));
    }
    dispose() {
        super.dispose();
        this.clear();
    }
    get(sessionResource, chat, codeBlockIndex) {
        const entry = this._models.get(this.getKey(sessionResource, chat, codeBlockIndex));
        if (!entry) {
            return;
        }
        return {
            model: entry.model.then(ref => ref.object.textEditorModel),
            vulns: entry.vulns,
            codemapperUri: entry.codemapperUri,
            isEdit: entry.isEdit,
        };
    }
    getOrCreate(sessionResource, chat, codeBlockIndex) {
        const existing = this.get(sessionResource, chat, codeBlockIndex);
        if (existing) {
            return existing;
        }
        const uri = this.getCodeBlockUri(sessionResource, chat, codeBlockIndex);
        const model = this.textModelService.createModelReference(uri);
        this._models.set(this.getKey(sessionResource, chat, codeBlockIndex), {
            model: model,
            vulns: [],
            inLanguageId: undefined,
            codemapperUri: undefined,
        });
        while (this._models.size > this.maxModelCount) {
            const first = Iterable.first(this._models.keys());
            if (!first) {
                break;
            }
            this.delete(first);
        }
        return { model: model.then(x => x.object.textEditorModel), vulns: [], codemapperUri: undefined };
    }
    delete(key) {
        const entry = this._models.get(key);
        if (!entry) {
            return;
        }
        entry.model.then(ref => ref.dispose());
        this._models.delete(key);
    }
    clear() {
        this._models.forEach(async (entry) => await entry.model.then(ref => ref.dispose()));
        this._models.clear();
    }
    updateSync(sessionResource, chat, codeBlockIndex, content) {
        const entry = this.getOrCreate(sessionResource, chat, codeBlockIndex);
        this.updateInternalCodeBlockEntry(content, sessionResource, chat, codeBlockIndex);
        return this.get(sessionResource, chat, codeBlockIndex) ?? entry;
    }
    markCodeBlockCompleted(sessionResource, chat, codeBlockIndex) {
        const entry = this._models.get(this.getKey(sessionResource, chat, codeBlockIndex));
        if (!entry) {
            return;
        }
        // TODO: fill this in once we've implemented https://github.com/microsoft/vscode/issues/232538
    }
    async update(sessionResource, chat, codeBlockIndex, content) {
        const entry = this.getOrCreate(sessionResource, chat, codeBlockIndex);
        const newText = this.updateInternalCodeBlockEntry(content, sessionResource, chat, codeBlockIndex);
        const textModel = await entry.model;
        if (!textModel || textModel.isDisposed()) {
            // Somehow we get an undefined textModel sometimes - #237782
            return entry;
        }
        if (content.languageId) {
            this.trySetTextModelLanguage(content.languageId, textModel);
        }
        const currentText = textModel.getValue(1 /* EndOfLinePreference.LF */);
        if (newText === currentText) {
            return entry;
        }
        if (newText.startsWith(currentText)) {
            const text = newText.slice(currentText.length);
            const lastLine = textModel.getLineCount();
            const lastCol = textModel.getLineMaxColumn(lastLine);
            textModel.applyEdits([{ range: new Range(lastLine, lastCol, lastLine, lastCol), text }]);
        }
        else {
            // console.log(`Failed to optimize setText`);
            textModel.setValue(newText);
        }
        return entry;
    }
    updateInternalCodeBlockEntry(content, sessionResource, chat, codeBlockIndex) {
        const entry = this._models.get(this.getKey(sessionResource, chat, codeBlockIndex));
        if (entry) {
            entry.inLanguageId = content.languageId;
        }
        const extractedVulns = extractVulnerabilitiesFromText(content.text);
        let newText = fixCodeText(extractedVulns.newText, content.languageId);
        if (entry) {
            entry.vulns = extractedVulns.vulnerabilities;
        }
        const codeblockUri = extractCodeblockUrisFromText(newText);
        if (codeblockUri) {
            if (entry) {
                entry.codemapperUri = codeblockUri.uri;
                entry.isEdit = codeblockUri.isEdit;
            }
            newText = codeblockUri.textWithoutResult;
        }
        if (content.isComplete) {
            this.markCodeBlockCompleted(sessionResource, chat, codeBlockIndex);
        }
        return newText;
    }
    trySetTextModelLanguage(inLanguageId, textModel) {
        const vscodeLanguageId = this.languageService.getLanguageIdByLanguageName(inLanguageId);
        if (vscodeLanguageId && vscodeLanguageId !== textModel.getLanguageId()) {
            textModel.setLanguage(vscodeLanguageId);
        }
    }
    getKey(sessionResource, chat, index) {
        return `${sessionResource.toString()}/${chat.id}/${index}`;
    }
    getCodeBlockUri(sessionResource, chat, index) {
        const metadata = this.getUriMetaData(chat);
        const indexPart = this.tag ? `${this.tag}-${index}` : `${index}`;
        const encodedSessionId = encodeBase64(VSBuffer.wrap(new TextEncoder().encode(sessionResource.toString())), false, true);
        return URI.from({
            scheme: Schemas.vscodeChatCodeBlock,
            authority: encodedSessionId,
            path: `/${chat.id}/${indexPart}`,
            fragment: metadata ? JSON.stringify(metadata) : undefined,
        });
    }
    getUriMetaData(chat) {
        if (!isResponseVM(chat)) {
            return undefined;
        }
        return {
            references: chat.contentReferences.map(ref => {
                if (typeof ref.reference === 'string') {
                    return;
                }
                const uriOrLocation = 'variableName' in ref.reference ?
                    ref.reference.value :
                    ref.reference;
                if (!uriOrLocation) {
                    return;
                }
                if (URI.isUri(uriOrLocation)) {
                    return {
                        uri: uriOrLocation.toJSON()
                    };
                }
                return {
                    uri: uriOrLocation.uri.toJSON(),
                    range: uriOrLocation.range,
                };
            })
        };
    }
};
CodeBlockModelCollection = __decorate([
    __param(1, ILanguageService),
    __param(2, ITextModelService)
], CodeBlockModelCollection);
export { CodeBlockModelCollection };
function fixCodeText(text, languageId) {
    if (languageId === 'php') {
        // <?php or short tag version <?
        if (!text.trim().startsWith('<?')) {
            return `<?php\n${text}`;
        }
    }
    return text;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUJsb2NrTW9kZWxDb2xsZWN0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FoYW1lZC9EZXNrdG9wL3B1a3UtdnMtZWRpdG9yL3B1a3UtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vY29kZUJsb2NrTW9kZWxDb2xsZWN0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxZQUFZLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDM0UsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxVQUFVLEVBQWMsTUFBTSxzQ0FBc0MsQ0FBQztBQUM5RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDN0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUNuRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUU3RixPQUFPLEVBQTRCLGlCQUFpQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDcEgsT0FBTyxFQUFFLDRCQUE0QixFQUFFLDhCQUE4QixFQUEwQixNQUFNLGtCQUFrQixDQUFDO0FBQ3hILE9BQU8sRUFBaUQsWUFBWSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFnQjFGLElBQU0sd0JBQXdCLEdBQTlCLE1BQU0sd0JBQXlCLFNBQVEsVUFBVTtJQWlCdkQsWUFDa0IsR0FBdUIsRUFDdEIsZUFBa0QsRUFDakQsZ0JBQW9EO1FBRXZFLEtBQUssRUFBRSxDQUFDO1FBSlMsUUFBRyxHQUFILEdBQUcsQ0FB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