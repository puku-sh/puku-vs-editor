/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../base/common/codicons.js';
import { localize } from '../../../../nls.js';
import { registerIcon, spinningLoading } from '../../../../platform/theme/common/iconRegistry.js';
import { registerThemingParticipant } from '../../../../platform/theme/common/themeService.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { testingColorRunAction, testStatesToIconColors, testStatesToRetiredIconColors } from './theme.js';
export const testingViewIcon = registerIcon('test-view-icon', Codicon.beaker, localize(13511, null));
export const testingResultsIcon = registerIcon('test-results-icon', Codicon.checklist, localize(13512, null));
export const testingRunIcon = registerIcon('testing-run-icon', Codicon.run, localize(13513, null));
export const testingRerunIcon = registerIcon('testing-rerun-icon', Codicon.debugRerun, localize(13514, null));
export const testingRunAllIcon = registerIcon('testing-run-all-icon', Codicon.runAll, localize(13515, null));
// todo: https://github.com/microsoft/vscode-codicons/issues/72
export const testingDebugAllIcon = registerIcon('testing-debug-all-icon', Codicon.debugAltSmall, localize(13516, null));
export const testingDebugIcon = registerIcon('testing-debug-icon', Codicon.debugAltSmall, localize(13517, null));
export const testingCoverageIcon = registerIcon('testing-coverage-icon', Codicon.runCoverage, localize(13518, null));
export const testingCoverageAllIcon = registerIcon('testing-coverage-all-icon', Codicon.runAllCoverage, localize(13519, null));
export const testingCancelIcon = registerIcon('testing-cancel-icon', Codicon.debugStop, localize(13520, null));
export const testingFilterIcon = registerIcon('testing-filter', Codicon.filter, localize(13521, null));
export const testingHiddenIcon = registerIcon('testing-hidden', Codicon.eyeClosed, localize(13522, null));
export const testingShowAsList = registerIcon('testing-show-as-list-icon', Codicon.listTree, localize(13523, null));
export const testingShowAsTree = registerIcon('testing-show-as-list-icon', Codicon.listFlat, localize(13524, null));
export const testingUpdateProfiles = registerIcon('testing-update-profiles', Codicon.gear, localize(13525, null));
export const testingRefreshTests = registerIcon('testing-refresh-tests', Codicon.refresh, localize(13526, null));
export const testingTurnContinuousRunOn = registerIcon('testing-turn-continuous-run-on', Codicon.eye, localize(13527, null));
export const testingTurnContinuousRunOff = registerIcon('testing-turn-continuous-run-off', Codicon.eyeClosed, localize(13528, null));
export const testingContinuousIsOn = registerIcon('testing-continuous-is-on', Codicon.eye, localize(13529, null));
export const testingCancelRefreshTests = registerIcon('testing-cancel-refresh-tests', Codicon.stop, localize(13530, null));
export const testingCoverageReport = registerIcon('testing-coverage', Codicon.coverage, localize(13531, null));
export const testingWasCovered = registerIcon('testing-was-covered', Codicon.check, localize(13532, null));
export const testingCoverageMissingBranch = registerIcon('testing-missing-branch', Codicon.question, localize(13533, null));
export const testingStatesToIcons = new Map([
    [6 /* TestResultState.Errored */, registerIcon('testing-error-icon', Codicon.issues, localize(13534, null))],
    [4 /* TestResultState.Failed */, registerIcon('testing-failed-icon', Codicon.error, localize(13535, null))],
    [3 /* TestResultState.Passed */, registerIcon('testing-passed-icon', Codicon.pass, localize(13536, null))],
    [1 /* TestResultState.Queued */, registerIcon('testing-queued-icon', Codicon.history, localize(13537, null))],
    [2 /* TestResultState.Running */, spinningLoading],
    [5 /* TestResultState.Skipped */, registerIcon('testing-skipped-icon', Codicon.debugStepOver, localize(13538, null))],
    [0 /* TestResultState.Unset */, registerIcon('testing-unset-icon', Codicon.circleOutline, localize(13539, null))],
]);
registerThemingParticipant((theme, collector) => {
    for (const [state, icon] of testingStatesToIcons.entries()) {
        const color = testStatesToIconColors[state];
        const retiredColor = testStatesToRetiredIconColors[state];
        if (!color) {
            continue;
        }
        collector.addRule(`.monaco-workbench ${ThemeIcon.asCSSSelector(icon)} {
			color: ${theme.getColor(color)} !important;
		}`);
        if (!retiredColor) {
            continue;
        }
        collector.addRule(`
			.test-explorer .computed-state.retired${ThemeIcon.asCSSSelector(icon)},
			.testing-run-glyph.retired${ThemeIcon.asCSSSelector(icon)}{
				color: ${theme.getColor(retiredColor)} !important;
			}
		`);
    }
    collector.addRule(`
		.monaco-editor .glyph-margin-widgets ${ThemeIcon.asCSSSelector(testingRunIcon)},
		.monaco-editor .glyph-margin-widgets ${ThemeIcon.asCSSSelector(testingRunAllIcon)},
		.monaco-editor .glyph-margin-widgets ${ThemeIcon.asCSSSelector(testingDebugIcon)},
		.monaco-editor .glyph-margin-widgets ${ThemeIcon.asCSSSelector(testingDebugAllIcon)} {
			color: ${theme.getColor(testingColorRunAction)};
		}
	`);
});
//# sourceMappingURL=icons.js.map