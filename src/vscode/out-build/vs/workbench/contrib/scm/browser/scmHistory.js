/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
import { deepClone } from '../../../../base/common/objects.js';
import { badgeBackground, chartsBlue, chartsPurple, foreground } from '../../../../platform/theme/common/colorRegistry.js';
import { asCssVariable, registerColor } from '../../../../platform/theme/common/colorUtils.js';
import { SCMIncomingHistoryItemId, SCMOutgoingHistoryItemId } from '../common/history.js';
import { rot } from '../../../../base/common/numbers.js';
import { svgElem } from '../../../../base/browser/dom.js';
import { PANEL_BACKGROUND } from '../../../common/theme.js';
export const SWIMLANE_HEIGHT = 22;
export const SWIMLANE_WIDTH = 11;
const SWIMLANE_CURVE_RADIUS = 5;
const CIRCLE_RADIUS = 4;
const CIRCLE_STROKE_WIDTH = 2;
/**
 * History item reference colors (local, remote, base)
 */
export const historyItemRefColor = registerColor('scmGraph.historyItemRefColor', chartsBlue, localize(11583, null));
export const historyItemRemoteRefColor = registerColor('scmGraph.historyItemRemoteRefColor', chartsPurple, localize(11584, null));
export const historyItemBaseRefColor = registerColor('scmGraph.historyItemBaseRefColor', '#EA5C00', localize(11585, null));
/**
 * History item hover color
 */
export const historyItemHoverDefaultLabelForeground = registerColor('scmGraph.historyItemHoverDefaultLabelForeground', foreground, localize(11586, null));
export const historyItemHoverDefaultLabelBackground = registerColor('scmGraph.historyItemHoverDefaultLabelBackground', badgeBackground, localize(11587, null));
export const historyItemHoverLabelForeground = registerColor('scmGraph.historyItemHoverLabelForeground', PANEL_BACKGROUND, localize(11588, null));
export const historyItemHoverAdditionsForeground = registerColor('scmGraph.historyItemHoverAdditionsForeground', { light: '#587C0C', dark: '#81B88B', hcDark: '#A1E3AD', hcLight: '#374E06' }, localize(11589, null));
export const historyItemHoverDeletionsForeground = registerColor('scmGraph.historyItemHoverDeletionsForeground', { light: '#AD0707', dark: '#C74E39', hcDark: '#C74E39', hcLight: '#AD0707' }, localize(11590, null));
/**
 * History graph color registry
 */
