/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { StringSHA1 } from '../../../../../base/common/hash.js';
import { LocalChatSessionUri } from '../../common/chatUri.js';
export var FileOperationType;
(function (FileOperationType) {
    FileOperationType["Create"] = "create";
    FileOperationType["Delete"] = "delete";
    FileOperationType["Rename"] = "rename";
    FileOperationType["TextEdit"] = "textEdit";
    FileOperationType["NotebookEdit"] = "notebookEdit";
})(FileOperationType || (FileOperationType = {}));
export function getKeyForChatSessionResource(chatSessionResource) {
    const sessionId = LocalChatSessionUri.parseLocalSessionId(chatSessionResource);
    if (sessionId) {
        return sessionId;
    }
    const sha = new StringSHA1();
    sha.update(chatSessionResource.toString());
    return sha.digest();
}
//# sourceMappingURL=chatEditingOperations.js.map