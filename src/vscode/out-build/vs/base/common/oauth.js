/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { decodeBase64 } from './buffer.js';
const WELL_KNOWN_ROUTE = '/.well-known';
export const AUTH_PROTECTED_RESOURCE_METADATA_DISCOVERY_PATH = `${WELL_KNOWN_ROUTE}/oauth-protected-resource`;
export const AUTH_SERVER_METADATA_DISCOVERY_PATH = `${WELL_KNOWN_ROUTE}/oauth-authorization-server`;
export const OPENID_CONNECT_DISCOVERY_PATH = `${WELL_KNOWN_ROUTE}/openid-configuration`;
export const AUTH_SCOPE_SEPARATOR = ' ';
//#region types
/**
 * Base OAuth 2.0 error codes as specified in RFC 6749.
 */
export var AuthorizationErrorType;
(function (AuthorizationErrorType) {
    AuthorizationErrorType["InvalidRequest"] = "invalid_request";
    AuthorizationErrorType["InvalidClient"] = "invalid_client";
    AuthorizationErrorType["InvalidGrant"] = "invalid_grant";
    AuthorizationErrorType["UnauthorizedClient"] = "unauthorized_client";
    AuthorizationErrorType["UnsupportedGrantType"] = "unsupported_grant_type";
    AuthorizationErrorType["InvalidScope"] = "invalid_scope";
})(AuthorizationErrorType || (AuthorizationErrorType = {}));
/**
 * Device authorization grant specific error codes as specified in RFC 8628 section 3.5.
 */
export var AuthorizationDeviceCodeErrorType;
(function (AuthorizationDeviceCodeErrorType) {
    /**
     * The authorization request is still pending as the end user hasn't completed the user interaction steps.
     */
    AuthorizationDeviceCodeErrorType["AuthorizationPending"] = "authorization_pending";
    /**
     * A variant of "authorization_pending", polling should continue but interval must be increased by 5 seconds.
     */
    AuthorizationDeviceCodeErrorType["SlowDown"] = "slow_down";
    /**
     * The authorization request was denied.
     */
    AuthorizationDeviceCodeErrorType["AccessDenied"] = "access_denied";
    /**
     * The "device_code" has expired and the device authorization session has concluded.
     */
    AuthorizationDeviceCodeErrorType["ExpiredToken"] = "expired_token";
})(AuthorizationDeviceCodeErrorType || (AuthorizationDeviceCodeErrorType = {}));
/**
 * Dynamic client registration specific error codes as specified in RFC 7591.
 */
export var AuthorizationRegistrationErrorType;
(function (AuthorizationRegistrationErrorType) {
    /**
     * The value of one or more redirection URIs is invalid.
     */
    AuthorizationRegistrationErrorType["InvalidRedirectUri"] = "invalid_redirect_uri";
    /**
     * The value of one of the client metadata fields is invalid and the server has rejected this request.
     */
    AuthorizationRegistrationErrorType["InvalidClientMetadata"] = "invalid_client_metadata";
    /**
     * The software statement presented is invalid.
     */
    AuthorizationRegistrationErrorType["InvalidSoftwareStatement"] = "invalid_software_statement";
    /**
     * The software statement presented is not approved for use by this authorization server.
     */
    AuthorizationRegistrationErrorType["UnapprovedSoftwareStatement"] = "unapproved_software_statement";
})(AuthorizationRegistrationErrorType || (AuthorizationRegistrationErrorType = {}));
//#endregion
//#region is functions
export function isAuthorizationProtectedResourceMetadata(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return false;
    }
    const metadata = obj;
    if (!metadata.resource) {
        return false;
    }
    if (metadata.scopes_supported !== undefined && !Array.isArray(metadata.scopes_supported)) {
        return false;
    }
    return true;
}
const urisToCheck = [
    'issuer',
    'authorization_endpoint',
    'token_endpoint',
    'registration_endpoint',
    'jwks_uri'
];
export function isAuthorizationServerMetadata(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return false;
    }
    const metadata = obj;
    if (!metadata.issuer) {
        throw new Error('Authorization server metadata must have an issuer');
    }
    for (const uri of urisToCheck) {
        if (!metadata[uri]) {
            continue;
        }
        if (typeof metadata[uri] !== 'string') {
            throw new Error(`Authorization server metadata '${uri}' must be a string`);
        }
        if (!metadata[uri].startsWith('https://') && !metadata[uri].startsWith('http://')) {
            throw new Error(`Authorization server metadata '${uri}' must start with http:// or https://`);
        }
    }
    return true;
}
export function isAuthorizationDynamicClientRegistrationResponse(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return false;
    }
    const response = obj;
    return response.client_id !== undefined;
}
export function isAuthorizationAuthorizeResponse(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return false;
    }
    const response = obj;
    return response.code !== undefined && response.state !== undefined;
}
export function isAuthorizationTokenResponse(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return false;
    }
    const response = obj;
    return response.access_token !== undefined && response.token_type !== undefined;
}
export function isAuthorizationDeviceResponse(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return false;
    }
    const response = obj;
    return response.device_code !== undefined && response.user_code !== undefined && response.verification_uri !== undefined && response.expires_in !== undefined;
}
export function isAuthorizationErrorResponse(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return false;
    }
    const response = obj;
    return response.error !== undefined;
}
export function isAuthorizationRegistrationErrorResponse(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return false;
    }
    const response = obj;
    return response.error !== undefined;
}
//#endregion
export function getDefaultMetadataForUrl(authorizationServer) {
    return {
        issuer: authorizationServer.toString(),
        authorization_endpoint: new URL('/authorize', authorizationServer).toString(),
        token_endpoint: new URL('/token', authorizationServer).toString(),
        registration_endpoint: new URL('/register', authorizationServer).toString(),
        // Default values for Dynamic OpenID Providers
        // https://openid.net/specs/openid-connect-discovery-1_0.html
        response_types_supported: ['code', 'id_token', 'id_token token'],
    };
}
/**
 * The grant types that we support
 */
