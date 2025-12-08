"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComputeContextResponse = exports.ErrorCode = exports.ContextRequestResultState = exports.Timings = exports.ErrorData = exports.ContextRunnableResultKind = exports.ContextRunnableState = exports.ContextItem = exports.CodeSnippet = exports.Trait = exports.TraitKind = exports.SpeculativeKind = exports.Priorities = exports.ContextItemReference = exports.ContextKind = exports.CachedContextItem = exports.CacheInfo = exports.EmitMode = exports.CacheScopeKind = void 0;
var CacheScopeKind;
(function (CacheScopeKind) {
    /**
     * The cache entry is still valid for the file.
     */
    CacheScopeKind["File"] = "file";
    /**
     * The cache entry is valid as long as changes to the file happen
     * inside of the specific range.
     */
    CacheScopeKind["WithinRange"] = "withinRange";
    /**
     * The change entry is valid as long as changes to the file happen
     * outside of the specific range.
     */
    CacheScopeKind["OutsideRange"] = "outsideRange";
    /**
     * The cache entry is valid as long as the neighbor files don't change.
     */
    CacheScopeKind["NeighborFiles"] = "neighborFiles";
})(CacheScopeKind || (exports.CacheScopeKind = CacheScopeKind = {}));
var EmitMode;
(function (EmitMode) {
    EmitMode["ClientBased"] = "clientBased";
    EmitMode["ClientBasedOnTimeout"] = "clientBasedOnTimeout";
    // ServerBased = 'serverBased'
})(EmitMode || (exports.EmitMode = EmitMode = {}));
var CacheInfo;
(function (CacheInfo) {
    function has(item) {
        return item.cache !== undefined;
    }
    CacheInfo.has = has;
})(CacheInfo || (exports.CacheInfo = CacheInfo = {}));
var CachedContextItem;
(function (CachedContextItem) {
    function create(key, sizeInChars) {
        return { key, sizeInChars };
    }
    CachedContextItem.create = create;
})(CachedContextItem || (exports.CachedContextItem = CachedContextItem = {}));
/**
 * Different supported context item kinds.
 */
