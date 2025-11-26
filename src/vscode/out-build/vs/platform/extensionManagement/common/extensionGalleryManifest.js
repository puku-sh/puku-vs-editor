/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../instantiation/common/instantiation.js';
export var ExtensionGalleryResourceType;
(function (ExtensionGalleryResourceType) {
    ExtensionGalleryResourceType["ExtensionQueryService"] = "ExtensionQueryService";
    ExtensionGalleryResourceType["ExtensionLatestVersionUri"] = "ExtensionLatestVersionUriTemplate";
    ExtensionGalleryResourceType["ExtensionStatisticsUri"] = "ExtensionStatisticsUriTemplate";
    ExtensionGalleryResourceType["WebExtensionStatisticsUri"] = "WebExtensionStatisticsUriTemplate";
    ExtensionGalleryResourceType["PublisherViewUri"] = "PublisherViewUriTemplate";
    ExtensionGalleryResourceType["ExtensionDetailsViewUri"] = "ExtensionDetailsViewUriTemplate";
    ExtensionGalleryResourceType["ExtensionRatingViewUri"] = "ExtensionRatingViewUriTemplate";
    ExtensionGalleryResourceType["ExtensionResourceUri"] = "ExtensionResourceUriTemplate";
    ExtensionGalleryResourceType["ContactSupportUri"] = "ContactSupportUri";
})(ExtensionGalleryResourceType || (ExtensionGalleryResourceType = {}));
export var Flag;
(function (Flag) {
    Flag["None"] = "None";
    Flag["IncludeVersions"] = "IncludeVersions";
    Flag["IncludeFiles"] = "IncludeFiles";
    Flag["IncludeCategoryAndTags"] = "IncludeCategoryAndTags";
    Flag["IncludeSharedAccounts"] = "IncludeSharedAccounts";
    Flag["IncludeVersionProperties"] = "IncludeVersionProperties";
    Flag["ExcludeNonValidated"] = "ExcludeNonValidated";
    Flag["IncludeInstallationTargets"] = "IncludeInstallationTargets";
    Flag["IncludeAssetUri"] = "IncludeAssetUri";
    Flag["IncludeStatistics"] = "IncludeStatistics";
    Flag["IncludeLatestVersionOnly"] = "IncludeLatestVersionOnly";
    Flag["Unpublished"] = "Unpublished";
    Flag["IncludeNameConflictInfo"] = "IncludeNameConflictInfo";
    Flag["IncludeLatestPrereleaseAndStableVersionOnly"] = "IncludeLatestPrereleaseAndStableVersionOnly";
})(Flag || (Flag = {}));
export var ExtensionGalleryManifestStatus;
(function (ExtensionGalleryManifestStatus) {
    ExtensionGalleryManifestStatus["Available"] = "available";
    ExtensionGalleryManifestStatus["RequiresSignIn"] = "requiresSignIn";
    ExtensionGalleryManifestStatus["AccessDenied"] = "accessDenied";
    ExtensionGalleryManifestStatus["Unavailable"] = "unavailable";
})(ExtensionGalleryManifestStatus || (ExtensionGalleryManifestStatus = {}));
export const IExtensionGalleryManifestService = createDecorator('IExtensionGalleryManifestService');
export function getExtensionGalleryManifestResourceUri(manifest, type) {
    const [name, version] = type.split('/');
    for (const resource of manifest.resources) {
        const [r, v] = resource.type.split('/');
        if (r !== name) {
            continue;
        }
        if (!version || v === version) {
            return resource.id;
        }
        break;
    }
    return undefined;
}
export const ExtensionGalleryServiceUrlConfigKey = 'extensions.gallery.serviceUrl';
//# sourceMappingURL=extensionGalleryManifest.js.map