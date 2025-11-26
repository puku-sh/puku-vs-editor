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
import { Event } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { IProductService } from '../../product/common/productService.js';
let ExtensionGalleryManifestService = class ExtensionGalleryManifestService extends Disposable {
    get extensionGalleryManifestStatus() {
        return !!this.productService.extensionsGallery?.serviceUrl ? "available" /* ExtensionGalleryManifestStatus.Available */ : "unavailable" /* ExtensionGalleryManifestStatus.Unavailable */;
    }
    constructor(productService) {
        super();
        this.productService = productService;
        this.onDidChangeExtensionGalleryManifest = Event.None;
        this.onDidChangeExtensionGalleryManifestStatus = Event.None;
    }
    async getExtensionGalleryManifest() {
        const extensionsGallery = this.productService.extensionsGallery;
        if (!extensionsGallery?.serviceUrl) {
            return null;
        }
        const resources = [
            {
                id: `${extensionsGallery.serviceUrl}/extensionquery`,
                type: "ExtensionQueryService" /* ExtensionGalleryResourceType.ExtensionQueryService */
            },
            {
                id: `${extensionsGallery.serviceUrl}/vscode/{publisher}/{name}/latest`,
                type: "ExtensionLatestVersionUriTemplate" /* ExtensionGalleryResourceType.ExtensionLatestVersionUri */
            },
            {
                id: `${extensionsGallery.serviceUrl}/publishers/{publisher}/extensions/{name}/{version}/stats?statType={statTypeName}`,
                type: "ExtensionStatisticsUriTemplate" /* ExtensionGalleryResourceType.ExtensionStatisticsUri */
            },
            {
                id: `${extensionsGallery.serviceUrl}/itemName/{publisher}.{name}/version/{version}/statType/{statTypeValue}/vscodewebextension`,
                type: "WebExtensionStatisticsUriTemplate" /* ExtensionGalleryResourceType.WebExtensionStatisticsUri */
            },
        ];
        if (extensionsGallery.publisherUrl) {
            resources.push({
                id: `${extensionsGallery.publisherUrl}/{publisher}`,
                type: "PublisherViewUriTemplate" /* ExtensionGalleryResourceType.PublisherViewUri */
            });
        }
        if (extensionsGallery.itemUrl) {
            resources.push({
                id: `${extensionsGallery.itemUrl}?itemName={publisher}.{name}`,
                type: "ExtensionDetailsViewUriTemplate" /* ExtensionGalleryResourceType.ExtensionDetailsViewUri */
            });
            resources.push({
                id: `${extensionsGallery.itemUrl}?itemName={publisher}.{name}&ssr=false#review-details`,
                type: "ExtensionRatingViewUriTemplate" /* ExtensionGalleryResourceType.ExtensionRatingViewUri */
            });
        }
        if (extensionsGallery.resourceUrlTemplate) {
            resources.push({
                id: extensionsGallery.resourceUrlTemplate,
                type: "ExtensionResourceUriTemplate" /* ExtensionGalleryResourceType.ExtensionResourceUri */
            });
        }
        const filtering = [
            {
                name: "Tag" /* FilterType.Tag */,
                value: 1,
            },
            {
                name: "ExtensionId" /* FilterType.ExtensionId */,
                value: 4,
            },
            {
                name: "Category" /* FilterType.Category */,
                value: 5,
            },
            {
                name: "ExtensionName" /* FilterType.ExtensionName */,
                value: 7,
            },
            {
                name: "Target" /* FilterType.Target */,
                value: 8,
            },
            {
                name: "Featured" /* FilterType.Featured */,
                value: 9,
            },
            {
                name: "SearchText" /* FilterType.SearchText */,
                value: 10,
            },
            {
                name: "ExcludeWithFlags" /* FilterType.ExcludeWithFlags */,
                value: 12,
            },
        ];
        const sorting = [
            {
                name: "NoneOrRelevance" /* SortBy.NoneOrRelevance */,
                value: 0,
            },
            {
                name: "LastUpdatedDate" /* SortBy.LastUpdatedDate */,
                value: 1,
            },
            {
                name: "Title" /* SortBy.Title */,
                value: 2,
            },
            {
                name: "PublisherName" /* SortBy.PublisherName */,
                value: 3,
            },
            {
                name: "InstallCount" /* SortBy.InstallCount */,
                value: 4,
            },
            {
                name: "AverageRating" /* SortBy.AverageRating */,
                value: 6,
            },
            {
                name: "PublishedDate" /* SortBy.PublishedDate */,
                value: 10,
            },
            {
                name: "WeightedRating" /* SortBy.WeightedRating */,
                value: 12,
            },
        ];
        const flags = [
            {
                name: "None" /* Flag.None */,
                value: 0x0,
            },
            {
                name: "IncludeVersions" /* Flag.IncludeVersions */,
                value: 0x1,
            },
            {
                name: "IncludeFiles" /* Flag.IncludeFiles */,
                value: 0x2,
            },
            {
                name: "IncludeCategoryAndTags" /* Flag.IncludeCategoryAndTags */,
                value: 0x4,
            },
            {
                name: "IncludeSharedAccounts" /* Flag.IncludeSharedAccounts */,
                value: 0x8,
            },
            {
                name: "IncludeVersionProperties" /* Flag.IncludeVersionProperties */,
                value: 0x10,
            },
            {
                name: "ExcludeNonValidated" /* Flag.ExcludeNonValidated */,
                value: 0x20,
            },
            {
                name: "IncludeInstallationTargets" /* Flag.IncludeInstallationTargets */,
                value: 0x40,
            },
            {
                name: "IncludeAssetUri" /* Flag.IncludeAssetUri */,
                value: 0x80,
            },
            {
                name: "IncludeStatistics" /* Flag.IncludeStatistics */,
                value: 0x100,
            },
            {
                name: "IncludeLatestVersionOnly" /* Flag.IncludeLatestVersionOnly */,
                value: 0x200,
            },
            {
                name: "Unpublished" /* Flag.Unpublished */,
                value: 0x1000,
            },
            {
                name: "IncludeNameConflictInfo" /* Flag.IncludeNameConflictInfo */,
                value: 0x8000,
            },
            {
                name: "IncludeLatestPrereleaseAndStableVersionOnly" /* Flag.IncludeLatestPrereleaseAndStableVersionOnly */,
                value: 0x10000,
            },
        ];
        return {
            version: '',
            resources,
            capabilities: {
                extensionQuery: {
                    filtering,
                    sorting,
                    flags,
                },
                signing: {
                    allPublicRepositorySigned: true,
                }
            }
        };
    }
};
ExtensionGalleryManifestService = __decorate([
    __param(0, IProductService)
], ExtensionGalleryManifestService);
export { ExtensionGalleryManifestService };
//# sourceMappingURL=extensionGalleryManifestService.js.map