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
import { Codicon } from '../../../../base/common/codicons.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { URI } from '../../../../base/common/uri.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { IPreferencesService } from '../../../services/preferences/common/preferences.js';
import { ChatConfiguration } from './constants.js';
import { extractUrlPatterns, getPatternLabel, isUrlApproved } from './chatUrlFetchingPatterns.js';
const trashButton = {
    iconClass: ThemeIcon.asClassName(Codicon.trash),
    tooltip: localize(6424, null)
};
let ChatUrlFetchingConfirmationContribution = class ChatUrlFetchingConfirmationContribution {
    constructor(_getURLS, _configurationService, _quickInputService, _preferencesService) {
        this._getURLS = _getURLS;
        this._configurationService = _configurationService;
        this._quickInputService = _quickInputService;
        this._preferencesService = _preferencesService;
        this.canUseDefaultApprovals = false;
    }
    getPreConfirmAction(ref) {
        return this._checkApproval(ref, true);
    }
    getPostConfirmAction(ref) {
        return this._checkApproval(ref, false);
    }
    _checkApproval(ref, checkRequest) {
        const urls = this._getURLS(ref.parameters);
        if (!urls || urls.length === 0) {
            return undefined;
        }
        const approvedUrls = this._getApprovedUrls();
        // Check if all URLs are approved
        const allApproved = urls.every(url => {
            try {
                const uri = URI.parse(url);
                return isUrlApproved(uri, approvedUrls, checkRequest);
            }
            catch {
                return false;
            }
        });
        if (allApproved) {
            return {
                type: 2 /* ToolConfirmKind.Setting */,
                id: ChatConfiguration.AutoApprovedUrls
            };
        }
        return undefined;
    }
    getPreConfirmActions(ref) {
        return this._getConfirmActions(ref, true);
    }
    getPostConfirmActions(ref) {
        return this._getConfirmActions(ref, false);
    }
    _getConfirmActions(ref, forRequest) {
        const urls = this._getURLS(ref.parameters);
        if (!urls || urls.length === 0) {
            return [];
        }
        const actions = [];
        // Get unique URLs (may have duplicates)
        const uniqueUrls = Array.from(new Set(urls)).map(u => URI.parse(u));
        // For each URL, get its patterns
        const urlPatterns = new ResourceMap(uniqueUrls.map(u => [u, extractUrlPatterns(u)]));
        // If only one URL, show quick actions for specific patterns
        if (urlPatterns.size === 1) {
            const uri = uniqueUrls[0];
            const patterns = urlPatterns.get(uri);
            // Show top 2 most relevant patterns as quick actions
            const topPatterns = patterns.slice(0, 2);
            for (const pattern of topPatterns) {
                const patternLabel = getPatternLabel(uri, pattern);
                actions.push({
                    label: forRequest
                        ? localize(6425, null, patternLabel)
                        : localize(6426, null, patternLabel),
                    select: async () => {
                        await this._approvePattern(pattern, forRequest, !forRequest);
                        return true;
                    }
                });
            }
            // "More options" action
            actions.push({
                label: localize(6427, null),
                select: async () => {
                    const result = await this._showMoreOptions(ref, [{ uri, patterns }], forRequest);
                    return result;
                }
            });
        }
        else {
            // Multiple URLs - show "More options" only
            actions.push({
                label: localize(6428, null),
                select: async () => {
                    await this._showMoreOptions(ref, [...urlPatterns].map(([uri, patterns]) => ({ uri, patterns })), forRequest);
                    return true;
                }
            });
        }
        return actions;
    }
    async _showMoreOptions(ref, urls, forRequest) {
        return new Promise((resolve) => {
            const disposables = new DisposableStore();
            const quickTree = disposables.add(this._quickInputService.createQuickTree());
            quickTree.ignoreFocusOut = true;
            quickTree.sortByLabel = false;
            quickTree.placeholder = localize(6429, null);
            const treeItems = [];
            const approvedUrls = this._getApprovedUrls();
            for (const { uri, patterns } of urls) {
                for (const pattern of patterns.slice().sort((a, b) => b.length - a.length)) {
                    const settings = approvedUrls[pattern];
                    const requestChecked = typeof settings === 'boolean' ? settings : (settings?.approveRequest ?? false);
                    const responseChecked = typeof settings === 'boolean' ? settings : (settings?.approveResponse ?? false);
                    treeItems.push({
                        label: getPatternLabel(uri, pattern),
                        pattern,
                        checked: requestChecked && responseChecked ? true : (!requestChecked && !responseChecked ? false : 'mixed'),
                        collapsed: true,
                        children: [
                            {
                                label: localize(6430, null),
                                pattern,
                                approvalType: 'request',
                                checked: requestChecked
                            },
                            {
                                label: localize(6431, null),
                                pattern,
                                approvalType: 'response',
                                checked: responseChecked
                            }
                        ],
                    });
                }
            }
            quickTree.setItemTree(treeItems);
            const updateApprovals = () => {
                const current = { ...this._getApprovedUrls() };
                for (const item of quickTree.itemTree) {
                    // root-level items
                    const allowPre = item.children?.find(c => c.approvalType === 'request')?.checked;
                    const allowPost = item.children?.find(c => c.approvalType === 'response')?.checked;
                    if (allowPost && allowPre) {
                        current[item.pattern] = true;
                    }
                    else if (!allowPost && !allowPre) {
                        delete current[item.pattern];
                    }
                    else {
                        current[item.pattern] = {
                            approveRequest: !!allowPre || undefined,
                            approveResponse: !!allowPost || undefined,
                        };
                    }
                }
                return this._configurationService.updateValue(ChatConfiguration.AutoApprovedUrls, current);
            };
            disposables.add(quickTree.onDidAccept(async () => {
                quickTree.busy = true;
                await updateApprovals();
                resolve(!!this._checkApproval(ref, forRequest));
                quickTree.hide();
            }));
            disposables.add(quickTree.onDidHide(() => {
                updateApprovals();
                disposables.dispose();
                resolve(false);
            }));
            quickTree.show();
        });
    }
    async _approvePattern(pattern, approveRequest, approveResponse) {
        const approvedUrls = { ...this._getApprovedUrls() };
        // Create the approval settings
        let value;
        if (approveRequest === approveResponse) {
            value = approveRequest;
        }
        else {
            value = { approveRequest, approveResponse };
        }
        approvedUrls[pattern] = value;
        await this._configurationService.updateValue(ChatConfiguration.AutoApprovedUrls, approvedUrls);
    }
    getManageActions() {
        const approvedUrls = { ...this._getApprovedUrls() };
        const items = [];
        for (const [pattern, settings] of Object.entries(approvedUrls)) {
            const label = pattern;
            let description;
            if (typeof settings === 'boolean') {
                description = settings
                    ? localize(6432, null)
                    : localize(6433, null);
            }
            else {
                const parts = [];
                if (settings.approveRequest) {
                    parts.push(localize(6434, null));
                }
                if (settings.approveResponse) {
                    parts.push(localize(6435, null));
                }
                description = parts.length > 0
                    ? localize(6436, null, parts.join(', '))
                    : localize(6437, null);
            }
            const item = {
                label,
                description,
                buttons: [trashButton],
                checked: true,
                onDidChangeChecked: (checked) => {
                    if (checked) {
                        approvedUrls[pattern] = settings;
                    }
                    else {
                        delete approvedUrls[pattern];
                    }
                    this._configurationService.updateValue(ChatConfiguration.AutoApprovedUrls, approvedUrls);
                }
            };
            items.push(item);
        }
        items.push({
            pickable: false,
            label: localize(6438, null),
            description: localize(6439, null),
            onDidOpen: () => {
                this._preferencesService.openUserSettings({ query: ChatConfiguration.AutoApprovedUrls });
            }
        });
        return items;
    }
    async reset() {
        await this._configurationService.updateValue(ChatConfiguration.AutoApprovedUrls, {});
    }
    _getApprovedUrls() {
        return this._configurationService.getValue(ChatConfiguration.AutoApprovedUrls) || {};
    }
};
ChatUrlFetchingConfirmationContribution = __decorate([
    __param(1, IConfigurationService),
    __param(2, IQuickInputService),
    __param(3, IPreferencesService)
], ChatUrlFetchingConfirmationContribution);
export { ChatUrlFetchingConfirmationContribution };
//# sourceMappingURL=chatUrlFetchingConfirmation.js.map