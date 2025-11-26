/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { DropdownMenuActionViewItem } from '../../../../base/browser/ui/dropdown/dropdownActionViewItem.js';
import { Separator } from '../../../../base/common/actions.js';
import { SuggestController } from '../../../../editor/contrib/suggest/browser/suggestController.js';
import { localize } from '../../../../nls.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { ADVANCED_SETTING_TAG, EXTENSION_SETTING_TAG, FEATURE_SETTING_TAG, GENERAL_TAG_SETTING_TAG, ID_SETTING_TAG, LANGUAGE_SETTING_TAG, MODIFIED_SETTING_TAG, POLICY_SETTING_TAG } from '../common/preferences.js';
let SettingsSearchFilterDropdownMenuActionViewItem = class SettingsSearchFilterDropdownMenuActionViewItem extends DropdownMenuActionViewItem {
    constructor(action, options, actionRunner, searchWidget, contextMenuService) {
        super(action, { getActions: () => this.getActions() }, contextMenuService, {
            ...options,
            actionRunner,
            classNames: action.class,
            anchorAlignmentProvider: () => 1 /* AnchorAlignment.RIGHT */,
            menuAsChild: true
        });
        this.searchWidget = searchWidget;
        this.suggestController = SuggestController.get(this.searchWidget.inputWidget);
    }
    render(container) {
        super.render(container);
    }
    doSearchWidgetAction(queryToAppend, triggerSuggest) {
        this.searchWidget.setValue(this.searchWidget.getValue().trimEnd() + ' ' + queryToAppend);
        this.searchWidget.focus();
        if (triggerSuggest && this.suggestController) {
            this.suggestController.triggerSuggest();
        }
    }
    /**
     * The created action appends a query to the search widget search string. It optionally triggers suggestions.
     */
    createAction(id, label, tooltip, queryToAppend, triggerSuggest) {
        return {
            id,
            label,
            tooltip,
            class: undefined,
            enabled: true,
            run: () => { this.doSearchWidgetAction(queryToAppend, triggerSuggest); }
        };
    }
    /**
     * The created action appends a query to the search widget search string, if the query does not exist.
     * Otherwise, it removes the query from the search widget search string.
     * The action does not trigger suggestions after adding or removing the query.
     */
    createToggleAction(id, label, tooltip, queryToAppend) {
        const splitCurrentQuery = this.searchWidget.getValue().split(' ');
        const queryContainsQueryToAppend = splitCurrentQuery.includes(queryToAppend);
        return {
            id,
            label,
            tooltip,
            class: undefined,
            enabled: true,
            checked: queryContainsQueryToAppend,
            run: () => {
                if (!queryContainsQueryToAppend) {
                    const trimmedCurrentQuery = this.searchWidget.getValue().trimEnd();
                    const newQuery = trimmedCurrentQuery ? trimmedCurrentQuery + ' ' + queryToAppend : queryToAppend;
                    this.searchWidget.setValue(newQuery);
                }
                else {
                    const queryWithRemovedTags = this.searchWidget.getValue().split(' ')
                        .filter(word => word !== queryToAppend).join(' ');
                    this.searchWidget.setValue(queryWithRemovedTags);
                }
                this.searchWidget.focus();
            }
        };
    }
    createMutuallyExclusiveToggleAction(id, label, tooltip, filter, excludeFilters) {
        const isFilterEnabled = this.searchWidget.getValue().split(' ').includes(filter);
        return {
            id,
            label,
            tooltip,
            class: undefined,
            enabled: true,
            checked: isFilterEnabled,
            run: () => {
                if (isFilterEnabled) {
                    const queryWithRemovedTags = this.searchWidget.getValue().split(' ')
                        .filter(word => word !== filter).join(' ');
                    this.searchWidget.setValue(queryWithRemovedTags);
                }
                else {
                    let newQuery = this.searchWidget.getValue().split(' ')
                        .filter(word => !excludeFilters.includes(word) && word !== filter)
                        .join(' ')
                        .trimEnd();
                    newQuery = newQuery ? newQuery + ' ' + filter : filter;
                    this.searchWidget.setValue(newQuery);
                }
                this.searchWidget.focus();
            }
        };
    }
    getActions() {
        return [
            this.createToggleAction('modifiedSettingsSearch', localize(11004, null), localize(11005, null), `@${MODIFIED_SETTING_TAG}`),
            new Separator(),
            this.createAction('extSettingsSearch', localize(11006, null), localize(11007, null), `@${EXTENSION_SETTING_TAG}`, true),
            this.createAction('featuresSettingsSearch', localize(11008, null), localize(11009, null), `@${FEATURE_SETTING_TAG}`, true),
            this.createAction('tagSettingsSearch', localize(11010, null), localize(11011, null), `@${GENERAL_TAG_SETTING_TAG}`, true),
            this.createAction('langSettingsSearch', localize(11012, null), localize(11013, null), `@${LANGUAGE_SETTING_TAG}`, true),
            this.createAction('idSettingsSearch', localize(11014, null), localize(11015, null), `@${ID_SETTING_TAG}`, false),
            new Separator(),
            this.createToggleAction('onlineSettingsSearch', localize(11016, null), localize(11017, null), '@tag:usesOnlineServices'),
            this.createToggleAction('policySettingsSearch', localize(11018, null), localize(11019, null), `@${POLICY_SETTING_TAG}`),
            new Separator(),
            this.createMutuallyExclusiveToggleAction('stableSettingsSearch', localize(11020, null), localize(11021, null), `@stable`, ['@tag:preview', '@tag:experimental']),
            this.createMutuallyExclusiveToggleAction('previewSettingsSearch', localize(11022, null), localize(11023, null), `@tag:preview`, ['@stable', '@tag:experimental']),
            this.createMutuallyExclusiveToggleAction('experimentalSettingsSearch', localize(11024, null), localize(11025, null), `@tag:experimental`, ['@stable', '@tag:preview']),
            new Separator(),
            this.createToggleAction('advancedSettingsSearch', localize(11026, null), localize(11027, null), `@tag:${ADVANCED_SETTING_TAG}`),
        ];
    }
};
SettingsSearchFilterDropdownMenuActionViewItem = __decorate([
    __param(4, IContextMenuService)
], SettingsSearchFilterDropdownMenuActionViewItem);
export { SettingsSearchFilterDropdownMenuActionViewItem };
//# sourceMappingURL=settingsSearchMenu.js.map