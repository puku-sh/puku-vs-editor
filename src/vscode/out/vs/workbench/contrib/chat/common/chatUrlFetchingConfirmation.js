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
    tooltip: localize('delete', "Delete")
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
                        ? localize('approveRequestTo', "Allow requests to {0}", patternLabel)
                        : localize('approveResponseFrom', "Allow responses from {0}", patternLabel),
                    select: async () => {
                        await this._approvePattern(pattern, forRequest, !forRequest);
                        return true;
                    }
                });
            }
            // "More options" action
            actions.push({
                label: localize('moreOptions', "Allow requests to..."),
                select: async () => {
                    const result = await this._showMoreOptions(ref, [{ uri, patterns }], forRequest);
                    return result;
                }
            });
        }
        else {
            // Multiple URLs - show "More options" only
            actions.push({
                label: localize('moreOptionsMultiple', "Configure URL Approvals..."),
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
            quickTree.placeholder = localize('selectApproval', "Select URL pattern to approve");
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
                                label: localize('allowRequestsCheckbox', "Make requests without confirmation"),
                                pattern,
                                approvalType: 'request',
                                checked: requestChecked
                            },
                            {
                                label: localize('allowResponsesCheckbox', "Allow responses without confirmation"),
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
                    ? localize('approveAll', "Approve all")
                    : localize('denyAll', "Deny all");
            }
            else {
                const parts = [];
                if (settings.approveRequest) {
                    parts.push(localize('requests', "requests"));
                }
                if (settings.approveResponse) {
                    parts.push(localize('responses', "responses"));
                }
                description = parts.length > 0
                    ? localize('approves', "Approves {0}", parts.join(', '))
                    : localize('noApprovals', "No approvals");
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
            label: localize('moreOptionsManage', "More Options..."),
            description: localize('openSettings', "Open settings"),
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFVybEZldGNoaW5nQ29uZmlybWF0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9wb3JpZGhpL2RldmVsb3BtZW50L3B1a3UtdnMtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vY2hhdFVybEZldGNoaW5nQ29uZmlybWF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDdkUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBcUIsa0JBQWtCLEVBQWtCLE1BQU0sc0RBQXNELENBQUM7QUFDN0gsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0scURBQXFELENBQUM7QUFFMUYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFPbkQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLGVBQWUsRUFBRSxhQUFhLEVBQXdCLE1BQU0sOEJBQThCLENBQUM7QUFFeEgsTUFBTSxXQUFXLEdBQXNCO0lBQ3RDLFNBQVMsRUFBRSxTQUFTLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUM7SUFDL0MsT0FBTyxFQUFFLFFBQVEsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDO0NBQ3JDLENBQUM7QUFF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