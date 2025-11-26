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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdPcGVyYXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FoYW1lZC9EZXNrdG9wL3B1a3UtdnMtZWRpdG9yL3B1a3UtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRFZGl0aW5nL2NoYXRFZGl0aW5nT3BlcmF0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFLaEUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFFOUQsTUFBTSxDQUFOLElBQVksaUJBTVg7QUFORCxXQUFZLGlCQUFpQjtJQUM1QixzQ0FBaUIsQ0FBQTtJQUNqQixzQ0FBaUIsQ0FBQTtJQUNqQixzQ0FBaUIsQ0FBQTtJQUNqQiwwQ0FBcUIsQ0FBQTtJQUNyQixrREFBNkIsQ0FBQTtBQUM5QixDQUFDLEVBTlcsaUJBQWlCLEtBQWpCLGlCQUFpQixRQU01QjtBQXNIRCxNQUFNLFVBQVUsNEJBQTRCLENBQUMsbUJBQXdCO0lBQ3BFLE1BQU0sU0FBUyxHQUFHLG1CQUFtQixDQUFDLG1CQUFtQixDQUFDLG1CQUFtQixDQUFDLENBQUM7SUFDL0UsSUFBSSxTQUFTLEVBQUUsQ0FBQztRQUNmLE9BQU8sU0FBUyxDQUFDO0lBQ2xCLENBQUM7SUFFRCxNQUFNLEdBQUcsR0FBRyxJQUFJLFVBQVUsRUFBRSxDQUFDO0lBQzdCLEdBQUcsQ0FBQyxNQUFNLENBQUMsbUJBQW1CLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztJQUMzQyxPQUFPLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQztBQUNyQixDQUFDIn0=