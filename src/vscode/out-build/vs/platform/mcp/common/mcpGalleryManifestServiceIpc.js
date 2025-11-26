/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Barrier } from '../../../base/common/async.js';
import { Emitter, Event } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
export class McpGalleryManifestIPCService extends Disposable {
    get mcpGalleryManifestStatus() {
        return this._mcpGalleryManifest ? "available" /* McpGalleryManifestStatus.Available */ : "unavailable" /* McpGalleryManifestStatus.Unavailable */;
    }
    constructor(server) {
        super();
        this._onDidChangeMcpGalleryManifest = this._register(new Emitter());
        this.onDidChangeMcpGalleryManifest = this._onDidChangeMcpGalleryManifest.event;
        this._onDidChangeMcpGalleryManifestStatus = this._register(new Emitter());
        this.onDidChangeMcpGalleryManifestStatus = this._onDidChangeMcpGalleryManifestStatus.event;
        this.barrier = new Barrier();
        server.registerChannel('mcpGalleryManifest', {
            listen: () => Event.None,
            call: async (context, command, args) => {
                switch (command) {
                    case 'setMcpGalleryManifest': {
                        const manifest = Array.isArray(args) ? args[0] : null;
                        return Promise.resolve(this.setMcpGalleryManifest(manifest));
                    }
                }
                throw new Error('Invalid call');
            }
        });
    }
    async getMcpGalleryManifest() {
        await this.barrier.wait();
        return this._mcpGalleryManifest ?? null;
    }
    setMcpGalleryManifest(manifest) {
        this._mcpGalleryManifest = manifest;
        this._onDidChangeMcpGalleryManifest.fire(manifest);
        this._onDidChangeMcpGalleryManifestStatus.fire(this.mcpGalleryManifestStatus);
        this.barrier.open();
    }
}
//# sourceMappingURL=mcpGalleryManifestServiceIpc.js.map