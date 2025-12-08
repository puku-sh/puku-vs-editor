"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const diffServiceImpl_1 = require("../../../../platform/diff/node/diffServiceImpl");
const alternativeContentEditGenerator_1 = require("../../common/alternativeContentEditGenerator");
const alternativeContentProvider_json_1 = require("../../common/alternativeContentProvider.json");
const alternativeContentProvider_text_1 = require("../../common/alternativeContentProvider.text");
const alternativeContentProvider_xml_1 = require("../../common/alternativeContentProvider.xml");
const nullTelemetryService_1 = require("../../../../platform/telemetry/common/nullTelemetryService");
const async_1 = require("../../../../util/vs/base/common/async");
const cancellation_1 = require("../../../../util/vs/base/common/cancellation");
const vscodeTypes_1 = require("../../../../vscodeTypes");
const utils_1 = require("./utils");
const helpers_1 = require("../../common/helpers");
(0, vitest_1.describe)('Alternative Content Edit Generator', () => {
    [
        new alternativeContentProvider_xml_1.AlternativeXmlNotebookContentProvider(),
        new alternativeContentProvider_text_1.AlternativeTextNotebookContentProvider(),
        new alternativeContentProvider_json_1.AlternativeJsonNotebookContentProvider()
    ].forEach((provider) => {
        const mockLogger = {
            error: () => { },
            warn: () => { },
            info: () => { },
            debug: () => { },
            trace: () => { },
            show: () => { }
        };
        function getEditGenerator(provider) {
            return new alternativeContentEditGenerator_1.AlternativeNotebookContentEditGenerator(new class {
                create(_format) {
                    return provider;
                }
                getFormat() {
                    return provider.kind;
                }
            }(), new diffServiceImpl_1.DiffServiceImpl(), new class {
                constructor() {
                    this.internal = mockLogger;
                    this.logger = mockLogger;
                    this.trace = mockLogger.trace;
                    this.debug = mockLogger.debug;
                    this.info = mockLogger.info;
                    this.warn = mockLogger.warn;
                    this.error = mockLogger.error;
                }
                show(preserveFocus) {
                    //
                }
            }(), new nullTelemetryService_1.NullTelemetryService());
        }
        (0, vitest_1.describe)(`${provider.kind} Edit Generator`, () => {
            (0, vitest_1.test)(`Generate a single Notebook Edit instead of deleting all when receiving an invalid format`, async () => {
                const file = await (0, utils_1.loadFile)({ filePath: (0, utils_1.fixture)('insert.ipynb') });
                const notebook = await (0, utils_1.loadNotebook)(file);
                const alternativeContents = '# Cell 1: Print a simple number\nprint(1234)';
                const alternativeContentLines = async_1.AsyncIterableObject.fromArray(alternativeContents.split(/\r?\n/)).map(l => new helpers_1.LineOfText(l));
                const edits = await getEditGenerator(provider).generateNotebookEdits(notebook, alternativeContentLines, undefined, cancellation_1.CancellationToken.None);
                const notebookEdits = [];
                for await (const edit of edits) {
                    if (Array.isArray(edit)) {
                        throw new Error('Expected a NotebookEdit, but got TextEdit');
                    }
                    else {
                        notebookEdits.push(edit);
                    }
                }
                (0, vitest_1.expect)(notebookEdits.length).toBe(1);
                (0, vitest_1.expect)(notebookEdits[0].newCells.length).toBe(1);
                (0, vitest_1.expect)(notebookEdits[0].newCells[0].kind).toBe(vscodeTypes_1.NotebookCellKind.Code);
                (0, vitest_1.expect)(notebookEdits[0].newCells[0].value.split(/\r?\n/g)).toEqual([`# Cell 1: Print a simple number`, `print(1234)`]);
                (0, vitest_1.expect)(notebookEdits[0].range.start).toBe(0);
                (0, vitest_1.expect)(notebookEdits[0].range.end).toBe(0);
            });
        });
    });
});
//# sourceMappingURL=alternativeContentEditGenerator.spec.js.map