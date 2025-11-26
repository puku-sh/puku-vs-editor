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
var RunInTerminalTool_1;
import { timeout } from '../../../../../../base/common/async.js';
import { Codicon } from '../../../../../../base/common/codicons.js';
import { CancellationError } from '../../../../../../base/common/errors.js';
import { Event } from '../../../../../../base/common/event.js';
import { MarkdownString } from '../../../../../../base/common/htmlContent.js';
import { Disposable, DisposableStore } from '../../../../../../base/common/lifecycle.js';
import { basename } from '../../../../../../base/common/path.js';
import { OS } from '../../../../../../base/common/platform.js';
import { count } from '../../../../../../base/common/strings.js';
import { generateUuid } from '../../../../../../base/common/uuid.js';
import { localize } from '../../../../../../nls.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { IStorageService } from '../../../../../../platform/storage/common/storage.js';
import { ITerminalLogService } from '../../../../../../platform/terminal/common/terminal.js';
import { IRemoteAgentService } from '../../../../../services/remote/common/remoteAgentService.js';
import { IChatService } from '../../../../chat/common/chatService.js';
import { ILanguageModelToolsService, ToolDataSource, ToolInvocationPresentation } from '../../../../chat/common/languageModelToolsService.js';
import { ITerminalChatService, ITerminalService } from '../../../../terminal/browser/terminal.js';
import { ITerminalProfileResolverService } from '../../../../terminal/common/terminal.js';
import { getRecommendedToolsOverRunInTerminal } from '../alternativeRecommendation.js';
import { BasicExecuteStrategy } from '../executeStrategy/basicExecuteStrategy.js';
import { NoneExecuteStrategy } from '../executeStrategy/noneExecuteStrategy.js';
import { RichExecuteStrategy } from '../executeStrategy/richExecuteStrategy.js';
import { getOutput } from '../outputHelpers.js';
import { isFish, isPowerShell, isWindowsPowerShell, isZsh } from '../runInTerminalHelpers.js';
import { RunInTerminalToolTelemetry } from '../runInTerminalToolTelemetry.js';
import { ToolTerminalCreator } from '../toolTerminalCreator.js';
import { TreeSitterCommandParser } from '../treeSitterCommandParser.js';
import { CommandLineAutoApproveAnalyzer } from './commandLineAnalyzer/commandLineAutoApproveAnalyzer.js';
import { CommandLineFileWriteAnalyzer } from './commandLineAnalyzer/commandLineFileWriteAnalyzer.js';
import { OutputMonitor } from './monitoring/outputMonitor.js';
import { OutputMonitorState } from './monitoring/types.js';
import { LocalChatSessionUri } from '../../../../chat/common/chatUri.js';
import { CommandLineCdPrefixRewriter } from './commandLineRewriter/commandLineCdPrefixRewriter.js';
import { CommandLinePwshChainOperatorRewriter } from './commandLineRewriter/commandLinePwshChainOperatorRewriter.js';
import { IWorkspaceContextService } from '../../../../../../platform/workspace/common/workspace.js';
import { IHistoryService } from '../../../../../services/history/common/history.js';
import { TerminalCommandArtifactCollector } from './terminalCommandArtifactCollector.js';
import { isNumber, isString } from '../../../../../../base/common/types.js';
import { ChatConfiguration } from '../../../../chat/common/constants.js';
// #region Tool data
const TOOL_REFERENCE_NAME = 'runInTerminal';
const LEGACY_TOOL_REFERENCE_FULL_NAMES = ['runCommands/runInTerminal'];
function createPowerShellModelDescription(shell) {
    const isWinPwsh = isWindowsPowerShell(shell);
    return [
        `This tool allows you to execute ${isWinPwsh ? 'Windows PowerShell 5.1' : 'PowerShell'} commands in a persistent terminal session, preserving environment variables, working directory, and other context across multiple commands.`,
        '',
        'Command Execution:',
        // IMPORTANT: PowerShell 5 does not support `&&` so always re-write them to `;`. Note that
        // the behavior of `&&` differs a little from `;` but in general it's fine
        isWinPwsh ? '- Use semicolons ; to chain commands on one line, NEVER use && even when asked explicitly' : '- Prefer ; when chaining commands on one line',
        '- Prefer pipelines | for object-based data flow',
        '- Never create a sub-shell (eg. powershell -c "command") unless explicitly asked',
        '',
        'Directory Management:',
        '- Must use absolute paths to avoid navigation issues',
        '- Use $PWD or Get-Location for current directory',
        '- Use Push-Location/Pop-Location for directory stack',
        '',
        'Program Execution:',
        '- Supports .NET, Python, Node.js, and other executables',
        '- Install modules via Install-Module, Install-Package',
        '- Use Get-Command to verify cmdlet/function availability',
        '',
        'Background Processes:',
        '- For long-running tasks (e.g., servers), set isBackground=true',
        '- Returns a terminal ID for checking status and runtime later',
        '- Use Start-Job for background PowerShell jobs',
        '',
        'Output Management:',
        '- Output is automatically truncated if longer than 60KB to prevent context overflow',
        '- Use Select-Object, Where-Object, Format-Table to filter output',
        '- Use -First/-Last parameters to limit results',
        '- For pager commands, add | Out-String or | Format-List',
        '',
        'Best Practices:',
        '- Use proper cmdlet names instead of aliases in scripts',
        '- Quote paths with spaces: "C:\\Path With Spaces"',
        '- Prefer PowerShell cmdlets over external commands when available',
        '- Prefer idiomatic PowerShell like Get-ChildItem instead of dir or ls for file listings',
        '- Use Test-Path to check file/directory existence',
        '- Be specific with Select-Object properties to avoid excessive output'
    ].join('\n');
}
const genericDescription = `
Command Execution:
- Use && to chain simple commands on one line
- Prefer pipelines | over temporary files for data flow
- Never create a sub-shell (eg. bash -c "command") unless explicitly asked

Directory Management:
- Must use absolute paths to avoid navigation issues
- Use $PWD for current directory references
- Consider using pushd/popd for directory stack management
- Supports directory shortcuts like ~ and -

Program Execution:
- Supports Python, Node.js, and other executables
- Install packages via package managers (brew, apt, etc.)
- Use which or command -v to verify command availability

Background Processes:
- For long-running tasks (e.g., servers), set isBackground=true
- Returns a terminal ID for checking status and runtime later

Output Management:
- Output is automatically truncated if longer than 60KB to prevent context overflow
- Use head, tail, grep, awk to filter and limit output size
- For pager commands, disable paging: git --no-pager or add | cat
- Use wc -l to count lines before displaying large outputs

Best Practices:
- Quote variables: "$var" instead of $var to handle spaces
- Use find with -exec or xargs for file operations
- Be specific with commands to avoid excessive output`;
function createBashModelDescription() {
    return [
        'This tool allows you to execute shell commands in a persistent bash terminal session, preserving environment variables, working directory, and other context across multiple commands.',
        genericDescription,
        '- Use [[ ]] for conditional tests instead of [ ]',
        '- Prefer $() over backticks for command substitution',
        '- Use set -e at start of complex commands to exit on errors'
    ].join('\n');
}
function createZshModelDescription() {
    return [
        'This tool allows you to execute shell commands in a persistent zsh terminal session, preserving environment variables, working directory, and other context across multiple commands.',
        genericDescription,
        '- Use type to check command type (builtin, function, alias)',
        '- Use jobs, fg, bg for job control',
        '- Use [[ ]] for conditional tests instead of [ ]',
        '- Prefer $() over backticks for command substitution',
        '- Use setopt errexit for strict error handling',
        '- Take advantage of zsh globbing features (**, extended globs)'
    ].join('\n');
}
function createFishModelDescription() {
    return [
        'This tool allows you to execute shell commands in a persistent fish terminal session, preserving environment variables, working directory, and other context across multiple commands.',
        genericDescription,
        '- Use type to check command type (builtin, function, alias)',
        '- Use jobs, fg, bg for job control',
        '- Use test expressions for conditionals (no [[ ]] syntax)',
        '- Prefer command substitution with () syntax',
        '- Variables are arrays by default, use $var[1] for first element',
        '- Use set -e for strict error handling',
        '- Take advantage of fish\'s autosuggestions and completions'
    ].join('\n');
}
export async function createRunInTerminalToolData(accessor) {
    const instantiationService = accessor.get(IInstantiationService);
    const profileFetcher = instantiationService.createInstance(TerminalProfileFetcher);
    const shell = await profileFetcher.getCopilotShell();
    const os = await profileFetcher.osBackend;
    let modelDescription;
    if (shell && os && isPowerShell(shell, os)) {
        modelDescription = createPowerShellModelDescription(shell);
    }
    else if (shell && os && isZsh(shell, os)) {
        modelDescription = createZshModelDescription();
    }
    else if (shell && os && isFish(shell, os)) {
        modelDescription = createFishModelDescription();
    }
    else {
        modelDescription = createBashModelDescription();
    }
    return {
        id: 'run_in_terminal',
        toolReferenceName: TOOL_REFERENCE_NAME,
        legacyToolReferenceFullNames: LEGACY_TOOL_REFERENCE_FULL_NAMES,
        displayName: localize('runInTerminalTool.displayName', 'Run in Terminal'),
        modelDescription,
        userDescription: localize('runInTerminalTool.userDescription', 'Run commands in the terminal'),
        source: ToolDataSource.Internal,
        icon: Codicon.terminal,
        inputSchema: {
            type: 'object',
            properties: {
                command: {
                    type: 'string',
                    description: 'The command to run in the terminal.'
                },
                explanation: {
                    type: 'string',
                    description: 'A one-sentence description of what the command does. This will be shown to the user before the command is run.'
                },
                isBackground: {
                    type: 'boolean',
                    description: 'Whether the command starts a background process. If true, the command will run in the background and you will not see the output. If false, the tool call will block on the command finishing, and then you will get the output. Examples of background processes: building in watch mode, starting a server. You can check the output of a background process later on by using get_terminal_output.'
                },
            },
            required: [
                'command',
                'explanation',
                'isBackground',
            ]
        }
    };
}
// #endregion
// #region Tool implementation
var TerminalToolStorageKeysInternal;
(function (TerminalToolStorageKeysInternal) {
    TerminalToolStorageKeysInternal["TerminalSession"] = "chat.terminalSessions";
})(TerminalToolStorageKeysInternal || (TerminalToolStorageKeysInternal = {}));
/**
 * A set of characters to ignore when reporting telemetry
 */
