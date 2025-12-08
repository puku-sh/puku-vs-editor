"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SurveyService = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const vscode = __importStar(require("vscode"));
const vscode_1 = require("vscode");
const vscodeTypes_1 = require("../../../vscodeTypes");
const authentication_1 = require("../../authentication/common/authentication");
const envService_1 = require("../../env/common/envService");
const extensionContext_1 = require("../../extContext/common/extensionContext");
const nullExperimentationService_1 = require("../../telemetry/common/nullExperimentationService");
const telemetry_1 = require("../../telemetry/common/telemetry");
const SURVEY_URI = 'https://aka.ms/vscode-gh-copilot';
const USAGE_DATA_KEY = 'survey.usage';
const NEXT_SURVEY_DATE_KEY = 'survey.nextSurveyDate';
const DAYS_14 = 14 * 24 * 60 * 60 * 1000;
const DAYS_LATER = 7;
const DAYS_COOLDOWN = 90;
const DEBOUNCE_TIME = 3 * 60 * 1000;
const INACTIVE_TIMEOUT = 5 * 60 * 1000;
const MIN_DAYS_USED = 2;
const DEFAULT_SESSION_PROBABILITY = 2;
const DEFAULT_NOTIFICATION_PROBABILITY = 20;
const DEFAULT_SESSION_PROBABILITY_INACTIVE = 1;
let SurveyService = class SurveyService {
    constructor(telemetryService, vscodeExtensionContext, envService, experimentationService, authenticationService) {
        this.telemetryService = telemetryService;
        this.vscodeExtensionContext = vscodeExtensionContext;
        this.envService = envService;
        this.experimentationService = experimentationService;
        this.authenticationService = authenticationService;
        this.debounceTimeout = null;
        this.lastSource = null;
        this.lastLanguageId = null;
        this.surveyUri = vscodeTypes_1.Uri.parse(SURVEY_URI);
        this.sessionSeed = Math.random();
        // Inactive survey check only runs once
        setTimeout(async () => {
            await this.updateUsageData(false);
            const eligible = await this.checkInactiveUserHeuristic();
            if (eligible) {
                this.promptSurvey('churn');
            }
        }, INACTIVE_TIMEOUT);
    }
    async signalUsage(source, languageId) {
        await this.updateUsageData(true);
        this.lastSource = source;
        if (languageId) {
            this.lastLanguageId = languageId;
        }
        if (!this.debounceTimeout) {
            this.debounceTimeout = setTimeout(async () => {
                const eligible = await this.checkEligibility();
                if (eligible) {
                    this.promptSurvey('usage');
                }
                this.debounceTimeout = null;
            }, DEBOUNCE_TIME);
        }
    }
    async checkInactiveUserHeuristic() {
        const usageData = await this.getUsageData();
        const nextSurveyDate = await this.getNextSurveyDate();
        const now = Date.now();
        const daysUsedInLast14Days = usageData.activeDays.length;
        const isOldEnough = usageData.firstActive > 0 && usageData.firstActive < now - DAYS_14;
        const isCooldownOver = !nextSurveyDate || nextSurveyDate < now;
        const hasNotBeenActiveInLast14Days = daysUsedInLast14Days === 0;
        const isEligible = hasNotBeenActiveInLast14Days && isOldEnough && isCooldownOver;
        if (isEligible) {
            const sessionProbability = this.experimentationService.getTreatmentVariable('copilotchat.feedback.sessionProbability.inactive') ?? DEFAULT_SESSION_PROBABILITY_INACTIVE;
            return (this.sessionSeed < sessionProbability / 100);
        }
        return false;
    }
    async checkEligibility() {
        const usageData = await this.getUsageData();
        const nextSurveyDate = await this.getNextSurveyDate();
        const now = Date.now();
        const daysUsedInLast14Days = usageData.activeDays.length;
        const isOldEnough = usageData.firstActive < now - DAYS_14;
        const isCooldownOver = !nextSurveyDate || nextSurveyDate < now;
        const hasEnoughUsage = daysUsedInLast14Days >= MIN_DAYS_USED;
        const isEligible = hasEnoughUsage && isOldEnough && isCooldownOver;
        if (isEligible) {
            const sessionProbability = this.experimentationService.getTreatmentVariable('copilotchat.feedback.sessionProbability') ?? DEFAULT_SESSION_PROBABILITY;
            if (this.sessionSeed < sessionProbability / 100) {
                const notificationProbability = this.experimentationService.getTreatmentVariable('copilotchat.feedback.notificationProbability') ?? DEFAULT_NOTIFICATION_PROBABILITY;
                const seed = Math.random();
                return seed < notificationProbability / 100;
            }
        }
        return false;
    }
    async getUsageData() {
        const usageData = this.vscodeExtensionContext.globalState.get(USAGE_DATA_KEY);
        if (usageData) {
            return usageData;
        }
        return { firstActive: 0, activeDays: [] };
    }
    async getNextSurveyDate() {
        return this.vscodeExtensionContext.globalState.get(NEXT_SURVEY_DATE_KEY) ?? null;
    }
    async updateUsageData(wasActive) {
        const usageData = await this.getUsageData();
        const now = Date.now();
        if (wasActive) {
            // Set firstActive if not already set
            if (!usageData.firstActive) {
                usageData.firstActive = now;
            }
            const today = new Date().setHours(0, 0, 0, 0);
            // Add today's timestamp if not already present
            if (!usageData.activeDays.includes(today)) {
                usageData.activeDays.push(today);
            }
        }
        // Prune timestamps older than 14 days
        usageData.activeDays = usageData.activeDays.filter(timestamp => timestamp >= now - DAYS_14);
        await this.vscodeExtensionContext.globalState.update(USAGE_DATA_KEY, usageData);
    }
    async updateNextSurveyDate(days) {
        await this.vscodeExtensionContext.globalState.update(NEXT_SURVEY_DATE_KEY, Date.now() + days * 24 * 60 * 60 * 1000);
    }
    async promptSurvey(surveyType) {
        const usage = await this.getUsageData();
        const source = this.lastSource || '';
        const language = this.lastLanguageId || '';
        const firstSeenInDays = Math.floor((Date.now() - usage.firstActive) / (1000 * 60 * 60 * 24));
        /* __GDPR__
            "survey.show" : {
                "owner": "digitarald",
                "comment": "Measures survey notification result",
                "source": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The last used feature before the survey." },
                "language": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The last used editor language before the survey." },
                "activeDays": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "The number of days the user has used the extension." },
                "firstActive": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "The number of days since the user first used the extension." },
                "surveyType": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The type of survey being prompted." }
            }
        */
        this.telemetryService.sendMSFTTelemetryEvent('survey.show', {
            source,
            language,
            surveyType
        }, {
            activeDays: usage.activeDays.length,
            firstActive: firstSeenInDays,
        });
        await this.updateNextSurveyDate(DAYS_COOLDOWN);
        const confirmation = vscode_1.l10n.t('Give Feedback');
        const later = vscode_1.l10n.t('Later');
        const skip = vscode_1.l10n.t('Skip');
        vscode.window.showInformationMessage(vscode_1.l10n.t('Got a minute? Help us make GitHub Copilot better.'), confirmation, later, skip).then(async (selection) => {
            const accepted = selection === confirmation;
            const postponed = selection === later;
            /* __GDPR__
                "survey.action" : {
                    "owner": "digitarald",
                    "comment": "Measures survey notification result",
                    "source": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The source of the survey prompt." },
                    "language": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The last used editor language before the survey." },
                    "selection": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The user's selection." },
                    "surveyType": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The type of survey being prompted." }
                }
            */
            this.telemetryService.sendMSFTTelemetryEvent('survey.action', {
                source,
                language,
                selection: accepted ? 'accepted' : postponed ? 'postponed' : 'skipped',
                surveyType
            });
            if (accepted) {
                const copilotToken = await this.authenticationService.getCopilotToken();
                const params = {
                    m: this.envService.machineId,
                    s: this.envService.sessionId,
                    k: copilotToken.sku ?? '',
                    d: usage.activeDays.length.toString(),
                    f: firstSeenInDays.toString(),
                    v: this.envService.getVersion(),
                    l: language,
                    src: source,
                    type: surveyType
                };
                const surveyUriWithParams = this.surveyUri.with({
                    query: new URLSearchParams(params).toString(),
                });
                vscode.env.openExternal(surveyUriWithParams);
            }
            else if (postponed) {
                await this.updateNextSurveyDate(DAYS_LATER);
            }
        });
    }
};
exports.SurveyService = SurveyService;
exports.SurveyService = SurveyService = __decorate([
    __param(0, telemetry_1.ITelemetryService),
    __param(1, extensionContext_1.IVSCodeExtensionContext),
    __param(2, envService_1.IEnvService),
    __param(3, nullExperimentationService_1.IExperimentationService),
    __param(4, authentication_1.IAuthenticationService)
], SurveyService);
//# sourceMappingURL=surveyServiceImpl.js.map