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
exports.DirectoryStructure = exports.MultirootWorkspaceStructure = exports.WorkspaceStructureMetadata = exports.WorkspaceStructure = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const promptPathRepresentationService_1 = require("../../../../../platform/prompts/common/promptPathRepresentationService");
const workspaceService_1 = require("../../../../../platform/workspace/common/workspaceService");
const markdown_1 = require("../../../../../util/common/markdown");
const cancellation_1 = require("../../../../../util/vs/base/common/cancellation");
const uri_1 = require("../../../../../util/vs/base/common/uri");
const instantiation_1 = require("../../../../../util/vs/platform/instantiation/common/instantiation");
const visualFileTree_1 = require("./visualFileTree");
let WorkspaceStructure = class WorkspaceStructure extends prompt_tsx_1.PromptElement {
    constructor(props, instantiationService, workspaceService) {
        super(props);
        this.instantiationService = instantiationService;
        this.workspaceService = workspaceService;
    }
    async prepare(sizing, progress, token) {
        const root = this.workspaceService.getWorkspaceFolders().at(0);
        if (!root) {
            return;
        }
        return this.instantiationService.invokeFunction(accessor => (0, visualFileTree_1.workspaceVisualFileTree)(accessor, root, { maxLength: this.props.maxSize, excludeDotFiles: this.props.excludeDotFiles }, token ?? cancellation_1.CancellationToken.None));
    }
    render(state, sizing) {
        if (!state) {
            return;
        }
        return vscpp(vscppf, null,
            "I am working in a workspace that has the following structure:",
            vscpp("br", null),
            vscpp("br", null),
            (0, markdown_1.createFencedCodeBlock)('', state.tree));
    }
};
exports.WorkspaceStructure = WorkspaceStructure;
exports.WorkspaceStructure = WorkspaceStructure = __decorate([
    __param(1, instantiation_1.IInstantiationService),
    __param(2, workspaceService_1.IWorkspaceService)
], WorkspaceStructure);
class WorkspaceStructureMetadata extends prompt_tsx_1.PromptMetadata {
    constructor(value) {
        super();
        this.value = value;
    }
}
exports.WorkspaceStructureMetadata = WorkspaceStructureMetadata;
/**
 * Similar to {@link WorkspaceStructure}, but for multiroot workspaces it
 * prefixes each path with the workspace label.
 */
let MultirootWorkspaceStructure = class MultirootWorkspaceStructure extends prompt_tsx_1.PromptElement {
    /**
     * Takes a list of relative file paths referenced in a multiroot workspace
     * response and returns their URIs.
     */
    static toURIs(workspaceService, files) {
        const folders = workspaceService.getWorkspaceFolders();
        if (!folders.length) {
            return [];
        }
        const labels = folders.map(f => workspaceService.getWorkspaceFolderName(f));
        const result = [];
        for (let relativePath of files) {
            const segments = relativePath.split(/[\\/]/g);
            let workspaceFolder = folders[0];
            if (folders.length > 1) {
                const index = labels.indexOf(segments[0]);
                if (index !== -1) {
                    segments.shift();
                    relativePath = segments.join('/');
                    workspaceFolder = folders[index];
                }
            }
            result.push({ file: uri_1.URI.joinPath(workspaceFolder, ...segments), workspaceFolder, relativePath });
        }
        return result;
    }
    constructor(props, instantiationService, workspaceService) {
        super(props);
        this.instantiationService = instantiationService;
        this.workspaceService = workspaceService;
    }
    async prepare(sizing, progress, token) {
        const folders = this.workspaceService.getWorkspaceFolders();
        return this.instantiationService.invokeFunction(accessor => Promise.all(folders.map(async (folder) => ({
            label: this.workspaceService.getWorkspaceFolderName(folder),
            tree: await (0, visualFileTree_1.workspaceVisualFileTree)(accessor, folder, { maxLength: this.props.maxSize / folders.length, excludeDotFiles: this.props.excludeDotFiles }, token ?? cancellation_1.CancellationToken.None)
        }))));
    }
    render(state, sizing) {
        if (!state.length) {
            return;
        }
        let str;
        if (state.length === 1) {
            str = state[0].tree.tree;
        }
        else {
            str = '';
            for (const { label, tree } of state) {
                str += `${label}/\n`;
                for (const line of tree.tree.split('\n')) {
                    str += `\t${line}\n`;
                }
            }
        }
        return vscpp(vscppf, null,
            "I am working in a workspace that has the following structure:",
            vscpp("br", null),
            vscpp("meta", { value: new WorkspaceStructureMetadata(state), local: true }),
            (0, markdown_1.createFencedCodeBlock)('', str));
    }
};
exports.MultirootWorkspaceStructure = MultirootWorkspaceStructure;
exports.MultirootWorkspaceStructure = MultirootWorkspaceStructure = __decorate([
    __param(1, instantiation_1.IInstantiationService),
    __param(2, workspaceService_1.IWorkspaceService)
], MultirootWorkspaceStructure);
let DirectoryStructure = class DirectoryStructure extends prompt_tsx_1.PromptElement {
    constructor(props, _instantiationService, _promptPathRepresentationService) {
        super(props);
        this._instantiationService = _instantiationService;
        this._promptPathRepresentationService = _promptPathRepresentationService;
    }
    async prepare(sizing, progress, token) {
        return this._instantiationService.invokeFunction(accessor => (0, visualFileTree_1.workspaceVisualFileTree)(accessor, this.props.directory, { maxLength: this.props.maxSize }, token ?? cancellation_1.CancellationToken.None));
    }
    render(state, sizing) {
        if (!state) {
            return;
        }
        return vscpp(vscppf, null,
            "The folder `",
            this._promptPathRepresentationService.getFilePath(this.props.directory),
            "` has the following structure:",
            vscpp("br", null),
            vscpp("br", null),
            (0, markdown_1.createFencedCodeBlock)('', state.tree));
    }
};
exports.DirectoryStructure = DirectoryStructure;
exports.DirectoryStructure = DirectoryStructure = __decorate([
    __param(1, instantiation_1.IInstantiationService),
    __param(2, promptPathRepresentationService_1.IPromptPathRepresentationService)
], DirectoryStructure);
//# sourceMappingURL=workspaceStructure.js.map