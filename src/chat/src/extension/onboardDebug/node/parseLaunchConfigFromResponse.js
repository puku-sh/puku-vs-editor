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
exports.parseLaunchConfigFromResponse = void 0;
exports.getSchemasForTypeAsList = getSchemasForTypeAsList;
exports.getSchemasForType = getSchemasForType;
const jsonc = __importStar(require("jsonc-parser"));
const markdown_1 = require("../../../util/common/markdown");
/**
 * Parses a launch configuration from the response or any code blocks it contains.
 * Always returns a well-structured {@link ILaunchJSON}.
 */
const parseLaunchConfigFromResponse = (response, extensionsService) => {
    const codeBlocks = (0, markdown_1.extractCodeBlocks)(response);
    const attempts = codeBlocks ? codeBlocks.map(c => c.code) : [response];
    const config = tryGetJsonDataFromPart(attempts, (parsed) => {
        if (parsed && 'configurations' in parsed && Array.isArray(parsed.configurations)) {
            parsed.configurations = parsed.configurations.map((config) => processSchemaProperties(config, extensionsService));
            return parsed;
        }
        if (parsed && 'type' in parsed && 'request' in parsed) {
            return { configurations: [processSchemaProperties(parsed, extensionsService)] };
        }
    });
    const tasks = tryGetJsonDataFromPart(attempts, (parsed) => {
        if (parsed && 'tasks' in parsed && Array.isArray(parsed.tasks)) {
            return parsed;
        }
        if (parsed && 'type' in parsed && 'label' in parsed) {
            return { tasks: [parsed] };
        }
    });
    return config && tasks ? { ...config, ...tasks } : config;
};
exports.parseLaunchConfigFromResponse = parseLaunchConfigFromResponse;
function tryGetJsonDataFromPart(attempts, process) {
    for (const attempt of attempts) {
        try {
            const parsed = jsonc.parse(attempt);
            const processed = process(parsed);
            if (processed) {
                return processed;
            }
        }
        catch {
            // continue
        }
    }
    return undefined;
}
const defaultSchema = ['name', 'type', 'request', 'debugServer', 'preLaunchTask', 'postDebugTask', 'presentation', 'internalConsoleOptions', 'suppressMultipleSessionWarning'];
function processSchemaProperties(parsed, extensionsService) {
    // See #7684
    if ('type' in parsed && parsed['type'] === 'python') {
        parsed['type'] = 'debugpy';
    }
    const schema = getSchemasForType(parsed.type, extensionsService);
    if (!schema) {
        return parsed;
    }
    for (const property of Object.keys(parsed)) {
        if (defaultSchema.includes(property) || property in schema) {
            continue;
        }
        delete parsed[property];
    }
    return parsed;
}
function getSchemasForTypeAsList(type, extensionsService) {
    for (const extension of extensionsService.allAcrossExtensionHosts) {
        const debuggers = extension.packageJSON?.contributes?.debuggers;
        if (!debuggers) {
            continue;
        }
        const debuggersForType = debuggers.filter(d => d.type === type && !d.deprecated);
        if (!Array.isArray(debuggersForType) || debuggersForType.length === 0) {
            continue;
        }
        const schemas = debuggersForType.filter(d => !!d.configurationAttributes.launch || !!d.configurationAttributes.attach).map(d => {
            const properties = [d.configurationAttributes.launch?.properties, d.configurationAttributes.attach?.properties].filter(p => p !== undefined).flat();
            return Object.entries(properties).map(p => {
                return Object.entries(p[1]).map(p => {
                    return `${p[0]}: ${p[1].description || p[1].markdownDescription}`;
                }).flat();
            }).flat();
        }).flat();
        if (schemas.length) {
            return schemas;
        }
    }
    return;
}
function getSchemasForType(type, extensionsService) {
    for (const extension of extensionsService.allAcrossExtensionHosts) {
        const debuggers = extension.packageJSON?.contributes?.debuggers;
        if (!debuggers) {
            continue;
        }
        const debuggersForType = debuggers.filter(d => d.type === type && !d.deprecated);
        if (!Array.isArray(debuggersForType) || debuggersForType.length === 0) {
            continue;
        }
        return debuggersForType.flatMap(d => [d.configurationAttributes.launch?.properties, d.configurationAttributes.attach?.properties]).filter(p => p !== undefined).reduce((accumulator, currentObject) => {
            return { ...accumulator, ...currentObject };
        }, {});
    }
    return;
}
//# sourceMappingURL=parseLaunchConfigFromResponse.js.map