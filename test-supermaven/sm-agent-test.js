#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const os = require('os');

// Path to sm-agent binary
const SM_AGENT_PATH = path.join(os.homedir(), '.supermaven/binary/v20/macosx-aarch64/sm-agent');

class SupermavenTester {
  constructor() {
    this.process = null;
    this.stateId = 0;
    this.buffer = '';
  }

  async start() {
    console.log('[SM-Agent] Starting sm-agent...');

    this.process = spawn(SM_AGENT_PATH, ['stdio']);

    // Handle stdout
    this.process.stdout.on('data', (data) => {
      this.buffer += data.toString();
      this.processBuffer();
    });

    // Handle stderr
    this.process.stderr.on('data', (data) => {
      console.error('[SM-Agent STDERR]', data.toString());
    });

    // Handle exit
    this.process.on('close', (code) => {
      console.log(`[SM-Agent] Process exited with code ${code}`);
    });

    // Wait a bit for process to start
    await new Promise(resolve => setTimeout(resolve, 100));

    // Send greeting
    this.sendGreeting();
  }

  processBuffer() {
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || ''; // Keep incomplete line in buffer

    for (const line of lines) {
      if (line.startsWith('SM-MESSAGE ')) {
        const json = line.substring(11);
        try {
          const message = JSON.parse(json);
          this.handleMessage(message);
        } catch (e) {
          console.error('[SM-Agent] Failed to parse message:', json, e);
        }
      } else if (line.trim()) {
        console.log('[SM-Agent]', line);
      }
    }
  }

  handleMessage(message) {
    console.log('[SM-Agent Message]', JSON.stringify(message, null, 2));

    if (message.kind === 'response') {
      console.log(`\n✅ Got completion for state ${message.stateId}:`);
      if (message.items && message.items.length > 0) {
        message.items.forEach((item, i) => {
          if (item.kind === 'text') {
            console.log(`  [${i}] TEXT: "${item.text}"`);
          } else {
            console.log(`  [${i}] ${item.kind.toUpperCase()}`);
          }
        });
      }
    } else if (message.kind === 'metadata') {
      console.log(`\n📊 Metadata: dustStrings count = ${message.dustStrings?.length || 0}`);
    } else if (message.kind === 'activation_request') {
      console.log(`\n🔐 Activation required: ${message.activateUrl}`);
    } else if (message.kind === 'service_tier') {
      console.log(`\n🎯 Service tier: ${message.display}`);
    }
  }

  sendGreeting() {
    const greeting = { kind: 'greeting', allowGitignore: false };
    this.sendMessage(greeting);
    console.log('[SM-Agent] Sent greeting');
  }

  sendMessage(msg) {
    const json = JSON.stringify(msg) + '\n';
    this.process.stdin.write(json);
  }

  async requestCompletion(filePath, content, cursorOffset) {
    this.stateId++;
    const stateId = this.stateId;

    console.log(`\n🔍 Requesting completion (state ${stateId}):`);
    console.log(`  File: ${filePath}`);
    console.log(`  Cursor offset: ${cursorOffset}`);
    console.log(`  Content length: ${content.length} chars`);

    const updates = [
      {
        kind: 'file_update',
        path: filePath,
        content: content
      },
      {
        kind: 'cursor_update',
        path: filePath,
        offset: cursorOffset
      }
    ];

    const stateUpdate = {
      kind: 'state_update',
      newId: String(stateId),
      updates: updates
    };

    this.sendMessage(stateUpdate);

    // Wait for response (polling simulation)
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  stop() {
    console.log('\n[SM-Agent] Stopping...');
    if (this.process) {
      this.process.kill();
    }
  }
}

// Test cases
async function main() {
  const tester = new SupermavenTester();

  try {
    await tester.start();

    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 1: Simple Go function
    console.log('\n' + '='.repeat(60));
    console.log('TEST 1: Simple Go function completion');
    console.log('='.repeat(60));

    const goCode = `package main

import "fmt"

func main() {
	fmt.`;

    await tester.requestCompletion(
      '/tmp/test.go',
      goCode,
      goCode.length  // Cursor at the end
    );

    // Test 2: TypeScript completion
    console.log('\n' + '='.repeat(60));
    console.log('TEST 2: TypeScript function completion');
    console.log('='.repeat(60));

    const tsCode = `function fibonacci(n: number): number {
	if (n <= 1) return n;
	return `;

    await tester.requestCompletion(
      '/tmp/test.ts',
      tsCode,
      tsCode.length
    );

    // Wait for final responses
    await new Promise(resolve => setTimeout(resolve, 2000));

  } finally {
    tester.stop();
  }
}

main().catch(console.error);
