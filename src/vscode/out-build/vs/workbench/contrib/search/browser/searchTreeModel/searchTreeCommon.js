/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../../../base/common/uri.js';
export function arrayContainsElementOrParent(element, testArray) {
    do {
        if (testArray.includes(element)) {
            return true;
        }
    } while (!isSearchResult(element.parent()) && (element = element.parent()));
    return false;
}
export var SearchModelLocation;
(function (SearchModelLocation) {
    SearchModelLocation[SearchModelLocation["PANEL"] = 0] = "PANEL";
    SearchModelLocation[SearchModelLocation["QUICK_ACCESS"] = 1] = "QUICK_ACCESS";
})(SearchModelLocation || (SearchModelLocation = {}));
export const PLAIN_TEXT_SEARCH__RESULT_ID = 'plainTextSearch';
export const AI_TEXT_SEARCH_RESULT_ID = 'aiTextSearch';
export function createParentList(element) {
    const parentArray = [];
    let currElement = element;
    while (!isTextSearchHeading(currElement)) {
        parentArray.push(currElement);
        currElement = currElement.parent();
    }
    return parentArray;
}
export const SEARCH_MODEL_PREFIX = 'SEARCH_MODEL_';
export const SEARCH_RESULT_PREFIX = 'SEARCH_RESULT_';
export const TEXT_SEARCH_HEADING_PREFIX = 'TEXT_SEARCH_HEADING_';
export const FOLDER_MATCH_PREFIX = 'FOLDER_MATCH_';
export const FILE_MATCH_PREFIX = 'FILE_MATCH_';
export const MATCH_PREFIX = 'MATCH_';
export function mergeSearchResultEvents(events) {
    const retEvent = {
        elements: [],
        added: false,
        removed: false,
    };
    events.forEach((e) => {
        if (e.added) {
            retEvent.added = true;
        }
        if (e.removed) {
            retEvent.removed = true;
        }
        retEvent.elements = retEvent.elements.concat(e.elements);
    });
    return retEvent;
}
export function isSearchModel(obj) {
    return typeof obj === 'object' &&
        obj !== null &&
        typeof obj.id === 'function' &&
        obj.id().startsWith(SEARCH_MODEL_PREFIX);
}
export function isSearchResult(obj) {
    return typeof obj === 'object' &&
        obj !== null &&
        typeof obj.id === 'function' &&
        obj.id().startsWith(SEARCH_RESULT_PREFIX);
}
export function isTextSearchHeading(obj) {
    return typeof obj === 'object' &&
        obj !== null &&
        typeof obj.id === 'function' &&
        obj.id().startsWith(TEXT_SEARCH_HEADING_PREFIX);
}
export function isPlainTextSearchHeading(obj) {
    return isTextSearchHeading(obj) &&
        // eslint-disable-next-line local/code-no-any-casts
        typeof obj.replace === 'function' &&
        // eslint-disable-next-line local/code-no-any-casts
        typeof obj.replaceAll === 'function';
}
export function isSearchTreeFolderMatch(obj) {
    return typeof obj === 'object' &&
        obj !== null &&
        typeof obj.id === 'function' &&
        obj.id().startsWith(FOLDER_MATCH_PREFIX);
}
export function isSearchTreeFolderMatchWithResource(obj) {
    return isSearchTreeFolderMatch(obj) && obj.resource instanceof URI;
}
export function isSearchTreeFolderMatchWorkspaceRoot(obj) {
    return isSearchTreeFolderMatchWithResource(obj) &&
        // eslint-disable-next-line local/code-no-any-casts
        typeof obj.createAndConfigureFileMatch === 'function';
}
export function isSearchTreeFolderMatchNoRoot(obj) {
    return isSearchTreeFolderMatch(obj) &&
        // eslint-disable-next-line local/code-no-any-casts
        typeof obj.createAndConfigureFileMatch === 'function';
}
export function isSearchTreeFileMatch(obj) {
    return typeof obj === 'object' &&
        obj !== null &&
        typeof obj.id === 'function' &&
        obj.id().startsWith(FILE_MATCH_PREFIX);
}
export function isSearchTreeMatch(obj) {
    return typeof obj === 'object' &&
        obj !== null &&
        typeof obj.id === 'function' &&
        obj.id().startsWith(MATCH_PREFIX);
}
export function isSearchHeader(obj) {
    return typeof obj === 'object' &&
        obj !== null &&
        typeof obj.id === 'function' &&
        obj.id().startsWith(TEXT_SEARCH_HEADING_PREFIX);
}
export function getFileMatches(matches) {
    const folderMatches = [];
    const fileMatches = [];
    matches.forEach((e) => {
        if (isSearchTreeFileMatch(e)) {
            fileMatches.push(e);
        }
        else {
            folderMatches.push(e);
        }
    });
    return fileMatches.concat(folderMatches.map(e => e.allDownstreamFileMatches()).flat());
}
//# sourceMappingURL=searchTreeCommon.js.map