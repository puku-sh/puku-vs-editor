"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const generatedLanguages_1 = require("../generatedLanguages");
const languageMarker_1 = require("../../../../prompt/src/languageMarker");
const assert = __importStar(require("assert"));
suite('generated languages', function () {
    // tex exists as latex and tex in language markers
    // jsx exists as jsx and javascriptreact in language markers. However jsx is never detected according to telemetry data
    // vue-html will be detected as html
    const ignoredMappings = ['jsx', 'tex', 'vue-html'];
    for (const marker in languageMarker_1.languageMarkers) {
        if (!ignoredMappings.includes(marker)) {
            test(`'${marker}' is generated`, function () {
                assert.ok(marker in generatedLanguages_1.knownLanguages, 'language for comment marker ' + marker + ' has not been generated');
            });
        }
    }
});
//# sourceMappingURL=generatedLanguages.test.js.map