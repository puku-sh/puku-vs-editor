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
import { ITerminalService } from './terminal.js';
import { localize } from '../../../../nls.js';
import { Codicon } from '../../../../base/common/codicons.js';
import Severity from '../../../../base/common/severity.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
let EnvironmentVariableInfoStale = class EnvironmentVariableInfoStale {
    constructor(_diff, _terminalId, _collection, _terminalService, _extensionService) {
        this._diff = _diff;
        this._terminalId = _terminalId;
        this._collection = _collection;
        this._terminalService = _terminalService;
        this._extensionService = _extensionService;
        this.requiresAction = true;
    }
    _getInfo(scope) {
        const extSet = new Set();
        addExtensionIdentifiers(extSet, this._diff.added.values());
        addExtensionIdentifiers(extSet, this._diff.removed.values());
        addExtensionIdentifiers(extSet, this._diff.changed.values());
        let message = localize(12557, null);
        message += getMergedDescription(this._collection, scope, this._extensionService, extSet);
        return message;
    }
    _getActions() {
        return [{
                label: localize(12558, null),
                run: () => this._terminalService.getInstanceFromId(this._terminalId)?.relaunch(),
                commandId: "workbench.action.terminal.relaunch" /* TerminalCommandId.Relaunch */
            }];
    }
    getStatus(scope) {
        return {
            id: "relaunch-needed" /* TerminalStatus.RelaunchNeeded */,
            severity: Severity.Warning,
            icon: Codicon.warning,
            tooltip: this._getInfo(scope),
            hoverActions: this._getActions()
        };
    }
};
EnvironmentVariableInfoStale = __decorate([
    __param(3, ITerminalService),
    __param(4, IExtensionService)
], EnvironmentVariableInfoStale);
export { EnvironmentVariableInfoStale };
let EnvironmentVariableInfoChangesActive = class EnvironmentVariableInfoChangesActive {
    constructor(_collection, _commandService, _extensionService) {
        this._collection = _collection;
        this._commandService = _commandService;
        this._extensionService = _extensionService;
        this.requiresAction = false;
    }
    _getInfo(scope) {
        const extSet = new Set();
        addExtensionIdentifiers(extSet, this._collection.getVariableMap(scope).values());
        let message = localize(12559, null);
        message += getMergedDescription(this._collection, scope, this._extensionService, extSet);
        return message;
    }
    _getActions(scope) {
        return [{
                label: localize(12560, null),
                run: () => this._commandService.executeCommand("workbench.action.terminal.showEnvironmentContributions" /* TerminalCommandId.ShowEnvironmentContributions */, scope),
                commandId: "workbench.action.terminal.showEnvironmentContributions" /* TerminalCommandId.ShowEnvironmentContributions */
            }];
    }
    getStatus(scope) {
        return {
            id: "env-var-info-changes-active" /* TerminalStatus.EnvironmentVariableInfoChangesActive */,
            severity: Severity.Info,
            tooltip: undefined, // The action is present when details aren't shown
            detailedTooltip: this._getInfo(scope),
            hoverActions: this._getActions(scope)
        };
    }
};
EnvironmentVariableInfoChangesActive = __decorate([
    __param(1, ICommandService),
    __param(2, IExtensionService)
], EnvironmentVariableInfoChangesActive);
export { EnvironmentVariableInfoChangesActive };
function getMergedDescription(collection, scope, extensionService, extSet) {
    const message = ['\n'];
    const globalDescriptions = collection.getDescriptionMap(undefined);
    const workspaceDescriptions = collection.getDescriptionMap(scope);
    for (const ext of extSet) {
        const globalDescription = globalDescriptions.get(ext);
        if (globalDescription) {
            message.push(`\n- \`${getExtensionName(ext, extensionService)}\``);
            message.push(`: ${globalDescription}`);
        }
        const workspaceDescription = workspaceDescriptions.get(ext);
        if (workspaceDescription) {
            // Only show '(workspace)' suffix if there is already a description for the extension.
            const workspaceSuffix = globalDescription ? ` (${localize(12561, null)})` : '';
            message.push(`\n- \`${getExtensionName(ext, extensionService)}${workspaceSuffix}\``);
            message.push(`: ${workspaceDescription}`);
        }
        if (!globalDescription && !workspaceDescription) {
            message.push(`\n- \`${getExtensionName(ext, extensionService)}\``);
        }
    }
    return message.join('');
}
function addExtensionIdentifiers(extSet, diff) {
    for (const mutators of diff) {
        for (const mutator of mutators) {
            extSet.add(mutator.extensionIdentifier);
        }
    }
}
function getExtensionName(id, extensionService) {
    return extensionService.extensions.find(e => e.id === id)?.displayName || id;
}
//# sourceMappingURL=environmentVariableInfo.js.map