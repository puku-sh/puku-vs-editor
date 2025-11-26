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
import * as dom from '../../../../../base/browser/dom.js';
import { Sizing, SplitView } from '../../../../../base/browser/ui/splitview/splitview.js';
import { Color } from '../../../../../base/common/color.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { DisposableStore, dispose } from '../../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../../base/common/network.js';
import { basenameOrAuthority, dirname } from '../../../../../base/common/resources.js';
import './referencesWidget.css';
import { EmbeddedCodeEditorWidget } from '../../../../browser/widget/codeEditor/embeddedCodeEditorWidget.js';
import { Range } from '../../../../common/core/range.js';
import { ModelDecorationOptions, TextModel } from '../../../../common/model/textModel.js';
import { PLAINTEXT_LANGUAGE_ID } from '../../../../common/languages/modesRegistry.js';
import { ITextModelService } from '../../../../common/services/resolverService.js';
import { AccessibilityProvider, DataSource, Delegate, FileReferencesRenderer, IdentityProvider, OneReferenceRenderer, StringRepresentationProvider } from './referencesTree.js';
import * as peekView from '../../../peekView/browser/peekView.js';
import * as nls from '../../../../../nls.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { WorkbenchAsyncDataTree } from '../../../../../platform/list/browser/listService.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { FileReferences, OneReference } from '../referencesModel.js';
import { DataTransfers } from '../../../../../base/browser/dnd.js';
import { withSelection } from '../../../../../platform/opener/common/opener.js';
class DecorationsManager {
    static { this.DecorationOptions = ModelDecorationOptions.register({
        description: 'reference-decoration',
        stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
        className: 'reference-decoration'
    }); }
    constructor(_editor, _model) {
        this._editor = _editor;
        this._model = _model;
        this._decorations = new Map();
        this._decorationIgnoreSet = new Set();
        this._callOnDispose = new DisposableStore();
        this._callOnModelChange = new DisposableStore();
        this._callOnDispose.add(this._editor.onDidChangeModel(() => this._onModelChanged()));
        this._onModelChanged();
    }
    dispose() {
        this._callOnModelChange.dispose();
        this._callOnDispose.dispose();
        this.removeDecorations();
    }
    _onModelChanged() {
        this._callOnModelChange.clear();
        const model = this._editor.getModel();
        if (!model) {
            return;
        }
        for (const ref of this._model.references) {
            if (ref.uri.toString() === model.uri.toString()) {
                this._addDecorations(ref.parent);
                return;
            }
        }
    }
    _addDecorations(reference) {
        if (!this._editor.hasModel()) {
            return;
        }
        this._callOnModelChange.add(this._editor.getModel().onDidChangeDecorations(() => this._onDecorationChanged()));
        const newDecorations = [];
        const newDecorationsActualIndex = [];
        for (let i = 0, len = reference.children.length; i < len; i++) {
            const oneReference = reference.children[i];
            if (this._decorationIgnoreSet.has(oneReference.id)) {
                continue;
            }
            if (oneReference.uri.toString() !== this._editor.getModel().uri.toString()) {
                continue;
            }
            newDecorations.push({
                range: oneReference.range,
                options: DecorationsManager.DecorationOptions
            });
            newDecorationsActualIndex.push(i);
        }
        this._editor.changeDecorations((changeAccessor) => {
            const decorations = changeAccessor.deltaDecorations([], newDecorations);
            for (let i = 0; i < decorations.length; i++) {
                this._decorations.set(decorations[i], reference.children[newDecorationsActualIndex[i]]);
            }
        });
    }
    _onDecorationChanged() {
        const toRemove = [];
        const model = this._editor.getModel();
        if (!model) {
            return;
        }
        for (const [decorationId, reference] of this._decorations) {
            const newRange = model.getDecorationRange(decorationId);
            if (!newRange) {
                continue;
            }
            let ignore = false;
            if (Range.equalsRange(newRange, reference.range)) {
                continue;
            }
            if (Range.spansMultipleLines(newRange)) {
                ignore = true;
            }
            else {
                const lineLength = reference.range.endColumn - reference.range.startColumn;
                const newLineLength = newRange.endColumn - newRange.startColumn;
                if (lineLength !== newLineLength) {
                    ignore = true;
                }
            }
            if (ignore) {
                this._decorationIgnoreSet.add(reference.id);
                toRemove.push(decorationId);
            }
            else {
                reference.range = newRange;
            }
        }
        for (let i = 0, len = toRemove.length; i < len; i++) {
            this._decorations.delete(toRemove[i]);
        }
        this._editor.removeDecorations(toRemove);
    }
    removeDecorations() {
        this._editor.removeDecorations([...this._decorations.keys()]);
        this._decorations.clear();
    }
}
export class LayoutData {
    constructor() {
        this.ratio = 0.7;
        this.heightInLines = 18;
    }
    static fromJSON(raw) {
        let ratio;
        let heightInLines;
        try {
            const data = JSON.parse(raw);
            ratio = data.ratio;
            heightInLines = data.heightInLines;
        }
        catch {
            //
        }
        return {
            ratio: ratio || 0.7,
            heightInLines: heightInLines || 18
        };
    }
}
class ReferencesTree extends WorkbenchAsyncDataTree {
}
let ReferencesDragAndDrop = class ReferencesDragAndDrop {
    constructor(labelService) {
        this.labelService = labelService;
        this.disposables = new DisposableStore();
    }
    getDragURI(element) {
        if (element instanceof FileReferences) {
            return element.uri.toString();
        }
        else if (element instanceof OneReference) {
            return withSelection(element.uri, element.range).toString();
        }
        return null;
    }
    getDragLabel(elements) {
        if (elements.length === 0) {
            return undefined;
        }
        const labels = elements.map(e => this.labelService.getUriBasenameLabel(e.uri));
        return labels.join(', ');
    }
    onDragStart(data, originalEvent) {
        if (!originalEvent.dataTransfer) {
            return;
        }
        const elements = data.elements;
        const resources = elements.map(e => this.getDragURI(e)).filter(Boolean);
        if (resources.length) {
            // Apply resources as resource-list
            originalEvent.dataTransfer.setData(DataTransfers.RESOURCES, JSON.stringify(resources));
            // Also add as plain text for outside consumers
            originalEvent.dataTransfer.setData(DataTransfers.TEXT, resources.join('\n'));
        }
    }
    onDragOver() { return false; }
    drop() { }
    dispose() { this.disposables.dispose(); }
};
ReferencesDragAndDrop = __decorate([
    __param(0, ILabelService)
], ReferencesDragAndDrop);
/**
 * ZoneWidget that is shown inside the editor
 */
