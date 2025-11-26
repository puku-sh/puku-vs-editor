/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { IClipboardService } from '../../../../../platform/clipboard/common/clipboardService.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { NOTEBOOK_ACTIONS_CATEGORY } from './coreActions.js';
import { NOTEBOOK_CELL_HAS_HIDDEN_OUTPUTS, NOTEBOOK_CELL_HAS_OUTPUTS, NOTEBOOK_CELL_OUTPUT_MIMETYPE } from '../../common/notebookContextKeys.js';
import * as icons from '../notebookIcons.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { copyCellOutput } from '../viewModel/cellOutputTextHelper.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { getNotebookEditorFromEditorPane } from '../notebookBrowser.js';
import { CellKind, CellUri } from '../../common/notebookCommon.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { INotebookEditorModelResolverService } from '../../common/notebookEditorModelResolverService.js';
import { IFileDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { URI } from '../../../../../base/common/uri.js';
export const COPY_OUTPUT_COMMAND_ID = 'notebook.cellOutput.copy';
registerAction2(class ShowAllOutputsAction extends Action2 {
    constructor() {
        super({
            id: 'notebook.cellOuput.showEmptyOutputs',
            title: localize(10211, null),
            menu: {
                id: MenuId.NotebookOutputToolbar,
                when: ContextKeyExpr.and(NOTEBOOK_CELL_HAS_OUTPUTS, NOTEBOOK_CELL_HAS_HIDDEN_OUTPUTS)
            },
            f1: false,
            category: NOTEBOOK_ACTIONS_CATEGORY
        });
    }
    run(accessor, context) {
        const cell = context.cell;
        if (cell && cell.cellKind === CellKind.Code) {
            for (let i = 1; i < cell.outputsViewModels.length; i++) {
                if (!cell.outputsViewModels[i].visible.get()) {
                    cell.outputsViewModels[i].setVisible(true, true);
                    cell.updateOutputHeight(i, 1, 'command');
                }
            }
        }
    }
});
registerAction2(class CopyCellOutputAction extends Action2 {
    constructor() {
        super({
            id: COPY_OUTPUT_COMMAND_ID,
            title: localize(10212, null),
            menu: {
                id: MenuId.NotebookOutputToolbar,
                when: NOTEBOOK_CELL_HAS_OUTPUTS
            },
            category: NOTEBOOK_ACTIONS_CATEGORY,
            icon: icons.copyIcon,
        });
    }
    async run(accessor, outputContext) {
        const editorService = accessor.get(IEditorService);
        const clipboardService = accessor.get(IClipboardService);
        const logService = accessor.get(ILogService);
        const notebookEditor = getNotebookEditorFromContext(editorService, outputContext);
        if (!notebookEditor) {
            return;
        }
        const outputViewModel = getOutputViewModelFromContext(outputContext, notebookEditor);
        if (!outputViewModel) {
            return;
        }
        const mimeType = outputViewModel.pickedMimeType?.mimeType;
        if (mimeType?.startsWith('image/')) {
            const focusOptions = { skipReveal: true, outputId: outputViewModel.model.outputId, altOutputId: outputViewModel.model.alternativeOutputId };
            await notebookEditor.focusNotebookCell(outputViewModel.cellViewModel, 'output', focusOptions);
            notebookEditor.copyOutputImage(outputViewModel);
        }
        else {
            copyCellOutput(mimeType, outputViewModel, clipboardService, logService);
        }
    }
});
export function getOutputViewModelFromId(outputId, notebookEditor) {
    const notebookViewModel = notebookEditor.getViewModel();
    if (notebookViewModel) {
        const codeCells = notebookViewModel.viewCells.filter(cell => cell.cellKind === CellKind.Code);
        for (const cell of codeCells) {
            const output = cell.outputsViewModels.find(output => output.model.outputId === outputId || output.model.alternativeOutputId === outputId);
            if (output) {
                return output;
            }
        }
    }
    return undefined;
}
function getNotebookEditorFromContext(editorService, outputContext) {
    if (outputContext && 'notebookEditor' in outputContext) {
        return outputContext.notebookEditor;
    }
    return getNotebookEditorFromEditorPane(editorService.activeEditorPane);
}
function getOutputViewModelFromContext(outputContext, notebookEditor) {
    let outputViewModel;
    if (outputContext && 'outputId' in outputContext && typeof outputContext.outputId === 'string') {
        outputViewModel = getOutputViewModelFromId(outputContext.outputId, notebookEditor);
    }
    else if (outputContext && 'outputViewModel' in outputContext) {
        outputViewModel = outputContext.outputViewModel;
    }
    if (!outputViewModel) {
        // not able to find the output from the provided context, use the active cell
        const activeCell = notebookEditor.getActiveCell();
        if (!activeCell) {
            return undefined;
        }
        if (activeCell.focusedOutputId !== undefined) {
            outputViewModel = activeCell.outputsViewModels.find(output => {
                return output.model.outputId === activeCell.focusedOutputId;
            });
        }
        else {
            outputViewModel = activeCell.outputsViewModels.find(output => output.pickedMimeType?.isTrusted);
        }
    }
    return outputViewModel;
}
export const OPEN_OUTPUT_COMMAND_ID = 'notebook.cellOutput.openInTextEditor';
registerAction2(class OpenCellOutputInEditorAction extends Action2 {
    constructor() {
        super({
            id: OPEN_OUTPUT_COMMAND_ID,
            title: localize(10213, null),
            f1: false,
            category: NOTEBOOK_ACTIONS_CATEGORY,
            icon: icons.copyIcon,
        });
    }
    async run(accessor, outputContext) {
        const editorService = accessor.get(IEditorService);
        const notebookModelService = accessor.get(INotebookEditorModelResolverService);
        const openerService = accessor.get(IOpenerService);
        const notebookEditor = getNotebookEditorFromContext(editorService, outputContext);
        if (!notebookEditor) {
            return;
        }
        const outputViewModel = getOutputViewModelFromContext(outputContext, notebookEditor);
        if (outputViewModel?.model.outputId && notebookEditor.textModel?.uri) {
            // reserve notebook document reference since the active notebook editor might not be pinned so it can be replaced by the output editor
            const ref = await notebookModelService.resolve(notebookEditor.textModel.uri);
            await openerService.open(CellUri.generateCellOutputUriWithId(notebookEditor.textModel.uri, outputViewModel.model.outputId));
            ref.dispose();
        }
    }
});
export const SAVE_OUTPUT_IMAGE_COMMAND_ID = 'notebook.cellOutput.saveImage';
registerAction2(class SaveCellOutputImageAction extends Action2 {
    constructor() {
        super({
            id: SAVE_OUTPUT_IMAGE_COMMAND_ID,
            title: localize(10214, null),
            menu: {
                id: MenuId.NotebookOutputToolbar,
                when: ContextKeyExpr.regex(NOTEBOOK_CELL_OUTPUT_MIMETYPE.key, /^image\//)
            },
            f1: false,
            category: NOTEBOOK_ACTIONS_CATEGORY,
            icon: icons.saveIcon,
        });
    }
    async run(accessor, outputContext) {
        const editorService = accessor.get(IEditorService);
        const fileDialogService = accessor.get(IFileDialogService);
        const fileService = accessor.get(IFileService);
        const logService = accessor.get(ILogService);
        const notebookEditor = getNotebookEditorFromContext(editorService, outputContext);
        if (!notebookEditor) {
            return;
        }
        const outputViewModel = getOutputViewModelFromContext(outputContext, notebookEditor);
        if (!outputViewModel) {
            return;
        }
        const mimeType = outputViewModel.pickedMimeType?.mimeType;
        // Only handle image mime types
        if (!mimeType?.startsWith('image/')) {
            return;
        }
        const outputItem = outputViewModel.model.outputs.find(output => output.mime === mimeType);
        if (!outputItem) {
            logService.error('Could not find output item with mime type', mimeType);
            return;
        }
        // Determine file extension based on mime type
        const mimeToExt = {
            'image/png': 'png',
            'image/jpeg': 'jpg',
            'image/jpg': 'jpg',
            'image/gif': 'gif',
            'image/svg+xml': 'svg',
            'image/webp': 'webp',
            'image/bmp': 'bmp',
            'image/tiff': 'tiff'
        };
        const extension = mimeToExt[mimeType] || 'png';
        const defaultFileName = `image.${extension}`;
        const defaultUri = notebookEditor.textModel?.uri
            ? URI.joinPath(URI.file(notebookEditor.textModel.uri.fsPath), '..', defaultFileName)
            : undefined;
        const uri = await fileDialogService.showSaveDialog({
            defaultUri,
            filters: [{
                    name: localize(10215, null),
                    extensions: [extension]
                }]
        });
        if (!uri) {
            return; // User cancelled
        }
        try {
            const imageData = outputItem.data;
            await fileService.writeFile(uri, imageData);
            logService.info('Saved image output to', uri.toString());
        }
        catch (error) {
            logService.error('Failed to save image output', error);
        }
    }
});
export const OPEN_OUTPUT_IN_OUTPUT_PREVIEW_COMMAND_ID = 'notebook.cellOutput.openInOutputPreview';
registerAction2(class OpenCellOutputInNotebookOutputEditorAction extends Action2 {
    constructor() {
        super({
            id: OPEN_OUTPUT_IN_OUTPUT_PREVIEW_COMMAND_ID,
            title: localize(10216, null),
            menu: {
                id: MenuId.NotebookOutputToolbar,
                when: ContextKeyExpr.and(NOTEBOOK_CELL_HAS_OUTPUTS, ContextKeyExpr.equals('config.notebook.output.openInPreviewEditor.enabled', true))
            },
            f1: false,
            category: NOTEBOOK_ACTIONS_CATEGORY,
        });
    }
    async run(accessor, outputContext) {
        const editorService = accessor.get(IEditorService);
        const openerService = accessor.get(IOpenerService);
        const notebookEditor = getNotebookEditorFromContext(editorService, outputContext);
        if (!notebookEditor) {
            return;
        }
        const outputViewModel = getOutputViewModelFromContext(outputContext, notebookEditor);
        if (!outputViewModel) {
            return;
        }
        const genericCellViewModel = outputViewModel.cellViewModel;
        if (!genericCellViewModel) {
            return;
        }
        // get cell index
        const cellViewModel = notebookEditor.getCellByHandle(genericCellViewModel.handle);
        if (!cellViewModel) {
            return;
        }
        const cellIndex = notebookEditor.getCellIndex(cellViewModel);
        if (cellIndex === undefined) {
            return;
        }
        // get output index
        const outputIndex = genericCellViewModel.outputsViewModels.indexOf(outputViewModel);
        if (outputIndex === -1) {
            return;
        }
        if (!notebookEditor.textModel) {
            return;
        }
        // craft rich output URI to pass data to the notebook output editor/viewer
        const outputURI = CellUri.generateOutputEditorUri(notebookEditor.textModel.uri, cellViewModel.id, cellIndex, outputViewModel.model.outputId, outputIndex);
        openerService.open(outputURI, { openToSide: true });
    }
});
//# sourceMappingURL=cellOutputActions.js.map