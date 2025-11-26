/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Registry } from '../../../../platform/registry/common/platform.js';
import { EditTelemetryContribution } from './editTelemetryContribution.js';
import { EDIT_TELEMETRY_SETTING_ID, AI_STATS_SETTING_ID } from './settingIds.js';
import { Extensions as ConfigurationExtensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { localize } from '../../../../nls.js';
import { EDIT_TELEMETRY_DETAILS_SETTING_ID, EDIT_TELEMETRY_SHOW_DECORATIONS, EDIT_TELEMETRY_SHOW_STATUS_BAR } from './settings.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IAiEditTelemetryService } from './telemetry/aiEditTelemetry/aiEditTelemetryService.js';
import { AiEditTelemetryServiceImpl } from './telemetry/aiEditTelemetry/aiEditTelemetryServiceImpl.js';
import { IRandomService, RandomService } from './randomService.js';
registerWorkbenchContribution2('EditTelemetryContribution', EditTelemetryContribution, 3 /* WorkbenchPhase.AfterRestored */);
const configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
configurationRegistry.registerConfiguration({
    id: 'task',
    order: 100,
    title: localize(7871, null),
    type: 'object',
    properties: {
        [EDIT_TELEMETRY_SETTING_ID]: {
            markdownDescription: localize(7872, null),
            type: 'boolean',
            default: true,
            tags: ['experimental'],
        },
        [AI_STATS_SETTING_ID]: {
            markdownDescription: localize(7873, null),
            type: 'boolean',
            default: false,
            tags: ['experimental'],
            experiment: {
                mode: 'auto'
            }
        },
        [EDIT_TELEMETRY_DETAILS_SETTING_ID]: {
            markdownDescription: localize(7874, null),
            type: 'boolean',
            default: false,
            tags: ['experimental'],
            experiment: {
                mode: 'auto'
            }
        },
        [EDIT_TELEMETRY_SHOW_STATUS_BAR]: {
            markdownDescription: localize(7875, null),
            type: 'boolean',
            default: false,
            tags: ['experimental'],
        },
        [EDIT_TELEMETRY_SHOW_DECORATIONS]: {
            markdownDescription: localize(7876, null),
            type: 'boolean',
            default: false,
            tags: ['experimental'],
        },
    }
});
registerSingleton(IAiEditTelemetryService, AiEditTelemetryServiceImpl, 1 /* InstantiationType.Delayed */);
registerSingleton(IRandomService, RandomService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=editTelemetry.contribution.js.map