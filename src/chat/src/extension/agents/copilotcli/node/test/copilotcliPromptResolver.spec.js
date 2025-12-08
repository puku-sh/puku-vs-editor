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
const vitest_1 = require("vitest");
const mockFileSystemService_1 = require("../../../../../platform/filesystem/node/test/mockFileSystemService");
const logService_1 = require("../../../../../platform/log/common/logService");
const cancellation_1 = require("../../../../../util/vs/base/common/cancellation");
const lifecycle_1 = require("../../../../../util/vs/base/common/lifecycle");
const path = __importStar(require("../../../../../util/vs/base/common/path"));
const uri_1 = require("../../../../../util/vs/base/common/uri");
const vscodeTypes_1 = require("../../../../../vscodeTypes");
const services_1 = require("../../../../test/node/services");
const testHelpers_1 = require("../../../../test/node/testHelpers");
const copilotcliPromptResolver_1 = require("../copilotcliPromptResolver");
function makeDiagnostic(line, message, severity = vscodeTypes_1.DiagnosticSeverity.Error, code) {
    const diag = new vscodeTypes_1.Diagnostic(new vscodeTypes_1.Range(line, 0, line, 0), message, severity);
    diag.code = code;
    return diag;
}
// Helper to create a ChatRequest with references array patched
function withReferences(req, refs) {
    // vitest doesn't prevent mutation; emulate the readonly property by assignment cast
    req.references = refs;
    return req;
}
(0, vitest_1.describe)('CopilotCLIPromptResolver', () => {
    const store = new lifecycle_1.DisposableStore();
    let resolver;
    let fileSystemService;
    let logService;
    (0, vitest_1.beforeEach)(() => {
        const services = store.add((0, services_1.createExtensionUnitTestingServices)());
        const accessor = services.createTestingAccessor();
        fileSystemService = new mockFileSystemService_1.MockFileSystemService();
        logService = accessor.get(logService_1.ILogService);
        resolver = new copilotcliPromptResolver_1.CopilotCLIPromptResolver(logService, fileSystemService);
    });
    (0, vitest_1.afterEach)(() => {
        store.clear();
        vitest_1.vi.resetAllMocks();
    });
    (0, vitest_1.it)('returns original prompt unchanged for slash command', async () => {
        const req = new testHelpers_1.TestChatRequest('/help something');
        const { prompt, attachments } = await resolver.resolvePrompt(req, cancellation_1.CancellationToken.None);
        (0, vitest_1.expect)(prompt).toBe('/help something');
        (0, vitest_1.expect)(attachments).toHaveLength(0);
    });
    (0, vitest_1.it)('collects file references and produces attachments plus reminder block', async () => {
        // Spy on stat to simulate file type
        const statSpy = vitest_1.vi.spyOn(fileSystemService, 'stat').mockResolvedValue({ type: vscodeTypes_1.FileType.File, size: 10 });
        const fileA = uri_1.URI.file(path.join('tmp', 'a.ts'));
        const fileB = uri_1.URI.file(path.join('tmp', 'b.ts'));
        const req = withReferences(new testHelpers_1.TestChatRequest('Explain a and b'), [
            { id: 'file-a', value: fileA, name: 'a.ts', range: [8, 9] }, // 'a'
            { id: 'file-b', value: fileB, name: 'b.ts', range: [14, 15] } // 'b'
        ]);
        const { prompt, attachments } = await resolver.resolvePrompt(req, cancellation_1.CancellationToken.None);
        // Should have reminder block
        (0, vitest_1.expect)(prompt).toMatch(/<reminder>/);
        (0, vitest_1.expect)(prompt).toMatch(/The user provided the following references:/);
        (0, vitest_1.expect)(prompt).toContain(`- a → ${fileA.fsPath}`);
        (0, vitest_1.expect)(prompt).toContain(`- b → ${fileB.fsPath}`);
        // Attachments reflect both files
        (0, vitest_1.expect)(attachments.map(a => a.displayName).sort()).toEqual(['a.ts', 'b.ts']);
        (0, vitest_1.expect)(attachments.every(a => a.type === 'file')).toBe(true);
        // Stat called for each file
        (0, vitest_1.expect)(statSpy).toHaveBeenCalledTimes(2);
    });
    (0, vitest_1.it)('includes diagnostics in reminder block with severity and line', async () => {
        const statSpy = vitest_1.vi.spyOn(fileSystemService, 'stat').mockResolvedValue({ type: vscodeTypes_1.FileType.File, size: 10 });
        const fileUri = uri_1.URI.file(path.join('workspace', 'src', 'index.ts'));
        const diagnostics = [
            makeDiagnostic(4, 'Unexpected any', 0, 'TS7005'),
            makeDiagnostic(9, 'Possible undefined', 1)
        ];
        // ChatReferenceDiagnostic requires a Map of uri -> diagnostics array
        const chatRefDiag = { diagnostics: [[fileUri, diagnostics]] };
        const req = withReferences(new testHelpers_1.TestChatRequest('Fix issues'), [
            { id: 'diag-1', value: chatRefDiag }
        ]);
        const { prompt, attachments } = await resolver.resolvePrompt(req, cancellation_1.CancellationToken.None);
        (0, vitest_1.expect)(prompt).toMatch(/Fix issues/);
        (0, vitest_1.expect)(prompt).toMatch(/The user provided the following diagnostics:/);
        (0, vitest_1.expect)(prompt).toContain(`- error [TS7005] at ${fileUri.fsPath}:5: Unexpected any`);
        (0, vitest_1.expect)(prompt).toContain(`- warning at ${fileUri.fsPath}:10: Possible undefined`);
        // File should be attached once
        (0, vitest_1.expect)(attachments).toHaveLength(1);
        (0, vitest_1.expect)(attachments[0].path).toBe(fileUri.fsPath);
        (0, vitest_1.expect)(statSpy).toHaveBeenCalledTimes(1);
    });
    (0, vitest_1.it)('attaches directories correctly', async () => {
        const statSpy = vitest_1.vi.spyOn(fileSystemService, 'stat').mockResolvedValueOnce({ type: vscodeTypes_1.FileType.Directory, size: 0 });
        const dirUri = uri_1.URI.file('/workspace/src');
        const req = withReferences(new testHelpers_1.TestChatRequest('List src'), [
            { id: 'src-dir', value: dirUri, name: 'src', range: [5, 8] }
        ]);
        const { attachments } = await resolver.resolvePrompt(req, cancellation_1.CancellationToken.None);
        (0, vitest_1.expect)(attachments).toHaveLength(1);
        (0, vitest_1.expect)(attachments[0].type).toBe('directory');
        (0, vitest_1.expect)(attachments[0].displayName).toBe('src');
        (0, vitest_1.expect)(statSpy).toHaveBeenCalledTimes(1);
    });
    (0, vitest_1.it)('logs and ignores non file/directory stat types', async () => {
        // Simulate an unknown type (e.g., FileType.SymbolicLink or other)
        const statSpy = vitest_1.vi.spyOn(fileSystemService, 'stat').mockResolvedValue({ type: 99, size: 0 });
        const logSpy = vitest_1.vi.spyOn(logService, 'error').mockImplementation(() => { });
        const badUri = uri_1.URI.file('/workspace/unknown');
        const req = withReferences(new testHelpers_1.TestChatRequest('Check unknown'), [
            { id: 'bad', value: badUri, name: 'unknown', range: [6, 13] }
        ]);
        const { attachments } = await resolver.resolvePrompt(req, cancellation_1.CancellationToken.None);
        (0, vitest_1.expect)(attachments).toHaveLength(0); // ignored
        (0, vitest_1.expect)(statSpy).toHaveBeenCalledTimes(1);
        (0, vitest_1.expect)(logSpy).toHaveBeenCalled();
    });
    (0, vitest_1.it)('handles stat failure gracefully and logs error', async () => {
        const error = new Error('stat failed');
        const statSpy = vitest_1.vi.spyOn(fileSystemService, 'stat').mockRejectedValue(error);
        const logSpy = vitest_1.vi.spyOn(logService, 'error').mockImplementation(() => { });
        const fileUri = uri_1.URI.file('/workspace/src/index.ts');
        const req = withReferences(new testHelpers_1.TestChatRequest('Read file'), [
            { id: 'file', value: fileUri, name: 'index.ts', range: [5, 10] }
        ]);
        const { attachments } = await resolver.resolvePrompt(req, cancellation_1.CancellationToken.None);
        (0, vitest_1.expect)(attachments).toHaveLength(0);
        (0, vitest_1.expect)(statSpy).toHaveBeenCalledTimes(1);
        (0, vitest_1.expect)(logSpy).toHaveBeenCalled();
    });
    (0, vitest_1.it)('no reminder block when there are no references or diagnostics', async () => {
        const req = new testHelpers_1.TestChatRequest('Just a question');
        const { prompt } = await resolver.resolvePrompt(req, cancellation_1.CancellationToken.None);
        (0, vitest_1.expect)(prompt).toBe('Just a question');
    });
});
//# sourceMappingURL=copilotcliPromptResolver.spec.js.map