"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.PackageChangeKind = exports.EnvironmentChangeKind = void 0;
/**
 * Enum representing the kinds of environment changes.
 */
var EnvironmentChangeKind;
(function (EnvironmentChangeKind) {
    /**
     * Indicates that an environment was added.
     */
    EnvironmentChangeKind["add"] = "add";
    /**
     * Indicates that an environment was removed.
     */
    EnvironmentChangeKind["remove"] = "remove";
})(EnvironmentChangeKind || (exports.EnvironmentChangeKind = EnvironmentChangeKind = {}));
/**
 * Enum representing the kinds of package changes.
 */
var PackageChangeKind;
(function (PackageChangeKind) {
    /**
     * Indicates that a package was added.
     */
    PackageChangeKind["add"] = "add";
    /**
     * Indicates that a package was removed.
     */
    PackageChangeKind["remove"] = "remove";
})(PackageChangeKind || (exports.PackageChangeKind = PackageChangeKind = {}));
//# sourceMappingURL=pythonEnvironmentApi.js.map