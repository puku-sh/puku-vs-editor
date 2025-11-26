/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export var ChatSessionStatus;
(function (ChatSessionStatus) {
    ChatSessionStatus[ChatSessionStatus["Failed"] = 0] = "Failed";
    ChatSessionStatus[ChatSessionStatus["Completed"] = 1] = "Completed";
    ChatSessionStatus[ChatSessionStatus["InProgress"] = 2] = "InProgress";
})(ChatSessionStatus || (ChatSessionStatus = {}));
/**
 * The session type used for local agent chat sessions.
 */
export const localChatSessionType = 'local';
export const IChatSessionsService = createDecorator('chatSessionsService');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFNlc3Npb25zU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhaGFtZWQvRGVza3RvcC9wdWt1LXZzLWVkaXRvci9wdWt1LWVkaXRvci9zcmMvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL2NoYXRTZXNzaW9uc1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFTaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBTzdGLE1BQU0sQ0FBTixJQUFrQixpQkFJakI7QUFKRCxXQUFrQixpQkFBaUI7SUFDbEMsNkRBQVUsQ0FBQTtJQUNWLG1FQUFhLENBQUE7SUFDYixxRUFBYyxDQUFBO0FBQ2YsQ0FBQyxFQUppQixpQkFBaUIsS0FBakIsaUJBQWlCLFFBSWxDO0FBc0VEOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQUcsT0FBTyxDQUFDO0FBc0g1QyxNQUFNLENBQUMsTUFBTSxvQkFBb0IsR0FBRyxlQUFlLENBQXVCLHFCQUFxQixDQUFDLENBQUMifQ==