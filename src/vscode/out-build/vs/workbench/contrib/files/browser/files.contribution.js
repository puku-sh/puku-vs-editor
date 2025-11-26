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
import * as nls from '../../../../nls.js';
import { sep } from '../../../../base/common/path.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as ConfigurationExtensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { EditorExtensions } from '../../../common/editor.js';
import { AutoSaveConfiguration, HotExitConfiguration, FILES_EXCLUDE_CONFIG, FILES_ASSOCIATIONS_CONFIG, FILES_READONLY_INCLUDE_CONFIG, FILES_READONLY_EXCLUDE_CONFIG, FILES_READONLY_FROM_PERMISSIONS_CONFIG } from '../../../../platform/files/common/files.js';
import { FILE_EDITOR_INPUT_ID, BINARY_TEXT_FILE_MODE } from '../common/files.js';
import { TextFileEditorTracker } from './editors/textFileEditorTracker.js';
import { TextFileSaveErrorHandler } from './editors/textFileSaveErrorHandler.js';
import { FileEditorInput } from './editors/fileEditorInput.js';
import { BinaryFileEditor } from './editors/binaryFileEditor.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { isNative, isWeb, isWindows } from '../../../../base/common/platform.js';
import { ExplorerViewletViewsContribution } from './explorerViewlet.js';
import { EditorPaneDescriptor } from '../../../browser/editor.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { ExplorerService, UNDO_REDO_SOURCE } from './explorerService.js';
import { GUESSABLE_ENCODINGS, SUPPORTED_ENCODINGS } from '../../../services/textfile/common/encoding.js';
import { Schemas } from '../../../../base/common/network.js';
import { WorkspaceWatcher } from './workspaceWatcher.js';
import { editorConfigurationBaseNode } from '../../../../editor/common/config/editorConfigurationSchema.js';
import { DirtyFilesIndicator } from '../common/dirtyFilesIndicator.js';
import { UndoCommand, RedoCommand } from '../../../../editor/browser/editorExtensions.js';
import { IUndoRedoService } from '../../../../platform/undoRedo/common/undoRedo.js';
import { IExplorerService } from './files.js';
import { FileEditorInputSerializer, FileEditorWorkingCopyEditorHandler } from './editors/fileEditorHandler.js';
import { ModesRegistry } from '../../../../editor/common/languages/modesRegistry.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { TextFileEditor } from './editors/textFileEditor.js';
let FileUriLabelContribution = class FileUriLabelContribution {
    static { this.ID = 'workbench.contrib.fileUriLabel'; }
    constructor(labelService) {
        labelService.registerFormatter({
            scheme: Schemas.file,
            formatting: {
                label: '${authority}${path}',
                separator: sep,
                tildify: !isWindows,
                normalizeDriveLetter: isWindows,
                authorityPrefix: sep + sep,
                workspaceSuffix: ''
            }
        });
    }
};
FileUriLabelContribution = __decorate([
    __param(0, ILabelService)
], FileUriLabelContribution);
registerSingleton(IExplorerService, ExplorerService, 1 /* InstantiationType.Delayed */);
// Register file editors
Registry.as(EditorExtensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(TextFileEditor, TextFileEditor.ID, nls.localize(8835, null)), [
    new SyncDescriptor(FileEditorInput)
]);
Registry.as(EditorExtensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(BinaryFileEditor, BinaryFileEditor.ID, nls.localize(8836, null)), [
    new SyncDescriptor(FileEditorInput)
]);
// Register default file input factory
Registry.as(EditorExtensions.EditorFactory).registerFileEditorFactory({
    typeId: FILE_EDITOR_INPUT_ID,
    createFileEditor: (resource, preferredResource, preferredName, preferredDescription, preferredEncoding, preferredLanguageId, preferredContents, instantiationService) => {
        return instantiationService.createInstance(FileEditorInput, resource, preferredResource, preferredName, preferredDescription, preferredEncoding, preferredLanguageId, preferredContents);
    },
    isFileEditor: (obj) => {
        return obj instanceof FileEditorInput;
    }
});
// Register Editor Input Serializer & Handler
Registry.as(EditorExtensions.EditorFactory).registerEditorSerializer(FILE_EDITOR_INPUT_ID, FileEditorInputSerializer);
registerWorkbenchContribution2(FileEditorWorkingCopyEditorHandler.ID, FileEditorWorkingCopyEditorHandler, 2 /* WorkbenchPhase.BlockRestore */);
// Register Explorer views
registerWorkbenchContribution2(ExplorerViewletViewsContribution.ID, ExplorerViewletViewsContribution, 1 /* WorkbenchPhase.BlockStartup */);
// Register Text File Editor Tracker
registerWorkbenchContribution2(TextFileEditorTracker.ID, TextFileEditorTracker, 1 /* WorkbenchPhase.BlockStartup */);
// Register Text File Save Error Handler
registerWorkbenchContribution2(TextFileSaveErrorHandler.ID, TextFileSaveErrorHandler, 1 /* WorkbenchPhase.BlockStartup */);
// Register uri display for file uris
registerWorkbenchContribution2(FileUriLabelContribution.ID, FileUriLabelContribution, 1 /* WorkbenchPhase.BlockStartup */);
// Register Workspace Watcher
registerWorkbenchContribution2(WorkspaceWatcher.ID, WorkspaceWatcher, 3 /* WorkbenchPhase.AfterRestored */);
// Register Dirty Files Indicator
registerWorkbenchContribution2(DirtyFilesIndicator.ID, DirtyFilesIndicator, 1 /* WorkbenchPhase.BlockStartup */);
// Configuration
const configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
const hotExitConfiguration = isNative ?
    {
        'type': 'string',
        'scope': 1 /* ConfigurationScope.APPLICATION */,
        'enum': [HotExitConfiguration.OFF, HotExitConfiguration.ON_EXIT, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE],
        'default': HotExitConfiguration.ON_EXIT,
        'markdownEnumDescriptions': [
            nls.localize(8837, null),
            nls.localize(8838, null),
            nls.localize(8839, null)
        ],
        'markdownDescription': nls.localize(8840, null, HotExitConfiguration.ON_EXIT, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE)
    } : {
    'type': 'string',
    'scope': 1 /* ConfigurationScope.APPLICATION */,
    'enum': [HotExitConfiguration.OFF, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE],
    'default': HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE,
    'markdownEnumDescriptions': [
        nls.localize(8841, null),
        nls.localize(8842, null)
    ],
    'markdownDescription': nls.localize(8843, null, HotExitConfiguration.ON_EXIT, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE)
};
configurationRegistry.registerConfiguration({
    'id': 'files',
    'order': 9,
    'title': nls.localize(8844, null),
    'type': 'object',
    'properties': {
        [FILES_EXCLUDE_CONFIG]: {
            'type': 'object',
            'markdownDescription': nls.localize(8845, null),
            'default': {
                ...{ '**/.git': true, '**/.svn': true, '**/.hg': true, '**/.DS_Store': true, '**/Thumbs.db': true },
                ...(isWeb ? { '**/*.crswap': true /* filter out swap files used for local file access */ } : undefined)
            },
            'scope': 5 /* ConfigurationScope.RESOURCE */,
            'additionalProperties': {
                'anyOf': [
                    {
                        'type': 'boolean',
                        'enum': [true, false],
                        'enumDescriptions': [nls.localize(8846, null), nls.localize(8847, null)],
                        'description': nls.localize(8848, null),
                    },
                    {
                        'type': 'object',
                        'properties': {
                            'when': {
                                'type': 'string', // expression ({ "**/*.js": { "when": "$(basename).js" } })
                                'pattern': '\\w*\\$\\(basename\\)\\w*',
                                'default': '$(basename).ext',
                                'markdownDescription': nls.localize(8849, null)
                            }
                        }
                    }
                ]
            }
        },
        [FILES_ASSOCIATIONS_CONFIG]: {
            'type': 'object',
            'markdownDescription': nls.localize(8850, null),
            'additionalProperties': {
                'type': 'string'
            }
        },
        'files.encoding': {
            'type': 'string',
            'enum': Object.keys(SUPPORTED_ENCODINGS),
            'default': 'utf8',
            'description': nls.localize(8851, null),
            'scope': 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            'enumDescriptions': Object.keys(SUPPORTED_ENCODINGS).map(key => SUPPORTED_ENCODINGS[key].labelLong),
            'enumItemLabels': Object.keys(SUPPORTED_ENCODINGS).map(key => SUPPORTED_ENCODINGS[key].labelLong)
        },
        'files.autoGuessEncoding': {
            'type': 'boolean',
            'default': false,
            'markdownDescription': nls.localize(8852, null, '`#files.encoding#`'),
            'scope': 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */
        },
        'files.candidateGuessEncodings': {
            'type': 'array',
            'items': {
                'type': 'string',
                'enum': Object.keys(GUESSABLE_ENCODINGS),
                'enumDescriptions': Object.keys(GUESSABLE_ENCODINGS).map(key => GUESSABLE_ENCODINGS[key].labelLong)
            },
            'default': [],
            'markdownDescription': nls.localize(8853, null, '`#files.encoding#`'),
            'scope': 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */
        },
        'files.eol': {
            'type': 'string',
            'enum': [
                '\n',
                '\r\n',
                'auto'
            ],
            'enumDescriptions': [
                nls.localize(8854, null),
                nls.localize(8855, null),
                nls.localize(8856, null)
            ],
            'default': 'auto',
            'description': nls.localize(8857, null),
            'scope': 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */
        },
        'files.enableTrash': {
            'type': 'boolean',
            'default': true,
            'description': nls.localize(8858, null)
        },
        'files.trimTrailingWhitespace': {
            'type': 'boolean',
            'default': false,
            'description': nls.localize(8859, null),
            'scope': 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */
        },
        'files.trimTrailingWhitespaceInRegexAndStrings': {
            'type': 'boolean',
            'default': true,
            'description': nls.localize(8860, null),
            'scope': 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */
        },
        'files.insertFinalNewline': {
            'type': 'boolean',
            'default': false,
            'description': nls.localize(8861, null),
            'scope': 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */
        },
        'files.trimFinalNewlines': {
            'type': 'boolean',
            'default': false,
            'description': nls.localize(8862, null),
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
        },
        'files.autoSave': {
            'type': 'string',
            'enum': [AutoSaveConfiguration.OFF, AutoSaveConfiguration.AFTER_DELAY, AutoSaveConfiguration.ON_FOCUS_CHANGE, AutoSaveConfiguration.ON_WINDOW_CHANGE],
            'markdownEnumDescriptions': [
                nls.localize(8863, null),
                nls.localize(8864, null),
                nls.localize(8865, null),
                nls.localize(8866, null)
            ],
            'default': isWeb ? AutoSaveConfiguration.AFTER_DELAY : AutoSaveConfiguration.OFF,
            'markdownDescription': nls.localize(8867, null, AutoSaveConfiguration.OFF, AutoSaveConfiguration.AFTER_DELAY, AutoSaveConfiguration.ON_FOCUS_CHANGE, AutoSaveConfiguration.ON_WINDOW_CHANGE, AutoSaveConfiguration.AFTER_DELAY),
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */
        },
        'files.autoSaveDelay': {
            'type': 'number',
            'default': 1000,
            'minimum': 0,
            'markdownDescription': nls.localize(8868, null, AutoSaveConfiguration.AFTER_DELAY),
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */
        },
        'files.autoSaveWorkspaceFilesOnly': {
            'type': 'boolean',
            'default': false,
            'markdownDescription': nls.localize(8869, null, '`#files.autoSave#`'),
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */
        },
        'files.autoSaveWhenNoErrors': {
            'type': 'boolean',
            'default': false,
            'markdownDescription': nls.localize(8870, null, '`#files.autoSave#`'),
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */
        },
        'files.watcherExclude': {
            'type': 'object',
            'patternProperties': {
                '.*': { 'type': 'boolean' }
            },
            'default': { '**/.git/objects/**': true, '**/.git/subtree-cache/**': true, '**/.hg/store/**': true },
            'markdownDescription': nls.localize(8871, null),
            'scope': 5 /* ConfigurationScope.RESOURCE */
        },
        'files.watcherInclude': {
            'type': 'array',
            'items': {
                'type': 'string'
            },
            'default': [],
            'description': nls.localize(8872, null),
            'scope': 5 /* ConfigurationScope.RESOURCE */
        },
        'files.hotExit': hotExitConfiguration,
        'files.defaultLanguage': {
            'type': 'string',
            'markdownDescription': nls.localize(8873, null)
        },
        [FILES_READONLY_INCLUDE_CONFIG]: {
            'type': 'object',
            'patternProperties': {
                '.*': { 'type': 'boolean' }
            },
            'default': {},
            'markdownDescription': nls.localize(8874, null),
            'scope': 5 /* ConfigurationScope.RESOURCE */
        },
        [FILES_READONLY_EXCLUDE_CONFIG]: {
            'type': 'object',
            'patternProperties': {
                '.*': { 'type': 'boolean' }
            },
            'default': {},
            'markdownDescription': nls.localize(8875, null),
            'scope': 5 /* ConfigurationScope.RESOURCE */
        },
        [FILES_READONLY_FROM_PERMISSIONS_CONFIG]: {
            'type': 'boolean',
            'markdownDescription': nls.localize(8876, null),
            'default': false
        },
        'files.restoreUndoStack': {
            'type': 'boolean',
            'description': nls.localize(8877, null),
            'default': true
        },
        'files.saveConflictResolution': {
            'type': 'string',
            'enum': [
                'askUser',
                'overwriteFileOnDisk'
            ],
            'enumDescriptions': [
                nls.localize(8878, null),
                nls.localize(8879, null)
            ],
            'description': nls.localize(8880, null),
            'default': 'askUser',
            'scope': 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */
        },
        'files.dialog.defaultPath': {
            'type': 'string',
            'pattern': '^((\\/|\\\\\\\\|[a-zA-Z]:\\\\).*)?$', // slash OR UNC-root OR drive-root OR undefined
            'patternErrorMessage': nls.localize(8881, null),
            'description': nls.localize(8882, null),
            'scope': 2 /* ConfigurationScope.MACHINE */
        },
        'files.simpleDialog.enable': {
            'type': 'boolean',
            'description': nls.localize(8883, null),
            'default': false
        },
        'files.participants.timeout': {
            type: 'number',
            default: 60000,
            markdownDescription: nls.localize(8884, null),
        }
    }
});
configurationRegistry.registerConfiguration({
    ...editorConfigurationBaseNode,
    properties: {
        'editor.formatOnSave': {
            'type': 'boolean',
            'markdownDescription': nls.localize(8885, null, '`#files.autoSave#`'),
            'scope': 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
        },
        'editor.formatOnSaveMode': {
            'type': 'string',
            'default': 'file',
            'enum': [
                'file',
                'modifications',
                'modificationsIfAvailable'
            ],
            'enumDescriptions': [
                nls.localize(8886, null),
                nls.localize(8887, null),
                nls.localize(8888, null),
            ],
            'markdownDescription': nls.localize(8889, null),
            'scope': 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
        },
    }
});
configurationRegistry.registerConfiguration({
    'id': 'explorer',
    'order': 10,
    'title': nls.localize(8890, null),
    'type': 'object',
    'properties': {
        'explorer.openEditors.visible': {
            'type': 'number',
            'description': nls.localize(8891, null),
            'default': 9,
            'minimum': 1
        },
        'explorer.openEditors.minVisible': {
            'type': 'number',
            'description': nls.localize(8892, null),
            'default': 0,
            'minimum': 0
        },
        'explorer.openEditors.sortOrder': {
            'type': 'string',
            'enum': ['editorOrder', 'alphabetical', 'fullPath'],
            'description': nls.localize(8893, null),
            'enumDescriptions': [
                nls.localize(8894, null),
                nls.localize(8895, null),
                nls.localize(8896, null)
            ],
            'default': 'editorOrder'
        },
        'explorer.autoReveal': {
            'type': ['boolean', 'string'],
            'enum': [true, false, 'focusNoScroll'],
            'default': true,
            'enumDescriptions': [
                nls.localize(8897, null),
                nls.localize(8898, null),
                nls.localize(8899, null),
            ],
            'description': nls.localize(8900, null)
        },
        'explorer.autoRevealExclude': {
            'type': 'object',
            'markdownDescription': nls.localize(8901, null),
            'default': { '**/node_modules': true, '**/bower_components': true },
            'additionalProperties': {
                'anyOf': [
                    {
                        'type': 'boolean',
                        'description': nls.localize(8902, null),
                    },
                    {
                        type: 'object',
                        properties: {
                            when: {
                                type: 'string', // expression ({ "**/*.js": { "when": "$(basename).js" } })
                                pattern: '\\w*\\$\\(basename\\)\\w*',
                                default: '$(basename).ext',
                                description: nls.localize(8903, null)
                            }
                        }
                    }
                ]
            }
        },
        'explorer.enableDragAndDrop': {
            'type': 'boolean',
            'description': nls.localize(8904, null),
            'default': true
        },
        'explorer.confirmDragAndDrop': {
            'type': 'boolean',
            'description': nls.localize(8905, null),
            'default': true
        },
        'explorer.confirmPasteNative': {
            'type': 'boolean',
            'description': nls.localize(8906, null),
            'default': true
        },
        'explorer.confirmDelete': {
            'type': 'boolean',
            'description': nls.localize(8907, null),
            'default': true
        },
        'explorer.enableUndo': {
            'type': 'boolean',
            'description': nls.localize(8908, null),
            'default': true
        },
        'explorer.confirmUndo': {
            'type': 'string',
            'enum': ["verbose" /* UndoConfirmLevel.Verbose */, "default" /* UndoConfirmLevel.Default */, "light" /* UndoConfirmLevel.Light */],
            'description': nls.localize(8909, null),
            'default': "default" /* UndoConfirmLevel.Default */,
            'enumDescriptions': [
                nls.localize(8910, null),
                nls.localize(8911, null),
                nls.localize(8912, null),
            ],
        },
        'explorer.expandSingleFolderWorkspaces': {
            'type': 'boolean',
            'description': nls.localize(8913, null),
            'default': true
        },
        'explorer.sortOrder': {
            'type': 'string',
            'enum': ["default" /* SortOrder.Default */, "mixed" /* SortOrder.Mixed */, "filesFirst" /* SortOrder.FilesFirst */, "type" /* SortOrder.Type */, "modified" /* SortOrder.Modified */, "foldersNestsFiles" /* SortOrder.FoldersNestsFiles */],
            'default': "default" /* SortOrder.Default */,
            'enumDescriptions': [
                nls.localize(8914, null),
                nls.localize(8915, null),
                nls.localize(8916, null),
                nls.localize(8917, null),
                nls.localize(8918, null),
                nls.localize(8919, null)
            ],
            'markdownDescription': nls.localize(8920, null)
        },
        'explorer.sortOrderLexicographicOptions': {
            'type': 'string',
            'enum': ["default" /* LexicographicOptions.Default */, "upper" /* LexicographicOptions.Upper */, "lower" /* LexicographicOptions.Lower */, "unicode" /* LexicographicOptions.Unicode */],
            'default': "default" /* LexicographicOptions.Default */,
            'enumDescriptions': [
                nls.localize(8921, null),
                nls.localize(8922, null),
                nls.localize(8923, null),
                nls.localize(8924, null)
            ],
            'description': nls.localize(8925, null)
        },
        'explorer.sortOrderReverse': {
            'type': 'boolean',
            'description': nls.localize(8926, null),
            'default': false,
        },
        'explorer.decorations.colors': {
            type: 'boolean',
            description: nls.localize(8927, null),
            default: true
        },
        'explorer.decorations.badges': {
            type: 'boolean',
            description: nls.localize(8928, null),
            default: true
        },
        'explorer.incrementalNaming': {
            'type': 'string',
            enum: ['simple', 'smart', 'disabled'],
            enumDescriptions: [
                nls.localize(8929, null),
                nls.localize(8930, null),
                nls.localize(8931, null)
            ],
            description: nls.localize(8932, null),
            default: 'simple'
        },
        'explorer.autoOpenDroppedFile': {
            'type': 'boolean',
            'description': nls.localize(8933, null),
            'default': true
        },
        'explorer.compactFolders': {
            'type': 'boolean',
            'description': nls.localize(8934, null),
            'default': true
        },
        'explorer.copyRelativePathSeparator': {
            'type': 'string',
            'enum': [
                '/',
                '\\',
                'auto'
            ],
            'enumDescriptions': [
                nls.localize(8935, null),
                nls.localize(8936, null),
                nls.localize(8937, null),
            ],
            'description': nls.localize(8938, null),
            'default': 'auto'
        },
        'explorer.copyPathSeparator': {
            'type': 'string',
            'enum': [
                '/',
                '\\',
                'auto'
            ],
            'enumDescriptions': [
                nls.localize(8939, null),
                nls.localize(8940, null),
                nls.localize(8941, null),
            ],
            'description': nls.localize(8942, null),
            'default': 'auto'
        },
        'explorer.excludeGitIgnore': {
            type: 'boolean',
            markdownDescription: nls.localize(8943, null, '`#files.exclude#`'),
            default: false,
            scope: 5 /* ConfigurationScope.RESOURCE */
        },
        'explorer.fileNesting.enabled': {
            'type': 'boolean',
            scope: 5 /* ConfigurationScope.RESOURCE */,
            'markdownDescription': nls.localize(8944, null),
            'default': false,
        },
        'explorer.fileNesting.expand': {
            'type': 'boolean',
            'markdownDescription': nls.localize(8945, null, '`#explorer.fileNesting.enabled#`'),
            'default': true,
        },
        'explorer.fileNesting.patterns': {
            'type': 'object',
            scope: 5 /* ConfigurationScope.RESOURCE */,
            'markdownDescription': nls.localize(8946, null, '`#explorer.fileNesting.enabled#`'),
            patternProperties: {
                '^[^*]*\\*?[^*]*$': {
                    markdownDescription: nls.localize(8947, null),
                    type: 'string',
                    pattern: '^([^,*]*\\*?[^,*]*)(, ?[^,*]*\\*?[^,*]*)*$',
                }
            },
            additionalProperties: false,
            'default': {
                '*.ts': '${capture}.js',
                '*.js': '${capture}.js.map, ${capture}.min.js, ${capture}.d.ts',
                '*.jsx': '${capture}.js',
                '*.tsx': '${capture}.ts',
                'tsconfig.json': 'tsconfig.*.json',
                'package.json': 'package-lock.json, yarn.lock, pnpm-lock.yaml, bun.lockb, bun.lock',
            }
        }
    }
});
UndoCommand.addImplementation(110, 'explorer', (accessor) => {
    const undoRedoService = accessor.get(IUndoRedoService);
    const explorerService = accessor.get(IExplorerService);
    const configurationService = accessor.get(IConfigurationService);
    const explorerCanUndo = configurationService.getValue().explorer.enableUndo;
    if (explorerService.hasViewFocus() && undoRedoService.canUndo(UNDO_REDO_SOURCE) && explorerCanUndo) {
        undoRedoService.undo(UNDO_REDO_SOURCE);
        return true;
    }
    return false;
});
RedoCommand.addImplementation(110, 'explorer', (accessor) => {
    const undoRedoService = accessor.get(IUndoRedoService);
    const explorerService = accessor.get(IExplorerService);
    const configurationService = accessor.get(IConfigurationService);
    const explorerCanUndo = configurationService.getValue().explorer.enableUndo;
    if (explorerService.hasViewFocus() && undoRedoService.canRedo(UNDO_REDO_SOURCE) && explorerCanUndo) {
        undoRedoService.redo(UNDO_REDO_SOURCE);
        return true;
    }
    return false;
});
ModesRegistry.registerLanguage({
    id: BINARY_TEXT_FILE_MODE,
    aliases: ['Binary'],
    mimetypes: ['text/x-code-binary']
});
//# sourceMappingURL=files.contribution.js.map