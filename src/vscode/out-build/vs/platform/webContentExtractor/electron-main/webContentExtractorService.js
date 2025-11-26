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
import { BrowserWindow } from 'electron';
import { URI } from '../../../base/common/uri.js';
import { convertAXTreeToMarkdown } from './cdpAccessibilityDomain.js';
import { Limiter } from '../../../base/common/async.js';
import { ResourceMap } from '../../../base/common/map.js';
import { ILogService } from '../../log/common/log.js';
import { DisposableStore, toDisposable } from '../../../base/common/lifecycle.js';
import { CancellationError } from '../../../base/common/errors.js';
import { generateUuid } from '../../../base/common/uuid.js';
let NativeWebContentExtractorService = class NativeWebContentExtractorService {
    constructor(_logger) {
        this._logger = _logger;
        // Only allow 3 windows to be opened at a time
        // to avoid overwhelming the system with too many processes.
        this._limiter = new Limiter(3);
        this._webContentsCache = new ResourceMap();
        this._cacheDuration = 24 * 60 * 60 * 1000; // 1 day in milliseconds
    }
    isExpired(entry) {
        return Date.now() - entry.timestamp > this._cacheDuration;
    }
    extract(uris, options) {
        if (uris.length === 0) {
            this._logger.info('[NativeWebContentExtractorService] No URIs provided for extraction');
            return Promise.resolve([]);
        }
        this._logger.info(`[NativeWebContentExtractorService] Extracting content from ${uris.length} URIs`);
        return Promise.all(uris.map((uri) => this._limiter.queue(() => this.doExtract(uri, options))));
    }
    async doExtract(uri, options) {
        const cached = this._webContentsCache.get(uri);
        if (cached) {
            this._logger.info(`[NativeWebContentExtractorService] Found cached content for ${uri}`);
            if (this.isExpired(cached)) {
                this._logger.info(`[NativeWebContentExtractorService] Cache expired for ${uri}, removing entry...`);
                this._webContentsCache.delete(uri);
            }
            else if (!options?.followRedirects && cached.finalURI.authority !== uri.authority) {
                return { status: 'redirect', toURI: cached.finalURI };
            }
            else {
                return { status: 'ok', result: cached.result };
            }
        }
        this._logger.info(`[NativeWebContentExtractorService] Extracting content from ${uri}...`);
        const store = new DisposableStore();
        const win = new BrowserWindow({
            width: 800,
            height: 600,
            show: false,
            webPreferences: {
                partition: generateUuid(), // do not share any state with the default renderer session
                javascript: true,
                offscreen: true,
                sandbox: true,
                webgl: false
            }
        });
        store.add(toDisposable(() => win.destroy()));
        try {
            const result = options?.followRedirects
                ? await this.extractAX(win, uri)
                : await Promise.race([this.interceptRedirects(win, uri, store), this.extractAX(win, uri)]);
            if (result.status === 'ok') {
                this._webContentsCache.set(uri, { result: result.result, timestamp: Date.now(), finalURI: URI.parse(win.webContents.getURL()) });
            }
            return result;
        }
        catch (err) {
            this._logger.error(`[NativeWebContentExtractorService] Error extracting content from ${uri}: ${err}`);
            return { status: 'error', error: String(err) };
        }
        finally {
            store.dispose();
        }
    }
    async extractAX(win, uri) {
        await win.loadURL(uri.toString(true));
        win.webContents.debugger.attach('1.1');
        const result = await win.webContents.debugger.sendCommand('Accessibility.getFullAXTree');
        const str = convertAXTreeToMarkdown(uri, result.nodes);
        this._logger.info(`[NativeWebContentExtractorService] Content extracted from ${uri}`);
        this._logger.trace(`[NativeWebContentExtractorService] Extracted content: ${str}`);
        return { status: 'ok', result: str };
    }
    interceptRedirects(win, uri, store) {
        return new Promise((resolve, reject) => {
            const onNavigation = (e) => {
                const newURI = URI.parse(e.url);
                if (newURI.authority !== uri.authority) {
                    e.preventDefault();
                    resolve({ status: 'redirect', toURI: newURI });
                }
            };
            win.webContents.on('will-navigate', onNavigation);
            win.webContents.on('will-redirect', onNavigation);
            store.add(toDisposable(() => {
                reject(new CancellationError());
            }));
        });
    }
};
NativeWebContentExtractorService = __decorate([
    __param(0, ILogService)
], NativeWebContentExtractorService);
export { NativeWebContentExtractorService };
//# sourceMappingURL=webContentExtractorService.js.map