/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../../base/common/uri.js';
import { normalizeURL } from '../../url/common/trustedDomains.js';
import { testUrlMatchesGlob } from '../../url/common/urlGlob.js';
/**
 * Extracts domain patterns from a URL for use in approval actions
 * @param url The URL to extract patterns from
 * @returns An array of patterns in order of specificity (most specific first)
 */
export function extractUrlPatterns(url) {
    const normalizedStr = normalizeURL(url);
    const normalized = URI.parse(normalizedStr);
    const patterns = new Set();
    // Full URL (most specific)
    const fullUrl = normalized.toString(true);
    patterns.add(fullUrl);
    // Domain-only pattern (without trailing slash)
    const domainOnly = normalized.with({ path: '', query: '', fragment: '' }).toString(true);
    patterns.add(domainOnly);
    // Wildcard subdomain pattern (*.example.com)
    const authority = normalized.authority;
    const domainParts = authority.split('.');
    // Only add wildcard subdomain if there are at least 2 parts and it's not an IP
    const isIPv4 = domainParts.length === 4 && domainParts.every((segment) => Number.isInteger(+segment));
    const isIPv6 = authority.includes(':') && authority.match(/^(\[)?[0-9a-fA-F:]+(\])?(?::\d+)?$/);
    const isIP = isIPv4 || isIPv6;
    // Only emit subdomain patterns if there are actually subdomains (more than 2 parts)
    if (!isIP && domainParts.length > 2) {
        // Create patterns by replacing each subdomain segment with *
        // For example, foo.bar.example.com -> *.bar.example.com, *.example.com
        for (let i = 0; i < domainParts.length - 2; i++) {
            const wildcardAuthority = '*.' + domainParts.slice(i + 1).join('.');
            const wildcardPattern = normalized.with({
                authority: wildcardAuthority,
                path: '',
                query: '',
                fragment: ''
            }).toString(true);
            patterns.add(wildcardPattern);
        }
    }
    // Path patterns (if there's a non-trivial path)
    const pathSegments = normalized.path.split('/').filter((s) => s.length > 0);
    if (pathSegments.length > 0) {
        // Add patterns for each path level with wildcard
        for (let i = pathSegments.length - 1; i >= 0; i--) {
            const pathPattern = pathSegments.slice(0, i).join('/');
            const urlWithPathPattern = normalized.with({
                path: (i > 0 ? '/' : '') + pathPattern,
                query: '',
                fragment: ''
            }).toString(true);
            patterns.add(urlWithPathPattern);
        }
    }
    return [...patterns].map(p => p.replace(/\/+$/, ''));
}
/**
 * Generates user-friendly labels for URL patterns to show in quick pick
 * @param url The original URL
 * @param pattern The pattern to generate a label for
 * @returns A user-friendly label describing what the pattern matches (without protocol)
 */
export function getPatternLabel(url, pattern) {
    let displayPattern = pattern;
    if (displayPattern.startsWith('https://')) {
        displayPattern = displayPattern.substring(8);
    }
    else if (displayPattern.startsWith('http://')) {
        displayPattern = displayPattern.substring(7);
    }
    return displayPattern.replace(/\/+$/, ''); // Remove trailing slashes
}
/**
 * Checks if a URL matches any approved pattern
 * @param url The URL to check
 * @param approvedUrls Map of approved URL patterns to their settings
 * @param checkRequest Whether to check request approval (true) or response approval (false)
 * @returns true if the URL is approved for the specified action
 */
export function isUrlApproved(url, approvedUrls, checkRequest) {
    const normalizedUrlStr = normalizeURL(url);
    const normalizedUrl = URI.parse(normalizedUrlStr);
    for (const [pattern, settings] of Object.entries(approvedUrls)) {
        // Check if URL matches this pattern
        if (testUrlMatchesGlob(normalizedUrl, pattern)) {
            // Handle boolean settings
            if (typeof settings === 'boolean') {
                return settings;
            }
            // Handle granular settings
            if (checkRequest && settings.approveRequest !== undefined) {
                return settings.approveRequest;
            }
            if (!checkRequest && settings.approveResponse !== undefined) {
                return settings.approveResponse;
            }
        }
    }
    return false;
}
/**
 * Gets the most specific matching pattern for a URL
 * @param url The URL to find a matching pattern for
 * @param approvedUrls Map of approved URL patterns
 * @returns The most specific matching pattern, or undefined if none match
 */
export function getMatchingPattern(url, approvedUrls) {
    const normalizedUrlStr = normalizeURL(url);
    const normalizedUrl = URI.parse(normalizedUrlStr);
    const patterns = extractUrlPatterns(url);
    // Check patterns in order of specificity (most specific first)
    for (const pattern of patterns) {
        for (const approvedPattern of Object.keys(approvedUrls)) {
            if (testUrlMatchesGlob(normalizedUrl, approvedPattern) && testUrlMatchesGlob(URI.parse(pattern), approvedPattern)) {
                return approvedPattern;
            }
        }
    }
    return undefined;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFVybEZldGNoaW5nUGF0dGVybnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL3BvcmlkaGkvZGV2ZWxvcG1lbnQvcHVrdS12cy1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9jaGF0VXJsRmV0Y2hpbmdQYXR0ZXJucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBVWpFOzs7O0dBSUc7QUFDSCxNQUFNLFVBQVUsa0JBQWtCLENBQUMsR0FBUTtJQUMxQyxNQUFNLGFBQWEsR0FBRyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDeEMsTUFBTSxVQUFVLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQztJQUM1QyxNQUFNLFFBQVEsR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFDO0lBRW5DLDJCQUEyQjtJQUMzQixNQUFNLE9BQU8sR0FBRyxVQUFVLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7SUFFdEIsK0NBQStDO0lBQy9DLE1BQU0sVUFBVSxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3pGLFFBQVEsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7SUFFekIsNkNBQTZDO0lBQzdDLE1BQU0sU0FBUyxHQUFHLFVB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