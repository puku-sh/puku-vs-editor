"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const outdent_1 = require("outdent");
const vitest_1 = require("vitest");
const defaultsOnlyConfigurationService_1 = require("../../../../platform/configuration/common/defaultsOnlyConfigurationService");
const nullGitExtensionService_1 = require("../../../../platform/git/common/nullGitExtensionService");
const documentId_1 = require("../../../../platform/inlineEdits/common/dataTypes/documentId");
const inlineEditLogContext_1 = require("../../../../platform/inlineEdits/common/inlineEditLogContext");
const observableGit_1 = require("../../../../platform/inlineEdits/common/observableGit");
const observableWorkspace_1 = require("../../../../platform/inlineEdits/common/observableWorkspace");
const statelessNextEditProvider_1 = require("../../../../platform/inlineEdits/common/statelessNextEditProvider");
const nesHistoryContextProvider_1 = require("../../../../platform/inlineEdits/common/workspaceEditTracker/nesHistoryContextProvider");
const nesXtabHistoryTracker_1 = require("../../../../platform/inlineEdits/common/workspaceEditTracker/nesXtabHistoryTracker");
const logService_1 = require("../../../../platform/log/common/logService");
const snippyService_1 = require("../../../../platform/snippy/common/snippyService");
const nullExperimentationService_1 = require("../../../../platform/telemetry/common/nullExperimentationService");
const testNotebookService_1 = require("../../../../platform/test/common/testNotebookService");
const result_1 = require("../../../../util/common/result");
const cancellation_1 = require("../../../../util/vs/base/common/cancellation");
const uri_1 = require("../../../../util/vs/base/common/uri");
const uuid_1 = require("../../../../util/vs/base/common/uuid");
const lineEdit_1 = require("../../../../util/vs/editor/common/core/edits/lineEdit");
const stringEdit_1 = require("../../../../util/vs/editor/common/core/edits/stringEdit");
const lineRange_1 = require("../../../../util/vs/editor/common/core/ranges/lineRange");
const offsetRange_1 = require("../../../../util/vs/editor/common/core/ranges/offsetRange");
const nextEditProvider_1 = require("../../node/nextEditProvider");
const nextEditProviderTelemetry_1 = require("../../node/nextEditProviderTelemetry");
const lifecycle_1 = require("../../../../util/vs/base/common/lifecycle");
const testWorkspaceService_1 = require("../../../../platform/test/node/testWorkspaceService");
(0, vitest_1.describe)('NextEditProvider Caching', () => {
    let configService;
    let snippyService;
    let gitExtensionService;
    let logService;
    let expService;
    let disposableStore;
    let workspaceService;
    (0, vitest_1.beforeAll)(() => {
        disposableStore = new lifecycle_1.DisposableStore();
        workspaceService = disposableStore.add(new testWorkspaceService_1.TestWorkspaceService());
        configService = new defaultsOnlyConfigurationService_1.DefaultsOnlyConfigurationService();
        snippyService = new snippyService_1.NullSnippyService();
        gitExtensionService = new nullGitExtensionService_1.NullGitExtensionService();
        logService = new logService_1.LogServiceImpl([]);
        expService = new nullExperimentationService_1.NullExperimentationService();
    });
    (0, vitest_1.afterAll)(() => {
        disposableStore.dispose();
    });
    (0, vitest_1.it)('caches a response with multiple edits and reuses them correctly with rebasing', async () => {
        const obsWorkspace = new observableWorkspace_1.MutableObservableWorkspace();
        const obsGit = new observableGit_1.ObservableGit(gitExtensionService);
        const statelessNextEditProvider = {
            ID: 'TestNextEditProvider',
            provideNextEdit: async (request, pushEdit, logContext, cancellationToken) => {
                const telemetryBuilder = new statelessNextEditProvider_1.StatelessNextEditTelemetryBuilder(request);
                const lineEdit = lineEdit_1.LineEdit.createFromUnsorted([
                    new lineEdit_1.LineReplacement(new lineRange_1.LineRange(11, 12), ["const myPoint = new Point3D(0, 1, 2);"]),
                    new lineEdit_1.LineReplacement(new lineRange_1.LineRange(5, 5), ["\t\tprivate readonly z: number,"]),
                    new lineEdit_1.LineReplacement(new lineRange_1.LineRange(6, 9), [
                        "\tgetDistance() {",
                        "\t\treturn Math.sqrt(this.x ** 2 + this.y ** 2 + this.z ** 2);",
                        "\t}"
                    ])
                ]);
                lineEdit.replacements.forEach(edit => pushEdit(result_1.Result.ok({ edit })));
                pushEdit(result_1.Result.error(new statelessNextEditProvider_1.NoNextEditReason.NoSuggestions(request.documentBeforeEdits, undefined)));
                return statelessNextEditProvider_1.StatelessNextEditResult.streaming(telemetryBuilder);
            }
        };
        const nextEditProvider = new nextEditProvider_1.NextEditProvider(obsWorkspace, statelessNextEditProvider, new nesHistoryContextProvider_1.NesHistoryContextProvider(obsWorkspace, obsGit), new nesXtabHistoryTracker_1.NesXtabHistoryTracker(obsWorkspace), undefined, configService, snippyService, logService, expService);
        const doc = obsWorkspace.addDocument({
            id: documentId_1.DocumentId.create(uri_1.URI.file('/test/test.ts').toString()),
            initialValue: (0, outdent_1.outdent) `
			class Point {
				constructor(
					private readonly x: number,
					private readonly y: number,
				) { }
				getDistance() {
					return Math.sqrt(this.x ** 2 + this.y ** 2);
				}
			}

			const myPoint = new Point(0, 1);`.trimStart()
        });
        doc.setSelection([new offsetRange_1.OffsetRange(1, 1)], undefined);
        doc.applyEdit(stringEdit_1.StringEdit.insert(11, '3D'));
        const context = { triggerKind: 1, selectedCompletionInfo: undefined, requestUuid: (0, uuid_1.generateUuid)(), requestIssuedDateTime: Date.now(), earliestShownDateTime: Date.now() + 200 };
        const logContext = new inlineEditLogContext_1.InlineEditRequestLogContext(doc.id.toString(), 1, context);
        const cancellationToken = cancellation_1.CancellationToken.None;
        const tb1 = new nextEditProviderTelemetry_1.NextEditProviderTelemetryBuilder(gitExtensionService, testNotebookService_1.mockNotebookService, workspaceService, nextEditProvider.ID, doc);
        let result = await nextEditProvider.getNextEdit(doc.id, context, logContext, cancellationToken, tb1.nesBuilder);
        tb1.dispose();
        (0, vitest_1.assert)(result.result?.edit);
        doc.applyEdit(result.result.edit.toEdit());
        (0, vitest_1.expect)(doc.value.get().value).toMatchInlineSnapshot(`
			"class Point3D {
				constructor(
					private readonly x: number,
					private readonly y: number,
					private readonly z: number,
				) { }
				getDistance() {
					return Math.sqrt(this.x ** 2 + this.y ** 2);
				}
			}

			const myPoint = new Point(0, 1);"
		`);
        const tb2 = new nextEditProviderTelemetry_1.NextEditProviderTelemetryBuilder(gitExtensionService, testNotebookService_1.mockNotebookService, workspaceService, nextEditProvider.ID, doc);
        result = await nextEditProvider.getNextEdit(doc.id, context, logContext, cancellationToken, tb2.nesBuilder);
        tb2.dispose();
        (0, vitest_1.assert)(result.result?.edit);
        doc.applyEdit(result.result.edit.toEdit());
        (0, vitest_1.expect)(doc.value.get().value).toMatchInlineSnapshot(`
			"class Point3D {
				constructor(
					private readonly x: number,
					private readonly y: number,
					private readonly z: number,
				) { }
				getDistance() {
					return Math.sqrt(this.x ** 2 + this.y ** 2 + this.z ** 2);
				}
			}

			const myPoint = new Point(0, 1);"
		`);
        const tb3 = new nextEditProviderTelemetry_1.NextEditProviderTelemetryBuilder(gitExtensionService, testNotebookService_1.mockNotebookService, workspaceService, nextEditProvider.ID, doc);
        result = await nextEditProvider.getNextEdit(doc.id, context, logContext, cancellationToken, tb3.nesBuilder);
        tb3.dispose();
        (0, vitest_1.assert)(result.result?.edit);
        doc.applyEdit(result.result.edit.toEdit());
        (0, vitest_1.expect)(doc.value.get().value).toMatchInlineSnapshot(`
			"class Point3D {
				constructor(
					private readonly x: number,
					private readonly y: number,
					private readonly z: number,
				) { }
				getDistance() {
					return Math.sqrt(this.x ** 2 + this.y ** 2 + this.z ** 2);
				}
			}

			const myPoint = new Point3D(0, 1, 2);"
		`);
    });
});
//# sourceMappingURL=nextEditProviderCaching.spec.js.map