let ReferenceWidget = class ReferenceWidget extends peekView.PeekViewWidget {
    constructor(editor, _defaultTreeKeyboardSupport, layoutData, themeService, _textModelResolverService, _instantiationService, _peekViewService, _uriLabel, _keybindingService) {
        super(editor, { showFrame: false, showArrow: true, isResizeable: true, isAccessible: true, supportOnTitleClick: true }, _instantiationService);
        this._defaultTreeKeyboardSupport = _defaultTreeKeyboardSupport;
        this.layoutData = layoutData;
        this._textModelResolverService = _textModelResolverService;
        this._instantiationService = _instantiationService;
        this._peekViewService = _peekViewService;
        this._uriLabel = _uriLabel;
        this._keybindingService = _keybindingService;
        this._disposeOnNewModel = new DisposableStore();
        this._callOnDispose = new DisposableStore();
        this._onDidSelectReference = new Emitter();
        this.onDidSelectReference = this._onDidSelectReference.event;
        this._dim = new dom.Dimension(0, 0);
        this._isClosing = false; // whether or not a dispose is already in progress
        this._applyTheme(themeService.getColorTheme());
        this._callOnDispose.add(themeService.onDidColorThemeChange(this._applyTheme.bind(this)));
        this._peekViewService.addExclusiveWidget(editor, this);
        this.create();
    }
    get isClosing() {
        return this._isClosing;
    }
    dispose() {
        this._isClosing = true;
        this.setModel(undefined);
        this._callOnDispose.dispose();
        this._disposeOnNewModel.dispose();
        dispose(this._preview);
        dispose(this._previewNotAvailableMessage);
        dispose(this._tree);
        dispose(this._previewModelReference);
        this._splitView.dispose();
        super.dispose();
    }
    _applyTheme(theme) {
        const borderColor = theme.getColor(peekView.peekViewBorder) || Color.transparent;
        this.style({
            arrowColor: borderColor,
            frameColor: borderColor,
            headerBackgroundColor: theme.getColor(peekView.peekViewTitleBackground) || Color.transparent,
            primaryHeadingColor: theme.getColor(peekView.peekViewTitleForeground),
            secondaryHeadingColor: theme.getColor(peekView.peekViewTitleInfoForeground)
        });
    }
    show(where) {
        super.show(where, this.layoutData.heightInLines || 18);
    }
    focusOnReferenceTree() {
        this._tree.domFocus();
    }
    focusOnPreviewEditor() {
        this._preview.focus();
    }
    isPreviewEditorFocused() {
        return this._preview.hasTextFocus();
    }
    _onTitleClick(e) {
        if (this._preview && this._preview.getModel()) {
            this._onDidSelectReference.fire({
                element: this._getFocusedReference(),
                kind: e.ctrlKey || e.metaKey || e.altKey ? 'side' : 'open',
                source: 'title'
            });
        }
    }
    _fillBody(containerElement) {
        this.setCssClass('reference-zone-widget');
        // message pane
        this._messageContainer = dom.append(containerElement, dom.$('div.messages'));
        dom.hide(this._messageContainer);
        this._splitView = new SplitView(containerElement, { orientation: 1 /* Orientation.HORIZONTAL */ });
        // editor
        this._previewContainer = dom.append(containerElement, dom.$('div.preview.inline'));
        const options = {
            scrollBeyondLastLine: false,
            scrollbar: {
                verticalScrollbarSize: 14,
                horizontal: 'auto',
                useShadows: true,
                verticalHasArrows: false,
                horizontalHasArrows: false,
                alwaysConsumeMouseWheel: true
            },
            overviewRulerLanes: 2,
            fixedOverflowWidgets: true,
            minimap: {
                enabled: false
            }
        };
        this._preview = this._instantiationService.createInstance(EmbeddedCodeEditorWidget, this._previewContainer, options, {}, this.editor);
        dom.hide(this._previewContainer);
        this._previewNotAvailableMessage = this._instantiationService.createInstance(TextModel, nls.localize('missingPreviewMessage', "no preview available"), PLAINTEXT_LANGUAGE_ID, TextModel.DEFAULT_CREATION_OPTIONS, null);
        // tree
        this._treeContainer = dom.append(containerElement, dom.$('div.ref-tree.inline'));
        const treeOptions = {
            keyboardSupport: this._defaultTreeKeyboardSupport,
            accessibilityProvider: new AccessibilityProvider(),
            keyboardNavigationLabelProvider: this._instantiationService.createInstance(StringRepresentationProvider),
            identityProvider: new IdentityProvider(),
            openOnSingleClick: true,
            selectionNavigation: true,
            overrideStyles: {
                listBackground: peekView.peekViewResultsBackground
            },
            dnd: this._instantiationService.createInstance(ReferencesDragAndDrop)
        };
        if (this._defaultTreeKeyboardSupport) {
            // the tree will consume `Escape` and prevent the widget from closing
            this._callOnDispose.add(dom.addStandardDisposableListener(this._treeContainer, 'keydown', (e) => {
                if (e.equals(9 /* KeyCode.Escape */)) {
                    this._keybindingService.dispatchEvent(e, e.target);
                    e.stopPropagation();
                }
            }, true));
        }
        this._tree = this._instantiationService.createInstance(ReferencesTree, 'ReferencesWidget', this._treeContainer, new Delegate(), [
            this._instantiationService.createInstance(FileReferencesRenderer),
            this._instantiationService.createInstance(OneReferenceRenderer),
        ], this._instantiationService.createInstance(DataSource), treeOptions);
        // split stuff
        this._splitView.addView({
            onDidChange: Event.None,
            element: this._previewContainer,
            minimumSize: 200,
            maximumSize: Number.MAX_VALUE,
            layout: (width) => {
                this._preview.layout({ height: this._dim.height, width });
            }
        }, Sizing.Distribute);
        this._splitView.addView({
            onDidChange: Event.None,
            element: this._treeContainer,
            minimumSize: 100,
            maximumSize: Number.MAX_VALUE,
            layout: (width) => {
                this._treeContainer.style.height = `${this._dim.height}px`;
                this._treeContainer.style.width = `${width}px`;
                this._tree.layout(this._dim.height, width);
            }
        }, Sizing.Distribute);
        this._disposables.add(this._splitView.onDidSashChange(() => {
            if (this._dim.width) {
                this.layoutData.ratio = this._splitView.getViewSize(0) / this._dim.width;
            }
        }, undefined));
        // listen on selection and focus
        const onEvent = (element, kind) => {
            if (element instanceof OneReference) {
                if (kind === 'show') {
                    this._revealReference(element, false);
                }
                this._onDidSelectReference.fire({ element, kind, source: 'tree' });
            }
        };
        this._disposables.add(this._tree.onDidOpen(e => {
            if (e.sideBySide) {
                onEvent(e.element, 'side');
            }
            else if (e.editorOptions.pinned) {
                onEvent(e.element, 'goto');
            }
            else {
                onEvent(e.element, 'show');
            }
        }));
        dom.hide(this._treeContainer);
    }
    _onWidth(width) {
        if (this._dim) {
            this._doLayoutBody(this._dim.height, width);
        }
    }
    _doLayoutBody(heightInPixel, widthInPixel) {
        super._doLayoutBody(heightInPixel, widthInPixel);
        this._dim = new dom.Dimension(widthInPixel, heightInPixel);
        this.layoutData.heightInLines = this._viewZone ? this._viewZone.heightInLines : this.layoutData.heightInLines;
        this._splitView.layout(widthInPixel);
        this._splitView.resizeView(0, widthInPixel * this.layoutData.ratio);
    }
    setSelection(selection) {
        return this._revealReference(selection, true).then(() => {
            if (!this._model) {
                // disposed
                return;
            }
            // show in tree
            this._tree.setSelection([selection]);
            this._tree.setFocus([selection]);
        });
    }
    setModel(newModel) {
        // clean up
        this._disposeOnNewModel.clear();
        this._model = newModel;
        if (this._model) {
            return this._onNewModel();
        }
        return Promise.resolve();
    }
    _onNewModel() {
        if (!this._model) {
            return Promise.resolve(undefined);
        }
        if (this._model.isEmpty) {
            this.setTitle('');
            this._messageContainer.innerText = nls.localize('noResults', "No results");
            dom.show(this._messageContainer);
            return Promise.resolve(undefined);
        }
        dom.hide(this._messageContainer);
        this._decorationsManager = new DecorationsManager(this._preview, this._model);
        this._disposeOnNewModel.add(this._decorationsManager);
        // listen on model changes
        this._disposeOnNewModel.add(this._model.onDidChangeReferenceRange(reference => this._tree.rerender(reference)));
        // listen on editor
        this._disposeOnNewModel.add(this._preview.onMouseDown(e => {
            const { event, target } = e;
            if (event.detail !== 2) {
                return;
            }
            const element = this._getFocusedReference();
            if (!element) {
                return;
            }
            this._onDidSelectReference.fire({
                element: { uri: element.uri, range: target.range },
                kind: (event.ctrlKey || event.metaKey || event.altKey) ? 'side' : 'open',
                source: 'editor'
            });
        }));
        // make sure things are rendered
        this.container.classList.add('results-loaded');
        dom.show(this._treeContainer);
        dom.show(this._previewContainer);
        this._splitView.layout(this._dim.width);
        this.focusOnReferenceTree();
        // pick input and a reference to begin with
        return this._tree.setInput(this._model.groups.length === 1 ? this._model.groups[0] : this._model);
    }
    _getFocusedReference() {
        const [element] = this._tree.getFocus();
        if (element instanceof OneReference) {
            return element;
        }
        else if (element instanceof FileReferences) {
            if (element.children.length > 0) {
                return element.children[0];
            }
        }
        return undefined;
    }
    async revealReference(reference) {
        await this._revealReference(reference, false);
        this._onDidSelectReference.fire({ element: reference, kind: 'goto', source: 'tree' });
    }
    async _revealReference(reference, revealParent) {
        // check if there is anything to do...
        if (this._revealedReference === reference) {
            return;
        }
        this._revealedReference = reference;
        // Update widget header
        if (reference.uri.scheme !== Schemas.inMemory) {
            this.setTitle(basenameOrAuthority(reference.uri), this._uriLabel.getUriLabel(dirname(reference.uri)));
        }
        else {
            this.setTitle(nls.localize('peekView.alternateTitle', "References"));
        }
        const promise = this._textModelResolverService.createModelReference(reference.uri);
        if (this._tree.getInput() === reference.parent) {
            this._tree.reveal(reference);
        }
        else {
            if (revealParent) {
                this._tree.reveal(reference.parent);
            }
            await this._tree.expand(reference.parent);
            this._tree.reveal(reference);
        }
        const ref = await promise;
        if (!this._model) {
            // disposed
            ref.dispose();
            return;
        }
        dispose(this._previewModelReference);
        // show in editor
        const model = ref.object;
        if (model) {
            const scrollType = this._preview.getModel() === model.textEditorModel ? 0 /* ScrollType.Smooth */ : 1 /* ScrollType.Immediate */;
            const sel = Range.lift(reference.range).collapseToStart();
            this._previewModelReference = ref;
            this._preview.setModel(model.textEditorModel);
            this._preview.setSelection(sel);
            this._preview.revealRangeInCenter(sel, scrollType);
        }
        else {
            this._preview.setModel(this._previewNotAvailableMessage);
            ref.dispose();
        }
    }
};
ReferenceWidget = __decorate([
    __param(3, IThemeService),
    __param(4, ITextModelService),
    __param(5, IInstantiationService),
    __param(6, peekView.IPeekViewService),
    __param(7, ILabelService),
    __param(8, IKeybindingService)
], ReferenceWidget);
export { ReferenceWidget };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVmZXJlbmNlc1dpZGdldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhaGFtZWQvRGVza3RvcC9wdWt1LXZzLWVkaXRvci9wdWt1LWVkaXRvci9zcmMvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2dvdG9TeW1ib2wvYnJvd3Nlci9wZWVrL3JlZmVyZW5jZXNXaWRnZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQ0FBb0MsQ0FBQztBQUcxRCxPQUFPLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM1RCxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBR3JFLE9BQU8sRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUEyQixNQUFNLHlDQUF5QyxDQUFDO0FBQzVHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsT0FBTyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDdkYsT0FBTyx3QkFBd0IsQ0FBQztBQUVoQyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxtRUFBbUUsQ0FBQztBQUU3RyxPQUFPLEVBQVUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFHakUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLFNBQVMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBRTFGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQ3RGLE9BQU8sRUFBb0IsaUJBQWlCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNyRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBRSxzQkFBc0IsRUFBRSxnQkFBZ0IsRUFBRSxvQkFBb0IsRUFBRSw0QkFBNEIsRUFBZSxNQUFNLHFCQUFxQixDQUFDO0FBQzdMLE9BQU8sS0FBSyxRQUFRLE1BQU0sdUNBQXVDLENBQUM7QUFDbEUsT0FBTyxLQUFLLEdBQUcsTUFBTSx1QkFBdUIsQ0FBQztBQUM3QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUM3RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDOUUsT0FBTyxFQUFrQyxzQkFBc0IsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQzdILE9BQU8sRUFBZSxhQUFhLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUNsRyxPQUFPLEVBQUUsY0FBYyxFQUFFLFlBQVksRUFBbUIsTUFBTSx1QkFBdUIsQ0FBQztBQUV0RixPQUFPLEVBQUUsYUFBYSxFQUFvQixNQUFNLG9DQUFvQyxDQUFDO0FBRXJGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUVoRixNQUFNLGtCQUFrQjthQUVDLHNCQUFpQixHQUFHLHNCQUFzQixDQUFDLFFBQVEsQ0FBQztRQUMzRSxXQUFXLEVBQUUsc0JBQXNCO1FBQ25DLFVBQVUsNERBQW9EO1FBQzlELFNBQVMsRUFBRSxzQkFBc0I7S0FDakMsQ0FBQyxBQUp1QyxDQUl0QztJQU9ILFlBQW9CLE9BQW9CLEVBQVUsTUFBdUI7UUFBckQsWUFBTyxHQUFQLE9BQU8sQ0FBYTtRQUFVLFdBQU0sR0FBTixNQUFNLENBQWlCO1FBTGpFLGlCQUFZLEdBQUcsSUFBSSxHQUFHLEVBQXdCLENBQUM7UUFDL0MseUJBQW9CLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQztRQUNoQyxtQkFBYyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7UUFDdkMsdUJBQWtCLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUczRCxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDckYsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO0lBQ3hCLENBQUM7SUFFRCxPQUFPO1FBQ04sSUFBSSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2xDLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDOUIsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7SUFDMUIsQ0FBQztJQUVPLGVBQWU7UUFDdEIsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ2hDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDdEMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ1osT0FBTztRQUNSLENBQUM7UUFDRCxLQUFLLE1BQU0sR0FBRyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDMUMsSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxLQUFLLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQztnQkFDakQsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ2pDLE9BQU87WUFDUixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFTyxlQUFlLENBQUMsU0FBeUI7UUFDaEQsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQztZQUM5QixPQUFPO1FBQ1IsQ0FBQztRQUNELElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFL0csTUFBTSxjQUFjLEdBQTRCLEVBQUUsQ0FBQztRQUNuRCxNQUFNLHlCQUF5QixHQUFhLEVBQUUsQ0FBQztRQUUvQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsU0FBUyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQy9ELE1BQU0sWUFBWSxHQUFHLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDM0MsSUFBSSxJQUFJLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDO2dCQUNwRCxTQUFTO1lBQ1YsQ0FBQztZQUNELElBQUksWUFBWSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsS0FBSyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDO2dCQUM1RSxTQUFTO1lBQ1YsQ0FBQztZQUNELGNBQWMsQ0FBQyxJQUFJLENBQUM7Z0JBQ25CLEtBQUssRUFBRSxZQUFZLENBQUMsS0FBSztnQkFDekIsT0FBTyxFQUFFLGtCQUFrQixDQUFDLGlCQUFpQjthQUM3QyxDQUFDLENBQUM7WUFDSCx5QkFBeUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbkMsQ0FBQztRQUVELElBQUksQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxjQUFjLEVBQUUsRUFBRTtZQUNqRCxNQUFNLFdBQVcsR0FBRyxjQUFjLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1lBQ3hFLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQzdDLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsUUFBUSxDQUFDLHlCQUF5QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN6RixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRU8sb0JBQW9CO1FBQzNCLE1BQU0sUUFBUSxHQUFhLEVBQUUsQ0FBQztRQUU5QixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ3RDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNaLE9BQU87UUFDUixDQUFDO1FBRUQsS0FBSyxNQUFNLENBQUMsWUFBWSxFQUFFLFNBQVMsQ0FBQyxJQUFJLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUUzRCxNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsa0JBQWtCLENBQUMsWUFBWSxDQUFDLENBQUM7WUFFeEQsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUNmLFNBQVM7WUFDVixDQUFDO1lBRUQsSUFBSSxNQUFNLEdBQUcsS0FBSyxDQUFDO1lBQ25CLElBQUksS0FBSyxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsU0FBUyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ2xELFNBQVM7WUFFVixDQUFDO1lBRUQsSUFBSSxLQUFLLENBQUMsa0JBQWtCLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztnQkFDeEMsTUFBTSxHQUFHLElBQUksQ0FBQztZQUVmLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxNQUFNLFVBQVUsR0FBRyxTQUFTLENBQUMsS0FBSyxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQztnQkFDM0UsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLFNBQVMsR0FBRyxRQUFRLENBQUMsV0FBVyxDQUFDO2dCQUVoRSxJQUFJLFVBQVUsS0FBSyxhQUFhLEVBQUUsQ0FBQztvQkFDbEMsTUFBTSxHQUFHLElBQUksQ0FBQztnQkFDZixDQUFDO1lBQ0YsQ0FBQztZQUVELElBQUksTUFBTSxFQUFFLENBQUM7Z0JBQ1osSUFBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQzVDLFFBQVEsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDN0IsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLFNBQVMsQ0FBQyxLQUFLLEdBQUcsUUFBUSxDQUFDO1lBQzVCLENBQUM7UUFDRixDQUFDO1FBRUQsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3JELElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3ZDLENBQUM7UUFDRCxJQUFJLENBQUMsT0FBTyxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQzFDLENBQUM7SUFFRCxpQkFBaUI7UUFDaEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDOUQsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUMzQixDQUFDOztBQUdGLE1BQU0sT0FBTyxVQUFVO0lBQXZCO1FBQ0MsVUFBSyxHQUFXLEdBQUcsQ0FBQztRQUNwQixrQkFBYSxHQUFXLEVBQUUsQ0FBQztJQWlCNUIsQ0FBQztJQWZBLE1BQU0sQ0FBQyxRQUFRLENBQUMsR0FBVztRQUMxQixJQUFJLEtBQXlCLENBQUM7UUFDOUIsSUFBSSxhQUFpQyxDQUFDO1FBQ3RDLElBQUksQ0FBQztZQUNKLE1BQU0sSUFBSSxHQUFlLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDekMsS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUM7WUFDbkIsYUFBYSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUM7UUFDcEMsQ0FBQztRQUFDLE1BQU0sQ0FBQztZQUNSLEVBQUU7UUFDSCxDQUFDO1FBQ0QsT0FBTztZQUNOLEtBQUssRUFBRSxLQUFLLElBQUksR0FBRztZQUNuQixhQUFhLEVBQUUsYUFBYSxJQUFJLEVBQUU7U0FDbEMsQ0FBQztJQUNILENBQUM7Q0FDRDtBQVFELE1BQU0sY0FBZSxTQUFRLHNCQUFpRjtDQUFJO0FBRWxILElBQU0scUJBQXFCLEdBQTNCLE1BQU0scUJBQXFCO0lBSTFCLFlBQTJCLFlBQTRDO1FBQTNCLGlCQUFZLEdBQVosWUFBWSxDQUFlO1FBRnRELGdCQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztJQUVzQixDQUFDO0lBRTVFLFVBQVUsQ0FBQyxPQUFvQjtRQUM5QixJQUFJLE9BQU8sWUFBWSxjQUFjLEVBQUUsQ0FBQztZQUN2QyxPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDL0IsQ0FBQzthQUFNLElBQUksT0FBTyxZQUFZLFlBQVksRUFBRSxDQUFDO1lBQzVDLE9BQU8sYUFBYSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQzdELENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFRCxZQUFZLENBQUMsUUFBdUI7UUFDbkMsSUFBSSxRQUFRLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQzNCLE9BQU8sU0FBUyxDQUFDO1FBQ2xCLENBQUM7UUFDRCxNQUFNLE1BQU0sR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUMvRSxPQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDMUIsQ0FBQztJQUVELFdBQVcsQ0FBQyxJQUFzQixFQUFFLGFBQXdCO1FBQzNELElBQUksQ0FBQyxhQUFhLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDakMsT0FBTztRQUNSLENBQUM7UUFFRCxNQUFNLFFBQVEsR0FBSSxJQUE0RCxDQUFDLFFBQVEsQ0FBQztRQUN4RixNQUFNLFNBQVMsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUV4RSxJQUFJLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUN0QixtQ0FBbUM7WUFDbkMsYUFBYSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7WUFFdkYsK0NBQStDO1lBQy9DLGFBQWEsQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQzlFLENBQUM7SUFDRixDQUFDO0lBRUQsVUFBVSxLQUFzQyxPQUFPLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDL0QsSUFBSSxLQUFXLENBQUM7SUFDaEIsT0FBTyxLQUFXLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDO0NBQy9DLENBQUE7QUEzQ0sscUJBQXFCO0lBSWIsV0FBQSxhQUFhLENBQUE7R0FKckIscUJBQXFCLENBMkMxQjtBQUVEOztHQUVHO0FBQ0ksSUFBTSxlQUFlLEdBQXJCLE1BQU0sZUFBZ0IsU0FBUSxRQUFRLENBQUMsY0FBYztJQXNCM0QsWUFDQyxNQUFtQixFQUNYLDJCQUFvQyxFQUNyQyxVQUFzQixFQUNkLFlBQTJCLEVBQ3ZCLHlCQUE2RCxFQUN6RCxxQkFBNkQsRUFDekQsZ0JBQTRELEVBQ3hFLFNBQXlDLEVBQ3BDLGtCQUF1RDtRQUUzRSxLQUFLLENBQUMsTUFBTSxFQUFFLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLFlBQVksRUFBRSxJQUFJLEVBQUUsWUFBWSxFQUFFLElBQUksRUFBRSxtQkFBbUIsRUFBRSxJQUFJLEVBQUUsRUFBRSxxQkFBcUIsQ0FBQyxDQUFDO1FBVHZJLGdDQUEyQixHQUEzQiwyQkFBMkIsQ0FBUztRQUNyQyxlQUFVLEdBQVYsVUFBVSxDQUFZO1FBRU8sOEJBQXlCLEdBQXpCLHlCQUF5QixDQUFtQjtRQUN4QywwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1FBQ3hDLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBMkI7UUFDdkQsY0FBUyxHQUFULFNBQVMsQ0FBZTtRQUNuQix1QkFBa0IsR0FBbEIsa0JBQWtCLENBQW9CO1FBMUIzRCx1QkFBa0IsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBQzNDLG1CQUFjLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUV2QywwQkFBcUIsR0FBRyxJQUFJLE9BQU8sRUFBa0IsQ0FBQztRQUM5RCx5QkFBb0IsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsS0FBSyxDQUFDO1FBVXpELFNBQUksR0FBRyxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQy9CLGVBQVUsR0FBRyxLQUFLLENBQUMsQ0FBQyxrREFBa0Q7UUFlN0UsSUFBSSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQztRQUMvQyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3pGLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDdkQsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBQ2YsQ0FBQztJQUVELElBQUksU0FBUztRQUNaLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQztJQUN4QixDQUFDO0lBRVEsT0FBTztRQUNmLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDO1FBQ3ZCLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDekIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUM5QixJQUFJLENBQUMsa0JBQWtCLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDbEMsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN2QixPQUFPLENBQUMsSUFBSSxDQUFDLDJCQUEyQixDQUFDLENBQUM7UUFDMUMsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNwQixPQUFPLENBQUMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLENBQUM7UUFDckMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUMxQixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDakIsQ0FBQztJQUVPLFdBQVcsQ0FBQyxLQUFrQjtRQUNyQyxNQUFNLFdBQVcsR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsSUFBSSxLQUFLLENBQUMsV0FBVyxDQUFDO1FBQ2pGLElBQUksQ0FBQyxLQUFLLENBQUM7WUFDVixVQUFVLEVBQUUsV0FBVztZQUN2QixVQUFVLEVBQUUsV0FBVztZQUN2QixxQkFBcUIsRUFBRSxLQUFLLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLEtBQUssQ0FBQyxXQUFXO1lBQzVGLG1CQUFtQixFQUFFLEtBQUssQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLHVCQUF1QixDQUFDO1lBQ3JFLHFCQUFxQixFQUFFLEtBQUssQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLDJCQUEyQixDQUFDO1NBQzNFLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFUSxJQUFJLENBQUMsS0FBYTtRQUMxQixLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLGFBQWEsSUFBSSxFQUFFLENBQUMsQ0FBQztJQUN4RCxDQUFDO0lBRUQsb0JBQW9CO1FBQ25CLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUM7SUFDdkIsQ0FBQztJQUVELG9CQUFvQjtRQUNuQixJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ3ZCLENBQUM7SUFFRCxzQkFBc0I7UUFDckIsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSxDQUFDO0lBQ3JDLENBQUM7SUFFa0IsYUFBYSxDQUFDLENBQWM7UUFDOUMsSUFBSSxJQUFJLENBQUMsUUFBUSxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQztZQUMvQyxJQUFJLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDO2dCQUMvQixPQUFPLEVBQUUsSUFBSSxDQUFDLG9CQUFvQixFQUFFO2dCQUNwQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTTtnQkFDMUQsTUFBTSxFQUFFLE9BQU87YUFDZixDQUFDLENBQUM7UUFDSixDQUFDO0lBQ0YsQ0FBQztJQUVTLFNBQVMsQ0FBQyxnQkFBNkI7UUFDaEQsSUFBSSxDQUFDLFdBQVcsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO1FBRTFDLGVBQWU7UUFDZixJQUFJLENBQUMsaUJBQWlCLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7UUFDN0UsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUVqQyxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksU0FBUyxDQUFDLGdCQUFnQixFQUFFLEVBQUUsV0FBVyxnQ0FBd0IsRUFBRSxDQUFDLENBQUM7UUFFM0YsU0FBUztRQUNULElBQUksQ0FBQyxpQkFBaUIsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLGdCQUFnQixFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDO1FBQ25GLE1BQU0sT0FBTyxHQUFtQjtZQUMvQixvQkFBb0IsRUFBRSxLQUFLO1lBQzNCLFNBQVMsRUFBRTtnQkFDVixxQkFBcUIsRUFBRSxFQUFFO2dCQUN6QixVQUFVLEVBQUUsTUFBTTtnQkFDbEIsVUFBVSxFQUFFLElBQUk7Z0JBQ2hCLGlCQUFpQixFQUFFLEtBQUs7Z0JBQ3hCLG1CQUFtQixFQUFFLEtBQUs7Z0JBQzFCLHVCQUF1QixFQUFFLElBQUk7YUFDN0I7WUFDRCxrQkFBa0IsRUFBRSxDQUFDO1lBQ3JCLG9CQUFvQixFQUFFLElBQUk7WUFDMUIsT0FBTyxFQUFFO2dCQUNSLE9BQU8sRUFBRSxLQUFLO2FBQ2Q7U0FDRCxDQUFDO1FBQ0YsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsY0FBYyxDQUFDLHdCQUF3QixFQUFFLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN0SSxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1FBQ2pDLElBQUksQ0FBQywyQkFBMkIsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsY0FBYyxDQUFDLFNBQVMsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLHVCQUF1QixFQUFFLHNCQUFzQixDQUFDLEVBQUUscUJBQXFCLEVBQUUsU0FBUyxDQUFDLHdCQUF3QixFQUFFLElBQUksQ0FBQyxDQUFDO1FBRXhOLE9BQU87UUFDUCxJQUFJLENBQUMsY0FBYyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUM7UUFDakYsTUFBTSxXQUFXLEdBQTREO1lBQzVFLGVBQWUsRUFBRSxJQUFJLENBQUMsMkJBQTJCO1lBQ2pELHFCQUFxQixFQUFFLElBQUkscUJBQXFCLEVBQUU7WUFDbEQsK0JBQStCLEVBQUUsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGNBQWMsQ0FBQyw0QkFBNEIsQ0FBQztZQUN4RyxnQkFBZ0IsRUFBRSxJQUFJLGdCQUFnQixFQUFFO1lBQ3hDLGlCQUFpQixFQUFFLElBQUk7WUFDdkIsbUJBQW1CLEVBQUUsSUFBSTtZQUN6QixjQUFjLEVBQUU7Z0JBQ2YsY0FBYyxFQUFFLFFBQVEsQ0FBQyx5QkFBeUI7YUFDbEQ7WUFDRCxHQUFHLEVBQUUsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGNBQWMsQ0FBQyxxQkFBcUIsQ0FBQztTQUNyRSxDQUFDO1FBQ0YsSUFBSSxJQUFJLENBQUMsMkJBQTJCLEVBQUUsQ0FBQztZQUN0QyxxRUFBcUU7WUFDckUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLDZCQUE2QixDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUU7Z0JBQy9GLElBQUksQ0FBQyxDQUFDLE1BQU0sd0JBQWdCLEVBQUUsQ0FBQztvQkFDOUIsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGFBQWEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO29CQUNuRCxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUM7Z0JBQ3JCLENBQUM7WUFDRixDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNYLENBQUM7UUFDRCxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLENBQ3JELGNBQWMsRUFDZCxrQkFBa0IsRUFDbEIsSUFBSSxDQUFDLGNBQWMsRUFDbkIsSUFBSSxRQUFRLEVBQUUsRUFDZDtZQUNDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLENBQUMsc0JBQXNCLENBQUM7WUFDakUsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGNBQWMsQ0FBQyxvQkFBb0IsQ0FBQztTQUMvRCxFQUNELElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLENBQUMsVUFBVSxDQUFDLEVBQ3JELFdBQVcsQ0FDWCxDQUFDO1FBRUYsY0FBYztRQUNkLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDO1lBQ3ZCLFdBQVcsRUFBRSxLQUFLLENBQUMsSUFBSTtZQUN2QixPQUFPLEVBQUUsSUFBSSxDQUFDLGlCQUFpQjtZQUMvQixXQUFXLEVBQUUsR0FBRztZQUNoQixXQUFXLEVBQUUsTUFBTSxDQUFDLFNBQVM7WUFDN0IsTUFBTSxFQUFFLENBQUMsS0FBSyxFQUFFLEVBQUU7Z0JBQ2pCLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7WUFDM0QsQ0FBQztTQUNELEVBQUUsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBRXRCLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDO1lBQ3ZCLFdBQVcsRUFBRSxLQUFLLENBQUMsSUFBSTtZQUN2QixPQUFPLEVBQUUsSUFBSSxDQUFDLGNBQWM7WUFDNUIsV0FBVyxFQUFFLEdBQUc7WUFDaEIsV0FBVyxFQUFFLE1BQU0sQ0FBQyxTQUFTO1lBQzdCLE1BQU0sRUFBRSxDQUFDLEtBQUssRUFBRSxFQUFFO2dCQUNqQixJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sSUFBSSxDQUFDO2dCQUMzRCxJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsR0FBRyxLQUFLLElBQUksQ0FBQztnQkFDL0MsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDNUMsQ0FBQztTQUNELEVBQUUsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBRXRCLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFDLEdBQUcsRUFBRTtZQUMxRCxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ3JCLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDO1lBQzFFLENBQUM7UUFDRixDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQztRQUVmLGdDQUFnQztRQUNoQyxNQUFNLE9BQU8sR0FBRyxDQUFDLE9BQWdDLEVBQUUsSUFBOEIsRUFBRSxFQUFFO1lBQ3BGLElBQUksT0FBTyxZQUFZLFlBQVksRUFBRSxDQUFDO2dCQUNyQyxJQUFJLElBQUksS0FBSyxNQUFNLEVBQUUsQ0FBQztvQkFDckIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQztnQkFDdkMsQ0FBQztnQkFDRCxJQUFJLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQztZQUNwRSxDQUFDO1FBQ0YsQ0FBQyxDQUFDO1FBQ0YsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDOUMsSUFBSSxDQUFDLENBQUMsVUFBVSxFQUFFLENBQUM7Z0JBQ2xCLE9BQU8sQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQzVCLENBQUM7aUJBQU0sSUFBSSxDQUFDLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUNuQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQztZQUM1QixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsT0FBTyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDNUIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSixHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQztJQUMvQixDQUFDO0lBRWtCLFFBQVEsQ0FBQyxLQUFhO1FBQ3hDLElBQUksSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ2YsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQztRQUM3QyxDQUFDO0lBQ0YsQ0FBQztJQUVrQixhQUFhLENBQUMsYUFBcUIsRUFBRSxZQUFvQjtRQUMzRSxLQUFLLENBQUMsYUFBYSxDQUFDLGFBQWEsRUFBRSxZQUFZLENBQUMsQ0FBQztRQUNqRCxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxZQUFZLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFDM0QsSUFBSSxDQUFDLFVBQVUsQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDO1FBQzlHLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ3JDLElBQUksQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxZQUFZLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNyRSxDQUFDO0lBRUQsWUFBWSxDQUFDLFNBQXVCO1FBQ25DLE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFO1lBQ3ZELElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ2xCLFdBQVc7Z0JBQ1gsT0FBTztZQUNSLENBQUM7WUFDRCxlQUFlO1lBQ2YsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1lBQ3JDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztRQUNsQyxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxRQUFRLENBQUMsUUFBcUM7UUFDN0MsV0FBVztRQUNYLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNoQyxJQUFJLENBQUMsTUFBTSxHQUFHLFFBQVEsQ0FBQztRQUN2QixJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNqQixPQUFPLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUMzQixDQUFDO1FBQ0QsT0FBTyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDMUIsQ0FBQztJQUVPLFdBQVc7UUFDbEIsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNsQixPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDbkMsQ0FBQztRQUVELElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUN6QixJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ2xCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsWUFBWSxDQUFDLENBQUM7WUFDM0UsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQztZQUNqQyxPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDbkMsQ0FBQztRQUVELEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFDakMsSUFBSSxDQUFDLG1CQUFtQixHQUFHLElBQUksa0JBQWtCLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDOUUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FBQztRQUV0RCwwQkFBMEI7UUFDMUIsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLHlCQUF5QixDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRWhILG1CQUFtQjtRQUNuQixJQUFJLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ3pELE1BQU0sRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQzVCLElBQUksS0FBSyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDeEIsT0FBTztZQUNSLENBQUM7WUFDRCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztZQUM1QyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ2QsT0FBTztZQUNSLENBQUM7WUFDRCxJQUFJLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDO2dCQUMvQixPQUFPLEVBQUUsRUFBRSxHQUFHLEVBQUUsT0FBTyxDQUFDLEdBQUcsRUFBRSxLQUFLLEVBQUUsTUFBTSxDQUFDLEtBQU0sRUFBRTtnQkFDbkQsSUFBSSxFQUFFLENBQUMsS0FBSyxDQUFDLE9BQU8sSUFBSSxLQUFLLENBQUMsT0FBTyxJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNO2dCQUN4RSxNQUFNLEVBQUUsUUFBUTthQUNoQixDQUFDLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUosZ0NBQWdDO1FBQ2hDLElBQUksQ0FBQyxTQUFVLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ2hELEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQzlCLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFDakMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN4QyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztRQUU1QiwyQ0FBMkM7UUFDM0MsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ25HLENBQUM7SUFFTyxvQkFBb0I7UUFDM0IsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDeEMsSUFBSSxPQUFPLFlBQVksWUFBWSxFQUFFLENBQUM7WUFDckMsT0FBTyxPQUFPLENBQUM7UUFDaEIsQ0FBQzthQUFNLElBQUksT0FBTyxZQUFZLGNBQWMsRUFBRSxDQUFDO1lBQzlDLElBQUksT0FBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ2pDLE9BQU8sT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM1QixDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8sU0FBUyxDQUFDO0lBQ2xCLENBQUM7SUFFRCxLQUFLLENBQUMsZUFBZSxDQUFDLFNBQXVCO1FBQzVDLE1BQU0sSUFBSSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUM5QyxJQUFJLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDO0lBQ3ZGLENBQUM7SUFJTyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsU0FBdUIsRUFBRSxZQUFxQjtRQUU1RSxzQ0FBc0M7UUFDdEMsSUFBSSxJQUFJLENBQUMsa0JBQWtCLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDM0MsT0FBTztRQUNSLENBQUM7UUFDRCxJQUFJLENBQUMsa0JBQWtCLEdBQUcsU0FBUyxDQUFDO1FBRXBDLHVCQUF1QjtRQUN2QixJQUFJLFNBQVMsQ0FBQyxHQUFHLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUMvQyxJQUFJLENBQUMsUUFBUSxDQUFDLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN2RyxDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyx5QkFBeUIsRUFBRSxZQUFZLENBQUMsQ0FBQyxDQUFDO1FBQ3RFLENBQUM7UUFFRCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMseUJBQXlCLENBQUMsb0JBQW9CLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBRW5GLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsS0FBSyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDaEQsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDOUIsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLFlBQVksRUFBRSxDQUFDO2dCQUNsQixJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDckMsQ0FBQztZQUNELE1BQU0sSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQzFDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzlCLENBQUM7UUFFRCxNQUFNLEdBQUcsR0FBRyxNQUFNLE9BQU8sQ0FBQztRQUUxQixJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2xCLFdBQVc7WUFDWCxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDZCxPQUFPO1FBQ1IsQ0FBQztRQUVELE9BQU8sQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsQ0FBQztRQUVyQyxpQkFBaUI7UUFDakIsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQztRQUN6QixJQUFJLEtBQUssRUFBRSxDQUFDO1lBQ1gsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsS0FBSyxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUMsMkJBQW1CLENBQUMsNkJBQXFCLENBQUM7WUFDakgsTUFBTSxHQUFHLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDMUQsSUFBSSxDQUFDLHNCQUFzQixHQUFHLEdBQUcsQ0FBQztZQUNsQyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUM7WUFDOUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDaEMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDcEQsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsMkJBQTJCLENBQUMsQ0FBQztZQUN6RCxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDZixDQUFDO0lBQ0YsQ0FBQztDQUNELENBQUE7QUE5V1ksZUFBZTtJQTBCekIsV0FBQSxhQUFhLENBQUE7SUFDYixXQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxRQUFRLENBQUMsZ0JBQWdCLENBQUE7SUFDekIsV0FBQSxhQUFhLENBQUE7SUFDYixXQUFBLGtCQUFrQixDQUFBO0dBL0JSLGVBQWUsQ0E4VzNCIn0=