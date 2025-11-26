/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
export var ViewsWelcomeExtensionPointFields;
(function (ViewsWelcomeExtensionPointFields) {
    ViewsWelcomeExtensionPointFields["view"] = "view";
    ViewsWelcomeExtensionPointFields["contents"] = "contents";
    ViewsWelcomeExtensionPointFields["when"] = "when";
    ViewsWelcomeExtensionPointFields["group"] = "group";
    ViewsWelcomeExtensionPointFields["enablement"] = "enablement";
})(ViewsWelcomeExtensionPointFields || (ViewsWelcomeExtensionPointFields = {}));
export const ViewIdentifierMap = {
    'explorer': 'workbench.explorer.emptyView',
    'debug': 'workbench.debug.welcome',
    'scm': 'workbench.scm',
    'testing': 'workbench.view.testing'
};
const viewsWelcomeExtensionPointSchema = Object.freeze({
    type: 'array',
    description: nls.localize(14595, null),
    items: {
        type: 'object',
        description: nls.localize(14596, null),
        required: [
            ViewsWelcomeExtensionPointFields.view,
            ViewsWelcomeExtensionPointFields.contents
        ],
        properties: {
            [ViewsWelcomeExtensionPointFields.view]: {
                anyOf: [
                    {
                        type: 'string',
                        description: nls.localize(14597, null)
                    },
                    {
                        type: 'string',
                        description: nls.localize(14598, null),
                        enum: Object.keys(ViewIdentifierMap)
                    }
                ]
            },
            [ViewsWelcomeExtensionPointFields.contents]: {
                type: 'string',
                description: nls.localize(14599, null),
            },
            [ViewsWelcomeExtensionPointFields.when]: {
                type: 'string',
                description: nls.localize(14600, null),
            },
            [ViewsWelcomeExtensionPointFields.group]: {
                type: 'string',
                description: nls.localize(14601, null),
            },
            [ViewsWelcomeExtensionPointFields.enablement]: {
                type: 'string',
                description: nls.localize(14602, null),
            },
        }
    }
});
export const viewsWelcomeExtensionPointDescriptor = {
    extensionPoint: 'viewsWelcome',
    jsonSchema: viewsWelcomeExtensionPointSchema
};
//# sourceMappingURL=viewsWelcomeExtensionPoint.js.map