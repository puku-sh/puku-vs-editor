/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
export class PromptTypeDetectionCapability extends Disposable {
    constructor() {
        super(...arguments);
        this.type = 6 /* TerminalCapability.PromptTypeDetection */;
        this._onPromptTypeChanged = this._register(new Emitter());
        this.onPromptTypeChanged = this._onPromptTypeChanged.event;
    }
    get promptType() { return this._promptType; }
    setPromptType(value) {
        this._promptType = value;
        this._onPromptTypeChanged.fire(value);
    }
}
//# sourceMappingURL=promptTypeDetectionCapability.js.map