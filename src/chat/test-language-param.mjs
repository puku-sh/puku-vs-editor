#!/usr/bin/env node

/**
 * Test script to verify language parameter is sent to api.puku.sh
 */

const API_KEY = 'pk_0cb50d70d9584e68bbb0b4d96e15d969';

async function testLanguageParam() {
	console.log('Testing /v1/fim/context with language parameter...\n');

	const response = await fetch('https://api.puku.sh/v1/fim/context', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${API_KEY}`,
		},
		body: JSON.stringify({
			prompt: 'func main() {\n\t',
			suffix: '',
			openFiles: [],
			language: 'go',  // NEW: Tell model we're completing Go code
			max_tokens: 50,
			temperature: 0.1,
			stream: false,
		}),
	});

	if (!response.ok) {
		console.error(`❌ Request failed: ${response.status}`);
		const text = await response.text();
		console.error(text);
		return;
	}

	const data = await response.json();
	console.log('✅ Response:', JSON.stringify(data, null, 2));

	if (data.choices && data.choices.length > 0) {
		const completion = data.choices[0].text || '';
		console.log('\n📝 Completion:');
		console.log(completion);

		// Check if it looks like Go code (should not contain Kotlin syntax)
		const hasKotlinSyntax = completion.includes('data class') || completion.includes(': String');
		if (hasKotlinSyntax) {
			console.log('\n⚠️  WARNING: Completion contains Kotlin syntax!');
		} else {
			console.log('\n✅ Completion looks like Go code (no Kotlin syntax detected)');
		}
	}
}

testLanguageParam().catch(console.error);
