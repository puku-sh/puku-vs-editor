"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NullToolsService = exports.BaseToolsService = exports.ToolCallCancelledError = exports.IToolsService = void 0;
exports.isValidatedToolInput = isValidatedToolInput;
exports.isToolValidationError = isToolValidationError;
const ajv_1 = __importDefault(require("ajv"));
const logService_1 = require("../../../platform/log/common/logService");
const cache_1 = require("../../../util/common/cache");
const services_1 = require("../../../util/common/services");
const event_1 = require("../../../util/vs/base/common/event");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
exports.IToolsService = (0, services_1.createServiceIdentifier)('IToolsService');
function isValidatedToolInput(result) {
    return 'inputObj' in result;
}
function isToolValidationError(result) {
    return 'error' in result;
}
class ToolCallCancelledError extends Error {
    constructor(cause) {
        super(cause.message, { cause });
    }
}
exports.ToolCallCancelledError = ToolCallCancelledError;
/**
 * Navigates to a property in an object using a JSON Pointer path (RFC6901).
 * Returns an object with the parent container and property name, or null if the path is invalid.
 */
function getObjectPropertyByPath(obj, jsonPointerPath) {
    // Parse the JSON Pointer path (RFC6901)
    const pathSegments = jsonPointerPath.split('/').slice(1); // Remove empty first element from leading '/'
    if (pathSegments.length === 0) {
        return null;
    }
    // Navigate to the parent object
    let current = obj;
    for (let i = 0; i < pathSegments.length - 1; i++) {
        const segment = pathSegments[i];
        if (current && typeof current === 'object' && Object.prototype.hasOwnProperty.call(current, segment)) {
            current = current[segment];
        }
        else {
            return null;
        }
    }
    if (current && typeof current === 'object') {
        const propertyName = pathSegments[pathSegments.length - 1];
        return { parent: current, propertyName };
    }
    return null;
}
function ajvValidateForTool(toolName, fn, inputObj) {
    // Empty output can be valid when the schema only has optional properties
    if (fn(inputObj ?? {})) {
        return { inputObj };
    }
    // Check if validation failed because we have JSON strings where objects are expected
    if (fn.errors && typeof inputObj === 'object' && inputObj !== null) {
        let hasNestedJsonStrings = false;
        for (const error of fn.errors) {
            // Check if the error is about expecting an object but getting a string
            const isObjError = error.keyword === 'type' && error.params?.type === 'object' && error.instancePath;
            if (!isObjError) {
                continue;
            }
            const pathInfo = getObjectPropertyByPath(inputObj, error.instancePath);
            if (pathInfo) {
                const { parent, propertyName } = pathInfo;
                const value = parent[propertyName];
                try {
                    const parsedValue = JSON.parse(value);
                    if (typeof parsedValue === 'object' && parsedValue !== null) {
                        parent[propertyName] = parsedValue;
                        hasNestedJsonStrings = true;
                    }
                }
                catch {
                    // If parsing fails, keep the original value
                }
            }
        }
        if (hasNestedJsonStrings) {
            return ajvValidateForTool(toolName, fn, inputObj);
        }
    }
    const errors = fn.errors.map(e => e.message || `${e.instancePath} is invalid}`);
    return { error: `ERROR: Your input to the tool was invalid (${errors.join(', ')})` };
}
let BaseToolsService = class BaseToolsService extends lifecycle_1.Disposable {
    get onWillInvokeTool() { return this._onWillInvokeTool.event; }
    constructor(logService) {
        super();
        this.logService = logService;
        this._onWillInvokeTool = this._register(new event_1.Emitter());
        this.ajv = new ajv_1.default({ coerceTypes: true });
        this.schemaCache = new cache_1.LRUCache(16);
    }
    validateToolInput(name, input) {
        const tool = this.tools.find(tool => tool.name === name);
        if (!tool) {
            return { error: `ERROR: The tool "${name}" does not exist` };
        }
        let inputObj;
        try {
            inputObj = JSON.parse(input) ?? {};
        }
        catch (err) {
            if (input) {
                return { error: `ERROR: Your input to the tool was invalid (${err.toString()})` };
            }
        }
        if (!tool?.inputSchema) {
            return { inputObj: inputObj };
        }
        let fn = this.schemaCache.get(tool.name);
        if (fn === undefined) {
            try {
                fn = this.ajv.compile(tool.inputSchema);
            }
            catch (e) {
                if (!this.didWarnAboutValidationError?.has(tool.name)) {
                    this.didWarnAboutValidationError ??= new Set();
                    this.didWarnAboutValidationError.add(tool.name);
                    this.logService.warn(`Error compiling input schema for tool ${tool.name}: ${e}`);
                }
                return { inputObj };
            }
            this.schemaCache.put(tool.name, fn);
        }
        return ajvValidateForTool(tool.name, fn, inputObj);
    }
    validateToolName(name) {
        const tool = this.tools.find(tool => tool.name === name);
        if (!tool) {
            return name.replace(/[^\w-]/g, '_');
        }
    }
};
exports.BaseToolsService = BaseToolsService;
exports.BaseToolsService = BaseToolsService = __decorate([
    __param(0, logService_1.ILogService)
], BaseToolsService);
class NullToolsService extends BaseToolsService {
    constructor() {
        super(...arguments);
        this.tools = [];
        this.copilotTools = new Map();
    }
    async invokeTool(id, options, token) {
        return {
            content: [],
        };
    }
    getTool(id) {
        return undefined;
    }
    getCopilotTool(name) {
        return undefined;
    }
    getToolByToolReferenceName(name) {
        return undefined;
    }
    getEnabledTools() {
        return [];
    }
}
exports.NullToolsService = NullToolsService;
//# sourceMappingURL=toolsService.js.map