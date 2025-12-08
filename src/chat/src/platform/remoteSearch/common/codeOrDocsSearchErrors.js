"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoAccessToEndpointError = exports.MaxRetriesExceededError = exports.NotIndexedError = exports.EmbeddingsUnavailableError = exports.InaccessibleRepoOrgError = exports.CodeOrDocsSearchRepoError = void 0;
exports.constructSearchRepoError = constructSearchRepoError;
exports.constructSearchError = constructSearchError;
class CodeOrDocsSearchRepoError extends Error {
    constructor(repo, message) {
        super(message);
        this.repo = repo;
    }
}
exports.CodeOrDocsSearchRepoError = CodeOrDocsSearchRepoError;
/**
 * This error is thrown when the repository is not accessible to the user. This might be because the user
 * does not have access to the repository or the token does not have the OAuth scope (repo) to access the repository.
 */
class InaccessibleRepoOrgError extends CodeOrDocsSearchRepoError {
    constructor() {
        super(...arguments);
        this.name = "ERROR_TYPE_MISSING_INACCESSIBLE_REPO_ORG" /* SearchRepoErrorType.missingInaccessibleRepoOrg */;
    }
}
exports.InaccessibleRepoOrgError = InaccessibleRepoOrgError;
/**
 * This error is thrown when the docs embeddings are not available for the given repository.
 * NOTE: For our usecases, this is basically the same thing as NotIndexedError.
 */
class EmbeddingsUnavailableError extends CodeOrDocsSearchRepoError {
    constructor() {
        super(...arguments);
        this.name = "ERROR_TYPE_DOCS_EMBEDDINGS_UNAVAILABLE" /* SearchRepoErrorType.docsEmbeddingsUnavailable */;
    }
}
exports.EmbeddingsUnavailableError = EmbeddingsUnavailableError;
/**
 * This error is thrown when the repository is not indexed entirely including when the embeddings are not available.
 * NOTE: For our usecases, this is basically the same thing as EmbeddingsUnavailableError.
 */
class NotIndexedError extends CodeOrDocsSearchRepoError {
    constructor() {
        super(...arguments);
        this.name = "ERROR_TYPE_NOT_INDEXED" /* SearchRepoErrorType.notIndexed */;
    }
}
exports.NotIndexedError = NotIndexedError;
/**
 * This error is not thrown by the endpoint but is thrown by the client when the max retries are exceeded.
 */
class MaxRetriesExceededError extends Error {
    constructor() {
        super(...arguments);
        this.name = "ERROR_TYPE_MAX_RETRIES_EXCEEDED" /* SearchErrorType.maxRetriesExceeded */;
    }
}
exports.MaxRetriesExceededError = MaxRetriesExceededError;
/**
 * This error is not thrown by the endpoint but is thrown by the client when the code or docs search endpoint is not accessible.
 * This is usually because of a feature flag that is not enabled for this user.
 */
class NoAccessToEndpointError extends Error {
    constructor() {
        super(...arguments);
        this.name = "ERROR_TYPE_NO_ACCESS_TO_ENDPOINT" /* SearchErrorType.noAccessToEndpoint */;
    }
}
exports.NoAccessToEndpointError = NoAccessToEndpointError;
function constructSearchRepoError({ error, message, repo }) {
    switch (error) {
        case "ERROR_TYPE_MISSING_INACCESSIBLE_REPO_ORG" /* SearchRepoErrorType.missingInaccessibleRepoOrg */:
            return new InaccessibleRepoOrgError(repo, message);
        case "ERROR_TYPE_DOCS_EMBEDDINGS_UNAVAILABLE" /* SearchRepoErrorType.docsEmbeddingsUnavailable */:
            return new EmbeddingsUnavailableError(repo, message);
        case "ERROR_TYPE_NOT_INDEXED" /* SearchRepoErrorType.notIndexed */:
            return new NotIndexedError(repo, message);
        default:
            return new CodeOrDocsSearchRepoError(repo, message);
    }
}
function constructSearchError({ error, message }) {
    switch (error) {
        case "ERROR_TYPE_MAX_RETRIES_EXCEEDED" /* SearchErrorType.maxRetriesExceeded */:
            return new MaxRetriesExceededError(message);
        case "ERROR_TYPE_NO_ACCESS_TO_ENDPOINT" /* SearchErrorType.noAccessToEndpoint */:
            return new NoAccessToEndpointError(message);
        default:
            return new Error(message);
    }
}
//# sourceMappingURL=codeOrDocsSearchErrors.js.map