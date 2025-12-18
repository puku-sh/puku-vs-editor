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
var AgentSessionRenderer_1;
import './media/agentsessionsviewer.css';
import { h } from '../../../../../base/browser/dom.js';
import { localize } from '../../../../../nls.js';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { isAgentSession, isAgentSessionsViewModel } from './agentSessionViewModel.js';
import { IconLabel } from '../../../../../base/browser/ui/iconLabel/iconLabel.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { fromNow, getDurationString } from '../../../../../base/common/date.js';
import { createMatches } from '../../../../../base/common/filters.js';
import { IMarkdownRendererService } from '../../../../../platform/markdown/browser/markdownRenderer.js';
import { allowedChatMarkdownHtmlTags } from '../chatContentMarkdownRenderer.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { coalesce } from '../../../../../base/common/arrays.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { fillEditorsDragData } from '../../../../browser/dnd.js';
import { IWorkbenchLayoutService } from '../../../../services/layout/browser/layoutService.js';
import { IViewDescriptorService } from '../../../../common/views.js';
import { IHoverService } from '../../../../../platform/hover/browser/hover.js';
import { AGENT_SESSIONS_VIEW_ID } from './agentSessions.js';
import { IntervalTimer } from '../../../../../base/common/async.js';
import { ActionBar } from '../../../../../base/browser/ui/actionbar/actionbar.js';
import { AgentSessionDiffActionViewItem, AgentSessionShowDiffAction } from './agentSessionsActions.js';
let AgentSessionRenderer = class AgentSessionRenderer {
    static { AgentSessionRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'agent-session'; }
    constructor(markdownRendererService, productService, layoutService, viewDescriptorService, hoverService, instantiationService) {
        this.markdownRendererService = markdownRendererService;
        this.productService = productService;
        this.layoutService = layoutService;
        this.viewDescriptorService = viewDescriptorService;
        this.hoverService = hoverService;
        this.instantiationService = instantiationService;
        this.templateId = AgentSessionRenderer_1.TEMPLATE_ID;
    }
    renderTemplate(container) {
        const disposables = new DisposableStore();
        const elementDisposable = disposables.add(new DisposableStore());
        const elements = h('div.agent-session-item@item', [
            h('div.agent-session-icon-col', [
                h('div.agent-session-icon@icon')
            ]),
            h('div.agent-session-main-col', [
                h('div.agent-session-title-row', [
                    h('div.agent-session-title@title'),
                ]),
                h('div.agent-session-details-row', [
                    h('div.agent-session-toolbar@toolbar'),
                    h('div.agent-session-description@description'),
                    h('div.agent-session-status@status')
                ])
            ])
        ]);
        container.appendChild(elements.item);
        const toolbar = disposables.add(new ActionBar(elements.toolbar, {
            actionViewItemProvider: (action, options) => {
                if (action.id === AgentSessionShowDiffAction.ID) {
                    return this.instantiationService.createInstance(AgentSessionDiffActionViewItem, action, options);
                }
                return undefined;
            },
        }));
        return {
            element: elements.item,
            icon: elements.icon,
            title: disposables.add(new IconLabel(elements.title, { supportHighlights: true, supportIcons: true })),
            toolbar,
            description: elements.description,
            status: elements.status,
            elementDisposable,
            disposables
        };
    }
    renderElement(session, index, template, details) {
        // Clear old state
        template.elementDisposable.clear();
        template.toolbar.clear();
        template.description.textContent = '';
        // Icon
        template.icon.className = `agent-session-icon ${ThemeIcon.asClassName(this.getIcon(session.element))}`;
        // Title
        template.title.setLabel(session.element.label, undefined, { matches: createMatches(session.filterData) });
        // Diff if provided and finished
        const { statistics: diff } = session.element;
        if (session.element.status !== 2 /* ChatSessionStatus.InProgress */ && diff && (diff.files > 0 || diff.insertions > 0 || diff.deletions > 0)) {
            const diffAction = template.elementDisposable.add(new AgentSessionShowDiffAction(session.element));
            template.toolbar.push([diffAction], { icon: false, label: true });
        }
        // Description otherwise
        else {
            this.renderDescription(session, template);
        }
        // Status
        this.renderStatus(session, template);
        // Hover
        this.renderHover(session, template);
    }
    getIcon(session) {
        if (session.status === 2 /* ChatSessionStatus.InProgress */) {
            return ThemeIcon.modify(Codicon.loading, 'spin');
        }
        if (session.status === 0 /* ChatSessionStatus.Failed */) {
            return Codicon.error;
        }
        return session.icon;
    }
    renderDescription(session, template) {
        // In progress: show duration
        if (session.element.status === 2 /* ChatSessionStatus.InProgress */) {
            template.description.textContent = this.getInProgressDescription(session.element);
            const timer = template.elementDisposable.add(new IntervalTimer());
            timer.cancelAndSet(() => template.description.textContent = this.getInProgressDescription(session.element), 1000 /* every second */);
        }
        // Otherwise support description as string
        else if (typeof session.element.description === 'string') {
            template.description.textContent = session.element.description;
        }
        // or as markdown
        else if (session.element.description) {
            template.elementDisposable.add(this.markdownRendererService.render(session.element.description, {
                sanitizerConfig: {
                    replaceWithPlaintext: true,
                    allowedTags: {
                        override: allowedChatMarkdownHtmlTags,
                    },
                    allowedLinkSchemes: { augment: [this.productService.urlProtocol] }
                },
            }, template.description));
        }
        // Fallback to state label
        else {
            if (session.element.timing.finishedOrFailedTime &&
                session.element.timing.inProgressTime &&
                session.element.timing.finishedOrFailedTime > session.element.timing.inProgressTime) {
                const duration = this.toDuration(session.element.timing.inProgressTime, session.element.timing.finishedOrFailedTime);
                template.description.textContent = session.element.status === 0 /* ChatSessionStatus.Failed */ ?
                    localize('chat.session.status.failedAfter', "Failed after {0}.", duration ?? '1s') :
                    localize('chat.session.status.completedAfter', "Finished in {0}.", duration ?? '1s');
            }
            else {
                template.description.textContent = session.element.status === 0 /* ChatSessionStatus.Failed */ ?
                    localize('chat.session.status.failed', "Failed") :
                    localize('chat.session.status.completed', "Finished");
            }
        }
    }
    getInProgressDescription(session) {
        if (session.timing.inProgressTime) {
            const inProgressDuration = this.toDuration(session.timing.inProgressTime, Date.now());
            if (inProgressDuration) {
                return localize('chat.session.status.inProgressWithDuration', "Working... ({0})", inProgressDuration);
            }
        }
        return localize('chat.session.status.inProgress', "Working...");
    }
    toDuration(startTime, endTime) {
        const elapsed = Math.round((endTime - startTime) / 1000) * 1000;
        if (elapsed < 1000) {
            return undefined;
        }
        return getDurationString(elapsed);
    }
    renderStatus(session, template) {
        const getStatus = (session) => `${session.providerLabel} • ${fromNow(session.timing.endTime || session.timing.startTime)}`;
        template.status.textContent = getStatus(session.element);
        const timer = template.elementDisposable.add(new IntervalTimer());
        timer.cancelAndSet(() => template.status.textContent = getStatus(session.element), 60 * 1000 /* every minute */);
    }
    renderHover(session, template) {
        const tooltip = session.element.tooltip;
        if (tooltip) {
            template.elementDisposable.add(this.hoverService.setupDelayedHover(template.element, () => ({
                content: tooltip,
                style: 1 /* HoverStyle.Pointer */,
                position: {
                    hoverPosition: (() => {
                        const sideBarPosition = this.layoutService.getSideBarPosition();
                        const viewLocation = this.viewDescriptorService.getViewLocationById(AGENT_SESSIONS_VIEW_ID);
                        switch (viewLocation) {
                            case 0 /* ViewContainerLocation.Sidebar */:
                                return sideBarPosition === 0 /* Position.LEFT */ ? 1 /* HoverPosition.RIGHT */ : 0 /* HoverPosition.LEFT */;
                            case 2 /* ViewContainerLocation.AuxiliaryBar */:
                                return sideBarPosition === 0 /* Position.LEFT */ ? 0 /* HoverPosition.LEFT */ : 1 /* HoverPosition.RIGHT */;
                            default:
                                return 1 /* HoverPosition.RIGHT */;
                        }
                    })()
                }
            }), { groupId: 'agent.sessions' }));
        }
    }
    renderCompressedElements(node, index, templateData, details) {
        throw new Error('Should never happen since session is incompressible');
    }
    disposeElement(element, index, template, details) {
        template.elementDisposable.clear();
    }
    disposeTemplate(templateData) {
        templateData.disposables.dispose();
    }
};
AgentSessionRenderer = AgentSessionRenderer_1 = __decorate([
    __param(0, IMarkdownRendererService),
    __param(1, IProductService),
    __param(2, IWorkbenchLayoutService),
    __param(3, IViewDescriptorService),
    __param(4, IHoverService),
    __param(5, IInstantiationService)
], AgentSessionRenderer);
export { AgentSessionRenderer };
export class AgentSessionsListDelegate {
    static { this.ITEM_HEIGHT = 44; }
    getHeight(element) {
        return AgentSessionsListDelegate.ITEM_HEIGHT;
    }
    getTemplateId(element) {
        return AgentSessionRenderer.TEMPLATE_ID;
    }
}
export class AgentSessionsAccessibilityProvider {
    getWidgetAriaLabel() {
        return localize('agentSessions', "Agent Sessions");
    }
    getAriaLabel(element) {
        return element.label;
    }
}
export class AgentSessionsDataSource {
    hasChildren(element) {
        return isAgentSessionsViewModel(element);
    }
    getChildren(element) {
        if (!isAgentSessionsViewModel(element)) {
            return [];
        }
        return element.sessions;
    }
}
export class AgentSessionsIdentityProvider {
    getId(element) {
        if (isAgentSession(element)) {
            return element.resource.toString();
        }
        return 'agent-sessions-id';
    }
}
export class AgentSessionsCompressionDelegate {
    isIncompressible(element) {
        return true;
    }
}
export class AgentSessionsSorter {
    compare(sessionA, sessionB) {
        const aInProgress = sessionA.status === 2 /* ChatSessionStatus.InProgress */;
        const bInProgress = sessionB.status === 2 /* ChatSessionStatus.InProgress */;
        if (aInProgress && !bInProgress) {
            return -1; // a (in-progress) comes before b (finished)
        }
        if (!aInProgress && bInProgress) {
            return 1; // a (finished) comes after b (in-progress)
        }
        // Both in-progress or finished: sort by end or start time (most recent first)
        return (sessionB.timing.endTime || sessionB.timing.startTime) - (sessionA.timing.endTime || sessionA.timing.startTime);
    }
}
export class AgentSessionsKeyboardNavigationLabelProvider {
    getKeyboardNavigationLabel(element) {
        return element.label;
    }
    getCompressedNodeKeyboardNavigationLabel(elements) {
        return undefined; // not enabled
    }
}
let AgentSessionsDragAndDrop = class AgentSessionsDragAndDrop extends Disposable {
    constructor(instantiationService) {
        super();
        this.instantiationService = instantiationService;
    }
    onDragStart(data, originalEvent) {
        const elements = data.getData();
        const uris = coalesce(elements.map(e => e.resource));
        this.instantiationService.invokeFunction(accessor => fillEditorsDragData(accessor, uris, originalEvent));
    }
    getDragURI(element) {
        return element.resource.toString();
    }
    getDragLabel(elements, originalEvent) {
        if (elements.length === 1) {
            return elements[0].label;
        }
        return localize('agentSessions.dragLabel', "{0} agent sessions", elements.length);
    }
    onDragOver(data, targetElement, targetIndex, targetSector, originalEvent) {
        return false;
    }
    drop(data, targetElement, targetIndex, targetSector, originalEvent) { }
};
AgentSessionsDragAndDrop = __decorate([
    __param(0, IInstantiationService)
], AgentSessionsDragAndDrop);
export { AgentSessionsDragAndDrop };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWdlbnRTZXNzaW9uc1ZpZXdlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvcG9yaWRoaS9kZXZlbG9wbWVudC9wdWt1LXZzLWVkaXRvci9zcmMvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9hZ2VudFNlc3Npb25zL2FnZW50U2Vzc2lvbnNWaWV3ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8saUNBQWlDLENBQUM7QUFDekMsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ3ZELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQU9qRCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBZSxNQUFNLHlDQUF5QyxDQUFDO0FBQ25HLE9BQU8sRUFBbUQsY0FBYyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDdkksT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDakUsT0FBTyxFQUFFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ2hGLE9BQU8sRUFBYyxhQUFhLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNsRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUN4RyxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNoRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFHM0YsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxxQkFBcUIs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