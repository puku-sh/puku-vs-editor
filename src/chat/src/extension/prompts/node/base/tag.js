"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tag = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
class Tag extends prompt_tsx_1.PromptElement {
    static { this._regex = /^[a-zA-Z_][\w\.\-]*$/; }
    render() {
        const { name, children, attrs = {} } = this.props;
        if (!Tag._regex.test(name)) {
            throw new Error(`Invalid tag name: ${this.props.name}`);
        }
        let attrStr = '';
        for (const [key, value] of Object.entries(attrs)) {
            if (value !== undefined) {
                attrStr += ` ${key}=${JSON.stringify(value)}`;
            }
        }
        if (children?.length === 0) {
            if (!attrStr) {
                return null;
            }
            return vscpp(prompt_tsx_1.TextChunk, null, `<${name}${attrStr} />`);
        }
        const KeepWith = (0, prompt_tsx_1.useKeepWith)();
        return (vscpp(vscppf, null,
            vscpp(KeepWith, null, `<${name}${attrStr}>\n`),
            vscpp(TagInner, { priority: 1, flexGrow: 1 },
                children,
                vscpp("br", null)),
            vscpp(KeepWith, null, `</${name}>`),
            vscpp("br", null)));
    }
}
exports.Tag = Tag;
class TagInner extends prompt_tsx_1.PromptElement {
    render() {
        return vscpp(vscppf, null, this.props.children);
    }
}
//# sourceMappingURL=tag.js.map