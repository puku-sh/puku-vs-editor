"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTracer = createTracer;
function createTracer(section, logFn) {
    const stringify = (value) => {
        if (!value) {
            return JSON.stringify(value);
        }
        if (typeof value === 'string') {
            return value;
        }
        else if (typeof value === 'object') {
            const toStringValue = value.toString();
            if (toStringValue && toStringValue !== '[object Object]') {
                return toStringValue;
            }
            if (value instanceof Error) {
                return value.stack || value.message;
            }
            return JSON.stringify(value, null, '\t');
        }
    };
    const sectionStr = Array.isArray(section) ? section.join('][') : section;
    return {
        trace: (message, ...payload) => {
            const payloadStr = payload.length ? ` ${stringify(payload)}` : '';
            logFn(`[${sectionStr}] ${message}` + payloadStr);
        },
        sub: (name) => {
            const subSection = Array.isArray(section) ? section.concat(name) : [section, ...(Array.isArray(name) ? name : [name])];
            const sub = createTracer(subSection, logFn);
            sub.trace('created');
            return sub;
        },
        subNoEntry: (name) => {
            const subSection = Array.isArray(section) ? section.concat(name) : [section, ...(Array.isArray(name) ? name : [name])];
            const sub = createTracer(subSection, logFn);
            return sub;
        },
        returns: (message, ...payload) => {
            const payloadStr = payload.length ? ` ${stringify(payload)}` : '';
            logFn(`[${sectionStr}] Return: ${message ? message : 'void'}${payloadStr}`);
        },
        throws: (message, ...payload) => {
            const payloadStr = payload.length ? ` ${stringify(payload)}` : '';
            logFn(`[${sectionStr}] Throw: ${message ? message : 'void'}${payloadStr}`);
        }
    };
}
//# sourceMappingURL=tracing.js.map