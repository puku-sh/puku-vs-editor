/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isWeb, isWindows } from '../../../../base/common/platform.js';
import { localize } from '../../../../nls.js';
const defaultCommonlyUsedSettings = [
    'editor.fontSize',
    'editor.formatOnSave',
    'files.autoSave',
    'editor.defaultFormatter',
    'editor.fontFamily',
    'editor.wordWrap',
    'files.exclude',
    'workbench.colorTheme',
    'editor.tabSize',
    'editor.mouseWheelZoom',
    'editor.formatOnPaste'
];
export function getCommonlyUsedData(settingGroups, commonlyUsed = defaultCommonlyUsedSettings) {
    const allSettings = new Map();
    for (const group of settingGroups) {
        for (const section of group.sections) {
            for (const s of section.settings) {
                allSettings.set(s.key, s);
            }
        }
    }
    const settings = [];
    for (const id of commonlyUsed) {
        const setting = allSettings.get(id);
        if (setting) {
            settings.push(setting);
        }
    }
    return {
        id: 'commonlyUsed',
        label: localize(10954, null),
        settings
    };
}
export const tocData = {
    id: 'root',
    label: 'root',
    children: [
        {
            id: 'editor',
            label: localize(10955, null),
            settings: ['editor.*'],
            children: [
                {
                    id: 'editor/cursor',
                    label: localize(10956, null),
                    settings: ['editor.cursor*']
                },
                {
                    id: 'editor/find',
                    label: localize(10957, null),
                    settings: ['editor.find.*']
                },
                {
                    id: 'editor/font',
                    label: localize(10958, null),
                    settings: ['editor.font*']
                },
                {
                    id: 'editor/format',
                    label: localize(10959, null),
                    settings: ['editor.format*']
                },
                {
                    id: 'editor/diffEditor',
                    label: localize(10960, null),
                    settings: ['diffEditor.*']
                },
                {
                    id: 'editor/multiDiffEditor',
                    label: localize(10961, null),
                    settings: ['multiDiffEditor.*']
                },
                {
                    id: 'editor/minimap',
                    label: localize(10962, null),
                    settings: ['editor.minimap.*']
                },
                {
                    id: 'editor/suggestions',
                    label: localize(10963, null),
                    settings: ['editor.*suggest*']
                },
                {
                    id: 'editor/files',
                    label: localize(10964, null),
                    settings: ['files.*']
                }
            ]
        },
        {
            id: 'workbench',
            label: localize(10965, null),
            settings: ['workbench.*'],
            children: [
                {
                    id: 'workbench/appearance',
                    label: localize(10966, null),
                    settings: ['workbench.activityBar.*', 'workbench.*color*', 'workbench.fontAliasing', 'workbench.iconTheme', 'workbench.sidebar.location', 'workbench.*.visible', 'workbench.tips.enabled', 'workbench.tree.*', 'workbench.view.*']
                },
                {
                    id: 'workbench/breadcrumbs',
                    label: localize(10967, null),
                    settings: ['breadcrumbs.*']
                },
                {
                    id: 'workbench/editor',
                    label: localize(10968, null),
                    settings: ['workbench.editor.*']
                },
                {
                    id: 'workbench/settings',
                    label: localize(10969, null),
                    settings: ['workbench.settings.*']
                },
                {
                    id: 'workbench/zenmode',
                    label: localize(10970, null),
                    settings: ['zenmode.*']
                },
                {
                    id: 'workbench/screencastmode',
                    label: localize(10971, null),
                    settings: ['screencastMode.*']
                }
            ]
        },
        {
            id: 'window',
            label: localize(10972, null),
            settings: ['window.*'],
            children: [
                {
                    id: 'window/newWindow',
                    label: localize(10973, null),
                    settings: ['window.*newwindow*']
                }
            ]
        },
        {
            id: 'features',
            label: localize(10974, null),
            children: [
                {
                    id: 'features/accessibilitySignals',
                    label: localize(10975, null),
                    settings: ['accessibility.signal*']
                },
                {
                    id: 'features/accessibility',
                    label: localize(10976, null),
                    settings: ['accessibility.*']
                },
                {
                    id: 'features/explorer',
                    label: localize(10977, null),
                    settings: ['explorer.*', 'outline.*']
                },
                {
                    id: 'features/search',
                    label: localize(10978, null),
                    settings: ['search.*']
                },
                {
                    id: 'features/debug',
                    label: localize(10979, null),
                    settings: ['debug.*', 'launch']
                },
                {
                    id: 'features/testing',
                    label: localize(10980, null),
                    settings: ['testing.*']
                },
                {
                    id: 'features/scm',
                    label: localize(10981, null),
                    settings: ['scm.*']
                },
                {
                    id: 'features/extensions',
                    label: localize(10982, null),
                    settings: ['extensions.*']
                },
                {
                    id: 'features/terminal',
                    label: localize(10983, null),
                    settings: ['terminal.*']
                },
                {
                    id: 'features/task',
                    label: localize(10984, null),
                    settings: ['task.*']
                },
                {
                    id: 'features/problems',
                    label: localize(10985, null),
                    settings: ['problems.*']
                },
                {
                    id: 'features/output',
                    label: localize(10986, null),
                    settings: ['output.*']
                },
                {
                    id: 'features/comments',
                    label: localize(10987, null),
                    settings: ['comments.*']
                },
                {
                    id: 'features/remote',
                    label: localize(10988, null),
                    settings: ['remote.*']
                },
                {
                    id: 'features/timeline',
                    label: localize(10989, null),
                    settings: ['timeline.*']
                },
                {
                    id: 'features/notebook',
                    label: localize(10990, null),
                    settings: ['notebook.*', 'interactiveWindow.*']
                },
                {
                    id: 'features/mergeEditor',
                    label: localize(10991, null),
                    settings: ['mergeEditor.*']
                },
                {
                    id: 'features/chat',
                    label: localize(10992, null),
                    settings: ['chat.*', 'inlineChat.*', 'mcp']
                },
                {
                    id: 'features/issueReporter',
                    label: localize(10993, null),
                    settings: ['issueReporter.*'],
                    hide: !isWeb
                }
            ]
        },
        {
            id: 'application',
            label: localize(10994, null),
            children: [
                {
                    id: 'application/http',
                    label: localize(10995, null),
                    settings: ['http.*']
                },
                {
                    id: 'application/keyboard',
                    label: localize(10996, null),
                    settings: ['keyboard.*']
                },
                {
                    id: 'application/update',
                    label: localize(10997, null),
                    settings: ['update.*']
                },
                {
                    id: 'application/telemetry',
                    label: localize(10998, null),
                    settings: ['telemetry.*']
                },
                {
                    id: 'application/settingsSync',
                    label: localize(10999, null),
                    settings: ['settingsSync.*']
                },
                {
                    id: 'application/experimental',
                    label: localize(11000, null),
                    settings: ['application.experimental.*']
                },
                {
                    id: 'application/other',
                    label: localize(11001, null),
                    settings: ['application.*'],
                    hide: isWindows
                }
            ]
        },
        {
            id: 'security',
            label: localize(11002, null),
            settings: ['security.*'],
            children: [
                {
                    id: 'security/workspace',
                    label: localize(11003, null),
                    settings: ['security.workspace.*']
                }
            ]
        }
    ]
};
//# sourceMappingURL=settingsLayout.js.map