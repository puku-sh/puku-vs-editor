/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../nls.js';
/**
 * System-wide policy file path for Linux systems.
 */
export const LINUX_SYSTEM_POLICY_FILE_PATH = '/etc/vscode/policy.json';
export var PolicyCategory;
(function (PolicyCategory) {
    PolicyCategory["Extensions"] = "Extensions";
    PolicyCategory["IntegratedTerminal"] = "IntegratedTerminal";
    PolicyCategory["InteractiveSession"] = "InteractiveSession";
    PolicyCategory["Telemetry"] = "Telemetry";
    PolicyCategory["Update"] = "Update";
})(PolicyCategory || (PolicyCategory = {}));
export const PolicyCategoryData = {
    [PolicyCategory.Extensions]: {
        name: {
            key: 'extensionsConfigurationTitle', value: localize(145, null),
        }
    },
    [PolicyCategory.IntegratedTerminal]: {
        name: {
            key: 'terminalIntegratedConfigurationTitle', value: localize(146, null),
        }
    },
    [PolicyCategory.InteractiveSession]: {
        name: {
            key: 'interactiveSessionConfigurationTitle', value: localize(147, null),
        }
    },
    [PolicyCategory.Telemetry]: {
        name: {
            key: 'telemetryConfigurationTitle', value: localize(148, null),
        }
    },
    [PolicyCategory.Update]: {
        name: {
            key: 'updateConfigurationTitle', value: localize(149, null),
        }
    }
};
//# sourceMappingURL=policy.js.map