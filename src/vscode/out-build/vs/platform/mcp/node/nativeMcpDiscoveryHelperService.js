/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { homedir } from 'os';
import { platform } from '../../../base/common/platform.js';
import { URI } from '../../../base/common/uri.js';
export class NativeMcpDiscoveryHelperService {
    constructor() { }
    load() {
        return Promise.resolve({
            platform,
            homedir: URI.file(homedir()),
            winAppData: this.uriFromEnvVariable('APPDATA'),
            xdgHome: this.uriFromEnvVariable('XDG_CONFIG_HOME'),
        });
    }
    uriFromEnvVariable(varName) {
        const envVar = process.env[varName];
        if (!envVar) {
            return undefined;
        }
        return URI.file(envVar);
    }
}
//# sourceMappingURL=nativeMcpDiscoveryHelperService.js.map