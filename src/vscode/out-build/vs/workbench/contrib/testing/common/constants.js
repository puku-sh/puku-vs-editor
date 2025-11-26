/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { stripIcons } from '../../../../base/common/iconLabels.js';
import { localize } from '../../../../nls.js';
export var Testing;
(function (Testing) {
    // marked as "extension" so that any existing test extensions are assigned to it.
    Testing["ViewletId"] = "workbench.view.extension.test";
    Testing["ExplorerViewId"] = "workbench.view.testing";
    Testing["OutputPeekContributionId"] = "editor.contrib.testingOutputPeek";
    Testing["DecorationsContributionId"] = "editor.contrib.testingDecorations";
    Testing["CoverageDecorationsContributionId"] = "editor.contrib.coverageDecorations";
    Testing["CoverageViewId"] = "workbench.view.testCoverage";
    Testing["ResultsPanelId"] = "workbench.panel.testResults";
    Testing["ResultsViewId"] = "workbench.panel.testResults.view";
    Testing["MessageLanguageId"] = "vscodeInternalTestMessage";
})(Testing || (Testing = {}));
export var TestExplorerViewMode;
(function (TestExplorerViewMode) {
    TestExplorerViewMode["List"] = "list";
    TestExplorerViewMode["Tree"] = "true";
})(TestExplorerViewMode || (TestExplorerViewMode = {}));
export var TestExplorerViewSorting;
(function (TestExplorerViewSorting) {
    TestExplorerViewSorting["ByLocation"] = "location";
    TestExplorerViewSorting["ByStatus"] = "status";
    TestExplorerViewSorting["ByDuration"] = "duration";
})(TestExplorerViewSorting || (TestExplorerViewSorting = {}));
const testStateNames = {
    [6 /* TestResultState.Errored */]: localize(13796, null),
    [4 /* TestResultState.Failed */]: localize(13797, null),
    [3 /* TestResultState.Passed */]: localize(13798, null),
    [1 /* TestResultState.Queued */]: localize(13799, null),
    [2 /* TestResultState.Running */]: localize(13800, null),
    [5 /* TestResultState.Skipped */]: localize(13801, null),
    [0 /* TestResultState.Unset */]: localize(13802, null),
};
export const labelForTestInState = (label, state) => localize(13803, null, stripIcons(label), testStateNames[state]);



