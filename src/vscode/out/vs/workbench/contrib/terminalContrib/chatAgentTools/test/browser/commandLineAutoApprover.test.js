/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { TestConfigurationService } from '../../../../../../platform/configuration/test/common/testConfigurationService.js';
import { workbenchInstantiationService } from '../../../../../test/browser/workbenchTestServices.js';
import { CommandLineAutoApprover } from '../../browser/commandLineAutoApprover.js';
import { ok, strictEqual } from 'assert';
suite('CommandLineAutoApprover', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    let configurationService;
    let commandLineAutoApprover;
    let shell;
    let os;
    setup(() => {
        configurationService = new TestConfigurationService();
        instantiationService = workbenchInstantiationService({
            configurationService: () => configurationService
        }, store);
        shell = 'bash';
        os = 3 /* OperatingSystem.Linux */;
        commandLineAutoApprover = store.add(instantiationService.createInstance(CommandLineAutoApprover));
    });
    function setAutoApprove(value) {
        setConfig("chat.tools.terminal.autoApprove" /* TerminalChatAgentToolsSettingId.AutoApprove */, value);
    }
    function setAutoApproveWithCommandLine(value) {
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
    function isAutoApproved(commandLine) {
        return commandLineAutoApprover.isCommandAutoApproved(commandLine, shell, os).result === 'approved';
    }
    function isCommandLineAutoApproved(commandLine) {
        return commandLineAutoApprover.isCommandLineAutoApproved(commandLine).result === 'approved';
    }
    suite('autoApprove with allow patterns only', () => {
        test('should auto-approve exact command match', () => {
            setAutoApprove({
                'echo': true
            });
            ok(isAutoApproved('echo'));
        });
        test('should auto-approve command with arguments', () => {
            setAutoApprove({
                'echo': true
            });
            ok(isAutoApproved('echo hello world'));
        });
        test('should not auto-approve when there is no match', () => {
            setAutoApprove({
                'echo': true
            });
            ok(!isAutoApproved('ls'));
        });
        test('should not auto-approve partial command matches', () => {
            setAutoApprove({
                'echo': true
            });
            ok(!isAutoApproved('echotest'));
        });
        test('should handle multiple commands in autoApprove', () => {
            setAutoApprove({
                'echo': true,
                'ls': true,
                'pwd': true
            });
            ok(isAutoApproved('echo'));
            ok(isAutoApproved('ls -la'));
            ok(isAutoApproved('pwd'));
            ok(!isAutoApproved('rm'));
        });
    });
    suite('autoApprove with deny patterns only', () => {
        test('should deny commands in autoApprove', () => {
            setAutoApprove({
                'rm': false,
                'del': false
            });
            ok(!isAutoApproved('rm file.txt'));
            ok(!isAutoApproved('del file.txt'));
        });
        test('should not auto-approve safe commands when no allow patterns are present', () => {
            setAutoApprove({
                'rm': false
            });
            ok(!isAutoApproved('echo hello'));
            ok(!isAutoApproved('ls'));
        });
    });
    suite('autoApprove with mixed allow and deny patterns', () => {
        test('should deny commands set to false even if other commands are set to true', () => {
            setAutoApprove({
                'echo': true,
                'rm': false
            });
            ok(isAutoApproved('echo hello'));
            ok(!isAutoApproved('rm file.txt'));
        });
        test('should auto-approve allow patterns not set to false', () => {
            setAutoApprove({
                'echo': true,
                'ls': true,
                'pwd': true,
                'rm': false,
                'del': false
            });
            ok(isAutoApproved('echo'));
            ok(isAutoApproved('ls'));
            ok(isAutoApproved('pwd'));
            ok(!isAutoApproved('rm'));
            ok(!isAutoApproved('del'));
        });
    });
    suite('regex patterns', () => {
        test('should handle /.*/', () => {
            setAutoApprove({
                '/.*/': true,
            });
            ok(isAutoApproved('echo hello'));
        });
        test('should handle regex patterns in autoApprove', () => {
            setAutoApprove({
                '/^echo/': true,
                '/^ls/': true,
                'pwd': true
            });
            ok(isAutoApproved('echo hello'));
            ok(isAutoApproved('ls -la'));
            ok(isAutoApproved('pwd'));
            ok(!isAutoApproved('rm file'));
        });
        test('should handle regex patterns for deny', () => {
            setAutoApprove({
                'echo': true,
                'rm': true,
                '/^rm\\s+/': false,
                '/^del\\s+/': false
            });
            ok(isAutoApproved('echo hello'));
            ok(isAutoApproved('rm'));
            ok(!isAutoApproved('rm file.txt'));
            ok(!isAutoApproved('del file.txt'));
        });
        test('should handle complex regex patterns', () => {
            setAutoApprove({
                '/^(echo|ls|pwd)\\b/': true,
                '/^git (status|show\\b.*)$/': true,
                '/rm|del|kill/': false
            });
            ok(isAutoApproved('echo test'));
            ok(isAutoApproved('ls -la'));
            ok(isAutoApproved('pwd'));
            ok(isAutoApproved('git status'));
            ok(isAutoApproved('git show'));
            ok(isAutoApproved('git show HEAD'));
            ok(!isAutoApproved('rm file'));
            ok(!isAutoApproved('del file'));
            ok(!isAutoApproved('kill process'));
        });
        suite('flags', () => {
            test('should handle case-insensitive regex patterns with i flag', () => {
                setAutoApprove({
                    '/^echo/i': true,
                    '/^ls/i': true,
                    '/rm|del/i': false
                });
                ok(isAutoApproved('echo hello'));
                ok(isAutoApproved('ECHO hello'));
                ok(isAutoApproved('Echo hello'));
                ok(isAutoApproved('ls -la'));
                ok(isAutoApproved('LS -la'));
                ok(isAutoApproved('Ls -la'));
                ok(!isAutoApproved('rm file'));
                ok(!isAutoApproved('RM file'));
                ok(!isAutoApproved('del file'));
                ok(!isAutoApproved('DEL file'));
            });
            test('should handle multiple regex flags', () => {
                setAutoApprove({
                    '/^git\\s+/gim': true,
                    '/dangerous/gim': false
                });
                ok(isAutoApproved('git status'));
                ok(isAutoApproved('GIT status'));
                ok(isAutoApproved('Git status'));
                ok(!isAutoApproved('dangerous command'));
                ok(!isAutoApproved('DANGEROUS command'));
            });
            test('should handle various regex flags', () => {
                setAutoApprove({
                    '/^echo.*/s': true, // dotall flag
                    '/^git\\s+/i': true, // case-insensitive flag
                    '/rm|del/g': false // global flag
                });
                ok(isAutoApproved('echo hello\nworld'));
                ok(isAutoApproved('git status'));
                ok(isAutoApproved('GIT status'));
                ok(!isAutoApproved('rm file'));
                ok(!isAutoApproved('del file'));
            });
            test('should handle regex patterns without flags', () => {
                setAutoApprove({
                    '/^echo/': true,
                    '/rm|del/': false
                });
                ok(isAutoApproved('echo hello'));
                ok(!isAutoApproved('ECHO hello'), 'Should be case-sensitive without i flag');
                ok(!isAutoApproved('rm file'));
                ok(!isAutoApproved('RM file'), 'Should be case-sensitive without i flag');
            });
        });
    });
    suite('edge cases', () => {
        test('should handle empty autoApprove', () => {
            setAutoApprove({});
            ok(!isAutoApproved('echo hello'));
            ok(!isAutoApproved('ls'));
            ok(!isAutoApproved('rm file'));
        });
        test('should handle empty command strings', () => {
            setAutoApprove({
                'echo': true
            });
            ok(!isAutoApproved(''));
            ok(!isAutoApproved('   '));
        });
        test('should handle whitespace in commands', () => {
            setAutoApprove({
                'echo': true
            });
            ok(isAutoApproved('echo   hello   world'));
        });
        test('should be case-sensitive by default', () => {
            setAutoApprove({
                'echo': true
            });
            ok(isAutoApproved('echo hello'));
            ok(!isAutoApproved('ECHO hello'));
            ok(!isAutoApproved('Echo hello'));
        });
        // https://github.com/microsoft/vscode/issues/252411
        test('should handle string-based values with special regex characters', () => {
            setAutoApprove({
                'pwsh.exe -File D:\\foo.bar\\a-script.ps1': true
            });
            ok(isAutoApproved('pwsh.exe -File D:\\foo.bar\\a-script.ps1'));
            ok(isAutoApproved('pwsh.exe -File D:\\foo.bar\\a-script.ps1 -AnotherArg'));
        });
        test('should ignore the empty string key', () => {
            setAutoApprove({
                '': true
            });
            ok(!isAutoApproved('echo hello'));
        });
        test('should handle empty regex patterns that could cause endless loops', () => {
            setAutoApprove({
                '//': true,
                '/(?:)/': true,
                '/*/': true, // Invalid regex pattern
                '/.**/': true // Invalid regex pattern
            });
            // These patterns should not cause endless loops and should not match any commands
            // Invalid patterns should be handled gracefully and not match anything
            ok(!isAutoApproved('echo hello'));
            ok(!isAutoApproved('ls'));
            ok(!isAutoApproved(''));
        });
        test('should handle regex patterns that would cause endless loops', () => {
            setAutoApprove({
                '/a*/': true,
                '/b?/': true,
                '/(x|)*/': true,
                '/(?:)*/': true
            });
            // Commands should still work normally, endless loop patterns should be safely handled
            ok(!isAutoApproved('echo hello'));
            ok(!isAutoApproved('ls'));
            ok(!isAutoApproved('a'));
            ok(!isAutoApproved('b'));
        });
        test('should handle mixed valid and problematic regex patterns', () => {
            setAutoApprove({
                '/^echo/': true, // Valid pattern
                '//': true, // Empty pattern
                '/^ls/': true, // Valid pattern
                '/a*/': true, // Potential endless loop
                'pwd': true // Valid string pattern
            });
            ok(isAutoApproved('echo hello'));
            ok(isAutoApproved('ls -la'));
            ok(isAutoApproved('pwd'));
            ok(!isAutoApproved('rm file'));
        });
        test('should handle invalid regex patterns gracefully', () => {
            setAutoApprove({
                '/*/': true, // Invalid regex - nothing to repeat
                '/(?:+/': true, // Invalid regex - incomplete quantifier
                '/[/': true, // Invalid regex - unclosed character class
                '/^echo/': true, // Valid pattern
                'ls': true // Valid string pattern
            });
            // Valid patterns should still work
            ok(isAutoApproved('echo hello'));
            ok(isAutoApproved('ls -la'));
            // Invalid patterns should not match anything and not cause crashes
            ok(!isAutoApproved('random command'));
        });
    });
    suite('path-aware auto approval', () => {
        test('should handle path variations with forward slashes', () => {
            setAutoApprove({
                'bin/foo': true
            });
            // Should approve the exact match
            ok(isAutoApproved('bin/foo'));
            ok(isAutoApproved('bin/foo --arg'));
            // Should approve with Windows backslashes
            ok(isAutoApproved('bin\\foo'));
            ok(isAutoApproved('bin\\foo --arg'));
            // Should approve with current directory prefixes
            ok(isAutoApproved('./bin/foo'));
            ok(isAutoApproved('.\\bin/foo'));
            ok(isAutoApproved('./bin\\foo'));
            ok(isAutoApproved('.\\bin\\foo'));
            // Should not approve partial matches
            ok(!isAutoApproved('bin/foobar'));
            ok(!isAutoApproved('notbin/foo'));
        });
        test('should handle path variations with backslashes', () => {
            setAutoApprove({
                'bin\\script.bat': true
            });
            // Should approve the exact match
            ok(isAutoApproved('bin\\script.bat'));
            ok(isAutoApproved('bin\\script.bat --help'));
            // Should approve with forward slashes
            ok(isAutoApproved('bin/script.bat'));
            ok(isAutoApproved('bin/script.bat --help'));
            // Should approve with current directory prefixes
            ok(isAutoApproved('./bin\\script.bat'));
            ok(isAutoApproved('.\\bin\\script.bat'));
            ok(isAutoApproved('./bin/script.bat'));
            ok(isAutoApproved('.\\bin/script.bat'));
        });
        test('should handle deep paths', () => {
            setAutoApprove({
                'src/utils/helper.js': true
            });
            ok(isAutoApproved('src/utils/helper.js'));
            ok(isAutoApproved('src\\utils\\helper.js'));
            ok(isAutoApproved('src/utils\\helper.js'));
            ok(isAutoApproved('src\\utils/helper.js'));
            ok(isAutoApproved('./src/utils/helper.js'));
            ok(isAutoApproved('.\\src\\utils\\helper.js'));
        });
        test('should not treat non-paths as paths', () => {
            setAutoApprove({
                'echo': true, // Not a path
                'ls': true, // Not a path
                'git': true // Not a path
            });
            // These should work as normal command matching, not path matching
            ok(isAutoApproved('echo'));
            ok(isAutoApproved('ls'));
            ok(isAutoApproved('git'));
            // Should not be treated as paths, so these prefixes shouldn't work
            ok(!isAutoApproved('./echo'));
            ok(!isAutoApproved('.\\ls'));
        });
        test('should handle paths with mixed separators in config', () => {
            setAutoApprove({
                'bin/foo\\bar': true // Mixed separators in config
            });
            ok(isAutoApproved('bin/foo\\bar'));
            ok(isAutoApproved('bin\\foo/bar'));
            ok(isAutoApproved('bin/foo/bar'));
            ok(isAutoApproved('bin\\foo\\bar'));
            ok(isAutoApproved('./bin/foo\\bar'));
            ok(isAutoApproved('.\\bin\\foo\\bar'));
        });
        test('should work with command line auto approval for paths', () => {
            setAutoApproveWithCommandLine({
                'bin/deploy': { approve: true, matchCommandLine: true }
            });
            ok(isCommandLineAutoApproved('bin/deploy --prod'));
            ok(isCommandLineAutoApproved('bin\\deploy --prod'));
            ok(isCommandLineAutoApproved('./bin/deploy --prod'));
            ok(isCommandLineAutoApproved('.\\bin\\deploy --prod'));
        });
        test('should handle special characters in paths', () => {
            setAutoApprove({
                'bin/my-script.sh': true,
                'scripts/build_all.py': true,
                'tools/run (debug).exe': true
            });
            ok(isAutoApproved('bin/my-script.sh'));
            ok(isAutoApproved('bin\\my-script.sh'));
            ok(isAutoApproved('./bin/my-script.sh'));
            ok(isAutoApproved('scripts/build_all.py'));
            ok(isAutoApproved('scripts\\build_all.py'));
            ok(isAutoApproved('tools/run (debug).exe'));
            ok(isAutoApproved('tools\\run (debug).exe'));
        });
    });
    suite('PowerShell-specific commands', () => {
        setup(() => {
            shell = 'pwsh';
        });
        test('should handle Windows PowerShell commands', () => {
            setAutoApprove({
                'Get-ChildItem': true,
                'Get-Content': true,
                'Get-Location': true,
                'Remove-Item': false,
                'del': false
            });
            ok(isAutoApproved('Get-ChildItem'));
            ok(isAutoApproved('Get-Content file.txt'));
            ok(isAutoApproved('Get-Location'));
            ok(!isAutoApproved('Remove-Item file.txt'));
        });
        test('should handle ( prefixes', () => {
            setAutoApprove({
                'Get-Content': true
            });
            ok(isAutoApproved('Get-Content file.txt'));
            ok(isAutoApproved('(Get-Content file.txt'));
            ok(!isAutoApproved('[Get-Content'));
            ok(!isAutoApproved('foo'));
        });
        test('should be case-insensitive for PowerShell commands', () => {
            setAutoApprove({
                'Get-ChildItem': true,
                'Get-Content': true,
                'Remove-Item': false
            });
            ok(isAutoApproved('Get-ChildItem'));
            ok(isAutoApproved('get-childitem'));
            ok(isAutoApproved('GET-CHILDITEM'));
            ok(isAutoApproved('Get-childitem'));
            ok(isAutoApproved('get-ChildItem'));
            ok(isAutoApproved('Get-Content file.txt'));
            ok(isAutoApproved('get-content file.txt'));
            ok(isAutoApproved('GET-CONTENT file.txt'));
            ok(isAutoApproved('Get-content file.txt'));
            ok(!isAutoApproved('Remove-Item file.txt'));
            ok(!isAutoApproved('remove-item file.txt'));
            ok(!isAutoApproved('REMOVE-ITEM file.txt'));
            ok(!isAutoApproved('Remove-item file.txt'));
        });
        test('should be case-insensitive for PowerShell aliases', () => {
            setAutoApprove({
                'ls': true,
                'dir': true,
                'rm': false,
                'del': false
            });
            // Test case-insensitive matching for aliases
            ok(isAutoApproved('ls'));
            ok(isAutoApproved('LS'));
            ok(isAutoApproved('Ls'));
            ok(isAutoApproved('dir'));
            ok(isAutoApproved('DIR'));
            ok(isAutoApproved('Dir'));
            ok(!isAutoApproved('rm file.txt'));
            ok(!isAutoApproved('RM file.txt'));
            ok(!isAutoApproved('Rm file.txt'));
            ok(!isAutoApproved('del file.txt'));
            ok(!isAutoApproved('DEL file.txt'));
            ok(!isAutoApproved('Del file.txt'));
        });
        test('should be case-insensitive with regex patterns', () => {
            setAutoApprove({
                '/^Get-/': true,
                '/Remove-Item|rm/': false
            });
            ok(isAutoApproved('Get-ChildItem'));
            ok(isAutoApproved('get-childitem'));
            ok(isAutoApproved('GET-PROCESS'));
            ok(isAutoApproved('Get-Location'));
            ok(!isAutoApproved('Remove-Item file.txt'));
            ok(!isAutoApproved('remove-item file.txt'));
            ok(!isAutoApproved('rm file.txt'));
            ok(!isAutoApproved('RM file.txt'));
        });
        test('should handle case-insensitive PowerShell commands on different OS', () => {
            setAutoApprove({
                'Get-Process': true,
                'Stop-Process': false
            });
            for (const currnetOS of [1 /* OperatingSystem.Windows */, 3 /* OperatingSystem.Linux */, 2 /* OperatingSystem.Macintosh */]) {
                os = currnetOS;
                ok(isAutoApproved('Get-Process'), `os=${os}`);
                ok(isAutoApproved('get-process'), `os=${os}`);
                ok(isAutoApproved('GET-PROCESS'), `os=${os}`);
                ok(!isAutoApproved('Stop-Process'), `os=${os}`);
                ok(!isAutoApproved('stop-process'), `os=${os}`);
            }
        });
    });
    suite('isCommandLineAutoApproved - matchCommandLine functionality', () => {
        test('should auto-approve command line patterns with matchCommandLine: true', () => {
            setAutoApproveWithCommandLine({
                'echo': { approve: true, matchCommandLine: true }
            });
            ok(isCommandLineAutoApproved('echo hello'));
            ok(isCommandLineAutoApproved('echo test && ls'));
        });
        test('should not auto-approve regular patterns with isCommandLineAutoApproved', () => {
            setAutoApprove({
                'echo': true
            });
            // Regular patterns should not be matched by isCommandLineAutoApproved
            ok(!isCommandLineAutoApproved('echo hello'));
        });
        test('should handle regex patterns with matchCommandLine: true', () => {
            setAutoApproveWithCommandLine({
                '/echo.*world/': { approve: true, matchCommandLine: true }
            });
            ok(isCommandLineAutoApproved('echo hello world'));
            ok(!isCommandLineAutoApproved('echo hello'));
        });
        test('should handle case-insensitive regex with matchCommandLine: true', () => {
            setAutoApproveWithCommandLine({
                '/echo/i': { approve: true, matchCommandLine: true }
            });
            ok(isCommandLineAutoApproved('echo hello'));
            ok(isCommandLineAutoApproved('ECHO hello'));
            ok(isCommandLineAutoApproved('Echo hello'));
        });
        test('should handle complex command line patterns', () => {
            setAutoApproveWithCommandLine({
                '/^npm run build/': { approve: true, matchCommandLine: true },
                '/\.ps1/i': { approve: true, matchCommandLine: true }
            });
            ok(isCommandLineAutoApproved('npm run build --production'));
            ok(isCommandLineAutoApproved('powershell -File script.ps1'));
            ok(isCommandLineAutoApproved('pwsh -File SCRIPT.PS1'));
            ok(!isCommandLineAutoApproved('npm install'));
        });
        test('should return false for empty command line', () => {
            setAutoApproveWithCommandLine({
                'echo': { approve: true, matchCommandLine: true }
            });
            ok(!isCommandLineAutoApproved(''));
            ok(!isCommandLineAutoApproved('   '));
        });
        test('should handle mixed configuration with matchCommandLine entries', () => {
            setAutoApproveWithCommandLine({
                'echo': true, // Regular pattern
                'ls': { approve: true, matchCommandLine: true }, // Command line pattern
                'rm': { approve: true, matchCommandLine: false } // Explicit regular pattern
            });
            // Only the matchCommandLine: true entry should work with isCommandLineAutoApproved
            ok(isCommandLineAutoApproved('ls -la'));
            ok(!isCommandLineAutoApproved('echo hello'));
            ok(!isCommandLineAutoApproved('rm file.txt'));
        });
        test('should handle deny patterns with matchCommandLine: true', () => {
            setAutoApproveWithCommandLine({
                'echo': { approve: true, matchCommandLine: true },
                '/dangerous/': { approve: false, matchCommandLine: true }
            });
            ok(isCommandLineAutoApproved('echo hello'));
            ok(!isCommandLineAutoApproved('echo dangerous command'));
            ok(!isCommandLineAutoApproved('dangerous operation'));
        });
        test('should prioritize deny list over allow list for command line patterns', () => {
            setAutoApproveWithCommandLine({
                '/echo/': { approve: true, matchCommandLine: true },
                '/echo.*dangerous/': { approve: false, matchCommandLine: true }
            });
            ok(isCommandLineAutoApproved('echo hello'));
            ok(!isCommandLineAutoApproved('echo dangerous command'));
        });
        test('should handle complex deny patterns with matchCommandLine', () => {
            setAutoApproveWithCommandLine({
                'npm': { approve: true, matchCommandLine: true },
                '/npm.*--force/': { approve: false, matchCommandLine: true },
                '/\.ps1.*-ExecutionPolicy/i': { approve: false, matchCommandLine: true }
            });
            ok(isCommandLineAutoApproved('npm install'));
            ok(isCommandLineAutoApproved('npm run build'));
            ok(!isCommandLineAutoApproved('npm install --force'));
            ok(!isCommandLineAutoApproved('powershell -File script.ps1 -ExecutionPolicy Bypass'));
        });
        test('should handle empty regex patterns with matchCommandLine that could cause endless loops', () => {
            setAutoApproveWithCommandLine({
                '//': { approve: true, matchCommandLine: true },
                '/(?:)/': { approve: true, matchCommandLine: true },
                '/*/': { approve: true, matchCommandLine: true }, // Invalid regex pattern
                '/.**/': { approve: true, matchCommandLine: true } // Invalid regex pattern
            });
            // These patterns should not cause endless loops and should not match any commands
            // Invalid patterns should be handled gracefully and not match anything
            ok(!isCommandLineAutoApproved('echo hello'));
            ok(!isCommandLineAutoApproved('ls'));
            ok(!isCommandLineAutoApproved(''));
        });
        test('should handle regex patterns with matchCommandLine that would cause endless loops', () => {
            setAutoApproveWithCommandLine({
                '/a*/': { approve: true, matchCommandLine: true },
                '/b?/': { approve: true, matchCommandLine: true },
                '/(x|)*/': { approve: true, matchCommandLine: true },
                '/(?:)*/': { approve: true, matchCommandLine: true }
            });
            // Commands should still work normally, endless loop patterns should be safely handled
            ok(!isCommandLineAutoApproved('echo hello'));
            ok(!isCommandLineAutoApproved('ls'));
            ok(!isCommandLineAutoApproved('a'));
            ok(!isCommandLineAutoApproved('b'));
        });
        test('should handle mixed valid and problematic regex patterns with matchCommandLine', () => {
            setAutoApproveWithCommandLine({
                '/^echo/': { approve: true, matchCommandLine: true }, // Valid pattern
                '//': { approve: true, matchCommandLine: true }, // Empty pattern
                '/^ls/': { approve: true, matchCommandLine: true }, // Valid pattern
                '/a*/': { approve: true, matchCommandLine: true }, // Potential endless loop
                'pwd': { approve: true, matchCommandLine: true } // Valid string pattern
            });
            ok(isCommandLineAutoApproved('echo hello'));
            ok(isCommandLineAutoApproved('ls -la'));
            ok(isCommandLineAutoApproved('pwd'));
            ok(!isCommandLineAutoApproved('rm file'));
        });
        test('should handle invalid regex patterns with matchCommandLine gracefully', () => {
            setAutoApproveWithCommandLine({
                '/*/': { approve: true, matchCommandLine: true }, // Invalid regex - nothing to repeat
                '/(?:+/': { approve: true, matchCommandLine: true }, // Invalid regex - incomplete quantifier
                '/[/': { approve: true, matchCommandLine: true }, // Invalid regex - unclosed character class
                '/^echo/': { approve: true, matchCommandLine: true }, // Valid pattern
                'ls': { approve: true, matchCommandLine: true } // Valid string pattern
            });
            // Valid patterns should still work
            ok(isCommandLineAutoApproved('echo hello'));
            ok(isCommandLineAutoApproved('ls -la'));
            // Invalid patterns should not match anything and not cause crashes
            ok(!isCommandLineAutoApproved('random command'));
        });
    });
    suite('reasons', () => {
        function getCommandReason(command) {
            return commandLineAutoApprover.isCommandAutoApproved(command, shell, os).reason;
        }
        function getCommandLineReason(commandLine) {
            return commandLineAutoApprover.isCommandLineAutoApproved(commandLine).reason;
        }
        suite('command', () => {
            test('approved', () => {
                setAutoApprove({ echo: true });
                strictEqual(getCommandReason('echo hello'), `Command 'echo hello' is approved by allow list rule: echo`);
            });
            test('not approved', () => {
                setAutoApprove({ echo: false });
                strictEqual(getCommandReason('echo hello'), `Command 'echo hello' is denied by deny list rule: echo`);
            });
            test('no match', () => {
                setAutoApprove({});
                strictEqual(getCommandReason('echo hello'), `Command 'echo hello' has no matching auto approve entries`);
            });
        });
        suite('command line', () => {
            test('approved', () => {
                setAutoApproveWithCommandLine({ echo: { approve: true, matchCommandLine: true } });
                strictEqual(getCommandLineReason('echo hello'), `Command line 'echo hello' is approved by allow list rule: echo`);
            });
            test('not approved', () => {
                setAutoApproveWithCommandLine({ echo: { approve: false, matchCommandLine: true } });
                strictEqual(getCommandLineReason('echo hello'), `Command line 'echo hello' is denied by deny list rule: echo`);
            });
            test('no match', () => {
                setAutoApproveWithCommandLine({});
                strictEqual(getCommandLineReason('echo hello'), `Command line 'echo hello' has no matching auto approve entries`);
            });
        });
    });
    suite('isDefaultRule logic', () => {
        function getIsDefaultRule(command) {
            return commandLineAutoApprover.isCommandAutoApproved(command, shell, os).rule?.isDefaultRule;
        }
        function getCommandLineIsDefaultRule(commandLine) {
            return commandLineAutoApprover.isCommandLineAutoApproved(commandLine).rule?.isDefaultRule;
        }
        function setAutoApproveWithDefaults(userConfig, defaultConfig) {
            // Set up mock configuration with default values
            configurationService.setUserConfiguration("chat.tools.terminal.autoApprove" /* TerminalChatAgentToolsSettingId.AutoApprove */, userConfig);
            // Mock the inspect method to return default values
            const originalInspect = configurationService.inspect;
            const originalGetValue = configurationService.getValue;
            configurationService.inspect = (key) => {
                if (key === "chat.tools.terminal.autoApprove" /* TerminalChatAgentToolsSettingId.AutoApprove */) {
                    return {
                        default: { value: defaultConfig },
                        user: { value: userConfig },
                        workspace: undefined,
                        workspaceFolder: undefined,
                        application: undefined,
                        policy: undefined,
                        memory: undefined,
                        value: { ...defaultConfig, ...userConfig }
                    };
                }
                return originalInspect.call(configurationService, key);
            };
            configurationService.getValue = (key) => {
                if (key === "chat.tools.terminal.autoApprove" /* TerminalChatAgentToolsSettingId.AutoApprove */) {
                    return { ...defaultConfig, ...userConfig };
                }
                return originalGetValue.call(configurationService, key);
            };
            // Trigger configuration update
            configurationService.onDidChangeConfigurationEmitter.fire({
                affectsConfiguration: () => true,
                affectedKeys: new Set(["chat.tools.terminal.autoApprove" /* TerminalChatAgentToolsSettingId.AutoApprove */]),
                source: 2 /* ConfigurationTarget.USER */,
                change: null,
            });
        }
        function setAutoApproveWithDefaultsCommandLine(userConfig, defaultConfig) {
            // Set up mock configuration with default values for command line rules
            configurationService.setUserConfiguration("chat.tools.terminal.autoApprove" /* TerminalChatAgentToolsSettingId.AutoApprove */, userConfig);
            // Mock the inspect method to return default values
            const originalInspect = configurationService.inspect;
            const originalGetValue = configurationService.getValue;
            configurationService.inspect = (key) => {
                if (key === "chat.tools.terminal.autoApprove" /* TerminalChatAgentToolsSettingId.AutoApprove */) {
                    return {
                        default: { value: defaultConfig },
                        user: { value: userConfig },
                        workspace: undefined,
                        workspaceFolder: undefined,
                        application: undefined,
                        policy: undefined,
                        memory: undefined,
                        value: { ...defaultConfig, ...userConfig }
                    };
                }
                return originalInspect.call(configurationService, key);
            };
            configurationService.getValue = (key) => {
                if (key === "chat.tools.terminal.autoApprove" /* TerminalChatAgentToolsSettingId.AutoApprove */) {
                    return { ...defaultConfig, ...userConfig };
                }
                return originalGetValue.call(configurationService, key);
            };
            // Trigger configuration update
            configurationService.onDidChangeConfigurationEmitter.fire({
                affectsConfiguration: () => true,
                affectedKeys: new Set(["chat.tools.terminal.autoApprove" /* TerminalChatAgentToolsSettingId.AutoApprove */]),
                source: 2 /* ConfigurationTarget.USER */,
                change: null,
            });
        }
        test('should correctly identify default rules vs user-defined rules', () => {
            setAutoApproveWithDefaults({ 'echo': true, 'ls': true, 'pwd': false }, { 'echo': true, 'cat': true });
            strictEqual(getIsDefaultRule('echo hello'), true, 'echo is in both default and user config with same value - should be marked as default');
            strictEqual(getIsDefaultRule('ls -la'), false, 'ls is only in user config - should be marked as user-defined');
            strictEqual(getIsDefaultRule('pwd'), false, 'pwd is only in user config - should be marked as user-defined');
            strictEqual(getIsDefaultRule('cat file.txt'), true, 'cat is in both default and user config with same value - should be marked as default');
        });
        test('should mark as default when command is only in default config but not in user config', () => {
            setAutoApproveWithDefaults({ 'echo': true, 'ls': true }, // User config (cat is NOT here)
            { 'echo': true, 'cat': true } // Default config (cat IS here)
            );
            // Test that merged config includes all commands
            strictEqual(commandLineAutoApprover.isCommandAutoApproved('echo', shell, os).result, 'approved', 'echo should be approved');
            strictEqual(commandLineAutoApprover.isCommandAutoApproved('ls', shell, os).result, 'approved', 'ls should be approved');
            // cat should be approved because it's in the merged config
            const catResult = commandLineAutoApprover.isCommandAutoApproved('cat', shell, os);
            strictEqual(catResult.result, 'approved', 'cat should be approved from default config');
            // cat should be marked as default rule since it comes from default config only
            strictEqual(catResult.rule?.isDefaultRule, true, 'cat is only in default config, not in user config - should be marked as default');
        });
        test('should handle default rules with different values', () => {
            setAutoApproveWithDefaults({ 'echo': true, 'rm': true }, { 'echo': false, 'rm': true });
            strictEqual(getIsDefaultRule('echo hello'), false, 'echo has different values in default vs user - should be marked as user-defined');
            strictEqual(getIsDefaultRule('rm file.txt'), true, 'rm has same value in both - should be marked as default');
        });
        test('should handle regex patterns as default rules', () => {
            setAutoApproveWithDefaults({ '/^git/': true, '/^npm/': false }, { '/^git/': true, '/^docker/': true });
            strictEqual(getIsDefaultRule('git status'), true, 'git pattern matches default - should be marked as default');
            strictEqual(getIsDefaultRule('npm install'), false, 'npm pattern is user-only - should be marked as user-defined');
        });
        test('should handle mixed string and regex patterns', () => {
            setAutoApproveWithDefaults({ 'echo': true, '/^ls/': false }, { 'echo': true, 'cat': true });
            strictEqual(getIsDefaultRule('echo hello'), true, 'String pattern matching default');
            strictEqual(getIsDefaultRule('ls -la'), false, 'Regex pattern user-defined');
        });
        test('should handle command line rules with isDefaultRule', () => {
            setAutoApproveWithDefaultsCommandLine({
                'echo': { approve: true, matchCommandLine: true },
                'ls': { approve: false, matchCommandLine: true }
            }, {
                'echo': { approve: true, matchCommandLine: true },
                'cat': { approve: true, matchCommandLine: true }
            });
            strictEqual(getCommandLineIsDefaultRule('echo hello world'), true, 'echo matches default config exactly using structural equality - should be marked as default');
            strictEqual(getCommandLineIsDefaultRule('ls -la'), false, 'ls is user-defined only - should be marked as user-defined');
        });
        test('should handle command line rules with different matchCommandLine values', () => {
            setAutoApproveWithDefaultsCommandLine({
                'echo': { approve: true, matchCommandLine: true },
                'ls': { approve: true, matchCommandLine: false }
            }, {
                'echo': { approve: true, matchCommandLine: false },
                'ls': { approve: true, matchCommandLine: false }
            });
            strictEqual(getCommandLineIsDefaultRule('echo hello'), false, 'echo has different matchCommandLine value - should be user-defined');
            strictEqual(getCommandLineIsDefaultRule('ls -la'), undefined, 'ls matches exactly - should be default (but won\'t match command line check since matchCommandLine is false)');
        });
        test('should handle boolean vs object format consistency', () => {
            setAutoApproveWithDefaultsCommandLine({
                'echo': true,
                'ls': { approve: true, matchCommandLine: true }
            }, {
                'echo': true,
                'ls': { approve: true, matchCommandLine: true }
            });
            strictEqual(getIsDefaultRule('echo hello'), true, 'Boolean format matching - should be default');
            strictEqual(getCommandLineIsDefaultRule('ls -la'), true, 'Object format matching using structural equality - should be default');
        });
        test('should return undefined for noMatch cases', () => {
            setAutoApproveWithDefaults({ 'echo': true }, { 'cat': true });
            strictEqual(getIsDefaultRule('unknown-command'), undefined, 'Command that matches neither user nor default config');
            strictEqual(getCommandLineIsDefaultRule('unknown-command'), undefined, 'Command that matches neither user nor default config');
        });
        test('should handle empty configurations', () => {
            setAutoApproveWithDefaults({}, {});
            strictEqual(getIsDefaultRule('echo hello'), undefined);
            strictEqual(getCommandLineIsDefaultRule('echo hello'), undefined);
        });
        test('should handle only default config with no user overrides', () => {
            setAutoApproveWithDefaults({}, { 'echo': true, 'ls': false });
            strictEqual(getIsDefaultRule('echo hello'), true, 'Commands in default config should be marked as default rules even with empty user config');
            strictEqual(getIsDefaultRule('ls -la'), true, 'Commands in default config should be marked as default rules even with empty user config');
        });
        test('should handle complex nested object rules', () => {
            setAutoApproveWithDefaultsCommandLine({
                'npm': { approve: true, matchCommandLine: true },
                'git': { approve: false, matchCommandLine: false }
            }, {
                'npm': { approve: true, matchCommandLine: true },
                'docker': { approve: true, matchCommandLine: true }
            });
            strictEqual(getCommandLineIsDefaultRule('npm install'), true, 'npm matches default exactly using structural equality - should be default');
            strictEqual(getCommandLineIsDefaultRule('git status'), undefined, 'git is user-defined - should be user-defined (but won\'t match command line since matchCommandLine is false)');
        });
        test('should handle PowerShell case-insensitive matching with defaults', () => {
            shell = 'pwsh';
            os = 1 /* OperatingSystem.Windows */;
            setAutoApproveWithDefaults({ 'Get-Process': true }, { 'Get-Process': true });
            strictEqual(getIsDefaultRule('Get-Process'), true, 'Case-insensitive PowerShell command matching default');
            strictEqual(getIsDefaultRule('get-process'), true, 'Case-insensitive PowerShell command matching default');
            strictEqual(getIsDefaultRule('GET-PROCESS'), true, 'Case-insensitive PowerShell command matching default');
        });
        test('should use structural equality for object comparison', () => {
            // Test that objects with same content but different instances are treated as equal
            const userConfig = { 'test': { approve: true, matchCommandLine: true } };
            const defaultConfig = { 'test': { approve: true, matchCommandLine: true } };
            setAutoApproveWithDefaultsCommandLine(userConfig, defaultConfig);
            strictEqual(getCommandLineIsDefaultRule('test command'), true, 'Even though userConfig and defaultConfig are different object instances, they have the same structure and values, so should be considered default');
        });
        test('should detect structural differences in objects', () => {
            const userConfig = { 'test': { approve: true, matchCommandLine: true } };
            const defaultConfig = { 'test': { approve: true, matchCommandLine: false } };
            setAutoApproveWithDefaultsCommandLine(userConfig, defaultConfig);
            strictEqual(getCommandLineIsDefaultRule('test command'), false, 'Objects have different matchCommandLine values, so should be user-defined');
        });
        test('should handle mixed types correctly', () => {
            const userConfig = {
                'cmd1': true,
                'cmd2': { approve: false, matchCommandLine: true }
            };
            const defaultConfig = {
                'cmd1': true,
                'cmd2': { approve: false, matchCommandLine: true }
            };
            setAutoApproveWithDefaultsCommandLine(userConfig, defaultConfig);
            strictEqual(getIsDefaultRule('cmd1 arg'), true, 'Boolean type should match default');
            strictEqual(getCommandLineIsDefaultRule('cmd2 arg'), true, 'Object type should match default using structural equality (even though it\'s a deny rule)');
        });
    });
    suite('ignoreDefaultAutoApproveRules', () => {
        function setAutoApproveWithDefaults(userConfig, defaultConfig) {
            // Set up mock configuration with default values
            configurationService.setUserConfiguration("chat.tools.terminal.autoApprove" /* TerminalChatAgentToolsSettingId.AutoApprove */, userConfig);
            // Mock the inspect method to return default values
            const originalInspect = configurationService.inspect;
            const originalGetValue = configurationService.getValue;
            configurationService.inspect = (key) => {
                if (key === "chat.tools.terminal.autoApprove" /* TerminalChatAgentToolsSettingId.AutoApprove */) {
                    return {
                        default: { value: defaultConfig },
                        user: { value: userConfig },
                        workspace: undefined,
                        workspaceFolder: undefined,
                        application: undefined,
                        policy: undefined,
                        memory: undefined,
                        value: { ...defaultConfig, ...userConfig }
                    };
                }
                return originalInspect.call(configurationService, key);
            };
            configurationService.getValue = (key) => {
                if (key === "chat.tools.terminal.autoApprove" /* TerminalChatAgentToolsSettingId.AutoApprove */) {
                    return { ...defaultConfig, ...userConfig };
                }
                return originalGetValue.call(configurationService, key);
            };
            // Trigger configuration update
            configurationService.onDidChangeConfigurationEmitter.fire({
                affectsConfiguration: () => true,
                affectedKeys: new Set(["chat.tools.terminal.autoApprove" /* TerminalChatAgentToolsSettingId.AutoApprove */]),
                source: 2 /* ConfigurationTarget.USER */,
                change: null,
            });
        }
        function setIgnoreDefaultAutoApproveRules(value) {
            setConfig("chat.tools.terminal.ignoreDefaultAutoApproveRules" /* TerminalChatAgentToolsSettingId.IgnoreDefaultAutoApproveRules */, value);
        }
        test('should include default rules when ignoreDefaultAutoApproveRules is false (default behavior)', () => {
            setAutoApproveWithDefaults({ 'ls': true }, { 'echo': true, 'cat': true });
            setIgnoreDefaultAutoApproveRules(false);
            ok(isAutoApproved('ls -la'), 'User-defined rule should work');
            ok(isAutoApproved('echo hello'), 'Default rule should work when not ignored');
            ok(isAutoApproved('cat file.txt'), 'Default rule should work when not ignored');
        });
        test('should exclude default rules when ignoreDefaultAutoApproveRules is true', () => {
            setAutoApproveWithDefaults({ 'ls': true }, { 'echo': true, 'cat': true });
            setIgnoreDefaultAutoApproveRules(true);
            ok(isAutoApproved('ls -la'), 'User-defined rule should still work');
            ok(!isAutoApproved('echo hello'), 'Default rule should be ignored');
            ok(!isAutoApproved('cat file.txt'), 'Default rule should be ignored');
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZExpbmVBdXRvQXBwcm92ZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvcG9yaWRoaS9kZXZlbG9wbWVudC9wdWt1LXZzLWVkaXRvci9zcmMvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9jaGF0QWdlbnRUb29scy90ZXN0L2Jyb3dzZXIvY29tbWFuZExpbmVBdXRvQXBwcm92ZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUN0RyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxrRkFBa0YsQ0FBQztBQUU1SCxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUVyRyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUVuRixPQUFPLEVBQUUsRUFBRSxFQUFFLFdBQVcsRUFBRSxNQUFNLFFBQVEsQ0FBQztBQUV6QyxLQUFLLENBQUMseUJBQXlCLEVBQUUsR0FBRyxFQUFFO0lBQ3JDLE1BQU0sS0FBSyxHQUFHLHVDQUF1QyxFQUFFLENBQUM7SUFFeEQsSUFBSSxvQkFBMkMsQ0FBQztJQUNoRCxJQUFJLG9CQUE4QyxDQUFDO0lBRW5ELElBQUksdUJBQWdELENBQUM7SUFDckQsSUFBSSxLQUFhLENBQUM7SUFDbEIsSUFBSSxFQUFtQixDQUFDO0lBRXhCLEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixvQkFBb0IsR0FBRyxJQUFJLHdCQUF3QixFQUFFLENBQUM7UUFDdEQsb0JBQW9CLEdBQUcsNkJBQTZCLENBQUM7WUFDcEQsb0JBQW9CLEVBQUUsR0FBRyxFQUFFLENBQUMsb0JBQW9CO1NBQ2hELEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFVixLQUFLLEdBQUcsTUFBTSxDQUFDO1FBQ2YsRUFBRSxnQ0FB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