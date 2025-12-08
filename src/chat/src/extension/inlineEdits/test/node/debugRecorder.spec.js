"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
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
const fs = __importStar(require("fs/promises"));
const vitest_1 = require("vitest");
const path = __importStar(require("../../../../util/vs/base/common/path"));
const observableWorkspaceRecordingReplayer_1 = require("../../common/observableWorkspaceRecordingReplayer");
const debugRecorder_1 = require("../../node/debugRecorder");
(0, vitest_1.suite)('Debug recorder', () => {
    // like `Date.now()` but repeats the same time on every 4th invocation
    // eg 1 2 3 4 4 5 6 7 8 8 9 ...
    function createRepeatingGetNow() {
        let last = 0;
        let next = 1;
        return () => {
            const current = next;
            if (current % 4 !== 0 || last === current) {
                next += 1;
            }
            last = current;
            return current;
        };
    }
    (0, vitest_1.test)('enforce total ordering on events', async () => {
        function assertMonotonousTime(log) {
            let lastTime;
            for (const entry of log) {
                if (entry.kind === 'meta' || lastTime === undefined) {
                    continue;
                }
                (0, vitest_1.expect)(entry.time).toBeGreaterThan(lastTime);
                lastTime = entry.time;
            }
        }
        const recordingFileContents = await fs.readFile(path.join(__dirname, 'recordings/ChangePointToPoint3D.recording.w.json'), 'utf-8');
        const recordingInfo = JSON.parse(recordingFileContents);
        const replayer = new observableWorkspaceRecordingReplayer_1.ObservableWorkspaceRecordingReplayer(recordingInfo);
        const getNow = createRepeatingGetNow();
        const recorder = new debugRecorder_1.DebugRecorder(replayer.workspace, getNow);
        replayer.replay();
        const log = recorder.getRecentLog()?.filter(e => e.kind !== 'header')?.map(e => e.kind === 'setContent' ? { ...e, content: '<omitted>' } : ('relativePath' in e ? { ...e, relativePath: e.relativePath.replace('\\', '/') } : e));
        (0, vitest_1.assert)(log);
        assertMonotonousTime(log);
        (0, vitest_1.expect)(log).toMatchInlineSnapshot(`
			[
			  {
			    "id": 0,
			    "kind": "documentEncountered",
			    "relativePath": "src/point.ts",
			    "time": 1,
			  },
			  {
			    "content": "<omitted>",
			    "id": 0,
			    "kind": "setContent",
			    "time": 1,
			    "v": 1,
			  },
			  {
			    "id": 0,
			    "kind": "opened",
			    "time": 1,
			  },
			  {
			    "id": 0,
			    "kind": "selectionChanged",
			    "selection": [
			      [
			        0,
			        0,
			      ],
			    ],
			    "time": 2,
			  },
			  {
			    "id": 0,
			    "kind": "selectionChanged",
			    "selection": [
			      [
			        12,
			        12,
			      ],
			    ],
			    "time": 3,
			  },
			  {
			    "id": 0,
			    "kind": "selectionChanged",
			    "selection": [
			      [
			        12,
			        12,
			      ],
			    ],
			    "time": 4,
			  },
			  {
			    "edit": [
			      [
			        12,
			        12,
			        "3",
			      ],
			    ],
			    "id": 0,
			    "kind": "changed",
			    "time": 5,
			    "v": 5,
			  },
			  {
			    "id": 0,
			    "kind": "selectionChanged",
			    "selection": [
			      [
			        12,
			        12,
			      ],
			    ],
			    "time": 7,
			  },
			  {
			    "id": 0,
			    "kind": "selectionChanged",
			    "selection": [
			      [
			        13,
			        13,
			      ],
			    ],
			    "time": 8,
			  },
			  {
			    "id": 1,
			    "kind": "documentEncountered",
			    "relativePath": "package.json",
			    "time": 9,
			  },
			  {
			    "content": "<omitted>",
			    "id": 1,
			    "kind": "setContent",
			    "time": 9,
			    "v": 1,
			  },
			  {
			    "id": 1,
			    "kind": "opened",
			    "time": 9,
			  },
			  {
			    "id": 1,
			    "kind": "selectionChanged",
			    "selection": [
			      [
			        0,
			        0,
			      ],
			    ],
			    "time": 10,
			  },
			  {
			    "id": 1,
			    "kind": "selectionChanged",
			    "selection": [],
			    "time": 11,
			  },
			  {
			    "edit": [
			      [
			        13,
			        13,
			        "D",
			      ],
			    ],
			    "id": 0,
			    "kind": "changed",
			    "time": 12,
			    "v": 8,
			  },
			  {
			    "id": 0,
			    "kind": "selectionChanged",
			    "selection": [
			      [
			        13,
			        13,
			      ],
			    ],
			    "time": 14,
			  },
			  {
			    "id": 0,
			    "kind": "selectionChanged",
			    "selection": [
			      [
			        14,
			        14,
			      ],
			    ],
			    "time": 15,
			  },
			]
		`);
    });
});
//# sourceMappingURL=debugRecorder.spec.js.map