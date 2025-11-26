import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
/**
 * Use this if you don't want the onDidChangeSessions event to fire in the extension host
 */
export const INTERNAL_AUTH_PROVIDER_PREFIX = '__';
export function isAuthenticationWwwAuthenticateRequest(obj) {
    return typeof obj === 'object'
        && obj !== null
        && 'wwwAuthenticate' in obj
        && (typeof obj.wwwAuthenticate === 'string');
}
export const IAuthenticationService = createDecorator('IAuthenticationService');
export function isAuthenticationSession(thing) {
    if (typeof thing !== 'object' || !thing) {
        return false;
    }
    const maybe = thing;
    if (typeof maybe.id !== 'string') {
        return false;
    }
    if (typeof maybe.accessToken !== 'string') {
        return false;
    }
    if (typeof maybe.account !== 'object' || !maybe.account) {
        return false;
    }
    if (typeof maybe.account.label !== 'string') {
        return false;
    }
    if (typeof maybe.account.id !== 'string') {
        return false;
    }
    if (!Array.isArray(maybe.scopes)) {
        return false;
    }
    if (maybe.idToken && typeof maybe.idToken !== 'string') {
        return false;
    }
    return true;
}
// TODO: Move this into MainThreadAuthentication
export const IAuthenticationExtensionsService = createDecorator('IAuthenticationExtensionsService');
//# sourceMappingURL=authentication.js.map