var ContextKind;
(function (ContextKind) {
    ContextKind["Reference"] = "reference";
    ContextKind["RelatedFile"] = "relatedFile";
    ContextKind["Snippet"] = "snippet";
    ContextKind["Trait"] = "trait";
})(ContextKind || (exports.ContextKind = ContextKind = {}));
var ContextItemReference;
(function (ContextItemReference) {
    function create(key) {
        return { kind: ContextKind.Reference, key };
    }
    ContextItemReference.create = create;
})(ContextItemReference || (exports.ContextItemReference = ContextItemReference = {}));
var Priorities;
(function (Priorities) {
    Priorities[Priorities["Expression"] = 1] = "Expression";
    Priorities[Priorities["Locals"] = 0.9] = "Locals";
    Priorities[Priorities["Inherited"] = 0.8] = "Inherited";
    Priorities[Priorities["Traits"] = 0.7] = "Traits";
    Priorities[Priorities["Blueprints"] = 0.6] = "Blueprints";
    Priorities[Priorities["Properties"] = 0.5] = "Properties";
    Priorities[Priorities["Imports"] = 0.4] = "Imports";
    Priorities[Priorities["NeighborFiles"] = 0.3] = "NeighborFiles";
    Priorities[Priorities["Globals"] = 0.2] = "Globals";
})(Priorities || (exports.Priorities = Priorities = {}));
var SpeculativeKind;
(function (SpeculativeKind) {
    SpeculativeKind["emit"] = "emit";
    SpeculativeKind["ignore"] = "ignore";
})(SpeculativeKind || (exports.SpeculativeKind = SpeculativeKind = {}));
var TraitKind;
(function (TraitKind) {
    TraitKind["Unknown"] = "unknown";
    TraitKind["Module"] = "module";
    TraitKind["ModuleResolution"] = "moduleResolution";
    TraitKind["Lib"] = "lib";
    TraitKind["Target"] = "target";
    TraitKind["Version"] = "version";
})(TraitKind || (exports.TraitKind = TraitKind = {}));
var Trait;
(function (Trait) {
    function create(traitKind, name, value) {
        return { kind: ContextKind.Trait, key: createContextItemKey(traitKind), name, value };
    }
    Trait.create = create;
    function sizeInChars(trait) {
        return trait.name.length + trait.value.length;
    }
    Trait.sizeInChars = sizeInChars;
    function createContextItemKey(traitKind) {
        return JSON.stringify({ k: ContextKind.Trait, tk: traitKind }, undefined, 0);
    }
    Trait.createContextItemKey = createContextItemKey;
})(Trait || (exports.Trait = Trait = {}));
var CodeSnippet;
(function (CodeSnippet) {
    function create(key, fileName, additionalFileNames, value) {
        return { kind: ContextKind.Snippet, key, fileName, additionalFileNames, value };
    }
    CodeSnippet.create = create;
    function sizeInChars(snippet) {
        let result = snippet.value.length;
        // +3 for "// " at the beginning of the line.
        result += snippet.fileName.length + 3;
        if (snippet.additionalFileNames !== undefined) {
            for (const fileName of snippet.additionalFileNames) {
                result += fileName.length + 3;
            }
        }
        return result;
    }
    CodeSnippet.sizeInChars = sizeInChars;
})(CodeSnippet || (exports.CodeSnippet = CodeSnippet = {}));
var ContextItem;
(function (ContextItem) {
    function hasKey(item) {
        return item.key !== undefined;
    }
    ContextItem.hasKey = hasKey;
    function sizeInChars(item) {
        switch (item.kind) {
            case ContextKind.Trait:
                return Trait.sizeInChars(item);
            case ContextKind.Snippet:
                return CodeSnippet.sizeInChars(item);
            default:
                return 0;
        }
    }
    ContextItem.sizeInChars = sizeInChars;
})(ContextItem || (exports.ContextItem = ContextItem = {}));
var ContextRunnableState;
(function (ContextRunnableState) {
    ContextRunnableState["Created"] = "created";
    ContextRunnableState["InProgress"] = "inProgress";
    ContextRunnableState["IsFull"] = "isFull";
    ContextRunnableState["Finished"] = "finished";
})(ContextRunnableState || (exports.ContextRunnableState = ContextRunnableState = {}));
var ContextRunnableResultKind;
(function (ContextRunnableResultKind) {
    ContextRunnableResultKind["ComputedResult"] = "computedResult";
    ContextRunnableResultKind["CacheEntry"] = "cacheEntry";
    ContextRunnableResultKind["Reference"] = "reference";
})(ContextRunnableResultKind || (exports.ContextRunnableResultKind = ContextRunnableResultKind = {}));
var ErrorData;
(function (ErrorData) {
    function create(code, message) {
        return { code, message };
    }
    ErrorData.create = create;
})(ErrorData || (exports.ErrorData = ErrorData = {}));
var Timings;
(function (Timings) {
    function create(totalTime, computeTime) {
        return { totalTime, computeTime };
    }
    Timings.create = create;
})(Timings || (exports.Timings = Timings = {}));
var ContextRequestResultState;
(function (ContextRequestResultState) {
    ContextRequestResultState["Created"] = "created";
    ContextRequestResultState["InProgress"] = "inProgress";
    ContextRequestResultState["Cancelled"] = "cancelled";
    ContextRequestResultState["Finished"] = "finished";
})(ContextRequestResultState || (exports.ContextRequestResultState = ContextRequestResultState = {}));
var ErrorCode;
(function (ErrorCode) {
    ErrorCode["noArguments"] = "noArguments";
    ErrorCode["noProject"] = "noProject";
    ErrorCode["noProgram"] = "noProgram";
    ErrorCode["invalidArguments"] = "invalidArguments";
    ErrorCode["invalidPosition"] = "invalidPosition";
    ErrorCode["exception"] = "exception";
})(ErrorCode || (exports.ErrorCode = ErrorCode = {}));
var ComputeContextResponse;
(function (ComputeContextResponse) {
    function isCancelled(response) {
        return (response.type === 'cancelled');
    }
    ComputeContextResponse.isCancelled = isCancelled;
    function isOk(response) {
        return response.type === 'response' && response.body.state !== undefined;
    }
    ComputeContextResponse.isOk = isOk;
    function isError(response) {
        return response.type === 'response' && response.body.error !== undefined;
    }
    ComputeContextResponse.isError = isError;
})(ComputeContextResponse || (exports.ComputeContextResponse = ComputeContextResponse = {}));
//# sourceMappingURL=serverProtocol.js.map