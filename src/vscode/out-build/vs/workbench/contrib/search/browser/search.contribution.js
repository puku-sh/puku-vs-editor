/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as platform from '../../../../base/common/platform.js';
import { AbstractGotoLineQuickAccessProvider } from '../../../../editor/contrib/quickAccess/browser/gotoLineQuickAccess.js';
import * as nls from '../../../../nls.js';
import { Extensions as ConfigurationExtensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { Extensions as QuickAccessExtensions } from '../../../../platform/quickinput/common/quickAccess.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { ViewPaneContainer } from '../../../browser/parts/views/viewPaneContainer.js';
import { defaultQuickAccessContextKeyValue } from '../../../browser/quickaccess.js';
import { Extensions as ViewExtensions } from '../../../common/views.js';
import { GotoSymbolQuickAccessProvider } from '../../codeEditor/browser/quickaccess/gotoSymbolQuickAccess.js';
import { AnythingQuickAccessProvider } from './anythingQuickAccess.js';
import { registerContributions as replaceContributions } from './replaceContributions.js';
import { registerContributions as notebookSearchContributions } from './notebookSearch/notebookSearchContributions.js';
import { searchViewIcon } from './searchIcons.js';
import { SearchView } from './searchView.js';
import { registerContributions as searchWidgetContributions } from './searchWidget.js';
import { SymbolsQuickAccessProvider } from './symbolsQuickAccess.js';
import { ISearchHistoryService, SearchHistoryService } from '../common/searchHistoryService.js';
import { SearchViewModelWorkbenchService } from './searchTreeModel/searchModel.js';
import { ISearchViewModelWorkbenchService } from './searchTreeModel/searchViewModelWorkbenchService.js';
import { SEARCH_EXCLUDE_CONFIG, VIEWLET_ID, VIEW_ID, DEFAULT_MAX_SEARCH_RESULTS } from '../../../services/search/common/search.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { assertType } from '../../../../base/common/types.js';
import { getWorkspaceSymbols } from '../common/search.js';
import { SearchChatContextContribution } from './searchChatContext.js';
import './searchActionsCopy.js';
import './searchActionsFind.js';
import './searchActionsNav.js';
import './searchActionsRemoveReplace.js';
import './searchActionsSymbol.js';
import './searchActionsTopBar.js';
import './searchActionsTextQuickAccess.js';
import { TEXT_SEARCH_QUICK_ACCESS_PREFIX, TextSearchQuickAccess } from './quickTextSearch/textSearchQuickAccess.js';
import { Extensions } from '../../../common/configuration.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
registerSingleton(ISearchViewModelWorkbenchService, SearchViewModelWorkbenchService, 1 /* InstantiationType.Delayed */);
registerSingleton(ISearchHistoryService, SearchHistoryService, 1 /* InstantiationType.Delayed */);
replaceContributions();
notebookSearchContributions();
searchWidgetContributions();
registerWorkbenchContribution2(SearchChatContextContribution.ID, SearchChatContextContribution, 3 /* WorkbenchPhase.AfterRestored */);
const SEARCH_MODE_CONFIG = 'search.mode';
const viewContainer = Registry.as(ViewExtensions.ViewContainersRegistry).registerViewContainer({
    id: VIEWLET_ID,
    title: nls.localize2(11777, "Search"),
    ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [VIEWLET_ID, { mergeViewWithContainerWhenSingleView: true }]),
    hideIfEmpty: true,
    icon: searchViewIcon,
    order: 1,
}, 0 /* ViewContainerLocation.Sidebar */, { doNotRegisterOpenCommand: true });
const viewDescriptor = {
    id: VIEW_ID,
    containerIcon: searchViewIcon,
    name: nls.localize2(11778, "Search"),
    ctorDescriptor: new SyncDescriptor(SearchView),
    canToggleVisibility: false,
    canMoveView: true,
    openCommandActionDescriptor: {
        id: viewContainer.id,
        mnemonicTitle: nls.localize(11701, null),
        keybindings: {
            primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 36 /* KeyCode.KeyF */,
            // Yes, this is weird. See #116188, #115556, #115511, and now #124146, for examples of what can go wrong here.
            when: ContextKeyExpr.regex('neverMatch', /doesNotMatch/)
        },
        order: 1
    }
};
// Register search default location to sidebar
Registry.as(ViewExtensions.ViewsRegistry).registerViews([viewDescriptor], viewContainer);
// Register Quick Access Handler
const quickAccessRegistry = Registry.as(QuickAccessExtensions.Quickaccess);
quickAccessRegistry.registerQuickAccessProvider({
    ctor: AnythingQuickAccessProvider,
    prefix: AnythingQuickAccessProvider.PREFIX,
    placeholder: nls.localize(11702, null, AbstractGotoLineQuickAccessProvider.GO_TO_LINE_PREFIX, GotoSymbolQuickAccessProvider.PREFIX),
    contextKey: defaultQuickAccessContextKeyValue,
    helpEntries: [{
            description: nls.localize(11703, null),
            commandId: 'workbench.action.quickOpen',
            commandCenterOrder: 10
        }]
});
quickAccessRegistry.registerQuickAccessProvider({
    ctor: SymbolsQuickAccessProvider,
    prefix: SymbolsQuickAccessProvider.PREFIX,
    placeholder: nls.localize(11704, null),
    contextKey: 'inWorkspaceSymbolsPicker',
    helpEntries: [{ description: nls.localize(11705, null), commandId: "workbench.action.showAllSymbols" /* Constants.SearchCommandIds.ShowAllSymbolsActionId */ }]
});
quickAccessRegistry.registerQuickAccessProvider({
    ctor: TextSearchQuickAccess,
    prefix: TEXT_SEARCH_QUICK_ACCESS_PREFIX,
    contextKey: 'inTextSearchPicker',
    placeholder: nls.localize(11706, null),
    helpEntries: [
        {
            description: nls.localize(11707, null),
            commandId: "workbench.action.quickTextSearch" /* Constants.SearchCommandIds.QuickTextSearchActionId */,
            commandCenterOrder: 25,
        }
    ]
});
// Configuration
const configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
configurationRegistry.registerConfiguration({
    id: 'search',
    order: 13,
    title: nls.localize(11708, null),
    type: 'object',
    properties: {
        [SEARCH_EXCLUDE_CONFIG]: {
            type: 'object',
            markdownDescription: nls.localize(11709, null),
            default: { '**/node_modules': true, '**/bower_components': true, '**/*.code-search': true },
            additionalProperties: {
                anyOf: [
                    {
                        type: 'boolean',
                        description: nls.localize(11710, null),
                    },
                    {
                        type: 'object',
                        properties: {
                            when: {
                                type: 'string', // expression ({ "**/*.js": { "when": "$(basename).js" } })
                                pattern: '\\w*\\$\\(basename\\)\\w*',
                                default: '$(basename).ext',
                                markdownDescription: nls.localize(11711, null)
                            }
                        }
                    }
                ]
            },
            scope: 5 /* ConfigurationScope.RESOURCE */
        },
        [SEARCH_MODE_CONFIG]: {
            type: 'string',
            enum: ['view', 'reuseEditor', 'newEditor'],
            default: 'view',
            markdownDescription: nls.localize(11712, null),
            enumDescriptions: [
                nls.localize(11713, null),
                nls.localize(11714, null),
                nls.localize(11715, null),
            ]
        },
        'search.useRipgrep': {
            type: 'boolean',
            description: nls.localize(11716, null),
            deprecationMessage: nls.localize(11717, null),
            default: true
        },
        'search.maintainFileSearchCache': {
            type: 'boolean',
            deprecationMessage: nls.localize(11718, null),
            description: nls.localize(11719, null),
            default: false
        },
        'search.useIgnoreFiles': {
            type: 'boolean',
            markdownDescription: nls.localize(11720, null),
            default: true,
            scope: 5 /* ConfigurationScope.RESOURCE */
        },
        'search.useGlobalIgnoreFiles': {
            type: 'boolean',
            markdownDescription: nls.localize(11721, null, '`#search.useIgnoreFiles#`'),
            default: false,
            scope: 5 /* ConfigurationScope.RESOURCE */
        },
        'search.useParentIgnoreFiles': {
            type: 'boolean',
            markdownDescription: nls.localize(11722, null, '`#search.useIgnoreFiles#`'),
            default: false,
            scope: 5 /* ConfigurationScope.RESOURCE */
        },
        'search.quickOpen.includeSymbols': {
            type: 'boolean',
            description: nls.localize(11723, null),
            default: false
        },
        'search.ripgrep.maxThreads': {
            type: 'number',
            description: nls.localize(11724, null),
            default: 0
        },
        'search.quickOpen.includeHistory': {
            type: 'boolean',
            description: nls.localize(11725, null),
            default: true
        },
        'search.quickOpen.history.filterSortOrder': {
            type: 'string',
            enum: ['default', 'recency'],
            default: 'default',
            enumDescriptions: [
                nls.localize(11726, null),
                nls.localize(11727, null)
            ],
            description: nls.localize(11728, null)
        },
        'search.followSymlinks': {
            type: 'boolean',
            description: nls.localize(11729, null),
            default: true
        },
        'search.smartCase': {
            type: 'boolean',
            description: nls.localize(11730, null),
            default: false
        },
        'search.globalFindClipboard': {
            type: 'boolean',
            default: false,
            description: nls.localize(11731, null),
            included: platform.isMacintosh
        },
        'search.location': {
            type: 'string',
            enum: ['sidebar', 'panel'],
            default: 'sidebar',
            description: nls.localize(11732, null),
            deprecationMessage: nls.localize(11733, null)
        },
        'search.maxResults': {
            type: ['number', 'null'],
            default: DEFAULT_MAX_SEARCH_RESULTS,
            markdownDescription: nls.localize(11734, null)
        },
        'search.collapseResults': {
            type: 'string',
            enum: ['auto', 'alwaysCollapse', 'alwaysExpand'],
            enumDescriptions: [
                nls.localize(11735, null),
                '',
                ''
            ],
            default: 'alwaysExpand',
            description: nls.localize(11736, null),
        },
        'search.useReplacePreview': {
            type: 'boolean',
            default: true,
            description: nls.localize(11737, null),
        },
        'search.showLineNumbers': {
            type: 'boolean',
            default: false,
            description: nls.localize(11738, null),
        },
        'search.usePCRE2': {
            type: 'boolean',
            default: false,
            description: nls.localize(11739, null),
            deprecationMessage: nls.localize(11740, null),
        },
        'search.actionsPosition': {
            type: 'string',
            enum: ['auto', 'right'],
            enumDescriptions: [
                nls.localize(11741, null),
                nls.localize(11742, null),
            ],
            default: 'right',
            description: nls.localize(11743, null)
        },
        'search.searchOnType': {
            type: 'boolean',
            default: true,
            description: nls.localize(11744, null)
        },
        'search.seedWithNearestWord': {
            type: 'boolean',
            default: false,
            description: nls.localize(11745, null)
        },
        'search.seedOnFocus': {
            type: 'boolean',
            default: false,
            markdownDescription: nls.localize(11746, null)
        },
        'search.searchOnTypeDebouncePeriod': {
            type: 'number',
            default: 300,
            markdownDescription: nls.localize(11747, null, '`#search.searchOnType#`')
        },
        'search.searchEditor.doubleClickBehaviour': {
            type: 'string',
            enum: ['selectWord', 'goToLocation', 'openLocationToSide'],
            default: 'goToLocation',
            enumDescriptions: [
                nls.localize(11748, null),
                nls.localize(11749, null),
                nls.localize(11750, null),
            ],
            markdownDescription: nls.localize(11751, null)
        },
        'search.searchEditor.singleClickBehaviour': {
            type: 'string',
            enum: ['default', 'peekDefinition',],
            default: 'default',
            enumDescriptions: [
                nls.localize(11752, null),
                nls.localize(11753, null),
            ],
            markdownDescription: nls.localize(11754, null)
        },
        'search.searchEditor.reusePriorSearchConfiguration': {
            type: 'boolean',
            default: false,
            markdownDescription: nls.localize(11755, null)
        },
        'search.searchEditor.defaultNumberOfContextLines': {
            type: ['number', 'null'],
            default: 1,
            markdownDescription: nls.localize(11756, null)
        },
        'search.searchEditor.focusResultsOnSearch': {
            type: 'boolean',
            default: false,
            markdownDescription: nls.localize(11757, null)
        },
        'search.sortOrder': {
            type: 'string',
            enum: ["default" /* SearchSortOrder.Default */, "fileNames" /* SearchSortOrder.FileNames */, "type" /* SearchSortOrder.Type */, "modified" /* SearchSortOrder.Modified */, "countDescending" /* SearchSortOrder.CountDescending */, "countAscending" /* SearchSortOrder.CountAscending */],
            default: "default" /* SearchSortOrder.Default */,
            enumDescriptions: [
                nls.localize(11758, null),
                nls.localize(11759, null),
                nls.localize(11760, null),
                nls.localize(11761, null),
                nls.localize(11762, null),
                nls.localize(11763, null)
            ],
            description: nls.localize(11764, null)
        },
        'search.decorations.colors': {
            type: 'boolean',
            description: nls.localize(11765, null),
            default: true
        },
        'search.decorations.badges': {
            type: 'boolean',
            description: nls.localize(11766, null),
            default: true
        },
        'search.defaultViewMode': {
            type: 'string',
            enum: ["tree" /* ViewMode.Tree */, "list" /* ViewMode.List */],
            default: "list" /* ViewMode.List */,
            enumDescriptions: [
                nls.localize(11767, null),
                nls.localize(11768, null)
            ],
            description: nls.localize(11769, null)
        },
        'search.quickAccess.preserveInput': {
            type: 'boolean',
            description: nls.localize(11770, null),
            default: false
        },
        'search.experimental.closedNotebookRichContentResults': {
            type: 'boolean',
            description: nls.localize(11771, null),
            default: false
        },
        'search.searchView.semanticSearchBehavior': {
            type: 'string',
            description: nls.localize(11772, null),
            enum: ["manual" /* SemanticSearchBehavior.Manual */, "runOnEmpty" /* SemanticSearchBehavior.RunOnEmpty */, "auto" /* SemanticSearchBehavior.Auto */],
            default: "manual" /* SemanticSearchBehavior.Manual */,
            enumDescriptions: [
                nls.localize(11773, null),
                nls.localize(11774, null),
                nls.localize(11775, null)
            ],
            tags: ['preview'],
        },
        'search.searchView.keywordSuggestions': {
            type: 'boolean',
            description: nls.localize(11776, null),
            default: false,
            tags: ['preview'],
        },
    }
});
CommandsRegistry.registerCommand('_executeWorkspaceSymbolProvider', async function (accessor, ...args) {
    const [query] = args;
    assertType(typeof query === 'string');
    const result = await getWorkspaceSymbols(query);
    return result.map(item => item.symbol);
});
// todo: @andreamah get rid of this after a few iterations
Registry.as(Extensions.ConfigurationMigration)
    .registerConfigurationMigrations([{
        key: 'search.experimental.quickAccess.preserveInput',
        migrateFn: (value, _accessor) => ([
            ['search.quickAccess.preserveInput', { value }],
            ['search.experimental.quickAccess.preserveInput', { value: undefined }]
        ])
    }]);
//# sourceMappingURL=search.contribution.js.map