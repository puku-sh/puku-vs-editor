"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeSettable = makeSettable;
const observable_1 = require("../../../../util/vs/base/common/observable");
function makeSettable(obs) {
    const overrideObs = (0, observable_1.observableValue)('overrideObs', undefined);
    return (0, observable_1.derivedWithSetter)(overrideObs, (reader) => {
        return overrideObs.read(reader) ?? obs.read(reader);
    }, (value, tx) => {
        overrideObs.set(value, tx);
    });
}
//# sourceMappingURL=observablesUtils.js.map