"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RemoteCodeSearchIndexStatus = void 0;
var RemoteCodeSearchIndexStatus;
(function (RemoteCodeSearchIndexStatus) {
    /** The repo index is built and ready to use */
    RemoteCodeSearchIndexStatus["Ready"] = "ready";
    /** The repo index is being built */
    RemoteCodeSearchIndexStatus["BuildingIndex"] = "building-index";
    /** The repo is not indexed but we can potentially index it */
    RemoteCodeSearchIndexStatus["NotYetIndexed"] = "not-yet-indexed";
    /** The repo is not indexed and we cannot trigger indexing */
    RemoteCodeSearchIndexStatus["NotIndexable"] = "not-indexable";
})(RemoteCodeSearchIndexStatus || (exports.RemoteCodeSearchIndexStatus = RemoteCodeSearchIndexStatus = {}));
//# sourceMappingURL=remoteCodeSearch.js.map