const grantTypesSupported = ['authorization_code', 'refresh_token', 'urn:ietf:params:oauth:grant-type:device_code'];
/**
 * Default port for the authorization flow. We try to use this port so that
 * the redirect URI does not change when running on localhost. This is useful
 * for servers that only allow exact matches on the redirect URI. The spec
 * says that the port should not matter, but some servers do not follow
 * the spec and require an exact match.
 */
export const DEFAULT_AUTH_FLOW_PORT = 33418;
export async function fetchDynamicRegistration(serverMetadata, clientName, scopes) {
    if (!serverMetadata.registration_endpoint) {
        throw new Error('Server does not support dynamic registration');
    }
    const requestBody = {
        client_name: clientName,
        client_uri: 'https://code.visualstudio.com',
        grant_types: serverMetadata.grant_types_supported
            ? serverMetadata.grant_types_supported.filter(gt => grantTypesSupported.includes(gt))
            : grantTypesSupported,
        response_types: ['code'],
        redirect_uris: [
            'https://insiders.vscode.dev/redirect',
            'https://vscode.dev/redirect',
            'http://127.0.0.1/',
            // Added these for any server that might do
            // only exact match on the redirect URI even
            // though the spec says it should not care
            // about the port.
            `http://127.0.0.1:${DEFAULT_AUTH_FLOW_PORT}/`
        ],
        scope: scopes?.join(AUTH_SCOPE_SEPARATOR),
        token_endpoint_auth_method: 'none',
        application_type: 'native'
    };
    const response = await fetch(serverMetadata.registration_endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    });
    if (!response.ok) {
        const result = await response.text();
        let errorDetails = result;
        try {
            const errorResponse = JSON.parse(result);
            if (isAuthorizationRegistrationErrorResponse(errorResponse)) {
                errorDetails = `${errorResponse.error}${errorResponse.error_description ? `: ${errorResponse.error_description}` : ''}`;
            }
        }
        catch {
            // JSON parsing failed, use raw text
        }
        throw new Error(`Registration to ${serverMetadata.registration_endpoint} failed: ${errorDetails}`);
    }
    const registration = await response.json();
    if (isAuthorizationDynamicClientRegistrationResponse(registration)) {
        return registration;
    }
    throw new Error(`Invalid authorization dynamic client registration response: ${JSON.stringify(registration)}`);
}
export function parseWWWAuthenticateHeader(wwwAuthenticateHeaderValue) {
    const challenges = [];
    // According to RFC 7235, multiple challenges are separated by commas
    // But parameters within a challenge can also be separated by commas
    // We need to identify scheme names to know where challenges start
    // First, split by commas while respecting quoted strings
    const tokens = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < wwwAuthenticateHeaderValue.length; i++) {
        const char = wwwAuthenticateHeaderValue[i];
        if (char === '"') {
            inQuotes = !inQuotes;
            current += char;
        }
        else if (char === ',' && !inQuotes) {
            if (current.trim()) {
                tokens.push(current.trim());
            }
            current = '';
        }
        else {
            current += char;
        }
    }
    if (current.trim()) {
        tokens.push(current.trim());
    }
    // Now process tokens to identify challenges
    // A challenge starts with a scheme name (a token that doesn't contain '=' and is followed by parameters or is standalone)
    let currentChallenge;
    for (const token of tokens) {
        const hasEquals = token.includes('=');
        if (!hasEquals) {
            // This token doesn't have '=', so it's likely a scheme name
            if (currentChallenge) {
                challenges.push(currentChallenge);
            }
            currentChallenge = { scheme: token.trim(), params: {} };
        }
        else {
            // This token has '=', it could be:
            // 1. A parameter for the current challenge
            // 2. A new challenge that starts with "Scheme param=value"
            const spaceIndex = token.indexOf(' ');
            if (spaceIndex > 0) {
                const beforeSpace = token.substring(0, spaceIndex);
                const afterSpace = token.substring(spaceIndex + 1);
                // Check if what's before the space looks like a scheme name (no '=')
                if (!beforeSpace.includes('=') && afterSpace.includes('=')) {
                    // This is a new challenge starting with "Scheme param=value"
                    if (currentChallenge) {
                        challenges.push(currentChallenge);
                    }
                    currentChallenge = { scheme: beforeSpace.trim(), params: {} };
                    // Parse the parameter part
                    const equalIndex = afterSpace.indexOf('=');
                    if (equalIndex > 0) {
                        const key = afterSpace.substring(0, equalIndex).trim();
                        const value = afterSpace.substring(equalIndex + 1).trim().replace(/^"|"$/g, '');
                        if (key && value !== undefined) {
                            currentChallenge.params[key] = value;
                        }
                    }
                    continue;
                }
            }
            // This is a parameter for the current challenge
            if (currentChallenge) {
                const equalIndex = token.indexOf('=');
                if (equalIndex > 0) {
                    const key = token.substring(0, equalIndex).trim();
                    const value = token.substring(equalIndex + 1).trim().replace(/^"|"$/g, '');
                    if (key && value !== undefined) {
                        currentChallenge.params[key] = value;
                    }
                }
            }
        }
    }
    // Don't forget the last challenge
    if (currentChallenge) {
        challenges.push(currentChallenge);
    }
    return challenges;
}
export function getClaimsFromJWT(token) {
    const parts = token.split('.');
    if (parts.length !== 3) {
        throw new Error('Invalid JWT token format: token must have three parts separated by dots');
    }
    const [header, payload, _signature] = parts;
    try {
        const decodedHeader = JSON.parse(decodeBase64(header).toString());
        if (typeof decodedHeader !== 'object') {
            throw new Error('Invalid JWT token format: header is not a JSON object');
        }
        const decodedPayload = JSON.parse(decodeBase64(payload).toString());
        if (typeof decodedPayload !== 'object') {
            throw new Error('Invalid JWT token format: payload is not a JSON object');
        }
        return decodedPayload;
    }
    catch (e) {
        if (e instanceof Error) {
            throw new Error(`Failed to parse JWT token: ${e.message}`);
        }
        throw new Error('Failed to parse JWT token');
    }
}
/**
 * Checks if two scope lists are equivalent, regardless of order.
 * This is useful for comparing OAuth scopes where the order should not matter.
 *
 * @param scopes1 First list of scopes to compare (can be undefined)
 * @param scopes2 Second list of scopes to compare (can be undefined)
 * @returns true if the scope lists contain the same scopes (order-independent), false otherwise
 *
 * @example
 * ```typescript
 * scopesMatch(['read', 'write'], ['write', 'read']) // Returns: true
 * scopesMatch(['read'], ['write']) // Returns: false
 * scopesMatch(undefined, undefined) // Returns: true
 * scopesMatch(['read'], undefined) // Returns: false
 * ```
 */
