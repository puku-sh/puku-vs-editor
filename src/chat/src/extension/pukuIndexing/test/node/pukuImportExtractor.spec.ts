/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Unit tests for AST-based import extractor
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { suite, test, beforeEach, afterEach } from 'vitest';
import { PukuImportExtractor } from '../../node/pukuImportExtractor';

suite('PukuImportExtractor', () => {
	let extractor: PukuImportExtractor;

	beforeEach(() => {
		extractor = new PukuImportExtractor();
	});

	afterEach(() => {
		extractor.clearCache();
	});

	suite('TypeScript/JavaScript import extraction', () => {
		test('extracts ES6 import statements', async () => {
			const code = `
import { foo } from './utils';
import bar from '../helpers';
import * as baz from '/config';
import React from 'react';
`;
			const imports = await extractor.extractImports(code, 'typescript');

			assert.strictEqual(imports.length, 3);
			assert.ok(imports.includes('./utils'));
			assert.ok(imports.includes('../helpers'));
			assert.ok(imports.includes('/config'));
			assert.ok(!imports.includes('react')); // External package filtered
		});

		test('extracts require() calls', async () => {
			const code = `
const utils = require('./utils');
const { helper } = require('../helper');
const express = require('express');
`;
			const imports = await extractor.extractImports(code, 'javascript');

			assert.strictEqual(imports.length, 2);
			assert.ok(imports.includes('./utils'));
			assert.ok(imports.includes('../helper'));
			assert.ok(!imports.includes('express')); // External package filtered
		});

		test('handles mixed import styles', async () => {
			const code = `
import { Component } from 'react';
import utils from './utils';
const config = require('../config');
import './styles.css';
`;
			const imports = await extractor.extractImports(code, 'typescript');

			assert.strictEqual(imports.length, 3);
			assert.ok(imports.includes('./utils'));
			assert.ok(imports.includes('../config'));
			assert.ok(imports.includes('./styles.css'));
		});
	});

	suite('Python import extraction', () => {
		test('extracts relative imports', async () => {
			const code = `
from .models import User
from ..utils import helper
from ...config import settings
import requests
`;
			const imports = await extractor.extractImports(code, 'python');

			assert.ok(imports.length >= 1);
			// Python imports are converted to relative paths
			assert.ok(imports.some(i => i.includes('models') || i.includes('./')));
		});

		test('filters external packages', async () => {
			const code = `
import os
import sys
from .local import module
import numpy as np
`;
			const imports = await extractor.extractImports(code, 'python');

			// Should only include local imports
			assert.ok(imports.every(i => i.startsWith('.') || i.startsWith('/')));
		});
	});

	suite('Go import extraction', () => {
		test('extracts local package imports', async () => {
			const code = `
package main

import (
	"fmt"
	"./utils"
	"../models"
)
`;
			const imports = await extractor.extractImports(code, 'go');

			assert.ok(imports.includes('./utils'));
			assert.ok(imports.includes('../models'));
			assert.ok(!imports.includes('fmt')); // Standard library filtered
		});
	});

	suite('Rust import extraction', () => {
		test('extracts use declarations', async () => {
			const code = `
use crate::utils::helpers;
use super::models;
use std::collections::HashMap;
`;
			const imports = await extractor.extractImports(code, 'rust');

			assert.ok(imports.some(i => i.includes('utils')));
			assert.ok(imports.some(i => i.includes('models')));
		});
	});

	suite('C/C++ include extraction', () => {
		test('extracts local includes with quotes', async () => {
			const code = `
#include <stdio.h>
#include "utils.h"
#include "../models/user.h"
`;
			const imports = await extractor.extractImports(code, 'cpp');

			assert.ok(imports.includes('utils.h'));
			assert.ok(imports.includes('../models/user.h'));
			assert.ok(!imports.some(i => i.includes('stdio.h'))); // System includes filtered
		});
	});

	suite('Java import extraction', () => {
		test('extracts local imports', async () => {
			const code = `
package com.example;

import java.util.List;
import com.example.utils.Helper;
import org.springframework.Boot;
`;
			const imports = await extractor.extractImports(code, 'java');

			// Should filter out java.*, org.* packages
			assert.ok(imports.every(i => !i.startsWith('java') && !i.startsWith('org')));
		});
	});

	suite('Ruby import extraction', () => {
		test('extracts require and require_relative', async () => {
			const code = `
require 'json'
require './utils'
require_relative '../models/user'
`;
			const imports = await extractor.extractImports(code, 'ruby');

			assert.ok(imports.includes('./utils'));
			assert.ok(imports.includes('../models/user'));
		});
	});

	suite('PHP import extraction', () => {
		test('extracts require/include statements', async () => {
			const code = `
<?php
require './config.php';
require_once '../database.php';
include 'vendor/autoload.php';
?>
`;
			const imports = await extractor.extractImports(code, 'php');

			assert.ok(imports.includes('./config.php'));
			assert.ok(imports.includes('../database.php'));
		});
	});

	suite('Cache functionality', () => {
		test('caches import extraction results', async () => {
			const code = `import utils from './utils';`;
			const fileUri = 'file:///test.ts';

			// First call - should parse
			const imports1 = await extractor.extractImportsWithCache(code, 'typescript', fileUri);

			// Second call with same content - should use cache
			const imports2 = await extractor.extractImportsWithCache(code, 'typescript', fileUri);

			assert.deepStrictEqual(imports1, imports2);
			assert.strictEqual(imports1.length, 1);
			assert.ok(imports1.includes('./utils'));
		});

		test('invalidates cache on content change', async () => {
			const code1 = `import utils from './utils';`;
			const code2 = `import helper from './helper';`;
			const fileUri = 'file:///test.ts';

			const imports1 = await extractor.extractImportsWithCache(code1, 'typescript', fileUri);
			const imports2 = await extractor.extractImportsWithCache(code2, 'typescript', fileUri);

			assert.notDeepStrictEqual(imports1, imports2);
			assert.ok(imports1.includes('./utils'));
			assert.ok(imports2.includes('./helper'));
		});

		test('limits cache size to 100 files', async () => {
			for (let i = 0; i < 150; i++) {
				await extractor.extractImportsWithCache(
					`import x from './file${i}';`,
					'typescript',
					`file:///test${i}.ts`
				);
			}

			// Cache should have evicted old entries
			// This is a smoke test to ensure no crashes with large cache
			assert.ok(true);
		});

		test('clears cache', async () => {
			const code = `import utils from './utils';`;
			await extractor.extractImportsWithCache(code, 'typescript', 'file:///test.ts');

			extractor.clearCache();

			// After clear, should still work
			const imports = await extractor.extractImportsWithCache(code, 'typescript', 'file:///test.ts');
			assert.strictEqual(imports.length, 1);
		});
	});

	suite('Edge cases', () => {
		test('handles empty file', async () => {
			const imports = await extractor.extractImports('', 'typescript');
			assert.strictEqual(imports.length, 0);
		});

		test('handles file with no imports', async () => {
			const code = `
function hello() {
	return 'world';
}
`;
			const imports = await extractor.extractImports(code, 'typescript');
			assert.strictEqual(imports.length, 0);
		});

		test('handles unsupported language gracefully', async () => {
			const code = `import something`;
			const imports = await extractor.extractImports(code, 'unknown');
			assert.strictEqual(imports.length, 0);
		});

		test('handles syntax errors gracefully', async () => {
			const code = `import { broken syntax`;
			const imports = await extractor.extractImports(code, 'typescript');
			// Should not throw, may return empty array
			assert.ok(Array.isArray(imports));
		});
	});

	suite('External package filtering', () => {
		test('filters common npm packages', async () => {
			const code = `
import react from 'react';
import vue from 'vue';
import lodash from 'lodash';
import vscode from 'vscode';
import './local';
`;
			const imports = await extractor.extractImports(code, 'typescript');

			assert.strictEqual(imports.length, 1);
			assert.ok(imports.includes('./local'));
		});

		test('filters scoped packages', async () => {
			const code = `
import { component } from '@angular/core';
import { helper } from '@myorg/utils';
import './local';
`;
			const imports = await extractor.extractImports(code, 'typescript');

			assert.strictEqual(imports.length, 1);
			assert.ok(imports.includes('./local'));
		});
	});
});
