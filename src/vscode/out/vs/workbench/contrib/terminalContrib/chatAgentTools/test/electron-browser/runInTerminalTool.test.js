/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ok, strictEqual } from 'assert';
import { Separator } from '../../../../../../base/common/actions.js';
import { CancellationToken } from '../../../../../../base/common/cancellation.js';
import { Emitter } from '../../../../../../base/common/event.js';
import { Schemas } from '../../../../../../base/common/network.js';
import { isLinux, isWindows } from '../../../../../../base/common/platform.js';
import { count } from '../../../../../../base/common/strings.js';
import { URI } from '../../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { ITreeSitterLibraryService } from '../../../../../../editor/common/services/treeSitter/treeSitterLibraryService.js';
import { TestConfigurationService } from '../../../../../../platform/configuration/test/common/testConfigurationService.js';
import { FileService } from '../../../../../../platform/files/common/fileService.js';
import { NullLogService } from '../../../../../../platform/log/common/log.js';
import { IStorageService } from '../../../../../../platform/storage/common/storage.js';
import { IWorkspaceContextService, toWorkspaceFolder } from '../../../../../../platform/workspace/common/workspace.js';
import { Workspace } from '../../../../../../platform/workspace/test/common/testWorkspace.js';
import { IHistoryService } from '../../../../../services/history/common/history.js';
import { TreeSitterLibraryService } from '../../../../../services/treeSitter/browser/treeSitterLibraryService.js';
import { workbenchInstantiationService } from '../../../../../test/browser/workbenchTestServices.js';
import { TestContextService } from '../../../../../test/common/workbenchTestServices.js';
import { TestIPCFileSystemProvider } from '../../../../../test/electron-browser/workbenchTestServices.js';
import { IChatService } from '../../../../chat/common/chatService.js';
import { LocalChatSessionUri } from '../../../../chat/common/chatUri.js';
import { ILanguageModelToolsService } from '../../../../chat/common/languageModelToolsService.js';
import { ITerminalChatService, ITerminalService } from '../../../../terminal/browser/terminal.js';
import { ITerminalProfileResolverService } from '../../../../terminal/common/terminal.js';
import { RunInTerminalTool } from '../../browser/tools/runInTerminalTool.js';
import { terminalChatAgentToolsConfiguration } from '../../common/terminalChatAgentToolsConfiguration.js';
import { TerminalChatService } from '../../../chat/browser/terminalChatService.js';
class TestRunInTerminalTool extends RunInTerminalTool {
    constructor() {
        super(...arguments);
        this._osBackend = Promise.resolve(1 /* OperatingSystem.Windows */);
    }
    get sessionTerminalAssociations() { return this._sessionTerminalAssociations; }
    get profileFetcher() { return this._profileFetcher; }
    setBackendOs(os) {
        this._osBackend = Promise.resolve(os);
    }
}
suite('RunInTerminalTool', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    let configurationService;
    let fileService;
    let storageService;
    let workspaceContextService;
    let terminalServiceDisposeEmitter;
    let chatServiceDisposeEmitter;
    let runInTerminalTool;
    setup(() => {
        configurationService = new TestConfigurationService();
        workspaceContextService = new TestContextService();
        const logService = new NullLogService();
        fileService = store.add(new FileService(logService));
        const fileSystemProvider = new TestIPCFileSystemProvider();
        store.add(fileService.registerProvider(Schemas.file, fileSystemProvider));
        setConfig("chat.tools.terminal.enableAutoApprove" /* TerminalChatAgentToolsSettingId.EnableAutoApprove */, true);
        terminalServiceDisposeEmitter = new Emitter();
        chatServiceDisposeEmitter = new Emitter();
        instantiationService = workbenchInstantiationService({
            configurationService: () => configurationService,
            fileService: () => fileService,
        }, store);
        instantiationService.stub(ITerminalChatService, store.add(instantiationService.createInstance(TerminalChatService)));
        instantiationService.stub(IWorkspaceContextService, workspaceContextService);
        instantiationService.stub(IHistoryService, {
            getLastActiveWorkspaceRoot: () => undefined
        });
        const treeSitterLibraryService = store.add(instantiationService.createInstance(TreeSitterLibraryService));
        treeSitterLibraryService.isTest = true;
        instantiationService.stub(ITreeSitterLibraryService, treeSitterLibraryService);
        instantiationService.stub(ILanguageModelToolsService, {
            getTools() {
                return [];
            },
        });
        instantiationService.stub(ITerminalService, {
            onDidDisposeInstance: terminalServiceDisposeEmitter.event,
            setNextCommandId: async () => { }
        });
        instantiationService.stub(IChatService, {
            onDidDisposeSession: chatServiceDisposeEmitter.event
        });
        instantiationService.stub(ITerminalProfileResolverService, {
            getDefaultProfile: async () => ({ path: 'bash' })
        });
        storageService = instantiationService.get(IStorageService);
        storageService.store("chat.tools.terminal.autoApprove.warningAccepted" /* TerminalToolConfirmationStorageKeys.TerminalAutoApproveWarningAccepted */, true, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
        runInTerminalTool = store.add(instantiationService.createInstance(TestRunInTerminalTool));
    });
    function setAutoApprove(value) {
        setConfig("chat.tools.terminal.autoApprove" /* TerminalChatAgentToolsSettingId.AutoApprove */, value);
    }
    function setConfig(key, value) {
        configurationService.setUserConfiguration(key, value);
        configurationService.onDidChangeConfigurationEmitter.fire({
            affectsConfiguration: () => true,
            affectedKeys: new Set([key]),
            source: 2 /* ConfigurationTarget.USER */,
            change: null,
        });
    }
    function clearAutoApproveWarningAcceptedState() {
        storageService.remove("chat.tools.terminal.autoApprove.warningAccepted" /* TerminalToolConfirmationStorageKeys.TerminalAutoApproveWarningAccepted */, -1 /* StorageScope.APPLICATION */);
    }
    /**
     * Executes a test scenario for the RunInTerminalTool
     */
    async function executeToolTest(params) {
        const context = {
            parameters: {
                command: 'echo hello',
                explanation: 'Print hello to the console',
                isBackground: false,
                ...params
            }
        };
        const result = await runInTerminalTool.prepareToolInvocation(context, CancellationToken.None);
        return result;
    }
    function isSeparator(action) {
        return action instanceof Separator;
    }
    /**
     * Helper to assert that a command should be auto-approved (no confirmation required)
     */
    function assertAutoApproved(preparedInvocation) {
        ok(preparedInvocation, 'Expected prepared invocation to be defined');
        ok(!preparedInvocation.confirmationMessages, 'Expected no confirmation messages for auto-approved command');
    }
    /**
     * Helper to assert that a command requires confirmation
     */
    function assertConfirmationRequired(preparedInvocation, expectedTitle) {
        ok(preparedInvocation, 'Expected prepared invocation to be defined');
        ok(preparedInvocation.confirmationMessages, 'Expected confirmation messages for non-approved command');
        if (expectedTitle) {
            strictEqual(preparedInvocation.confirmationMessages.title, expectedTitle);
        }
    }
    suite('default auto-approve rules', () => {
        const defaults = terminalChatAgentToolsConfiguration["chat.tools.terminal.autoApprove" /* TerminalChatAgentToolsSettingId.AutoApprove */].default;
        suiteSetup(() => {
            // Sanity check on entries to make sure that the defaults are actually pulled in
            ok(Object.keys(defaults).length > 50);
        });
        setup(() => {
            setAutoApprove(defaults);
        });
        const autoApprovedTestCases = [
            // Safe commands
            'echo abc',
            'echo "abc"',
            'echo \'abc\'',
            'ls -la',
            'pwd',
            'cat file.txt',
            'head -n 10 file.txt',
            'tail -f log.txt',
            'findstr pattern file.txt',
            'wc -l file.txt',
            'tr a-z A-Z',
            'cut -d: -f1',
            'cmp file1 file2',
            'which node',
            'basename /path/to/file',
            'dirname /path/to/file',
            'realpath .',
            'readlink symlink',
            'stat file.txt',
            'file document.pdf',
            'du -sh folder',
            'df -h',
            'sleep 5',
            'cd /home/user',
            'nl -ba path/to/file.txt',
            // Safe git sub-commands
            'git status',
            'git log --oneline',
            'git show HEAD',
            'git diff main',
            'git grep "TODO"',
            // PowerShell commands
            'Get-ChildItem',
            'Get-Date',
            'Get-Random',
            'Get-Location',
            'Write-Host "Hello"',
            'Write-Output "Test"',
            'Split-Path C:\\Users\\test',
            'Join-Path C:\\Users test',
            'Start-Sleep 2',
            // PowerShell safe verbs (regex patterns)
            'Select-Object Name',
            'Measure-Object Length',
            'Compare-Object $a $b',
            'Format-Table',
            'Sort-Object Name',
            // Commands with acceptable arguments
            'column data.txt',
            'date +%Y-%m-%d',
            'find . -name "*.txt"',
            'grep pattern file.txt',
            'sort file.txt',
            'tree directory'
        ];
        const confirmationRequiredTestCases = [
            // Dangerous file operations
            'rm README.md',
            'rmdir folder',
            'del file.txt',
            'Remove-Item file.txt',
            'ri file.txt',
            'rd folder',
            'erase file.txt',
            'dd if=/dev/zero of=file',
            // Process management
            'kill 1234',
            'ps aux',
            'top',
            'Stop-Process -Id 1234',
            'spps notepad',
            'taskkill /f /im notepad.exe',
            'taskkill.exe /f /im cmd.exe',
            // Web requests
            'curl https://example.com',
            'wget https://example.com/file',
            'Invoke-RestMethod https://api.example.com',
            'Invoke-WebRequest https://example.com',
            'irm https://example.com',
            'iwr https://example.com',
            // File permissions
            'chmod 755 file.sh',
            'chown user:group file.txt',
            'Set-ItemProperty file.txt IsReadOnly $true',
            'sp file.txt IsReadOnly $true',
            'Set-Acl file.txt $acl',
            // Command execution
            'jq \'.name\' file.json',
            'xargs rm',
            'eval "echo hello"',
            'Invoke-Expression "Get-Date"',
            'iex "Write-Host test"',
            // Commands with dangerous arguments
            'column -c 10000 file.txt',
            'date --set="2023-01-01"',
            'find . -delete',
            'find . -exec rm {} \\;',
            'find . -execdir rm {} \\;',
            'find . -fprint output.txt',
            'sort -o /etc/passwd file.txt',
            'sort -S 100G file.txt',
            'tree -o output.txt',
            // Transient environment variables
            'ls="test" curl https://api.example.com',
            'API_KEY=secret curl https://api.example.com',
            'HTTP_PROXY=proxy:8080 wget https://example.com',
            'VAR1=value1 VAR2=value2 echo test',
            'A=1 B=2 C=3 ./script.sh',
        ];
        suite.skip('auto approved', () => {
            for (const command of autoApprovedTestCases) {
                test(command.replaceAll('\n', '\\n'), async () => {
                    assertAutoApproved(await executeToolTest({ command }));
                });
            }
        });
        suite('confirmation required', () => {
            for (const command of confirmationRequiredTestCases) {
                test(command.replaceAll('\n', '\\n'), async () => {
                    assertConfirmationRequired(await executeToolTest({ command }));
                });
            }
        });
    });
    suite('prepareToolInvocation - auto approval behavior', () => {
        test('should auto-approve commands in allow list', async () => {
            setAutoApprove({
                echo: true
            });
            const result = await executeToolTest({ command: 'echo hello world' });
            assertAutoApproved(result);
        });
        test('should require confirmation for commands not in allow list', async () => {
            setAutoApprove({
                ls: true
            });
            const result = await executeToolTest({
                command: 'rm file.txt',
                explanation: 'Remove a file'
            });
            assertConfirmationRequired(result, 'Run `bash` command?');
        });
        test('should require confirmation for commands in deny list even if in allow list', async () => {
            setAutoApprove({
                rm: false,
                echo: true
            });
            const result = await executeToolTest({
                command: 'rm dangerous-file.txt',
                explanation: 'Remove a dangerous file'
            });
            assertConfirmationRequired(result, 'Run `bash` command?');
        });
        test('should handle background commands with confirmation', async () => {
            setAutoApprove({
                ls: true
            });
            const result = await executeToolTest({
                command: 'npm run watch',
                explanation: 'Start watching for file changes',
                isBackground: true
            });
            assertConfirmationRequired(result, 'Run `bash` command? (background terminal)');
        });
        test('should auto-approve background commands in allow list', async () => {
            setAutoApprove({
                npm: true
            });
            const result = await executeToolTest({
                command: 'npm run watch',
                explanation: 'Start watching for file changes',
                isBackground: true
            });
            assertAutoApproved(result);
        });
        test('should include auto-approve info for background commands', async () => {
            setAutoApprove({
                npm: true
            });
            const result = await executeToolTest({
                command: 'npm run watch',
                explanation: 'Start watching for file changes',
                isBackground: true
            });
            assertAutoApproved(result);
            // Verify that auto-approve information is included
            ok(result?.toolSpecificData, 'Expected toolSpecificData to be defined');
            // eslint-disable-next-line local/code-no-any-casts
            const terminalData = result.toolSpecificData;
            ok(terminalData.autoApproveInfo, 'Expected autoApproveInfo to be defined for auto-approved background command');
            ok(terminalData.autoApproveInfo.value, 'Expected autoApproveInfo to have a value');
            ok(terminalData.autoApproveInfo.value.includes('npm'), 'Expected autoApproveInfo to mention the approved rule');
        });
        test('should handle regex patterns in allow list', async () => {
            setAutoApprove({
                '/^git (status|log)/': true
            });
            const result = await executeToolTest({ command: 'git status --porcelain' });
            assertAutoApproved(result);
        });
        test('should handle complex command chains with sub-commands', async () => {
            setAutoApprove({
                echo: true,
                ls: true
            });
            const result = await executeToolTest({ command: 'echo "hello" && ls -la' });
            assertAutoApproved(result);
        });
        test('should require confirmation when one sub-command is not approved', async () => {
            setAutoApprove({
                echo: true
            });
            const result = await executeToolTest({ command: 'echo "hello" && rm file.txt' });
            assertConfirmationRequired(result);
        });
        test('should handle empty command strings', async () => {
            setAutoApprove({
                echo: true
            });
            const result = await executeToolTest({
                command: '',
                explanation: 'Empty command'
            });
            assertAutoApproved(result);
        });
        test('should handle matchCommandLine: true patterns', async () => {
            setAutoApprove({
                '/dangerous/': { approve: false, matchCommandLine: true },
                'echo': { approve: true, matchCommandLine: true }
            });
            const result1 = await executeToolTest({ command: 'echo hello world' });
            assertAutoApproved(result1);
            const result2 = await executeToolTest({ command: 'echo this is a dangerous command' });
            assertConfirmationRequired(result2);
        });
        test('should only approve when neither sub-commands or command lines are denied', async () => {
            setAutoApprove({
                'foo': true,
                '/^foo$/': { approve: false, matchCommandLine: true },
            });
            const result1 = await executeToolTest({ command: 'foo' });
            assertConfirmationRequired(result1);
            const result2 = await executeToolTest({ command: 'foo bar' });
            assertAutoApproved(result2);
        });
    });
    suite('prepareToolInvocation - custom actions for dropdown', () => {
        function assertDropdownActions(result, items) {
            const actions = result?.confirmationMessages?.terminalCustomActions;
            ok(actions, 'Expected custom actions to be defined');
            strictEqual(actions.length, items.length);
            for (const [i, item] of items.entries()) {
                const action = actions[i];
                if (item === '---') {
                    ok(isSeparator(action));
                }
                else {
                    ok(!isSeparator(action));
                    if (item === 'configure') {
                        strictEqual(action.label, 'Configure Auto Approve...');
                        strictEqual(action.data.type, 'configure');
                    }
                    else if (item === 'sessionApproval') {
                        strictEqual(action.label, 'Allow All Commands in this Session');
                        strictEqual(action.data.type, 'sessionApproval');
                    }
                    else if (item === 'commandLine') {
                        strictEqual(action.label, 'Always Allow Exact Command Line');
                        strictEqual(action.data.type, 'newRule');
                        ok(!Array.isArray(action.data.rule), 'Expected rule to be an object');
                    }
                    else {
                        if (Array.isArray(item.subCommand)) {
                            strictEqual(action.label, `Always Allow Commands: ${item.subCommand.join(', ')}`);
                        }
                        else {
                            strictEqual(action.label, `Always Allow Command: ${item.subCommand}`);
                        }
                        strictEqual(action.data.type, 'newRule');
                        ok(Array.isArray(action.data.rule), 'Expected rule to be an array');
                    }
                }
            }
        }
        test('should generate custom actions for non-auto-approved commands', async () => {
            setAutoApprove({
                ls: true,
            });
            const result = await executeToolTest({
                command: 'npm run build',
                explanation: 'Build the project'
            });
            assertConfirmationRequired(result, 'Run `bash` command?');
            assertDropdownActions(result, [
                { subCommand: 'npm run build' },
                'commandLine',
                '---',
                'sessionApproval',
                '---',
                'configure',
            ]);
        });
        test('should generate custom actions for single word commands', async () => {
            const result = await executeToolTest({
                command: 'foo',
                explanation: 'Run foo command'
            });
            assertConfirmationRequired(result);
            assertDropdownActions(result, [
                { subCommand: 'foo' },
                '---',
                'sessionApproval',
                '---',
                'configure',
            ]);
        });
        test('should not generate custom actions for auto-approved commands', async () => {
            setAutoApprove({
                npm: true
            });
            const result = await executeToolTest({
                command: 'npm run build',
                explanation: 'Build the project'
            });
            assertAutoApproved(result);
        });
        test('should only generate configure action for explicitly denied commands', async () => {
            setAutoApprove({
                npm: { approve: false }
            });
            const result = await executeToolTest({
                command: 'npm run build',
                explanation: 'Build the project'
            });
            assertConfirmationRequired(result, 'Run `bash` command?');
            assertDropdownActions(result, [
                'sessionApproval',
                '---',
                'configure',
            ]);
        });
        test('should handle && in command line labels with proper mnemonic escaping', async () => {
            const result = await executeToolTest({
                command: 'npm install && npm run build',
                explanation: 'Install dependencies and build'
            });
            assertConfirmationRequired(result, 'Run `bash` command?');
            assertDropdownActions(result, [
                { subCommand: ['npm install', 'npm run build'] },
                'commandLine',
                '---',
                'sessionApproval',
                '---',
                'configure',
            ]);
        });
        test('should not show approved commands in custom actions dropdown', async () => {
            setAutoApprove({
                head: true // head is approved by default in real scenario
            });
            const result = await executeToolTest({
                command: 'foo | head -20',
                explanation: 'Run foo command and show first 20 lines'
            });
            assertConfirmationRequired(result, 'Run `bash` command?');
            assertDropdownActions(result, [
                { subCommand: 'foo' },
                'commandLine',
                '---',
                'sessionApproval',
                '---',
                'configure',
            ]);
        });
        test('should not show any command-specific actions when all sub-commands are approved', async () => {
            setAutoApprove({
                foo: true,
                head: true
            });
            const result = await executeToolTest({
                command: 'foo | head -20',
                explanation: 'Run foo command and show first 20 lines'
            });
            assertAutoApproved(result);
        });
        test('should handle mixed approved and unapproved commands correctly', async () => {
            setAutoApprove({
                head: true,
                tail: true
            });
            const result = await executeToolTest({
                command: 'foo | head -20 && bar | tail -10',
                explanation: 'Run multiple piped commands'
            });
            assertConfirmationRequired(result, 'Run `bash` command?');
            assertDropdownActions(result, [
                { subCommand: ['foo', 'bar'] },
                'commandLine',
                '---',
                'sessionApproval',
                '---',
                'configure',
            ]);
        });
        test('should suggest subcommand for git commands', async () => {
            const result = await executeToolTest({
                command: 'git status',
                explanation: 'Check git status'
            });
            assertConfirmationRequired(result);
            assertDropdownActions(result, [
                { subCommand: 'git status' },
                'commandLine',
                '---',
                'sessionApproval',
                '---',
                'configure',
            ]);
        });
        test('should suggest subcommand for npm commands', async () => {
            const result = await executeToolTest({
                command: 'npm test',
                explanation: 'Run npm tests'
            });
            assertConfirmationRequired(result);
            assertDropdownActions(result, [
                { subCommand: 'npm test' },
                'commandLine',
                '---',
                'sessionApproval',
                '---',
                'configure',
            ]);
        });
        test('should suggest 3-part subcommand for npm run commands', async () => {
            const result = await executeToolTest({
                command: 'npm run build',
                explanation: 'Run build script'
            });
            assertConfirmationRequired(result);
            assertDropdownActions(result, [
                { subCommand: 'npm run build' },
                'commandLine',
                '---',
                'sessionApproval',
                '---',
                'configure',
            ]);
        });
        test('should suggest 3-part subcommand for yarn run commands', async () => {
            const result = await executeToolTest({
                command: 'yarn run test',
                explanation: 'Run test script'
            });
            assertConfirmationRequired(result);
            assertDropdownActions(result, [
                { subCommand: 'yarn run test' },
                'commandLine',
                '---',
                'sessionApproval',
                '---',
                'configure',
            ]);
        });
        test('should not suggest subcommand for commands with flags', async () => {
            const result = await executeToolTest({
                command: 'foo --foo --bar',
                explanation: 'Run foo with flags'
            });
            assertConfirmationRequired(result);
            assertDropdownActions(result, [
                { subCommand: 'foo' },
                'commandLine',
                '---',
                'sessionApproval',
                '---',
                'configure',
            ]);
        });
        test('should not suggest subcommand for npm run with flags', async () => {
            const result = await executeToolTest({
                command: 'npm run abc --some-flag',
                explanation: 'Run npm run abc with flags'
            });
            assertConfirmationRequired(result);
            assertDropdownActions(result, [
                { subCommand: 'npm run abc' },
                'commandLine',
                '---',
                'sessionApproval',
                '---',
                'configure',
            ]);
        });
        test('should handle mixed npm run and other commands', async () => {
            const result = await executeToolTest({
                command: 'npm run build && git status',
                explanation: 'Build and check status'
            });
            assertConfirmationRequired(result);
            assertDropdownActions(result, [
                { subCommand: ['npm run build', 'git status'] },
                'commandLine',
                '---',
                'sessionApproval',
                '---',
                'configure',
            ]);
        });
        test('should suggest mixed subcommands and base commands', async () => {
            const result = await executeToolTest({
                command: 'git push && echo "done"',
                explanation: 'Push and print done'
            });
            assertConfirmationRequired(result);
            assertDropdownActions(result, [
                { subCommand: ['git push', 'echo'] },
                'commandLine',
                '---',
                'sessionApproval',
                '---',
                'configure',
            ]);
        });
        test('should suggest subcommands for multiple git commands', async () => {
            const result = await executeToolTest({
                command: 'git status && git log --oneline',
                explanation: 'Check status and log'
            });
            assertConfirmationRequired(result);
            assertDropdownActions(result, [
                { subCommand: ['git status', 'git log'] },
                'commandLine',
                '---',
                'sessionApproval',
                '---',
                'configure',
            ]);
        });
        test('should suggest base command for non-subcommand tools', async () => {
            const result = await executeToolTest({
                command: 'foo bar',
                explanation: 'Download from example.com'
            });
            assertConfirmationRequired(result);
            assertDropdownActions(result, [
                { subCommand: 'foo' },
                'commandLine',
                '---',
                'sessionApproval',
                '---',
                'configure',
            ]);
        });
        test('should handle single word commands from subcommand-aware tools', async () => {
            const result = await executeToolTest({
                command: 'git',
                explanation: 'Run git command'
            });
            assertConfirmationRequired(result);
            assertDropdownActions(result, [
                'sessionApproval',
                '---',
                'configure',
            ]);
        });
        test('should deduplicate identical subcommand suggestions', async () => {
            const result = await executeToolTest({
                command: 'npm test && npm test --verbose',
                explanation: 'Run tests twice'
            });
            assertConfirmationRequired(result);
            assertDropdownActions(result, [
                { subCommand: 'npm test' },
                'commandLine',
                '---',
                'sessionApproval',
                '---',
                'configure',
            ]);
        });
        test('should handle flags differently than subcommands for suggestion logic', async () => {
            const result = await executeToolTest({
                command: 'foo --version',
                explanation: 'Check foo version'
            });
            assertConfirmationRequired(result);
            assertDropdownActions(result, [
                { subCommand: 'foo' },
                'commandLine',
                '---',
                'sessionApproval',
                '---',
                'configure',
            ]);
        });
        test('should not suggest overly permissive subcommand rules', async () => {
            const result = await executeToolTest({
                command: 'bash -c "echo hello"',
                explanation: 'Run bash command'
            });
            assertConfirmationRequired(result);
            assertDropdownActions(result, [
                'commandLine',
                '---',
                'sessionApproval',
                '---',
                'configure',
            ]);
        });
        test('should not show command line option when it\'s rejected', async () => {
            setAutoApprove({
                echo: true,
                '/\\(.+\\)/s': { approve: false, matchCommandLine: true }
            });
            const result = await executeToolTest({
                command: 'echo (abc)'
            });
            assertConfirmationRequired(result);
            assertDropdownActions(result, [
                'sessionApproval',
                '---',
                'configure',
            ]);
        });
        test('should prevent auto approval when writing to a file outside the workspace', async () => {
            setConfig("chat.tools.terminal.blockDetectedFileWrites" /* TerminalChatAgentToolsSettingId.BlockDetectedFileWrites */, 'outsideWorkspace');
            setAutoApprove({});
            const workspaceFolder = URI.file(isWindows ? 'C:/workspace/project' : '/workspace/project');
            const workspace = new Workspace('test', [toWorkspaceFolder(workspaceFolder)]);
            workspaceContextService.setWorkspace(workspace);
            instantiationService.stub(IHistoryService, {
                getLastActiveWorkspaceRoot: () => workspaceFolder
            });
            const result = await executeToolTest({
                command: 'echo "abc" > ../file.txt'
            });
            assertConfirmationRequired(result);
            strictEqual(result?.confirmationMessages?.terminalCustomActions, undefined, 'Expected no custom actions when file write is blocked');
        });
    });
    suite('chat session disposal cleanup', () => {
        test('should dispose associated terminals when chat session is disposed', () => {
            const sessionId = 'test-session-123';
            // eslint-disable-next-line local/code-no-any-casts
            const mockTerminal = {
                dispose: () => { },
                processId: 12345
            };
            let terminalDisposed = false;
            mockTerminal.dispose = () => { terminalDisposed = true; };
            runInTerminalTool.sessionTerminalAssociations.set(sessionId, {
                instance: mockTerminal,
                shellIntegrationQuality: "none" /* ShellIntegrationQuality.None */
            });
            ok(runInTerminalTool.sessionTerminalAssociations.has(sessionId), 'Terminal association should exist before disposal');
            chatServiceDisposeEmitter.fire({ sessionResource: LocalChatSessionUri.forSession(sessionId), reason: 'cleared' });
            strictEqual(terminalDisposed, true, 'Terminal should have been disposed');
            ok(!runInTerminalTool.sessionTerminalAssociations.has(sessionId), 'Terminal association should be removed after disposal');
        });
        test('should not affect other sessions when one session is disposed', () => {
            const sessionId1 = 'test-session-1';
            const sessionId2 = 'test-session-2';
            // eslint-disable-next-line local/code-no-any-casts
            const mockTerminal1 = {
                dispose: () => { },
                processId: 12345
            };
            // eslint-disable-next-line local/code-no-any-casts
            const mockTerminal2 = {
                dispose: () => { },
                processId: 67890
            };
            let terminal1Disposed = false;
            let terminal2Disposed = false;
            mockTerminal1.dispose = () => { terminal1Disposed = true; };
            mockTerminal2.dispose = () => { terminal2Disposed = true; };
            runInTerminalTool.sessionTerminalAssociations.set(sessionId1, {
                instance: mockTerminal1,
                shellIntegrationQuality: "none" /* ShellIntegrationQuality.None */
            });
            runInTerminalTool.sessionTerminalAssociations.set(sessionId2, {
                instance: mockTerminal2,
                shellIntegrationQuality: "none" /* ShellIntegrationQuality.None */
            });
            ok(runInTerminalTool.sessionTerminalAssociations.has(sessionId1), 'Session 1 terminal association should exist');
            ok(runInTerminalTool.sessionTerminalAssociations.has(sessionId2), 'Session 2 terminal association should exist');
            chatServiceDisposeEmitter.fire({ sessionResource: LocalChatSessionUri.forSession(sessionId1), reason: 'cleared' });
            strictEqual(terminal1Disposed, true, 'Terminal 1 should have been disposed');
            strictEqual(terminal2Disposed, false, 'Terminal 2 should NOT have been disposed');
            ok(!runInTerminalTool.sessionTerminalAssociations.has(sessionId1), 'Session 1 terminal association should be removed');
            ok(runInTerminalTool.sessionTerminalAssociations.has(sessionId2), 'Session 2 terminal association should remain');
        });
        test('should handle disposal of non-existent session gracefully', () => {
            strictEqual(runInTerminalTool.sessionTerminalAssociations.size, 0, 'No associations should exist initially');
            chatServiceDisposeEmitter.fire({ sessionResource: LocalChatSessionUri.forSession('non-existent-session'), reason: 'cleared' });
            strictEqual(runInTerminalTool.sessionTerminalAssociations.size, 0, 'No associations should exist after handling non-existent session');
        });
    });
    suite('auto approve warning acceptance mechanism', () => {
        test('should require confirmation for auto-approvable commands when warning not accepted', async () => {
            setConfig("chat.tools.terminal.enableAutoApprove" /* TerminalChatAgentToolsSettingId.EnableAutoApprove */, true);
            setAutoApprove({
                echo: true
            });
            clearAutoApproveWarningAcceptedState();
            assertConfirmationRequired(await executeToolTest({ command: 'echo hello world' }), 'Run `bash` command?');
        });
        test('should auto-approve commands when both auto-approve enabled and warning accepted', async () => {
            setConfig("chat.tools.terminal.enableAutoApprove" /* TerminalChatAgentToolsSettingId.EnableAutoApprove */, true);
            setAutoApprove({
                echo: true
            });
            assertAutoApproved(await executeToolTest({ command: 'echo hello world' }));
        });
        test('should require confirmation when auto-approve disabled regardless of warning acceptance', async () => {
            setConfig("chat.tools.terminal.enableAutoApprove" /* TerminalChatAgentToolsSettingId.EnableAutoApprove */, false);
            setAutoApprove({
                echo: true
            });
            const result = await executeToolTest({ command: 'echo hello world' });
            assertConfirmationRequired(result, 'Run `bash` command?');
        });
    });
    suite('unique rules deduplication', () => {
        test('should properly deduplicate rules with same sourceText in auto-approve info', async () => {
            setAutoApprove({
                echo: true
            });
            const result = await executeToolTest({ command: 'echo hello && echo world' });
            assertAutoApproved(result);
            const autoApproveInfo = result.toolSpecificData.autoApproveInfo;
            ok(autoApproveInfo);
            ok(autoApproveInfo.value.includes('Auto approved by rule '), 'should contain singular "rule", not plural');
            strictEqual(count(autoApproveInfo.value, 'echo'), 1);
        });
    });
    suite('session auto approval', () => {
        test('should auto approve all commands when session has auto approval enabled', async () => {
            const sessionId = 'test-session-123';
            const terminalChatService = instantiationService.get(ITerminalChatService);
            const context = {
                parameters: {
                    command: 'rm dangerous-file.txt',
                    explanation: 'Remove a file',
                    isBackground: false
                },
                chatSessionId: sessionId
            };
            let result = await runInTerminalTool.prepareToolInvocation(context, CancellationToken.None);
            assertConfirmationRequired(result);
            terminalChatService.setChatSessionAutoApproval(sessionId, true);
            result = await runInTerminalTool.prepareToolInvocation(context, CancellationToken.None);
            assertAutoApproved(result);
            const terminalData = result.toolSpecificData;
            ok(terminalData.autoApproveInfo, 'Expected autoApproveInfo to be defined');
            ok(terminalData.autoApproveInfo.value.includes('Auto approved for this session'), 'Expected session approval message');
        });
    });
    suite('TerminalProfileFetcher', () => {
        suite('getCopilotProfile', () => {
            (isWindows ? test : test.skip)('should return custom profile when configured', async () => {
                runInTerminalTool.setBackendOs(1 /* OperatingSystem.Windows */);
                const customProfile = Object.freeze({ path: 'C:\\Windows\\System32\\powershell.exe', args: ['-NoProfile'] });
                setConfig("chat.tools.terminal.terminalProfile.windows" /* TerminalChatAgentToolsSettingId.TerminalProfileWindows */, customProfile);
                const result = await runInTerminalTool.profileFetcher.getCopilotProfile();
                strictEqual(result, customProfile);
            });
            (isLinux ? test : test.skip)('should fall back to default shell when no custom profile is configured', async () => {
                runInTerminalTool.setBackendOs(3 /* OperatingSystem.Linux */);
                setConfig("chat.tools.terminal.terminalProfile.linux" /* TerminalChatAgentToolsSettingId.TerminalProfileLinux */, null);
                const result = await runInTerminalTool.profileFetcher.getCopilotProfile();
                strictEqual(typeof result, 'object');
                strictEqual(result.path, 'bash');
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVuSW5UZXJtaW5hbFRvb2wudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvcG9yaWRoaS9kZXZlbG9wbWVudC9wdWt1LXZzLWVkaXRvci9zcmMvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9jaGF0QWdlbnRUb29scy90ZXN0L2VsZWN0cm9uLWJyb3dzZXIvcnVuSW5UZXJtaW5hbFRvb2wudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsRUFBRSxFQUFFLFdBQVcsRUFBRSxNQUFNLFFBQVEsQ0FBQztBQUN6QyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDckUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDbEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRSxPQUFPLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBbUIsTUFBTSwyQ0FBMkMsQ0FBQztBQUNoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFFakUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzNELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3RHLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLGlGQUFpRixDQUFDO0FBRTVILE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGtGQUFrRixDQUFDO0FBRTVILE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUVyRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDOUUsT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSxzREFBc0QsQ0FBQztBQUVwSCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUN2SCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbUVBQW1FLENBQUM7QUFDOUYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ3BGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHdFQUF3RSxDQUFDO0FBQ2xILE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3JHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ3pGLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBRTFHLE9BQU8sRUFBRSxZQUFZLEVBQXdDLE1BQU0sd0NBQXdDLENBQUM7QUFDNUcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDekUsT0FBTyxFQUFFLDBCQUEwQixFQUEyRixNQUFNLHNEQUFzRCxDQUFDO0FBQzNMLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxnQkFBZ0IsRUFBMEIsTUFBTSwwQ0FBMEMsQ0FBQztBQUMxSCxPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMxRixPQUFPLEVBQUUsaUJBQWlCLEVBQWtDLE1BQU0sMENBQTBDLENBQUM7QUFFN0csT0FBTyxFQUFFLG1DQUFtQyxFQUFtQyxNQUFNLHFEQUFxRCxDQUFDO0FBQzNJLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBRW5GLE1BQU0scUJBQXNCLFNBQVEsaUJBQWlCO0lBQXJEOztRQUNvQixlQUFVLEdBQTZCLE9BQU8sQ0FBQyxPQUFPLGlDQUF5QixDQUFDO0lBUXBHLENBQUM7SUFOQSxJQUFJLDJCQUEyQixLQUFLLE9BQU8sSUFBSSxDQUFDLDRCQUE0QixDQUFDLENBQUMsQ0FBQztJQUMvRSxJQUFJLGNBQWMsS0FBSyxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDO0lBRXJELFlBQVksQ0FBQyxFQUFtQjtRQUMvQixJQUFJLENBQUMsVUFBVSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDdkMsQ0FBQztDQUNEO0FBRUQsS0FBSyxDQUFDLG1CQUFtQixFQUFFLEdBQUcsRUFBRTtJQUMvQixNQUFNLEtBQUssR0FBRyx1Q0FBdUMsRUFBRSxDQUFDO0lBRXhELElBQUksb0JBQThDLENBQUM7SUFDbkQsSUFBSSxvQkFBOEMsQ0FBQztJQUNuRCxJQUFJLFdBQXlCLENBQUM7SUFDOUIsSUFBSSxjQUErQixDQUFDO0lBQ3BDLElBQUksdUJBQTJDLENBQUM7SUFDaEQsSUFBSSw2QkFBeUQsQ0FBQztJQUM5RCxJQUFJLHlCQUErRSxDQUFDO0lBRXBGLElBQUksaUJBQXdDLENBQUM7SUFFN0MsS0FBSyxDQUFDLEdBQUcsRUFBRTtRQUNWLG9CQUFvQixHQUFHLElBQUksd0JBQXdCLEVBQUUsQ0FBQztRQUN0RCx1QkFBdUIsR0FBRyxJQUFJLGtCQUFrQixFQUFFLENBQUM7UUFFbkQsTUFBTSxVQUFVLEdBQUcsSUFBSSxjQUFjLEVBQUUsQ0FBQztRQUN4QyxXQUFXLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLFdBQVcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO1FBQ3JELE1BQU0sa0JBQWtCLEdBQUcsSUFBSSx5QkFBeUIsRUFBRSxDQUFDO1FBQzNELEtBQUssQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsa0JBQWtCLENBQUMsQ0FBQyxDQUFDO1FBRTFFLFNBQVMsa0dBQW9ELElBQUksQ0FBQyxDQUFDO1FBQ25FLDZCQUE2QixHQUFHLElBQUksT0FBTyxFQUFxQixDQUFDO1FBQ2pFLHlCQUF5QixHQUFHLElBQUksT0FBTyxFQUErQyxDQUFDO1FBRXZGLG9CQUFvQixHQUFHLDZCQUE2QixDQUFDO1lBQ3BELG9CQUFvQixFQUFFLEdBQUcsRUFBRSxDQUFDLG9CQUFvQjtZQUNoRCxXQUFXLEVBQUUsR0FBRyxFQUFFLENBQUMsV0FBVztTQUM5QixFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRVYsb0JBQW9CLENBQUMsSUFBSSxDQUFDLG9CQUFvQixFQUFFLEtBQUssQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3JILG9CQUFvQixDQUFDLElBQUksQ0FBQyx3QkFBd0IsRUFBRSx1QkFBdUIsQ0FBQyxDQUFDO1FBQzdFLG9CQUFvQixDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUU7WUFDMUMsMEJBQTBCLEVBQUUsR0FBRyxFQUFFLENBQUMsU0FBUztTQUMzQyxDQUFDLENBQUM7UUFFSCxNQUFNLHdCQUF3QixHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQztRQUMxRyx3QkFBd0IsQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDO1FBQ3ZDLG9CQUFvQixDQUFDLElBQUksQ0FBQyx5QkFBeUIsRUFBRSx3QkFBd0IsQ0FBQyxDQUFDO1FBRS9FLG9CQUFvQixDQUFDLElBQUksQ0FBQywwQkFBMEIsRUFBRTtZQUNyRCxRQUFRO2dCQUNQLE9BQU8sRUFBRSxDQUFDO1lBQ1gsQ0FBQztTQUNELENBQUMsQ0FBQztRQUNILG9CQUFvQixDQUFDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRTtZQUMzQyxvQkFBb0IsRUFBRSw2QkFBNkIsQ0FBQyxLQUFLO1lBQ3pELGdCQUFnQixFQUFFLEtBQUssSUFBSSxFQUFFLEdBQUcsQ0FBQztTQUNqQyxDQUFDLENBQUM7UUFDSCxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFO1lBQ3ZDLG1CQUFtQixFQUFFLHlCQUF5QixDQUFDLEtBQUs7U0FDcEQsQ0FBQyxDQUFDO1FBQ0gsb0JBQW9CLENBQUMsSUFBSSxDQUFDLCtCQUErQixFQUFFO1lBQzFELGlCQUFpQixFQUFFLEtBQUssSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQXVCLENBQUE7U0FDckUsQ0FBQyxDQUFDO1FBRUgsY0FBYyxHQUFHLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUMzRCxjQUFjLENBQUMsS0FBSyxpSUFBeUUsSUFBSSxnRUFBK0MsQ0FBQztRQUVqSixpQkFBaUIsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUM7SUFDM0YsQ0FBQyxDQUFDLENBQUM7SUFFSCxTQUFTLGNBQWMsQ0FBQyxLQUFvRjtRQUMzRyxTQUFTLHNGQUE4QyxLQUFLLENBQUMsQ0FBQztJQUMvRCxDQUFDO0lBRUQsU0FBUyxTQUFTLENBQUMsR0FBVyxFQUFFLEtBQWM7UUFDN0Msb0JBQW9CLENBQUMsb0JBQW9CLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3RELG9CQUFvQixDQUFDLCtCQUErQixDQUFDLElBQUksQ0FBQztZQUN6RCxvQkFBb0IsRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJO1lBQ2hDLFlBQVksRUFBRSxJQUFJLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQzVCLE1BQU0sa0NBQTBCO1lBQ2hDLE1BQU0sRUFBRSxJQUFLO1NBQ2IsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVELFNBQVMsb0NBQW9DO1FBQzVDLGNBQWMsQ0FBQyxNQUFNLG1LQUFrRyxDQUFDO0lBQ3pILENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssVUFBVSxlQUFlLENBQzdCLE1BQTBDO1FBRTFDLE1BQU0sT0FBTyxHQUFzQztZQUNsRCxVQUFVLEVBQUU7Z0JBQ1gsT0FBTyxFQUFFLFlBQVk7Z0JBQ3JCLFdBQVcsRUFBRSw0QkFBNEI7Z0JBQ3pDLFlBQVksRUFBRSxLQUFLO2dCQUNuQixHQUFHLE1BQU07YUFDb0I7U0FDTyxDQUFDO1FBRXZDLE1BQU0sTUFBTSxHQUFHLE1BQU0saUJBQWlCLENBQUMscUJBQXFCLENBQUMsT0FBTyxFQUFFLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzlGLE9BQU8sTUFBTSxDQUFDO0lBQ2YsQ0FBQztJQUVELFNBQVMsV0FBVyxDQUFDLE1BQThCO1FBQ2xELE9BQU8sTUFBTSxZQUFZLFNBQVMsQ0FBQztJQUNwQyxDQUFDO0lBRUQ7O09BRUc7SUFDSCxTQUFTLGtCQUFrQixDQUFDLGtCQUF1RDtRQUNsRixFQUFFLENBQUMsa0JBQWtCLEVBQUUsNENBQTRDLENBQUMsQ0FBQztRQUNyRSxFQUFFLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxvQkFBb0IsRUFBRSw2REFBNkQsQ0FBQyxDQUFDO0lBQzdHLENBQUM7SUFFRDs7T0FFRztJQUNILFNBQVMsMEJBQTBCLENBQUMsa0JBQXVELEVBQUUsYUFBc0I7UUFDbEgsRUFBRSxDQUFDLGtCQUFrQixFQUFFLDRDQUE0QyxDQUFDLENBQUM7UUFDckUsRUFBRSxDQUFDLGtCQUFrQixDQUFDLG9CQUFvQixFQUFFLHlEQUF5RCxDQUFDLENBQUM7UUFDdkcsSUFBSSxhQUFhLEVBQUUsQ0FBQztZQUNuQixXQUFXLENBQUMsa0JBQWtCLENBQUMsb0JBQXFCLENBQUMsS0FBSyxFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBQzVFLENBQUM7SUFDRixDQUFDO0lBRUQsS0FBSyxDQUFDLDRCQUE0QixFQUFFLEdBQUcsRUFBRTtRQUN4QyxNQUFNLFFBQVEsR0FBRyxtQ0FBbUMscUZBQTZDLENBQUMsT0FBcUYsQ0FBQztRQUV4TCxVQUFVLENBQUMsR0FBRyxFQUFFO1lBQ2YsZ0ZBQWdGO1lBQ2hGLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUMsQ0FBQztRQUN2QyxDQUFDLENBQUMsQ0FBQztRQUNILEtBQUssQ0FBQyxHQUFHLEVBQUU7WUFDVixjQUFjLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDMUIsQ0FBQyxDQUFDLENBQUM7UUFFSCxNQUFNLHFCQUFxQixHQUFHO1lBQzdCLGdCQUFnQjtZQUNoQixVQUFVO1lBQ1YsWUFBWTtZQUNaLGNBQWM7WUFDZCxRQUFRO1lBQ1IsS0FBSztZQUNMLGNBQWM7WUFDZCxxQkFBcUI7WUFDckIsaUJBQWlCO1lBQ2pCLDBCQUEwQjtZQUMxQixnQkFBZ0I7WUFDaEIsWUFBWTtZQUNaLGFBQWE7WUFDYixpQkFBaUI7WUFDakIsWUFBWTtZQUNaLHdCQUF3QjtZQUN4Qix1QkFBdUI7WUFDdkIsWUFBWTtZQUNaLGtCQUFrQjtZQUNsQixlQUFlO1lBQ2YsbUJBQW1CO1lBQ25CLGVBQWU7WUFDZixPQUFPO1lBQ1AsU0FBUztZQUNULGVBQWU7WUFDZix5QkFBeUI7WUFFekIsd0JBQXdCO1lBQ3hCLFlBQVk7WUFDWixtQkFBbUI7WUFDbkIsZUFBZTtZQUNmLGVBQWU7WUFDZixpQkFBaUI7WUFFakIsc0JBQXNCO1lBQ3RCLGVBQWU7WUFDZixVQUFVO1lBQ1YsWUFBWTtZQUNaLGNBQWM7WUFDZCxvQkFBb0I7WUFDcEIscUJBQXFCO1lBQ3JCLDRCQUE0QjtZQUM1QiwwQkFBMEI7WUFDMUIsZUFBZTtZQUVmLHlDQUF5QztZQUN6QyxvQkFBb0I7WUFDcEIsdUJBQXVCO1lBQ3ZCLHNCQUFzQjtZQUN0QixjQUFjO1lBQ2Qsa0JBQWtCO1lBRWxCLHFDQUFxQztZQUNyQyxpQkFBaUI7WUFDakIsZ0JBQWdCO1lBQ2hCLHNCQUFzQjtZQUN0Qix1QkFBdUI7WUFDdkIsZUFBZTtZQUNmLGdCQUFnQjtTQUNoQixDQUFDO1FBQ0YsTUFBTSw2QkFBNkIsR0FBRztZQUNyQyw0QkFBNEI7WUFDNUIsY0FBYztZQUNkLGNBQWM7WUFDZCxjQUFjO1lBQ2Qsc0JBQXNCO1lBQ3RCLGFBQWE7WUFDYixXQUFXO1lBQ1gsZ0JBQWdCO1lBQ2hCLHlCQUF5QjtZQUV6QixxQkFBcUI7WUFDckIsV0FBVztZQUNYLFFBQVE7WUFDUixLQUFLO1lBQ0wsdUJBQXVCO1lBQ3ZCLGNBQWM7WUFDZCw2QkFBNkI7WUFDN0IsNkJBQTZCO1lBRTdCLGVBQWU7WUFDZiwwQkFBMEI7WUFDMUIsK0JBQStCO1lBQy9CLDJDQUEyQztZQUMzQyx1Q0FBdUM7WUFDdkMseUJBQXlCO1lBQ3pCLHlCQUF5QjtZQUV6QixtQkFBbUI7WUFDbkIsbUJBQW1CO1lBQ25CLDJCQUEyQjtZQUMzQiw0Q0FBNEM7WUFDNUMsOEJBQThCO1lBQzlCLHVCQUF1QjtZQUV2QixvQkFBb0I7WUFDcEIsd0JBQXdCO1lBQ3hCLFVBQVU7WUFDVixtQkFBbUI7WUFDbkIsOEJBQThCO1lBQzlCLHVCQUF1QjtZQUV2QixvQ0FBb0M7WUFDcEMsMEJBQTBCO1lBQzFCLHlCQUF5QjtZQUN6QixnQkFBZ0I7WUFDaEIsd0JBQXdCO1lBQ3hCLDJCQUEyQjtZQUMzQiwyQkFBMkI7WUFDM0IsOEJBQThCO1lBQzlCLHVCQUF1QjtZQUN2QixvQkFBb0I7WUFFcEIsa0NBQWtDO1lBQ2xDLHdDQUF3QztZQUN4Qyw2Q0FBNkM7WUFDN0MsZ0RBQWdEO1lBQ2hELG1DQUFtQztZQUNuQyx5QkFBeUI7U0FDekIsQ0FBQztRQUVGLEtBQUssQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLEdBQUcsRUFBRTtZQUNoQyxLQUFLLE1BQU0sT0FBTyxJQUFJLHFCQUFxQixFQUFFLENBQUM7Z0JBQzdDLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsRUFBRSxLQUFLLElBQUksRUFBRTtvQkFDaEQsa0JBQWtCLENBQUMsTUFBTSxlQUFlLENBQUMsRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ3hELENBQUMsQ0FBQyxDQUFDO1lBQ0osQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDO1FBQ0gsS0FBSyxDQUFDLHVCQUF1QixFQUFFLEdBQUcsRUFBRTtZQUNuQyxLQUFLLE1BQU0sT0FBTyxJQUFJLDZCQUE2QixFQUFFLENBQUM7Z0JBQ3JELElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsRUFBRSxLQUFLLElBQUksRUFBRTtvQkFDaEQsMEJBQTBCLENBQUMsTUFBTSxlQUFlLENBQUMsRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ2hFLENBQUMsQ0FBQyxDQUFDO1lBQ0osQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxLQUFLLENBQUMsZ0RBQWdELEVBQUUsR0FBRyxFQUFFO1FBRTVELElBQUksQ0FBQyw0Q0FBNEMsRUFBRSxLQUFLLElBQUksRUFBRTtZQUM3RCxjQUFjLENBQUM7Z0JBQ2QsSUFBSSxFQUFFLElBQUk7YUFDVixDQUFDLENBQUM7WUFFSCxNQUFNLE1BQU0sR0FBRyxNQUFNLGVBQWUsQ0FBQyxFQUFFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxDQUFDLENBQUM7WUFDdEUsa0JBQWtCLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDNUIsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsNERBQTRELEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDN0UsY0FBYyxDQUFDO2dCQUNkLEVBQUUsRUFBRSxJQUFJO2FBQ1IsQ0FBQyxDQUFDO1lBRUgsTUFBTSxNQUFNLEdBQUcsTUFBTSxlQUFlLENBQUM7Z0JBQ3BDLE9BQU8sRUFBRSxhQUFhO2dCQUN0QixXQUFXLEVBQUUsZUFBZTthQUM1QixDQUFDLENBQUM7WUFDSCwwQkFBMEIsQ0FBQyxNQUFNLEVBQUUscUJBQXFCLENBQUMsQ0FBQztRQUMzRCxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyw2RUFBNkUsRUFBRSxLQUFLLElBQUksRUFBRTtZQUM5RixjQUFjLENBQUM7Z0JBQ2QsRUFBRSxFQUFFLEtBQUs7Z0JBQ1QsSUFBSSxFQUFFLElBQUk7YUFDVixDQUFDLENBQUM7WUFFSCxNQUFNLE1BQU0sR0FBRyxNQUFNLGVBQWUsQ0FBQztnQkFDcEMsT0FBTyxFQUFFLHVCQUF1QjtnQkFDaEMsV0FBVyxFQUFFLHlCQUF5QjthQUN0QyxDQUFDLENBQUM7WUFDSCwwQkFBMEIsQ0FBQyxNQUFNLEVBQUUscUJBQXFCLENBQUMsQ0FBQztRQUMzRCxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxxREFBcUQsRUFBRSxLQUFLLElBQUksRUFBRTtZQUN0RSxjQUFjLENBQUM7Z0JBQ2QsRUFBRSxFQUFFLElBQUk7YUFDUixDQUFDLENBQUM7WUFFSCxNQUFNLE1BQU0sR0FBRyxNQUFNLGVBQWUsQ0FBQztnQkFDcEMsT0FBTyxFQUFFLGVBQWU7Z0JBQ3hCLFdBQVcsRUFBRSxpQ0FBaUM7Z0JBQzlDLFlBQVksRUFBRSxJQUFJO2FBQ2xCLENBQUMsQ0FBQztZQUNILDBCQUEwQixDQUFDLE1BQU0sRUFBRSwyQ0FBMkMsQ0FBQyxDQUFDO1FBQ2pGLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLHVEQUF1RCxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ3hFLGNBQWMsQ0FBQztnQkFDZCxHQUFHLEVBQUUsSUFBSTthQUNULENBQUMsQ0FBQztZQUVILE1BQU0sTUFBTSxHQUFHLE1BQU0sZUFBZSxDQUFDO2dCQUNwQyxPQUFPLEVBQUUsZUFBZTtnQkFDeEIsV0FBVyxFQUFFLGlDQUFpQztnQkFDOUMsWUFBWSxFQUFFLElBQUk7YUFDbEIsQ0FBQyxDQUFDO1lBQ0gsa0JBQWtCLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDNUIsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsMERBQTBELEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDM0UsY0FBYyxDQUFDO2dCQUNkLEdBQUcsRUFBRSxJQUFJO2FBQ1QsQ0FBQyxDQUFDO1lBRUgsTUFBTSxNQUFNLEdBQUcsTUFBTSxlQUFlLENBQUM7Z0JBQ3BDLE9BQU8sRUFBRSxlQUFlO2dCQUN4QixXQUFXLEVBQUUsaUNBQWlDO2dCQUM5QyxZQUFZLEVBQUUsSUFBSTthQUNsQixDQUFDLENBQUM7WUFDSCxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUUzQixtREFBbUQ7WUFDbkQsRUFBRSxDQUFDLE1BQU0sRUFBRSxnQkFBZ0IsRUFBRSx5Q0FBeUMsQ0FBQyxDQUFDO1lBQ3hFLG1EQUFtRDtZQUNuRCxNQUFNLFlBQVksR0FBRyxNQUFPLENBQUMsZ0JBQXVCLENBQUM7WUFDckQsRUFBRSxDQUFDLFlBQVksQ0FBQyxlQUFlLEVBQUUsNkVBQTZFLENBQUMsQ0FBQztZQUNoSCxFQUFFLENBQUMsWUFBWSxDQUFDLGVBQWUsQ0FBQyxLQUFLLEVBQUUsMENBQTBDLENBQUMsQ0FBQztZQUNuRixFQUFFLENBQUMsWUFBWSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFLHVEQUF1RCxDQUFDLENBQUM7UUFDakgsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsNENBQTRDLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDN0QsY0FBYyxDQUFDO2dCQUNkLHFCQUFxQixFQUFFLElBQUk7YUFDM0IsQ0FBQyxDQUFDO1lBRUgsTUFBTSxNQUFNLEdBQUcsTUFBTSxlQUFlLENBQUMsRUFBRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsQ0FBQyxDQUFDO1lBQzVFLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzVCLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLHdEQUF3RCxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ3pFLGNBQWMsQ0FBQztnQkFDZCxJQUFJLEVBQUUsSUFBSTtnQkFDVixFQUFFLEVBQUUsSUFBSTthQUNSLENBQUMsQ0FBQztZQUVILE1BQU0sTUFBTSxHQUFHLE1BQU0sZUFBZSxDQUFDLEVBQUUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLENBQUMsQ0FBQztZQUM1RSxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUM1QixDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxrRUFBa0UsRUFBRSxLQUFLLElBQUksRUFBRTtZQUNuRixjQUFjLENBQUM7Z0JBQ2QsSUFBSSxFQUFFLElBQUk7YUFDVixDQUFDLENBQUM7WUFFSCxNQUFNLE1BQU0sR0FBRyxNQUFNLGVBQWUsQ0FBQyxFQUFFLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxDQUFDLENBQUM7WUFDakYsMEJBQTBCLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDcEMsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMscUNBQXFDLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDdEQsY0FBYyxDQUFDO2dCQUNkLElBQUksRUFBRSxJQUFJO2FBQ1YsQ0FBQyxDQUFDO1lBRUgsTUFBTSxNQUFNLEdBQUcsTUFBTSxlQUFlLENBQUM7Z0JBQ3BDLE9BQU8sRUFBRSxFQUFFO2dCQUNYLFdBQVcsRUFBRSxlQUFlO2FBQzVCLENBQUMsQ0FBQztZQUNILGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzVCLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLCtDQUErQyxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ2hFLGNBQWMsQ0FBQztnQkFDZCxhQUFhLEVBQUUsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLGdCQUFnQixFQUFFLElBQUksRUFBRTtnQkFDekQsTUFBTSxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxnQkFBZ0IsRUFBRSxJQUFJLEVBQUU7YUFDakQsQ0FBQyxDQUFDO1lBRUgsTUFBTSxPQUFPLEdBQUcsTUFBTSxlQUFlLENBQUMsRUFBRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDO1lBQ3ZFLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBRTVCLE1BQU0sT0FBTyxHQUFHLE1BQU0sZUFBZSxDQUFDLEVBQUUsT0FBTyxFQUFFLGtDQUFrQyxFQUFFLENBQUMsQ0FBQztZQUN2RiwwQkFBMEIsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNyQyxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQywyRUFBMkUsRUFBRSxLQUFLLElBQUksRUFBRTtZQUM1RixjQUFjLENBQUM7Z0JBQ2QsS0FBSyxFQUFFLElBQUk7Z0JBQ1gsU0FBUyxFQUFFLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxnQkFBZ0IsRUFBRSxJQUFJLEVBQUU7YUFDckQsQ0FBQyxDQUFDO1lBRUgsTUFBTSxPQUFPLEdBQUcsTUFBTSxlQUFlLENBQUMsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztZQUMxRCwwQkFBMEIsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUVwQyxNQUFNLE9BQU8sR0FBRyxNQUFNLGVBQWUsQ0FBQyxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDO1lBQzlELGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzdCLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxLQUFLLENBQUMscURBQXFELEVBQUUsR0FBRyxFQUFFO1FBRWpFLFNBQVMscUJBQXFCLENBQUMsTUFBMkMsRUFBRSxLQUF5RztZQUNwTCxNQUFNLE9BQU8sR0FBRyxNQUFNLEVBQUUsb0JBQW9CLEVBQUUscUJBQXNCLENBQUM7WUFDckUsRUFBRSxDQUFDLE9BQU8sRUFBRSx1Q0FBdUMsQ0FBQyxDQUFDO1lBRXJELFdBQVcsQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUUxQyxLQUFLLE1BQU0sQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUM7Z0JBQ3pDLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDMUIsSUFBSSxJQUFJLEtBQUssS0FBSyxFQUFFLENBQUM7b0JBQ3BCLEVBQUUsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztnQkFDekIsQ0FBQztxQkFBTSxDQUFDO29CQUNQLEVBQUUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO29CQUN6QixJQUFJLElBQUksS0FBSyxXQUFXLEVBQUUsQ0FBQzt3QkFDMUIsV0FBVyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsMkJBQTJCLENBQUMsQ0FBQzt3QkFDdkQsV0FBVyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFDO29CQUM1QyxDQUFDO3lCQUFNLElBQUksSUFBSSxLQUFLLGlCQUFpQixFQUFFLENBQUM7d0JBQ3ZDLFdBQVcsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLG9DQUFvQyxDQUFDLENBQUM7d0JBQ2hFLFdBQVcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO29CQUNsRCxDQUFDO3lCQUFNLElBQUksSUFBSSxLQUFLLGFBQWEsRUFBRSxDQUFDO3dCQUNuQyxXQUFXLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxpQ0FBaUMsQ0FBQyxDQUFDO3dCQUM3RCxXQUFXLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUM7d0JBQ3pDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSwrQkFBK0IsQ0FBQyxDQUFDO29CQUN2RSxDQUFDO3lCQUFNLENBQUM7d0JBQ1AsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDOzRCQUNwQyxXQUFXLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSwwQkFBMEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO3dCQUNuRixDQUFDOzZCQUFNLENBQUM7NEJBQ1AsV0FBVyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUseUJBQXlCLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDO3dCQUN2RSxDQUFDO3dCQUNELFdBQVcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQzt3QkFDekMsRUFBRSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSw4QkFBOEIsQ0FBQyxDQUFDO29CQUNyRSxDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksQ0FBQywrREFBK0QsRUFBRSxLQUFLLElBQUksRUFBRTtZQUNoRixjQUFjLENBQUM7Z0JBQ2QsRUFBRSxFQUFFLElBQUk7YUFDUixDQUFDLENBQUM7WUFDSCxNQUFNLE1BQU0sR0FBRyxNQUFNLGVBQWUsQ0FBQztnQkFDcEMsT0FBTyxFQUFFLGVBQWU7Z0JBQ3hCLFdBQVcsRUFBRSxtQkFBbUI7YUFDaEMsQ0FBQyxDQUFDO1lBRUgsMEJBQTBCLENBQUMsTUFBTSxFQUFFLHFCQUFxQixDQUFDLENBQUM7WUFDMUQscUJBQXFCLENBQUMsTUFBTSxFQUFFO2dCQUM3QixFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUU7Z0JBQy9CLGFBQWE7Z0JBQ2IsS0FBSztnQkFDTCxpQkFBaUI7Z0JBQ2pCLEtBQUs7Z0JBQ0wsV0FBVzthQUNYLENBQUMsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLHlEQUF5RCxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQzFFLE1BQU0sTUFBTSxHQUFHLE1BQU0sZUFBZSxDQUFDO2dCQUNwQyxPQUFPLEVBQUUsS0FBSztnQkFDZCxXQUFXLEVBQUUsaUJBQWlCO2FBQzlCLENBQUMsQ0FBQztZQUVILDBCQUEwQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ25DLHFCQUFxQixDQUFDLE1BQU0sRUFBRTtnQkFDN0IsRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFO2dCQUNyQixLQUFLO2dCQUNMLGlCQUFpQjtnQkFDakIsS0FBSztnQkFDTCxXQUFXO2FBQ1gsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsK0RBQStELEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDaEYsY0FBYyxDQUFDO2dCQUNkLEdBQUcsRUFBRSxJQUFJO2FBQ1QsQ0FBQyxDQUFDO1lBQ0gsTUFBTSxNQUFNLEdBQUcsTUFBTSxlQUFlLENBQUM7Z0JBQ3BDLE9BQU8sRUFBRSxlQUFlO2dCQUN4QixXQUFXLEVBQUUsbUJBQW1CO2FBQ2hDLENBQUMsQ0FBQztZQUVILGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzVCLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLHNFQUFzRSxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ3ZGLGNBQWMsQ0FBQztnQkFDZCxHQUFHLEVBQUUsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFO2FBQ3ZCLENBQUMsQ0FBQztZQUNILE1BQU0sTUFBTSxHQUFHLE1BQU0sZUFBZSxDQUFDO2dCQUNwQyxPQUFPLEVBQUUsZUFBZTtnQkFDeEIsV0FBVyxFQUFFLG1CQUFtQjthQUNoQyxDQUFDLENBQUM7WUFFSCwwQkFBMEIsQ0FBQyxNQUFNLEVBQUUscUJBQXFCLENBQUMsQ0FBQztZQUMxRCxxQkFBcUIsQ0FBQyxNQUFNLEVBQUU7Z0JBQzdCLGlCQUFpQjtnQkFDakIsS0FBSztnQkFDTCxXQUFXO2FBQ1gsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsdUVBQXVFLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDeEYsTUFBTSxNQUFNLEdBQUcsTUFBTSxlQUFlLENBQUM7Z0JBQ3BDLE9BQU8sRUFBRSw4QkFBOEI7Z0JBQ3ZDLFdBQVcsRUFBRSxnQ0FBZ0M7YUFDN0MsQ0FBQyxDQUFDO1lBRUgsMEJBQTBCLENBQUMsTUFBTSxFQUFFLHFCQUFxQixDQUFDLENBQUM7WUFDMUQscUJBQXFCLENBQUMsTUFBTSxFQUFFO2dCQUM3QixFQUFFLFVBQVUsRUFBRSxDQUFDLGFBQWEsRUFBRSxlQUFlLENBQUMsRUFBRTtnQkFDaEQsYUFBYTtnQkFDYixLQUFLO2dCQUNMLGlCQUFpQjtnQkFDakIsS0FBSztnQkFDTCxXQUFXO2FBQ1gsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsOERBQThELEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDL0UsY0FBYyxDQUFDO2dCQUNkLElBQUksRUFBRSxJQUFJLENBQUUsK0NBQStDO2FBQzNELENBQUMsQ0FBQztZQUNILE1BQU0sTUFBTSxHQUFHLE1BQU0sZUFBZSxDQUFDO2dCQUNwQyxPQUFPLEVBQUUsZ0JBQWdCO2dCQUN6QixXQUFXLEVBQUUseUNBQXlDO2FBQ3RELENBQUMsQ0FBQztZQUVILDBCQUEwQixDQUFDLE1BQU0sRUFBRSxxQkFBcUIsQ0FBQyxDQUFDO1lBQzFELHFCQUFxQixDQUFDLE1BQU0sRUFBRTtnQkFDN0IsRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFO2dCQUNyQixhQUFhO2dCQUNiLEtBQUs7Z0JBQ0wsaUJBQWlCO2dCQUNqQixLQUFLO2dCQUNMLFdBQVc7YUFDWCxDQUFDLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxpRkFBaUYsRUFBRSxLQUFLLElBQUksRUFBRTtZQUNsRyxjQUFjLENBQUM7Z0JBQ2QsR0FBRyxFQUFFLElBQUk7Z0JBQ1QsSUFBSSxFQUFFLElBQUk7YUFDVixDQUFDLENBQUM7WUFDSCxNQUFNLE1BQU0sR0FBRyxNQUFNLGVBQWUsQ0FBQztnQkFDcEMsT0FBTyxFQUFFLGdCQUFnQjtnQkFDekIsV0FBVyxFQUFFLHlDQUF5QzthQUN0RCxDQUFDLENBQUM7WUFFSCxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUM1QixDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxnRUFBZ0UsRUFBRSxLQUFLLElBQUksRUFBRTtZQUNqRixjQUFjLENBQUM7Z0JBQ2QsSUFBSSxFQUFFLElBQUk7Z0JBQ1YsSUFBSSxFQUFFLElBQUk7YUFDVixDQUFDLENBQUM7WUFDSCxNQUFNLE1BQU0sR0FBRyxNQUFNLGVBQWUsQ0FBQztnQkFDcEMsT0FBTyxFQUFFLGtDQUFrQztnQkFDM0MsV0FBVyxFQUFFLDZCQUE2QjthQUMxQyxDQUFDLENBQUM7WUFFSCwwQkFBMEIsQ0FBQyxNQUFNLEVBQUUscUJBQXFCLENBQUMsQ0FBQztZQUMxRCxxQkFBcUIsQ0FBQyxNQUFNLEVBQUU7Z0JBQzdCLEVBQUUsVUFBVSxFQUFFLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxFQUFFO2dCQUM5QixhQUFhO2dCQUNiLEtBQUs7Z0JBQ0wsaUJBQWlCO2dCQUNqQixLQUFLO2dCQUNMLFdBQVc7YUFDWCxDQUFDLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyw0Q0FBNEMsRUFBRSxLQUFLLElBQUksRUFBRTtZQUM3RCxNQUFNLE1BQU0sR0FBRyxNQUFNLGVBQWUsQ0FBQztnQkFDcEMsT0FBTyxFQUFFLFlBQVk7Z0JBQ3JCLFdBQVcsRUFBRSxrQkFBa0I7YUFDL0IsQ0FBQyxDQUFDO1lBRUgsMEJBQTBCLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDbkMscUJBQXFCLENBQUMsTUFBTSxFQUFFO2dCQUM3QixFQUFFLFVBQVUsRUFBRSxZQUFZLEVBQUU7Z0JBQzVCLGFBQWE7Z0JBQ2IsS0FBSztnQkFDTCxpQkFBaUI7Z0JBQ2pCLEtBQUs7Z0JBQ0wsV0FBVzthQUNYLENBQUMsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLDRDQUE0QyxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQzdELE1BQU0sTUFBTSxHQUFHLE1BQU0sZUFBZSxDQUFDO2dCQUNwQyxPQUFPLEVBQUUsVUFBVTtnQkFDbkIsV0FBVyxFQUFFLGVBQWU7YUFDNUIsQ0FBQyxDQUFDO1lBRUgsMEJBQTBCLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDbkMscUJBQXFCLENBQUMsTUFBTSxFQUFFO2dCQUM3QixFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUU7Z0JBQzFCLGFBQWE7Z0JBQ2IsS0FBSztnQkFDTCxpQkFBaUI7Z0JBQ2pCLEtBQUs7Z0JBQ0wsV0FBVzthQUNYLENBQUMsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLHVEQUF1RCxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ3hFLE1BQU0sTUFBTSxHQUFHLE1BQU0sZUFBZSxDQUFDO2dCQUNwQyxPQUFPLEVBQUUsZUFBZTtnQkFDeEIsV0FBVyxFQUFFLGtCQUFrQjthQUMvQixDQUFDLENBQUM7WUFFSCwwQkFBMEIsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNuQyxxQkFBcUIsQ0FBQyxNQUFNLEVBQUU7Z0JBQzdCLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRTtnQkFDL0IsYUFBYTtnQkFDYixLQUFLO2dCQUNMLGlCQUFpQjtnQkFDakIsS0FBSztnQkFDTCxXQUFXO2FBQ1gsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsd0RBQXdELEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDekUsTUFBTSxNQUFNLEdBQUcsTUFBTSxlQUFlLENBQUM7Z0JBQ3BDLE9BQU8sRUFBRSxlQUFlO2dCQUN4QixXQUFXLEVBQUUsaUJBQWlCO2FBQzlCLENBQUMsQ0FBQztZQUVILDBCQUEwQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ25DLHFCQUFxQixDQUFDLE1BQU0sRUFBRTtnQkFDN0IsRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFO2dCQUMvQixhQUFhO2dCQUNiLEtBQUs7Z0JBQ0wsaUJBQWlCO2dCQUNqQixLQUFLO2dCQUNMLFdBQVc7YUFDWCxDQUFDLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyx1REFBdUQsRUFBRSxLQUFLLElBQUksRUFBRTtZQUN4RSxNQUFNLE1BQU0sR0FBRyxNQUFNLGVBQWUsQ0FBQztnQkFDcEMsT0FBTyxFQUFFLGlCQUFpQjtnQkFDMUIsV0FBVyxFQUFFLG9CQUFvQjthQUNqQyxDQUFDLENBQUM7WUFFSCwwQkFBMEIsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNuQyxxQkFBcUIsQ0FBQyxNQUFNLEVBQUU7Z0JBQzdCLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRTtnQkFDckIsYUFBYTtnQkFDYixLQUFLO2dCQUNMLGlCQUFpQjtnQkFDakIsS0FBSztnQkFDTCxXQUFXO2FBQ1gsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsc0RBQXNELEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDdkUsTUFBTSxNQUFNLEdBQUcsTUFBTSxlQUFlLENBQUM7Z0JBQ3BDLE9BQU8sRUFBRSx5QkFBeUI7Z0JBQ2xDLFdBQVcsRUFBRSw0QkFBNEI7YUFDekMsQ0FBQyxDQUFDO1lBRUgsMEJBQTBCLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDbkMscUJBQXFCLENBQUMsTUFBTSxFQUFFO2dCQUM3QixFQUFFLFVBQVUsRUFBRSxhQUFhLEVBQUU7Z0JBQzdCLGFBQWE7Z0JBQ2IsS0FBSztnQkFDTCxpQkFBaUI7Z0JBQ2pCLEtBQUs7Z0JBQ0wsV0FBVzthQUNYLENBQUMsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLGdEQUFnRCxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ2pFLE1BQU0sTUFBTSxHQUFHLE1BQU0sZUFBZSxDQUFDO2dCQUNwQyxPQUFPLEVBQUUsNkJBQTZCO2dCQUN0QyxXQUFXLEVBQUUsd0JBQXdCO2FBQ3JDLENBQUMsQ0FBQztZQUVILDBCQUEwQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ25DLHFCQUFxQixDQUFDLE1BQU0sRUFBRTtnQkFDN0IsRUFBRSxVQUFVLEVBQUUsQ0FBQyxlQUFlLEVBQUUsWUFBWSxDQUFDLEVBQUU7Z0JBQy9DLGFBQWE7Z0JBQ2IsS0FBSztnQkFDTCxpQkFBaUI7Z0JBQ2pCLEtBQUs7Z0JBQ0wsV0FBVzthQUNYLENBQUMsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLG9EQUFvRCxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ3JFLE1BQU0sTUFBTSxHQUFHLE1BQU0sZUFBZSxDQUFDO2dCQUNwQyxPQUFPLEVBQUUseUJBQXlCO2dCQUNsQyxXQUFXLEVBQUUscUJBQXFCO2FBQ2xDLENBQUMsQ0FBQztZQUVILDBCQUEwQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ25DLHFCQUFxQixDQUFDLE1BQU0sRUFBRTtnQkFDN0IsRUFBRSxVQUFVLEVBQUUsQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUFDLEVBQUU7Z0JBQ3BDLGFBQWE7Z0JBQ2IsS0FBSztnQkFDTCxpQkFBaUI7Z0JBQ2pCLEtBQUs7Z0JBQ0wsV0FBVzthQUNYLENBQUMsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLHNEQUFzRCxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ3ZFLE1BQU0sTUFBTSxHQUFHLE1BQU0sZUFBZSxDQUFDO2dCQUNwQyxPQUFPLEVBQUUsaUNBQWlDO2dCQUMxQyxXQUFXLEVBQUUsc0JBQXNCO2FBQ25DLENBQUMsQ0FBQztZQUVILDBCQUEwQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ25DLHFCQUFxQixDQUFDLE1BQU0sRUFBRTtnQkFDN0IsRUFBRSxVQUFVLEVBQUUsQ0FBQyxZQUFZLEVBQUUsU0FBUyxDQUFDLEVBQUU7Z0JBQ3pDLGFBQWE7Z0JBQ2IsS0FBSztnQkFDTCxpQkFBaUI7Z0JBQ2pCLEtBQUs7Z0JBQ0wsV0FBVzthQUNYLENBQUMsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLHNEQUFzRCxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ3ZFLE1BQU0sTUFBTSxHQUFHLE1BQU0sZUFBZSxDQUFDO2dCQUNwQyxPQUFPLEVBQUUsU0FBUztnQkFDbEIsV0FBVyxFQUFFLDJCQUEyQjthQUN4QyxDQUFDLENBQUM7WUFFSCwwQkFBMEIsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNuQyxxQkFBcUIsQ0FBQyxNQUFNLEVBQUU7Z0JBQzdCLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRTtnQkFDckIsYUFBYTtnQkFDYixLQUFLO2dCQUNMLGlCQUFpQjtnQkFDakIsS0FBSztnQkFDTCxXQUFXO2FBQ1gsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsZ0VBQWdFLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDakYsTUFBTSxNQUFNLEdBQUcsTUFBTSxlQUFlLENBQUM7Z0JBQ3BDLE9BQU8sRUFBRSxLQUFLO2dCQUNkLFdBQVcsRUFBRSxpQkFBaUI7YUFDOUIsQ0FBQyxDQUFDO1lBRUgsMEJBQTBCLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDbkMscUJBQXFCLENBQUMsTUFBTSxFQUFFO2dCQUM3QixpQkFBaUI7Z0JBQ2pCLEtBQUs7Z0JBQ0wsV0FBVzthQUNYLENBQUMsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLHFEQUFxRCxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ3RFLE1BQU0sTUFBTSxHQUFHLE1BQU0sZUFBZSxDQUFDO2dCQUNwQyxPQUFPLEVBQUUsZ0NBQWdDO2dCQUN6QyxXQUFXLEVBQUUsaUJBQWlCO2FBQzlCLENBQUMsQ0FBQztZQUVILDBCQUEwQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ25DLHFCQUFxQixDQUFDLE1BQU0sRUFBRTtnQkFDN0IsRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFO2dCQUMxQixhQUFhO2dCQUNiLEtBQUs7Z0JBQ0wsaUJBQWlCO2dCQUNqQixLQUFLO2dCQUNMLFdBQVc7YUFDWCxDQUFDLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyx1RUFBdUUsRUFBRSxLQUFLLElBQUksRUFBRTtZQUN4RixNQUFNLE1BQU0sR0FBRyxNQUFNLGVBQWUsQ0FBQztnQkFDcEMsT0FBTyxFQUFFLGVBQWU7Z0JBQ3hCLFdBQVcsRUFBRSxtQkFBbUI7YUFDaEMsQ0FBQyxDQUFDO1lBRUgsMEJBQTBCLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDbkMscUJBQXFCLENBQUMsTUFBTSxFQUFFO2dCQUM3QixFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUU7Z0JBQ3JCLGFBQWE7Z0JBQ2IsS0FBSztnQkFDTCxpQkFBaUI7Z0JBQ2pCLEtBQUs7Z0JBQ0wsV0FBVzthQUNYLENBQUMsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLHVEQUF1RCxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ3hFLE1BQU0sTUFBTSxHQUFHLE1BQU0sZUFBZSxDQUFDO2dCQUNwQyxPQUFPLEVBQUUsc0JBQXNCO2dCQUMvQixXQUFXLEVBQUUsa0JBQWtCO2FBQy9CLENBQUMsQ0FBQztZQUVILDBCQUEwQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ25DLHFCQUFxQixDQUFDLE1BQU0sRUFBRTtnQkFDN0IsYUFBYTtnQkFDYixLQUFLO2dCQUNMLGlCQUFpQjtnQkFDakIsS0FBSztnQkFDTCxXQUFXO2FBQ1gsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMseURBQXlELEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDMUUsY0FBYyxDQUFDO2dCQUNkLElBQUksRUFBRSxJQUFJO2dCQUNWLGFBQWEsRUFBRSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsZ0JBQWdCLEVBQUUsSUFBSSxFQUFFO2FBQ3pELENBQUMsQ0FBQztZQUVILE1BQU0sTUFBTSxHQUFHLE1BQU0sZUFBZSxDQUFDO2dCQUNwQyxPQUFPLEVBQUUsWUFBWTthQUNyQixDQUFDLENBQUM7WUFFSCwwQkFBMEIsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNuQyxxQkFBcUIsQ0FBQyxNQUFNLEVBQUU7Z0JBQzdCLGlCQUFpQjtnQkFDakIsS0FBSztnQkFDTCxXQUFXO2FBQ1gsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsMkVBQTJFLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDNUYsU0FBUyw4R0FBMEQsa0JBQWtCLENBQUMsQ0FBQztZQUN2RixjQUFjLENBQUMsRUFBRSxDQUFDLENBQUM7WUFFbkIsTUFBTSxlQUFlLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLHNCQUFzQixDQUFDLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1lBQzVGLE1BQU0sU0FBUyxHQUFHLElBQUksU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDLGlCQUFpQixDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM5RSx1QkFBdUIsQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDaEQsb0JBQW9CLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRTtnQkFDMUMsMEJBQTBCLEVBQUUsR0FBRyxFQUFFLENBQUMsZUFBZTthQUNqRCxDQUFDLENBQUM7WUFFSCxNQUFNLE1BQU0sR0FBRyxNQUFNLGVBQWUsQ0FBQztnQkFDcEMsT0FBTyxFQUFFLDBCQUEwQjthQUNuQyxDQUFDLENBQUM7WUFFSCwwQkFBMEIsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNuQyxXQUFXLENBQUMsTUFBTSxFQUFFLG9CQUFvQixFQUFFLHFCQUFxQixFQUFFLFNBQVMsRUFBRSx1REFBdUQsQ0FBQyxDQUFDO1FBQ3RJLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxLQUFLLENBQUMsK0JBQStCLEVBQUUsR0FBRyxFQUFFO1FBQzNDLElBQUksQ0FBQyxtRUFBbUUsRUFBRSxHQUFHLEVBQUU7WUFDOUUsTUFBTSxTQUFTLEdBQUcsa0JBQWtCLENBQUM7WUFDckMsbURBQW1EO1lBQ25ELE1BQU0sWUFBWSxHQUFzQjtnQkFDdkMsT0FBTyxFQUFFLEdBQUcsRUFBRSxHQUFzQixDQUFDO2dCQUNyQyxTQUFTLEVBQUUsS0FBSzthQUNULENBQUM7WUFDVCxJQUFJLGdCQUFnQixHQUFHLEtBQUssQ0FBQztZQUM3QixZQUFZLENBQUMsT0FBTyxHQUFHLEdBQUcsRUFBRSxHQUFHLGdCQUFnQixHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUUxRCxpQkFBaUIsQ0FBQywyQkFBMkIsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFO2dCQUM1RCxRQUFRLEVBQUUsWUFBWTtnQkFDdEIsdUJBQXVCLDJDQUE4QjthQUNyRCxDQUFDLENBQUM7WUFFSCxFQUFFLENBQUMsaUJBQWlCLENBQUMsMkJBQTJCLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxFQUFFLG1EQUFtRCxDQUFDLENBQUM7WUFFdEgseUJBQXlCLENBQUMsSUFBSSxDQUFDLEVBQUUsZUFBZSxFQUFFLG1CQUFtQixDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQztZQUVsSCxXQUFXLENBQUMsZ0JBQWdCLEVBQUUsSUFBSSxFQUFFLG9DQUFvQyxDQUFDLENBQUM7WUFDMUUsRUFBRSxDQUFDLENBQUMsaUJBQWlCLENBQUMsMkJBQTJCLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxFQUFFLHVEQUF1RCxDQUFDLENBQUM7UUFDNUgsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsK0RBQStELEVBQUUsR0FBRyxFQUFFO1lBQzFFLE1BQU0sVUFBVSxHQUFHLGdCQUFnQixDQUFDO1lBQ3BDLE1BQU0sVUFBVSxHQUFHLGdCQUFnQixDQUFDO1lBQ3BDLG1EQUFtRDtZQUNuRCxNQUFNLGFBQWEsR0FBc0I7Z0JBQ3hDLE9BQU8sRUFBRSxHQUFHLEVBQUUsR0FBc0IsQ0FBQztnQkFDckMsU0FBUyxFQUFFLEtBQUs7YUFDVCxDQUFDO1lBQ1QsbURBQW1EO1lBQ25ELE1BQU0sYUFBYSxHQUFzQjtnQkFDeEMsT0FBTyxFQUFFLEdBQUcsRUFBRSxHQUFzQixDQUFDO2dCQUNyQyxTQUFTLEVBQUUsS0FBSzthQUNULENBQUM7WUFFVCxJQUFJLGlCQUFpQixHQUFHLEtBQUssQ0FBQztZQUM5QixJQUFJLGlCQUFpQixHQUFHLEtBQUssQ0FBQztZQUM5QixhQUFhLENBQUMsT0FBTyxHQUFHLEdBQUcsRUFBRSxHQUFHLGlCQUFpQixHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM1RCxhQUFhLENBQUMsT0FBTyxHQUFHLEdBQUcsRUFBRSxHQUFHLGlCQUFpQixHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUU1RCxpQkFBaUIsQ0FBQywyQkFBMkIsQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFO2dCQUM3RCxRQUFRLEVBQUUsYUFBYTtnQkFDdkIsdUJBQXVCLDJDQUE4QjthQUNyRCxDQUFDLENBQUM7WUFDSCxpQkFBaUIsQ0FBQywyQkFBMkIsQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFO2dCQUM3RCxRQUFRLEVBQUUsYUFBYTtnQkFDdkIsdUJBQXVCLDJDQUE4QjthQUNyRCxDQUFDLENBQUM7WUFFSCxFQUFFLENBQUMsaUJBQWlCLENBQUMsMkJBQTJCLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxFQUFFLDZDQUE2QyxDQUFDLENBQUM7WUFDakgsRUFBRSxDQUFDLGlCQUFpQixDQUFDLDJCQUEyQixDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsRUFBRSw2Q0FBNkMsQ0FBQyxDQUFDO1lBRWpILHlCQUF5QixDQUFDLElBQUksQ0FBQyxFQUFFLGVBQWUsRUFBRSxtQkFBbUIsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUM7WUFFbkgsV0FBVyxDQUFDLGlCQUFpQixFQUFFLElBQUksRUFBRSxzQ0FBc0MsQ0FBQyxDQUFDO1lBQzdFLFdBQVcsQ0FBQyxpQkFBaUIsRUFBRSxLQUFLLEVBQUUsMENBQTBDLENBQUMsQ0FBQztZQUNsRixFQUFFLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQywyQkFBMkIsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEVBQUUsa0RBQWtELENBQUMsQ0FBQztZQUN2SCxFQUFFLENBQUMsaUJBQWlCLENBQUMsMkJBQTJCLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxFQUFFLDhDQUE4QyxDQUFDLENBQUM7UUFDbkgsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsMkRBQTJELEVBQUUsR0FBRyxFQUFFO1lBQ3RFLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQywyQkFBMkIsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLHdDQUF3QyxDQUFDLENBQUM7WUFDN0cseUJBQXlCLENBQUMsSUFBSSxDQUFDLEVBQUUsZUFBZSxFQUFFLG1CQUFtQixDQUFDLFVBQVUsQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDO1lBQy9ILFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQywyQkFBMkIsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLGtFQUFrRSxDQUFDLENBQUM7UUFDeEksQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILEtBQUssQ0FBQywyQ0FBMkMsRUFBRSxHQUFHLEVBQUU7UUFDdkQsSUFBSSxDQUFDLG9GQUFvRixFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ3JHLFNBQVMsa0dBQW9ELElBQUksQ0FBQyxDQUFDO1lBQ25FLGNBQWMsQ0FBQztnQkFDZCxJQUFJLEVBQUUsSUFBSTthQUNWLENBQUMsQ0FBQztZQUVILG9DQUFvQyxFQUFFLENBQUM7WUFFdkMsMEJBQTBCLENBQUMsTUFBTSxlQUFlLENBQUMsRUFBRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsQ0FBQyxFQUFFLHFCQUFxQixDQUFDLENBQUM7UUFDM0csQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsa0ZBQWtGLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDbkcsU0FBUyxrR0FBb0QsSUFBSSxDQUFDLENBQUM7WUFDbkUsY0FBYyxDQUFDO2dCQUNkLElBQUksRUFBRSxJQUFJO2FBQ1YsQ0FBQyxDQUFDO1lBRUgsa0JBQWtCLENBQUMsTUFBTSxlQUFlLENBQUMsRUFBRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDNUUsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMseUZBQXlGLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDMUcsU0FBUyxrR0FBb0QsS0FBSyxDQUFDLENBQUM7WUFDcEUsY0FBYyxDQUFDO2dCQUNkLElBQUksRUFBRSxJQUFJO2FBQ1YsQ0FBQyxDQUFDO1lBRUgsTUFBTSxNQUFNLEdBQUcsTUFBTSxlQUFlLENBQUMsRUFBRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDO1lBQ3RFLDBCQUEwQixDQUFDLE1BQU0sRUFBRSxxQkFBcUIsQ0FBQyxDQUFDO1FBQzNELENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxLQUFLLENBQUMsNEJBQTRCLEVBQUUsR0FBRyxFQUFFO1FBQ3hDLElBQUksQ0FBQyw2RUFBNkUsRUFBRSxLQUFLLElBQUksRUFBRTtZQUM5RixjQUFjLENBQUM7Z0JBQ2QsSUFBSSxFQUFFLElBQUk7YUFDVixDQUFDLENBQUM7WUFFSCxNQUFNLE1BQU0sR0FBRyxNQUFNLGVBQWUsQ0FBQyxFQUFFLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxDQUFDLENBQUM7WUFDOUUsa0JBQWtCLENBQUMsTUFBTSxDQUFDLENBQUM7WUFFM0IsTUFBTSxlQUFlLEdBQUksTUFBTyxDQUFDLGdCQUFvRCxDQUFDLGVBQWdCLENBQUM7WUFDdkcsRUFBRSxDQUFDLGVBQWUsQ0FBQyxDQUFDO1lBQ3BCLEVBQUUsQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyx3QkFBd0IsQ0FBQyxFQUFFLDRDQUE0QyxDQUFDLENBQUM7WUFDM0csV0FBVyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3RELENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxLQUFLLENBQUMsdUJBQXVCLEVBQUUsR0FBRyxFQUFFO1FBQ25DLElBQUksQ0FBQyx5RUFBeUUsRUFBRSxLQUFLLElBQUksRUFBRTtZQUMxRixNQUFNLFNBQVMsR0FBRyxrQkFBa0IsQ0FBQztZQUNyQyxNQUFNLG1CQUFtQixHQUFHLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1lBRTNFLE1BQU0sT0FBTyxHQUFzQztnQkFDbEQsVUFBVSxFQUFFO29CQUNYLE9BQU8sRUFBRSx1QkFBdUI7b0JBQ2hDLFdBQVcsRUFBRSxlQUFlO29CQUM1QixZQUFZLEVBQUUsS0FBSztpQkFDVTtnQkFDOUIsYUFBYSxFQUFFLFNBQVM7YUFDYSxDQUFDO1lBRXZDLElBQUksTUFBTSxHQUFHLE1BQU0saUJBQWlCLENBQUMscUJBQXFCLENBQUMsT0FBTyxFQUFFLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzVGLDBCQUEwQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBRW5DLG1CQUFtQixDQUFDLDBCQUEwQixDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUVoRSxNQUFNLEdBQUcsTUFBTSxpQkFBaUIsQ0FBQyxxQkFBcUIsQ0FBQyxPQUFPLEVBQUUsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDeEYsa0JBQWtCLENBQUMsTUFBTSxDQUFDLENBQUM7WUFFM0IsTUFBTSxZQUFZLEdBQUcsTUFBTyxDQUFDLGdCQUFtRCxDQUFDO1lBQ2pGLEVBQUUsQ0FBQyxZQUFZLENBQUMsZUFBZSxFQUFFLHdDQUF3QyxDQUFDLENBQUM7WUFDM0UsRUFBRSxDQUFDLFlBQVksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxnQ0FBZ0MsQ0FBQyxFQUFFLG1DQUFtQyxDQUFDLENBQUM7UUFDeEgsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILEtBQUssQ0FBQyx3QkFBd0IsRUFBRSxHQUFHLEVBQUU7UUFDcEMsS0FBSyxDQUFDLG1CQUFtQixFQUFFLEdBQUcsRUFBRTtZQUMvQixDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsOENBQThDLEVBQUUsS0FBSyxJQUFJLEVBQUU7Z0JBQ3pGLGlCQUFpQixDQUFDLFlBQVksaUNBQXlCLENBQUM7Z0JBQ3hELE1BQU0sYUFBYSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLEVBQUUsdUNBQXVDLEVBQUUsSUFBSSxFQUFFLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUM3RyxTQUFTLDZHQUF5RCxhQUFhLENBQUMsQ0FBQztnQkFFakYsTUFBTSxNQUFNLEdBQUcsTUFBTSxpQkFBaUIsQ0FBQyxjQUFjLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztnQkFDMUUsV0FBVyxDQUFDLE1BQU0sRUFBRSxhQUFhLENBQUMsQ0FBQztZQUNwQyxDQUFDLENBQUMsQ0FBQztZQUVILENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyx3RUFBd0UsRUFBRSxLQUFLLElBQUksRUFBRTtnQkFDakgsaUJBQWlCLENBQUMsWUFBWSwrQkFBdUIsQ0FBQztnQkFDdEQsU0FBUyx5R0FBdUQsSUFBSSxDQUFDLENBQUM7Z0JBRXRFLE1BQU0sTUFBTSxHQUFHLE1BQU0saUJBQWlCLENBQUMsY0FBYyxDQUFDLGlCQUFpQixFQUFFLENBQUM7Z0JBQzFFLFdBQVcsQ0FBQyxPQUFPLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQztnQkFDckMsV0FBVyxDQUFFLE1BQTJCLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQ3hELENBQUMsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIn0=