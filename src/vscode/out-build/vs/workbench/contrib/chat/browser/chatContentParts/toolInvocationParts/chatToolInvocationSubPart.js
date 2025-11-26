/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../../../base/common/codicons.js';
import { Emitter } from '../../../../../../base/common/event.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../../../base/common/themables.js';
import { IChatToolInvocation } from '../../../common/chatService.js';
export class BaseChatToolInvocationSubPart extends Disposable {
    static { this.idPool = 0; }
    get codeblocksPartId() {
        return this._codeBlocksPartId;
    }
    constructor(toolInvocation) {
        super();
        this.toolInvocation = toolInvocation;
        this._onNeedsRerender = this._register(new Emitter());
        this.onNeedsRerender = this._onNeedsRerender.event;
        this._onDidChangeHeight = this._register(new Emitter());
        this.onDidChangeHeight = this._onDidChangeHeight.event;
        this._codeBlocksPartId = 'tool-' + (BaseChatToolInvocationSubPart.idPool++);
    }
    getIcon() {
        const toolInvocation = this.toolInvocation;
        const confirmState = IChatToolInvocation.executionConfirmedOrDenied(toolInvocation);
        const isSkipped = confirmState?.type === 5 /* ToolConfirmKind.Skipped */;
        if (isSkipped) {
            return Codicon.circleSlash;
        }
        return confirmState?.type === 0 /* ToolConfirmKind.Denied */ ?
            Codicon.error :
            IChatToolInvocation.isComplete(toolInvocation) ?
                Codicon.check : ThemeIcon.modify(Codicon.loading, 'spin');
    }
}
//# sourceMappingURL=chatToolInvocationSubPart.js.map