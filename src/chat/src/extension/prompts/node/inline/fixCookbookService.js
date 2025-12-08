"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FixCookbookService = exports.ContextLocation = exports.IFixCookbookService = void 0;
const telemetry_1 = require("../../../../platform/telemetry/common/telemetry");
const services_1 = require("../../../../util/common/services");
const pythonCookbookData_1 = require("./pythonCookbookData");
exports.IFixCookbookService = (0, services_1.createServiceIdentifier)('IFixCookbookService');
var ContextLocation;
(function (ContextLocation) {
    ContextLocation[ContextLocation["ParentCallDefinition"] = 0] = "ParentCallDefinition";
    ContextLocation[ContextLocation["DefinitionAtLocation"] = 1] = "DefinitionAtLocation";
})(ContextLocation || (exports.ContextLocation = ContextLocation = {}));
let FixCookbookService = class FixCookbookService {
    constructor(telemetryService) {
        this.telemetryService = telemetryService;
        // Always enable the Ruff cookbook by default
        errorPrompts.Ruff = pythonCookbookData_1.pythonRuffCookbooks;
    }
    getCookbook(language, diagnostic) {
        const code = typeof diagnostic.code === 'object' ? diagnostic.code.value : diagnostic.code;
        const fixes = this._getManualSuggestedFixes(language, diagnostic.source, code);
        return {
            fixes,
            messageReplacement() {
                for (const fix of fixes) {
                    if (fix.replaceMessage !== undefined) {
                        return fix.replaceMessage;
                    }
                }
                return undefined;
            },
            additionalContext() {
                const definitions = [];
                for (const fix of fixes) {
                    if (fix.additionalContext !== undefined) {
                        definitions.push(fix.additionalContext);
                    }
                }
                return definitions;
            }
        };
    }
    _getManualSuggestedFixes(languageId, provider, diagnostic) {
        if (!provider || diagnostic === undefined) {
            return [];
        }
        const providerPrompts = errorPrompts[provider];
        if (!providerPrompts) {
            return [];
        }
        const diagnosticPrompts = providerPrompts[diagnostic];
        if (!diagnosticPrompts) {
            return [];
        }
        // send telemetry
        /* __GDPR__
            "cookbook.accessed" : {
                "owner": "luabud",
                "comment": "Reports when a cookbook entry is accessed for a diagnostic.",
                "languageID": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The current file language." },
                "diagnosticCode": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The diagnostic code accessed in the cookbook." },
                "provider": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The tool which is the diagnostic provider." }
                }
        */
        this.telemetryService.sendMSFTTelemetryEvent('cookbook.accessed', {
            languageId,
            diagnosticCode: diagnostic.toString(),
            provider
        });
        // Ensure result is always an array of ManualSuggestedFix
        const prompts = Array.isArray(diagnosticPrompts) ? diagnosticPrompts : [diagnosticPrompts];
        return prompts.map(prompt => typeof prompt === 'string' ? { title: prompt, message: '' } : prompt);
    }
};
exports.FixCookbookService = FixCookbookService;
exports.FixCookbookService = FixCookbookService = __decorate([
    __param(0, telemetry_1.ITelemetryService)
], FixCookbookService);
const errorPrompts = {
    "Ruff": {}, // default to empty during experimentation
    "pylint": {
        'C0301': [
            "Split into many short lines to make sure each line is less than 20 tokens; split into many more lines than you normally would. Make sure to do the following: You must split all long strings, comments, and dictionary arguments and lists into shorter lines.",
        ]
    },
    "Pylint": {
        'C0301:line-too-long': [
            "Split into many short lines to make sure each line is less than 20 tokens; split into many more lines than you normally would. Make sure to do the following: You must split all long strings, comments, and dictionary arguments and lists into shorter lines.",
        ]
    },
    "ts": {
        2345: { title: "Use this declaration and other usages as examples.", message: "", additionalContext: ContextLocation.ParentCallDefinition },
        2554: { title: "Use this declaration and other usages as examples.", message: "", additionalContext: ContextLocation.ParentCallDefinition },
    },
    "eslint": {
        'class-methods-use-this': [
            'Make the method static.',
            'Move the method outside of the class.',
            'Rewrite the method to use properties of the class.',
        ],
        'consistent-this': [
            'Use the alias for this required by eslint consistent-this rule.',
            'Use this directly instead of an alias.',
        ],
        'constructor-super': {
            title: 'Add missing super call and pass through new arguments.',
            message: 'The code is missing a super call in the constructor. Copy base class parameters to this constructor and pass them to super.',
            replaceMessage: 'Missing super call in constructor',
        },
        'func-names': [
            'Give the function expression the same name as the variable it is assigned to.',
            'Convert the function to an arrow function.',
        ],
        'func-style': [
            {
                title: 'Convert the function declaration to an expression.',
                message: 'The function expression should be assigned to a variable with the name of the original function declaration.',
            },
        ],
        'max-lines-per-function': [
            'Split into multiple functions.',
        ],
        'max-nested-callbacks': [
            'Rewrite to avoid at least one callback.',
        ],
        'max-params': [
            {
                title: 'Rewrite the signature to use an object parameter.',
                message: 'Preserve all the parameters of the original signature.'
            }
        ],
        'max-statements': [
            'Split into multiple functions.',
        ],
        'no-case-declarations': [
            'Surround the case block with braces.',
            'Move the declaration outside the case block.',
        ],
        'no-dupe-else-if': [
            'Fix the duplicate condition to be different from the first.',
            'Remove the duplicate condition',
        ],
        'no-duplicate-case': [
            {
                title: 'Change the duplicate condition to be different.',
                message: 'Do not delete the duplicate case, just fix it',
                replaceMessage: 'Duplicated condition.'
            },
            'Remove the duplicate condition',
        ],
        'no-duplicate-imports': 'Merge the duplicated import lines.',
        'no-fallthrough': [
            {
                title: 'Rewrite to avoid fallthrough.',
                message: 'Use the return value of the following cases and copy it to the preceding fallthrough case.',
                replaceMessage: 'Fallthrough case in switch statement.'
            },
            'Add a // fallthrough comment.',
            'Add a break statement.',
        ],
        'no-inner-declarations': [
            'Move the inner declaration to the top of its containing function.',
            'Move the inner declaration to the bottom of its containing function.',
            'Change the inner function declaration to an expression.',
        ],
        'no-multi-assign': 'Assign each variable in separate statements.',
        'no-negated-condition': 'Invert the branches of the conditional.',
        'no-new': [
            'Convert the class to functions.',
            'Assign the resulting object to a variable.',
        ],
        'no-sequences': [
            { title: 'Wrap the whole comma sequence in parentheses.', message: '', replaceMessage: 'Unnecessary comma sequence' },
            { title: 'Rewrite, preserving the original behavior.', message: 'The last element of the comma sequence is the one returned.' },
            { title: 'Delete the non-final elements of the sequence.', message: 'They are unused unless it is for side effects.' },
        ],
        'no-sparse-arrays': [
            'Remove duplicated commas.',
            'Add default values for the missing elements.',
        ],
        'require-await': [
            'Removed the unused async keyword.',
            {
                title: 'Rewrite the function to use await.',
                message: 'The code should change to call asynchronous functions where appropriate.'
            },
        ],
        'sort-keys': {
            title: 'Sort the properties of the entire object literal.',
            message: '',
            replaceMessage: 'Unsorted keys in object literal.',
        }
    }
};
//# sourceMappingURL=fixCookbookService.js.map