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
exports.AIMappedEditsProvider2 = void 0;
const codeMapperService_1 = require("../../prompts/node/codeMapper/codeMapperService");
let AIMappedEditsProvider2 = class AIMappedEditsProvider2 {
    constructor(_codeMapperService) {
        this._codeMapperService = _codeMapperService;
    }
    async provideMappedEdits(request, response, token) {
        const errorMessages = [];
        for (const codeBlock of request.codeBlocks) {
            if (token.isCancellationRequested) {
                return undefined;
            }
            const result = await this._codeMapperService.mapCode({ codeBlock, location: request.location }, response, {
                isAgent: request.location === 'tool',
                chatRequestId: request.chatRequestId,
                chatSessionId: request.chatSessionId,
                chatRequestSource: `api_${request.location}`,
                chatRequestModel: request.chatRequestModel,
            }, token);
            if (result) {
                if (result.errorDetails) {
                    errorMessages.push(result.errorDetails.message);
                }
            }
        }
        if (errorMessages.length) {
            return { errorMessage: errorMessages.join('\n') };
        }
        return {};
    }
};
exports.AIMappedEditsProvider2 = AIMappedEditsProvider2;
exports.AIMappedEditsProvider2 = AIMappedEditsProvider2 = __decorate([
    __param(0, codeMapperService_1.ICodeMapperService)
], AIMappedEditsProvider2);
//# sourceMappingURL=aiMappedEditsProvider.js.map