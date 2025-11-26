/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isValidBasename } from '../../../../../base/common/extpath.js';
import { extname } from '../../../../../base/common/path.js';
import { basename, joinPath } from '../../../../../base/common/resources.js';
import { URI } from '../../../../../base/common/uri.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { getIconClassesForLanguageId } from '../../../../../editor/common/services/getIconClasses.js';
import * as nls from '../../../../../nls.js';
import { MenuId } from '../../../../../platform/actions/common/actions.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { SnippetsAction } from './abstractSnippetsActions.js';
import { ISnippetsService } from '../snippets.js';
import { ITextFileService } from '../../../../services/textfile/common/textfiles.js';
import { IUserDataProfileService } from '../../../../services/userDataProfile/common/userDataProfile.js';
var ISnippetPick;
(function (ISnippetPick) {
    function is(thing) {
        return !!thing && URI.isUri(thing.filepath);
    }
    ISnippetPick.is = is;
})(ISnippetPick || (ISnippetPick = {}));
async function computePicks(snippetService, userDataProfileService, languageService, labelService) {
    const existing = [];
    const future = [];
    const seen = new Set();
    const added = new Map();
    for (const file of await snippetService.getSnippetFiles()) {
        if (file.source === 3 /* SnippetSource.Extension */) {
            // skip extension snippets
            continue;
        }
        if (file.isGlobalSnippets) {
            await file.load();
            // list scopes for global snippets
            const names = new Set();
            let source;
            outer: for (const snippet of file.data) {
                if (!source) {
                    source = snippet.source;
                }
                for (const scope of snippet.scopes) {
                    const name = languageService.getLanguageName(scope);
                    if (name) {
                        if (names.size >= 4) {
                            names.add(`${name}...`);
                            break outer;
                        }
                        else {
                            names.add(name);
                        }
                    }
                }
            }
            const snippet = {
                label: basename(file.location),
                filepath: file.location,
                description: names.size === 0
                    ? nls.localize(11994, null)
                    : nls.localize(11995, null, [...names].join(', '))
            };
            existing.push(snippet);
            if (!source) {
                continue;
            }
            const detail = nls.localize(11996, null, source, labelService.getUriLabel(file.location, { relative: true }));
            const lastItem = added.get(basename(file.location));
            if (lastItem) {
                snippet.detail = detail;
                lastItem.snippet.detail = lastItem.detail;
            }
            added.set(basename(file.location), { snippet, detail });
        }
        else {
            // language snippet
            const mode = basename(file.location).replace(/\.json$/, '');
            existing.push({
                label: basename(file.location),
                description: `(${languageService.getLanguageName(mode) ?? mode})`,
                filepath: file.location
            });
            seen.add(mode);
        }
    }
    const dir = userDataProfileService.currentProfile.snippetsHome;
    for (const languageId of languageService.getRegisteredLanguageIds()) {
        const label = languageService.getLanguageName(languageId);
        if (label && !seen.has(languageId)) {
            future.push({
                label: languageId,
                description: `(${label})`,
                filepath: joinPath(dir, `${languageId}.json`),
                hint: true,
                iconClasses: getIconClassesForLanguageId(languageId)
            });
        }
    }
    existing.sort((a, b) => {
        const a_ext = extname(a.filepath.path);
        const b_ext = extname(b.filepath.path);
        if (a_ext === b_ext) {
            return a.label.localeCompare(b.label);
        }
        else if (a_ext === '.code-snippets') {
            return -1;
        }
        else {
            return 1;
        }
    });
    future.sort((a, b) => {
        return a.label.localeCompare(b.label);
    });
    return { existing, future };
}
async function createSnippetFile(scope, defaultPath, quickInputService, fileService, textFileService, opener) {
    function createSnippetUri(input) {
        const filename = extname(input) !== '.code-snippets'
            ? `${input}.code-snippets`
            : input;
        return joinPath(defaultPath, filename);
    }
    await fileService.createFolder(defaultPath);
    const input = await quickInputService.input({
        placeHolder: nls.localize(11997, null),
        async validateInput(input) {
            if (!input) {
                return nls.localize(11998, null);
            }
            if (!isValidBasename(input)) {
                return nls.localize(11999, null, input);
            }
            if (await fileService.exists(createSnippetUri(input))) {
                return nls.localize(12000, null, input);
            }
            return undefined;
        }
    });
    if (!input) {
        return undefined;
    }
    const resource = createSnippetUri(input);
    await textFileService.write(resource, [
        '{',
        '\t// Place your ' + scope + ' snippets here. Each snippet is defined under a snippet name and has a scope, prefix, body and ',
        '\t// description. Add comma separated ids of the languages where the snippet is applicable in the scope field. If scope ',
        '\t// is left empty or omitted, the snippet gets applied to all languages. The prefix is what is ',
        '\t// used to trigger the snippet and the body will be expanded and inserted. Possible variables are: ',
        '\t// $1, $2 for tab stops, $0 for the final cursor position, and ${1:label}, ${2:another} for placeholders. ',
        '\t// Placeholders with the same ids are connected.',
        '\t// Example:',
        '\t// "Print to console": {',
        '\t// \t"scope": "javascript,typescript",',
        '\t// \t"prefix": "log",',
        '\t// \t"body": [',
        '\t// \t\t"console.log(\'$1\');",',
        '\t// \t\t"$2"',
        '\t// \t],',
        '\t// \t"description": "Log output to console"',
        '\t// }',
        '}'
    ].join('\n'));
    await opener.open(resource);
    return undefined;
}
async function createLanguageSnippetFile(pick, fileService, textFileService) {
    if (await fileService.exists(pick.filepath)) {
        return;
    }
    const contents = [
        '{',
        '\t// Place your snippets for ' + pick.label + ' here. Each snippet is defined under a snippet name and has a prefix, body and ',
        '\t// description. The prefix is what is used to trigger the snippet and the body will be expanded and inserted. Possible variables are:',
        '\t// $1, $2 for tab stops, $0 for the final cursor position, and ${1:label}, ${2:another} for placeholders. Placeholders with the ',
        '\t// same ids are connected.',
        '\t// Example:',
        '\t// "Print to console": {',
        '\t// \t"prefix": "log",',
        '\t// \t"body": [',
        '\t// \t\t"console.log(\'$1\');",',
        '\t// \t\t"$2"',
        '\t// \t],',
        '\t// \t"description": "Log output to console"',
        '\t// }',
        '}'
    ].join('\n');
    await textFileService.write(pick.filepath, contents);
}
export class ConfigureSnippetsAction extends SnippetsAction {
    constructor() {
        super({
            id: 'workbench.action.openSnippets',
            title: nls.localize2(12010, "Configure Snippets"),
            shortTitle: {
                ...nls.localize2(12011, "Snippets"),
                mnemonicTitle: nls.localize(12001, null),
            },
            f1: true,
            menu: [
                { id: MenuId.MenubarPreferencesMenu, group: '2_configuration', order: 5 },
                { id: MenuId.GlobalActivity, group: '2_configuration', order: 5 },
            ]
        });
    }
    async run(accessor) {
        const snippetService = accessor.get(ISnippetsService);
        const quickInputService = accessor.get(IQuickInputService);
        const opener = accessor.get(IOpenerService);
        const languageService = accessor.get(ILanguageService);
        const userDataProfileService = accessor.get(IUserDataProfileService);
        const workspaceService = accessor.get(IWorkspaceContextService);
        const fileService = accessor.get(IFileService);
        const textFileService = accessor.get(ITextFileService);
        const labelService = accessor.get(ILabelService);
        const picks = await computePicks(snippetService, userDataProfileService, languageService, labelService);
        const existing = picks.existing;
        const globalSnippetPicks = [{
                scope: nls.localize(12002, null),
                label: nls.localize(12003, null),
                uri: userDataProfileService.currentProfile.snippetsHome
            }];
        const workspaceSnippetPicks = [];
        for (const folder of workspaceService.getWorkspace().folders) {
            workspaceSnippetPicks.push({
                scope: nls.localize(12004, null, folder.name),
                label: nls.localize(12005, null, folder.name),
                uri: folder.toResource('.vscode')
            });
        }
        if (existing.length > 0) {
            existing.unshift({ type: 'separator', label: nls.localize(12006, null) });
            existing.push({ type: 'separator', label: nls.localize(12007, null) });
        }
        else {
            existing.push({ type: 'separator', label: nls.localize(12008, null) });
        }
        const pick = await quickInputService.pick([].concat(existing, globalSnippetPicks, workspaceSnippetPicks, picks.future), {
            placeHolder: nls.localize(12009, null),
            matchOnDescription: true
        });
        if (globalSnippetPicks.indexOf(pick) >= 0) {
            return createSnippetFile(pick.scope, pick.uri, quickInputService, fileService, textFileService, opener);
        }
        else if (workspaceSnippetPicks.indexOf(pick) >= 0) {
            return createSnippetFile(pick.scope, pick.uri, quickInputService, fileService, textFileService, opener);
        }
        else if (ISnippetPick.is(pick)) {
            if (pick.hint) {
                await createLanguageSnippetFile(pick, fileService, textFileService);
            }
            return opener.open(pick.filepath);
        }
    }
}
//# sourceMappingURL=configureSnippets.js.map