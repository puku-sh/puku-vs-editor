/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { extractUrlPatterns, getPatternLabel, isUrlApproved, getMatchingPattern } from '../../common/chatUrlFetchingPatterns.js';
suite('ChatUrlFetchingPatterns', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('extractUrlPatterns', () => {
        test('simple domain', () => {
            const url = URI.parse('https://example.com');
            const patterns = extractUrlPatterns(url);
            assert.deepStrictEqual(patterns, [
                'https://example.com',
            ]);
        });
        test('subdomain', () => {
            const url = URI.parse('https://api.example.com');
            const patterns = extractUrlPatterns(url);
            assert.deepStrictEqual(patterns, [
                'https://api.example.com',
                'https://*.example.com'
            ]);
        });
        test('multiple subdomains', () => {
            const url = URI.parse('https://foo.bar.example.com/path');
            const patterns = extractUrlPatterns(url);
            assert.deepStrictEqual(patterns, [
                'https://foo.bar.example.com/path',
                'https://foo.bar.example.com',
                'https://*.bar.example.com',
                'https://*.example.com',
            ]);
        });
        test('with path', () => {
            const url = URI.parse('https://example.com/api/v1/users');
            const patterns = extractUrlPatterns(url);
            assert.deepStrictEqual(patterns, [
                'https://example.com/api/v1/users',
                'https://example.com',
                'https://example.com/api/v1',
                'https://example.com/api',
            ]);
        });
        test('IP address - no wildcard subdomain', () => {
            const url = URI.parse('https://192.168.1.1');
            const patterns = extractUrlPatterns(url);
            assert.strictEqual(patterns.filter(p => p.includes('*')).length, 0);
        });
        test('with query and fragment', () => {
            const url = URI.parse('https://example.com/path?query=1#fragment');
            const patterns = extractUrlPatterns(url);
            assert.deepStrictEqual(patterns, [
                'https://example.com/path?query=1#fragment',
                'https://example.com',
            ]);
        });
    });
    suite('getPatternLabel', () => {
        test('removes https protocol', () => {
            const url = URI.parse('https://example.com');
            const label = getPatternLabel(url, 'https://example.com');
            assert.strictEqual(label, 'example.com');
        });
        test('removes http protocol', () => {
            const url = URI.parse('http://example.com');
            const label = getPatternLabel(url, 'http://example.com');
            assert.strictEqual(label, 'example.com');
        });
        test('removes trailing slashes', () => {
            const url = URI.parse('https://example.com/');
            const label = getPatternLabel(url, 'https://example.com/');
            assert.strictEqual(label, 'example.com');
        });
        test('preserves path', () => {
            const url = URI.parse('https://example.com/api/v1');
            const label = getPatternLabel(url, 'https://example.com/api/v1');
            assert.strictEqual(label, 'example.com/api/v1');
        });
    });
    suite('isUrlApproved', () => {
        test('exact match with boolean', () => {
            const url = URI.parse('https://example.com');
            const approved = { 'https://example.com': true };
            assert.strictEqual(isUrlApproved(url, approved, true), true);
            assert.strictEqual(isUrlApproved(url, approved, false), true);
        });
        test('no match returns false', () => {
            const url = URI.parse('https://example.com');
            const approved = { 'https://other.com': true };
            assert.strictEqual(isUrlApproved(url, approved, true), false);
        });
        test('wildcard subdomain match', () => {
            const url = URI.parse('https://api.example.com');
            const approved = { 'https://*.example.com': true };
            assert.strictEqual(isUrlApproved(url, approved, true), true);
        });
        test('path wildcard match', () => {
            const url = URI.parse('https://example.com/api/users');
            const approved = { 'https://example.com/api/*': true };
            assert.strictEqual(isUrlApproved(url, approved, true), true);
        });
        test('granular settings - request approved', () => {
            const url = URI.parse('https://example.com');
            const approved = {
                'https://example.com': { approveRequest: true, approveResponse: false }
            };
            assert.strictEqual(isUrlApproved(url, approved, true), true);
            assert.strictEqual(isUrlApproved(url, approved, false), false);
        });
        test('granular settings - response approved', () => {
            const url = URI.parse('https://example.com');
            const approved = {
                'https://example.com': { approveRequest: false, approveResponse: true }
            };
            assert.strictEqual(isUrlApproved(url, approved, true), false);
            assert.strictEqual(isUrlApproved(url, approved, false), true);
        });
        test('granular settings - both approved', () => {
            const url = URI.parse('https://example.com');
            const approved = {
                'https://example.com': { approveRequest: true, approveResponse: true }
            };
            assert.strictEqual(isUrlApproved(url, approved, true), true);
            assert.strictEqual(isUrlApproved(url, approved, false), true);
        });
        test('granular settings - missing property defaults to false', () => {
            const url = URI.parse('https://example.com');
            const approved = {
                'https://example.com': { approveRequest: true }
            };
            assert.strictEqual(isUrlApproved(url, approved, false), false);
        });
    });
    suite('getMatchingPattern', () => {
        test('exact match', () => {
            const url = URI.parse('https://example.com/path');
            const approved = { 'https://example.com/path': true };
            const pattern = getMatchingPattern(url, approved);
            assert.strictEqual(pattern, 'https://example.com/path');
        });
        test('wildcard match', () => {
            const url = URI.parse('https://api.example.com');
            const approved = { 'https://*.example.com': true };
            const pattern = getMatchingPattern(url, approved);
            assert.strictEqual(pattern, 'https://*.example.com');
        });
        test('no match returns undefined', () => {
            const url = URI.parse('https://example.com');
            const approved = { 'https://other.com': true };
            const pattern = getMatchingPattern(url, approved);
            assert.strictEqual(pattern, undefined);
        });
        test('most specific match', () => {
            const url = URI.parse('https://api.example.com/v1/users');
            const approved = {
                'https://*.example.com': true,
                'https://api.example.com': true,
                'https://api.example.com/v1/*': true
            };
            const pattern = getMatchingPattern(url, approved);
            assert.ok(pattern !== undefined);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFVybEZldGNoaW5nUGF0dGVybnMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhaGFtZWQvRGVza3RvcC9wdWt1LXZzLWVkaXRvci9wdWt1LWVkaXRvci9zcmMvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvdGVzdC9jb21tb24vY2hhdFVybEZldGNoaW5nUGF0dGVybnMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxlQUFlLEVBQUUsYUFBYSxFQUFFLGtCQUFrQixFQUF3QixNQUFNLHlDQUF5QyxDQUFDO0FBRXZKLEtBQUssQ0FBQyx5QkFBeUIsRUFBRSxHQUFHLEVBQUU7SUFDckMsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxLQUFLLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxFQUFFO1FBQ2hDLElBQUksQ0FBQyxlQUFlLEVBQUUsR0FBRyxFQUFFO1lBQzFCLE1BQU0sR0FBRyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMscUJBQXFCLENBQUMsQ0FBQztZQUM3QyxNQUFNLFFBQVEsR0FBRyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUN6QyxNQUFNLENBQUMsZUFBZSxDQUFDLFFBQVEsRUFBRTtnQkFDaEMscUJBQXFCO2FBQ3JCLENBQUMsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLFdBQVcsRUFBRSxHQUFHLEVBQUU7WUFDdEIsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO1lBQ2pELE1BQU0sUUFBUSxHQUFH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