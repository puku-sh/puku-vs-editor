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
import { basename } from '../../../../base/common/resources.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { VIEW_PANE_ID, ISCMService, ISCMViewService } from '../common/scm.js';
import { IActivityService, NumberBadge } from '../../../services/activity/common/activity.js';
import { IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { IStatusbarService } from '../../../services/statusbar/browser/statusbar.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { EditorResourceAccessor } from '../../../common/editor.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { ITitleService } from '../../../services/title/browser/titleService.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { getRepositoryResourceCount, getSCMRepositoryIcon, getStatusBarCommandGenericName } from './util.js';
import { autorun, derived, observableFromEvent } from '../../../../base/common/observable.js';
import { observableConfigValue } from '../../../../platform/observable/common/platformObservableUtils.js';
const ActiveRepositoryContextKeys = {
    ActiveRepositoryName: new RawContextKey('scmActiveRepositoryName', ''),
    ActiveRepositoryBranchName: new RawContextKey('scmActiveRepositoryBranchName', ''),
};
let SCMActiveRepositoryController = class SCMActiveRepositoryController extends Disposable {
    constructor(activityService, configurationService, contextKeyService, scmService, scmViewService, statusbarService, titleService) {
        super();
        this.activityService = activityService;
        this.configurationService = configurationService;
        this.contextKeyService = contextKeyService;
        this.scmService = scmService;
        this.scmViewService = scmViewService;
        this.statusbarService = statusbarService;
        this.titleService = titleService;
        this._activeRepositoryNameContextKey = ActiveRepositoryContextKeys.ActiveRepositoryName.bindTo(this.contextKeyService);
        this._activeRepositoryBranchNameContextKey = ActiveRepositoryContextKeys.ActiveRepositoryBranchName.bindTo(this.contextKeyService);
        this.titleService.registerVariables([
            { name: 'activeRepositoryName', contextKey: ActiveRepositoryContextKeys.ActiveRepositoryName.key },
            { name: 'activeRepositoryBranchName', contextKey: ActiveRepositoryContextKeys.ActiveRepositoryBranchName.key, }
        ]);
        this._countBadgeConfig = observableConfigValue('scm.countBadge', 'all', this.configurationService);
        this._repositories = observableFromEvent(this, Event.any(this.scmService.onDidAddRepository, this.scmService.onDidRemoveRepository), () => this.scmService.repositories);
        this._activeRepositoryHistoryItemRefName = derived(reader => {
            const activeRepository = this.scmViewService.activeRepository.read(reader);
            const historyProvider = activeRepository?.repository.provider.historyProvider.read(reader);
            const historyItemRef = historyProvider?.historyItemRef.read(reader);
            return historyItemRef?.name;
        });
        this._countBadgeRepositories = derived(this, reader => {
            switch (this._countBadgeConfig.read(reader)) {
                case 'all': {
                    const repositories = this._repositories.read(reader);
                    return [...Iterable.map(repositories, r => ({ provider: r.provider, resourceCount: this._getRepositoryResourceCount(r) }))];
                }
                case 'focused': {
                    const activeRepository = this.scmViewService.activeRepository.read(reader);
                    return activeRepository ? [{ provider: activeRepository.repository.provider, resourceCount: this._getRepositoryResourceCount(activeRepository.repository) }] : [];
                }
                case 'off':
                    return [];
                default:
                    throw new Error('Invalid countBadge setting');
            }
        });
        this._countBadge = derived(this, reader => {
            let total = 0;
            for (const repository of this._countBadgeRepositories.read(reader)) {
                const count = repository.provider.count?.read(reader);
                const resourceCount = repository.resourceCount.read(reader);
                total = total + (count ?? resourceCount);
            }
            return total;
        });
        this._register(autorun(reader => {
            const countBadge = this._countBadge.read(reader);
            this._updateActivityCountBadge(countBadge, reader.store);
        }));
        this._register(autorun(reader => {
            const activeRepository = this.scmViewService.activeRepository.read(reader);
            const commands = activeRepository?.repository.provider.statusBarCommands.read(reader);
            this._updateStatusBar(activeRepository, commands ?? [], reader.store);
        }));
        this._register(autorun(reader => {
            const activeRepository = this.scmViewService.activeRepository.read(reader);
            const historyItemRefName = this._activeRepositoryHistoryItemRefName.read(reader);
            this._updateActiveRepositoryContextKeys(activeRepository?.repository.provider.name, historyItemRefName);
        }));
    }
    _getRepositoryResourceCount(repository) {
        return observableFromEvent(this, repository.provider.onDidChangeResources, () => /** @description repositoryResourceCount */ getRepositoryResourceCount(repository.provider));
    }
    _updateActivityCountBadge(count, store) {
        if (count === 0) {
            return;
        }
        const badge = new NumberBadge(count, num => localize('scmPendingChangesBadge', '{0} pending changes', num));
        store.add(this.activityService.showViewActivity(VIEW_PANE_ID, { badge }));
    }
    _updateStatusBar(activeRepository, commands, store) {
        if (!activeRepository) {
            return;
        }
        const label = activeRepository.repository.provider.rootUri
            ? `${basename(activeRepository.repository.provider.rootUri)} (${activeRepository.repository.provider.label})`
            : activeRepository.repository.provider.label;
        for (let index = 0; index < commands.length; index++) {
            const command = commands[index];
            const tooltip = `${label}${command.tooltip ? ` - ${command.tooltip}` : ''}`;
            const genericCommandName = getStatusBarCommandGenericName(command);
            const statusbarEntry = {
                name: localize('status.scm', "Source Control") + (genericCommandName ? ` ${genericCommandName}` : ''),
                text: command.title,
                ariaLabel: tooltip,
                tooltip,
                command: command.id ? command : undefined
            };
            store.add(index === 0 ?
                this.statusbarService.addEntry(statusbarEntry, `status.scm.${index}`, 0 /* MainThreadStatusBarAlignment.LEFT */, 10000) :
                this.statusbarService.addEntry(statusbarEntry, `status.scm.${index}`, 0 /* MainThreadStatusBarAlignment.LEFT */, { location: { id: `status.scm.${index - 1}`, priority: 10000 }, alignment: 1 /* MainThreadStatusBarAlignment.RIGHT */, compact: true }));
        }
        // Source control provider status bar entry
        if (this.scmService.repositoryCount > 1) {
            const icon = getSCMRepositoryIcon(activeRepository, activeRepository.repository);
            const repositoryStatusbarEntry = {
                name: localize('status.scm.provider', "Source Control Provider"),
                text: `$(${icon.id}) ${activeRepository.repository.provider.name}`,
                ariaLabel: label,
                tooltip: label,
                command: 'scm.setActiveProvider'
            };
            store.add(this.statusbarService.addEntry(repositoryStatusbarEntry, 'status.scm.provider', 0 /* MainThreadStatusBarAlignment.LEFT */, { location: { id: `status.scm.0`, priority: 10000 }, alignment: 0 /* MainThreadStatusBarAlignment.LEFT */, compact: true }));
        }
    }
    _updateActiveRepositoryContextKeys(repositoryName, branchName) {
        this._activeRepositoryNameContextKey.set(repositoryName ?? '');
        this._activeRepositoryBranchNameContextKey.set(branchName ?? '');
    }
};
SCMActiveRepositoryController = __decorate([
    __param(0, IActivityService),
    __param(1, IConfigurationService),
    __param(2, IContextKeyService),
    __param(3, ISCMService),
    __param(4, ISCMViewService),
    __param(5, IStatusbarService),
    __param(6, ITitleService)
], SCMActiveRepositoryController);
export { SCMActiveRepositoryController };
let SCMActiveResourceContextKeyController = class SCMActiveResourceContextKeyController extends Disposable {
    constructor(editorGroupsService, scmService, uriIdentityService) {
        super();
        this.scmService = scmService;
        this.uriIdentityService = uriIdentityService;
        this._onDidRepositoryChange = new Emitter();
        const activeResourceHasChangesContextKey = new RawContextKey('scmActiveResourceHasChanges', false, localize('scmActiveResourceHasChanges', "Whether the active resource has changes"));
        const activeResourceRepositoryContextKey = new RawContextKey('scmActiveResourceRepository', undefined, localize('scmActiveResourceRepository', "The active resource's repository"));
        this._repositories = observableFromEvent(this, Event.any(this.scmService.onDidAddRepository, this.scmService.onDidRemoveRepository), () => this.scmService.repositories);
        this._register(autorun((reader) => {
            for (const repository of this._repositories.read(reader)) {
                reader.store.add(Event.runAndSubscribe(repository.provider.onDidChangeResources, () => {
                    this._onDidRepositoryChange.fire();
                }));
            }
        }));
        // Create context key providers which will update the context keys based on each groups active editor
        const hasChangesContextKeyProvider = {
            contextKey: activeResourceHasChangesContextKey,
            getGroupContextKeyValue: (group) => this._getEditorHasChanges(group.activeEditor),
            onDidChange: this._onDidRepositoryChange.event
        };
        const repositoryContextKeyProvider = {
            contextKey: activeResourceRepositoryContextKey,
            getGroupContextKeyValue: (group) => this._getEditorRepositoryId(group.activeEditor),
            onDidChange: this._onDidRepositoryChange.event
        };
        this._store.add(editorGroupsService.registerContextKeyProvider(hasChangesContextKeyProvider));
        this._store.add(editorGroupsService.registerContextKeyProvider(repositoryContextKeyProvider));
    }
    _getEditorHasChanges(activeEditor) {
        const activeResource = EditorResourceAccessor.getOriginalUri(activeEditor);
        if (!activeResource) {
            return false;
        }
        const activeResourceRepository = this.scmService.getRepository(activeResource);
        for (const resourceGroup of activeResourceRepository?.provider.groups ?? []) {
            if (resourceGroup.resources
                .some(scmResource => this.uriIdentityService.extUri.isEqual(activeResource, scmResource.sourceUri))) {
                return true;
            }
        }
        return false;
    }
    _getEditorRepositoryId(activeEditor) {
        const activeResource = EditorResourceAccessor.getOriginalUri(activeEditor);
        if (!activeResource) {
            return undefined;
        }
        const activeResourceRepository = this.scmService.getRepository(activeResource);
        return activeResourceRepository?.id;
    }
    dispose() {
        this._onDidRepositoryChange.dispose();
        super.dispose();
    }
};
SCMActiveResourceContextKeyController = __decorate([
    __param(0, IEditorGroupsService),
    __param(1, ISCMService),
    __param(2, IUriIdentityService)
], SCMActiveResourceContextKeyController);
export { SCMActiveResourceContextKeyController };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWN0aXZpdHkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL3BvcmlkaGkvZGV2ZWxvcG1lbnQvcHVrdS12cy1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zY20vYnJvd3Nlci9hY3Rpdml0eS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxVQUFVLEVBQW1CLE1BQU0sc0NBQXNDLENBQUM7QUFDbkYsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsWUFBWSxFQUFFLFdBQVcsRUFBa0IsZUFBZSxFQUFnQixNQUFNLGtCQUFrQixDQUFDO0FBQzVHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxXQUFXLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUU5RixPQUFPLEVBQWUsa0JBQWtCLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDdEgsT0FBTyxFQUFtQixpQkFBaUIsRUFBc0QsTUFBTSxrREFBa0QsQ0FBQztBQUMxSixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUNuRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUM3RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDL0QsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQ2hGLE9BQU8sRUFBa0Msb0JBQW9CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUU5SCxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsb0JBQW9CLEVBQUUsOEJBQThCLEVBQUUsTUFBTSxXQUFXLENBQUM7QUFDN0csT0FBTyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQWUsbUJBQW1CLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUMzRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxtRUFBbUUsQ0FBQztBQUcxRyxNQUFNLDJCQUEyQixHQUFHO0lBQ25DLG9CQUFvQixFQUFFLElBQUksYUFBYSxDQUFTLHlCQUF5QixFQUFFLEVBQUUsQ0FBQztJQUM5RSwwQkFBMEIsRUFBRSxJQUFJLGFBQWEsQ0FBUywrQkFBK0IsRUFBRSxFQUFFLENBQUM7Q0FDMUYsQ0FBQztBQUVLLElBQU0sNkJBQTZCLEdBQW5DLE1BQU0sNkJBQThCLFNBQVEsVUFBVTtJQVU1RCxZQUNvQyxlQUFpQyxFQUM1QixvQkFBMkMsRUFDOUMsaUJBQXFDLEVBQzVDLFVBQXVCLEVBQ25CLGNBQStCLEVBQzdCLGdCQUFtQyxFQUN2QyxZQUEyQjtRQUUzRCxLQUFLLEVBQUUsQ0FBQztRQVIyQixvQkFBZSxHQUFmLGVBQWUsQ0FBa0I7UUFDNUIseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUM5QyxzQkFBaUIsR0FBakIsaUJBQWlCLENBQW9CO1FBQzVDLGVBQVUsR0FBVixVQUFVLENBQWE7UUFDbkIsbUJBQWMsR0FBZCxjQUFjLENBQWlCO1FBQzdCLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBbUI7UUFDdkMsaUJBQVksR0FBWixZQUFZLENBQWU7UUFJM0QsSUFBSSxDQUFDLCtCQUErQixHQUFHLDJCQUEyQixDQUFDLG9CQUFvQixDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUN2SCxJQUFJLENBQUMscUNBQXFDLEdBQUcsMkJBQTJCLENBQUMsMEJBQTBCLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1FBRW5JLElBQUksQ0FBQyxZQUFZLENBQUMsaUJBQWlCLENBQUM7WUFDbkMsRUFBRSxJQUFJLEVBQUUsc0JBQXNCLEVBQUUsVUFBVSxFQUFFLDJCQUEyQixDQUFDLG9CQUFvQixDQUFDLEdBQUcsRUFBRTtZQUNsRyxFQUFFLElBQUksRUFBRSw0QkFBNEIsRUFBRSxVQUFVLEVBQUUsMkJBQTJCLENBQUMsMEJBQTBCLENBQUMsR0FBRyxHQUFHO1NBQy9HLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxpQkFBaUIsR0FBRyxxQkFBcUIsQ0FBNEIsZ0JBQWdCLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1FBRTlILElBQUksQ0FBQyxhQUFhLEdBQUcsbUJBQW1CLENBQUMsSUFBSSxFQUM1QyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsa0JBQWtCLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxxQkFBcUIsQ0FBQyxFQUNwRixHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBRXJDLElBQUksQ0FBQyxtQ0FBbUMsR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDM0QsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUMzRSxNQUFNLGVBQWUsR0FBRyxnQkFBZ0IsRUFBRSxVQUFVLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDM0YsTUFBTSxjQUFjLEdBQUcsZUFBZSxFQUFFLGNBQWMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFFcEUsT0FBTyxjQUFjLEVBQUUsSUFBSSxDQUFDO1FBQzdCLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLHVCQUF1QixHQUFHLE9BQU8sQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLEVBQUU7WUFDckQsUUFBUSxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7Z0JBQzdDLEtBQUssS0FBSyxDQUFDLENBQUMsQ0FBQztvQkFDWixNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztvQkFDckQsT0FBTyxDQUFDLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQyxRQUFRLEVBQUUsYUFBYSxFQUFFLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUM3SCxDQUFDO2dCQUNELEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQztvQkFDaEIsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztvQkFDM0UsT0FBTyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLFFBQVEsRUFBRSxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsUUFBUSxFQUFFLGFBQWEsRUFBRSxJQUFJLENBQUMsMkJBQTJCLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ25LLENBQUM7Z0JBQ0QsS0FBSyxLQUFLO29CQUNULE9BQU8sRUFBRSxDQUFDO2dCQUNYO29CQUNDLE1BQU0sSUFBSSxLQUFLLENBQUMsNEJBQTRCLENBQUMsQ0FBQztZQUNoRCxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsV0FBVyxHQUFHLE9BQU8sQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLEVBQUU7WUFDekMsSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFDO1lBRWQsS0FBSyxNQUFNLFVBQVUsSUFBSSxJQUFJLENBQUMsdUJBQXVCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7Z0JBQ3BFLE1BQU0sS0FBSyxHQUFHLFVBQVUsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDdEQsTUFBTSxhQUFhLEdBQUcsVUFBVSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBRTVELEtBQUssR0FBRyxLQUFLLEdBQUcsQ0FBQyxLQUFLLElBQUksYUFBYSxDQUFDLENBQUM7WUFDMUMsQ0FBQztZQUVELE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUMvQixNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNqRCxJQUFJLENBQUMseUJBQXlCLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUMxRCxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUosSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDL0IsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUMzRSxNQUFNLFFBQVEsR0FBRyxnQkFBZ0IsRUFBRSxVQUFVLENBQUMsUUFBUSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUV0RixJQUFJLENBQUMsZ0JBQWdCLENBQUMsZ0JBQWdCLEVBQUUsUUFBUSxJQUFJLEVBQUUsRUFBRSxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDdkUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVKLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQy9CLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDM0UsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLENBQUMsbUNBQW1DLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBRWpGLElBQUksQ0FBQyxrQ0FBa0MsQ0FBQyxnQkFBZ0IsRUFBRSxVQUFVLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1FBQ3pHLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRU8sMkJBQTJCLENBQUMsVUFBMEI7UUFDN0QsT0FBTyxtQkFBbUIsQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSxHQUFHLEVBQUUsQ0FBQywyQ0FBMkMsQ0FBQywwQkFBMEIsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztJQUMvSyxDQUFDO0lBRU8seUJBQXlCLENBQUMsS0FBYSxFQUFFLEtBQXNCO1FBQ3RFLElBQUksS0FBSyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ2pCLE9BQU87UUFDUixDQUFDO1FBRUQsTUFBTSxLQUFLLEdBQUcsSUFBSSxXQUFXLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLHdCQUF3QixFQUFFLHFCQUFxQixFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDNUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLGdCQUFnQixDQUFDLFlBQVksRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztJQUMzRSxDQUFDO0lBRU8sZ0JBQWdCLENBQUMsZ0JBQTZFLEVBQUUsUUFBNEIsRUFBRSxLQUFzQjtRQUMzSixJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUN2QixPQUFPO1FBQ1IsQ0FBQztRQUVELE1BQU0sS0FBSyxHQUFHLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsT0FBTztZQUN6RCxDQUFDLENBQUMsR0FBRyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsS0FBSyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLEtBQUssR0FBRztZQUM3RyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUM7UUFFOUMsS0FBSyxJQUFJLEtBQUssR0FBRyxDQUFDLEVBQUUsS0FBSyxHQUFHLFFBQVEsQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FBQztZQUN0RCxNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDaEMsTUFBTSxPQUFPLEdBQUcsR0FBRyxLQUFLLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQzVFLE1BQU0sa0JBQWtCLEdBQUcsOEJBQThCLENBQUMsT0FBTyxDQUFDLENBQUM7WUFFbkUsTUFBTSxjQUFjLEdBQW9CO2dCQUN2QyxJQUFJLEVBQUUsUUFBUSxDQUFDLFlBQVksRUFBRSxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLElBQUksa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUNyRyxJQUFJLEVBQUUsT0FBTyxDQUFDLEtBQUs7Z0JBQ25CLFNBQVMsRUFBRSxPQUFPO2dCQUNsQixPQUFPO2dCQUNQLE9BQU8sRUFBRSxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFNBQVM7YUFDekMsQ0FBQztZQUVGLEtBQUssQ0FBQyxHQUFHLENBQUMsS0FBSyxLQUFLLENBQUMsQ0FBQyxDQUFDO2dCQUN0QixJQUFJLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLGNBQWMsRUFBRSxjQUFjLEtBQUssRUFBRSw2Q0FBcUMsS0FBSyxDQUFDLENBQUMsQ0FBQztnQkFDakgsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxjQUFjLEVBQUUsY0FBYyxLQUFLLEVBQUUsNkNBQXFDLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxFQUFFLGNBQWMsS0FBSyxHQUFHLENBQUMsRUFBRSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsRUFBRSxTQUFTLDRDQUFvQyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUN4TyxDQUFDO1FBQ0gsQ0FBQztRQUVELDJDQUEyQztRQUMzQyxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsZUFBZSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3pDLE1BQU0sSUFBSSxHQUFHLG9CQUFvQixDQUFDLGdCQUFnQixFQUFFLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ2pGLE1BQU0sd0JBQXdCLEdBQW9CO2dCQUNqRCxJQUFJLEVBQUUsUUFBUSxDQUFDLHFCQUFxQixFQUFFLHlCQUF5QixDQUFDO2dCQUNoRSxJQUFJLEVBQUUsS0FBSyxJQUFJLENBQUMsRUFBRSxLQUFLLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFO2dCQUNsRSxTQUFTLEVBQUUsS0FBSztnQkFDaEIsT0FBTyxFQUFFLEtBQUs7Z0JBQ2QsT0FBTyxFQUFFLHVCQUF1QjthQUNoQyxDQUFDO1lBRUYsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLHdCQUF3QixFQUFFLHFCQUFxQiw2Q0FBcUMsRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLEVBQUUsY0FBYyxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsRUFBRSxTQUFTLDJDQUFtQyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDblAsQ0FBQztJQUNGLENBQUM7SUFFTyxrQ0FBa0MsQ0FBQyxjQUFrQyxFQUFFLFVBQThCO1FBQzVHLElBQUksQ0FBQywrQkFBK0IsQ0FBQyxHQUFHLENBQUMsY0FBYyxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQy9ELElBQUksQ0FBQyxxQ0FBcUMsQ0FBQyxHQUFHLENBQUMsVUFBVSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBQ2xFLENBQUM7Q0FDRCxDQUFBO0FBekpZLDZCQUE2QjtJQVd2QyxXQUFBLGdCQUFnQixDQUFBO0lBQ2hCLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLFdBQVcsQ0FBQTtJQUNYLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSxpQkFBaUIsQ0FBQTtJQUNqQixXQUFBLGFBQWEsQ0FBQTtHQWpCSCw2QkFBNkIsQ0F5SnpDOztBQUVNLElBQU0scUNBQXFDLEdBQTNDLE1BQU0scUNBQXNDLFNBQVEsVUFBVTtJQUtwRSxZQUN1QixtQkFBeUMsRUFDbEQsVUFBd0MsRUFDaEMsa0JBQXdEO1FBRTdFLEtBQUssRUFBRSxDQUFDO1FBSHNCLGVBQVUsR0FBVixVQUFVLENBQWE7UUFDZix1QkFBa0IsR0FBbEIsa0JBQWtCLENBQXFCO1FBTDdELDJCQUFzQixHQUFHLElBQUksT0FBTyxFQUFRLENBQUM7UUFTN0QsTUFBTSxrQ0FBa0MsR0FBRyxJQUFJLGFBQWEsQ0FBVSw2QkFBNkIsRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDLDZCQUE2QixFQUFFLHlDQUF5QyxDQUFDLENBQUMsQ0FBQztRQUNoTSxNQUFNLGtDQUFrQyxHQUFHLElBQUksYUFBYSxDQUFxQiw2QkFBNkIsRUFBRSxTQUFTLEVBQUUsUUFBUSxDQUFDLDZCQUE2QixFQUFFLGtDQUFrQyxDQUFDLENBQUMsQ0FBQztRQUV4TSxJQUFJLENBQUMsYUFBYSxHQUFHLG1CQUFtQixDQUFDLElBQUksRUFDNUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLGtCQUFrQixFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMscUJBQXFCLENBQUMsRUFDcEYsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUVyQyxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFO1lBQ2pDLEtBQUssTUFBTSxVQUFVLElBQUksSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztnQkFDMUQsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLG9CQUFvQixFQUFFLEdBQUcsRUFBRTtvQkFDckYsSUFBSSxDQUFDLHNCQUFzQixDQUFDLElBQUksRUFBRSxDQUFDO2dCQUNwQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ0wsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSixxR0FBcUc7UUFDckcsTUFBTSw0QkFBNEIsR0FBNEM7WUFDN0UsVUFBVSxFQUFFLGtDQUFrQztZQUM5Qyx1QkFBdUIsRUFBRSxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUM7WUFDakYsV0FBVyxFQUFFLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLO1NBQzlDLENBQUM7UUFFRixNQUFNLDRCQUE0QixHQUF1RDtZQUN4RixVQUFVLEVBQUUsa0NBQWtDO1lBQzlDLHVCQUF1QixFQUFFLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQztZQUNuRixXQUFXLEVBQUUsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEtBQUs7U0FDOUMsQ0FBQztRQUVGLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLDBCQUEwQixDQUFDLDRCQUE0QixDQUFDLENBQUMsQ0FBQztRQUM5RixJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQywwQkFBMEIsQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDLENBQUM7SUFDL0YsQ0FBQztJQUVPLG9CQUFvQixDQUFDLFlBQWdDO1FBQzVELE1BQU0sY0FBYyxHQUFHLHNCQUFzQixDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUMzRSxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDckIsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO1FBRUQsTUFBTSx3QkFBd0IsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUMvRSxLQUFLLE1BQU0sYUFBYSxJQUFJLHdCQUF3QixFQUFFLFFBQVEsQ0FBQyxNQUFNLElBQUksRUFBRSxFQUFFLENBQUM7WUFDN0UsSUFBSSxhQUFhLENBQUMsU0FBUztpQkFDekIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQ25CLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUNsRixPQUFPLElBQUksQ0FBQztZQUNiLENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBRU8sc0JBQXNCLENBQUMsWUFBZ0M7UUFDOUQsTUFBTSxjQUFjLEdBQUcsc0JBQXNCLENBQUMsY0FBYyxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQzNFLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUNyQixPQUFPLFNBQVMsQ0FBQztRQUNsQixDQUFDO1FBRUQsTUFBTSx3QkFBd0IsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUMvRSxPQUFPLHdCQUF3QixFQUFFLEVBQUUsQ0FBQztJQUNyQyxDQUFDO0lBRVEsT0FBTztRQUNmLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUN0QyxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDakIsQ0FBQztDQUNELENBQUE7QUE1RVkscUNBQXFDO0lBTS9DLFdBQUEsb0JBQW9CLENBQUE7SUFDcEIsV0FBQSxXQUFXLENBQUE7SUFDWCxXQUFBLG1CQUFtQixDQUFBO0dBUlQscUNBQXFDLENBNEVqRCJ9