/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { MarkerSeverity } from '../../../../platform/markers/common/markers.js';
export class TaskProblemMonitor extends Disposable {
    constructor() {
        super();
        this.terminalMarkerMap = new Map();
        this.terminalDisposables = new Map();
    }
    addTerminal(terminal, problemMatcher) {
        this.terminalMarkerMap.set(terminal.instanceId, {
            resources: new Map(),
            markers: new Map()
        });
        const store = new DisposableStore();
        this.terminalDisposables.set(terminal.instanceId, store);
        store.add(terminal.onDisposed(() => {
            this.terminalMarkerMap.delete(terminal.instanceId);
            this.terminalDisposables.get(terminal.instanceId)?.dispose();
            this.terminalDisposables.delete(terminal.instanceId);
        }));
        store.add(problemMatcher.onDidFindErrors((markers) => {
            const markerData = this.terminalMarkerMap.get(terminal.instanceId);
            if (markerData) {
                // Clear existing markers for a new set, otherwise older compilation
                // issues will be included
                markerData.markers.clear();
                markerData.resources.clear();
                for (const marker of markers) {
                    if (marker.severity === MarkerSeverity.Error) {
                        markerData.resources.set(marker.resource.toString(), marker.resource);
                        const markersForOwner = markerData.markers.get(marker.owner);
                        let markerMap = markersForOwner;
                        if (!markerMap) {
                            markerMap = new Map();
                            markerData.markers.set(marker.owner, markerMap);
                        }
                        markerMap.set(marker.resource.toString(), marker);
                        this.terminalMarkerMap.set(terminal.instanceId, markerData);
                    }
                }
            }
        }));
        store.add(problemMatcher.onDidRequestInvalidateLastMarker(() => {
            const markerData = this.terminalMarkerMap.get(terminal.instanceId);
            markerData?.markers.clear();
            markerData?.resources.clear();
            this.terminalMarkerMap.set(terminal.instanceId, {
                resources: new Map(),
                markers: new Map()
            });
        }));
    }
    /**
     * Gets the task problems for a specific terminal instance
     * @param instanceId The terminal instance ID
     * @returns Map of problem matchers to their resources and marker data, or undefined if no problems found
     */
    getTaskProblems(instanceId) {
        const markerData = this.terminalMarkerMap.get(instanceId);
        if (!markerData) {
            return undefined;
        }
        else if (markerData.markers.size === 0) {
            return new Map();
        }
        const result = new Map();
        for (const [owner, markersMap] of markerData.markers) {
            const resources = [];
            const markers = [];
            for (const [resource, marker] of markersMap) {
                resources.push(markerData.resources.get(resource));
                markers.push(marker);
            }
            result.set(owner, { resources, markers });
        }
        return result;
    }
}
//# sourceMappingURL=taskProblemMonitor.js.map