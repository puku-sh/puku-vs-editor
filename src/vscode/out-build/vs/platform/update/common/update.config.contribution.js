/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isWeb, isWindows } from '../../../base/common/platform.js';
import { PolicyCategory } from '../../../base/common/policy.js';
import { localize } from '../../../nls.js';
import { Extensions as ConfigurationExtensions } from '../../configuration/common/configurationRegistry.js';
import { Registry } from '../../registry/common/platform.js';
const configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
configurationRegistry.registerConfiguration({
    id: 'update',
    order: 15,
    title: localize(2689, null),
    type: 'object',
    properties: {
        'update.mode': {
            type: 'string',
            enum: ['none', 'manual', 'start', 'default'],
            default: 'default',
            scope: 1 /* ConfigurationScope.APPLICATION */,
            description: localize(2690, null),
            tags: ['usesOnlineServices'],
            enumDescriptions: [
                localize(2691, null),
                localize(2692, null),
                localize(2693, null),
                localize(2694, null)
            ],
            policy: {
                name: 'UpdateMode',
                category: PolicyCategory.Update,
                minimumVersion: '1.67',
                localization: {
                    description: { key: 'updateMode', value: localize(2695, null), },
                    enumDescriptions: [
                        {
                            key: 'none',
                            value: localize(2696, null),
                        },
                        {
                            key: 'manual',
                            value: localize(2697, null),
                        },
                        {
                            key: 'start',
                            value: localize(2698, null),
                        },
                        {
                            key: 'default',
                            value: localize(2699, null),
                        }
                    ]
                },
            }
        },
        'update.channel': {
            type: 'string',
            default: 'default',
            scope: 1 /* ConfigurationScope.APPLICATION */,
            description: localize(2700, null),
            deprecationMessage: localize(2701, null, 'update.mode')
        },
        'update.enableWindowsBackgroundUpdates': {
            type: 'boolean',
            default: true,
            scope: 1 /* ConfigurationScope.APPLICATION */,
            title: localize(2702, null),
            description: localize(2703, null),
            included: isWindows && !isWeb
        },
        'update.showReleaseNotes': {
            type: 'boolean',
            default: true,
            scope: 1 /* ConfigurationScope.APPLICATION */,
            description: localize(2704, null),
            tags: ['usesOnlineServices']
        }
    }
});
//# sourceMappingURL=update.config.contribution.js.map