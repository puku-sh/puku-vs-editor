"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
// This import is OK since we don't use TS inside of it.
const typescript_1 = __importDefault(require("../common/typescript"));
let initCalled = false;
let create = undefined;
function init(module) {
    if (!initCalled) {
        try {
            typescript_1.default.install(module.typescript);
            create = require('./create').create;
        }
        finally {
            initCalled = true;
        }
    }
    if (create === undefined) {
        throw new Error(`Couldn't initialize TypeScript Context Server Plugin.`);
    }
    return { create };
}
module.exports = init;
//# sourceMappingURL=main.js.map