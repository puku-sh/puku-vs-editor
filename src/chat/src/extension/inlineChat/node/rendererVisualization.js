"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.VisualizationTestRun = exports.RendererVisualizations = void 0;
class RendererVisualizations {
    static getIfVisualizationTestIsRunning() {
        if (VisualizationTestRun.instance) {
            return new RendererVisualizations();
        }
        return undefined;
    }
    /**
     * Exposes the rendering to the visualization extension.
     * Also overrides the render method so that we can show the tree once rendering is done.
    */
    decorateAndRegister(renderer, label) {
        let first = false;
        renderer.render = async function (...args) {
            const result = await Object.getPrototypeOf(renderer).render.apply(this, ...args);
            if (!first) {
                first = true;
                new RendererVisualization(renderer, label);
                VisualizationTestRun.instance?.reload();
            }
            return result;
        };
        return renderer;
    }
}
exports.RendererVisualizations = RendererVisualizations;
/**
 * Describes the visualization of a prompt renderer.
 * Only used for debugging.
*/
class RendererVisualization {
    constructor(_renderer, label) {
        this._renderer = _renderer;
        VisualizationTestRun.instance?.addData(`Prompt ${label}`, () => this.getData());
    }
    getData() {
        class RenderedNode {
            constructor(label, children, range) {
                this.label = label;
                this.children = children;
                this.range = range;
                if (!range) {
                    const childrenRanges = children.map(c => c.range).filter(r => !!r);
                    if (childrenRanges.length > 0) {
                        range = [Number.MAX_SAFE_INTEGER, 0];
                        for (const crange of childrenRanges) {
                            range[0] = Math.min(range[0], crange[0]);
                            range[1] = Math.max(range[1], crange[1]);
                        }
                        this.range = range;
                    }
                }
            }
            toObj() {
                return {
                    label: this.label,
                    codicon: (this.label === 'Text' || this.label === 'LineBreak') ? 'text-size' : 'symbol-class',
                    range: this.range,
                    children: this.children.map(c => c.toObj()),
                };
            }
        }
        const data = this._renderer;
        let promptResult = '';
        function walk(item) {
            if (item.kind === 0 /* Piece */) {
                const messageClasses = [
                    'SystemMessage',
                    'UserMessage',
                    'AssistantMessage',
                ];
                const ctorName = item['_obj'].constructor.name;
                if (messageClasses.some(c => ctorName.indexOf(c) !== -1)) {
                    promptResult += `\n======== ${ctorName} ========\n`;
                }
                const children = item['_children'].map(c => walk(c)).filter(c => c.label !== 'LineBreak');
                return new RenderedNode(ctorName, children, undefined);
            }
            else if (item.kind === 1 /* Text */) {
                const start = promptResult.length;
                promptResult = promptResult + item.text;
                return new RenderedNode('Text', [], [start, promptResult.length]);
            }
            else if (item.kind === 2 /* LineBreak */) {
                const start = promptResult.length;
                promptResult = promptResult + '\n';
                return new RenderedNode('LineBreak', [], [start, promptResult.length]);
            }
            throw new Error();
        }
        const n = walk(data['_root']);
        const d = {
            root: n.toObj(),
            source: promptResult,
            ...{ $fileExtension: 'ast.w' },
        };
        return d;
    }
}
class VisualizationTestRun {
    static { this._instance = undefined; }
    static get instance() { return this._instance; }
    static startRun() {
        this._instance = new VisualizationTestRun();
    }
    constructor() {
        this.g = globalThis;
        this._data = [];
        this._knownLabels = new Set();
        this.g.$$debugValueEditor_properties = [];
    }
    addData(label, getData, suffix, property) {
        const propertyName = 'debugValueProperty###' + label;
        globalThis[propertyName] = () => {
            const data = getData();
            if (suffix) {
                return { [suffix]: data };
            }
            return data;
        };
        if (!this._knownLabels.has(propertyName)) {
            this._knownLabels.add(propertyName);
            const suffixStr = suffix ? `.${suffix}` : '';
            this._data = [...this._data, { label, expression: `globalThis[${JSON.stringify(propertyName)}]()${suffixStr}${property ?? ''}` }];
            this.g.$$debugValueEditor_properties = this._data;
        }
        else {
            this.g.$$debugValueEditor_refresh?.('{}');
        }
    }
    reload() {
        this.g.$$debugValueEditor_refresh?.('{}');
    }
}
exports.VisualizationTestRun = VisualizationTestRun;
//# sourceMappingURL=rendererVisualization.js.map