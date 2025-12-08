"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const assert = __importStar(require("assert"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const devContainerConfigGenerator_1 = require("../../src/extension/prompt/node/devContainerConfigGenerator");
const cancellation_1 = require("../../src/util/vs/base/common/cancellation");
const instantiation_1 = require("../../src/util/vs/platform/instantiation/common/instantiation");
const stest_1 = require("../base/stest");
let index;
async function loadIndex() {
    return index || (index = (async () => {
        const indexPath = path.join(__dirname, '../test/prompts/fixtures/devcontainer/devContainerIndex.json'); // Cached copy of https://containers.dev/static/devcontainer-index.json
        const index = JSON.parse(await fs.promises.readFile(indexPath, 'utf8'));
        const templates = index.collections
            .filter((c) => c.sourceInformation.repository === 'https://github.com/devcontainers/templates')
            .map((c) => c.templates)
            .flat()
            .map(({ id, name, description }) => ({ id, name, description }));
        const features = index.collections
            .filter((c) => c.sourceInformation.repository === 'https://github.com/devcontainers/features')
            .map((c) => c.features)
            .flat()
            .map(({ id, name, description }) => ({ id, name, description }));
        return {
            templates,
            features,
        };
    })());
}
(0, stest_1.ssuite)({ title: 'Dev Container Configuration', location: 'external' }, () => {
    const dataPath = path.join(__dirname, '../test/prompts/fixtures/devcontainer/devContainerConfigTestData.json');
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8')).slice(0, 11);
    for (let i = 0; i < data.length; i++) {
        const d = data[i];
        (0, stest_1.stest)({ description: `Suggests a devcontainer.json template (sample ${i})` }, async (testingServiceCollection) => {
            const accessor = testingServiceCollection.createTestingAccessor();
            const instantiationService = accessor.get(instantiation_1.IInstantiationService);
            const generator = instantiationService.createInstance(devContainerConfigGenerator_1.DevContainerConfigGenerator);
            const result = await generator.generate(await loadIndex(), d.files, cancellation_1.CancellationToken.None);
            assert.strictEqual(result.type, 'success');
            assert.strictEqual(result.template, d.template);
        });
        (0, stest_1.stest)({ description: `Suggests devcontainer.json features (sample ${i})` }, async (testingServiceCollection) => {
            const accessor = testingServiceCollection.createTestingAccessor();
            const instantiationService = accessor.get(instantiation_1.IInstantiationService);
            const generator = instantiationService.createInstance(devContainerConfigGenerator_1.DevContainerConfigGenerator);
            const result = await generator.generate(await loadIndex(), d.files, cancellation_1.CancellationToken.None);
            assert.strictEqual(result.type, 'success');
            assert.ok(result.features.find(f => d.features.includes(f)));
        });
    }
    // // npm run simulate -- --grep=devcontainer.json --n=1
    // stest({ description: `Suggests a devcontainer.json template` }, async (testingServiceCollection) => {
    // 	const dataPath = path.join(__dirname, '../test/prompts/fixtures/devcontainer/devContainerConfigTestData.json');
    // 	const data = JSON.parse(await fs.promises.readFile(dataPath, 'utf8')).slice(0, 11);
    // 	const results = [];
    // 	for (let i = 0; i < data.length; i++) {
    // 		const generator = new DevContainerConfigGenerator(accessor);
    // 		const result = await generator.generate(await loadIndex(), data[i].files, CancellationToken.None);
    // 		assert.strictEqual(result.type, 'success');
    // 		results.push({
    // 			...data[i],
    // 			suggestedTemplate: result.template,
    // 			suggestedFeatures: result.features,
    // 		});
    // 	}
    // 	await fs.promises.writeFile(path.join(__dirname, '../test/prompts/devContainerConfigTestResults.json'), JSON.stringify(results, null, 4));
    // });
});
//# sourceMappingURL=devContainerConfigGenerator.stest.js.map