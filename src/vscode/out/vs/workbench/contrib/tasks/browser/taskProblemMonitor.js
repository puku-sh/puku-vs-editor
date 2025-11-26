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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFza1Byb2JsZW1Nb25pdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FoYW1lZC9EZXNrdG9wL3B1a3UtdnMtZWRpdG9yL3B1a3UtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGFza3MvYnJvd3Nlci90YXNrUHJvYmxlbU1vbml0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUluRixPQUFPLEVBQWUsY0FBYyxFQUEwQixNQUFNLGdEQUFnRCxDQUFDO0FBT3JILE1BQU0sT0FBTyxrQkFBbUIsU0FBUSxVQUFVO0lBS2pEO1FBQ0MsS0FBSyxFQUFFLENBQUM7UUFKUSxzQkFBaUIsR0FBcUMsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUNoRSx3QkFBbUIsR0FBaUMsSUFBSSxHQUFHLEVBQUUsQ0FBQztJQUkvRSxDQUFDO0lBRUQsV0FBVyxDQUFDLFFBQTJCLEVBQUUsY0FBd0M7UUFDaEYsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFO1lBQy9DLFNBQVMsRUFBRSxJQUFJLEdBQUcsRUFBZTtZQUNqQyxPQUFPLEVBQUUsSUFBSSxHQUFHLEVBQW9DO1NBQ3BELENBQUMsQ0FBQztRQUVILE1BQU0sS0FBSyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7UUFDcEMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXpELEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUU7WUFDbEMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDbkQsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEVBQUUsT0FBTyxFQUFFLENBQUM7WUFDN0QsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDdEQsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVKLEtBQUssQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLGVBQWUsQ0FBQyxDQUFDLE9BQXNCLEVBQUUsRUFBRTtZQUNuRSxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUNuRSxJQUFJLFVBQVUsRUFBRSxDQUFDO2dCQUNoQixvRUFBb0U7Z0JBQ3BFLDBCQUEwQjtnQkFDMUIsVUFBVSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDM0IsVUFBVSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFFN0IsS0FBSyxNQUFNLE1BQU0sSUFBSSxPQUFPLEVBQUUsQ0FBQztvQkFDOUIsSUFBSSxNQUFNLENBQUMsUUFBUSxLQUFLLGNBQWMsQ0FBQyxLQUFLLEVBQUUsQ0FBQzt3QkFDOUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsRUFBRSxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7d0JBQ3RFLE1BQU0sZUFBZSxHQUFHLFVBQVUsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQzt3QkFDN0QsSUFBSSxTQUFTLEdBQUcsZUFBZSxDQUFDO3dCQUNoQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7NEJBQ2hCLFNBQVMsR0FBRyxJQUFJLEdBQUcsRUFBRSxDQUFDOzRCQUN0QixVQUFVLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFDO3dCQUNqRCxDQUFDO3dCQUNELFNBQVMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsRUFBRSxNQUFNLENBQUMsQ0FBQzt3QkFDbEQsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLFVBQVUsQ0FBQyxDQUFDO29CQUM3RCxDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNKLEtBQUssQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLGdDQUFnQyxDQUFDLEdBQUcsRUFBRTtZQUM5RCxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUNuRSxVQUFVLEVBQUUsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQzVCLFVBQVUsRUFBRSxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDOUIsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFO2dCQUMvQyxTQUFTLEVBQUUsSUFBSSxHQUFHLEVBQWU7Z0JBQ2pDLE9BQU8sRUFBRSxJQUFJLEdBQUcsRUFBb0M7YUFDcEQsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFRDs7OztPQUlHO0lBQ0ksZUFBZSxDQUFDLFVBQWtCO1FBQ3hDLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDMUQsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ2pCLE9BQU8sU0FBUyxDQUFDO1FBQ2xCLENBQUM7YUFBTSxJQUFJLFVBQVUsQ0FBQyxPQUFPLENBQUMsSUFBSSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQzFDLE9BQU8sSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUNsQixDQUFDO1FBRUQsTUFBTSxNQUFNLEdBQUcsSUFBSSxHQUFHLEVBQXdELENBQUM7UUFDL0UsS0FBSyxNQUFNLENBQUMsS0FBSyxFQUFFLFVBQVUsQ0FBQyxJQUFJLFVBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUN0RCxNQUFNLFNBQVMsR0FBVSxFQUFFLENBQUM7WUFDNUIsTUFBTSxPQUFPLEdBQWtCLEVBQUUsQ0FBQztZQUNsQyxLQUFLLE1BQU0sQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLElBQUksVUFBVSxFQUFFLENBQUM7Z0JBQzdDLFNBQVMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFFLENBQUMsQ0FBQztnQkFDcEQsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN0QixDQUFDO1lBQ0QsTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQztRQUMzQyxDQUFDO1FBQ0QsT0FBTyxNQUFNLENBQUM7SUFDZixDQUFDO0NBQ0QifQ==