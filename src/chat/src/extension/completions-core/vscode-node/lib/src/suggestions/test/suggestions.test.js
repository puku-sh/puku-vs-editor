"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const assert = __importStar(require("assert"));
const vscode_1 = require("vscode");
const textDocument_1 = require("../../test/textDocument");
const suggestions_1 = require("../suggestions");
suite('checkSuffix', function () {
    function assertSuffix(completionText, lineSuffix, expected) {
        const doc = (0, textDocument_1.createTextDocument)('file:///foo', 'typescript', 1, lineSuffix);
        const processed = (0, suggestions_1.checkSuffix)(doc, { line: 0, character: 0 }, {
            completionText,
        });
        assert.strictEqual(processed, expected);
    }
    test('consecutive', function () {
        assertSuffix('foo({});', '});', 3);
    });
    test('nonconsecutive', function () {
        assertSuffix('foo("bar", {});', '");', 3);
    });
});
suite('Test maybeSnipCompletionImpl', function () {
    test('Test maybeSnipCompletionImpl single closing bracket', function () {
        const lines = new StaticLines(`
class LicenseStore {
	public readonly filePath: string;
	public readonly fullLicenseText: { [key: string]: string[] };

	constructor(filePath: string, fullLicenseText: @
	}
}
		`);
        assert.deepStrictEqual((0, suggestions_1.maybeSnipCompletionImpl)(lines, lines.getPositionOfAt(), `any) {
		this.filePath = filePath;
		this.fullLicenseText = fullLicenseText;
	}`, '}'), `any) {
		this.filePath = filePath;
		this.fullLicenseText = fullLicenseText;`);
    });
    test('Test maybeSnipCompletionImpl double closing bracket', function () {
        const lines = new StaticLines(`
class LicenseStore {
	public readonly filePath: string;
	public readonly fullLicenseText: { [key: string]: string[] };

	constructor(filePath: string, fullLicenseText: @
	}
}
		`);
        assert.deepStrictEqual((0, suggestions_1.maybeSnipCompletionImpl)(lines, lines.getPositionOfAt(), `any) {
		this.filePath = filePath;
		this.fullLicenseText = fullLicenseText;
	}
}`, '}'), `any) {
		this.filePath = filePath;
		this.fullLicenseText = fullLicenseText;`);
    });
    test('Test maybeSnipCompletionImpl single closing bracket with semicolon', function () {
        const lines = new StaticLines(`
class LicenseStore {
	public readonly filePath: string;
	public readonly fullLicenseText: { [key: string]: string[] };

	constructor(filePath: string, fullLicenseText: @
	}
}
		`);
        assert.deepStrictEqual((0, suggestions_1.maybeSnipCompletionImpl)(lines, lines.getPositionOfAt(), `any) {
		this.filePath = filePath;
		this.fullLicenseText = fullLicenseText;
	};`, '}'), `any) {
		this.filePath = filePath;
		this.fullLicenseText = fullLicenseText;`);
    });
    test('Test maybeSnipCompletionImpl: Only last line can just be a prefix of the model line', function () {
        const lines = new StaticLines(`
class LicenseStore {
	public readonly filePath: string;
	public readonly fullLicenseText: { [key: string]: string[] };

	constructor(filePath: string, fullLicenseText: @
	}1
}2
		`);
        assert.deepStrictEqual((0, suggestions_1.maybeSnipCompletionImpl)(lines, lines.getPositionOfAt(), `any) {
		this.filePath = filePath;
		this.fullLicenseText = fullLicenseText;
	}
}`, '}'), `any) {
		this.filePath = filePath;
		this.fullLicenseText = fullLicenseText;
	}
}`);
        // Not restricted to the block close token
        const lines2 = new StaticLines(`
const list [
	@
];
		`);
        assert.deepStrictEqual((0, suggestions_1.maybeSnipCompletionImpl)(lines2, lines2.getPositionOfAt(), `'one',
	'two',
	'three'
]`, '}'), `'one',
	'two',
	'three'`);
    });
    test('Test maybeSnipCompletionImpl: The last line can just be a prefix of the model line', function () {
        const lines = new StaticLines(`
class LicenseStore {
	public readonly filePath: string;
	public readonly fullLicenseText: { [key: string]: string[] };

	constructor(filePath: string, fullLicenseText: @
	}
}2
		`);
        assert.deepStrictEqual((0, suggestions_1.maybeSnipCompletionImpl)(lines, lines.getPositionOfAt(), `any) {
		this.filePath = filePath;
		this.fullLicenseText = fullLicenseText;
	}
}`, '}'), `any) {
		this.filePath = filePath;
		this.fullLicenseText = fullLicenseText;`);
    });
    test('Test maybeSnipCompletionImpl: Empty Lines In Completion', function () {
        const lines = new StaticLines(`
class LicenseStore {
	public readonly filePath: string;
	public readonly fullLicenseText: { [key: string]: string[] };

	constructor(filePath: string, fullLicenseText: @

	}

}`);
        assert.deepStrictEqual((0, suggestions_1.maybeSnipCompletionImpl)(lines, lines.getPositionOfAt(), `any) {
		this.filePath = filePath;
		this.fullLicenseText = fullLicenseText;
	}


}`, '}'), `any) {
		this.filePath = filePath;
		this.fullLicenseText = fullLicenseText;`);
    });
});
class StaticLines {
    constructor(text) {
        this.lines = text.split(/\r\n|\n/g);
    }
    getLineText(lineIdx) {
        return this.lines[lineIdx];
    }
    getLineCount() {
        return this.lines.length;
    }
    getPositionOfAt() {
        for (let i = 0; i < this.lines.length; i++) {
            const idx = this.lines[i].indexOf('@');
            if (idx !== -1) {
                return new vscode_1.Position(i, idx);
            }
        }
    }
}
//# sourceMappingURL=suggestions.test.js.map