/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../../base/common/codicons.js';
import { Event } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { constObservable } from '../../../../../base/common/observable.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { ToolDataSource, ToolSet } from '../../common/languageModelToolsService.js';
export class MockLanguageModelToolsService {
    constructor() {
        this.vscodeToolSet = new ToolSet('vscode', 'vscode', ThemeIcon.fromId(Codicon.code.id), ToolDataSource.Internal);
        this.launchToolSet = new ToolSet('launch', 'launch', ThemeIcon.fromId(Codicon.rocket.id), ToolDataSource.Internal);
        this.onDidChangeTools = Event.None;
        this.onDidPrepareToolCallBecomeUnresponsive = Event.None;
        this.toolSets = constObservable([]);
    }
    registerToolData(toolData) {
        return Disposable.None;
    }
    resetToolAutoConfirmation() {
    }
    getToolPostExecutionAutoConfirmation(toolId) {
        return 'never';
    }
    resetToolPostExecutionAutoConfirmation() {
    }
    flushToolUpdates() {
    }
    cancelToolCallsForRequest(requestId) {
    }
    setToolAutoConfirmation(toolId, scope) {
    }
    getToolAutoConfirmation(toolId) {
        return 'never';
    }
    registerToolImplementation(name, tool) {
        return Disposable.None;
    }
    registerTool(toolData, tool) {
        return Disposable.None;
    }
    getTools() {
        return [];
    }
    getTool(id) {
        return undefined;
    }
    getToolByName(name, includeDisabled) {
        return undefined;
    }
    acceptProgress(sessionId, callId, progress) {
    }
    async invokeTool(dto, countTokens, token) {
        return {
            content: [{ kind: 'text', value: 'result' }]
        };
    }
    getToolSetByName(name) {
        return undefined;
    }
    getToolSet(id) {
        return undefined;
    }
    createToolSet() {
        throw new Error('Method not implemented.');
    }
    toToolAndToolSetEnablementMap(toolOrToolSetNames) {
        throw new Error('Method not implemented.');
    }
    toToolReferences(variableReferences) {
        throw new Error('Method not implemented.');
    }
    getQualifiedToolNames() {
        throw new Error('Method not implemented.');
    }
    getToolByQualifiedName(qualifiedName) {
        throw new Error('Method not implemented.');
    }
    getQualifiedToolName(tool, set) {
        throw new Error('Method not implemented.');
    }
    toQualifiedToolNames(map) {
        throw new Error('Method not implemented.');
    }
    getDeprecatedQualifiedToolNames() {
        throw new Error('Method not implemented.');
    }
    mapGithubToolName(githubToolName) {
        throw new Error('Method not implemented.');
    }
}
//# sourceMappingURL=mockLanguageModelToolsService.js.map