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
import { localize } from '../../../../nls.js';
import { createDecorator, IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { Memento } from '../../../common/memento.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { ASSIGNMENT_REFETCH_INTERVAL, ASSIGNMENT_STORAGE_KEY, AssignmentFilterProvider, TargetPopulation } from '../../../../platform/assignment/common/assignment.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { workbenchConfigurationNodeBase } from '../../../common/configuration.js';
import { Extensions as ConfigurationExtensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { getTelemetryLevel } from '../../../../platform/telemetry/common/telemetryUtils.js';
import { importAMDNodeModule } from '../../../../amdX.js';
import { timeout } from '../../../../base/common/async.js';
import { CopilotAssignmentFilterProvider } from './assignmentFilters.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { Emitter } from '../../../../base/common/event.js';
export const IWorkbenchAssignmentService = createDecorator('assignmentService');
class MementoKeyValueStorage {
    constructor(memento) {
        this.memento = memento;
        this.mementoObj = memento.getMemento(-1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
    }
    async getValue(key, defaultValue) {
        const value = await this.mementoObj[key];
        return value || defaultValue;
    }
    setValue(key, value) {
        this.mementoObj[key] = value;
        this.memento.saveMemento();
    }
}
class WorkbenchAssignmentServiceTelemetry extends Disposable {
    get assignmentContext() {
        return this._lastAssignmentContext?.split(';');
    }
    constructor(telemetryService, productService) {
        super();
        this.telemetryService = telemetryService;
        this.productService = productService;
        this._onDidUpdateAssignmentContext = this._register(new Emitter());
        this.onDidUpdateAssignmentContext = this._onDidUpdateAssignmentContext.event;
        this._assignmentFilters = [];
        this._assignmentFilterDisposables = this._register(new DisposableStore());
    }
    _filterAssignmentContext(assignmentContext) {
        const assignments = assignmentContext.split(';');
        const filteredAssignments = assignments.filter(assignment => {
            for (const filter of this._assignmentFilters) {
                if (filter.exclude(assignment)) {
                    return false;
                }
            }
            return true;
        });
        return filteredAssignments.join(';');
    }
    _setAssignmentContext(value) {
        const filteredValue = this._filterAssignmentContext(value);
        this._lastAssignmentContext = filteredValue;
        this._onDidUpdateAssignmentContext.fire();
        if (this.productService.tasConfig?.assignmentContextTelemetryPropertyName) {
            this.telemetryService.setExperimentProperty(this.productService.tasConfig.assignmentContextTelemetryPropertyName, filteredValue);
        }
    }
    addAssignmentFilter(filter) {
        this._assignmentFilters.push(filter);
        this._assignmentFilterDisposables.add(filter.onDidChange(() => {
            if (this._previousAssignmentContext) {
                this._setAssignmentContext(this._previousAssignmentContext);
            }
        }));
        if (this._previousAssignmentContext) {
            this._setAssignmentContext(this._previousAssignmentContext);
        }
    }
    // __GDPR__COMMON__ "abexp.assignmentcontext" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
    setSharedProperty(name, value) {
        if (name === this.productService.tasConfig?.assignmentContextTelemetryPropertyName) {
            this._previousAssignmentContext = value;
            return this._setAssignmentContext(value);
        }
        this.telemetryService.setExperimentProperty(name, value);
    }
    postEvent(eventName, props) {
        const data = {};
        for (const [key, value] of props.entries()) {
            data[key] = value;
        }
        /* __GDPR__
            "query-expfeature" : {
                "owner": "sbatten",
                "comment": "Logs queries to the experiment service by feature for metric calculations",
                "ABExp.queriedFeature": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The experimental feature being queried" }
            }
        */
        this.telemetryService.publicLog(eventName, data);
    }
}
let WorkbenchAssignmentService = class WorkbenchAssignmentService extends Disposable {
    constructor(telemetryService, storageService, configurationService, productService, environmentService, instantiationService) {
        super();
        this.telemetryService = telemetryService;
        this.configurationService = configurationService;
        this.productService = productService;
        this.instantiationService = instantiationService;
        this.tasSetupDisposables = new DisposableStore();
        this.networkInitialized = false;
        this._onDidRefetchAssignments = this._register(new Emitter());
        this.onDidRefetchAssignments = this._onDidRefetchAssignments.event;
        this.experimentsEnabled = getTelemetryLevel(configurationService) === 3 /* TelemetryLevel.USAGE */ &&
            !environmentService.disableExperiments &&
            !environmentService.extensionTestsLocationURI &&
            !environmentService.enableSmokeTestDriver &&
            configurationService.getValue('workbench.enableExperiments') === true;
        if (productService.tasConfig && this.experimentsEnabled) {
            this.tasClient = this.setupTASClient();
        }
        this.telemetry = this._register(new WorkbenchAssignmentServiceTelemetry(telemetryService, productService));
        this._register(this.telemetry.onDidUpdateAssignmentContext(() => this._onDidRefetchAssignments.fire()));
        this.keyValueStorage = new MementoKeyValueStorage(new Memento('experiment.service.memento', storageService));
        // For development purposes, configure the delay until tas local tas treatment ovverrides are available
        const overrideDelaySetting = configurationService.getValue('experiments.overrideDelay');
        const overrideDelay = typeof overrideDelaySetting === 'number' ? overrideDelaySetting : 0;
        this.overrideInitDelay = timeout(overrideDelay);
    }
    async getTreatment(name) {
        const result = await this.doGetTreatment(name);
        this.telemetryService.publicLog2('tasClientReadTreatmentComplete', {
            treatmentName: name,
            treatmentValue: JSON.stringify(result)
        });
        return result;
    }
    async doGetTreatment(name) {
        await this.overrideInitDelay; // For development purposes, allow overriding tas assignments to test variants locally.
        const override = this.configurationService.getValue(`experiments.override.${name}`);
        if (override !== undefined) {
            return override;
        }
        if (!this.tasClient) {
            return undefined;
        }
        if (!this.experimentsEnabled) {
            return undefined;
        }
        let result;
        const client = await this.tasClient;
        // The TAS client is initialized but we need to check if the initial fetch has completed yet
        // If it is complete, return a cached value for the treatment
        // If not, use the async call with `checkCache: true`. This will allow the module to return a cached value if it is present.
        // Otherwise it will await the initial fetch to return the most up to date value.
        if (this.networkInitialized) {
            result = client.getTreatmentVariable('vscode', name);
        }
        else {
            result = await client.getTreatmentVariableAsync('vscode', name, true);
        }
        result = client.getTreatmentVariable('vscode', name);
        return result;
    }
    async setupTASClient() {
        this.tasSetupDisposables.clear();
        const targetPopulation = this.productService.quality === 'stable' ?
            TargetPopulation.Public : (this.productService.quality === 'exploration' ?
            TargetPopulation.Exploration : TargetPopulation.Insiders);
        const filterProvider = new AssignmentFilterProvider(this.productService.version, this.productService.nameLong, this.telemetryService.machineId, this.telemetryService.devDeviceId, targetPopulation, this.productService.date ?? '');
        const extensionsFilterProvider = this.instantiationService.createInstance(CopilotAssignmentFilterProvider);
        this.tasSetupDisposables.add(extensionsFilterProvider);
        this.tasSetupDisposables.add(extensionsFilterProvider.onDidChangeFilters(() => this.refetchAssignments()));
        const tasConfig = this.productService.tasConfig;
        const tasClient = new (await importAMDNodeModule('tas-client', 'dist/tas-client.min.js')).ExperimentationService({
            filterProviders: [filterProvider, extensionsFilterProvider],
            telemetry: this.telemetry,
            storageKey: ASSIGNMENT_STORAGE_KEY,
            keyValueStorage: this.keyValueStorage,
            assignmentContextTelemetryPropertyName: tasConfig.assignmentContextTelemetryPropertyName,
            telemetryEventName: tasConfig.telemetryEventName,
            endpoint: tasConfig.endpoint,
            refetchInterval: ASSIGNMENT_REFETCH_INTERVAL,
        });
        await tasClient.initializePromise;
        tasClient.initialFetch.then(() => {
            this.networkInitialized = true;
        });
        return tasClient;
    }
    async refetchAssignments() {
        if (!this.tasClient) {
            return; // Setup has not started, assignments will use latest filters
        }
        // Await the client to be setup and the initial fetch to complete
        const tasClient = await this.tasClient;
        await tasClient.initialFetch;
        // Refresh the assignments
        await tasClient.getTreatmentVariableAsync('vscode', 'refresh', false);
    }
    async getCurrentExperiments() {
        if (!this.tasClient) {
            return undefined;
        }
        if (!this.experimentsEnabled) {
            return undefined;
        }
        await this.tasClient;
        return this.telemetry.assignmentContext;
    }
    addTelemetryAssignmentFilter(filter) {
        this.telemetry.addAssignmentFilter(filter);
    }
};
WorkbenchAssignmentService = __decorate([
    __param(0, ITelemetryService),
    __param(1, IStorageService),
    __param(2, IConfigurationService),
    __param(3, IProductService),
    __param(4, IWorkbenchEnvironmentService),
    __param(5, IInstantiationService)
], WorkbenchAssignmentService);
export { WorkbenchAssignmentService };
registerSingleton(IWorkbenchAssignmentService, WorkbenchAssignmentService, 1 /* InstantiationType.Delayed */);
const registry = Registry.as(ConfigurationExtensions.Configuration);
registry.registerConfiguration({
    ...workbenchConfigurationNodeBase,
    'properties': {
        'workbench.enableExperiments': {
            'type': 'boolean',
            'description': localize(15059, null),
            'default': true,
            'scope': 1 /* ConfigurationScope.APPLICATION */,
            'restricted': true,
            'tags': ['usesOnlineServices']
        }
    }
});
//# sourceMappingURL=assignmentService.js.map