/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export function countChanges(changes) {
    return changes.reduce((count, change) => {
        const diff = change.diff.get();
        // When we accept some of the cell insert/delete the items might still be in the list.
        if (diff.identical) {
            return count;
        }
        switch (change.type) {
            case 'delete':
                return count + 1; // We want to see 1 deleted entry in the pill for navigation
            case 'insert':
                return count + 1; // We want to see 1 new entry in the pill for navigation
            case 'modified':
                return count + diff.changes.length;
            default:
                return count;
        }
    }, 0);
}
export function sortCellChanges(changes) {
    const indexes = new Map();
    changes.forEach((c, i) => indexes.set(c, i));
    return [...changes].sort((a, b) => {
        // For unchanged and modified, use modifiedCellIndex
        if ((a.type === 'unchanged' || a.type === 'modified') &&
            (b.type === 'unchanged' || b.type === 'modified')) {
            return a.modifiedCellIndex - b.modifiedCellIndex;
        }
        // For delete entries, use originalCellIndex
        if (a.type === 'delete' && b.type === 'delete') {
            return a.originalCellIndex - b.originalCellIndex;
        }
        // For insert entries, use modifiedCellIndex
        if (a.type === 'insert' && b.type === 'insert') {
            return a.modifiedCellIndex - b.modifiedCellIndex;
        }
        if (a.type === 'delete' && b.type === 'insert') {
            // If the deleted cell comes before the inserted cell, we want the delete to come first
            // As this means the cell was deleted before it was inserted
            // We would like to see the deleted cell first in the list
            // Else in the UI it would look weird to see an inserted cell before a deleted cell,
            // When the users operation was to first delete the cell and then insert a new one
            // I.e. this is merely just a simple way to ensure we have a stable sort.
            return indexes.get(a) - indexes.get(b);
        }
        if (a.type === 'insert' && b.type === 'delete') {
            // If the deleted cell comes before the inserted cell, we want the delete to come first
            // As this means the cell was deleted before it was inserted
            // We would like to see the deleted cell first in the list
            // Else in the UI it would look weird to see an inserted cell before a deleted cell,
            // When the users operation was to first delete the cell and then insert a new one
            // I.e. this is merely just a simple way to ensure we have a stable sort.
            return indexes.get(a) - indexes.get(b);
        }
        if ((a.type === 'delete' && b.type !== 'insert') || (a.type !== 'insert' && b.type === 'delete')) {
            return a.originalCellIndex - b.originalCellIndex;
        }
        // Mixed types: compare based on available indices
        const aIndex = a.type === 'delete' ? a.originalCellIndex :
            (a.type === 'insert' ? a.modifiedCellIndex : a.modifiedCellIndex);
        const bIndex = b.type === 'delete' ? b.originalCellIndex :
            (b.type === 'insert' ? b.modifiedCellIndex : b.modifiedCellIndex);
        return aIndex - bIndex;
    });
}
//# sourceMappingURL=notebookCellChanges.js.map