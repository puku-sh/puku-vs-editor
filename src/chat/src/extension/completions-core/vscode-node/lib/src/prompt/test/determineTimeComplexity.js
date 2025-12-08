"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.determineTimeComplexity = determineTimeComplexity;
// Candidate basis functions
const models = [
    { name: 'O(1)', type: 'sublinear', basis: _n => 1 },
    { name: 'O(log n)', type: 'sublinear', basis: n => Math.log(n) },
    { name: 'O(n)', type: 'linear', basis: n => n },
    { name: 'O(n log n)', type: 'linear', basis: n => n * Math.log(n) },
    { name: 'O(n^2)', type: 'superlinear', basis: n => n * n },
    { name: 'O(n^3)', type: 'superlinear', basis: n => n * n * n },
    { name: 'O(sqrt(n))', type: 'sublinear', basis: n => Math.sqrt(n) },
];
const constantComplexity = models.find(m => m.name === 'O(1)');
function determineTimeComplexity(data) {
    if (data.length < 2) {
        return {
            model: constantComplexity,
            coefficient: 0,
        };
    }
    let bestModel = constantComplexity;
    let bestError = Infinity;
    let bestC = 0;
    for (const model of models) {
        // Find best-fit coefficient C = sum(t_i Â· f_i) / sum(f_i^2)
        let num = 0;
        let den = 0;
        for (const { n, time } of data) {
            const f = model.basis(n);
            num += time * f;
            den += f * f;
        }
        const C = den > 0 ? num / den : 0;
        // Compute sum of squared errors
        let sse = 0;
        for (const { n, time } of data) {
            const pred = C * model.basis(n);
            sse += (time - pred) ** 2;
        }
        if (sse < bestError) {
            bestError = sse;
            bestModel = model;
            bestC = C;
        }
    }
    return {
        model: bestModel,
        coefficient: bestC,
    };
}
//# sourceMappingURL=determineTimeComplexity.js.map