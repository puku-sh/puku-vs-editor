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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFRvb2xJbnZvY2F0aW9uU3ViUGFydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvcG9yaWRoaS9kZXZlbG9wbWVudC9wdWt1LXZzLWVkaXRvci9zcmMvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0Q29udGVudFBhcnRzL3Rvb2xJbnZvY2F0aW9uUGFydHMvY2hhdFRvb2xJbnZvY2F0aW9uU3ViUGFydC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDcEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUN4RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDdkUsT0FBTyxFQUFFLG1CQUFtQixFQUFrRCxNQUFNLGdDQUFnQyxDQUFDO0FBR3JILE1BQU0sT0FBZ0IsNkJBQThCLFNBQVEsVUFBVTthQUNwRCxXQUFNLEdBQUcsQ0FBQyxBQUFKLENBQUs7SUFhNUIsSUFBVyxnQkFBZ0I7UUFDMUIsT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQUM7SUFDL0IsQ0FBQztJQUVELFlBQ29CLGNBQW1FO1FBRXRGLEtBQUssRUFBRSxDQUFDO1FBRlcsbUJBQWMsR0FBZCxjQUFjLENBQXFEO1FBZjdFLHFCQUFnQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFDO1FBQ2pELG9CQUFlLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQztRQUVwRCx1QkFBa0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQztRQUNuRCxzQkFBaUIsR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDO1FBSWpELHNCQUFpQixHQUFHLE9BQU8sR0FBRyxDQUFDLDZCQUE2QixDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7SUFVeEYsQ0FBQztJQUVTLE9BQU87UUFDaEIsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQztRQUMzQyxNQUFNLFlBQVksR0FBRyxtQkFBbUIsQ0FBQywwQkFBMEIsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUNwRixNQUFNLFNBQVMsR0FBRyxZQUFZLEVBQUUsSUFBSSxvQ0FBNEIsQ0FBQztRQUNqRSxJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQ2YsT0FBTyxPQUFPLENBQUMsV0FBVyxDQUFDO1FBQzVCLENBQUM7UUFFRCxPQUFPLFlBQVksRUFBRSxJQUFJLG1DQUEyQixDQUFDLENBQUM7WUFDckQsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ2YsbUJBQW1CLENBQUMsVUFBVSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7Z0JBQy9DLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQztJQUM3RCxDQUFDIn0=