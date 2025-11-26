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
import { Toggle } from '../../../base/browser/ui/toggle/toggle.js';
import { Lazy } from '../../../base/common/lazy.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { basenameOrAuthority, dirname, hasTrailingPathSeparator } from '../../../base/common/resources.js';
import { ThemeIcon } from '../../../base/common/themables.js';
import { isUriComponents, URI } from '../../../base/common/uri.js';
import { ILanguageService } from '../../../editor/common/languages/language.js';
import { getIconClasses } from '../../../editor/common/services/getIconClasses.js';
import { IModelService } from '../../../editor/common/services/model.js';
import { FileKind } from '../../../platform/files/common/files.js';
import { ILabelService } from '../../../platform/label/common/label.js';
import { IQuickInputService, QuickInputButtonLocation } from '../../../platform/quickinput/common/quickInput.js';
import { asCssVariable, inputActiveOptionBackground, inputActiveOptionBorder, inputActiveOptionForeground } from '../../../platform/theme/common/colorRegistry.js';
import { ICustomEditorLabelService } from '../../services/editor/common/customEditorLabelService.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { ExtHostContext, MainContext } from '../common/extHost.protocol.js';
let MainThreadQuickOpen = class MainThreadQuickOpen {
    constructor(extHostContext, quickInputService, labelService, customEditorLabelService, modelService, languageService) {
        this.labelService = labelService;
        this.customEditorLabelService = customEditorLabelService;
        this.modelService = modelService;
        this.languageService = languageService;
        this._items = {};
        // ---- QuickInput
        this.sessions = new Map();
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostQuickOpen);
        this._quickInputService = quickInputService;
    }
    dispose() {
        for (const [_id, session] of this.sessions) {
            session.store.dispose();
        }
    }
    $show(instance, options, token) {
        const contents = new Promise((resolve, reject) => {
            this._items[instance] = { resolve, reject };
        });
        options = {
            ...options,
            onDidFocus: el => {
                if (el) {
                    this._proxy.$onItemSelected(el.handle);
                }
            }
        };
        if (options.canPickMany) {
            return this._quickInputService.pick(contents, options, token).then(items => {
                if (items) {
                    return items.map(item => item.handle);
                }
                return undefined;
            });
        }
        else {
            return this._quickInputService.pick(contents, options, token).then(item => {
                if (item) {
                    return item.handle;
                }
                return undefined;
            });
        }
    }
    $setItems(instance, items) {
        if (this._items[instance]) {
            items.forEach(item => this.expandItemProps(item));
            this._items[instance].resolve(items);
            delete this._items[instance];
        }
        return Promise.resolve();
    }
    $setError(instance, error) {
        if (this._items[instance]) {
            this._items[instance].reject(error);
            delete this._items[instance];
        }
        return Promise.resolve();
    }
    // ---- input
    $input(options, validateInput, token) {
        const inputOptions = Object.create(null);
        if (options) {
            inputOptions.title = options.title;
            inputOptions.password = options.password;
            inputOptions.placeHolder = options.placeHolder;
            inputOptions.valueSelection = options.valueSelection;
            inputOptions.prompt = options.prompt;
            inputOptions.value = options.value;
            inputOptions.ignoreFocusLost = options.ignoreFocusOut;
        }
        if (validateInput) {
            inputOptions.validateInput = (value) => {
                return this._proxy.$validateInput(value);
            };
        }
        return this._quickInputService.input(inputOptions, token);
    }
    $createOrUpdate(params) {
        const sessionId = params.id;
        let session = this.sessions.get(sessionId);
        if (!session) {
            const store = new DisposableStore();
            const input = params.type === 'quickPick' ? this._quickInputService.createQuickPick() : this._quickInputService.createInputBox();
            store.add(input);
            store.add(input.onDidAccept(() => {
                this._proxy.$onDidAccept(sessionId);
            }));
            store.add(input.onDidTriggerButton(button => {
                this._proxy.$onDidTriggerButton(sessionId, button.handle);
            }));
            store.add(input.onDidChangeValue(value => {
                this._proxy.$onDidChangeValue(sessionId, value);
            }));
            store.add(input.onDidHide(() => {
                this._proxy.$onDidHide(sessionId);
            }));
            if (params.type === 'quickPick') {
                // Add extra events specific for quickpick
                const quickpick = input;
                store.add(quickpick.onDidChangeActive(items => {
                    this._proxy.$onDidChangeActive(sessionId, items.map(item => item.handle));
                }));
                store.add(quickpick.onDidChangeSelection(items => {
                    this._proxy.$onDidChangeSelection(sessionId, items.map(item => item.handle));
                }));
                store.add(quickpick.onDidTriggerItemButton((e) => {
                    this._proxy.$onDidTriggerItemButton(sessionId, e.item.handle, e.button.handle);
                }));
            }
            session = {
                input,
                handlesToItems: new Map(),
                handlesToToggles: new Map(),
                store
            };
            this.sessions.set(sessionId, session);
        }
        const { input, handlesToItems } = session;
        const quickPick = input;
        for (const param in params) {
            switch (param) {
                case 'id':
                case 'type':
                    continue;
                case 'visible':
                    if (params.visible) {
                        input.show();
                    }
                    else {
                        input.hide();
                    }
                    break;
                case 'items': {
                    handlesToItems.clear();
                    params.items?.forEach((item) => {
                        this.expandItemProps(item);
                        if (item.type !== 'separator') {
                            item.buttons?.forEach(button => this.expandIconPath(button));
                            handlesToItems.set(item.handle, item);
                        }
                    });
                    quickPick.items = params.items;
                    break;
                }
                case 'activeItems':
                    quickPick.activeItems = params.activeItems
                        ?.map((handle) => handlesToItems.get(handle))
                        .filter(Boolean);
                    break;
                case 'selectedItems':
                    quickPick.selectedItems = params.selectedItems
                        ?.map((handle) => handlesToItems.get(handle))
                        .filter(Boolean);
                    break;
                case 'buttons': {
                    const buttons = [], toggles = [];
                    for (const button of params.buttons) {
                        if (button.handle === -1) {
                            buttons.push(this._quickInputService.backButton);
                        }
                        else {
                            this.expandIconPath(button);
                            // Currently buttons are only supported outside of the input box
                            // and toggles only inside. When/if that changes, this will need to be updated.
                            if (button.location === QuickInputButtonLocation.Input) {
                                toggles.push(button);
                            }
                            else {
                                buttons.push(button);
                            }
                        }
                    }
                    input.buttons = buttons;
                    this.updateToggles(sessionId, session, toggles);
                    break;
                }
                default:
                    // eslint-disable-next-line local/code-no-any-casts, @typescript-eslint/no-explicit-any
                    input[param] = params[param];
                    break;
            }
        }
        return Promise.resolve(undefined);
    }
    $dispose(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.store.dispose();
            this.sessions.delete(sessionId);
        }
        return Promise.resolve(undefined);
    }
    /**
    * Derives icon, label and description for Quick Pick items that represent a resource URI.
    */
    expandItemProps(item) {
        if (item.type === 'separator') {
            return;
        }
        if (!item.resourceUri) {
            this.expandIconPath(item);
            return;
        }
        // Derive missing label and description from resourceUri.
        const resourceUri = URI.from(item.resourceUri);
        item.label ??= this.customEditorLabelService.getName(resourceUri) || '';
        if (item.label) {
            item.description ??= this.labelService.getUriLabel(resourceUri, { relative: true });
        }
        else {
            item.label = basenameOrAuthority(resourceUri);
            item.description ??= this.labelService.getUriLabel(dirname(resourceUri), { relative: true });
        }
        // Derive icon props from resourceUri if icon is set to ThemeIcon.File or ThemeIcon.Folder.
        const icon = item.iconPathDto;
        if (ThemeIcon.isThemeIcon(icon) && (ThemeIcon.isFile(icon) || ThemeIcon.isFolder(icon))) {
            const fileKind = ThemeIcon.isFolder(icon) || hasTrailingPathSeparator(resourceUri) ? FileKind.FOLDER : FileKind.FILE;
            const iconClasses = new Lazy(() => getIconClasses(this.modelService, this.languageService, resourceUri, fileKind));
            Object.defineProperty(item, 'iconClasses', { get: () => iconClasses.value });
        }
        else {
            this.expandIconPath(item);
        }
    }
    /**
    * Converts IconPath DTO into iconPath/iconClass properties.
    */
    expandIconPath(target) {
        const icon = target.iconPathDto;
        if (!icon) {
            return;
        }
        else if (ThemeIcon.isThemeIcon(icon)) {
            // TODO: Since IQuickPickItem and IQuickInputButton do not support ThemeIcon directly, the color ID is lost here.
            // We should consider changing changing iconPath/iconClass to IconPath in both interfaces.
            // Request for color support: https://github.com/microsoft/vscode/issues/185356..
            target.iconClass = ThemeIcon.asClassName(icon);
        }
        else if (isUriComponents(icon)) {
            const uri = URI.from(icon);
            target.iconPath = { dark: uri, light: uri };
        }
        else {
            const { dark, light } = icon;
            target.iconPath = { dark: URI.from(dark), light: URI.from(light) };
        }
    }
    /**
    * Updates the toggles for a given quick input session by creating new {@link Toggle}-s
    * from buttons, updating existing toggles props and removing old ones.
    */
    updateToggles(sessionId, session, buttons) {
        const { input, handlesToToggles, store } = session;
        // Add new or update existing toggles.
        const toggles = [];
        for (const button of buttons) {
            const title = button.tooltip || '';
            const isChecked = !!button.checked;
            // TODO: Toggle class only supports ThemeIcon at the moment, but not other formats of IconPath.
            // We should consider adding support for the full IconPath to Toggle, in this code should be updated.
            const icon = ThemeIcon.isThemeIcon(button.iconPathDto) ? button.iconPathDto : undefined;
            let { toggle } = handlesToToggles.get(button.handle) || {};
            if (toggle) {
                // Toggle already exists, update its props.
                toggle.setTitle(title);
                toggle.setIcon(icon);
                toggle.checked = isChecked;
            }
            else {
                // Create a new toggle from the button.
                toggle = store.add(new Toggle({
                    title,
                    icon,
                    isChecked,
                    inputActiveOptionBorder: asCssVariable(inputActiveOptionBorder),
                    inputActiveOptionForeground: asCssVariable(inputActiveOptionForeground),
                    inputActiveOptionBackground: asCssVariable(inputActiveOptionBackground)
                }));
                const listener = store.add(toggle.onChange(() => {
                    this._proxy.$onDidTriggerButton(sessionId, button.handle, toggle.checked);
                }));
                handlesToToggles.set(button.handle, { toggle, listener });
            }
            toggles.push(toggle);
        }
        // Remove toggles that are no longer present from the session map.
        for (const [handle, { toggle, listener }] of handlesToToggles) {
            if (!buttons.some(button => button.handle === handle)) {
                handlesToToggles.delete(handle);
                store.delete(toggle);
                store.delete(listener);
            }
        }
        // Update toggle interfaces on the input widget.
        input.toggles = toggles;
    }
};
MainThreadQuickOpen = __decorate([
    extHostNamedCustomer(MainContext.MainThreadQuickOpen),
    __param(1, IQuickInputService),
    __param(2, ILabelService),
    __param(3, ICustomEditorLabelService),
    __param(4, IModelService),
    __param(5, ILanguageService)
], MainThreadQuickOpen);
export { MainThreadQuickOpen };
//# sourceMappingURL=mainThreadQuickOpen.js.map