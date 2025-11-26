/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export var InlineEditTabAction;
(function (InlineEditTabAction) {
    InlineEditTabAction["Jump"] = "jump";
    InlineEditTabAction["Accept"] = "accept";
    InlineEditTabAction["Inactive"] = "inactive";
})(InlineEditTabAction || (InlineEditTabAction = {}));
// TODO: Move this out of here as it is also includes ghosttext
export var InlineCompletionViewKind;
(function (InlineCompletionViewKind) {
    InlineCompletionViewKind["GhostText"] = "ghostText";
    InlineCompletionViewKind["Custom"] = "custom";
    InlineCompletionViewKind["SideBySide"] = "sideBySide";
    InlineCompletionViewKind["Deletion"] = "deletion";
    InlineCompletionViewKind["InsertionInline"] = "insertionInline";
    InlineCompletionViewKind["InsertionMultiLine"] = "insertionMultiLine";
    InlineCompletionViewKind["WordReplacements"] = "wordReplacements";
    InlineCompletionViewKind["LineReplacement"] = "lineReplacement";
    InlineCompletionViewKind["Collapsed"] = "collapsed";
})(InlineCompletionViewKind || (InlineCompletionViewKind = {}));
//# sourceMappingURL=inlineEditsViewInterface.js.map