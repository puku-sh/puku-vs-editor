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
import { Action } from '../../../../base/common/actions.js';
import { assertNever, softAssertNever } from '../../../../base/common/assert.js';
import { CancellationError } from '../../../../base/common/errors.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { autorun } from '../../../../base/common/observable.js';
import { isDefined } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { localize } from '../../../../nls.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { ChatElicitationRequestPart } from '../../chat/browser/chatElicitationRequestPart.js';
import { ChatModel } from '../../chat/common/chatModel.js';
import { IChatService } from '../../chat/common/chatService.js';
import { LocalChatSessionUri } from '../../chat/common/chatUri.js';
import { McpConnectionState, MpcResponseError } from '../common/mcpTypes.js';
import { mcpServerToSourceData } from '../common/mcpTypesUtils.js';
import { MCP } from '../common/modelContextProtocol.js';
const noneItem = { id: undefined, label: localize('mcp.elicit.enum.none', 'None'), description: localize('mcp.elicit.enum.none.description', 'No selection'), alwaysShow: true };
function isFormElicitation(params) {
    return params.mode === 'form' || (params.mode === undefined && !!params.requestedSchema);
}
function isUrlElicitation(params) {
    return params.mode === 'url';
}
function isLegacyTitledEnumSchema(schema) {
    const cast = schema;
    return cast.type === 'string' && Array.isArray(cast.enum) && Array.isArray(cast.enumNames);
}
function isUntitledEnumSchema(schema) {
    const cast = schema;
    return cast.type === 'string' && Array.isArray(cast.enum);
}
function isTitledSingleEnumSchema(schema) {
    const cast = schema;
    return cast.type === 'string' && Array.isArray(cast.oneOf);
}
function isUntitledMultiEnumSchema(schema) {
    const cast = schema;
    return cast.type === 'array' && !!cast.items?.enum;
}
function isTitledMultiEnumSchema(schema) {
    const cast = schema;
    return cast.type === 'array' && !!cast.items?.anyOf;
}
let McpElicitationService = class McpElicitationService {
    constructor(_notificationService, _quickInputService, _chatService, _openerService) {
        this._notificationService = _notificationService;
        this._quickInputService = _quickInputService;
        this._chatService = _chatService;
        this._openerService = _openerService;
    }
    elicit(server, context, elicitation, token) {
        if (isFormElicitation(elicitation)) {
            return this._elicitForm(server, context, elicitation, token);
        }
        else if (isUrlElicitation(elicitation)) {
            return this._elicitUrl(server, context, elicitation, token);
        }
        else {
            softAssertNever(elicitation);
            return Promise.reject(new MpcResponseError('Unsupported elicitation type', MCP.INVALID_PARAMS, undefined));
        }
    }
    async _elicitForm(server, context, elicitation, token) {
        const store = new DisposableStore();
        const value = await new Promise(resolve => {
            const chatModel = context?.chatSessionId && this._chatService.getSession(LocalChatSessionUri.forSession(context.chatSessionId));
            if (chatModel instanceof ChatModel) {
                const request = chatModel.getRequests().at(-1);
                if (request) {
                    const part = new ChatElicitationRequestPart(localize('mcp.elicit.title', 'Request for Input'), elicitation.message, localize('msg.subtitle', "{0} (MCP Server)", server.definition.label), localize('mcp.elicit.accept', 'Respond'), localize('mcp.elicit.reject', 'Cancel'), async () => {
                        const p = this._doElicitForm(elicitation, token);
                        resolve(p);
                        const result = await p;
                        part.acceptedResult = result.content;
                        return result.action === 'accept' ? "accepted" /* ElicitationState.Accepted */ : "rejected" /* ElicitationState.Rejected */;
                    }, () => {
                        resolve({ action: 'decline' });
                        return Promise.resolve("rejected" /* ElicitationState.Rejected */);
                    }, mcpServerToSourceData(server));
                    chatModel.acceptResponseProgress(request, part);
                }
            }
            else {
                const handle = this._notificationService.notify({
                    message: elicitation.message,
                    source: localize('mcp.elicit.source', 'MCP Server ({0})', server.definition.label),
                    severity: Severity.Info,
                    actions: {
                        primary: [store.add(new Action('mcp.elicit.give', localize('mcp.elicit.give', 'Respond'), undefined, true, () => resolve(this._doElicitForm(elicitation, token))))],
                        secondary: [store.add(new Action('mcp.elicit.cancel', localize('mcp.elicit.cancel', 'Cancel'), undefined, true, () => resolve({ action: 'decline' })))],
                    }
                });
                store.add(handle.onDidClose(() => resolve({ action: 'cancel' })));
                store.add(token.onCancellationRequested(() => resolve({ action: 'cancel' })));
            }
        }).finally(() => store.dispose());
        return { kind: 0 /* ElicitationKind.Form */, value, dispose: () => { } };
    }
    async _elicitUrl(server, context, elicitation, token) {
        const promiseStore = new DisposableStore();
        // We create this ahead of time in case e.g. a user manually opens the URL beforehand
        const completePromise = new Promise((resolve, reject) => {
            promiseStore.add(token.onCancellationRequested(() => reject(new CancellationError())));
            promiseStore.add(autorun(reader => {
                const cnx = server.connection.read(reader);
                const handler = cnx?.handler.read(reader);
                if (handler) {
                    reader.store.add(handler.onDidReceiveElicitationCompleteNotification(e => {
                        if (e.params.elicitationId === elicitation.elicitationId) {
                            resolve();
                        }
                    }));
                }
                else if (!McpConnectionState.isRunning(server.connectionState.read(reader))) {
                    reject(new CancellationError());
                }
            }));
        }).finally(() => promiseStore.dispose());
        const store = new DisposableStore();
        const value = await new Promise(resolve => {
            const chatModel = context?.chatSessionId && this._chatService.getSession(LocalChatSessionUri.forSession(context.chatSessionId));
            if (chatModel instanceof ChatModel) {
                const request = chatModel.getRequests().at(-1);
                if (request) {
                    const part = new ChatElicitationRequestPart(localize('mcp.elicit.url.title', 'Authorization Required'), new MarkdownString().appendText(elicitation.message)
                        .appendMarkdown('\n\n' + localize('mcp.elicit.url.instruction', 'Open this URL?'))
                        .appendCodeblock('', elicitation.url), localize('msg.subtitle', "{0} (MCP Server)", server.definition.label), localize('mcp.elicit.url.open', 'Open {0}', URI.parse(elicitation.url).authority), localize('mcp.elicit.reject', 'Cancel'), async () => {
                        const result = await this._doElicitUrl(elicitation, token);
                        resolve(result);
                        completePromise.then(() => part.hide());
                        return result.action === 'accept' ? "accepted" /* ElicitationState.Accepted */ : "rejected" /* ElicitationState.Rejected */;
                    }, () => {
                        resolve({ action: 'decline' });
                        return Promise.resolve("rejected" /* ElicitationState.Rejected */);
                    }, mcpServerToSourceData(server));
                    chatModel.acceptResponseProgress(request, part);
                }
            }
            else {
                const handle = this._notificationService.notify({
                    message: elicitation.message + ' ' + localize('mcp.elicit.url.instruction2', 'This will open {0}', elicitation.url),
                    source: localize('mcp.elicit.source', 'MCP Server ({0})', server.definition.label),
                    severity: Severity.Info,
                    actions: {
                        primary: [store.add(new Action('mcp.elicit.url.open2', localize('mcp.elicit.url.open2', 'Open URL'), undefined, true, () => resolve(this._doElicitUrl(elicitation, token))))],
                        secondary: [store.add(new Action('mcp.elicit.cancel', localize('mcp.elicit.cancel', 'Cancel'), undefined, true, () => resolve({ action: 'decline' })))],
                    }
                });
                store.add(handle.onDidClose(() => resolve({ action: 'cancel' })));
                store.add(token.onCancellationRequested(() => resolve({ action: 'cancel' })));
            }
        }).finally(() => store.dispose());
        return {
            kind: 1 /* ElicitationKind.URL */,
            value,
            wait: completePromise,
            dispose: () => promiseStore.dispose(),
        };
    }
    async _doElicitUrl(elicitation, token) {
        if (token.isCancellationRequested) {
            return { action: 'cancel' };
        }
        try {
            if (await this._openerService.open(elicitation.url, { allowCommands: false })) {
                return { action: 'accept' };
            }
        }
        catch {
            // ignored
        }
        return { action: 'decline' };
    }
    async _doElicitForm(elicitation, token) {
        const quickPick = this._quickInputService.createQuickPick();
        const store = new DisposableStore();
        try {
            const properties = Object.entries(elicitation.requestedSchema.properties);
            const requiredFields = new Set(elicitation.requestedSchema.required || []);
            const results = {};
            const backSnapshots = [];
            quickPick.title = elicitation.message;
            quickPick.totalSteps = properties.length;
            quickPick.ignoreFocusOut = true;
            for (let i = 0; i < properties.length; i++) {
                const [propertyName, schema] = properties[i];
                const isRequired = requiredFields.has(propertyName);
                const restore = backSnapshots.at(i);
                store.clear();
                quickPick.step = i + 1;
                quickPick.title = schema.title || propertyName;
                quickPick.placeholder = this._getFieldPlaceholder(schema, isRequired);
                quickPick.value = restore?.value ?? '';
                quickPick.validationMessage = '';
                quickPick.buttons = i > 0 ? [this._quickInputService.backButton] : [];
                let result;
                if (schema.type === 'boolean') {
                    result = await this._handleEnumField(quickPick, { enum: [{ const: 'true' }, { const: 'false' }], default: schema.default ? String(schema.default) : undefined }, isRequired, store, token);
                    if (result.type === 'value') {
                        result.value = result.value === 'true' ? true : false;
                    }
                }
                else if (isLegacyTitledEnumSchema(schema)) {
                    result = await this._handleEnumField(quickPick, { enum: schema.enum.map((v, i) => ({ const: v, title: schema.enumNames[i] })), default: schema.default }, isRequired, store, token);
                }
                else if (isUntitledEnumSchema(schema)) {
                    result = await this._handleEnumField(quickPick, { enum: schema.enum.map(v => ({ const: v })), default: schema.default }, isRequired, store, token);
                }
                else if (isTitledSingleEnumSchema(schema)) {
                    result = await this._handleEnumField(quickPick, { enum: schema.oneOf, default: schema.default }, isRequired, store, token);
                }
                else if (isTitledMultiEnumSchema(schema)) {
                    result = await this._handleMultiEnumField(quickPick, { enum: schema.items.anyOf, default: schema.default }, isRequired, store, token);
                }
                else if (isUntitledMultiEnumSchema(schema)) {
                    result = await this._handleMultiEnumField(quickPick, { enum: schema.items.enum.map(v => ({ const: v })), default: schema.default }, isRequired, store, token);
                }
                else {
                    result = await this._handleInputField(quickPick, schema, isRequired, store, token);
                    if (result.type === 'value' && (schema.type === 'number' || schema.type === 'integer')) {
                        result.value = Number(result.value);
                    }
                }
                if (result.type === 'back') {
                    i -= 2;
                    continue;
                }
                if (result.type === 'cancel') {
                    return { action: 'cancel' };
                }
                backSnapshots[i] = { value: quickPick.value };
                if (result.value === undefined) {
                    delete results[propertyName];
                }
                else {
                    results[propertyName] = result.value;
                }
            }
            return {
                action: 'accept',
                content: results,
            };
        }
        finally {
            store.dispose();
            quickPick.dispose();
        }
    }
    _getFieldPlaceholder(schema, required) {
        let placeholder = schema.description || '';
        if (!required) {
            placeholder = placeholder ? `${placeholder} (${localize('optional', 'Optional')})` : localize('optional', 'Optional');
        }
        return placeholder;
    }
    async _handleEnumField(quickPick, schema, required, store, token) {
        const items = schema.enum.map(({ const: value, title }) => ({
            id: value,
            label: value,
            description: title,
        }));
        if (!required) {
            items.push(noneItem);
        }
        quickPick.canSelectMany = false;
        quickPick.items = items;
        if (schema.default !== undefined) {
            quickPick.activeItems = items.filter(item => item.id === schema.default);
        }
        return new Promise(resolve => {
            store.add(token.onCancellationRequested(() => resolve({ type: 'cancel' })));
            store.add(quickPick.onDidAccept(() => {
                const selected = quickPick.selectedItems[0];
                if (selected) {
                    resolve({ type: 'value', value: selected.id });
                }
            }));
            store.add(quickPick.onDidTriggerButton(() => resolve({ type: 'back' })));
            store.add(quickPick.onDidHide(() => resolve({ type: 'cancel' })));
            quickPick.show();
        });
    }
    async _handleMultiEnumField(quickPick, schema, required, store, token) {
        const items = schema.enum.map(({ const: value, title }) => ({
            id: value,
            label: value,
            description: title,
            picked: !!schema.default?.includes(value),
            pickable: true,
        }));
        if (!required) {
            items.push(noneItem);
        }
        quickPick.canSelectMany = true;
        quickPick.items = items;
        return new Promise(resolve => {
            store.add(token.onCancellationRequested(() => resolve({ type: 'cancel' })));
            store.add(quickPick.onDidAccept(() => {
                const selected = quickPick.selectedItems[0];
                if (selected.id === undefined) {
                    resolve({ type: 'value', value: undefined });
                }
                else {
                    resolve({ type: 'value', value: quickPick.selectedItems.map(i => i.id).filter(isDefined) });
                }
            }));
            store.add(quickPick.onDidTriggerButton(() => resolve({ type: 'back' })));
            store.add(quickPick.onDidHide(() => resolve({ type: 'cancel' })));
            quickPick.show();
        });
    }
    async _handleInputField(quickPick, schema, required, store, token) {
        quickPick.canSelectMany = false;
        const updateItems = () => {
            const items = [];
            if (quickPick.value) {
                const validation = this._validateInput(quickPick.value, schema);
                quickPick.validationMessage = validation.message;
                if (validation.isValid) {
                    items.push({ id: '$current', label: `\u27A4 ${quickPick.value}` });
                }
            }
            else {
                quickPick.validationMessage = '';
                if (schema.default) {
                    items.push({ id: '$default', label: `${schema.default}`, description: localize('mcp.elicit.useDefault', 'Default value') });
                }
            }
            if (quickPick.validationMessage) {
                quickPick.severity = Severity.Warning;
            }
            else {
                quickPick.severity = Severity.Ignore;
                if (!required) {
                    items.push(noneItem);
                }
            }
            quickPick.items = items;
        };
        updateItems();
        return new Promise(resolve => {
            if (token.isCancellationRequested) {
                resolve({ type: 'cancel' });
                return;
            }
            store.add(token.onCancellationRequested(() => resolve({ type: 'cancel' })));
            store.add(quickPick.onDidChangeValue(updateItems));
            store.add(quickPick.onDidAccept(() => {
                const id = quickPick.selectedItems[0].id;
                if (!id) {
                    resolve({ type: 'value', value: undefined });
                }
                else if (id === '$default') {
                    resolve({ type: 'value', value: String(schema.default) });
                }
                else if (!quickPick.validationMessage) {
                    resolve({ type: 'value', value: quickPick.value });
                }
            }));
            store.add(quickPick.onDidTriggerButton(() => resolve({ type: 'back' })));
            store.add(quickPick.onDidHide(() => resolve({ type: 'cancel' })));
            quickPick.show();
        });
    }
    _validateInput(value, schema) {
        switch (schema.type) {
            case 'string':
                return this._validateString(value, schema);
            case 'number':
            case 'integer':
                return this._validateNumber(value, schema);
            default:
                assertNever(schema);
        }
    }
    _validateString(value, schema) {
        if (schema.minLength && value.length < schema.minLength) {
            return { isValid: false, message: localize('mcp.elicit.validation.minLength', 'Minimum length is {0}', schema.minLength) };
        }
        if (schema.maxLength && value.length > schema.maxLength) {
            return { isValid: false, message: localize('mcp.elicit.validation.maxLength', 'Maximum length is {0}', schema.maxLength) };
        }
        if (schema.format) {
            const formatValid = this._validateStringFormat(value, schema.format);
            if (!formatValid.isValid) {
                return formatValid;
            }
        }
        return { isValid: true, parsedValue: value };
    }
    _validateStringFormat(value, format) {
        switch (format) {
            case 'email':
                return value.includes('@')
                    ? { isValid: true }
                    : { isValid: false, message: localize('mcp.elicit.validation.email', 'Please enter a valid email address') };
            case 'uri':
                if (URL.canParse(value)) {
                    return { isValid: true };
                }
                else {
                    return { isValid: false, message: localize('mcp.elicit.validation.uri', 'Please enter a valid URI') };
                }
            case 'date': {
                const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                if (!dateRegex.test(value)) {
                    return { isValid: false, message: localize('mcp.elicit.validation.date', 'Please enter a valid date (YYYY-MM-DD)') };
                }
                const date = new Date(value);
                return !isNaN(date.getTime())
                    ? { isValid: true }
                    : { isValid: false, message: localize('mcp.elicit.validation.date', 'Please enter a valid date (YYYY-MM-DD)') };
            }
            case 'date-time': {
                const dateTime = new Date(value);
                return !isNaN(dateTime.getTime())
                    ? { isValid: true }
                    : { isValid: false, message: localize('mcp.elicit.validation.dateTime', 'Please enter a valid date-time') };
            }
            default:
                return { isValid: true };
        }
    }
    _validateNumber(value, schema) {
        const parsed = Number(value);
        if (isNaN(parsed)) {
            return { isValid: false, message: localize('mcp.elicit.validation.number', 'Please enter a valid number') };
        }
        if (schema.type === 'integer' && !Number.isInteger(parsed)) {
            return { isValid: false, message: localize('mcp.elicit.validation.integer', 'Please enter a valid integer') };
        }
        if (schema.minimum !== undefined && parsed < schema.minimum) {
            return { isValid: false, message: localize('mcp.elicit.validation.minimum', 'Minimum value is {0}', schema.minimum) };
        }
        if (schema.maximum !== undefined && parsed > schema.maximum) {
            return { isValid: false, message: localize('mcp.elicit.validation.maximum', 'Maximum value is {0}', schema.maximum) };
        }
        return { isValid: true, parsedValue: parsed };
    }
};
McpElicitationService = __decorate([
    __param(0, INotificationService),
    __param(1, IQuickInputService),
    __param(2, IChatService),
    __param(3, IOpenerService)
], McpElicitationService);
export { McpElicitationService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwRWxpY2l0YXRpb25TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FoYW1lZC9EZXNrdG9wL3B1a3UtdnMtZWRpdG9yL3B1a3UtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWNwL2Jyb3dzZXIvbWNwRWxpY2l0YXRpb25TZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM1RCxPQUFPLEVBQUUsV0FBVyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRWpGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN4RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDdkUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxRQUFRLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUMxRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDOUUsT0FBTyxFQUFFLGtCQUFrQixFQUE4QixNQUFNLHNEQUFzRCxDQUFDO0FBQ3RILE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUMzRCxPQUFPLEVBQW9C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