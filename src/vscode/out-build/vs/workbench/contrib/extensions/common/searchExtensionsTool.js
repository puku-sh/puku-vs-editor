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
import { Codicon } from '../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { localize } from '../../../../nls.js';
import { EXTENSION_CATEGORIES } from '../../../../platform/extensions/common/extensions.js';
import { ToolDataSource } from '../../chat/common/languageModelToolsService.js';
import { IExtensionsWorkbenchService } from '../common/extensions.js';
export const SearchExtensionsToolId = 'vscode_searchExtensions_internal';
export const SearchExtensionsToolData = {
    id: SearchExtensionsToolId,
    toolReferenceName: 'extensions',
    legacyToolReferenceFullNames: ['extensions'],
    icon: ThemeIcon.fromId(Codicon.extensions.id),
    displayName: localize(8554, null),
    modelDescription: 'This is a tool for browsing Visual Studio Code Extensions Marketplace. It allows the model to search for extensions and retrieve detailed information about them. The model should use this tool whenever it needs to discover extensions or resolve information about known ones. To use the tool, the model has to provide the category of the extensions, relevant search keywords, or known extension IDs. Note that search results may include false positives, so reviewing and filtering is recommended.',
    userDescription: localize(8555, null),
    source: ToolDataSource.Internal,
    inputSchema: {
        type: 'object',
        properties: {
            category: {
                type: 'string',
                description: 'The category of extensions to search for',
                enum: EXTENSION_CATEGORIES,
            },
            keywords: {
                type: 'array',
                items: {
                    type: 'string',
                },
                description: 'The keywords to search for',
            },
            ids: {
                type: 'array',
                items: {
                    type: 'string',
                },
                description: 'The ids of the extensions to search for',
            },
        },
    }
};
let SearchExtensionsTool = class SearchExtensionsTool {
    constructor(extensionWorkbenchService) {
        this.extensionWorkbenchService = extensionWorkbenchService;
    }
    async invoke(invocation, _countTokens, _progress, token) {
        const params = invocation.parameters;
        if (!params.keywords?.length && !params.category && !params.ids?.length) {
            return {
                content: [{
                        kind: 'text',
                        value: localize(8556, null)
                    }]
            };
        }
        const extensionsMap = new Map();
        const addExtension = (extensions) => {
            for (const extension of extensions) {
                if (extension.deprecationInfo || extension.isMalicious) {
                    continue;
                }
                extensionsMap.set(extension.identifier.id.toLowerCase(), {
                    id: extension.identifier.id,
                    name: extension.displayName,
                    description: extension.description,
                    installed: extension.state === 1 /* ExtensionState.Installed */,
                    installCount: extension.installCount ?? 0,
                    rating: extension.rating ?? 0,
                    categories: extension.categories ?? [],
                    tags: extension.gallery?.tags ?? []
                });
            }
        };
        const queryAndAddExtensions = async (text) => {
            const extensions = await this.extensionWorkbenchService.queryGallery({
                text,
                pageSize: 10,
                sortBy: "InstallCount" /* SortBy.InstallCount */
            }, token);
            if (extensions.firstPage.length) {
                addExtension(extensions.firstPage);
            }
        };
        // Search for extensions by their ids
        if (params.ids?.length) {
            const extensions = await this.extensionWorkbenchService.getExtensions(params.ids.map(id => ({ id })), token);
            addExtension(extensions);
        }
        if (params.keywords?.length) {
            for (const keyword of params.keywords ?? []) {
                if (keyword === 'featured') {
                    await queryAndAddExtensions('featured');
                }
                else {
                    let text = params.category ? `category:"${params.category}"` : '';
                    text = keyword ? `${text} ${keyword}`.trim() : text;
                    await queryAndAddExtensions(text);
                }
            }
        }
        else {
            await queryAndAddExtensions(`category:"${params.category}"`);
        }
        const result = Array.from(extensionsMap.values());
        return {
            content: [{
                    kind: 'text',
                    value: `Here are the list of extensions:\n${JSON.stringify(result)}\n. Important: Use the following format to display extensions to the user because there is a renderer available to parse these extensions in this format and display them with all details. So, do not describe about the extensions to the user.\n\`\`\`vscode-extensions\nextensionId1,extensionId2\n\`\`\`\n.`
                }],
            toolResultDetails: {
                input: JSON.stringify(params),
                output: [{ type: 'embed', isText: true, value: JSON.stringify(result.map(extension => extension.id)) }]
            }
        };
    }
};
SearchExtensionsTool = __decorate([
    __param(0, IExtensionsWorkbenchService)
], SearchExtensionsTool);
export { SearchExtensionsTool };
//# sourceMappingURL=searchExtensionsTool.js.map