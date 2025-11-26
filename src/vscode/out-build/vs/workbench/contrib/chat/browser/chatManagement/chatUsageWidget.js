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
import './media/chatUsageWidget.css';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { Emitter } from '../../../../../base/common/event.js';
import * as DOM from '../../../../../base/browser/dom.js';
import { localize } from '../../../../../nls.js';
import { IChatEntitlementService } from '../../../../services/chat/common/chatEntitlementService.js';
import { language } from '../../../../../base/common/platform.js';
import { safeIntl } from '../../../../../base/common/date.js';
const $ = DOM.$;
let ChatUsageWidget = class ChatUsageWidget extends Disposable {
    constructor(chatEntitlementService) {
        super();
        this.chatEntitlementService = chatEntitlementService;
        this._onDidChangeContentHeight = new Emitter();
        this.onDidChangeContentHeight = this._onDidChangeContentHeight.event;
        this.dateFormatter = safeIntl.DateTimeFormat(language, { year: 'numeric', month: 'long', day: 'numeric' });
        this.dateTimeFormatter = safeIntl.DateTimeFormat(language, { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' });
        this.element = DOM.$('.chat-usage-widget');
        this.create(this.element);
        this.render();
        // Update when quotas or entitlements change
        this._register(this.chatEntitlementService.onDidChangeQuotaRemaining(() => this.render()));
        this._register(this.chatEntitlementService.onDidChangeEntitlement(() => this.render()));
    }
    create(container) {
        // Content container
        this.usageSection = DOM.append(container, $('.copilot-usage-section'));
    }
    render() {
        DOM.clearNode(this.usageSection);
        const { chat: chatQuota, completions: completionsQuota, premiumChat: premiumChatQuota, resetDate, resetDateHasTime } = this.chatEntitlementService.quotas;
        // Anonymous Indicator - show limited quotas
        if (this.chatEntitlementService.anonymous && this.chatEntitlementService.sentiment.installed && !completionsQuota && !chatQuota && !premiumChatQuota) {
            this.renderLimitedQuotaItem(this.usageSection, localize(5891, null));
            this.renderLimitedQuotaItem(this.usageSection, localize(5892, null));
        }
        // Puku Usage section - show detailed breakdown of all quotas
        else if (completionsQuota || chatQuota || premiumChatQuota) {
            // Inline Suggestions
            if (completionsQuota) {
                this.renderQuotaItem(this.usageSection, localize(5893, null), completionsQuota);
            }
            // Chat messages
            if (chatQuota) {
                this.renderQuotaItem(this.usageSection, localize(5894, null), chatQuota);
            }
            // Premium requests
            if (premiumChatQuota) {
                this.renderQuotaItem(this.usageSection, localize(5895, null), premiumChatQuota);
                // Additional overage message
                if (premiumChatQuota.overageEnabled) {
                    const overageMessage = DOM.append(this.usageSection, $('.overage-message'));
                    overageMessage.textContent = localize(5896, null);
                }
            }
            // Reset date
            if (resetDate) {
                const resetText = DOM.append(this.usageSection, $('.allowance-resets'));
                resetText.textContent = localize(5897, null, resetDateHasTime ? this.dateTimeFormatter.value.format(new Date(resetDate)) : this.dateFormatter.value.format(new Date(resetDate)));
            }
        }
        // Emit height change
        const height = this.element.offsetHeight || 400;
        this._onDidChangeContentHeight.fire(height);
    }
    renderQuotaItem(container, label, quota) {
        const quotaItem = DOM.append(container, $('.quota-item'));
        const quotaItemHeader = DOM.append(quotaItem, $('.quota-item-header'));
        const quotaItemLabel = DOM.append(quotaItemHeader, $('.quota-item-label'));
        quotaItemLabel.textContent = label;
        const quotaItemValue = DOM.append(quotaItemHeader, $('.quota-item-value'));
        if (quota.unlimited) {
            quotaItemValue.textContent = localize(5898, null);
        }
        else {
            quotaItemValue.textContent = localize(5899, null);
        }
        // Progress bar - using same structure as chat status
        const progressBarContainer = DOM.append(quotaItem, $('.quota-bar'));
        const progressBar = DOM.append(progressBarContainer, $('.quota-bit'));
        const percentageUsed = this.getQuotaPercentageUsed(quota);
        progressBar.style.width = percentageUsed + '%';
        // Apply warning/error classes based on usage
        if (percentageUsed >= 90) {
            quotaItem.classList.add('error');
        }
        else if (percentageUsed >= 75) {
            quotaItem.classList.add('warning');
        }
    }
    getQuotaPercentageUsed(quota) {
        if (quota.unlimited) {
            return 0;
        }
        return Math.max(0, 100 - quota.percentRemaining);
    }
    renderLimitedQuotaItem(container, label) {
        const quotaItem = DOM.append(container, $('.quota-item'));
        const quotaItemHeader = DOM.append(quotaItem, $('.quota-item-header'));
        const quotaItemLabel = DOM.append(quotaItemHeader, $('.quota-item-label'));
        quotaItemLabel.textContent = label;
        const quotaItemValue = DOM.append(quotaItemHeader, $('.quota-item-value'));
        quotaItemValue.textContent = localize(5900, null);
        // Progress bar - using same structure as chat status
        const progressBarContainer = DOM.append(quotaItem, $('.quota-bar'));
        DOM.append(progressBarContainer, $('.quota-bit'));
    }
};
ChatUsageWidget = __decorate([
    __param(0, IChatEntitlementService)
], ChatUsageWidget);
export { ChatUsageWidget };
//# sourceMappingURL=chatUsageWidget.js.map