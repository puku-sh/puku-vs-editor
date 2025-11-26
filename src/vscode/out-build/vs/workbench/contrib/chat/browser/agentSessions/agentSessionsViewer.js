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
                    localize(5326, null, duration ?? '1s') :
                    localize(5327, null, duration ?? '1s');
            }
            else {
                template.description.textContent = session.element.status === 0 /* ChatSessionStatus.Failed */ ?
                    localize(5328, null) :
                    localize(5329, null);
            }
        }
    }
    getInProgressDescription(session) {
        if (session.timing.inProgressTime) {
            const inProgressDuration = this.toDuration(session.timing.inProgressTime, Date.now());
            if (inProgressDuration) {
                return localize(5330, null, inProgressDuration);
            }
        }
        return localize(5331, null);
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
        return localize(5332, null);
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
        return localize(5333, null, elements.length);
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
//# sourceMappingURL=agentSessionsViewer.js.map