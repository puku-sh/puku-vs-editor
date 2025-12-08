"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NullContextProvider = void 0;
const contextProvider_1 = require("./contextProvider");
class NullContextProvider extends contextProvider_1.ContextProvider {
    constructor() {
        super();
    }
    provide(_result, _session, _languageService, _context, _token) {
    }
}
exports.NullContextProvider = NullContextProvider;
//# sourceMappingURL=nullContextProvider.js.map