export function scopesMatch(scopes1, scopes2) {
    if (scopes1 === scopes2) {
        return true;
    }
    if (!scopes1 || !scopes2) {
        return false;
    }
    if (scopes1.length !== scopes2.length) {
        return false;
    }
    // Sort both arrays for comparison to handle different orderings
    const sortedScopes1 = [...scopes1].sort();
    const sortedScopes2 = [...scopes2].sort();
    return sortedScopes1.every((scope, index) => scope === sortedScopes2[index]);
}
/**
 * Fetches and validates OAuth 2.0 protected resource metadata from the given URL.
 *
 * @param targetResource The target resource URL to compare origins with (e.g., the MCP server URL)
 * @param resourceMetadataUrl Optional URL to fetch the resource metadata from. If not provided, will try well-known URIs.
 * @param options Configuration options for the fetch operation
 * @returns Promise that resolves to the validated resource metadata
 * @throws Error if the fetch fails, returns non-200 status, or the response is invalid
 */
export async function fetchResourceMetadata(targetResource, resourceMetadataUrl, options = {}) {
    const { sameOriginHeaders = {}, fetch: fetchImpl = fetch } = options;
    const targetResourceUrlObj = new URL(targetResource);
    // If no resourceMetadataUrl is provided, try well-known URIs as per RFC 9728
    let urlsToTry;
    if (!resourceMetadataUrl) {
        // Try in order: 1) with path appended, 2) at root
        const pathComponent = targetResourceUrlObj.pathname === '/' ? undefined : targetResourceUrlObj.pathname;
        const rootUrl = `${targetResourceUrlObj.origin}${AUTH_PROTECTED_RESOURCE_METADATA_DISCOVERY_PATH}`;
        if (pathComponent) {
            // Only try both URLs if we have a path component
            urlsToTry = [
                `${rootUrl}${pathComponent}`,
                rootUrl
            ];
        }
        else {
            // If target is already at root, only try the root URL once
            urlsToTry = [rootUrl];
        }
    }
    else {
        urlsToTry = [resourceMetadataUrl];
    }
    const errors = [];
    for (const urlToTry of urlsToTry) {
        try {
            // Determine if we should include same-origin headers
            let headers = {
                'Accept': 'application/json'
            };
            const resourceMetadataUrlObj = new URL(urlToTry);
            if (resourceMetadataUrlObj.origin === targetResourceUrlObj.origin) {
                headers = {
                    ...headers,
                    ...sameOriginHeaders
                };
            }
            const response = await fetchImpl(urlToTry, { method: 'GET', headers });
            if (response.status !== 200) {
                let errorText;
                try {
                    errorText = await response.text();
                }
                catch {
                    errorText = response.statusText;
                }
                errors.push(new Error(`Failed to fetch resource metadata from ${urlToTry}: ${response.status} ${errorText}`));
                continue;
            }
            const body = await response.json();
            if (isAuthorizationProtectedResourceMetadata(body)) {
                // Use URL constructor for normalization - it handles hostname case and trailing slashes
                const prmValue = new URL(body.resource).toString();
                const targetValue = targetResourceUrlObj.toString();
                if (prmValue !== targetValue) {
                    throw new Error(`Protected Resource Metadata resource property value "${prmValue}" (length: ${prmValue.length}) does not match target server url "${targetValue}" (length: ${targetValue.length}). These MUST match to follow OAuth spec https://datatracker.ietf.org/doc/html/rfc9728#PRConfigurationValidation`);
                }
                return body;
            }
            else {
                errors.push(new Error(`Invalid resource metadata from ${urlToTry}. Expected to follow shape of https://datatracker.ietf.org/doc/html/rfc9728#name-protected-resource-metadata (Hints: is scopes_supported an array? Is resource a string?). Current payload: ${JSON.stringify(body)}`));
                continue;
            }
        }
        catch (e) {
            errors.push(e instanceof Error ? e : new Error(String(e)));
            continue;
        }
    }
    // If we've tried all URLs and none worked, throw the error(s)
    if (errors.length === 1) {
        throw errors[0];
    }
    else {
        throw new AggregateError(errors, 'Failed to fetch resource metadata from all attempted URLs');
    }
}
/** Helper to try parsing the response as authorization server metadata */
async function tryParseAuthServerMetadata(response) {
    if (response.status !== 200) {
        return undefined;
    }
    try {
        const body = await response.json();
        if (isAuthorizationServerMetadata(body)) {
            return body;
        }
    }
    catch {
        // Failed to parse as JSON or not valid metadata
    }
    return undefined;
}
/** Helper to get error text from response */
async function getErrText(res) {
    try {
        return await res.text();
    }
    catch {
        return res.statusText;
    }
}
/**
 * Fetches and validates OAuth 2.0 authorization server metadata from the given authorization server URL.
 *
 * This function tries multiple discovery endpoints in the following order:
 * 1. OAuth 2.0 Authorization Server Metadata with path insertion (RFC 8414)
 * 2. OpenID Connect Discovery with path insertion
 * 3. OpenID Connect Discovery with path addition
 *
 * Path insertion: For issuer URLs with path components (e.g., https://example.com/tenant),
 * the well-known path is inserted after the origin and before the path:
 * https://example.com/.well-known/oauth-authorization-server/tenant
 *
 * Path addition: The well-known path is simply appended to the existing path:
 * https://example.com/tenant/.well-known/openid-configuration
 *
 * @param authorizationServer The authorization server URL (issuer identifier)
 * @param options Configuration options for the fetch operation
 * @returns Promise that resolves to the validated authorization server metadata
 * @throws Error if all discovery attempts fail or the response is invalid
 *
 * @see https://datatracker.ietf.org/doc/html/rfc8414#section-3
 */
