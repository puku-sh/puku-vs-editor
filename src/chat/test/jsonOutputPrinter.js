"use strict";
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
exports.ProxiedSONOutputPrinter = exports.NoopJSONOutputPrinter = exports.CollectingJSONOutputPrinter = exports.ConsoleJSONOutputPrinter = exports.IJSONOutputPrinter = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const services_1 = require("../src/util/common/services");
const sharedTypes_1 = require("./simulation/shared/sharedTypes");
exports.IJSONOutputPrinter = (0, services_1.createServiceIdentifier)('IJSONOutputPrinter');
class ConsoleJSONOutputPrinter {
    print(obj) {
        console.log(JSON.stringify(obj));
    }
}
exports.ConsoleJSONOutputPrinter = ConsoleJSONOutputPrinter;
class CollectingJSONOutputPrinter {
    constructor() {
        this.outputs = [];
    }
    print(obj) {
        this.outputs.push(obj);
    }
    async flush(outputPath) {
        const filePath = path.join(outputPath, sharedTypes_1.STDOUT_FILENAME);
        await fs.promises.writeFile(filePath, JSON.stringify(this.outputs, null, '\t'));
    }
}
exports.CollectingJSONOutputPrinter = CollectingJSONOutputPrinter;
class NoopJSONOutputPrinter {
    print(obj) {
        // noop
    }
}
exports.NoopJSONOutputPrinter = NoopJSONOutputPrinter;
class ProxiedSONOutputPrinter {
    static registerTo(instance, rpc) {
        rpc.registerMethod('ProxiedJSONOutputPrinter.print', (obj) => instance.print(obj));
        rpc.registerMethod('ProxiedJSONOutputPrinter.flush', (outputPath) => instance.flush?.(outputPath));
        return instance;
    }
    constructor(rpc) {
        this.rpc = rpc;
    }
    print(obj) {
        this.rpc.callMethod('ProxiedJSONOutputPrinter.print', obj);
    }
    async flush(outputPath) {
        await this.rpc.callMethod('ProxiedJSONOutputPrinter.flush', outputPath);
    }
}
exports.ProxiedSONOutputPrinter = ProxiedSONOutputPrinter;
//# sourceMappingURL=jsonOutputPrinter.js.map