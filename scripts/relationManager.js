// scripts/relationManager.js
import {
    state,
    addDataRow,
    filterData,
    findRelationIndex,
    removeRelationFromSchema,
    addRelationToSchema,
    saveScrollPosition
} from './state.js';
import * as DOM from './domElements.js';
import { renderVisualization } from './renderer.js';
import { updateStatus } from './uiUpdater.js';

export function addRelation(from, to) {
    // Save scroll position before potential re-render
    saveScrollPosition(DOM.workspace.scrollLeft || 0, DOM.workspace.scrollTop || 0);

    // Add relation to the main data array (for export)
    const newRow = {
        schema: from.schema,
        table_name: from.table,
        column_name: from.column,
        relation_table_name: to.table,
        relation_column_name: to.column
    };
    addDataRow(newRow);

    // Add relation to the schema structure (for rendering)
    addRelationToSchema(from, to);

    renderVisualization();
    updateStatus();
}

export function removeRelation(from, to) {
    // Save scroll position
    saveScrollPosition(DOM.workspace.scrollLeft || 0, DOM.workspace.scrollTop || 0);

    console.log("Attempting to remove relation:", from, "->", to);


    // 1. Remove from the main data array
    filterData(row =>
        !(row.schema === from.schema &&
          row.table_name === from.table &&
          row.column_name === from.column &&
          row.relation_table_name === to.table && // Check target table
          row.relation_column_name === to.column // Check target column
         )
    );

     // 2. Remove from the schema structure
     const relationIndex = findRelationIndex(from, to);
     if (relationIndex > -1) {
         removeRelationFromSchema(from, relationIndex);
         console.log("Relation removed from schema structure.");
     } else {
         console.warn("Relation not found in schema structure:", from, "->", to);
     }

    renderVisualization();
    updateStatus();
}