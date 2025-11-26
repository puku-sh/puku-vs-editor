/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../../../../../base/common/lifecycle.js';
import { isPowerShell } from '../../runInTerminalHelpers.js';
export class CommandLineCdPrefixRewriter extends Disposable {
    rewrite(options) {
        if (!options.cwd) {
            return undefined;
        }
        const isPwsh = isPowerShell(options.shell, options.os);
        // Re-write the command if it starts with `cd <dir> && <suffix>` or `cd <dir>; <suffix>`
        // to just `<suffix>` if the directory matches the current terminal's cwd. This simplifies
        // the result in the chat by removing redundancies that some models like to add.
        const cdPrefixMatch = options.commandLine.match(isPwsh
            ? /^(?:cd(?: \/d)?|Set-Location(?: -Path)?) (?<dir>[^\s]+) ?(?:&&|;)\s+(?<suffix>.+)$/i
            : /^cd (?<dir>[^\s]+) &&\s+(?<suffix>.+)$/);
        const cdDir = cdPrefixMatch?.groups?.dir;
        const cdSuffix = cdPrefixMatch?.groups?.suffix;
        if (cdDir && cdSuffix) {
            // Remove any surrounding quotes
            let cdDirPath = cdDir;
            if (cdDirPath.startsWith('"') && cdDirPath.endsWith('"')) {
                cdDirPath = cdDirPath.slice(1, -1);
            }
            // Normalize trailing slashes
            cdDirPath = cdDirPath.replace(/(?:[\\\/])$/, '');
            let cwdFsPath = options.cwd.fsPath.replace(/(?:[\\\/])$/, '');
            // Case-insensitive comparison on Windows
            if (options.os === 1 /* OperatingSystem.Windows */) {
                cdDirPath = cdDirPath.toLowerCase();
                cwdFsPath = cwdFsPath.toLowerCase();
            }
            if (cdDirPath === cwdFsPath) {
                return { rewritten: cdSuffix, reasoning: 'Removed redundant cd command' };
            }
        }
        return undefined;
    }
}
//# sourceMappingURL=commandLineCdPrefixRewriter.js.map