export async function fetchAuthorizationServerMetadata(authorizationServer, options = {}) {
    const { additionalHeaders = {}, fetch: fetchImpl = fetch } = options;
    const authorizationServerUrl = new URL(authorizationServer);
    const extraPath = authorizationServerUrl.pathname === '/' ? '' : authorizationServerUrl.pathname;
    const errors = [];
    const doFetch = async (url) => {
        try {
            const rawResponse = await fetchImpl(url, {
                method: 'GET',
                headers: {
                    ...additionalHeaders,
                    'Accept': 'application/json'
                }
            });
            const metadata = await tryParseAuthServerMetadata(rawResponse);
            if (metadata) {
                return metadata;
            }
            // No metadata found, collect error from response
            errors.push(new Error(`Failed to fetch authorization server metadata from ${url}: ${rawResponse.status} ${await getErrText(rawResponse)}`));
            return undefined;
        }
        catch (e) {
            // Collect error from fetch failure
            errors.push(e instanceof Error ? e : new Error(String(e)));
            return undefined;
        }
    };
    // For the oauth server metadata discovery path, we _INSERT_
    // the well known path after the origin and before the path.
    // https://datatracker.ietf.org/doc/html/rfc8414#section-3
    const pathToFetch = new URL(AUTH_SERVER_METADATA_DISCOVERY_PATH, authorizationServer).toString() + extraPath;
    let metadata = await doFetch(pathToFetch);
    if (metadata) {
        return metadata;
    }
    // Try fetching the OpenID Connect Discovery with path insertion.
    // For issuer URLs with path components, this inserts the well-known path
    // after the origin and before the path.
    const openidPathInsertionUrl = new URL(OPENID_CONNECT_DISCOVERY_PATH, authorizationServer).toString() + extraPath;
    metadata = await doFetch(openidPathInsertionUrl);
    if (metadata) {
        return metadata;
    }
    // Try fetching the other discovery URL. For the openid metadata discovery
    // path, we _ADD_ the well known path after the existing path.
    // https://datatracker.ietf.org/doc/html/rfc8414#section-3
    const openidPathAdditionUrl = authorizationServer.endsWith('/')
        ? authorizationServer + OPENID_CONNECT_DISCOVERY_PATH.substring(1) // Remove leading slash if authServer ends with slash
        : authorizationServer + OPENID_CONNECT_DISCOVERY_PATH;
    metadata = await doFetch(openidPathAdditionUrl);
    if (metadata) {
        return metadata;
    }
    // If we've tried all URLs and none worked, throw the error(s)
    if (errors.length === 1) {
        throw errors[0];
    }
    else {
        throw new AggregateError(errors, 'Failed to fetch authorization server metadata from all attempted URLs');
    }
}
//# sourceMappingURL=oauth.js.map