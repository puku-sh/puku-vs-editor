/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import * as sinon from 'sinon';
import { getClaimsFromJWT, getDefaultMetadataForUrl, isAuthorizationAuthorizeResponse, isAuthorizationDeviceResponse, isAuthorizationErrorResponse, isAuthorizationDynamicClientRegistrationResponse, isAuthorizationProtectedResourceMetadata, isAuthorizationServerMetadata, isAuthorizationTokenResponse, parseWWWAuthenticateHeader, fetchDynamicRegistration, fetchResourceMetadata, fetchAuthorizationServerMetadata, scopesMatch, DEFAULT_AUTH_FLOW_PORT } from '../../common/oauth.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
import { encodeBase64, VSBuffer } from '../../common/buffer.js';
suite('OAuth', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('Type Guards', () => {
        test('isAuthorizationProtectedResourceMetadata should correctly identify protected resource metadata', () => {
            // Valid metadata with minimal required fields
            assert.strictEqual(isAuthorizationProtectedResourceMetadata({ resource: 'https://example.com' }), true);
            // Valid metadata with scopes_supported as array
            assert.strictEqual(isAuthorizationProtectedResourceMetadata({
                resource: 'https://example.com',
                scopes_supported: ['read', 'write']
            }), true);
            // Invalid cases - missing resource
            assert.strictEqual(isAuthorizationProtectedResourceMetadata(null), false);
            assert.strictEqual(isAuthorizationProtectedResourceMetadata(undefined), false);
            assert.strictEqual(isAuthorizationProtectedResourceMetadata({}), false);
            assert.strictEqual(isAuthorizationProtectedResourceMetadata('not an object'), false);
            // Invalid cases - scopes_supported is not an array when provided
            assert.strictEqual(isAuthorizationProtectedResourceMetadata({
                resource: 'https://example.com',
                scopes_supported: 'not an array'
            }), false);
        });
        test('isAuthorizationServerMetadata should correctly identify server metadata', () => {
            // Valid metadata with minimal required fields
            assert.strictEqual(isAuthorizationServerMetadata({
                issuer: 'https://example.com',
                response_types_supported: ['code']
            }), true);
            // Valid metadata with valid URLs
            assert.strictEqual(isAuthorizationServerMetadata({
                issuer: 'https://example.com',
                authorization_endpoint: 'https://example.com/auth',
                token_endpoint: 'https://example.com/token',
                registration_endpoint: 'https://example.com/register',
                jwks_uri: 'https://example.com/jwks',
                response_types_supported: ['code']
            }), true);
            // Valid metadata with http URLs (for localhost/testing)
            assert.strictEqual(isAuthorizationServerMetadata({
                issuer: 'http://localhost:8080',
                authorization_endpoint: 'http://localhost:8080/auth',
                token_endpoint: 'http://localhost:8080/token',
                response_types_supported: ['code']
            }), true);
            // Invalid cases - not an object
            assert.strictEqual(isAuthorizationServerMetadata(null), false);
            assert.strictEqual(isAuthorizationServerMetadata(undefined), false);
            assert.strictEqual(isAuthorizationServerMetadata('not an object'), false);
            // Invalid cases - missing issuer should throw
            assert.throws(() => isAuthorizationServerMetadata({}), /Authorization server metadata must have an issuer/);
            assert.throws(() => isAuthorizationServerMetadata({ response_types_supported: ['code'] }), /Authorization server metadata must have an issuer/);
            // Invalid cases - URI fields must be strings when provided (truthy values)
            assert.throws(() => isAuthorizationServerMetadata({
                issuer: 'https://example.com',
                authorization_endpoint: 123,
                response_types_supported: ['code']
            }), /Authorization server metadata 'authorization_endpoint' must be a string/);
            assert.throws(() => isAuthorizationServerMetadata({
                issuer: 'https://example.com',
                token_endpoint: 123,
                response_types_supported: ['code']
            }), /Authorization server metadata 'token_endpoint' must be a string/);
            assert.throws(() => isAuthorizationServerMetadata({
                issuer: 'https://example.com',
                registration_endpoint: [],
                response_types_supported: ['code']
            }), /Authorization server metadata 'registration_endpoint' must be a string/);
            assert.throws(() => isAuthorizationServerMetadata({
                issuer: 'https://example.com',
                jwks_uri: {},
                response_types_supported: ['code']
            }), /Authorization server metadata 'jwks_uri' must be a string/);
            // Invalid cases - URI fields must start with http:// or https://
            assert.throws(() => isAuthorizationServerMetadata({
                issuer: 'ftp://example.com',
                response_types_supported: ['code']
            }), /Authorization server metadata 'issuer' must start with http:\/\/ or https:\/\//);
            assert.throws(() => isAuthorizationServerMetadata({
                issuer: 'https://example.com',
                authorization_endpoint: 'ftp://example.com/auth',
                response_types_supported: ['code']
            }), /Authorization server metadata 'authorization_endpoint' must start with http:\/\/ or https:\/\//);
            assert.throws(() => isAuthorizationServerMetadata({
                issuer: 'https://example.com',
                token_endpoint: 'file:///path/to/token',
                response_types_supported: ['code']
            }), /Authorization server metadata 'token_endpoint' must start with http:\/\/ or https:\/\//);
            assert.throws(() => isAuthorizationServerMetadata({
                issuer: 'https://example.com',
                registration_endpoint: 'mailto:admin@example.com',
                response_types_supported: ['code']
            }), /Authorization server metadata 'registration_endpoint' must start with http:\/\/ or https:\/\//);
            assert.throws(() => isAuthorizationServerMetadata({
                issuer: 'https://example.com',
                jwks_uri: 'data:application/json,{}',
                response_types_supported: ['code']
            }), /Authorization server metadata 'jwks_uri' must start with http:\/\/ or https:\/\//);
        });
        test('isAuthorizationDynamicClientRegistrationResponse should correctly identify registration response', () => {
            // Valid response
            assert.strictEqual(isAuthorizationDynamicClientRegistrationResponse({
                client_id: 'client-123',
                client_name: 'Test Client'
            }), true);
            // Invalid cases
            assert.strictEqual(isAuthorizationDynamicClientRegistrationResponse(null), false);
            assert.strictEqual(isAuthorizationDynamicClientRegistrationResponse(undefined), false);
            assert.strictEqual(isAuthorizationDynamicClientRegistrationResponse({}), false);
            assert.strictEqual(isAuthorizationDynamicClientRegistrationResponse({ client_id: 'just-id' }), true);
            assert.strictEqual(isAuthorizationDynamicClientRegistrationResponse({ client_name: 'missing-id' }), false);
            assert.strictEqual(isAuthorizationDynamicClientRegistrationResponse('not an object'), false);
        });
        test('isAuthorizationAuthorizeResponse should correctly identify authorization response', () => {
            // Valid response
            assert.strictEqual(isAuthorizationAuthorizeResponse({
                code: 'auth-code-123',
                state: 'state-123'
            }), true);
            // Invalid cases
            assert.strictEqual(isAuthorizationAuthorizeResponse(null), false);
            assert.strictEqual(isAuthorizationAuthorizeResponse(undefined), false);
            assert.strictEqual(isAuthorizationAuthorizeResponse({}), false);
            assert.strictEqual(isAuthorizationAuthorizeResponse({ code: 'missing-state' }), false);
            assert.strictEqual(isAuthorizationAuthorizeResponse({ state: 'missing-code' }), false);
            assert.strictEqual(isAuthorizationAuthorizeResponse('not an object'), false);
        });
        test('isAuthorizationTokenResponse should correctly identify token response', () => {
            // Valid response
            assert.strictEqual(isAuthorizationTokenResponse({
                access_token: 'token-123',
                token_type: 'Bearer'
            }), true);
            // Invalid cases
            assert.strictEqual(isAuthorizationTokenResponse(null), false);
            assert.strictEqual(isAuthorizationTokenResponse(undefined), false);
            assert.strictEqual(isAuthorizationTokenResponse({}), false);
            assert.strictEqual(isAuthorizationTokenResponse({ access_token: 'missing-type' }), false);
            assert.strictEqual(isAuthorizationTokenResponse({ token_type: 'missing-token' }), false);
            assert.strictEqual(isAuthorizationTokenResponse('not an object'), false);
        });
        test('isAuthorizationDeviceResponse should correctly identify device authorization response', () => {
            // Valid response
            assert.strictEqual(isAuthorizationDeviceResponse({
                device_code: 'device-code-123',
                user_code: 'ABCD-EFGH',
                verification_uri: 'https://example.com/verify',
                expires_in: 1800
            }), true);
            // Valid response with optional fields
            assert.strictEqual(isAuthorizationDeviceResponse({
                device_code: 'device-code-123',
                user_code: 'ABCD-EFGH',
                verification_uri: 'https://example.com/verify',
                verification_uri_complete: 'https://example.com/verify?user_code=ABCD-EFGH',
                expires_in: 1800,
                interval: 5
            }), true);
            // Invalid cases
            assert.strictEqual(isAuthorizationDeviceResponse(null), false);
            assert.strictEqual(isAuthorizationDeviceResponse(undefined), false);
            assert.strictEqual(isAuthorizationDeviceResponse({}), false);
            assert.strictEqual(isAuthorizationDeviceResponse({ device_code: 'missing-others' }), false);
            assert.strictEqual(isAuthorizationDeviceResponse({ user_code: 'missing-others' }), false);
            assert.strictEqual(isAuthorizationDeviceResponse({ verification_uri: 'missing-others' }), false);
            assert.strictEqual(isAuthorizationDeviceResponse({ expires_in: 1800 }), false);
            assert.strictEqual(isAuthorizationDeviceResponse({
                device_code: 'device-code-123',
                user_code: 'ABCD-EFGH',
                verification_uri: 'https://example.com/verify'
                // Missing expires_in
            }), false);
            assert.strictEqual(isAuthorizationDeviceResponse('not an object'), false);
        });
        test('isAuthorizationErrorResponse should correctly identify error response', () => {
            // Valid error response
            assert.strictEqual(isAuthorizationErrorResponse({
                error: 'authorization_pending',
                error_description: 'The authorization request is still pending'
            }), true);
            // Valid error response with different error codes
            assert.strictEqual(isAuthorizationErrorResponse({
                error: 'slow_down',
                error_description: 'Polling too fast'
            }), true);
            assert.strictEqual(isAuthorizationErrorResponse({
                error: 'access_denied',
                error_description: 'The user denied the request'
            }), true);
            assert.strictEqual(isAuthorizationErrorResponse({
                error: 'expired_token',
                error_description: 'The device code has expired'
            }), true);
            // Valid response with optional error_uri
            assert.strictEqual(isAuthorizationErrorResponse({
                error: 'invalid_request',
                error_description: 'The request is missing a required parameter',
                error_uri: 'https://example.com/error'
            }), true);
            // Invalid cases
            assert.strictEqual(isAuthorizationErrorResponse(null), false);
            assert.strictEqual(isAuthorizationErrorResponse(undefined), false);
            assert.strictEqual(isAuthorizationErrorResponse({}), false);
            assert.strictEqual(isAuthorizationErrorResponse({ error_description: 'missing-error' }), false);
            assert.strictEqual(isAuthorizationErrorResponse('not an object'), false);
        });
    });
    suite('Scope Matching', () => {
        test('scopesMatch should return true for identical scopes', () => {
            const scopes1 = ['test', 'scopes'];
            const scopes2 = ['test', 'scopes'];
            assert.strictEqual(scopesMatch(scopes1, scopes2), true);
        });
        test('scopesMatch should return true for scopes in different order', () => {
            const scopes1 = ['6f1cc985-85e8-487e-b0dd-aa633302a731/.default', 'VSCODE_TENANT:organizations'];
            const scopes2 = ['VSCODE_TENANT:organizations', '6f1cc985-85e8-487e-b0dd-aa633302a731/.default'];
            assert.strictEqual(scopesMatch(scopes1, scopes2), true);
        });
        test('scopesMatch should return false for different scopes', () => {
            const scopes1 = ['test', 'scopes'];
            const scopes2 = ['different', 'scopes'];
            assert.strictEqual(scopesMatch(scopes1, scopes2), false);
        });
        test('scopesMatch should return false for different length arrays', () => {
            const scopes1 = ['test'];
            const scopes2 = ['test', 'scopes'];
            assert.strictEqual(scopesMatch(scopes1, scopes2), false);
        });
        test('scopesMatch should handle complex Microsoft scopes', () => {
            const scopes1 = ['6f1cc985-85e8-487e-b0dd-aa633302a731/.default', 'VSCODE_TENANT:organizations'];
            const scopes2 = ['VSCODE_TENANT:organizations', '6f1cc985-85e8-487e-b0dd-aa633302a731/.default'];
            assert.strictEqual(scopesMatch(scopes1, scopes2), true);
        });
        test('scopesMatch should handle empty arrays', () => {
            assert.strictEqual(scopesMatch([], []), true);
        });
        test('scopesMatch should handle single scope arrays', () => {
            assert.strictEqual(scopesMatch(['single'], ['single']), true);
            assert.strictEqual(scopesMatch(['single'], ['different']), false);
        });
        test('scopesMatch should handle duplicate scopes within arrays', () => {
            const scopes1 = ['scope1', 'scope2', 'scope1'];
            const scopes2 = ['scope2', 'scope1', 'scope1'];
            assert.strictEqual(scopesMatch(scopes1, scopes2), true);
        });
        test('scopesMatch should handle undefined values', () => {
            assert.strictEqual(scopesMatch(undefined, undefined), true);
            assert.strictEqual(scopesMatch(['read'], undefined), false);
            assert.strictEqual(scopesMatch(undefined, ['write']), false);
        });
        test('scopesMatch should handle mixed undefined and empty arrays', () => {
            assert.strictEqual(scopesMatch([], undefined), false);
            assert.strictEqual(scopesMatch(undefined, []), false);
            assert.strictEqual(scopesMatch([], []), true);
        });
    });
    suite('Utility Functions', () => {
        test('getDefaultMetadataForUrl should return correct default endpoints', () => {
            const authorizationServer = new URL('https://auth.example.com');
            const metadata = getDefaultMetadataForUrl(authorizationServer);
            assert.strictEqual(metadata.issuer, 'https://auth.example.com/');
            assert.strictEqual(metadata.authorization_endpoint, 'https://auth.example.com/authorize');
            assert.strictEqual(metadata.token_endpoint, 'https://auth.example.com/token');
            assert.strictEqual(metadata.registration_endpoint, 'https://auth.example.com/register');
            assert.deepStrictEqual(metadata.response_types_supported, ['code', 'id_token', 'id_token token']);
        });
    });
    suite('Parsing Functions', () => {
        test('parseWWWAuthenticateHeader should correctly parse simple header', () => {
            const result = parseWWWAuthenticateHeader('Bearer');
            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0].scheme, 'Bearer');
            assert.deepStrictEqual(result[0].params, {});
        });
        test('parseWWWAuthenticateHeader should correctly parse header with parameters', () => {
            const result = parseWWWAuthenticateHeader('Bearer realm="api", error="invalid_token", error_description="The access token expired"');
            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0].scheme, 'Bearer');
            assert.deepStrictEqual(result[0].params, {
                realm: 'api',
                error: 'invalid_token',
                error_description: 'The access token expired'
            });
        });
        test('parseWWWAuthenticateHeader should correctly parse parameters with equal signs', () => {
            const result = parseWWWAuthenticateHeader('Bearer resource_metadata="https://example.com/.well-known/oauth-protected-resource?v=1"');
            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0].scheme, 'Bearer');
            assert.deepStrictEqual(result[0].params, {
                resource_metadata: 'https://example.com/.well-known/oauth-protected-resource?v=1'
            });
        });
        test('parseWWWAuthenticateHeader should correctly parse multiple', () => {
            const result = parseWWWAuthenticateHeader('Bearer realm="api", error="invalid_token", error_description="The access token expired", Basic realm="hi"');
            assert.strictEqual(result.length, 2);
            assert.strictEqual(result[0].scheme, 'Bearer');
            assert.deepStrictEqual(result[0].params, {
                realm: 'api',
                error: 'invalid_token',
                error_description: 'The access token expired'
            });
            assert.strictEqual(result[1].scheme, 'Basic');
            assert.deepStrictEqual(result[1].params, {
                realm: 'hi'
            });
        });
        test('getClaimsFromJWT should correctly parse a JWT token', () => {
            // Create a sample JWT with known payload
            const payload = {
                jti: 'id123',
                sub: 'user123',
                iss: 'https://example.com',
                aud: 'client123',
                exp: 1716239022,
                iat: 1716235422,
                name: 'Test User'
            };
            // Create fake but properly formatted JWT
            const header = { alg: 'HS256', typ: 'JWT' };
            const encodedHeader = encodeBase64(VSBuffer.fromString(JSON.stringify(header)));
            const encodedPayload = encodeBase64(VSBuffer.fromString(JSON.stringify(payload)));
            const fakeSignature = 'fake-signature';
            const token = `${encodedHeader}.${encodedPayload}.${fakeSignature}`;
            const claims = getClaimsFromJWT(token);
            assert.deepStrictEqual(claims, payload);
        });
        test('getClaimsFromJWT should throw for invalid JWT format', () => {
            // Test with wrong number of parts - should throw "Invalid JWT token format"
            assert.throws(() => getClaimsFromJWT('only.two'), /Invalid JWT token format.*three parts/);
            assert.throws(() => getClaimsFromJWT('one'), /Invalid JWT token format.*three parts/);
            assert.throws(() => getClaimsFromJWT('has.four.parts.here'), /Invalid JWT token format.*three parts/);
        });
        test('getClaimsFromJWT should throw for invalid header content', () => {
            // Create JWT with invalid header
            const encodedHeader = encodeBase64(VSBuffer.fromString('not-json'));
            const encodedPayload = encodeBase64(VSBuffer.fromString(JSON.stringify({ sub: 'test' })));
            const token = `${encodedHeader}.${encodedPayload}.signature`;
            assert.throws(() => getClaimsFromJWT(token), /Failed to parse JWT token/);
        });
        test('getClaimsFromJWT should throw for invalid payload content', () => {
            // Create JWT with valid header but invalid payload
            const header = { alg: 'HS256', typ: 'JWT' };
            const encodedHeader = encodeBase64(VSBuffer.fromString(JSON.stringify(header)));
            const encodedPayload = encodeBase64(VSBuffer.fromString('not-json'));
            const token = `${encodedHeader}.${encodedPayload}.signature`;
            assert.throws(() => getClaimsFromJWT(token), /Failed to parse JWT token/);
        });
    });
    suite('Network Functions', () => {
        let sandbox;
        let fetchStub;
        setup(() => {
            sandbox = sinon.createSandbox();
            fetchStub = sandbox.stub(globalThis, 'fetch');
        });
        teardown(() => {
            sandbox.restore();
        });
        test('fetchDynamicRegistration should make correct request and parse response', async () => {
            // Setup successful response
            const mockResponse = {
                client_id: 'generated-client-id',
                client_name: 'Test Client',
                client_uri: 'https://code.visualstudio.com'
            };
            fetchStub.resolves({
                ok: true,
                json: async () => mockResponse
            });
            const serverMetadata = {
                issuer: 'https://auth.example.com',
                registration_endpoint: 'https://auth.example.com/register',
                response_types_supported: ['code']
            };
            const result = await fetchDynamicRegistration(serverMetadata, 'Test Client');
            // Verify fetch was called correctly
            assert.strictEqual(fetchStub.callCount, 1);
            const [url, options] = fetchStub.firstCall.args;
            assert.strictEqual(url, 'https://auth.example.com/register');
            assert.strictEqual(options.method, 'POST');
            assert.strictEqual(options.headers['Content-Type'], 'application/json');
            // Verify request body
            const requestBody = JSON.parse(options.body);
            assert.strictEqual(requestBody.client_name, 'Test Client');
            assert.strictEqual(requestBody.client_uri, 'https://code.visualstudio.com');
            assert.deepStrictEqual(requestBody.grant_types, ['authorization_code', 'refresh_token', 'urn:ietf:params:oauth:grant-type:device_code']);
            assert.deepStrictEqual(requestBody.response_types, ['code']);
            assert.deepStrictEqual(requestBody.redirect_uris, [
                'https://insiders.vscode.dev/redirect',
                'https://vscode.dev/redirect',
                'http://127.0.0.1/',
                `http://127.0.0.1:${DEFAULT_AUTH_FLOW_PORT}/`
            ]);
            // Verify response is processed correctly
            assert.deepStrictEqual(result, mockResponse);
        });
        test('fetchDynamicRegistration should throw error on non-OK response', async () => {
            fetchStub.resolves({
                ok: false,
                statusText: 'Bad Request',
                text: async () => 'Bad Request'
            });
            const serverMetadata = {
                issuer: 'https://auth.example.com',
                registration_endpoint: 'https://auth.example.com/register',
                response_types_supported: ['code']
            };
            await assert.rejects(async () => await fetchDynamicRegistration(serverMetadata, 'Test Client'), /Registration to https:\/\/auth\.example\.com\/register failed: Bad Request/);
        });
        test('fetchDynamicRegistration should throw error on invalid response format', async () => {
            fetchStub.resolves({
                ok: true,
                json: async () => ({ invalid: 'response' }) // Missing required fields
            });
            const serverMetadata = {
                issuer: 'https://auth.example.com',
                registration_endpoint: 'https://auth.example.com/register',
                response_types_supported: ['code']
            };
            await assert.rejects(async () => await fetchDynamicRegistration(serverMetadata, 'Test Client'), /Invalid authorization dynamic client registration response/);
        });
        test('fetchDynamicRegistration should filter grant types based on server metadata', async () => {
            // Setup successful response
            const mockResponse = {
                client_id: 'generated-client-id',
                client_name: 'Test Client'
            };
            fetchStub.resolves({
                ok: true,
                json: async () => mockResponse
            });
            const serverMetadata = {
                issuer: 'https://auth.example.com',
                registration_endpoint: 'https://auth.example.com/register',
                response_types_supported: ['code'],
                grant_types_supported: ['authorization_code', 'client_credentials', 'refresh_token'] // Mix of supported and unsupported
            };
            await fetchDynamicRegistration(serverMetadata, 'Test Client');
            // Verify fetch was called correctly
            assert.strictEqual(fetchStub.callCount, 1);
            const [, options] = fetchStub.firstCall.args;
            // Verify request body contains only the intersection of supported grant types
            const requestBody = JSON.parse(options.body);
            assert.deepStrictEqual(requestBody.grant_types, ['authorization_code', 'refresh_token']); // client_credentials should be filtered out
        });
        test('fetchDynamicRegistration should use default grant types when server metadata has none', async () => {
            // Setup successful response
            const mockResponse = {
                client_id: 'generated-client-id',
                client_name: 'Test Client'
            };
            fetchStub.resolves({
                ok: true,
                json: async () => mockResponse
            });
            const serverMetadata = {
                issuer: 'https://auth.example.com',
                registration_endpoint: 'https://auth.example.com/register',
                response_types_supported: ['code']
                // No grant_types_supported specified
            };
            await fetchDynamicRegistration(serverMetadata, 'Test Client');
            // Verify fetch was called correctly
            assert.strictEqual(fetchStub.callCount, 1);
            const [, options] = fetchStub.firstCall.args;
            // Verify request body contains default grant types
            const requestBody = JSON.parse(options.body);
            assert.deepStrictEqual(requestBody.grant_types, ['authorization_code', 'refresh_token', 'urn:ietf:params:oauth:grant-type:device_code']);
        });
        test('fetchDynamicRegistration should throw error when registration endpoint is missing', async () => {
            const serverMetadata = {
                issuer: 'https://auth.example.com',
                response_types_supported: ['code']
                // registration_endpoint is missing
            };
            await assert.rejects(async () => await fetchDynamicRegistration(serverMetadata, 'Test Client'), /Server does not support dynamic registration/);
        });
        test('fetchDynamicRegistration should handle structured error response', async () => {
            const errorResponse = {
                error: 'invalid_client_metadata',
                error_description: 'The client metadata is invalid'
            };
            fetchStub.resolves({
                ok: false,
                text: async () => JSON.stringify(errorResponse)
            });
            const serverMetadata = {
                issuer: 'https://auth.example.com',
                registration_endpoint: 'https://auth.example.com/register',
                response_types_supported: ['code']
            };
            await assert.rejects(async () => await fetchDynamicRegistration(serverMetadata, 'Test Client'), /Registration to https:\/\/auth\.example\.com\/register failed: invalid_client_metadata: The client metadata is invalid/);
        });
        test('fetchDynamicRegistration should handle structured error response without description', async () => {
            const errorResponse = {
                error: 'invalid_redirect_uri'
            };
            fetchStub.resolves({
                ok: false,
                text: async () => JSON.stringify(errorResponse)
            });
            const serverMetadata = {
                issuer: 'https://auth.example.com',
                registration_endpoint: 'https://auth.example.com/register',
                response_types_supported: ['code']
            };
            await assert.rejects(async () => await fetchDynamicRegistration(serverMetadata, 'Test Client'), /Registration to https:\/\/auth\.example\.com\/register failed: invalid_redirect_uri/);
        });
        test('fetchDynamicRegistration should handle malformed JSON error response', async () => {
            fetchStub.resolves({
                ok: false,
                text: async () => 'Invalid JSON {'
            });
            const serverMetadata = {
                issuer: 'https://auth.example.com',
                registration_endpoint: 'https://auth.example.com/register',
                response_types_supported: ['code']
            };
            await assert.rejects(async () => await fetchDynamicRegistration(serverMetadata, 'Test Client'), /Registration to https:\/\/auth\.example\.com\/register failed: Invalid JSON \{/);
        });
        test('fetchDynamicRegistration should include scopes in request when provided', async () => {
            const mockResponse = {
                client_id: 'generated-client-id',
                client_name: 'Test Client'
            };
            fetchStub.resolves({
                ok: true,
                json: async () => mockResponse
            });
            const serverMetadata = {
                issuer: 'https://auth.example.com',
                registration_endpoint: 'https://auth.example.com/register',
                response_types_supported: ['code']
            };
            await fetchDynamicRegistration(serverMetadata, 'Test Client', ['read', 'write']);
            // Verify request includes scopes
            const [, options] = fetchStub.firstCall.args;
            const requestBody = JSON.parse(options.body);
            assert.strictEqual(requestBody.scope, 'read write');
        });
        test('fetchDynamicRegistration should omit scope from request when not provided', async () => {
            const mockResponse = {
                client_id: 'generated-client-id',
                client_name: 'Test Client'
            };
            fetchStub.resolves({
                ok: true,
                json: async () => mockResponse
            });
            const serverMetadata = {
                issuer: 'https://auth.example.com',
                registration_endpoint: 'https://auth.example.com/register',
                response_types_supported: ['code']
            };
            await fetchDynamicRegistration(serverMetadata, 'Test Client');
            // Verify request does not include scope when not provided
            const [, options] = fetchStub.firstCall.args;
            const requestBody = JSON.parse(options.body);
            assert.strictEqual(requestBody.scope, undefined);
        });
        test('fetchDynamicRegistration should handle empty scopes array', async () => {
            const mockResponse = {
                client_id: 'generated-client-id',
                client_name: 'Test Client'
            };
            fetchStub.resolves({
                ok: true,
                json: async () => mockResponse
            });
            const serverMetadata = {
                issuer: 'https://auth.example.com',
                registration_endpoint: 'https://auth.example.com/register',
                response_types_supported: ['code']
            };
            await fetchDynamicRegistration(serverMetadata, 'Test Client', []);
            // Verify request includes empty scope
            const [, options] = fetchStub.firstCall.args;
            const requestBody = JSON.parse(options.body);
            assert.strictEqual(requestBody.scope, '');
        });
        test('fetchDynamicRegistration should handle network fetch failure', async () => {
            fetchStub.rejects(new Error('Network error'));
            const serverMetadata = {
                issuer: 'https://auth.example.com',
                registration_endpoint: 'https://auth.example.com/register',
                response_types_supported: ['code']
            };
            await assert.rejects(async () => await fetchDynamicRegistration(serverMetadata, 'Test Client'), /Network error/);
        });
        test('fetchDynamicRegistration should handle response.json() failure', async () => {
            fetchStub.resolves({
                ok: true,
                json: async () => {
                    throw new Error('JSON parsing failed');
                }
            });
            const serverMetadata = {
                issuer: 'https://auth.example.com',
                registration_endpoint: 'https://auth.example.com/register',
                response_types_supported: ['code']
            };
            await assert.rejects(async () => await fetchDynamicRegistration(serverMetadata, 'Test Client'), /JSON parsing failed/);
        });
        test('fetchDynamicRegistration should handle response.text() failure for error cases', async () => {
            fetchStub.resolves({
                ok: false,
                text: async () => {
                    throw new Error('Text parsing failed');
                }
            });
            const serverMetadata = {
                issuer: 'https://auth.example.com',
                registration_endpoint: 'https://auth.example.com/register',
                response_types_supported: ['code']
            };
            await assert.rejects(async () => await fetchDynamicRegistration(serverMetadata, 'Test Client'), /Text parsing failed/);
        });
    });
    suite('Client ID Fallback Scenarios', () => {
        let sandbox;
        let fetchStub;
        setup(() => {
            sandbox = sinon.createSandbox();
            fetchStub = sandbox.stub(globalThis, 'fetch');
        });
        teardown(() => {
            sandbox.restore();
        });
        test('fetchDynamicRegistration should throw specific error for missing registration endpoint', async () => {
            const serverMetadata = {
                issuer: 'https://auth.example.com',
                response_types_supported: ['code']
                // registration_endpoint is missing
            };
            await assert.rejects(async () => await fetchDynamicRegistration(serverMetadata, 'Test Client'), {
                message: 'Server does not support dynamic registration'
            });
        });
        test('fetchDynamicRegistration should throw specific error for DCR failure', async () => {
            fetchStub.resolves({
                ok: false,
                text: async () => 'DCR not supported'
            });
            const serverMetadata = {
                issuer: 'https://auth.example.com',
                registration_endpoint: 'https://auth.example.com/register',
                response_types_supported: ['code']
            };
            await assert.rejects(async () => await fetchDynamicRegistration(serverMetadata, 'Test Client'), /Registration to https:\/\/auth\.example\.com\/register failed: DCR not supported/);
        });
    });
    suite('fetchResourceMetadata', () => {
        let sandbox;
        let fetchStub;
        setup(() => {
            sandbox = sinon.createSandbox();
            fetchStub = sandbox.stub();
        });
        teardown(() => {
            sandbox.restore();
        });
        test('should successfully fetch and validate resource metadata', async () => {
            const targetResource = 'https://example.com/api';
            const resourceMetadataUrl = 'https://example.com/.well-known/oauth-protected-resource';
            const expectedMetadata = {
                resource: 'https://example.com/api',
                scopes_supported: ['read', 'write']
            };
            fetchStub.resolves({
                status: 200,
                json: async () => expectedMetadata,
                text: async () => JSON.stringify(expectedMetadata)
            });
            const result = await fetchResourceMetadata(targetResource, resourceMetadataUrl, { fetch: fetchStub });
            assert.deepStrictEqual(result, expectedMetadata);
            assert.strictEqual(fetchStub.callCount, 1);
            assert.strictEqual(fetchStub.firstCall.args[0], resourceMetadataUrl);
            assert.strictEqual(fetchStub.firstCall.args[1].method, 'GET');
            assert.strictEqual(fetchStub.firstCall.args[1].headers['Accept'], 'application/json');
        });
        test('should include same-origin headers when origins match', async () => {
            const targetResource = 'https://example.com/api';
            const resourceMetadataUrl = 'https://example.com/.well-known/oauth-protected-resource';
            const sameOriginHeaders = {
                'X-Test-Header': 'test-value',
                'X-Custom-Header': 'value'
            };
            const expectedMetadata = {
                resource: 'https://example.com/api'
            };
            fetchStub.resolves({
                status: 200,
                json: async () => expectedMetadata,
                text: async () => JSON.stringify(expectedMetadata)
            });
            await fetchResourceMetadata(targetResource, resourceMetadataUrl, { fetch: fetchStub, sameOriginHeaders });
            const headers = fetchStub.firstCall.args[1].headers;
            assert.strictEqual(headers['Accept'], 'application/json');
            assert.strictEqual(headers['X-Test-Header'], 'test-value');
            assert.strictEqual(headers['X-Custom-Header'], 'value');
        });
        test('should not include same-origin headers when origins differ', async () => {
            const targetResource = 'https://example.com/api';
            const resourceMetadataUrl = 'https://other-domain.com/.well-known/oauth-protected-resource';
            const sameOriginHeaders = {
                'X-Test-Header': 'test-value'
            };
            const expectedMetadata = {
                resource: 'https://example.com/api'
            };
            fetchStub.resolves({
                status: 200,
                json: async () => expectedMetadata,
                text: async () => JSON.stringify(expectedMetadata)
            });
            await fetchResourceMetadata(targetResource, resourceMetadataUrl, { fetch: fetchStub, sameOriginHeaders });
            const headers = fetchStub.firstCall.args[1].headers;
            assert.strictEqual(headers['Accept'], 'application/json');
            assert.strictEqual(headers['X-Test-Header'], undefined);
        });
        test('should throw error when fetch returns non-200 status', async () => {
            const targetResource = 'https://example.com/api';
            const resourceMetadataUrl = 'https://example.com/.well-known/oauth-protected-resource';
            fetchStub.resolves({
                status: 404,
                text: async () => 'Not Found'
            });
            await assert.rejects(async () => fetchResourceMetadata(targetResource, resourceMetadataUrl, { fetch: fetchStub }), /Failed to fetch resource metadata from.*404 Not Found/);
        });
        test('should handle error when response.text() throws', async () => {
            const targetResource = 'https://example.com/api';
            const resourceMetadataUrl = 'https://example.com/.well-known/oauth-protected-resource';
            fetchStub.resolves({
                status: 500,
                statusText: 'Internal Server Error',
                text: async () => { throw new Error('Cannot read response'); }
            });
            await assert.rejects(async () => fetchResourceMetadata(targetResource, resourceMetadataUrl, { fetch: fetchStub }), /Failed to fetch resource metadata from.*500 Internal Server Error/);
        });
        test('should throw error when resource property does not match target resource', async () => {
            const targetResource = 'https://example.com/api';
            const resourceMetadataUrl = 'https://example.com/.well-known/oauth-protected-resource';
            const metadata = {
                resource: 'https://different.com/api'
            };
            fetchStub.resolves({
                status: 200,
                json: async () => metadata,
                text: async () => JSON.stringify(metadata)
            });
            await assert.rejects(async () => fetchResourceMetadata(targetResource, resourceMetadataUrl, { fetch: fetchStub }), /Protected Resource Metadata resource property value.*does not match target server url.*These MUST match to follow OAuth spec/);
        });
        test('should normalize URLs when comparing resource values', async () => {
            const targetResource = 'https://EXAMPLE.COM/api';
            const resourceMetadataUrl = 'https://example.com/.well-known/oauth-protected-resource';
            const metadata = {
                resource: 'https://example.com/api'
            };
            fetchStub.resolves({
                status: 200,
                json: async () => metadata,
                text: async () => JSON.stringify(metadata)
            });
            // URL normalization should handle hostname case differences
            const result = await fetchResourceMetadata(targetResource, resourceMetadataUrl, { fetch: fetchStub });
            assert.deepStrictEqual(result, metadata);
        });
        test('should normalize hostnames when comparing resource values', async () => {
            const targetResource = 'https://EXAMPLE.COM/api';
            const resourceMetadataUrl = 'https://example.com/.well-known/oauth-protected-resource';
            const metadata = {
                resource: 'https://example.com/api'
            };
            fetchStub.resolves({
                status: 200,
                json: async () => metadata,
                text: async () => JSON.stringify(metadata)
            });
            const result = await fetchResourceMetadata(targetResource, resourceMetadataUrl, { fetch: fetchStub });
            assert.deepStrictEqual(result, metadata);
        });
        test('should throw error when response is not valid resource metadata', async () => {
            const targetResource = 'https://example.com/api';
            const resourceMetadataUrl = 'https://example.com/.well-known/oauth-protected-resource';
            const invalidMetadata = {
                // Missing required 'resource' property
                scopes_supported: ['read', 'write']
            };
            fetchStub.resolves({
                status: 200,
                json: async () => invalidMetadata,
                text: async () => JSON.stringify(invalidMetadata)
            });
            await assert.rejects(async () => fetchResourceMetadata(targetResource, resourceMetadataUrl, { fetch: fetchStub }), /Invalid resource metadata.*Expected to follow shape of.*is scopes_supported an array\? Is resource a string\?/);
        });
        test('should throw error when scopes_supported is not an array', async () => {
            const targetResource = 'https://example.com/api';
            const resourceMetadataUrl = 'https://example.com/.well-known/oauth-protected-resource';
            const invalidMetadata = {
                resource: 'https://example.com/api',
                scopes_supported: 'not an array'
            };
            fetchStub.resolves({
                status: 200,
                json: async () => invalidMetadata,
                text: async () => JSON.stringify(invalidMetadata)
            });
            await assert.rejects(async () => fetchResourceMetadata(targetResource, resourceMetadataUrl, { fetch: fetchStub }), /Invalid resource metadata/);
        });
        test('should handle metadata with optional fields', async () => {
            const targetResource = 'https://example.com/api';
            const resourceMetadataUrl = 'https://example.com/.well-known/oauth-protected-resource';
            const metadata = {
                resource: 'https://example.com/api',
                resource_name: 'Example API',
                authorization_servers: ['https://auth.example.com'],
                jwks_uri: 'https://example.com/jwks',
                scopes_supported: ['read', 'write', 'admin'],
                bearer_methods_supported: ['header', 'body'],
                resource_documentation: 'https://example.com/docs'
            };
            fetchStub.resolves({
                status: 200,
                json: async () => metadata,
                text: async () => JSON.stringify(metadata)
            });
            const result = await fetchResourceMetadata(targetResource, resourceMetadataUrl, { fetch: fetchStub });
            assert.deepStrictEqual(result, metadata);
        });
        test('should use global fetch when custom fetch is not provided', async () => {
            const targetResource = 'https://example.com/api';
            const resourceMetadataUrl = 'https://example.com/.well-known/oauth-protected-resource';
            const metadata = {
                resource: 'https://example.com/api'
            };
            // eslint-disable-next-line local/code-no-any-casts
            const globalFetchStub = sandbox.stub(globalThis, 'fetch').resolves({
                status: 200,
                json: async () => metadata,
                text: async () => JSON.stringify(metadata)
            });
            const result = await fetchResourceMetadata(targetResource, resourceMetadataUrl);
            assert.deepStrictEqual(result, metadata);
            assert.strictEqual(globalFetchStub.callCount, 1);
        });
        test('should handle same origin with different ports', async () => {
            const targetResource = 'https://example.com:8080/api';
            const resourceMetadataUrl = 'https://example.com:9090/.well-known/oauth-protected-resource';
            const sameOriginHeaders = {
                'X-Test-Header': 'test-value'
            };
            const metadata = {
                resource: 'https://example.com:8080/api'
            };
            fetchStub.resolves({
                status: 200,
                json: async () => metadata,
                text: async () => JSON.stringify(metadata)
            });
            await fetchResourceMetadata(targetResource, resourceMetadataUrl, { fetch: fetchStub, sameOriginHeaders });
            // Different ports mean different origins
            const headers = fetchStub.firstCall.args[1].headers;
            assert.strictEqual(headers['X-Test-Header'], undefined);
        });
        test('should handle same origin with different protocols', async () => {
            const targetResource = 'http://example.com/api';
            const resourceMetadataUrl = 'https://example.com/.well-known/oauth-protected-resource';
            const sameOriginHeaders = {
                'X-Test-Header': 'test-value'
            };
            const metadata = {
                resource: 'http://example.com/api'
            };
            fetchStub.resolves({
                status: 200,
                json: async () => metadata,
                text: async () => JSON.stringify(metadata)
            });
            await fetchResourceMetadata(targetResource, resourceMetadataUrl, { fetch: fetchStub, sameOriginHeaders });
            // Different protocols mean different origins
            const headers = fetchStub.firstCall.args[1].headers;
            assert.strictEqual(headers['X-Test-Header'], undefined);
        });
        test('should include error details in message with length information', async () => {
            const targetResource = 'https://example.com/api';
            const resourceMetadataUrl = 'https://example.com/.well-known/oauth-protected-resource';
            const metadata = {
                resource: 'https://different.com/other'
            };
            fetchStub.resolves({
                status: 200,
                json: async () => metadata,
                text: async () => JSON.stringify(metadata)
            });
            try {
                await fetchResourceMetadata(targetResource, resourceMetadataUrl, { fetch: fetchStub });
                assert.fail('Should have thrown an error');
            }
            catch (error) {
                assert.ok(/length:/.test(error.message), 'Error message should include length information');
                assert.ok(/https:\/\/different\.com\/other/.test(error.message), 'Error message should include actual resource value');
                assert.ok(/https:\/\/example\.com\/api/.test(error.message), 'Error message should include expected resource value');
            }
        });
        test('should fallback to well-known URI with path when no resourceMetadataUrl provided', async () => {
            const targetResource = 'https://example.com/api/v1';
            const expectedMetadata = {
                resource: 'https://example.com/api/v1',
                scopes_supported: ['read', 'write']
            };
            fetchStub.resolves({
                status: 200,
                json: async () => expectedMetadata,
                text: async () => JSON.stringify(expectedMetadata)
            });
            const result = await fetchResourceMetadata(targetResource, undefined, { fetch: fetchStub });
            assert.deepStrictEqual(result, expectedMetadata);
            assert.strictEqual(fetchStub.callCount, 1);
            // Should try path-appended version first
            assert.strictEqual(fetchStub.firstCall.args[0], 'https://example.com/.well-known/oauth-protected-resource/api/v1');
        });
        test('should fallback to well-known URI at root when path version fails', async () => {
            const targetResource = 'https://example.com/api/v1';
            const expectedMetadata = {
                resource: 'https://example.com/api/v1',
                scopes_supported: ['read', 'write']
            };
            // First call fails, second succeeds
            fetchStub.onFirstCall().resolves({
                status: 404,
                text: async () => 'Not Found',
                statusText: 'Not Found'
            });
            fetchStub.onSecondCall().resolves({
                status: 200,
                json: async () => expectedMetadata,
                text: async () => JSON.stringify(expectedMetadata)
            });
            const result = await fetchResourceMetadata(targetResource, undefined, { fetch: fetchStub });
            assert.deepStrictEqual(result, expectedMetadata);
            assert.strictEqual(fetchStub.callCount, 2);
            // First attempt with path
            assert.strictEqual(fetchStub.firstCall.args[0], 'https://example.com/.well-known/oauth-protected-resource/api/v1');
            // Second attempt at root
            assert.strictEqual(fetchStub.secondCall.args[0], 'https://example.com/.well-known/oauth-protected-resource');
        });
        test('should throw error when all well-known URIs fail', async () => {
            const targetResource = 'https://example.com/api/v1';
            fetchStub.resolves({
                status: 404,
                text: async () => 'Not Found',
                statusText: 'Not Found'
            });
            await assert.rejects(async () => fetchResourceMetadata(targetResource, undefined, { fetch: fetchStub }), (error) => {
                assert.ok(error instanceof AggregateError, 'Should be an AggregateError');
                assert.strictEqual(error.errors.length, 2, 'Should contain 2 errors');
                assert.ok(/Failed to fetch resource metadata from.*\/api\/v1.*404/.test(error.errors[0].message), 'First error should mention /api/v1 and 404');
                assert.ok(/Failed to fetch resource metadata from.*\.well-known.*404/.test(error.errors[1].message), 'Second error should mention .well-known and 404');
                return true;
            });
            assert.strictEqual(fetchStub.callCount, 2);
        });
        test('should not append path when target resource is root', async () => {
            const targetResource = 'https://example.com/';
            const expectedMetadata = {
                resource: 'https://example.com/',
                scopes_supported: ['read']
            };
            fetchStub.resolves({
                status: 200,
                json: async () => expectedMetadata,
                text: async () => JSON.stringify(expectedMetadata)
            });
            const result = await fetchResourceMetadata(targetResource, undefined, { fetch: fetchStub });
            assert.deepStrictEqual(result, expectedMetadata);
            assert.strictEqual(fetchStub.callCount, 1);
            // Both URLs should be the same when path is /
            assert.strictEqual(fetchStub.firstCall.args[0], 'https://example.com/.well-known/oauth-protected-resource');
        });
        test('should include same-origin headers when using well-known fallback', async () => {
            const targetResource = 'https://example.com/api';
            const sameOriginHeaders = {
                'X-Test-Header': 'test-value',
                'X-Custom-Header': 'value'
            };
            const expectedMetadata = {
                resource: 'https://example.com/api'
            };
            fetchStub.resolves({
                status: 200,
                json: async () => expectedMetadata,
                text: async () => JSON.stringify(expectedMetadata)
            });
            await fetchResourceMetadata(targetResource, undefined, { fetch: fetchStub, sameOriginHeaders });
            const headers = fetchStub.firstCall.args[1].headers;
            assert.strictEqual(headers['Accept'], 'application/json');
            assert.strictEqual(headers['X-Test-Header'], 'test-value');
            assert.strictEqual(headers['X-Custom-Header'], 'value');
        });
        test('should handle fetchImpl throwing network error and continue to next URL', async () => {
            const targetResource = 'https://example.com/api/v1';
            const expectedMetadata = {
                resource: 'https://example.com/api/v1',
                scopes_supported: ['read', 'write']
            };
            // First call throws network error, second succeeds
            fetchStub.onFirstCall().rejects(new Error('Network connection failed'));
            fetchStub.onSecondCall().resolves({
                status: 200,
                json: async () => expectedMetadata,
                text: async () => JSON.stringify(expectedMetadata)
            });
            const result = await fetchResourceMetadata(targetResource, undefined, { fetch: fetchStub });
            assert.deepStrictEqual(result, expectedMetadata);
            assert.strictEqual(fetchStub.callCount, 2);
            // First attempt with path should have thrown error
            assert.strictEqual(fetchStub.firstCall.args[0], 'https://example.com/.well-known/oauth-protected-resource/api/v1');
            // Second attempt at root should succeed
            assert.strictEqual(fetchStub.secondCall.args[0], 'https://example.com/.well-known/oauth-protected-resource');
        });
        test('should throw AggregateError when fetchImpl throws on all URLs', async () => {
            const targetResource = 'https://example.com/api/v1';
            // Both calls throw network errors
            fetchStub.rejects(new Error('Network connection failed'));
            await assert.rejects(async () => fetchResourceMetadata(targetResource, undefined, { fetch: fetchStub }), (error) => {
                assert.ok(error instanceof AggregateError, 'Should be an AggregateError');
                assert.strictEqual(error.errors.length, 2, 'Should contain 2 errors');
                assert.ok(/Network connection failed/.test(error.errors[0].message), 'First error should mention network failure');
                assert.ok(/Network connection failed/.test(error.errors[1].message), 'Second error should mention network failure');
                return true;
            });
            assert.strictEqual(fetchStub.callCount, 2);
        });
        test('should handle mix of fetch error and non-200 response', async () => {
            const targetResource = 'https://example.com/api/v1';
            // First call throws network error
            fetchStub.onFirstCall().rejects(new Error('Connection timeout'));
            // Second call returns 404
            fetchStub.onSecondCall().resolves({
                status: 404,
                text: async () => 'Not Found',
                statusText: 'Not Found'
            });
            await assert.rejects(async () => fetchResourceMetadata(targetResource, undefined, { fetch: fetchStub }), (error) => {
                assert.ok(error instanceof AggregateError, 'Should be an AggregateError');
                assert.strictEqual(error.errors.length, 2, 'Should contain 2 errors');
                assert.ok(/Connection timeout/.test(error.errors[0].message), 'First error should be network error');
                assert.ok(/Failed to fetch resource metadata.*404/.test(error.errors[1].message), 'Second error should be 404');
                return true;
            });
            assert.strictEqual(fetchStub.callCount, 2);
        });
        test('should handle fetchImpl throwing error with explicit resourceMetadataUrl', async () => {
            const targetResource = 'https://example.com/api';
            const resourceMetadataUrl = 'https://example.com/.well-known/oauth-protected-resource';
            fetchStub.rejects(new Error('DNS resolution failed'));
            await assert.rejects(async () => fetchResourceMetadata(targetResource, resourceMetadataUrl, { fetch: fetchStub }), /DNS resolution failed/);
            // Should only try once when explicit URL is provided
            assert.strictEqual(fetchStub.callCount, 1);
            assert.strictEqual(fetchStub.firstCall.args[0], resourceMetadataUrl);
        });
    });
    suite('fetchAuthorizationServerMetadata', () => {
        let sandbox;
        let fetchStub;
        setup(() => {
            sandbox = sinon.createSandbox();
            fetchStub = sandbox.stub();
        });
        teardown(() => {
            sandbox.restore();
        });
        test('should successfully fetch metadata from OAuth discovery endpoint with path insertion', async () => {
            const authorizationServer = 'https://auth.example.com/tenant';
            const expectedMetadata = {
                issuer: 'https://auth.example.com/tenant',
                authorization_endpoint: 'https://auth.example.com/tenant/authorize',
                token_endpoint: 'https://auth.example.com/tenant/token',
                response_types_supported: ['code']
            };
            fetchStub.resolves({
                status: 200,
                json: async () => expectedMetadata,
                text: async () => JSON.stringify(expectedMetadata),
                statusText: 'OK'
            });
            const result = await fetchAuthorizationServerMetadata(authorizationServer, { fetch: fetchStub });
            assert.deepStrictEqual(result, expectedMetadata);
            assert.strictEqual(fetchStub.callCount, 1);
            // Should try OAuth discovery with path insertion: https://auth.example.com/.well-known/oauth-authorization-server/tenant
            assert.strictEqual(fetchStub.firstCall.args[0], 'https://auth.example.com/.well-known/oauth-authorization-server/tenant');
            assert.strictEqual(fetchStub.firstCall.args[1].method, 'GET');
        });
        test('should fallback to OpenID Connect discovery with path insertion', async () => {
            const authorizationServer = 'https://auth.example.com/tenant';
            const expectedMetadata = {
                issuer: 'https://auth.example.com/tenant',
                authorization_endpoint: 'https://auth.example.com/tenant/authorize',
                token_endpoint: 'https://auth.example.com/tenant/token',
                response_types_supported: ['code']
            };
            // First call fails, second succeeds
            fetchStub.onFirstCall().resolves({
                status: 404,
                text: async () => 'Not Found',
                statusText: 'Not Found',
                json: async () => { throw new Error('Not JSON'); }
            });
            fetchStub.onSecondCall().resolves({
                status: 200,
                json: async () => expectedMetadata,
                text: async () => JSON.stringify(expectedMetadata),
                statusText: 'OK'
            });
            const result = await fetchAuthorizationServerMetadata(authorizationServer, { fetch: fetchStub });
            assert.deepStrictEqual(result, expectedMetadata);
            assert.strictEqual(fetchStub.callCount, 2);
            // First attempt: OAuth discovery
            assert.strictEqual(fetchStub.firstCall.args[0], 'https://auth.example.com/.well-known/oauth-authorization-server/tenant');
            // Second attempt: OpenID Connect discovery with path insertion
            assert.strictEqual(fetchStub.secondCall.args[0], 'https://auth.example.com/.well-known/openid-configuration/tenant');
        });
        test('should fallback to OpenID Connect discovery with path addition', async () => {
            const authorizationServer = 'https://auth.example.com/tenant';
            const expectedMetadata = {
                issuer: 'https://auth.example.com/tenant',
                authorization_endpoint: 'https://auth.example.com/tenant/authorize',
                token_endpoint: 'https://auth.example.com/tenant/token',
                response_types_supported: ['code']
            };
            // First two calls fail, third succeeds
            fetchStub.onFirstCall().resolves({
                status: 404,
                text: async () => 'Not Found',
                statusText: 'Not Found',
                json: async () => { throw new Error('Not JSON'); }
            });
            fetchStub.onSecondCall().resolves({
                status: 404,
                text: async () => 'Not Found',
                statusText: 'Not Found',
                json: async () => { throw new Error('Not JSON'); }
            });
            fetchStub.onThirdCall().resolves({
                status: 200,
                json: async () => expectedMetadata,
                text: async () => JSON.stringify(expectedMetadata),
                statusText: 'OK'
            });
            const result = await fetchAuthorizationServerMetadata(authorizationServer, { fetch: fetchStub });
            assert.deepStrictEqual(result, expectedMetadata);
            assert.strictEqual(fetchStub.callCount, 3);
            // First attempt: OAuth discovery
            assert.strictEqual(fetchStub.firstCall.args[0], 'https://auth.example.com/.well-known/oauth-authorization-server/tenant');
            // Second attempt: OpenID Connect discovery with path insertion
            assert.strictEqual(fetchStub.secondCall.args[0], 'https://auth.example.com/.well-known/openid-configuration/tenant');
            // Third attempt: OpenID Connect discovery with path addition
            assert.strictEqual(fetchStub.thirdCall.args[0], 'https://auth.example.com/tenant/.well-known/openid-configuration');
        });
        test('should handle authorization server at root without extra path', async () => {
            const authorizationServer = 'https://auth.example.com';
            const expectedMetadata = {
                issuer: 'https://auth.example.com/',
                authorization_endpoint: 'https://auth.example.com/authorize',
                token_endpoint: 'https://auth.example.com/token',
                response_types_supported: ['code']
            };
            fetchStub.resolves({
                status: 200,
                json: async () => expectedMetadata,
                text: async () => JSON.stringify(expectedMetadata),
                statusText: 'OK'
            });
            const result = await fetchAuthorizationServerMetadata(authorizationServer, { fetch: fetchStub });
            assert.deepStrictEqual(result, expectedMetadata);
            assert.strictEqual(fetchStub.callCount, 1);
            // For root URLs, no extra path is added
            assert.strictEqual(fetchStub.firstCall.args[0], 'https://auth.example.com/.well-known/oauth-authorization-server');
        });
        test('should handle authorization server with trailing slash', async () => {
            const authorizationServer = 'https://auth.example.com/tenant/';
            const expectedMetadata = {
                issuer: 'https://auth.example.com/tenant/',
                authorization_endpoint: 'https://auth.example.com/tenant/authorize',
                token_endpoint: 'https://auth.example.com/tenant/token',
                response_types_supported: ['code']
            };
            fetchStub.resolves({
                status: 200,
                json: async () => expectedMetadata,
                text: async () => JSON.stringify(expectedMetadata),
                statusText: 'OK'
            });
            const result = await fetchAuthorizationServerMetadata(authorizationServer, { fetch: fetchStub });
            assert.deepStrictEqual(result, expectedMetadata);
            assert.strictEqual(fetchStub.callCount, 1);
        });
        test('should include additional headers in all requests', async () => {
            const authorizationServer = 'https://auth.example.com/tenant';
            const additionalHeaders = {
                'X-Custom-Header': 'custom-value',
                'Authorization': 'Bearer token123'
            };
            const expectedMetadata = {
                issuer: 'https://auth.example.com/tenant',
                response_types_supported: ['code']
            };
            fetchStub.resolves({
                status: 200,
                json: async () => expectedMetadata,
                text: async () => JSON.stringify(expectedMetadata),
                statusText: 'OK'
            });
            await fetchAuthorizationServerMetadata(authorizationServer, { fetch: fetchStub, additionalHeaders });
            const headers = fetchStub.firstCall.args[1].headers;
            assert.strictEqual(headers['X-Custom-Header'], 'custom-value');
            assert.strictEqual(headers['Authorization'], 'Bearer token123');
            assert.strictEqual(headers['Accept'], 'application/json');
        });
        test('should throw AggregateError when all discovery endpoints fail', async () => {
            const authorizationServer = 'https://auth.example.com/tenant';
            fetchStub.resolves({
                status: 404,
                text: async () => 'Not Found',
                statusText: 'Not Found',
                json: async () => { throw new Error('Not JSON'); }
            });
            await assert.rejects(async () => fetchAuthorizationServerMetadata(authorizationServer, { fetch: fetchStub }), (error) => {
                assert.ok(error instanceof AggregateError, 'Should be an AggregateError');
                assert.strictEqual(error.errors.length, 3, 'Should contain 3 errors (one for each URL)');
                assert.strictEqual(error.message, 'Failed to fetch authorization server metadata from all attempted URLs');
                // Verify each error includes the URL it attempted
                assert.ok(/oauth-authorization-server.*404/.test(error.errors[0].message), 'First error should mention OAuth discovery and 404');
                assert.ok(/openid-configuration.*404/.test(error.errors[1].message), 'Second error should mention OpenID path insertion and 404');
                assert.ok(/openid-configuration.*404/.test(error.errors[2].message), 'Third error should mention OpenID path addition and 404');
                return true;
            });
            // Should have tried all three endpoints
            assert.strictEqual(fetchStub.callCount, 3);
        });
        test('should throw single error (not AggregateError) when only one URL is tried and fails', async () => {
            const authorizationServer = 'https://auth.example.com';
            // First attempt succeeds on second try, so only one error is collected for first URL
            fetchStub.onFirstCall().resolves({
                status: 500,
                text: async () => 'Internal Server Error',
                statusText: 'Internal Server Error',
                json: async () => { throw new Error('Not JSON'); }
            });
            const expectedMetadata = {
                issuer: 'https://auth.example.com/',
                response_types_supported: ['code']
            };
            fetchStub.onSecondCall().resolves({
                status: 200,
                json: async () => expectedMetadata,
                text: async () => JSON.stringify(expectedMetadata),
                statusText: 'OK'
            });
            // Should succeed on second attempt
            const result = await fetchAuthorizationServerMetadata(authorizationServer, { fetch: fetchStub });
            assert.deepStrictEqual(result, expectedMetadata);
            assert.strictEqual(fetchStub.callCount, 2);
        });
        test('should throw AggregateError when multiple URLs fail with mixed error types', async () => {
            const authorizationServer = 'https://auth.example.com/tenant';
            // First call: network error
            fetchStub.onFirstCall().rejects(new Error('Connection timeout'));
            // Second call: 404
            fetchStub.onSecondCall().resolves({
                status: 404,
                text: async () => 'Not Found',
                statusText: 'Not Found',
                json: async () => { throw new Error('Not JSON'); }
            });
            // Third call: 500
            fetchStub.onThirdCall().resolves({
                status: 500,
                text: async () => 'Internal Server Error',
                statusText: 'Internal Server Error',
                json: async () => { throw new Error('Not JSON'); }
            });
            await assert.rejects(async () => fetchAuthorizationServerMetadata(authorizationServer, { fetch: fetchStub }), (error) => {
                assert.ok(error instanceof AggregateError, 'Should be an AggregateError');
                assert.strictEqual(error.errors.length, 3, 'Should contain 3 errors');
                // First error is network error
                assert.ok(/Connection timeout/.test(error.errors[0].message), 'First error should be network error');
                // Second error is 404
                assert.ok(/404.*Not Found/.test(error.errors[1].message), 'Second error should be 404');
                // Third error is 500
                assert.ok(/500.*Internal Server Error/.test(error.errors[2].message), 'Third error should be 500');
                return true;
            });
            assert.strictEqual(fetchStub.callCount, 3);
        });
        test('should handle invalid JSON response', async () => {
            const authorizationServer = 'https://auth.example.com';
            fetchStub.resolves({
                status: 200,
                json: async () => { throw new Error('Invalid JSON'); },
                text: async () => 'Invalid JSON',
                statusText: 'OK'
            });
            await assert.rejects(async () => fetchAuthorizationServerMetadata(authorizationServer, { fetch: fetchStub }), /Failed to fetch authorization server metadata/);
        });
        test('should handle valid JSON but invalid metadata structure', async () => {
            const authorizationServer = 'https://auth.example.com';
            const invalidMetadata = {
                // Missing required 'issuer' field
                authorization_endpoint: 'https://auth.example.com/authorize'
            };
            fetchStub.resolves({
                status: 200,
                json: async () => invalidMetadata,
                text: async () => JSON.stringify(invalidMetadata),
                statusText: 'OK'
            });
            await assert.rejects(async () => fetchAuthorizationServerMetadata(authorizationServer, { fetch: fetchStub }), /Failed to fetch authorization server metadata/);
        });
        test('should use global fetch when custom fetch is not provided', async () => {
            const authorizationServer = 'https://auth.example.com';
            const expectedMetadata = {
                issuer: 'https://auth.example.com/',
                response_types_supported: ['code']
            };
            // eslint-disable-next-line local/code-no-any-casts
            const globalFetchStub = sandbox.stub(globalThis, 'fetch').resolves({
                status: 200,
                json: async () => expectedMetadata,
                text: async () => JSON.stringify(expectedMetadata),
                statusText: 'OK'
            });
            const result = await fetchAuthorizationServerMetadata(authorizationServer);
            assert.deepStrictEqual(result, expectedMetadata);
            assert.strictEqual(globalFetchStub.callCount, 1);
        });
        test('should handle network fetch failure and continue to next endpoint', async () => {
            const authorizationServer = 'https://auth.example.com';
            const expectedMetadata = {
                issuer: 'https://auth.example.com/',
                response_types_supported: ['code']
            };
            // First call throws network error, second succeeds
            fetchStub.onFirstCall().rejects(new Error('Network error'));
            fetchStub.onSecondCall().resolves({
                status: 200,
                json: async () => expectedMetadata,
                text: async () => JSON.stringify(expectedMetadata),
                statusText: 'OK'
            });
            const result = await fetchAuthorizationServerMetadata(authorizationServer, { fetch: fetchStub });
            assert.deepStrictEqual(result, expectedMetadata);
            // Should have tried two endpoints
            assert.strictEqual(fetchStub.callCount, 2);
        });
        test('should throw error when network fails on all endpoints', async () => {
            const authorizationServer = 'https://auth.example.com';
            fetchStub.rejects(new Error('Network error'));
            await assert.rejects(async () => fetchAuthorizationServerMetadata(authorizationServer, { fetch: fetchStub }), (error) => {
                assert.ok(error instanceof AggregateError, 'Should be an AggregateError');
                assert.strictEqual(error.errors.length, 3, 'Should contain 3 errors');
                assert.strictEqual(error.message, 'Failed to fetch authorization server metadata from all attempted URLs');
                // All errors should be network errors
                assert.ok(/Network error/.test(error.errors[0].message), 'First error should be network error');
                assert.ok(/Network error/.test(error.errors[1].message), 'Second error should be network error');
                assert.ok(/Network error/.test(error.errors[2].message), 'Third error should be network error');
                return true;
            });
            // Should have tried all three endpoints
            assert.strictEqual(fetchStub.callCount, 3);
        });
        test('should handle mix of network error and non-200 response', async () => {
            const authorizationServer = 'https://auth.example.com/tenant';
            const expectedMetadata = {
                issuer: 'https://auth.example.com/tenant',
                response_types_supported: ['code']
            };
            // First call throws network error
            fetchStub.onFirstCall().rejects(new Error('Connection timeout'));
            // Second call returns 404
            fetchStub.onSecondCall().resolves({
                status: 404,
                text: async () => 'Not Found',
                statusText: 'Not Found',
                json: async () => { throw new Error('Not JSON'); }
            });
            // Third call succeeds
            fetchStub.onThirdCall().resolves({
                status: 200,
                json: async () => expectedMetadata,
                text: async () => JSON.stringify(expectedMetadata),
                statusText: 'OK'
            });
            const result = await fetchAuthorizationServerMetadata(authorizationServer, { fetch: fetchStub });
            assert.deepStrictEqual(result, expectedMetadata);
            // Should have tried all three endpoints
            assert.strictEqual(fetchStub.callCount, 3);
        });
        test('should handle response.text() failure in error case', async () => {
            const authorizationServer = 'https://auth.example.com';
            fetchStub.resolves({
                status: 500,
                text: async () => { throw new Error('Cannot read text'); },
                statusText: 'Internal Server Error',
                json: async () => { throw new Error('Cannot read json'); }
            });
            await assert.rejects(async () => fetchAuthorizationServerMetadata(authorizationServer, { fetch: fetchStub }), (error) => {
                assert.ok(error instanceof AggregateError, 'Should be an AggregateError');
                assert.strictEqual(error.errors.length, 3, 'Should contain 3 errors');
                // All errors should include status code and statusText (fallback when text() fails)
                for (const err of error.errors) {
                    assert.ok(/500 Internal Server Error/.test(err.message), `Error should mention 500 and statusText: ${err.message}`);
                }
                return true;
            });
        });
        test('should correctly handle path addition with trailing slash', async () => {
            const authorizationServer = 'https://auth.example.com/tenant/';
            const expectedMetadata = {
                issuer: 'https://auth.example.com/tenant/',
                response_types_supported: ['code']
            };
            // First two calls fail, third succeeds
            fetchStub.onFirstCall().resolves({
                status: 404,
                text: async () => 'Not Found',
                statusText: 'Not Found',
                json: async () => { throw new Error('Not JSON'); }
            });
            fetchStub.onSecondCall().resolves({
                status: 404,
                text: async () => 'Not Found',
                statusText: 'Not Found',
                json: async () => { throw new Error('Not JSON'); }
            });
            fetchStub.onThirdCall().resolves({
                status: 200,
                json: async () => expectedMetadata,
                text: async () => JSON.stringify(expectedMetadata),
                statusText: 'OK'
            });
            const result = await fetchAuthorizationServerMetadata(authorizationServer, { fetch: fetchStub });
            assert.deepStrictEqual(result, expectedMetadata);
            assert.strictEqual(fetchStub.callCount, 3);
            // Third attempt should correctly handle trailing slash (not double-slash)
            assert.strictEqual(fetchStub.thirdCall.args[0], 'https://auth.example.com/tenant/.well-known/openid-configuration');
        });
        test('should handle deeply nested paths', async () => {
            const authorizationServer = 'https://auth.example.com/tenant/org/sub';
            const expectedMetadata = {
                issuer: 'https://auth.example.com/tenant/org/sub',
                response_types_supported: ['code']
            };
            fetchStub.resolves({
                status: 200,
                json: async () => expectedMetadata,
                text: async () => JSON.stringify(expectedMetadata),
                statusText: 'OK'
            });
            const result = await fetchAuthorizationServerMetadata(authorizationServer, { fetch: fetchStub });
            assert.deepStrictEqual(result, expectedMetadata);
            assert.strictEqual(fetchStub.callCount, 1);
            // Should correctly insert well-known path with nested paths
            assert.strictEqual(fetchStub.firstCall.args[0], 'https://auth.example.com/.well-known/oauth-authorization-server/tenant/org/sub');
        });
        test('should handle 200 response with non-metadata JSON', async () => {
            const authorizationServer = 'https://auth.example.com';
            const invalidResponse = {
                error: 'not_supported',
                message: 'Metadata not available'
            };
            fetchStub.resolves({
                status: 200,
                json: async () => invalidResponse,
                text: async () => JSON.stringify(invalidResponse),
                statusText: 'OK'
            });
            await assert.rejects(async () => fetchAuthorizationServerMetadata(authorizationServer, { fetch: fetchStub }), (error) => {
                assert.ok(error instanceof AggregateError, 'Should be an AggregateError');
                assert.strictEqual(error.errors.length, 3, 'Should contain 3 errors');
                // All errors should indicate failed to fetch with status code
                for (const err of error.errors) {
                    assert.ok(/Failed to fetch authorization server metadata from/.test(err.message), `Error should mention failed fetch: ${err.message}`);
                }
                return true;
            });
            // Should try all three endpoints
            assert.strictEqual(fetchStub.callCount, 3);
        });
        test('should validate metadata according to isAuthorizationServerMetadata', async () => {
            const authorizationServer = 'https://auth.example.com';
            // Valid metadata with all required fields
            const validMetadata = {
                issuer: 'https://auth.example.com/',
                authorization_endpoint: 'https://auth.example.com/authorize',
                token_endpoint: 'https://auth.example.com/token',
                jwks_uri: 'https://auth.example.com/jwks',
                registration_endpoint: 'https://auth.example.com/register',
                response_types_supported: ['code', 'token']
            };
            fetchStub.resolves({
                status: 200,
                json: async () => validMetadata,
                text: async () => JSON.stringify(validMetadata),
                statusText: 'OK'
            });
            const result = await fetchAuthorizationServerMetadata(authorizationServer, { fetch: fetchStub });
            assert.deepStrictEqual(result, validMetadata);
            assert.strictEqual(fetchStub.callCount, 1);
        });
        test('should handle URLs with query parameters', async () => {
            const authorizationServer = 'https://auth.example.com/tenant?version=v2';
            const expectedMetadata = {
                issuer: 'https://auth.example.com/tenant?version=v2',
                response_types_supported: ['code']
            };
            fetchStub.resolves({
                status: 200,
                json: async () => expectedMetadata,
                text: async () => JSON.stringify(expectedMetadata),
                statusText: 'OK'
            });
            const result = await fetchAuthorizationServerMetadata(authorizationServer, { fetch: fetchStub });
            assert.deepStrictEqual(result, expectedMetadata);
            assert.strictEqual(fetchStub.callCount, 1);
        });
        test('should handle empty additionalHeaders', async () => {
            const authorizationServer = 'https://auth.example.com';
            const expectedMetadata = {
                issuer: 'https://auth.example.com/',
                response_types_supported: ['code']
            };
            fetchStub.resolves({
                status: 200,
                json: async () => expectedMetadata,
                text: async () => JSON.stringify(expectedMetadata),
                statusText: 'OK'
            });
            await fetchAuthorizationServerMetadata(authorizationServer, { fetch: fetchStub, additionalHeaders: {} });
            const headers = fetchStub.firstCall.args[1].headers;
            assert.strictEqual(headers['Accept'], 'application/json');
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2F1dGgudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhaGFtZWQvRGVza3RvcC9wdWt1LXZzLWVkaXRvci9wdWt1LWVkaXRvci9zcmMvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9jb21tb24vb2F1dGgudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUNqQyxPQUFPLEtBQUssS0FBSyxNQUFNLE9BQU8sQ0FBQztBQUMvQixPQUFPLEVBQ04sZ0JBQWdCLEVBQ2hCLHdCQUF3QixFQUN4QixnQ0FBZ0MsRUFDaEMsNkJBQTZCLEVBQzdCLDRCQUE0QixFQUM1QixnREFBZ0QsRUFDaEQsd0NBQXdDLEVBQ3hDLDZCQUE2QixFQUM3Qiw0QkFBNEIsRUFDNUIsMEJBQTBCLEVBQzFCLHdCQUF3QixFQUN4QixxQkFBcUIsRUFDckIsZ0NBQWdDLEVBQ2hDLFdBQVcsRUFHWCxzQkFBc0IsRUFDdEIsTUFBTSx1QkFBdUIsQ0FBQztBQUMvQixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFDckUsT0FBTyxFQUFFLFlBQVksRUFBRSxRQUFRLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUVoRSxLQUFLLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRTtJQUNuQix1Q0FBdUMsRUFBRSxDQUFDO0lBQzFDLEtBQUssQ0FBQyxhQUFhLEVBQUUsR0FBRyxFQUFFO1FBQ3pCLElBQUksQ0FBQyxnR0FBZ0csRUFBRSxHQUFHLEVBQUU7WUFDM0csOENBQThDO1lBQzlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsd0NBQXdDLENBQUMsRUFBRSxRQUFRLEVBQUUscUJBQXFCLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1lBRXhHLGdEQUFnRDtZQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFDLHdDQUF3QyxDQUFDO2dCQUMzRCxRQUFR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