const telemetryIgnoredSequences = [
    '\x1b[I', // Focus in
    '\x1b[O', // Focus out
];
let RunInTerminalTool = class RunInTerminalTool extends Disposable {
    static { RunInTerminalTool_1 = this; }
    static { this._backgroundExecutions = new Map(); }
    static getBackgroundOutput(id) {
        const backgroundExecution = RunInTerminalTool_1._backgroundExecutions.get(id);
        if (!backgroundExecution) {
            throw new Error('Invalid terminal ID');
        }
        return backgroundExecution.getOutput();
    }
    constructor(_chatService, _configurationService, _historyService, _instantiationService, _languageModelToolsService, _remoteAgentService, _storageService, _terminalChatService, _logService, _terminalService, _workspaceContextService) {
        super();
        this._chatService = _chatService;
        this._configurationService = _configurationService;
        this._historyService = _historyService;
        this._instantiationService = _instantiationService;
        this._languageModelToolsService = _languageModelToolsService;
        this._remoteAgentService = _remoteAgentService;
        this._storageService = _storageService;
        this._terminalChatService = _terminalChatService;
        this._logService = _logService;
        this._terminalService = _terminalService;
        this._workspaceContextService = _workspaceContextService;
        this._sessionTerminalAssociations = new Map();
        this._osBackend = this._remoteAgentService.getEnvironment().then(remoteEnv => remoteEnv?.os ?? OS);
        this._terminalToolCreator = this._instantiationService.createInstance(ToolTerminalCreator);
        this._treeSitterCommandParser = this._register(this._instantiationService.createInstance(TreeSitterCommandParser));
        this._telemetry = this._instantiationService.createInstance(RunInTerminalToolTelemetry);
        this._commandArtifactCollector = this._instantiationService.createInstance(TerminalCommandArtifactCollector);
        this._profileFetcher = this._instantiationService.createInstance(TerminalProfileFetcher);
        this._commandLineRewriters = [
            this._register(this._instantiationService.createInstance(CommandLineCdPrefixRewriter)),
            this._register(this._instantiationService.createInstance(CommandLinePwshChainOperatorRewriter, this._treeSitterCommandParser)),
        ];
        this._commandLineAnalyzers = [
            this._register(this._instantiationService.createInstance(CommandLineFileWriteAnalyzer, this._treeSitterCommandParser, (message, args) => this._logService.info(`RunInTerminalTool#CommandLineFileWriteAnalyzer: ${message}`, args))),
            this._register(this._instantiationService.createInstance(CommandLineAutoApproveAnalyzer, this._treeSitterCommandParser, this._telemetry, (message, args) => this._logService.info(`RunInTerminalTool#CommandLineAutoApproveAnalyzer: ${message}`, args))),
        ];
        // Clear out warning accepted state if the setting is disabled
        this._register(Event.runAndSubscribe(this._configurationService.onDidChangeConfiguration, e => {
            if (!e || e.affectsConfiguration("chat.tools.terminal.enableAutoApprove" /* TerminalChatAgentToolsSettingId.EnableAutoApprove */)) {
                if (this._configurationService.getValue("chat.tools.terminal.enableAutoApprove" /* TerminalChatAgentToolsSettingId.EnableAutoApprove */) !== true) {
                    this._storageService.remove("chat.tools.terminal.autoApprove.warningAccepted" /* TerminalToolConfirmationStorageKeys.TerminalAutoApproveWarningAccepted */, -1 /* StorageScope.APPLICATION */);
                }
            }
        }));
        // Restore terminal associations from storage
        this._restoreTerminalAssociations();
        this._register(this._terminalService.onDidDisposeInstance(e => {
            for (const [sessionId, toolTerminal] of this._sessionTerminalAssociations.entries()) {
                if (e === toolTerminal.instance) {
                    this._sessionTerminalAssociations.delete(sessionId);
                }
            }
        }));
        // Listen for chat session disposal to clean up associated terminals
        this._register(this._chatService.onDidDisposeSession(e => {
            const localSessionId = LocalChatSessionUri.parseLocalSessionId(e.sessionResource);
            if (localSessionId) {
                this._cleanupSessionTerminals(localSessionId);
            }
        }));
    }
    async prepareToolInvocation(context, token) {
        const args = context.parameters;
        const instance = context.chatSessionId ? this._sessionTerminalAssociations.get(context.chatSessionId)?.instance : undefined;
        const [os, shell, cwd] = await Promise.all([
            this._osBackend,
            this._profileFetcher.getCopilotShell(),
            (async () => {
                let cwd = await instance?.getCwdResource();
                if (!cwd) {
                    const activeWorkspaceRootUri = this._historyService.getLastActiveWorkspaceRoot();
                    const workspaceFolder = activeWorkspaceRootUri ? this._workspaceContextService.getWorkspaceFolder(activeWorkspaceRootUri) ?? undefined : undefined;
                    cwd = workspaceFolder?.uri;
                }
                return cwd;
            })()
        ]);
        const language = os === 1 /* OperatingSystem.Windows */ ? 'pwsh' : 'sh';
        const terminalToolSessionId = generateUuid();
        // Generate a custom command ID to link the command between renderer and pty host
        const terminalCommandId = `tool-${generateUuid()}`;
        let rewrittenCommand = args.command;
        for (const rewriter of this._commandLineRewriters) {
            const rewriteResult = await rewriter.rewrite({
                commandLine: rewrittenCommand,
                cwd,
                shell,
                os
            });
            if (rewriteResult) {
                rewrittenCommand = rewriteResult.rewritten;
                this._logService.info(`RunInTerminalTool: Command rewritten by ${rewriter.constructor.name}: ${rewriteResult.reasoning}`);
            }
        }
        const toolSpecificData = {
            kind: 'terminal',
            terminalToolSessionId,
            terminalCommandId,
            commandLine: {
                original: args.command,
                toolEdited: rewrittenCommand === args.command ? undefined : rewrittenCommand
            },
            language,
        };
        // HACK: Exit early if there's an alternative recommendation, this is a little hacky but
        // it's the current mechanism for re-routing terminal tool calls to something else.
        const alternativeRecommendation = getRecommendedToolsOverRunInTerminal(args.command, this._languageModelToolsService);
        if (alternativeRecommendation) {
            toolSpecificData.alternativeRecommendation = alternativeRecommendation;
            return {
                confirmationMessages: undefined,
                presentation: ToolInvocationPresentation.Hidden,
                toolSpecificData,
            };
        }
        // Determine auto approval, this happens even when auto approve is off to that reasoning
        // can be reviewed in the terminal channel. It also allows gauging the effective set of
        // commands that would be auto approved if it were enabled.
        const commandLine = rewrittenCommand ?? args.command;
        const isEligibleForAutoApproval = () => {
            const config = this._configurationService.getValue(ChatConfiguration.EligibleForAutoApproval);
            if (config && typeof config === 'object') {
                if (Object.prototype.hasOwnProperty.call(config, TOOL_REFERENCE_NAME)) {
                    return config[TOOL_REFERENCE_NAME];
                }
                for (const legacyName of LEGACY_TOOL_REFERENCE_FULL_NAMES) {
                    if (Object.prototype.hasOwnProperty.call(config, legacyName)) {
                        return config[legacyName];
                    }
                }
            }
            // Default
            return true;
        };
        const isAutoApproveEnabled = this._configurationService.getValue("chat.tools.terminal.enableAutoApprove" /* TerminalChatAgentToolsSettingId.EnableAutoApprove */) === true;
        const isAutoApproveWarningAccepted = this._storageService.getBoolean("chat.tools.terminal.autoApprove.warningAccepted" /* TerminalToolConfirmationStorageKeys.TerminalAutoApproveWarningAccepted */, -1 /* StorageScope.APPLICATION */, false);
        const isAutoApproveAllowed = isEligibleForAutoApproval() && isAutoApproveEnabled && isAutoApproveWarningAccepted;
        const commandLineAnalyzerOptions = {
            commandLine,
            cwd,
            os,
            shell,
            treeSitterLanguage: isPowerShell(shell, os) ? "powershell" /* TreeSitterCommandParserLanguage.PowerShell */ : "bash" /* TreeSitterCommandParserLanguage.Bash */,
            terminalToolSessionId,
            chatSessionId: context.chatSessionId,
        };
        const commandLineAnalyzerResults = await Promise.all(this._commandLineAnalyzers.map(e => e.analyze(commandLineAnalyzerOptions)));
        const disclaimersRaw = commandLineAnalyzerResults.filter(e => e.disclaimers).flatMap(e => e.disclaimers);
        let disclaimer;
        if (disclaimersRaw.length > 0) {
            disclaimer = new MarkdownString(`$(${Codicon.info.id}) ` + disclaimersRaw.join(' '), { supportThemeIcons: true });
        }
        const analyzersIsAutoApproveAllowed = commandLineAnalyzerResults.every(e => e.isAutoApproveAllowed);
        const customActions = isEligibleForAutoApproval() && analyzersIsAutoApproveAllowed ? commandLineAnalyzerResults.map(e => e.customActions ?? []).flat() : undefined;
        let shellType = basename(shell, '.exe');
        if (shellType === 'powershell') {
            shellType = 'pwsh';
        }
        const isFinalAutoApproved = (
        // Is the setting enabled and the user has opted-in
        isAutoApproveAllowed &&
            // Does at least one analyzer auto approve
            commandLineAnalyzerResults.some(e => e.isAutoApproved) &&
            // No analyzer denies auto approval
            commandLineAnalyzerResults.every(e => e.isAutoApproved !== false) &&
            // All analyzers allow auto approval
            analyzersIsAutoApproveAllowed);
        if (isFinalAutoApproved) {
            toolSpecificData.autoApproveInfo = commandLineAnalyzerResults.find(e => e.autoApproveInfo)?.autoApproveInfo;
        }
        const confirmationMessages = isFinalAutoApproved ? undefined : {
            title: args.isBackground
                ? localize('runInTerminal.background', "Run `{0}` command? (background terminal)", shellType)
                : localize('runInTerminal', "Run `{0}` command?", shellType),
            message: new MarkdownString(args.explanation),
            disclaimer,
            terminalCustomActions: customActions,
        };
        return {
            confirmationMessages,
            toolSpecificData,
        };
    }
    async invoke(invocation, _countTokens, _progress, token) {
        const toolSpecificData = invocation.toolSpecificData;
        if (!toolSpecificData) {
            throw new Error('toolSpecificData must be provided for this tool');
        }
        const commandId = toolSpecificData.terminalCommandId;
        if (toolSpecificData.alternativeRecommendation) {
            return {
                content: [{
                        kind: 'text',
                        value: toolSpecificData.alternativeRecommendation
                    }]
            };
        }
        const args = invocation.parameters;
        this._logService.debug(`RunInTerminalTool: Invoking with options ${JSON.stringify(args)}`);
        let toolResultMessage;
        const chatSessionId = invocation.context?.sessionId ?? 'no-chat-session';
        const command = toolSpecificData.commandLine.userEdited ?? toolSpecificData.commandLine.toolEdited ?? toolSpecificData.commandLine.original;
        const didUserEditCommand = (toolSpecificData.commandLine.userEdited !== undefined &&
            toolSpecificData.commandLine.userEdited !== toolSpecificData.commandLine.original);
        const didToolEditCommand = (!didUserEditCommand &&
            toolSpecificData.commandLine.toolEdited !== undefined &&
            toolSpecificData.commandLine.toolEdited !== toolSpecificData.commandLine.original);
        if (token.isCancellationRequested) {
            throw new CancellationError();
        }
        let error;
        const isNewSession = !args.isBackground && !this._sessionTerminalAssociations.has(chatSessionId);
        const timingStart = Date.now();
        const termId = generateUuid();
        const terminalToolSessionId = toolSpecificData.terminalToolSessionId;
        const store = new DisposableStore();
        this._logService.debug(`RunInTerminalTool: Creating ${args.isBackground ? 'background' : 'foreground'} terminal. termId=${termId}, chatSessionId=${chatSessionId}`);
        const toolTerminal = await (args.isBackground
            ? this._initBackgroundTerminal(chatSessionId, termId, terminalToolSessionId, token)
            : this._initForegroundTerminal(chatSessionId, termId, terminalToolSessionId, token));
        this._handleTerminalVisibility(toolTerminal);
        const timingConnectMs = Date.now() - timingStart;
        const xterm = await toolTerminal.instance.xtermReadyPromise;
        if (!xterm) {
            throw new Error('Instance was disposed before xterm.js was ready');
        }
        const commandDetection = toolTerminal.instance.capabilities.get(2 /* TerminalCapability.CommandDetection */);
        let inputUserChars = 0;
        let inputUserSigint = false;
        store.add(xterm.raw.onData(data => {
            if (!telemetryIgnoredSequences.includes(data)) {
                inputUserChars += data.length;
            }
            inputUserSigint ||= data === '\x03';
        }));
        let outputMonitor;
        if (args.isBackground) {
            let pollingResult;
            try {
                this._logService.debug(`RunInTerminalTool: Starting background execution \`${command}\``);
                const execution = new BackgroundTerminalExecution(toolTerminal.instance, xterm, command, chatSessionId, commandId);
                RunInTerminalTool_1._backgroundExecutions.set(termId, execution);
                outputMonitor = store.add(this._instantiationService.createInstance(OutputMonitor, execution, undefined, invocation.context, token, command));
                await Event.toPromise(outputMonitor.onDidFinishCommand);
                const pollingResult = outputMonitor.pollingResult;
                if (token.isCancellationRequested) {
                    throw new CancellationError();
                }
                await this._commandArtifactCollector.capture(toolSpecificData, toolTerminal.instance, commandId, pollingResult?.output);
                const state = toolSpecificData.terminalCommandState ?? {};
                state.timestamp = state.timestamp ?? timingStart;
                toolSpecificData.terminalCommandState = state;
                let resultText = (didUserEditCommand
                    ? `Note: The user manually edited the command to \`${command}\`, and that command is now running in terminal with ID=${termId}`
                    : didToolEditCommand
                        ? `Note: The tool simplified the command to \`${command}\`, and that command is now running in terminal with ID=${termId}`
                        : `Command is running in terminal with ID=${termId}`);
                if (pollingResult && pollingResult.modelOutputEvalResponse) {
                    resultText += `\n\ The command became idle with output:\n${pollingResult.modelOutputEvalResponse}`;
                }
                else if (pollingResult) {
                    resultText += `\n\ The command is still running, with output:\n${pollingResult.output}`;
                }
                return {
                    toolMetadata: {
                        exitCode: undefined // Background processes don't have immediate exit codes
                    },
                    content: [{
                            kind: 'text',
                            value: resultText,
                        }],
                };
            }
            catch (e) {
                if (termId) {
                    RunInTerminalTool_1._backgroundExecutions.get(termId)?.dispose();
                    RunInTerminalTool_1._backgroundExecutions.delete(termId);
                }
                error = e instanceof CancellationError ? 'canceled' : 'unexpectedException';
                throw e;
            }
            finally {
                store.dispose();
                this._logService.debug(`RunInTerminalTool: Finished polling \`${pollingResult?.output.length}\` lines of output in \`${pollingResult?.pollDurationMs}\``);
                const timingExecuteMs = Date.now() - timingStart;
                this._telemetry.logInvoke(toolTerminal.instance, {
                    terminalToolSessionId: toolSpecificData.terminalToolSessionId,
                    didUserEditCommand,
                    didToolEditCommand,
                    shellIntegrationQuality: toolTerminal.shellIntegrationQuality,
                    isBackground: true,
                    error,
                    exitCode: undefined,
                    isNewSession: true,
                    timingExecuteMs,
                    timingConnectMs,
                    terminalExecutionIdleBeforeTimeout: pollingResult?.state === OutputMonitorState.Idle,
                    outputLineCount: pollingResult?.output ? count(pollingResult.output, '\n') : 0,
                    pollDurationMs: pollingResult?.pollDurationMs,
                    inputUserChars,
                    inputUserSigint,
                    inputToolManualAcceptCount: outputMonitor?.outputMonitorTelemetryCounters.inputToolManualAcceptCount,
                    inputToolManualRejectCount: outputMonitor?.outputMonitorTelemetryCounters.inputToolManualRejectCount,
                    inputToolManualChars: outputMonitor?.outputMonitorTelemetryCounters.inputToolManualChars,
                    inputToolAutoAcceptCount: outputMonitor?.outputMonitorTelemetryCounters.inputToolAutoAcceptCount,
                    inputToolAutoChars: outputMonitor?.outputMonitorTelemetryCounters.inputToolAutoChars,
                    inputToolManualShownCount: outputMonitor?.outputMonitorTelemetryCounters.inputToolManualShownCount,
                    inputToolFreeFormInputCount: outputMonitor?.outputMonitorTelemetryCounters.inputToolFreeFormInputCount,
                    inputToolFreeFormInputShownCount: outputMonitor?.outputMonitorTelemetryCounters.inputToolFreeFormInputShownCount
                });
            }
        }
        else {
            let terminalResult = '';
            let outputLineCount = -1;
            let exitCode;
            try {
                let strategy;
                switch (toolTerminal.shellIntegrationQuality) {
                    case "none" /* ShellIntegrationQuality.None */: {
                        strategy = this._instantiationService.createInstance(NoneExecuteStrategy, toolTerminal.instance, () => toolTerminal.receivedUserInput ?? false);
                        toolResultMessage = '$(info) Enable [shell integration](https://code.visualstudio.com/docs/terminal/shell-integration) to improve command detection';
                        break;
                    }
                    case "basic" /* ShellIntegrationQuality.Basic */: {
                        strategy = this._instantiationService.createInstance(BasicExecuteStrategy, toolTerminal.instance, () => toolTerminal.receivedUserInput ?? false, commandDetection);
                        break;
                    }
                    case "rich" /* ShellIntegrationQuality.Rich */: {
                        strategy = this._instantiationService.createInstance(RichExecuteStrategy, toolTerminal.instance, commandDetection);
                        break;
                    }
                }
                this._logService.debug(`RunInTerminalTool: Using \`${strategy.type}\` execute strategy for command \`${command}\``);
                store.add(strategy.onDidCreateStartMarker(startMarker => {
                    if (!outputMonitor) {
                        outputMonitor = store.add(this._instantiationService.createInstance(OutputMonitor, { instance: toolTerminal.instance, sessionId: invocation.context?.sessionId, getOutput: (marker) => getOutput(toolTerminal.instance, marker ?? startMarker) }, undefined, invocation.context, token, command));
                    }
                }));
                const executeResult = await strategy.execute(command, token, commandId);
                // Reset user input state after command execution completes
                toolTerminal.receivedUserInput = false;
                if (token.isCancellationRequested) {
                    throw new CancellationError();
                }
                await this._commandArtifactCollector.capture(toolSpecificData, toolTerminal.instance, commandId, executeResult.output);
                {
                    const state = toolSpecificData.terminalCommandState ?? {};
                    state.timestamp = state.timestamp ?? timingStart;
                    if (executeResult.exitCode !== undefined) {
                        state.exitCode = executeResult.exitCode;
                        if (state.timestamp !== undefined) {
                            state.duration = state.duration ?? Math.max(0, Date.now() - state.timestamp);
                        }
                    }
                    toolSpecificData.terminalCommandState = state;
                }
                this._logService.debug(`RunInTerminalTool: Finished \`${strategy.type}\` execute strategy with exitCode \`${executeResult.exitCode}\`, result.length \`${executeResult.output?.length}\`, error \`${executeResult.error}\``);
                outputLineCount = executeResult.output === undefined ? 0 : count(executeResult.output.trim(), '\n') + 1;
                exitCode = executeResult.exitCode;
                error = executeResult.error;
                const resultArr = [];
                if (executeResult.output !== undefined) {
                    resultArr.push(executeResult.output);
                }
                if (executeResult.additionalInformation) {
                    resultArr.push(executeResult.additionalInformation);
                }
                terminalResult = resultArr.join('\n\n');
            }
            catch (e) {
                this._logService.debug(`RunInTerminalTool: Threw exception`);
                toolTerminal.instance.dispose();
                error = e instanceof CancellationError ? 'canceled' : 'unexpectedException';
                throw e;
            }
            finally {
                store.dispose();
                const timingExecuteMs = Date.now() - timingStart;
                this._telemetry.logInvoke(toolTerminal.instance, {
                    terminalToolSessionId: toolSpecificData.terminalToolSessionId,
                    didUserEditCommand,
                    didToolEditCommand,
                    isBackground: false,
                    shellIntegrationQuality: toolTerminal.shellIntegrationQuality,
                    error,
                    isNewSession,
                    outputLineCount,
                    exitCode,
                    timingExecuteMs,
                    timingConnectMs,
                    inputUserChars,
                    inputUserSigint,
                    terminalExecutionIdleBeforeTimeout: undefined,
                    pollDurationMs: undefined,
                    inputToolManualAcceptCount: outputMonitor?.outputMonitorTelemetryCounters?.inputToolManualAcceptCount,
                    inputToolManualRejectCount: outputMonitor?.outputMonitorTelemetryCounters?.inputToolManualRejectCount,
                    inputToolManualChars: outputMonitor?.outputMonitorTelemetryCounters?.inputToolManualChars,
                    inputToolAutoAcceptCount: outputMonitor?.outputMonitorTelemetryCounters?.inputToolAutoAcceptCount,
                    inputToolAutoChars: outputMonitor?.outputMonitorTelemetryCounters?.inputToolAutoChars,
                    inputToolManualShownCount: outputMonitor?.outputMonitorTelemetryCounters?.inputToolManualShownCount,
                    inputToolFreeFormInputCount: outputMonitor?.outputMonitorTelemetryCounters?.inputToolFreeFormInputCount,
                    inputToolFreeFormInputShownCount: outputMonitor?.outputMonitorTelemetryCounters?.inputToolFreeFormInputShownCount
                });
            }
            const resultText = [];
            if (didUserEditCommand) {
                resultText.push(`Note: The user manually edited the command to \`${command}\`, and this is the output of running that command instead:\n`);
            }
            else if (didToolEditCommand) {
                resultText.push(`Note: The tool simplified the command to \`${command}\`, and this is the output of running that command instead:\n`);
            }
            resultText.push(terminalResult);
            return {
                toolResultMessage,
                toolMetadata: {
                    exitCode: exitCode
                },
                content: [{
                        kind: 'text',
                        value: resultText.join(''),
                    }]
            };
        }
    }
    _handleTerminalVisibility(toolTerminal) {
        if (this._configurationService.getValue("chat.tools.terminal.outputLocation" /* TerminalChatAgentToolsSettingId.OutputLocation */) === 'terminal') {
            this._terminalService.setActiveInstance(toolTerminal.instance);
            this._terminalService.revealTerminal(toolTerminal.instance, true);
        }
    }
    // #region Terminal init
    async _initBackgroundTerminal(chatSessionId, termId, terminalToolSessionId, token) {
        this._logService.debug(`RunInTerminalTool: Creating background terminal with ID=${termId}`);
        const profile = await this._profileFetcher.getCopilotProfile();
        const toolTerminal = await this._terminalToolCreator.createTerminal(profile, token);
        this._terminalChatService.registerTerminalInstanceWithToolSession(terminalToolSessionId, toolTerminal.instance);
        this._terminalChatService.registerTerminalInstanceWithChatSession(chatSessionId, toolTerminal.instance);
        this._registerInputListener(toolTerminal);
        this._sessionTerminalAssociations.set(chatSessionId, toolTerminal);
        if (token.isCancellationRequested) {
            toolTerminal.instance.dispose();
            throw new CancellationError();
        }
        await this._setupProcessIdAssociation(toolTerminal, chatSessionId, termId, true);
        return toolTerminal;
    }
    async _initForegroundTerminal(chatSessionId, termId, terminalToolSessionId, token) {
        const cachedTerminal = this._sessionTerminalAssociations.get(chatSessionId);
        if (cachedTerminal) {
            this._logService.debug(`RunInTerminalTool: Using cached foreground terminal with session ID \`${chatSessionId}\``);
            this._terminalToolCreator.refreshShellIntegrationQuality(cachedTerminal);
            this._terminalChatService.registerTerminalInstanceWithToolSession(terminalToolSessionId, cachedTerminal.instance);
            return cachedTerminal;
        }
        const profile = await this._profileFetcher.getCopilotProfile();
        const toolTerminal = await this._terminalToolCreator.createTerminal(profile, token);
        this._terminalChatService.registerTerminalInstanceWithToolSession(terminalToolSessionId, toolTerminal.instance);
        this._terminalChatService.registerTerminalInstanceWithChatSession(chatSessionId, toolTerminal.instance);
        this._registerInputListener(toolTerminal);
        this._sessionTerminalAssociations.set(chatSessionId, toolTerminal);
        if (token.isCancellationRequested) {
            toolTerminal.instance.dispose();
            throw new CancellationError();
        }
        await this._setupProcessIdAssociation(toolTerminal, chatSessionId, termId, false);
        return toolTerminal;
    }
    _registerInputListener(toolTerminal) {
        const disposable = toolTerminal.instance.onData(data => {
            if (!telemetryIgnoredSequences.includes(data)) {
                toolTerminal.receivedUserInput = data.length > 0;
            }
        });
        this._register(toolTerminal.instance.onDisposed(() => disposable.dispose()));
    }
    // #endregion
    // #region Session management
    _restoreTerminalAssociations() {
        const storedAssociations = this._storageService.get("chat.terminalSessions" /* TerminalToolStorageKeysInternal.TerminalSession */, 1 /* StorageScope.WORKSPACE */, '{}');
        try {
            const associations = JSON.parse(storedAssociations);
            // Find existing terminals and associate them with sessions
            for (const instance of this._terminalService.instances) {
                if (instance.processId) {
                    const association = associations[instance.processId];
                    if (association) {
                        this._logService.debug(`RunInTerminalTool: Restored terminal association for PID ${instance.processId}, session ${association.sessionId}`);
                        const toolTerminal = {
                            instance,
                            shellIntegrationQuality: association.shellIntegrationQuality
                        };
                        this._sessionTerminalAssociations.set(association.sessionId, toolTerminal);
                        this._terminalChatService.registerTerminalInstanceWithChatSession(association.sessionId, instance);
                        // Listen for terminal disposal to clean up storage
                        this._register(instance.onDisposed(() => {
                            this._removeProcessIdAssociation(instance.processId);
                        }));
                    }
                }
            }
        }
        catch (error) {
            this._logService.debug(`RunInTerminalTool: Failed to restore terminal associations: ${error}`);
        }
    }
    async _setupProcessIdAssociation(toolTerminal, chatSessionId, termId, isBackground) {
        await this._associateProcessIdWithSession(toolTerminal.instance, chatSessionId, termId, toolTerminal.shellIntegrationQuality, isBackground);
        this._register(toolTerminal.instance.onDisposed(() => {
            if (toolTerminal.instance.processId) {
                this._removeProcessIdAssociation(toolTerminal.instance.processId);
            }
        }));
    }
    async _associateProcessIdWithSession(terminal, sessionId, id, shellIntegrationQuality, isBackground) {
        try {
            // Wait for process ID with timeout
            const pid = await Promise.race([
                terminal.processReady.then(() => terminal.processId),
                timeout(5000).then(() => { throw new Error('Timeout'); })
            ]);
            if (isNumber(pid)) {
                const storedAssociations = this._storageService.get("chat.terminalSessions" /* TerminalToolStorageKeysInternal.TerminalSession */, 1 /* StorageScope.WORKSPACE */, '{}');
                const associations = JSON.parse(storedAssociations);
                const existingAssociation = associations[pid] || {};
                associations[pid] = {
                    ...existingAssociation,
                    sessionId,
                    shellIntegrationQuality,
                    id,
                    isBackground
                };
                this._storageService.store("chat.terminalSessions" /* TerminalToolStorageKeysInternal.TerminalSession */, JSON.stringify(associations), 1 /* StorageScope.WORKSPACE */, 0 /* StorageTarget.USER */);
                this._logService.debug(`RunInTerminalTool: Associated terminal PID ${pid} with session ${sessionId}`);
            }
        }
        catch (error) {
            this._logService.debug(`RunInTerminalTool: Failed to associate terminal with session: ${error}`);
        }
    }
    async _removeProcessIdAssociation(pid) {
        try {
            const storedAssociations = this._storageService.get("chat.terminalSessions" /* TerminalToolStorageKeysInternal.TerminalSession */, 1 /* StorageScope.WORKSPACE */, '{}');
            const associations = JSON.parse(storedAssociations);
            if (associations[pid]) {
                delete associations[pid];
                this._storageService.store("chat.terminalSessions" /* TerminalToolStorageKeysInternal.TerminalSession */, JSON.stringify(associations), 1 /* StorageScope.WORKSPACE */, 0 /* StorageTarget.USER */);
                this._logService.debug(`RunInTerminalTool: Removed terminal association for PID ${pid}`);
            }
        }
        catch (error) {
            this._logService.debug(`RunInTerminalTool: Failed to remove terminal association: ${error}`);
        }
    }
    _cleanupSessionTerminals(sessionId) {
        const toolTerminal = this._sessionTerminalAssociations.get(sessionId);
        if (toolTerminal) {
            this._logService.debug(`RunInTerminalTool: Cleaning up terminal for disposed chat session ${sessionId}`);
            this._sessionTerminalAssociations.delete(sessionId);
            toolTerminal.instance.dispose();
            // Clean up any background executions associated with this session
            const terminalToRemove = [];
            for (const [termId, execution] of RunInTerminalTool_1._backgroundExecutions.entries()) {
                if (execution.instance === toolTerminal.instance) {
                    execution.dispose();
                    terminalToRemove.push(termId);
                }
            }
            for (const termId of terminalToRemove) {
                RunInTerminalTool_1._backgroundExecutions.delete(termId);
            }
        }
    }
};
RunInTerminalTool = RunInTerminalTool_1 = __decorate([
    __param(0, IChatService),
    __param(1, IConfigurationService),
    __param(2, IHistoryService),
    __param(3, IInstantiationService),
    __param(4, ILanguageModelToolsService),
    __param(5, IRemoteAgentService),
    __param(6, IStorageService),
    __param(7, ITerminalChatService),
    __param(8, ITerminalLogService),
    __param(9, ITerminalService),
    __param(10, IWorkspaceContextService)
], RunInTerminalTool);
export { RunInTerminalTool };
class BackgroundTerminalExecution extends Disposable {
    constructor(instance, _xterm, _commandLine, sessionId, commandId) {
        super();
        this.instance = instance;
        this._xterm = _xterm;
        this._commandLine = _commandLine;
        this.sessionId = sessionId;
        this._startMarker = this._register(this._xterm.raw.registerMarker());
        this.instance.runCommand(this._commandLine, true, commandId);
    }
    getOutput(marker) {
        return getOutput(this.instance, marker ?? this._startMarker);
    }
}
let TerminalProfileFetcher = class TerminalProfileFetcher {
    constructor(_configurationService, _terminalProfileResolverService, _remoteAgentService) {
        this._configurationService = _configurationService;
        this._terminalProfileResolverService = _terminalProfileResolverService;
        this._remoteAgentService = _remoteAgentService;
        this.osBackend = this._remoteAgentService.getEnvironment().then(remoteEnv => remoteEnv?.os ?? OS);
    }
    async getCopilotProfile() {
        const os = await this.osBackend;
        // Check for chat agent terminal profile first
        const customChatAgentProfile = this._getChatTerminalProfile(os);
        if (customChatAgentProfile) {
            return customChatAgentProfile;
        }
        // When setting is null, use the previous behavior
        const defaultProfile = await this._terminalProfileResolverService.getDefaultProfile({
            os,
            remoteAuthority: this._remoteAgentService.getConnection()?.remoteAuthority
        });
        // Force pwsh over cmd as cmd doesn't have shell integration
        if (basename(defaultProfile.path) === 'cmd.exe') {
            return {
                ...defaultProfile,
                path: 'C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
                profileName: 'PowerShell'
            };
        }
        // Setting icon: undefined allows the system to use the default AI terminal icon (not overridden or removed)
        return { ...defaultProfile, icon: undefined };
    }
    async getCopilotShell() {
        return (await this.getCopilotProfile()).path;
    }
    _getChatTerminalProfile(os) {
        let profileSetting;
        switch (os) {
            case 1 /* OperatingSystem.Windows */:
                profileSetting = "chat.tools.terminal.terminalProfile.windows" /* TerminalChatAgentToolsSettingId.TerminalProfileWindows */;
                break;
            case 2 /* OperatingSystem.Macintosh */:
                profileSetting = "chat.tools.terminal.terminalProfile.osx" /* TerminalChatAgentToolsSettingId.TerminalProfileMacOs */;
                break;
            case 3 /* OperatingSystem.Linux */:
            default:
                profileSetting = "chat.tools.terminal.terminalProfile.linux" /* TerminalChatAgentToolsSettingId.TerminalProfileLinux */;
                break;
        }
        const profile = this._configurationService.getValue(profileSetting);
        if (this._isValidChatAgentTerminalProfile(profile)) {
            return profile;
        }
        return undefined;
    }
    _isValidChatAgentTerminalProfile(profile) {
        if (profile === null || profile === undefined || typeof profile !== 'object') {
            return false;
        }
        if ('path' in profile && isString(profile.path)) {
            return true;
        }
        return false;
    }
};
TerminalProfileFetcher = __decorate([
    __param(0, IConfigurationService),
    __param(1, ITerminalProfileResolverService),
    __param(2, IRemoteAgentService)
], TerminalProfileFetcher);
export { TerminalProfileFetcher };
// #endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVuSW5UZXJtaW5hbFRvb2wuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWhhbWVkL0Rlc2t0b3AvcHVrdS12cy1lZGl0b3IvcHVrdS1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvY2hhdEFnZW50VG9vbHMvYnJvd3Nlci90b29scy9ydW5JblRlcm1pbmFsVG9vbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBRWpFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDL0QsT0FBTyxFQUFFLGNBQWMsRUFBd0IsTUFBTSw4Q0FBOEMsQ0FBQztBQUNwRyxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNqRSxPQUFPLEVBQW1CLEVBQUUsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNqRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDckUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ3BELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFDO0FBQ3pHLE9BQU8sRUFBRSxxQkFBcUIsRUFBeUIsTUFBTSxrRUFBa0UsQ0FBQztBQUNoSSxPQUFPLEVBQUUsZUFBZSxFQUErQixNQUFNLHNEQUFzRCxDQUFD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