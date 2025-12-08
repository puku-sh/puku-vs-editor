"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelPickerManager = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const vscode_1 = require("vscode");
const instantiation_1 = require("../../../../../util/vs/platform/instantiation/common/instantiation");
const config_1 = require("../../lib/src/config");
const constants_1 = require("../../lib/src/constants");
const asyncCompletions_1 = require("../../lib/src/ghostText/asyncCompletions");
const completionsCache_1 = require("../../lib/src/ghostText/completionsCache");
const logger_1 = require("../../lib/src/logger");
const model_1 = require("../../lib/src/openai/model");
const telemetry_1 = require("../../lib/src/telemetry");
const logger = new logger_1.Logger('modelPicker');
// Separator and learn-more links are always shown in the quick pick
const defaultModelPickerItems = [
    // Add separator after the models
    {
        label: '',
        kind: vscode_1.QuickPickItemKind.Separator,
        modelId: 'separator',
        type: 'separator',
        alwaysShow: true,
    },
    // Add "Learn more" item at the end
    {
        modelId: 'learn-more',
        label: 'Learn more $(link-external)',
        description: '',
        alwaysShow: true,
        type: 'learn-more',
    },
];
let ModelPickerManager = class ModelPickerManager {
    get models() {
        return this._modelManager.getGenericCompletionModels();
    }
    getDefaultModelId() {
        return this._modelManager.getDefaultModelId();
    }
    constructor(_instantiationService, _asyncCompletionManager, _modelManager, _logTarget, _completionsCache) {
        this._instantiationService = _instantiationService;
        this._asyncCompletionManager = _asyncCompletionManager;
        this._modelManager = _modelManager;
        this._logTarget = _logTarget;
        this._completionsCache = _completionsCache;
        // URL for information about Copilot models
        this.MODELS_INFO_URL = 'https://aka.ms/CopilotCompletionsModelPickerLearnMore';
    }
    async setUserSelectedCompletionModel(modelId) {
        return vscode_1.workspace
            .getConfiguration(constants_1.CopilotConfigPrefix)
            .update(config_1.ConfigKey.UserSelectedCompletionModel, modelId ?? '', true);
    }
    async handleModelSelection(quickpickList) {
        const model = quickpickList.activeItems[0];
        if (model === undefined) {
            return;
        }
        quickpickList.hide();
        // Open up the link
        if (model.type === 'learn-more') {
            await vscode_1.env.openExternal(vscode_1.Uri.parse(this.MODELS_INFO_URL));
            this._instantiationService.invokeFunction(telemetry_1.telemetry, 'modelPicker.learnMoreClicked');
            return;
        }
        await this.selectModel(model);
    }
    async selectModel(model) {
        const currentModel = this._instantiationService.invokeFunction(getUserSelectedModelConfiguration);
        if (currentModel !== model.modelId) {
            this._completionsCache.clear();
            this._asyncCompletionManager.clear();
        }
        const modelSelection = model.modelId === this.getDefaultModelId() ? null : model.modelId;
        await this.setUserSelectedCompletionModel(modelSelection);
        if (modelSelection === null) {
            logger.info(this._logTarget, `User selected default model; setting null`);
        }
        else {
            logger.info(this._logTarget, `Selected model: ${model.modelId}`);
        }
        this._instantiationService.invokeFunction(telemetry_1.telemetry, 'modelPicker.modelSelected', telemetry_1.TelemetryData.createAndMarkAsIssued({
            engineName: modelSelection ?? 'default',
        }));
    }
    modelsForModelPicker() {
        const currentModelSelection = this._instantiationService.invokeFunction(getUserSelectedModelConfiguration);
        const items = this.models.map(model => {
            return {
                modelId: model.modelId,
                label: `${model.label}${model.preview ? ' (Preview)' : ''}`,
                description: `(${model.modelId})`,
                alwaysShow: model.modelId === this.getDefaultModelId(),
                type: 'model',
            };
        });
        return [currentModelSelection, items];
    }
    showModelPicker() {
        const [currentModelSelection, items] = this.modelsForModelPicker();
        const quickPick = vscode_1.window.createQuickPick();
        quickPick.title = 'Change Completions Model';
        quickPick.items = [...items, ...defaultModelPickerItems];
        quickPick.onDidAccept(() => this.handleModelSelection(quickPick));
        const currentModelOrDefault = currentModelSelection ?? this.getDefaultModelId();
        // set the currently selected model as active
        const selectedItem = quickPick.items.find(item => item.modelId === currentModelOrDefault);
        if (selectedItem) {
            quickPick.activeItems = [selectedItem];
        }
        quickPick.show();
        return quickPick;
    }
};
exports.ModelPickerManager = ModelPickerManager;
exports.ModelPickerManager = ModelPickerManager = __decorate([
    __param(0, instantiation_1.IInstantiationService),
    __param(1, asyncCompletions_1.ICompletionsAsyncManagerService),
    __param(2, model_1.ICompletionsModelManagerService),
    __param(3, logger_1.ICompletionsLogTargetService),
    __param(4, completionsCache_1.ICompletionsCacheService)
], ModelPickerManager);
function getUserSelectedModelConfiguration(accessor) {
    const value = (0, config_1.getConfig)(accessor, config_1.ConfigKey.UserSelectedCompletionModel);
    return typeof value === 'string' && value.length > 0 ? value : null;
}
//# sourceMappingURL=modelPicker.js.map