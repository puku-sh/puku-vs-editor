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
import * as dom from '../../../../base/browser/dom.js';
import * as nls from '../../../../nls.js';
import { Disposable, DisposableMap, DisposableStore } from '../../../../base/common/lifecycle.js';
import * as languages from '../../../../editor/common/languages.js';
import { Emitter } from '../../../../base/common/event.js';
import { ICommentService } from './commentService.js';
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import { CommentNode } from './commentNode.js';
let CommentThreadBody = class CommentThreadBody extends Disposable {
    get length() {
        return this._commentThread.comments ? this._commentThread.comments.length : 0;
    }
    get activeComment() {
        return this._commentElements.filter(node => node.isEditing)[0];
    }
    constructor(_parentEditor, owner, parentResourceUri, container, _markdownRendererOptions, _commentThread, _pendingEdits, _scopedInstatiationService, _parentCommentThreadWidget, commentService) {
        super();
        this._parentEditor = _parentEditor;
        this.owner = owner;
        this.parentResourceUri = parentResourceUri;
        this.container = container;
        this._markdownRendererOptions = _markdownRendererOptions;
        this._commentThread = _commentThread;
        this._pendingEdits = _pendingEdits;
        this._scopedInstatiationService = _scopedInstatiationService;
        this._parentCommentThreadWidget = _parentCommentThreadWidget;
        this.commentService = commentService;
        this._commentElements = [];
        this._resizeObserver = null;
        this._focusedComment = undefined;
        this._onDidResize = new Emitter();
        this.onDidResize = this._onDidResize.event;
        this._commentDisposable = new DisposableMap();
        this._containerClientArea = undefined;
        this._register(dom.addDisposableListener(container, dom.EventType.FOCUS_IN, e => {
            // TODO @rebornix, limit T to IRange | ICellRange
            this.commentService.setActiveEditingCommentThread(this._commentThread);
        }));
    }
    focus(commentUniqueId) {
        if (commentUniqueId !== undefined) {
            const comment = this._commentElements.find(commentNode => commentNode.comment.uniqueIdInThread === commentUniqueId);
            if (comment) {
                comment.focus();
                return;
            }
        }
        this._commentsElement.focus();
    }
    hasCommentsInEditMode() {
        return this._commentElements.some(commentNode => commentNode.isEditing);
    }
    ensureFocusIntoNewEditingComment() {
        if (this._commentElements.length === 1 && this._commentElements[0].isEditing) {
            this._commentElements[0].setFocus(true);
        }
    }
    async display() {
        this._commentsElement = dom.append(this.container, dom.$('div.comments-container'));
        this._commentsElement.setAttribute('role', 'presentation');
        this._commentsElement.tabIndex = 0;
        this._updateAriaLabel();
        this._register(dom.addDisposableListener(this._commentsElement, dom.EventType.KEY_DOWN, (e) => {
            const event = new StandardKeyboardEvent(e);
            if ((event.equals(16 /* KeyCode.UpArrow */) || event.equals(18 /* KeyCode.DownArrow */)) && (!this._focusedComment || !this._commentElements[this._focusedComment].isEditing)) {
                const moveFocusWithinBounds = (change) => {
                    if (this._focusedComment === undefined && change >= 0) {
                        return 0;
                    }
                    if (this._focusedComment === undefined && change < 0) {
                        return this._commentElements.length - 1;
                    }
                    const newIndex = this._focusedComment + change;
                    return Math.min(Math.max(0, newIndex), this._commentElements.length - 1);
                };
                this._setFocusedComment(event.equals(16 /* KeyCode.UpArrow */) ? moveFocusWithinBounds(-1) : moveFocusWithinBounds(1));
            }
        }));
        this._commentDisposable.clearAndDisposeAll();
        this._commentElements = [];
        if (this._commentThread.comments) {
            for (const comment of this._commentThread.comments) {
                const newCommentNode = this.createNewCommentNode(comment);
                this._commentElements.push(newCommentNode);
                this._commentsElement.appendChild(newCommentNode.domNode);
                if (comment.mode === languages.CommentMode.Editing) {
                    await newCommentNode.switchToEditMode();
                }
            }
        }
        this._resizeObserver = new MutationObserver(this._refresh.bind(this));
        this._resizeObserver.observe(this.container, {
            attributes: true,
            childList: true,
            characterData: true,
            subtree: true
        });
    }
    _refresh() {
        const dimensions = dom.getClientArea(this.container);
        if ((dimensions.height === 0 && dimensions.width === 0) || (dom.Dimension.equals(this._containerClientArea, dimensions))) {
            return;
        }
        this._containerClientArea = dimensions;
        this._onDidResize.fire(dimensions);
    }
    getDimensions() {
        return dom.getClientArea(this.container);
    }
    layout(widthInPixel) {
        this._commentElements.forEach(element => {
            element.layout(widthInPixel);
        });
    }
    getPendingEdits() {
        const pendingEdits = {};
        this._commentElements.forEach(element => {
            if (element.isEditing) {
                const pendingEdit = element.getPendingEdit();
                if (pendingEdit) {
                    pendingEdits[element.comment.uniqueIdInThread] = pendingEdit;
                }
            }
        });
        return pendingEdits;
    }
    getCommentCoords(commentUniqueId) {
        const matchedNode = this._commentElements.filter(commentNode => commentNode.comment.uniqueIdInThread === commentUniqueId);
        if (matchedNode && matchedNode.length) {
            const commentThreadCoords = dom.getDomNodePagePosition(this._commentElements[0].domNode);
            const commentCoords = dom.getDomNodePagePosition(matchedNode[0].domNode);
            return {
                thread: commentThreadCoords,
                comment: commentCoords
            };
        }
        return;
    }
    async updateCommentThread(commentThread, preserveFocus) {
        const oldCommentsLen = this._commentElements.length;
        const newCommentsLen = commentThread.comments ? commentThread.comments.length : 0;
        const commentElementsToDel = [];
        const commentElementsToDelIndex = [];
        for (let i = 0; i < oldCommentsLen; i++) {
            const comment = this._commentElements[i].comment;
            const newComment = commentThread.comments ? commentThread.comments.filter(c => c.uniqueIdInThread === comment.uniqueIdInThread) : [];
            if (newComment.length) {
                this._commentElements[i].update(newComment[0]);
            }
            else {
                commentElementsToDelIndex.push(i);
                commentElementsToDel.push(this._commentElements[i]);
            }
        }
        // del removed elements
        for (let i = commentElementsToDel.length - 1; i >= 0; i--) {
            const commentToDelete = commentElementsToDel[i];
            this._commentDisposable.deleteAndDispose(commentToDelete);
            this._commentElements.splice(commentElementsToDelIndex[i], 1);
            commentToDelete.domNode.remove();
        }
        let lastCommentElement = null;
        const newCommentNodeList = [];
        const newCommentsInEditMode = [];
        const startEditing = [];
        for (let i = newCommentsLen - 1; i >= 0; i--) {
            const currentComment = commentThread.comments[i];
            const oldCommentNode = this._commentElements.filter(commentNode => commentNode.comment.uniqueIdInThread === currentComment.uniqueIdInThread);
            if (oldCommentNode.length) {
                lastCommentElement = oldCommentNode[0].domNode;
                newCommentNodeList.unshift(oldCommentNode[0]);
            }
            else {
                const newElement = this.createNewCommentNode(currentComment);
                newCommentNodeList.unshift(newElement);
                if (lastCommentElement) {
                    this._commentsElement.insertBefore(newElement.domNode, lastCommentElement);
                    lastCommentElement = newElement.domNode;
                }
                else {
                    this._commentsElement.appendChild(newElement.domNode);
                    lastCommentElement = newElement.domNode;
                }
                if (currentComment.mode === languages.CommentMode.Editing) {
                    startEditing.push(newElement.switchToEditMode());
                    newCommentsInEditMode.push(newElement);
                }
            }
        }
        this._commentThread = commentThread;
        this._commentElements = newCommentNodeList;
        // Start editing *after* updating the thread and elements to avoid a sequencing issue https://github.com/microsoft/vscode/issues/239191
        await Promise.all(startEditing);
        if (newCommentsInEditMode.length) {
            const lastIndex = this._commentElements.indexOf(newCommentsInEditMode[newCommentsInEditMode.length - 1]);
            this._focusedComment = lastIndex;
        }
        this._updateAriaLabel();
        if (!preserveFocus) {
            this._setFocusedComment(this._focusedComment);
        }
    }
    _updateAriaLabel() {
        if (this._commentThread.isDocumentCommentThread()) {
            if (this._commentThread.range) {
                this._commentsElement.ariaLabel = nls.localize('commentThreadAria.withRange', "Comment thread with {0} comments on lines {1} through {2}. {3}.", this._commentThread.comments?.length, this._commentThread.range.startLineNumber, this._commentThread.range.endLineNumber, this._commentThread.label);
            }
            else {
                this._commentsElement.ariaLabel = nls.localize('commentThreadAria.document', "Comment thread with {0} comments on the entire document. {1}.", this._commentThread.comments?.length, this._commentThread.label);
            }
        }
        else {
            this._commentsElement.ariaLabel = nls.localize('commentThreadAria', "Comment thread with {0} comments. {1}.", this._commentThread.comments?.length, this._commentThread.label);
        }
    }
    _setFocusedComment(value) {
        if (this._focusedComment !== undefined) {
            this._commentElements[this._focusedComment]?.setFocus(false);
        }
        if (this._commentElements.length === 0 || value === undefined) {
            this._focusedComment = undefined;
        }
        else {
            this._focusedComment = Math.min(value, this._commentElements.length - 1);
            this._commentElements[this._focusedComment].setFocus(true);
        }
    }
    createNewCommentNode(comment) {
        const newCommentNode = this._scopedInstatiationService.createInstance(CommentNode, this._parentEditor, this._commentThread, comment, this._pendingEdits ? this._pendingEdits[comment.uniqueIdInThread] : undefined, this.owner, this.parentResourceUri, this._parentCommentThreadWidget, this._markdownRendererOptions);
        const disposables = new DisposableStore();
        disposables.add(newCommentNode.onDidClick(clickedNode => this._setFocusedComment(this._commentElements.findIndex(commentNode => commentNode.comment.uniqueIdInThread === clickedNode.comment.uniqueIdInThread))));
        disposables.add(newCommentNode);
        this._commentDisposable.set(newCommentNode, disposables);
        return newCommentNode;
    }
    dispose() {
        super.dispose();
        if (this._resizeObserver) {
            this._resizeObserver.disconnect();
            this._resizeObserver = null;
        }
        this._commentDisposable.dispose();
    }
};
CommentThreadBody = __decorate([
    __param(9, ICommentService)
], CommentThreadBody);
export { CommentThreadBody };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudFRocmVhZEJvZHkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWhhbWVkL0Rlc2t0b3AvcHVrdS12cy1lZGl0b3IvcHVrdS1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jb21tZW50cy9icm93c2VyL2NvbW1lbnRUaHJlYWRCb2R5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUM7QUFDdkQsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUMxQyxPQUFPLEVBQUUsVUFBVSxFQUFFLGFBQWEsRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRyxPQUFPLEtBQUssU0FBUyxNQUFNLHdDQUF3QyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDdEQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFFbEYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBU3hDLElBQU0saUJBQWlCLEdBQXZCLE1BQU0saUJBQTBELFNBQVEsVUFBVTtJQVV4RixJQUFJLE1BQU07UUFDVCxPQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMvRSxDQUFDO0lBRUQsSUFBSSxhQUFhO1FBQ2hCLE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FB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