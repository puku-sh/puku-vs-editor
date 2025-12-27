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
import '../media/simpleBrowserOverlay.css';
import { combinedDisposable, DisposableMap, DisposableStore, toDisposable } from '../../../../../base/common/lifecycle.js';
import { autorun, derivedOpts, observableFromEvent, observableSignalFromEvent } from '../../../../../base/common/observable.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { localize } from '../../../../../nls.js';
import { IEditorGroupsService } from '../../../../services/editor/common/editorGroupsService.js';
import { EditorGroupView } from '../../../../browser/parts/editor/editorGroupView.js';
import { Event } from '../../../../../base/common/event.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { EditorResourceAccessor, SideBySideEditor } from '../../../../common/editor.js';
import { isEqual, joinPath } from '../../../../../base/common/resources.js';
import { CancellationTokenSource } from '../../../../../base/common/cancellation.js';
import { IHostService } from '../../../../services/host/browser/host.js';
import { IChatWidgetService } from '../chat.js';
import { Button, ButtonWithDropdown } from '../../../../../base/browser/ui/button/button.js';
import { defaultButtonStyles } from '../../../../../platform/theme/browser/defaultStyles.js';
import { addDisposableListener } from '../../../../../base/browser/dom.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { cleanupOldImages, createFileForMedia } from '../imageUtils.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IEnvironmentService } from '../../../../../platform/environment/common/environment.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { IPreferencesService } from '../../../../services/preferences/common/preferences.js';
import { IBrowserElementsService } from '../../../../services/browserElements/browser/browserElementsService.js';
import { IContextMenuService } from '../../../../../platform/contextview/browser/contextView.js';
import { toAction } from '../../../../../base/common/actions.js';
import { BrowserType } from '../../../../../platform/browserElements/common/browserElements.js';
let SimpleBrowserOverlayWidget = class SimpleBrowserOverlayWidget {
    constructor(_editor, _container, _hostService, _chatWidgetService, fileService, environmentService, logService, configurationService, _preferencesService, _browserElementsService, contextMenuService) {
        this._editor = _editor;
        this._container = _container;
        this._hostService = _hostService;
        this._chatWidgetService = _chatWidgetService;
        this.fileService = fileService;
        this.environmentService = environmentService;
        this.logService = logService;
        this.configurationService = configurationService;
        this._preferencesService = _preferencesService;
        this._browserElementsService = _browserElementsService;
        this.contextMenuService = contextMenuService;
        this._showStore = new DisposableStore();
        this._timeout = undefined;
        this._activeBrowserType = undefined;
        this._showStore.add(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('chat.sendElementsToChat.enabled')) {
                if (this.configurationService.getValue('chat.sendElementsToChat.enabled')) {
                    this.showElement(this._domNode);
                }
                else {
                    this.hideElement(this._domNode);
                }
            }
        }));
        this.imagesFolder = joinPath(this.environmentService.workspaceStorageHome, 'vscode-chat-images');
        cleanupOldImages(this.fileService, this.logService, this.imagesFolder);
        this._domNode = document.createElement('div');
        this._domNode.className = 'element-selection-message';
        const mainContent = document.createElement('div');
        mainContent.className = 'element-selection-main-content';
        const message = document.createElement('span');
        const startSelectionMessage = localize('elementSelectionMessage', 'Add element to chat');
        message.textContent = startSelectionMessage;
        mainContent.appendChild(message);
        let cts;
        const actions = [];
        actions.push(toAction({
            id: 'singleSelection',
            label: localize('selectElementDropdown', 'Select an Element'),
            enabled: true,
            run: async () => { await startElementSelection(); }
        }), toAction({
            id: 'continuousSelection',
            label: localize('continuousSelectionDropdown', 'Continuous Selection'),
            enabled: true,
            run: async () => {
                this._editor.focus();
                cts = new CancellationTokenSource();
                // start selection
                message.textContent = localize('elementSelectionInProgress', 'Selecting element...');
                this.hideElement(startButton.element);
                this.showElement(cancelButton.element);
                cancelButton.label = localize('finishSelectionLabel', 'Done');
                while (!cts.token.isCancellationRequested) {
                    try {
                        await this.addElementToChat(cts);
                    }
                    catch (err) {
                        this.logService.error('Failed to select this element.', err);
                        cts.cancel();
                        break;
                    }
                }
                // stop selection
                message.textContent = localize('elementSelectionComplete', 'Element added to chat');
                finishedSelecting();
            }
        }));
        const startButton = this._showStore.add(new ButtonWithDropdown(mainContent, {
            actions: actions,
            addPrimaryActionToDropdown: false,
            contextMenuProvider: this.contextMenuService,
            supportShortLabel: true,
            title: localize('selectAnElement', 'Click to select an element.'),
            supportIcons: true,
            ...defaultButtonStyles
        }));
        startButton.primaryButton.label = localize('startSelection', 'Start');
        startButton.element.classList.add('element-selection-start');
        const cancelButton = this._showStore.add(new Button(mainContent, { ...defaultButtonStyles, supportIcons: true, title: localize('cancelSelection', 'Click to cancel selection.') }));
        cancelButton.element.className = 'element-selection-cancel hidden';
        const cancelButtonLabel = localize('cancelSelectionLabel', 'Cancel');
        cancelButton.label = cancelButtonLabel;
        const configure = this._showStore.add(new Button(mainContent, { supportIcons: true, title: localize('chat.configureElements', "Configure Attachments Sent") }));
        configure.icon = Codicon.gear;
        const collapseOverlay = this._showStore.add(new Button(mainContent, { supportIcons: true, title: localize('chat.hideOverlay', "Collapse Overlay") }));
        collapseOverlay.icon = Codicon.chevronRight;
        const nextSelection = this._showStore.add(new Button(mainContent, { supportIcons: true, title: localize('chat.nextSelection', "Select Again") }));
        nextSelection.icon = Codicon.close;
        nextSelection.element.classList.add('hidden');
        // shown if the overlay is collapsed
        const expandContainer = document.createElement('div');
        expandContainer.className = 'element-expand-container hidden';
        const expandOverlay = this._showStore.add(new Button(expandContainer, { supportIcons: true, title: localize('chat.expandOverlay', "Expand Overlay") }));
        expandOverlay.icon = Codicon.layout;
        this._domNode.appendChild(mainContent);
        this._domNode.appendChild(expandContainer);
        const resetButtons = () => {
            this.hideElement(nextSelection.element);
            this.showElement(startButton.element);
            this.showElement(collapseOverlay.element);
        };
        const finishedSelecting = () => {
            // stop selection
            this.hideElement(cancelButton.element);
            cancelButton.label = cancelButtonLabel;
            this.hideElement(collapseOverlay.element);
            this.showElement(nextSelection.element);
            // wait 3 seconds before showing the start button again unless cancelled out.
            this._timeout = setTimeout(() => {
                message.textContent = startSelectionMessage;
                resetButtons();
            }, 3000);
        };
        const startElementSelection = async () => {
            cts = new CancellationTokenSource();
            this._editor.focus();
            // start selection
            message.textContent = localize('elementSelectionInProgress', 'Selecting element...');
            this.hideElement(startButton.element);
            this.showElement(cancelButton.element);
            await this.addElementToChat(cts);
            // stop selection
            message.textContent = localize('elementSelectionComplete', 'Element added to chat');
            finishedSelecting();
        };
        this._showStore.add(addDisposableListener(startButton.primaryButton.element, 'click', async () => {
            await startElementSelection();
        }));
        this._showStore.add(addDisposableListener(cancelButton.element, 'click', () => {
            cts.cancel();
            message.textContent = localize('elementCancelMessage', 'Selection canceled');
            finishedSelecting();
        }));
        this._showStore.add(addDisposableListener(collapseOverlay.element, 'click', () => {
            this.hideElement(mainContent);
            this.showElement(expandContainer);
        }));
        this._showStore.add(addDisposableListener(expandOverlay.element, 'click', () => {
            this.showElement(mainContent);
            this.hideElement(expandContainer);
        }));
        this._showStore.add(addDisposableListener(nextSelection.element, 'click', () => {
            clearTimeout(this._timeout);
            message.textContent = startSelectionMessage;
            resetButtons();
        }));
        this._showStore.add(addDisposableListener(configure.element, 'click', () => {
            this._preferencesService.openSettings({ jsonEditor: false, query: '@id:chat.sendElementsToChat.enabled,chat.sendElementsToChat.attachCSS,chat.sendElementsToChat.attachImages' });
        }));
    }
    setActiveBrowserType(type) {
        this._activeBrowserType = type;
    }
    hideElement(element) {
        if (element.classList.contains('hidden')) {
            return;
        }
        element.classList.add('hidden');
    }
    showElement(element) {
        if (!element.classList.contains('hidden')) {
            return;
        }
        element.classList.remove('hidden');
    }
    async addElementToChat(cts) {
        // eslint-disable-next-line no-restricted-syntax
        const editorContainer = this._container.querySelector('.editor-container');
        const editorContainerPosition = editorContainer ? editorContainer.getBoundingClientRect() : this._container.getBoundingClientRect();
        const elementData = await this._browserElementsService.getElementData(editorContainerPosition, cts.token, this._activeBrowserType);
        if (!elementData) {
            throw new Error('Element data not found');
        }
        const bounds = elementData.bounds;
        const toAttach = [];
        const widget = await this._chatWidgetService.revealWidget() ?? this._chatWidgetService.lastFocusedWidget;
        let value = 'Attached HTML and CSS Context\n\n' + elementData.outerHTML;
        if (this.configurationService.getValue('chat.sendElementsToChat.attachCSS')) {
            value += '\n\n' + elementData.computedStyle;
        }
        toAttach.push({
            id: 'element-' + Date.now(),
            name: this.getDisplayNameFromOuterHTML(elementData.outerHTML),
            fullName: this.getDisplayNameFromOuterHTML(elementData.outerHTML),
            value: value,
            kind: 'element',
            icon: ThemeIcon.fromId(Codicon.layout.id),
        });
        if (this.configurationService.getValue('chat.sendElementsToChat.attachImages')) {
            // remove container so we don't block anything on screenshot
            this._domNode.style.display = 'none';
            // Wait 1 extra frame to make sure overlay is gone
            await new Promise(resolve => setTimeout(resolve, 100));
            const screenshot = await this._hostService.getScreenshot(bounds);
            if (!screenshot) {
                throw new Error('Screenshot failed');
            }
            const fileReference = await createFileForMedia(this.fileService, this.imagesFolder, screenshot.buffer, 'image/png');
            toAttach.push({
                id: 'element-screenshot-' + Date.now(),
                name: 'Element Screenshot',
                fullName: 'Element Screenshot',
                kind: 'image',
                value: screenshot.buffer,
                references: fileReference ? [{ reference: fileReference, kind: 'reference' }] : [],
            });
            this._domNode.style.display = '';
        }
        widget?.attachmentModel?.addContext(...toAttach);
    }
    getDisplayNameFromOuterHTML(outerHTML) {
        const firstElementMatch = outerHTML.match(/^<(\w+)([^>]*?)>/);
        if (!firstElementMatch) {
            throw new Error('No outer element found');
        }
        const tagName = firstElementMatch[1];
        const idMatch = firstElementMatch[2].match(/\s+id\s*=\s*["']([^"']+)["']/i);
        const id = idMatch ? `#${idMatch[1]}` : '';
        const classMatch = firstElementMatch[2].match(/\s+class\s*=\s*["']([^"']+)["']/i);
        const className = classMatch ? `.${classMatch[1].replace(/\s+/g, '.')}` : '';
        return `${tagName}${id}${className}`;
    }
    dispose() {
        this._showStore.dispose();
    }
    getDomNode() {
        return this._domNode;
    }
};
SimpleBrowserOverlayWidget = __decorate([
    __param(2, IHostService),
    __param(3, IChatWidgetService),
    __param(4, IFileService),
    __param(5, IEnvironmentService),
    __param(6, ILogService),
    __param(7, IConfigurationService),
    __param(8, IPreferencesService),
    __param(9, IBrowserElementsService),
    __param(10, IContextMenuService)
], SimpleBrowserOverlayWidget);
let SimpleBrowserOverlayController = class SimpleBrowserOverlayController {
    constructor(container, group, instaService, configurationService, _browserElementsService) {
        this.configurationService = configurationService;
        this._browserElementsService = _browserElementsService;
        this._store = new DisposableStore();
        this._domNode = document.createElement('div');
        if (!this.configurationService.getValue('chat.sendElementsToChat.enabled')) {
            return;
        }
        this._domNode.classList.add('chat-simple-browser-overlay');
        this._domNode.style.position = 'absolute';
        this._domNode.style.bottom = `5px`;
        this._domNode.style.right = `5px`;
        this._domNode.style.zIndex = `100`;
        const widget = instaService.createInstance(SimpleBrowserOverlayWidget, group, container);
        this._domNode.appendChild(widget.getDomNode());
        this._store.add(toDisposable(() => this._domNode.remove()));
        this._store.add(widget);
        const connectingWebviewElement = document.createElement('div');
        connectingWebviewElement.className = 'connecting-webview-element';
        const getActiveBrowserType = () => {
            const editor = group.activeEditorPane;
            const isSimpleBrowser = editor?.input.editorId === 'mainThreadWebview-simpleBrowser.view';
            const isLiveServer = editor?.input.editorId === 'mainThreadWebview-browserPreview';
            return isSimpleBrowser ? BrowserType.SimpleBrowser : isLiveServer ? BrowserType.LiveServer : undefined;
        };
        let cts = new CancellationTokenSource();
        const show = async () => {
            // Show the connecting indicator while establishing the session
            connectingWebviewElement.textContent = localize('connectingWebviewElement', 'Connecting to webview...');
            if (!container.contains(connectingWebviewElement)) {
                container.appendChild(connectingWebviewElement);
            }
            cts = new CancellationTokenSource();
            const activeBrowserType = getActiveBrowserType();
            if (activeBrowserType) {
                try {
                    await this._browserElementsService.startDebugSession(cts.token, activeBrowserType);
                }
                catch (error) {
                    connectingWebviewElement.textContent = localize('reopenErrorWebviewElement', 'Please reopen the preview.');
                    return;
                }
            }
            if (!container.contains(this._domNode)) {
                container.appendChild(this._domNode);
            }
            connectingWebviewElement.remove();
        };
        const hide = () => {
            if (container.contains(this._domNode)) {
                cts.cancel();
                this._domNode.remove();
            }
            connectingWebviewElement.remove();
        };
        const activeEditorSignal = observableSignalFromEvent(this, Event.any(group.onDidActiveEditorChange, group.onDidModelChange));
        const activeUriObs = derivedOpts({ equalsFn: isEqual }, r => {
            activeEditorSignal.read(r); // signal
            const editor = group.activeEditorPane;
            const activeBrowser = getActiveBrowserType();
            widget.setActiveBrowserType(activeBrowser);
            if (activeBrowser) {
                const uri = EditorResourceAccessor.getOriginalUri(editor?.input, { supportSideBySide: SideBySideEditor.PRIMARY });
                return uri;
            }
            return undefined;
        });
        this._store.add(autorun(r => {
            const data = activeUriObs.read(r);
            if (!data) {
                hide();
                return;
            }
            show();
        }));
    }
    dispose() {
        this._store.dispose();
    }
};
SimpleBrowserOverlayController = __decorate([
    __param(2, IInstantiationService),
    __param(3, IConfigurationService),
    __param(4, IBrowserElementsService)
], SimpleBrowserOverlayController);
let SimpleBrowserOverlay = class SimpleBrowserOverlay {
    static { this.ID = 'chat.simpleBrowser.overlay'; }
    constructor(editorGroupsService, instantiationService) {
        this._store = new DisposableStore();
        const editorGroups = observableFromEvent(this, Event.any(editorGroupsService.onDidAddGroup, editorGroupsService.onDidRemoveGroup), () => editorGroupsService.groups);
        const overlayWidgets = new DisposableMap();
        this._store.add(autorun(r => {
            const toDelete = new Set(overlayWidgets.keys());
            const groups = editorGroups.read(r);
            for (const group of groups) {
                if (!(group instanceof EditorGroupView)) {
                    // TODO@jrieken better with https://github.com/microsoft/vscode/tree/ben/layout-group-container
                    continue;
                }
                toDelete.delete(group); // we keep the widget for this group!
                if (!overlayWidgets.has(group)) {
                    const scopedInstaService = instantiationService.createChild(new ServiceCollection([IContextKeyService, group.scopedContextKeyService]));
                    const container = group.element;
                    const ctrl = scopedInstaService.createInstance(SimpleBrowserOverlayController, container, group);
                    overlayWidgets.set(group, combinedDisposable(ctrl, scopedInstaService));
                }
            }
            for (const group of toDelete) {
                overlayWidgets.deleteAndDispose(group);
            }
        }));
    }
    dispose() {
        this._store.dispose();
    }
};
SimpleBrowserOverlay = __decorate([
    __param(0, IEditorGroupsService),
    __param(1, IInstantiationService)
], SimpleBrowserOverlay);
export { SimpleBrowserOverlay };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2ltcGxlQnJvd3NlckVkaXRvck92ZXJsYXkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL3BvcmlkaGkvZGV2ZWxvcG1lbnQvcHVrdS12cy1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdEVkaXRpbmcvc2ltcGxlQnJvd3NlckVkaXRvck92ZXJsYXkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxtQ0FBbUMsQ0FBQztBQUMzQyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsYUFBYSxFQUFFLGVBQWUsRUFBRSxZQUFZLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMzSCxPQUFPLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxtQkFBbUIsRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ2hJLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDakUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBRWpELE9BQU8sRUFBZ0Isb0JBQW9CLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUMvRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scURBQXFELENBQUM7QUFDdEYsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1FQUFtRSxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3hG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