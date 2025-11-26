/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { OS } from '../../../base/common/platform.js';
/**
 * Aggressively escape non-windows paths to prepare for being sent to a shell. This will do some
 * escaping inaccurately to be careful about possible script injection via the file path. For
 * example, we're trying to prevent this sort of attack: `/foo/file$(echo evil)`.
 */
export function escapeNonWindowsPath(path, shellType) {
    let newPath = path;
    if (newPath.includes('\\')) {
        newPath = newPath.replace(/\\/g, '\\\\');
    }
    let escapeConfig;
    switch (shellType) {
        case "bash" /* PosixShellType.Bash */:
        case "sh" /* PosixShellType.Sh */:
        case "zsh" /* PosixShellType.Zsh */:
        case "gitbash" /* WindowsShellType.GitBash */:
            escapeConfig = {
                bothQuotes: (path) => `$'${path.replace(/'/g, '\\\'')}'`,
                singleQuotes: (path) => `'${path.replace(/'/g, '\\\'')}'`,
                noSingleQuotes: (path) => `'${path}'`
            };
            break;
        case "fish" /* PosixShellType.Fish */:
            escapeConfig = {
                bothQuotes: (path) => `"${path.replace(/"/g, '\\"')}"`,
                singleQuotes: (path) => `'${path.replace(/'/g, '\\\'')}'`,
                noSingleQuotes: (path) => `'${path}'`
            };
            break;
        case "pwsh" /* GeneralShellType.PowerShell */:
            // PowerShell should be handled separately in preparePathForShell
            // but if we get here, use PowerShell escaping
            escapeConfig = {
                bothQuotes: (path) => `"${path.replace(/"/g, '`"')}"`,
                singleQuotes: (path) => `'${path.replace(/'/g, '\'\'')}'`,
                noSingleQuotes: (path) => `'${path}'`
            };
            break;
        default:
            // Default to POSIX shell escaping for unknown shells
            escapeConfig = {
                bothQuotes: (path) => `$'${path.replace(/'/g, '\\\'')}'`,
                singleQuotes: (path) => `'${path.replace(/'/g, '\\\'')}'`,
                noSingleQuotes: (path) => `'${path}'`
            };
            break;
    }
    // Remove dangerous characters except single and double quotes, which we'll escape properly
    const bannedChars = /[\`\$\|\&\>\~\#\!\^\*\;\<]/g;
    newPath = newPath.replace(bannedChars, '');
    // Apply shell-specific escaping based on quote content
    if (newPath.includes('\'') && newPath.includes('"')) {
        return escapeConfig.bothQuotes(newPath);
    }
    else if (newPath.includes('\'')) {
        return escapeConfig.singleQuotes(newPath);
    }
    else {
        return escapeConfig.noSingleQuotes(newPath);
    }
}
/**
 * Collapses the user's home directory into `~` if it exists within the path, this gives a shorter
 * path that is more suitable within the context of a terminal.
 */
export function collapseTildePath(path, userHome, separator) {
    if (!path) {
        return '';
    }
    if (!userHome) {
        return path;
    }
    // Trim the trailing separator from the end if it exists
    if (userHome.match(/[\/\\]$/)) {
        userHome = userHome.slice(0, userHome.length - 1);
    }
    const normalizedPath = path.replace(/\\/g, '/').toLowerCase();
    const normalizedUserHome = userHome.replace(/\\/g, '/').toLowerCase();
    if (!normalizedPath.includes(normalizedUserHome)) {
        return path;
    }
    return `~${separator}${path.slice(userHome.length + 1)}`;
}
/**
 * Sanitizes a cwd string, removing any wrapping quotes and making the Windows drive letter
 * uppercase.
 * @param cwd The directory to sanitize.
 */
export function sanitizeCwd(cwd) {
    // Sanity check that the cwd is not wrapped in quotes (see #160109)
    if (cwd.match(/^['"].*['"]$/)) {
        cwd = cwd.substring(1, cwd.length - 1);
    }
    // Make the drive letter uppercase on Windows (see #9448)
    if (OS === 1 /* OperatingSystem.Windows */ && cwd && cwd[1] === ':') {
        return cwd[0].toUpperCase() + cwd.substring(1);
    }
    return cwd;
}
/**
 * Determines whether the given shell launch config should use the environment variable collection.
 * @param slc The shell launch config to check.
 */
export function shouldUseEnvironmentVariableCollection(slc) {
    return !slc.strictEnv;
}
//# sourceMappingURL=terminalEnvironment.js.map