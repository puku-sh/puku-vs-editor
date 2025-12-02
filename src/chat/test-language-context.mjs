#!/usr/bin/env node

/**
 * Test script for language parameter and context filtering
 * Tests both client-side and backend functionality
 */

import { strict as assert } from 'assert';

const API_KEY = 'pk_0cb50d70d9584e68bbb0b4d96e15d969';
const API_URL = 'https://api.puku.sh';

console.log('🧪 Testing Language Parameter & Context Filtering\n');

// Test 1: Go language hint
async function testGoLanguage() {
	console.log('Test 1: Go language hint');
	const response = await fetch(`${API_URL}/v1/fim/context`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${API_KEY}`,
		},
		body: JSON.stringify({
			prompt: 'func main() {\n\t',
			suffix: '',
			openFiles: [],
			language: 'go',
			max_tokens: 50,
			temperature: 0.1,
			stream: false,
		}),
	});

	if (!response.ok) {
		const error = await response.text();
		console.error('❌ Request failed:', response.status, error);
		throw new Error('API request failed');
	}

	const data = await response.json();
	const completion = data.choices?.[0]?.text || '';

	console.log('✅ Response received');
	console.log(`   Completion: ${completion.slice(0, 100)}...`);

	// Check for common Go patterns
	const hasGoSyntax = /\bfmt\.|println|package|func|var|:=/.test(completion);
	const hasWrongLanguage = /data class|val |fun |def |class |import java/.test(completion);

	if (hasWrongLanguage) {
		console.log('❌ FAIL: Completion contains wrong language syntax!');
		console.log('   Full completion:', completion);
		return false;
	}

	if (hasGoSyntax) {
		console.log('✅ PASS: Completion contains Go syntax');
	} else {
		console.log('⚠️  WARNING: No obvious Go syntax detected (might be neutral)');
	}

	console.log('');
	return true;
}

// Test 2: Python language hint
async function testPythonLanguage() {
	console.log('Test 2: Python language hint');
	const response = await fetch(`${API_URL}/v1/fim/context`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${API_KEY}`,
		},
		body: JSON.stringify({
			prompt: 'def main():\n    ',
			suffix: '',
			openFiles: [],
			language: 'python',
			max_tokens: 50,
			temperature: 0.1,
			stream: false,
		}),
	});

	if (!response.ok) {
		const error = await response.text();
		console.error('❌ Request failed:', response.status, error);
		throw new Error('API request failed');
	}

	const data = await response.json();
	const completion = data.choices?.[0]?.text || '';

	console.log('✅ Response received');
	console.log(`   Completion: ${completion.slice(0, 100)}...`);

	// Check for Python patterns
	const hasPythonSyntax = /\bprint\(|import |def |class |if __name__|\.append\(/.test(completion);
	const hasWrongLanguage = /data class|func |package |console\.log|System\.out/.test(completion);

	if (hasWrongLanguage) {
		console.log('❌ FAIL: Completion contains wrong language syntax!');
		console.log('   Full completion:', completion);
		return false;
	}

	if (hasPythonSyntax) {
		console.log('✅ PASS: Completion contains Python syntax');
	} else {
		console.log('⚠️  WARNING: No obvious Python syntax detected (might be neutral)');
	}

	console.log('');
	return true;
}

// Test 3: Context with openFiles
async function testContextFiles() {
	console.log('Test 3: Context with openFiles');
	const response = await fetch(`${API_URL}/v1/fim/context`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${API_KEY}`,
		},
		body: JSON.stringify({
			prompt: 'func processUser() {\n\t',
			suffix: '',
			openFiles: [
				{
					filepath: 'user.go',
					content: 'type User struct {\n\tID string\n\tName string\n\tEmail string\n}'
				}
			],
			language: 'go',
			max_tokens: 50,
			temperature: 0.1,
			stream: false,
		}),
	});

	if (!response.ok) {
		const error = await response.text();
		console.error('❌ Request failed:', response.status, error);
		throw new Error('API request failed');
	}

	const data = await response.json();
	const completion = data.choices?.[0]?.text || '';

	console.log('✅ Response received with context');
	console.log(`   Completion: ${completion.slice(0, 100)}...`);

	// Check if completion references the User struct
	const referencesContext = /User|user|ID|Name|Email/.test(completion);

	if (referencesContext) {
		console.log('✅ PASS: Completion references context (User struct)');
	} else {
		console.log('⚠️  WARNING: Completion doesn\'t obviously reference context');
	}

	console.log('');
	return true;
}

// Test 4: No language parameter (should still work)
async function testNoLanguage() {
	console.log('Test 4: No language parameter (fallback)');
	const response = await fetch(`${API_URL}/v1/fim/context`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${API_KEY}`,
		},
		body: JSON.stringify({
			prompt: 'function hello() {\n    ',
			suffix: '',
			openFiles: [],
			// No language parameter
			max_tokens: 50,
			temperature: 0.1,
			stream: false,
		}),
	});

	if (!response.ok) {
		const error = await response.text();
		console.error('❌ Request failed:', response.status, error);
		throw new Error('API request failed');
	}

	const data = await response.json();
	const completion = data.choices?.[0]?.text || '';

	console.log('✅ Response received without language hint');
	console.log(`   Completion: ${completion.slice(0, 100)}...`);
	console.log('✅ PASS: Works without language parameter');
	console.log('');
	return true;
}

// Run all tests
async function runTests() {
	const results = [];

	try {
		results.push(await testGoLanguage());
		results.push(await testPythonLanguage());
		results.push(await testContextFiles());
		results.push(await testNoLanguage());

		const passed = results.filter(Boolean).length;
		const total = results.length;

		console.log('\n' + '='.repeat(50));
		console.log(`📊 Test Results: ${passed}/${total} passed`);

		if (passed === total) {
			console.log('✅ All tests passed!');
			process.exit(0);
		} else {
			console.log('❌ Some tests failed');
			process.exit(1);
		}
	} catch (error) {
		console.error('\n❌ Test suite failed:', error.message);
		process.exit(1);
	}
}

runTests();
