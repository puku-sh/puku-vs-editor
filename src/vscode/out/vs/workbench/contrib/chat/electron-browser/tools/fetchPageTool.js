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
import { assertNever } from '../../../../../base/common/assert.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { Iterable } from '../../../../../base/common/iterator.js';
import { ResourceSet } from '../../../../../base/common/map.js';
import { extname } from '../../../../../base/common/path.js';
import { URI } from '../../../../../base/common/uri.js';
import { localize } from '../../../../../nls.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IWebContentExtractorService } from '../../../../../platform/webContentExtractor/common/webContentExtractor.js';
import { detectEncodingFromBuffer } from '../../../../services/textfile/common/encoding.js';
import { ITrustedDomainService } from '../../../url/browser/trustedDomainService.js';
import { IChatService } from '../../common/chatService.js';
import { LocalChatSessionUri } from '../../common/chatUri.js';
import { ChatImageMimeType } from '../../common/languageModels.js';
import { ToolDataSource } from '../../common/languageModelToolsService.js';
import { InternalFetchWebPageToolId } from '../../common/tools/tools.js';
export const FetchWebPageToolData = {
    id: InternalFetchWebPageToolId,
    displayName: 'Fetch Web Page',
    canBeReferencedInPrompt: false,
    modelDescription: 'Fetches the main content from a web page. This tool is useful for summarizing or analyzing the content of a webpage.',
    source: ToolDataSource.Internal,
    canRequestPostApproval: true,
    canRequestPreApproval: true,
    inputSchema: {
        type: 'object',
        properties: {
            urls: {
                type: 'array',
                items: {
                    type: 'string',
                },
                description: localize('fetchWebPage.urlsDescription', 'An array of URLs to fetch content from.')
            }
        },
        required: ['urls']
    }
};
let FetchWebPageTool = class FetchWebPageTool {
    constructor(_readerModeService, _fileService, _trustedDomainService, _chatService) {
        this._readerModeService = _readerModeService;
        this._fileService = _fileService;
        this._trustedDomainService = _trustedDomainService;
        this._chatService = _chatService;
    }
    async invoke(invocation, _countTokens, _progress, token) {
        const urls = invocation.parameters.urls || [];
        const { webUris, fileUris, invalidUris } = this._parseUris(urls);
        const allValidUris = [...webUris.values(), ...fileUris.values()];
        if (!allValidUris.length && invalidUris.size === 0) {
            return {
                content: [{ kind: 'text', value: localize('fetchWebPage.noValidUrls', 'No valid URLs provided.') }]
            };
        }
        // Get contents from web URIs
        const webContents = webUris.size > 0 ? await this._readerModeService.extract([...webUris.values()]) : [];
        // Get contents from file URIs
        const fileContents = [];
        const successfulFileUris = [];
        for (const uri of fileUris.values()) {
            try {
                const fileContent = await this._fileService.readFile(uri, undefined, token);
                // Check if this is a supported image type first
                const imageMimeType = this._getSupportedImageMimeType(uri);
                if (imageMimeType) {
                    // For supported image files, return as IToolResultDataPart
                    fileContents.push({
                        type: 'tooldata',
                        value: {
                            kind: 'data',
                            value: {
                                mimeType: imageMimeType,
                                data: fileContent.value
                            }
                        }
                    });
                }
                else {
                    // Check if the content is binary
                    const detected = detectEncodingFromBuffer({ buffer: fileContent.value, bytesRead: fileContent.value.byteLength });
                    if (detected.seemsBinary) {
                        // For binary files, return a message indicating they're not supported
                        // We do this for now until the tools that leverage this internal tool can support binary content
                        fileContents.push(localize('fetchWebPage.binaryNotSupported', 'Binary files are not supported at the moment.'));
                    }
                    else {
                        // For text files, convert to string
                        fileContents.push(fileContent.value.toString());
                    }
                }
                successfulFileUris.push(uri);
            }
            catch (error) {
                // If file service can't read it, treat as invalid
                fileContents.push(undefined);
            }
        }
        // Build results array in original order
        const results = [];
        let webIndex = 0;
        let fileIndex = 0;
        for (const url of urls) {
            if (invalidUris.has(url)) {
                results.push(undefined);
            }
            else if (webUris.has(url)) {
                results.push({ type: 'extracted', value: webContents[webIndex] });
                webIndex++;
            }
            else if (fileUris.has(url)) {
                results.push(fileContents[fileIndex]);
                fileIndex++;
            }
            else {
                results.push(undefined);
            }
        }
        // Skip confirming any results if every web content we got was an error or redirect
        let confirmResults;
        if (webContents.every(e => e.status === 'error' || e.status === 'redirect')) {
            confirmResults = false;
        }
        // Only include URIs that actually had content successfully fetched
        const actuallyValidUris = [...webUris.values(), ...successfulFileUris];
        return {
            content: this._getPromptPartsForResults(results),
            toolResultDetails: actuallyValidUris,
            confirmResults,
        };
    }
    async prepareToolInvocation(context, token) {
        const { webUris, fileUris, invalidUris } = this._parseUris(context.parameters.urls);
        // Check which file URIs can actually be read
        const validFileUris = [];
        const additionalInvalidUrls = [];
        for (const [originalUrl, uri] of fileUris.entries()) {
            try {
                await this._fileService.stat(uri);
                validFileUris.push(uri);
            }
            catch (error) {
                // If file service can't stat it, treat as invalid
                additionalInvalidUrls.push(originalUrl);
            }
        }
        const invalid = [...Array.from(invalidUris), ...additionalInvalidUrls];
        const urlsNeedingConfirmation = new ResourceSet([...webUris.values(), ...validFileUris]);
        const pastTenseMessage = invalid.length
            ? invalid.length > 1
                // If there are multiple invalid URLs, show them all
                ? new MarkdownString(localize('fetchWebPage.pastTenseMessage.plural', 'Fetched {0} resources, but the following were invalid URLs:\n\n{1}\n\n', urlsNeedingConfirmation.size, invalid.map(url => `- ${url}`).join('\n')))
                // If there is only one invalid URL, show it
                : new MarkdownString(localize('fetchWebPage.pastTenseMessage.singular', 'Fetched resource, but the following was an invalid URL:\n\n{0}\n\n', invalid[0]))
            // No invalid URLs
            : new MarkdownString();
        const invocationMessage = new MarkdownString();
        if (urlsNeedingConfirmation.size > 1) {
            pastTenseMessage.appendMarkdown(localize('fetchWebPage.pastTenseMessageResult.plural', 'Fetched {0} resources', urlsNeedingConfirmation.size));
            invocationMessage.appendMarkdown(localize('fetchWebPage.invocationMessage.plural', 'Fetching {0} resources', urlsNeedingConfirmation.size));
        }
        else if (urlsNeedingConfirmation.size === 1) {
            const url = Iterable.first(urlsNeedingConfirmation).toString();
            // If the URL is too long or it's a file url, show it as a link... otherwise, show it as plain text
            if (url.length > 400 || validFileUris.length === 1) {
                pastTenseMessage.appendMarkdown(localize({
                    key: 'fetchWebPage.pastTenseMessageResult.singularAsLink',
                    comment: [
                        // Make sure the link syntax is correct
                        '{Locked="]({0})"}',
                    ]
                }, 'Fetched [resource]({0})', url));
                invocationMessage.appendMarkdown(localize({
                    key: 'fetchWebPage.invocationMessage.singularAsLink',
                    comment: [
                        // Make sure the link syntax is correct
                        '{Locked="]({0})"}',
                    ]
                }, 'Fetching [resource]({0})', url));
            }
            else {
                pastTenseMessage.appendMarkdown(localize('fetchWebPage.pastTenseMessageResult.singular', 'Fetched {0}', url));
                invocationMessage.appendMarkdown(localize('fetchWebPage.invocationMessage.singular', 'Fetching {0}', url));
            }
        }
        if (context.chatSessionId) {
            const model = this._chatService.getSession(LocalChatSessionUri.forSession(context.chatSessionId));
            const userMessages = model?.getRequests().map(r => r.message.text.toLowerCase());
            for (const uri of urlsNeedingConfirmation) {
                // Normalize to lowercase and remove any trailing slash
                const toToCheck = uri.toString(true).toLowerCase().replace(/\/$/, '');
                if (userMessages?.some(m => m.includes(toToCheck))) {
                    urlsNeedingConfirmation.delete(uri);
                }
            }
        }
        const result = { invocationMessage, pastTenseMessage };
        const allDomainsTrusted = Iterable.every(urlsNeedingConfirmation, u => this._trustedDomainService.isValid(u));
        let confirmationTitle;
        let confirmationMessage;
        if (urlsNeedingConfirmation.size && !allDomainsTrusted) {
            if (urlsNeedingConfirmation.size === 1) {
                confirmationTitle = localize('fetchWebPage.confirmationTitle.singular', 'Fetch web page?');
                confirmationMessage = new MarkdownString(Iterable.first(urlsNeedingConfirmation).toString(), { supportThemeIcons: true });
            }
            else {
                confirmationTitle = localize('fetchWebPage.confirmationTitle.plural', 'Fetch web pages?');
                confirmationMessage = new MarkdownString([...urlsNeedingConfirmation].map(uri => `- ${uri.toString()}`).join('\n'), { supportThemeIcons: true });
            }
        }
        result.confirmationMessages = {
            title: confirmationTitle,
            message: confirmationMessage,
            confirmResults: urlsNeedingConfirmation.size > 0,
            allowAutoConfirm: true,
            disclaimer: new MarkdownString('$(info) ' + localize('fetchWebPage.confirmationMessage.plural', 'Web content may contain malicious code or attempt prompt injection attacks.'), { supportThemeIcons: true })
        };
        return result;
    }
    _parseUris(urls) {
        const webUris = new Map();
        const fileUris = new Map();
        const invalidUris = new Set();
        urls?.forEach(url => {
            try {
                const uriObj = URI.parse(url);
                if (uriObj.scheme === 'http' || uriObj.scheme === 'https') {
                    webUris.set(url, uriObj);
                }
                else {
                    // Try to handle other schemes via file service
                    fileUris.set(url, uriObj);
                }
            }
            catch (e) {
                invalidUris.add(url);
            }
        });
        return { webUris, fileUris, invalidUris };
    }
    _getPromptPartsForResults(results) {
        return results.map(value => {
            if (!value) {
                return {
                    kind: 'text',
                    value: localize('fetchWebPage.invalidUrl', 'Invalid URL')
                };
            }
            else if (typeof value === 'string') {
                return {
                    kind: 'text',
                    value: value
                };
            }
            else if (value.type === 'tooldata') {
                return value.value;
            }
            else if (value.type === 'extracted') {
                switch (value.value.status) {
                    case 'ok':
                        return { kind: 'text', value: value.value.result };
                    case 'redirect':
                        return { kind: 'text', value: `The webpage has redirected to "${value.value.toURI.toString(true)}". Use the ${InternalFetchWebPageToolId} again to get its contents.` };
                    case 'error':
                        return { kind: 'text', value: `An error occurred retrieving the fetch result: ${value.value.error}` };
                    default:
                        assertNever(value.value);
                }
            }
            else {
                throw new Error('unreachable');
            }
        });
    }
    _getSupportedImageMimeType(uri) {
        const ext = extname(uri.path).toLowerCase();
        switch (ext) {
            case '.png':
                return ChatImageMimeType.PNG;
            case '.jpg':
            case '.jpeg':
                return ChatImageMimeType.JPEG;
            case '.gif':
                return ChatImageMimeType.GIF;
            case '.webp':
                return ChatImageMimeType.WEBP;
            case '.bmp':
                return ChatImageMimeType.BMP;
            default:
                return undefined;
        }
    }
};
FetchWebPageTool = __decorate([
    __param(0, IWebContentExtractorService),
    __param(1, IFileService),
    __param(2, ITrustedDomainService),
    __param(3, IChatService)
], FetchWebPageTool);
export { FetchWebPageTool };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmV0Y2hQYWdlVG9vbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhaGFtZWQvRGVza3RvcC9wdWt1LXZzLWVkaXRvci9wdWt1LWVkaXRvci9zcmMvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvZWxlY3Ryb24tYnJvd3Nlci90b29scy9mZXRjaFBhZ2VUb29sLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUVuRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDM0UsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDN0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNqRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDN0UsT0FBTyxFQUFFLDJCQUEyQixFQUEyQixNQUFNLDJFQUEyRSxDQUFDO0FBQ2pKLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUMzRCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUM5RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNuRSxPQUFPLEVBQWlMLGNBQWMsRUFBZ0IsTUFBTSwy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