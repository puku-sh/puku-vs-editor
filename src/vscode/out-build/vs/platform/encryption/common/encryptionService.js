/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../instantiation/common/instantiation.js';
export const IEncryptionService = createDecorator('encryptionService');
export const IEncryptionMainService = createDecorator('encryptionMainService');
// The values provided to the `password-store` command line switch.
// Notice that they are not the same as the values returned by
// `getSelectedStorageBackend` in the `safeStorage` API.
export var PasswordStoreCLIOption;
(function (PasswordStoreCLIOption) {
    PasswordStoreCLIOption["kwallet"] = "kwallet";
    PasswordStoreCLIOption["kwallet5"] = "kwallet5";
    PasswordStoreCLIOption["gnomeLibsecret"] = "gnome-libsecret";
    PasswordStoreCLIOption["basic"] = "basic";
})(PasswordStoreCLIOption || (PasswordStoreCLIOption = {}));
// The values returned by `getSelectedStorageBackend` in the `safeStorage` API.
export var KnownStorageProvider;
(function (KnownStorageProvider) {
    KnownStorageProvider["unknown"] = "unknown";
    KnownStorageProvider["basicText"] = "basic_text";
    // Linux
    KnownStorageProvider["gnomeAny"] = "gnome_any";
    KnownStorageProvider["gnomeLibsecret"] = "gnome_libsecret";
    KnownStorageProvider["gnomeKeyring"] = "gnome_keyring";
    KnownStorageProvider["kwallet"] = "kwallet";
    KnownStorageProvider["kwallet5"] = "kwallet5";
    KnownStorageProvider["kwallet6"] = "kwallet6";
    // The rest of these are not returned by `getSelectedStorageBackend`
    // but these were added for platform completeness.
    // Windows
    KnownStorageProvider["dplib"] = "dpapi";
    // macOS
    KnownStorageProvider["keychainAccess"] = "keychain_access";
})(KnownStorageProvider || (KnownStorageProvider = {}));
export function isKwallet(backend) {
    return backend === "kwallet" /* KnownStorageProvider.kwallet */
        || backend === "kwallet5" /* KnownStorageProvider.kwallet5 */
        || backend === "kwallet6" /* KnownStorageProvider.kwallet6 */;
}
export function isGnome(backend) {
    return backend === "gnome_any" /* KnownStorageProvider.gnomeAny */
        || backend === "gnome_libsecret" /* KnownStorageProvider.gnomeLibsecret */
        || backend === "gnome_keyring" /* KnownStorageProvider.gnomeKeyring */;
}
//# sourceMappingURL=encryptionService.js.map