export const testConfigurationGroupNames = {
    [4 /* TestRunProfileBitset.Debug */]: localize(13804, null),
    [2 /* TestRunProfileBitset.Run */]: localize(13805, null),
    [8 /* TestRunProfileBitset.Coverage */]: localize(13806, null),
};
export var TestCommandId;
(function (TestCommandId) {
    TestCommandId["CancelTestRefreshAction"] = "testing.cancelTestRefresh";
    TestCommandId["CancelTestRunAction"] = "testing.cancelRun";
    TestCommandId["ClearTestResultsAction"] = "testing.clearTestResults";
    TestCommandId["CollapseAllAction"] = "testing.collapseAll";
    TestCommandId["ConfigureTestProfilesAction"] = "testing.configureProfile";
    TestCommandId["ContinousRunUsingForTest"] = "testing.continuousRunUsingForTest";
    TestCommandId["CoverageAtCursor"] = "testing.coverageAtCursor";
    TestCommandId["CoverageByUri"] = "testing.coverage.uri";
    TestCommandId["CoverageClear"] = "testing.coverage.close";
    TestCommandId["CoverageCurrentFile"] = "testing.coverageCurrentFile";
    TestCommandId["CoverageFilterToTest"] = "testing.coverageFilterToTest";
    TestCommandId["CoverageFilterToTestInEditor"] = "testing.coverageFilterToTestInEditor";
    TestCommandId["CoverageGoToNextMissedLine"] = "testing.coverage.goToNextMissedLine";
    TestCommandId["CoverageGoToPreviousMissedLine"] = "testing.coverage.goToPreviousMissedLine";
    TestCommandId["CoverageLastRun"] = "testing.coverageLastRun";
    TestCommandId["CoverageSelectedAction"] = "testing.coverageSelected";
    TestCommandId["CoverageToggleInExplorer"] = "testing.toggleCoverageInExplorer";
    TestCommandId["CoverageToggleToolbar"] = "testing.coverageToggleToolbar";
    TestCommandId["CoverageViewChangeSorting"] = "testing.coverageViewChangeSorting";
    TestCommandId["CoverageViewCollapseAll"] = "testing.coverageViewCollapseAll";
    TestCommandId["DebugAction"] = "testing.debug";
    TestCommandId["DebugAllAction"] = "testing.debugAll";
    TestCommandId["DebugAtCursor"] = "testing.debugAtCursor";
    TestCommandId["DebugByUri"] = "testing.debug.uri";
    TestCommandId["DebugCurrentFile"] = "testing.debugCurrentFile";
    TestCommandId["DebugFailedTests"] = "testing.debugFailTests";
    TestCommandId["DebugFailedFromLastRun"] = "testing.debugFailedFromLastRun";
    TestCommandId["DebugLastRun"] = "testing.debugLastRun";
    TestCommandId["DebugSelectedAction"] = "testing.debugSelected";
    TestCommandId["FilterAction"] = "workbench.actions.treeView.testExplorer.filter";
    TestCommandId["GetExplorerSelection"] = "_testing.getExplorerSelection";
    TestCommandId["GetSelectedProfiles"] = "testing.getSelectedProfiles";
    TestCommandId["GoToTest"] = "testing.editFocusedTest";
    TestCommandId["GoToRelatedTest"] = "testing.goToRelatedTest";
    TestCommandId["PeekRelatedTest"] = "testing.peekRelatedTest";
    TestCommandId["GoToRelatedCode"] = "testing.goToRelatedCode";
    TestCommandId["PeekRelatedCode"] = "testing.peekRelatedCode";
    TestCommandId["HideTestAction"] = "testing.hideTest";
    TestCommandId["OpenCoverage"] = "testing.openCoverage";
    TestCommandId["OpenOutputPeek"] = "testing.openOutputPeek";
    TestCommandId["RefreshTestsAction"] = "testing.refreshTests";
    TestCommandId["ReRunFailedTests"] = "testing.reRunFailTests";
    TestCommandId["ReRunFailedFromLastRun"] = "testing.reRunFailedFromLastRun";
    TestCommandId["ReRunLastRun"] = "testing.reRunLastRun";
    TestCommandId["RunAction"] = "testing.run";
    TestCommandId["RunAllAction"] = "testing.runAll";
    TestCommandId["RunAllWithCoverageAction"] = "testing.coverageAll";
    TestCommandId["RunAtCursor"] = "testing.runAtCursor";
    TestCommandId["RunByUri"] = "testing.run.uri";
    TestCommandId["RunCurrentFile"] = "testing.runCurrentFile";
    TestCommandId["RunSelectedAction"] = "testing.runSelected";
    TestCommandId["RunUsingProfileAction"] = "testing.runUsing";
    TestCommandId["RunWithCoverageAction"] = "testing.coverage";
    TestCommandId["SearchForTestExtension"] = "testing.searchForTestExtension";
    TestCommandId["SelectDefaultTestProfiles"] = "testing.selectDefaultTestProfiles";
    TestCommandId["ShowMostRecentOutputAction"] = "testing.showMostRecentOutput";
    TestCommandId["StartContinousRun"] = "testing.startContinuousRun";
    TestCommandId["StartContinousRunFromExtension"] = "testing.startContinuousRunFromExtension";
    TestCommandId["StopContinousRunFromExtension"] = "testing.stopContinuousRunFromExtension";
    TestCommandId["StopContinousRun"] = "testing.stopContinuousRun";
    TestCommandId["TestingSortByDurationAction"] = "testing.sortByDuration";
    TestCommandId["TestingSortByLocationAction"] = "testing.sortByLocation";
    TestCommandId["TestingSortByStatusAction"] = "testing.sortByStatus";
    TestCommandId["TestingViewAsListAction"] = "testing.viewAsList";
    TestCommandId["TestingViewAsTreeAction"] = "testing.viewAsTree";
    TestCommandId["ToggleContinousRunForTest"] = "testing.toggleContinuousRunForTest";
    TestCommandId["ToggleResultsViewLayoutAction"] = "testing.toggleResultsViewLayout";
    TestCommandId["ToggleInlineTestOutput"] = "testing.toggleInlineTestOutput";
    TestCommandId["UnhideAllTestsAction"] = "testing.unhideAllTests";
    TestCommandId["UnhideTestAction"] = "testing.unhideTest";
})(TestCommandId || (TestCommandId = {}));
//# sourceMappingURL=constants.js.map