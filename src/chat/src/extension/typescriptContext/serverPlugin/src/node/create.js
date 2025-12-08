"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.create = create;
const api_1 = require("../common/api");
const contextProvider_1 = require("../common/contextProvider");
const protocol_1 = require("../common/protocol");
const typescripts_1 = require("../common/typescripts");
const typescript_1 = __importDefault(require("../common/typescript"));
const host_1 = require("./host");
const ts = (0, typescript_1.default)();
let installAttempted = false;
let computeContextSession = undefined;
let languageServiceHost = undefined;
let pingResult = { kind: 'error', message: 'Attempt to install context handler failed' };
const computeContextHandler = (request) => {
    const totalStart = Date.now();
    if (request.arguments === undefined) {
        return { response: { error: protocol_1.ErrorCode.noArguments, message: 'No arguments provided' }, responseRequired: true };
    }
    const args = request.arguments;
    const fileAndProject = computeContextSession?.getFileAndProject(args);
    if (fileAndProject === undefined) {
        return { response: { error: protocol_1.ErrorCode.noProject, message: 'No project found' }, responseRequired: true };
    }
    if (typeof args.line !== 'number' || typeof args.offset !== 'number') {
        return { response: { error: protocol_1.ErrorCode.invalidArguments, message: 'No project found' }, responseRequired: true };
    }
    const { file, project } = fileAndProject;
    const pos = computeContextSession?.getPositionInFile(args, file);
    if (pos === undefined) {
        return { response: { error: protocol_1.ErrorCode.invalidPosition, message: 'Position not valid' }, responseRequired: true };
    }
    let startTime = request.arguments?.startTime ?? totalStart;
    let timeBudget = typeof args.timeBudget === 'number' ? args.timeBudget : 100;
    if (startTime + timeBudget > totalStart) {
        // We are already in a timeout. So we let the computation run for 100ms
        // to profit from caching for the next request. In all other cases we take
        // the time budget left since we might be able to provide a little context.
        startTime = totalStart;
        timeBudget = 100;
    }
    // We get the language service here to get the timings outside of the compute context. Accessing the language service
    // updates the project graph if dirty which can be time consuming.
    const languageService = project.getLanguageService();
    const program = languageService.getProgram();
    if (program === undefined) {
        return { response: { error: protocol_1.ErrorCode.noProgram, message: 'No program found' }, responseRequired: true };
    }
    const computeStart = Date.now();
    const primaryCharacterBudget = new contextProvider_1.CharacterBudget(typeof args.primaryCharacterBudget === 'number' ? args.primaryCharacterBudget : 7 * 1024 * 4);
    const secondaryCharacterBudget = new contextProvider_1.CharacterBudget(typeof args.secondaryCharacterBudget === 'number' ? args.secondaryCharacterBudget : 8 * 1024 * 4);
    const normalizedPaths = [];
    if (args.neighborFiles !== undefined) {
        for (const file of args.neighborFiles) {
            normalizedPaths.push(ts.server.toNormalizedPath(file));
        }
    }
    const clientSideRunnableResults = args.clientSideRunnableResults !== undefined ? new Map(args.clientSideRunnableResults.map(item => [item.id, item])) : new Map();
    const cancellationToken = new typescripts_1.CancellationTokenWithTimer(languageServiceHost?.getCancellationToken ? languageServiceHost.getCancellationToken() : undefined, startTime, timeBudget, computeContextSession?.host.isDebugging() ?? false);
    const requestContext = new contextProvider_1.RequestContext(computeContextSession, normalizedPaths, clientSideRunnableResults, !!args.includeDocumentation);
    const result = new contextProvider_1.ContextResult(primaryCharacterBudget, secondaryCharacterBudget, requestContext);
    try {
        (0, api_1.computeContext)(result, computeContextSession, languageService, file, pos, cancellationToken);
    }
    catch (error) {
        if (!(error instanceof ts.OperationCanceledException) && !(error instanceof contextProvider_1.TokenBudgetExhaustedError)) {
            if (error instanceof Error) {
                return { response: { error: protocol_1.ErrorCode.exception, message: error.message, stack: error.stack }, responseRequired: true };
            }
            else {
                return { response: { error: protocol_1.ErrorCode.exception, message: 'Unknown error' }, responseRequired: true };
            }
        }
    }
    const endTime = Date.now();
    result.addTimings(endTime - totalStart, endTime - computeStart);
    result.setTimedOut(cancellationToken.isTimedOut());
    return { response: result.toJson(), responseRequired: true };
};
function create(info) {
    if (installAttempted) {
        return info.languageService;
    }
    if (info.session !== undefined) {
        try {
            info.session.addProtocolHandler('_.copilot.ping', () => {
                return { response: pingResult, responseRequired: true };
            });
            try {
                const versionSupported = isSupportedVersion();
                pingResult = { kind: 'ok', session: true, supported: versionSupported, version: ts.version };
                if (versionSupported) {
                    computeContextSession = new contextProvider_1.LanguageServerSession(info.session, new host_1.NodeHost());
                    languageServiceHost = info.languageServiceHost;
                    info.session.addProtocolHandler('_.copilot.context', computeContextHandler);
                }
            }
            catch (e) {
                if (e instanceof Error) {
                    pingResult = { kind: 'error', message: e.message, stack: e.stack };
                    info.session.logError(e, '_.copilot.installHandler');
                }
                else {
                    pingResult = { kind: 'error', message: 'Unknown error' };
                    info.session.logError(new Error('Unknown error'), '_.copilot.installHandler');
                }
            }
        }
        catch (error) {
            if (error instanceof Error) {
                info.session.logError(error, '_.copilot.installPingHandler');
            }
            else {
                info.session.logError(new Error('Unknown error'), '_.copilot.installPingHandler');
            }
        }
        finally {
            installAttempted = true;
        }
    }
    return info.languageService;
}
function isSupportedVersion() {
    try {
        const version = ts.versionMajorMinor.split('.');
        if (version.length < 2) {
            return false;
        }
        const major = parseInt(version[0]);
        const minor = parseInt(version[1]);
        return major > 5 || (major === 5 && minor >= 5);
    }
    catch (e) {
        return false;
    }
}
//# sourceMappingURL=create.js.map