export const colorRegistry = [
    registerColor('scmGraph.foreground1', '#FFB000', localize(11591, null)),
    registerColor('scmGraph.foreground2', '#DC267F', localize(11592, null)),
    registerColor('scmGraph.foreground3', '#994F00', localize(11593, null)),
    registerColor('scmGraph.foreground4', '#40B0A6', localize(11594, null)),
    registerColor('scmGraph.foreground5', '#B66DFF', localize(11595, null)),
];
function getLabelColorIdentifier(historyItem, colorMap) {
    if (historyItem.id === SCMIncomingHistoryItemId) {
        return historyItemRemoteRefColor;
    }
    else if (historyItem.id === SCMOutgoingHistoryItemId) {
        return historyItemRefColor;
    }
    else {
        for (const ref of historyItem.references ?? []) {
            const colorIdentifier = colorMap.get(ref.id);
            if (colorIdentifier !== undefined) {
                return colorIdentifier;
            }
        }
    }
    return undefined;
}
function createPath(colorIdentifier, strokeWidth = 1) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke-width', `${strokeWidth}px`);
    path.setAttribute('stroke-linecap', 'round');
    path.style.stroke = asCssVariable(colorIdentifier);
    return path;
}
function drawCircle(index, radius, strokeWidth, colorIdentifier) {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', `${SWIMLANE_WIDTH * (index + 1)}`);
    circle.setAttribute('cy', `${SWIMLANE_WIDTH}`);
    circle.setAttribute('r', `${radius}`);
    circle.style.strokeWidth = `${strokeWidth}px`;
    if (colorIdentifier) {
        circle.style.fill = asCssVariable(colorIdentifier);
    }
    return circle;
}
function drawDashedCircle(index, radius, strokeWidth, colorIdentifier) {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', `${SWIMLANE_WIDTH * (index + 1)}`);
    circle.setAttribute('cy', `${SWIMLANE_WIDTH}`);
    circle.setAttribute('r', `${CIRCLE_RADIUS + 1}`);
    circle.style.stroke = asCssVariable(colorIdentifier);
    circle.style.strokeWidth = `${strokeWidth}px`;
    circle.style.strokeDasharray = '4,2';
    return circle;
}
function drawVerticalLine(x1, y1, y2, color, strokeWidth = 1) {
    const path = createPath(color, strokeWidth);
    path.setAttribute('d', `M ${x1} ${y1} V ${y2}`);
    return path;
}
function findLastIndex(nodes, id) {
    for (let i = nodes.length - 1; i >= 0; i--) {
        if (nodes[i].id === id) {
            return i;
        }
    }
    return -1;
}
export function renderSCMHistoryItemGraph(historyItemViewModel) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('graph');
    const historyItem = historyItemViewModel.historyItem;
    const inputSwimlanes = historyItemViewModel.inputSwimlanes;
    const outputSwimlanes = historyItemViewModel.outputSwimlanes;
    // Find the history item in the input swimlanes
    const inputIndex = inputSwimlanes.findIndex(node => node.id === historyItem.id);
    // Circle index - use the input swimlane index if present, otherwise add it to the end
    const circleIndex = inputIndex !== -1 ? inputIndex : inputSwimlanes.length;
    // Circle color - use the output swimlane color if present, otherwise the input swimlane color
    const circleColor = circleIndex < outputSwimlanes.length ? outputSwimlanes[circleIndex].color :
        circleIndex < inputSwimlanes.length ? inputSwimlanes[circleIndex].color : historyItemRefColor;
    let outputSwimlaneIndex = 0;
    for (let index = 0; index < inputSwimlanes.length; index++) {
        const color = inputSwimlanes[index].color;
        // Current commit
        if (inputSwimlanes[index].id === historyItem.id) {
            // Base commit
            if (index !== circleIndex) {
                const d = [];
                const path = createPath(color);
                // Draw /
                d.push(`M ${SWIMLANE_WIDTH * (index + 1)} 0`);
                d.push(`A ${SWIMLANE_WIDTH} ${SWIMLANE_WIDTH} 0 0 1 ${SWIMLANE_WIDTH * (index)} ${SWIMLANE_WIDTH}`);
                // Draw -
                d.push(`H ${SWIMLANE_WIDTH * (circleIndex + 1)}`);
                path.setAttribute('d', d.join(' '));
                svg.append(path);
            }
            else {
                outputSwimlaneIndex++;
            }
        }
        else {
            // Not the current commit
            if (outputSwimlaneIndex < outputSwimlanes.length &&
                inputSwimlanes[index].id === outputSwimlanes[outputSwimlaneIndex].id) {
                if (index === outputSwimlaneIndex) {
                    // Draw |
                    const path = drawVerticalLine(SWIMLANE_WIDTH * (index + 1), 0, SWIMLANE_HEIGHT, color);
                    svg.append(path);
                }
                else {
                    const d = [];
                    const path = createPath(color);
                    // Draw |
                    d.push(`M ${SWIMLANE_WIDTH * (index + 1)} 0`);
                    d.push(`V 6`);
                    // Draw /
                    d.push(`A ${SWIMLANE_CURVE_RADIUS} ${SWIMLANE_CURVE_RADIUS} 0 0 1 ${(SWIMLANE_WIDTH * (index + 1)) - SWIMLANE_CURVE_RADIUS} ${SWIMLANE_HEIGHT / 2}`);
                    // Draw -
                    d.push(`H ${(SWIMLANE_WIDTH * (outputSwimlaneIndex + 1)) + SWIMLANE_CURVE_RADIUS}`);
                    // Draw /
                    d.push(`A ${SWIMLANE_CURVE_RADIUS} ${SWIMLANE_CURVE_RADIUS} 0 0 0 ${SWIMLANE_WIDTH * (outputSwimlaneIndex + 1)} ${(SWIMLANE_HEIGHT / 2) + SWIMLANE_CURVE_RADIUS}`);
                    // Draw |
                    d.push(`V ${SWIMLANE_HEIGHT}`);
                    path.setAttribute('d', d.join(' '));
                    svg.append(path);
                }
                outputSwimlaneIndex++;
            }
        }
    }
    // Add remaining parent(s)
    for (let i = 1; i < historyItem.parentIds.length; i++) {
        const parentOutputIndex = findLastIndex(outputSwimlanes, historyItem.parentIds[i]);
        if (parentOutputIndex === -1) {
            continue;
        }
        // Draw -\
        const d = [];
        const path = createPath(outputSwimlanes[parentOutputIndex].color);
        // Draw \
        d.push(`M ${SWIMLANE_WIDTH * parentOutputIndex} ${SWIMLANE_HEIGHT / 2}`);
        d.push(`A ${SWIMLANE_WIDTH} ${SWIMLANE_WIDTH} 0 0 1 ${SWIMLANE_WIDTH * (parentOutputIndex + 1)} ${SWIMLANE_HEIGHT}`);
        // Draw -
        d.push(`M ${SWIMLANE_WIDTH * parentOutputIndex} ${SWIMLANE_HEIGHT / 2}`);
        d.push(`H ${SWIMLANE_WIDTH * (circleIndex + 1)} `);
        path.setAttribute('d', d.join(' '));
        svg.append(path);
    }
    // Draw | to *
    if (inputIndex !== -1) {
        const path = drawVerticalLine(SWIMLANE_WIDTH * (circleIndex + 1), 0, SWIMLANE_HEIGHT / 2, inputSwimlanes[inputIndex].color);
        svg.append(path);
    }
    // Draw | from *
    if (historyItem.parentIds.length > 0) {
        const path = drawVerticalLine(SWIMLANE_WIDTH * (circleIndex + 1), SWIMLANE_HEIGHT / 2, SWIMLANE_HEIGHT, circleColor);
        svg.append(path);
    }
    // Draw *
    if (historyItemViewModel.kind === 'HEAD') {
        // HEAD
        const outerCircle = drawCircle(circleIndex, CIRCLE_RADIUS + 3, CIRCLE_STROKE_WIDTH, circleColor);
        svg.append(outerCircle);
        const innerCircle = drawCircle(circleIndex, CIRCLE_STROKE_WIDTH, CIRCLE_RADIUS);
        svg.append(innerCircle);
    }
    else if (historyItemViewModel.kind === 'incoming-changes' || historyItemViewModel.kind === 'outgoing-changes') {
        // Incoming/Outgoing changes
        const outerCircle = drawCircle(circleIndex, CIRCLE_RADIUS + 3, CIRCLE_STROKE_WIDTH, circleColor);
        svg.append(outerCircle);
        const innerCircle = drawCircle(circleIndex, CIRCLE_RADIUS + 1, CIRCLE_STROKE_WIDTH + 1);
        svg.append(innerCircle);
        const dashedCircle = drawDashedCircle(circleIndex, CIRCLE_RADIUS + 1, CIRCLE_STROKE_WIDTH - 1, circleColor);
        svg.append(dashedCircle);
    }
    else {
        if (historyItem.parentIds.length > 1) {
            // Multi-parent node
            const circleOuter = drawCircle(circleIndex, CIRCLE_RADIUS + 2, CIRCLE_STROKE_WIDTH, circleColor);
            svg.append(circleOuter);
            const circleInner = drawCircle(circleIndex, CIRCLE_RADIUS - 1, CIRCLE_STROKE_WIDTH, circleColor);
            svg.append(circleInner);
        }
        else {
            // Node
            const circle = drawCircle(circleIndex, CIRCLE_RADIUS + 1, CIRCLE_STROKE_WIDTH, circleColor);
            svg.append(circle);
        }
    }
    // Set dimensions
    svg.style.height = `${SWIMLANE_HEIGHT}px`;
    svg.style.width = `${SWIMLANE_WIDTH * (Math.max(inputSwimlanes.length, outputSwimlanes.length, 1) + 1)}px`;
    return svg;
}
export function renderSCMHistoryGraphPlaceholder(columns, highlightIndex) {
    const elements = svgElem('svg', {
        style: { height: `${SWIMLANE_HEIGHT}px`, width: `${SWIMLANE_WIDTH * (columns.length + 1)}px`, }
    });
    // Draw |
    for (let index = 0; index < columns.length; index++) {
        const strokeWidth = index === highlightIndex ? 3 : 1;
        const path = drawVerticalLine(SWIMLANE_WIDTH * (index + 1), 0, SWIMLANE_HEIGHT, columns[index].color, strokeWidth);
        elements.root.append(path);
    }
    return elements.root;
}
export function toISCMHistoryItemViewModelArray(historyItems, colorMap = new Map(), currentHistoryItemRef, currentHistoryItemRemoteRef, currentHistoryItemBaseRef, addIncomingChanges, addOutgoingChanges, mergeBase) {
    let colorIndex = -1;
    const viewModels = [];
    // Add incoming/outgoing changes history items
    addIncomingOutgoingChangesHistoryItems(historyItems, currentHistoryItemRef, currentHistoryItemRemoteRef, addIncomingChanges, addOutgoingChanges, mergeBase);
    for (let index = 0; index < historyItems.length; index++) {
        const historyItem = historyItems[index];
        const kind = getHistoryItemViewModelKind(historyItem, currentHistoryItemRef);
        const outputSwimlanesFromPreviousItem = viewModels.at(-1)?.outputSwimlanes ?? [];
        const inputSwimlanes = outputSwimlanesFromPreviousItem.map(i => deepClone(i));
        const outputSwimlanes = [];
        let firstParentAdded = false;
        // Add first parent to the output
        if (historyItem.parentIds.length > 0) {
            for (const node of inputSwimlanes) {
                if (node.id === historyItem.id) {
                    if (!firstParentAdded) {
                        outputSwimlanes.push({
                            id: historyItem.parentIds[0],
                            color: getLabelColorIdentifier(historyItem, colorMap) ?? node.color
                        });
                        firstParentAdded = true;
                    }
                    continue;
                }
                outputSwimlanes.push(deepClone(node));
            }
        }
        // Add unprocessed parent(s) to the output
        for (let i = firstParentAdded ? 1 : 0; i < historyItem.parentIds.length; i++) {
            // Color index (label -> next color)
            let colorIdentifier;
            if (i === 0) {
                colorIdentifier = getLabelColorIdentifier(historyItem, colorMap);
            }
            else {
                const historyItemParent = historyItems
                    .find(h => h.id === historyItem.parentIds[i]);
                colorIdentifier = historyItemParent ? getLabelColorIdentifier(historyItemParent, colorMap) : undefined;
            }
            if (!colorIdentifier) {
                colorIndex = rot(colorIndex + 1, colorRegistry.length);
                colorIdentifier = colorRegistry[colorIndex];
            }
            outputSwimlanes.push({
                id: historyItem.parentIds[i],
                color: colorIdentifier
            });
        }
        // Add colors to references
        const references = (historyItem.references ?? [])
            .map(ref => {
            let color = colorMap.get(ref.id);
            if (colorMap.has(ref.id) && color === undefined) {
                // Find the history item in the input swimlanes
                const inputIndex = inputSwimlanes.findIndex(node => node.id === historyItem.id);
                // Circle index - use the input swimlane index if present, otherwise add it to the end
                const circleIndex = inputIndex !== -1 ? inputIndex : inputSwimlanes.length;
                // Circle color - use the output swimlane color if present, otherwise the input swimlane color
                color = circleIndex < outputSwimlanes.length ? outputSwimlanes[circleIndex].color :
                    circleIndex < inputSwimlanes.length ? inputSwimlanes[circleIndex].color : historyItemRefColor;
            }
            return { ...ref, color };
        });
        // Sort references
        references.sort((ref1, ref2) => compareHistoryItemRefs(ref1, ref2, currentHistoryItemRef, currentHistoryItemRemoteRef, currentHistoryItemBaseRef));
        viewModels.push({
            historyItem: {
                ...historyItem,
                references
            },
            kind,
            inputSwimlanes,
            outputSwimlanes
        });
    }
    return viewModels;
}
export function getHistoryItemIndex(historyItemViewModel) {
    const historyItem = historyItemViewModel.historyItem;
    const inputSwimlanes = historyItemViewModel.inputSwimlanes;
    // Find the history item in the input swimlanes
    const inputIndex = inputSwimlanes.findIndex(node => node.id === historyItem.id);
    // Circle index - use the input swimlane index if present, otherwise add it to the end
    return inputIndex !== -1 ? inputIndex : inputSwimlanes.length;
}
function getHistoryItemViewModelKind(historyItem, currentHistoryItemRef) {
    switch (historyItem.id) {
        case currentHistoryItemRef?.revision:
            return 'HEAD';
        case SCMIncomingHistoryItemId:
            return 'incoming-changes';
        case SCMOutgoingHistoryItemId:
            return 'outgoing-changes';
        default:
            return 'node';
    }
}
function addIncomingOutgoingChangesHistoryItems(historyItems, currentHistoryItemRef, currentHistoryItemRemoteRef, addIncomingChanges, addOutgoingChanges, mergeBase) {
    if (historyItems.length > 0 && mergeBase && currentHistoryItemRef?.revision !== currentHistoryItemRemoteRef?.revision) {
        // Incoming changes history item
        if (addIncomingChanges && currentHistoryItemRemoteRef && currentHistoryItemRemoteRef.revision !== mergeBase) {
            // Start from the current history item remote ref and walk towards the merge base
            const currentHistoryItemRemoteIndex = historyItems
                .findIndex(h => h.id === currentHistoryItemRemoteRef.revision);
            let beforeHistoryItemIndex = -1;
            if (currentHistoryItemRemoteIndex !== -1) {
                let historyItemParentId = historyItems[currentHistoryItemRemoteIndex].parentIds[0];
                for (let index = currentHistoryItemRemoteIndex; index < historyItems.length; index++) {
                    if (historyItems[index].parentIds.includes(mergeBase)) {
                        beforeHistoryItemIndex = index;
                        break;
                    }
                    if (historyItems[index].parentIds.includes(historyItemParentId)) {
                        historyItemParentId = historyItems[index].parentIds[0];
                    }
                }
            }
            const afterHistoryItemIndex = historyItems.findIndex(h => h.id === mergeBase);
            if (beforeHistoryItemIndex !== -1 && afterHistoryItemIndex !== -1) {
                // There is a known edge case in which the incoming changes have already
                // been merged. For this scenario, we will not be showing the incoming
                // changes history item. https://github.com/microsoft/vscode/issues/276064
                const incomingChangeMerged = historyItems[beforeHistoryItemIndex].parentIds.length === 2 &&
                    historyItems[beforeHistoryItemIndex].parentIds.includes(mergeBase);
                if (!incomingChangeMerged) {
                    // Insert incoming history item
                    historyItems.splice(afterHistoryItemIndex, 0, {
                        id: SCMIncomingHistoryItemId,
                        displayId: '0'.repeat(historyItems[0].displayId?.length ?? 0),
                        parentIds: historyItems[beforeHistoryItemIndex].parentIds.slice(),
                        author: currentHistoryItemRemoteRef?.name,
                        subject: localize(11596, null),
                        message: ''
                    });
                    // Update the before history item to point to incoming changes history item
                    historyItems[beforeHistoryItemIndex] = {
                        ...historyItems[beforeHistoryItemIndex],
                        parentIds: historyItems[beforeHistoryItemIndex].parentIds.map(id => {
                            return id === mergeBase ? SCMIncomingHistoryItemId : id;
                        })
                    };
                }
            }
        }
        // Outgoing changes history item
        if (addOutgoingChanges && currentHistoryItemRef?.revision && currentHistoryItemRef.revision !== mergeBase) {
            const afterHistoryItemIndex = historyItems.findIndex(h => h.id === currentHistoryItemRef.revision);
            if (afterHistoryItemIndex !== -1) {
                // Insert outgoing history item
                historyItems.splice(afterHistoryItemIndex, 0, {
                    id: SCMOutgoingHistoryItemId,
                    displayId: '0'.repeat(historyItems[0].displayId?.length ?? 0),
                    parentIds: [currentHistoryItemRef.revision],
                    author: currentHistoryItemRef?.name,
                    subject: localize(11597, null),
                    message: ''
                });
            }
        }
    }
}
export function compareHistoryItemRefs(ref1, ref2, currentHistoryItemRef, currentHistoryItemRemoteRef, currentHistoryItemBaseRef) {
    const getHistoryItemRefOrder = (ref) => {
        if (ref.id === currentHistoryItemRef?.id) {
            return 1;
        }
        else if (ref.id === currentHistoryItemRemoteRef?.id) {
            return 2;
        }
        else if (ref.id === currentHistoryItemBaseRef?.id) {
            return 3;
        }
        else if (ref.color !== undefined) {
            return 4;
        }
        return 99;
    };
    // Assign order (current > remote > base > color)
    const ref1Order = getHistoryItemRefOrder(ref1);
    const ref2Order = getHistoryItemRefOrder(ref2);
    return ref1Order - ref2Order;
}
//# sourceMappingURL=scmHistory.js.map