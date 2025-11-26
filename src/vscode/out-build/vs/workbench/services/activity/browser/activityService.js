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
import { IActivityService } from '../common/activity.js';
import { Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { GLOBAL_ACTIVITY_ID, ACCOUNTS_ACTIVITY_ID } from '../../../common/activity.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
let ViewContainerActivityByView = class ViewContainerActivityByView extends Disposable {
    constructor(viewId, viewDescriptorService, activityService) {
        super();
        this.viewId = viewId;
        this.viewDescriptorService = viewDescriptorService;
        this.activityService = activityService;
        this.activity = undefined;
        this.activityDisposable = Disposable.None;
        this._register(Event.filter(this.viewDescriptorService.onDidChangeContainer, e => e.views.some(view => view.id === viewId))(() => this.update()));
        this._register(Event.filter(this.viewDescriptorService.onDidChangeLocation, e => e.views.some(view => view.id === viewId))(() => this.update()));
    }
    setActivity(activity) {
        this.activity = activity;
        this.update();
    }
    clearActivity() {
        this.activity = undefined;
        this.update();
    }
    update() {
        this.activityDisposable.dispose();
        const container = this.viewDescriptorService.getViewContainerByViewId(this.viewId);
        if (container && this.activity) {
            this.activityDisposable = this.activityService.showViewContainerActivity(container.id, this.activity);
        }
    }
    dispose() {
        this.activityDisposable.dispose();
        super.dispose();
    }
};
ViewContainerActivityByView = __decorate([
    __param(1, IViewDescriptorService),
    __param(2, IActivityService)
], ViewContainerActivityByView);
let ActivityService = class ActivityService extends Disposable {
    constructor(viewDescriptorService, instantiationService) {
        super();
        this.viewDescriptorService = viewDescriptorService;
        this.instantiationService = instantiationService;
        this.viewActivities = new Map();
        this._onDidChangeActivity = this._register(new Emitter());
        this.onDidChangeActivity = this._onDidChangeActivity.event;
        this.viewContainerActivities = new Map();
        this.globalActivities = new Map();
    }
    showViewContainerActivity(viewContainerId, activity) {
        const viewContainer = this.viewDescriptorService.getViewContainerById(viewContainerId);
        if (!viewContainer) {
            return Disposable.None;
        }
        let activities = this.viewContainerActivities.get(viewContainerId);
        if (!activities) {
            activities = [];
            this.viewContainerActivities.set(viewContainerId, activities);
        }
        // add activity
        activities.push(activity);
        this._onDidChangeActivity.fire(viewContainer);
        return toDisposable(() => {
            activities.splice(activities.indexOf(activity), 1);
            if (activities.length === 0) {
                this.viewContainerActivities.delete(viewContainerId);
            }
            this._onDidChangeActivity.fire(viewContainer);
        });
    }
    getViewContainerActivities(viewContainerId) {
        const viewContainer = this.viewDescriptorService.getViewContainerById(viewContainerId);
        if (viewContainer) {
            return this.viewContainerActivities.get(viewContainerId) ?? [];
        }
        return [];
    }
    showViewActivity(viewId, activity) {
        let maybeItem = this.viewActivities.get(viewId);
        if (maybeItem) {
            maybeItem.id++;
        }
        else {
            maybeItem = {
                id: 1,
                activity: this.instantiationService.createInstance(ViewContainerActivityByView, viewId)
            };
            this.viewActivities.set(viewId, maybeItem);
        }
        const id = maybeItem.id;
        maybeItem.activity.setActivity(activity);
        const item = maybeItem;
        return toDisposable(() => {
            if (item.id === id) {
                item.activity.dispose();
                this.viewActivities.delete(viewId);
            }
        });
    }
    showAccountsActivity(activity) {
        return this.showActivity(ACCOUNTS_ACTIVITY_ID, activity);
    }
    showGlobalActivity(activity) {
        return this.showActivity(GLOBAL_ACTIVITY_ID, activity);
    }
    getActivity(id) {
        return this.globalActivities.get(id) ?? [];
    }
    showActivity(id, activity) {
        let activities = this.globalActivities.get(id);
        if (!activities) {
            activities = [];
            this.globalActivities.set(id, activities);
        }
        activities.push(activity);
        this._onDidChangeActivity.fire(id);
        return toDisposable(() => {
            activities.splice(activities.indexOf(activity), 1);
            if (activities.length === 0) {
                this.globalActivities.delete(id);
            }
            this._onDidChangeActivity.fire(id);
        });
    }
};
ActivityService = __decorate([
    __param(0, IViewDescriptorService),
    __param(1, IInstantiationService)
], ActivityService);
export { ActivityService };
registerSingleton(IActivityService, ActivityService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=activityService.js.map