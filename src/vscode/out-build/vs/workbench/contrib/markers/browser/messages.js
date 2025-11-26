/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { basename } from '../../../../base/common/resources.js';
import { MarkerSeverity } from '../../../../platform/markers/common/markers.js';
export default class Messages {
    static { this.MARKERS_PANEL_TOGGLE_LABEL = nls.localize(9471, null); }
    static { this.MARKERS_PANEL_SHOW_LABEL = nls.localize2(9516, "Focus Problems (Errors, Warnings, Infos)"); }
    static { this.PROBLEMS_PANEL_CONFIGURATION_TITLE = nls.localize(9472, null); }
    static { this.PROBLEMS_PANEL_CONFIGURATION_AUTO_REVEAL = nls.localize(9473, null); }
    static { this.PROBLEMS_PANEL_CONFIGURATION_VIEW_MODE = nls.localize(9474, null); }
    static { this.PROBLEMS_PANEL_CONFIGURATION_SHOW_CURRENT_STATUS = nls.localize(9475, null); }
    static { this.PROBLEMS_PANEL_CONFIGURATION_COMPARE_ORDER = nls.localize(9476, null); }
    static { this.PROBLEMS_PANEL_CONFIGURATION_COMPARE_ORDER_SEVERITY = nls.localize(9477, null); }
    static { this.PROBLEMS_PANEL_CONFIGURATION_COMPARE_ORDER_POSITION = nls.localize(9478, null); }
    static { this.MARKERS_PANEL_TITLE_PROBLEMS = nls.localize2(9517, "Problems"); }
    static { this.MARKERS_PANEL_NO_PROBLEMS_BUILT = nls.localize(9479, null); }
    static { this.MARKERS_PANEL_NO_PROBLEMS_ACTIVE_FILE_BUILT = nls.localize(9480, null); }
    static { this.MARKERS_PANEL_NO_PROBLEMS_FILTERS = nls.localize(9481, null); }
    static { this.MARKERS_PANEL_ACTION_TOOLTIP_MORE_FILTERS = nls.localize(9482, null); }
    static { this.MARKERS_PANEL_FILTER_LABEL_SHOW_ERRORS = nls.localize(9483, null); }
    static { this.MARKERS_PANEL_FILTER_LABEL_SHOW_WARNINGS = nls.localize(9484, null); }
    static { this.MARKERS_PANEL_FILTER_LABEL_SHOW_INFOS = nls.localize(9485, null); }
    static { this.MARKERS_PANEL_FILTER_LABEL_EXCLUDED_FILES = nls.localize(9486, null); }
    static { this.MARKERS_PANEL_FILTER_LABEL_ACTIVE_FILE = nls.localize(9487, null); }
    static { this.MARKERS_PANEL_ACTION_TOOLTIP_FILTER = nls.localize(9488, null); }
    static { this.MARKERS_PANEL_ACTION_TOOLTIP_QUICKFIX = nls.localize(9489, null); }
    static { this.MARKERS_PANEL_FILTER_ARIA_LABEL = nls.localize(9490, null); }
    static { this.MARKERS_PANEL_FILTER_PLACEHOLDER = nls.localize(9491, null); }
    static { this.MARKERS_PANEL_FILTER_ERRORS = nls.localize(9492, null); }
    static { this.MARKERS_PANEL_FILTER_WARNINGS = nls.localize(9493, null); }
    static { this.MARKERS_PANEL_FILTER_INFOS = nls.localize(9494, null); }
    static { this.MARKERS_PANEL_SINGLE_ERROR_LABEL = nls.localize(9495, null); }
    static { this.MARKERS_PANEL_MULTIPLE_ERRORS_LABEL = (noOfErrors) => { return nls.localize(9496, null, '' + noOfErrors); }; }
    static { this.MARKERS_PANEL_SINGLE_WARNING_LABEL = nls.localize(9497, null); }
    static { this.MARKERS_PANEL_MULTIPLE_WARNINGS_LABEL = (noOfWarnings) => { return nls.localize(9498, null, '' + noOfWarnings); }; }
    static { this.MARKERS_PANEL_SINGLE_INFO_LABEL = nls.localize(9499, null); }
    static { this.MARKERS_PANEL_MULTIPLE_INFOS_LABEL = (noOfInfos) => { return nls.localize(9500, null, '' + noOfInfos); }; }
    static { this.MARKERS_PANEL_SINGLE_UNKNOWN_LABEL = nls.localize(9501, null); }
    static { this.MARKERS_PANEL_MULTIPLE_UNKNOWNS_LABEL = (noOfUnknowns) => { return nls.localize(9502, null, '' + noOfUnknowns); }; }
    static { this.MARKERS_PANEL_AT_LINE_COL_NUMBER = (ln, col) => { return nls.localize(9503, null, '' + ln, '' + col); }; }
    static { this.MARKERS_TREE_ARIA_LABEL_RESOURCE = (noOfProblems, fileName, folder) => { return nls.localize(9504, null, noOfProblems, fileName, folder); }; }
    static { this.MARKERS_TREE_ARIA_LABEL_MARKER = (marker) => {
        const relatedInformationMessage = marker.relatedInformation.length ? nls.localize(9505, null, marker.relatedInformation.length) : '';
        switch (marker.marker.severity) {
            case MarkerSeverity.Error:
                return marker.marker.source ? nls.localize(9506, null, marker.marker.message, marker.marker.startLineNumber, marker.marker.startColumn, relatedInformationMessage, marker.marker.source)
                    : nls.localize(9507, null, marker.marker.message, marker.marker.startLineNumber, marker.marker.startColumn, relatedInformationMessage);
            case MarkerSeverity.Warning:
                return marker.marker.source ? nls.localize(9508, null, marker.marker.message, marker.marker.startLineNumber, marker.marker.startColumn, relatedInformationMessage, marker.marker.source)
                    : nls.localize(9509, null, marker.marker.message, marker.marker.startLineNumber, marker.marker.startColumn, relatedInformationMessage, relatedInformationMessage);
            case MarkerSeverity.Info:
                return marker.marker.source ? nls.localize(9510, null, marker.marker.message, marker.marker.startLineNumber, marker.marker.startColumn, relatedInformationMessage, marker.marker.source)
                    : nls.localize(9511, null, marker.marker.message, marker.marker.startLineNumber, marker.marker.startColumn, relatedInformationMessage);
            default:
                return marker.marker.source ? nls.localize(9512, null, marker.marker.source, marker.marker.message, marker.marker.startLineNumber, marker.marker.startColumn, relatedInformationMessage, marker.marker.source)
                    : nls.localize(9513, null, marker.marker.message, marker.marker.startLineNumber, marker.marker.startColumn, relatedInformationMessage);
        }
    }; }
    static { this.MARKERS_TREE_ARIA_LABEL_RELATED_INFORMATION = (relatedInformation) => nls.localize(9514, null, relatedInformation.message, relatedInformation.startLineNumber, relatedInformation.startColumn, basename(relatedInformation.resource)); }
    static { this.SHOW_ERRORS_WARNINGS_ACTION_LABEL = nls.localize(9515, null); }
}
//# sourceMappingURL=messages.js.map