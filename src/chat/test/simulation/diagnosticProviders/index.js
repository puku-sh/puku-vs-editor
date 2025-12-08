"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnownDiagnosticProviders = void 0;
exports.getDiagnostics = getDiagnostics;
const cpp_1 = require("./cpp");
const eslint_1 = require("./eslint");
const python_1 = require("./python");
const roslyn_1 = require("./roslyn");
const ruff_1 = require("./ruff");
const tsc_1 = require("./tsc");
class KnownDiagnosticProviders {
    static { this.tsc = new tsc_1.TSServerDiagnosticsProvider(); }
    static { this.tscIgnoreImportErrors = new tsc_1.TSServerDiagnosticsProvider({ ignoreImportErrors: true }); }
    static { this.eslint = new eslint_1.EslintDiagnosticsProvider(); }
    static { this.pyright = new python_1.PyrightDiagnosticsProvider(); }
    static { this.pylint = new python_1.PylintDiagnosticsProvider(); }
    static { this.roslyn = new roslyn_1.RoslynDiagnosticsProvider(); }
    static { this.cpp = new cpp_1.CppDiagnosticsProvider(); }
    static { this.ruff = new ruff_1.RuffDiagnosticsProvider(); }
}
exports.KnownDiagnosticProviders = KnownDiagnosticProviders;
function getDiagnostics(accessor, files, providerId) {
    const provider = KnownDiagnosticProviders[providerId];
    return provider.getDiagnostics(accessor, files);
}
//# sourceMappingURL=index.js.map