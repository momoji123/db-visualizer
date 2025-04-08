// scripts/eventListeners.js
import * as DOM from './domElements.js';
import { state, addSelectedColumn, clearSelectedColumns, removeSelectedColumn } from './state.js';
import { handleFileUpload, handleExport } from './fileHandlers.js';
import { renderVisualization } from './renderer.js';
// dragDrop handlers are added/removed dynamically in dragDrop.js
import { addRelation } from './relationManager.js';
import { updateSelectionInfo } from './uiUpdater.js';

export function handleColumnClick(schema, table, column) {
     // Find if the exact column is already selected
     const existingIndex = state.selectedColumns.findIndex(item =>
        item.schema === schema && item.table === table && item.column === column);


     if (existingIndex > -1) {
        // Unselect the column if clicked again
        removeSelectedColumn(existingIndex);
    } else {
         // Check if a column from the same table is already selected
         const sameTableIndex = state.selectedColumns.findIndex(item =>
            item.schema === schema && item.table === table);


         if (sameTableIndex > -1) {
            // Replace existing column from the same table if a different one is clicked
            removeSelectedColumn(sameTableIndex);
        }


        // Add the newly selected column
        addSelectedColumn({ schema, table, column });


        // If we now have 2 columns selected from different tables, create relation
        if (state.selectedColumns.length === 2 &&
            (state.selectedColumns[0].table !== state.selectedColumns[1].table ||
             state.selectedColumns[0].schema !== state.selectedColumns[1].schema)) { // Also check schema
            addRelation(state.selectedColumns[0], state.selectedColumns[1]);
            clearSelectedColumns(); // Reset selection after creating relation
        }
    }


    updateSelectionInfo(); // Update UI feedback
    renderVisualization(); // Re-render to show selection changes/new relation
}


export function resizeWorkspace() {
    // Re-render on window resize to adjust layout and SVG canvas
    renderVisualization();
}

export function setupInitialListeners() {
    DOM.uploadBtn.addEventListener('click', () => DOM.fileInput.click());
    DOM.uploadBtnEmpty.addEventListener('click', () => DOM.fileInput.click());
    DOM.fileInput.addEventListener('change', handleFileUpload);
    DOM.exportBtn.addEventListener('click', handleExport);

    // Note: Drag/drop listeners for tables are added in dragDrop.js on mousedown
    // Note: Column click listeners are added dynamically in renderer.js

     // Add listener for window resize
     window.addEventListener('resize', resizeWorkspace);


     // Listener for filter changes (if using the custom event from table-filter.js)
     document.addEventListener('filtersApplied', renderVisualization);


    console.log("Initial event listeners set up.");
}