"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.simulatePanelCodeMapper = simulatePanelCodeMapper;
const codeBlockProcessor_1 = require("../../src/extension/codeBlocks/node/codeBlockProcessor");
const tabsAndEditorsService_1 = require("../../src/platform/tabs/common/tabsAndEditorsService");
const types_1 = require("../../src/util/common/types");
const uri_1 = require("../../src/util/vs/base/common/uri");
const vscodeTypes_1 = require("../../src/vscodeTypes");
const inlineChatSimulator_1 = require("./inlineChatSimulator");
async function simulatePanelCodeMapper(testingServiceCollection, scenario, strategy, spyOnStream) {
    const overrideCommand = strategy === undefined ? undefined :
        strategy === 0 /* EditTestStrategy.Edits */ ? '/edit' :
            strategy === 1 /* EditTestStrategy.Edits2 */ ? '/edit2' :
                '/editAgent';
    const ensureSlashEdit = (query) => {
        if (!overrideCommand) {
            return query;
        }
        return query.startsWith(overrideCommand) ? query : `${overrideCommand} ${query}`;
    };
    const prependEditToUserQueries = (queries) => {
        return queries.map(scenarioQuery => {
            return {
                ...scenarioQuery,
                query: ensureSlashEdit(scenarioQuery.query),
            };
        });
    };
    const massagedScenario = { ...scenario, queries: prependEditToUserQueries(scenario.queries) };
    const host = {
        prepareChatRequestLocation: (accessor) => {
            return {
                location: vscodeTypes_1.ChatLocation.Panel,
                location2: undefined,
            };
        },
        contributeAdditionalReferences: (accessor, existingReferences) => {
            const tabsAndEditorsService = accessor.get(tabsAndEditorsService_1.ITabsAndEditorsService);
            const activeTextEditor = tabsAndEditorsService.activeTextEditor;
            if (activeTextEditor) {
                const existingReference = existingReferences.find(ref => _extractUri(ref.value)?.toString() === activeTextEditor.document.uri.toString());
                if (!existingReference) {
                    const varWithArg = `file:${activeTextEditor.document.uri.path}`;
                    return [{
                            id: `copilot.file`,
                            name: varWithArg,
                            value: new vscodeTypes_1.Location(activeTextEditor.document.uri, activeTextEditor.selection)
                        }];
                }
            }
            return [];
            function _extractUri(something) {
                if ((0, types_1.isLocation)(something)) {
                    return something.uri;
                }
                if (uri_1.URI.isUri(something)) {
                    return something;
                }
                return undefined;
            }
        },
        provideResponseProcessor: (_query) => {
            return {
                spyOnStream: (stream) => {
                    return spyOnStream ? spyOnStream(stream) : stream;
                },
                postProcess: async (accessor, workspace, stream, chatResult) => {
                    const annotations = [];
                    if (strategy === 0 /* EditTestStrategy.Edits */) {
                        if (chatResult?.errorDetails) {
                            annotations.push({
                                severity: 'error',
                                label: 'chat-error',
                                message: `Chat request failed: ${chatResult.errorDetails.message}`,
                            });
                            return annotations;
                        }
                        const codeBlocks = chatResult?.metadata?.codeBlocks;
                        if (!Array.isArray(codeBlocks)) {
                            throw new Error('No codeblocks in chat result metadata');
                        }
                        for (const codeBlock of codeBlocks) {
                            if (!(0, codeBlockProcessor_1.isCodeBlockWithResource)(codeBlock)) {
                                annotations.push({
                                    severity: 'error',
                                    label: 'missing-path-in-code-block',
                                    message: 'Code block without a file path',
                                });
                            }
                        }
                    }
                    return annotations;
                }
            };
        }
    };
    return (0, inlineChatSimulator_1.simulateEditingScenario)(testingServiceCollection, massagedScenario, host);
}
//# sourceMappingURL=panelCodeMapperSimulator.js.map