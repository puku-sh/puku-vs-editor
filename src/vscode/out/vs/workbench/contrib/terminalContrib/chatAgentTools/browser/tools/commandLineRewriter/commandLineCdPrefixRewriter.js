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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZExpbmVDZFByZWZpeFJld3JpdGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FoYW1lZC9EZXNrdG9wL3B1a3UtdnMtZWRpdG9yL3B1a3UtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2NoYXRBZ2VudFRvb2xzL2Jyb3dzZXIvdG9vbHMvY29tbWFuZExpbmVSZXdyaXRlci9jb21tYW5kTGluZUNkUHJlZml4UmV3cml0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBRTNFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUc3RCxNQUFNLE9BQU8sMkJBQTRCLFNBQVEsVUFBVTtJQUMxRCxPQUFPLENBQUMsT0FBb0M7UUFDM0MsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUNsQixPQUFPLFNBQVMsQ0FBQztRQUNsQixDQUFDO1FBRUQsTUFBTSxNQUFNLEdBQUcsWUFBWSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBRXZELHdGQUF3RjtRQUN4RiwwRkFBMEY7UUFDMUYsZ0ZBQWdGO1FBQ2hGLE1BQU0sYUFBYSxHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUM5QyxNQUFNO1lBQ0wsQ0FBQyxDQUFDLHFGQUFxRjtZQUN2RixDQUFDLENBQUMsd0NBQXdDLENBQzNDLENBQUM7UUFDRixNQUFNLEtBQUssR0FBRyxhQUFhLEVBQUUsTUFBTSxFQUFFLEdBQUcsQ0FBQztRQUN6QyxNQUFNLFFBQVEsR0FBRyxhQUFhLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQztRQUMvQyxJQUFJLEtBQUssSUFBSSxRQUFRLEVBQUUsQ0FBQztZQUN2QixnQ0FBZ0M7WUFDaEMsSUFBSSxTQUFTLEdBQUcsS0FBSyxDQUFDO1lBQ3RCLElBQUksU0FBUyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxTQUFTLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQzFELFNBQVMsR0FBRyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3BDLENBQUM7WUFDRCw2QkFBNkI7WUFDN0IsU0FBUyxHQUFHLFNBQVMsQ0FBQyxPQUFPLENBQUMsYUFBYSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ2pELElBQUksU0FBUyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxhQUFhLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDOUQseUNBQXlDO1lBQ3pDLElBQUksT0FBTyxDQUFDLEVBQUUsb0NBQTRCLEVBQUUsQ0FBQztnQkFDNUMsU0FBUyxHQUFHLFNBQVMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztnQkFDcEMsU0FBUyxHQUFHLFNBQVMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUNyQyxDQUFDO1lBQ0QsSUFBSSxTQUFTLEtBQUssU0FBUyxFQUFFLENBQUM7Z0JBQzdCLE9BQU8sRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSw4QkFBOEIsRUFBRSxDQUFDO1lBQzNFLENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxTQUFTLENBQUM7SUFDbEIsQ0FBQztDQUNEIn0=