"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileMatchResponse = exports.FileMatchSuccess = exports.LicenseStats = exports.PackageInformation = exports.FileMatch = exports.MatchResponse = exports.MatchSuccess = exports.MatchError = exports.Snippet = void 0;
const result_1 = require("../../../util/common/result");
var Snippet;
(function (Snippet) {
    function is(v) {
        return typeof v === 'object' && v !== null
            && typeof v.matched_source === 'string'
            && typeof v.occurrences === 'string'
            && typeof v.capped === 'boolean'
            && typeof v.cursor === 'string'
            && typeof v.github_url === 'string';
    }
    Snippet.is = is;
})(Snippet || (exports.Snippet = Snippet = {}));
var MatchError;
(function (MatchError) {
    function is(v) {
        return typeof v === 'object' && v !== null
            && typeof v.kind === 'string'
            && typeof v.reason === 'string'
            && typeof v.code === 'number'
            && typeof v.msg === 'string';
    }
    MatchError.is = is;
})(MatchError || (exports.MatchError = MatchError = {}));
var MatchSuccess;
(function (MatchSuccess) {
    function is(v) {
        return typeof v === 'object' && v !== null
            && 'snippets' in v
            && Array.isArray(v.snippets)
            && v.snippets.every(Snippet.is);
    }
    MatchSuccess.is = is;
})(MatchSuccess || (exports.MatchSuccess = MatchSuccess = {}));
var MatchResponse;
(function (MatchResponse) {
    function to(v) {
        if (MatchError.is(v)) {
            return result_1.Result.error(v);
        }
        if (MatchSuccess.is(v)) {
            return result_1.Result.ok(v);
        }
        return undefined;
    }
    MatchResponse.to = to;
})(MatchResponse || (exports.MatchResponse = MatchResponse = {}));
var FileMatch;
(function (FileMatch) {
    function is(v) {
        return typeof v === 'object' && v !== null
            && typeof v.commit_id === 'string'
            && typeof v.license === 'string'
            && typeof v.nwo === 'string'
            && typeof v.path === 'string'
            && typeof v.url === 'string';
    }
    FileMatch.is = is;
})(FileMatch || (exports.FileMatch = FileMatch = {}));
var PackageInformation;
(function (PackageInformation) {
    function is(v) {
        return typeof v === 'object' && v !== null
            && typeof v.has_next_page === 'boolean'
            && typeof v.cursor === 'string';
    }
    PackageInformation.is = is;
})(PackageInformation || (exports.PackageInformation = PackageInformation = {}));
var LicenseStats;
(function (LicenseStats) {
    function is(v) {
        return typeof v === 'object' && v !== null
            && typeof v.count === 'object'
            && Object.values(v.count).every(value => typeof value === 'string');
    }
    LicenseStats.is = is;
})(LicenseStats || (exports.LicenseStats = LicenseStats = {}));
var FileMatchSuccess;
(function (FileMatchSuccess) {
    function is(v) {
        return typeof v === 'object' && v !== null
            && 'file_matches' in v
            && Array.isArray(v.file_matches)
            && v.file_matches.every(FileMatch.is)
            && 'page_info' in v
            && PackageInformation.is(v.page_info)
            && 'license_stats' in v
            && LicenseStats.is(v.license_stats);
    }
    FileMatchSuccess.is = is;
})(FileMatchSuccess || (exports.FileMatchSuccess = FileMatchSuccess = {}));
var FileMatchResponse;
(function (FileMatchResponse) {
    function to(v) {
        if (MatchError.is(v)) {
            return result_1.Result.error(v);
        }
        if (FileMatchSuccess.is(v)) {
            return result_1.Result.ok(v);
        }
        return undefined;
    }
    FileMatchResponse.to = to;
})(FileMatchResponse || (exports.FileMatchResponse = FileMatchResponse = {}));
//# sourceMappingURL=snippyTypes.js.map