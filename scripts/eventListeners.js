// scripts/eventListeners.js
import * as DOM from './domElements.js';
import { state, addSelectedColumn, clearSelectedColumns, removeSelectedColumn } from './state.js';
import { handleFileUpload, handleExport } from './fileHandlers.js';
import { renderVisualization } from './renderer.js';
// dragDrop handlers are added/removed dynamically in dragDrop.js
import { addRelation, getRelatedTablesTo, getRelatedTablesFrom } from './relationManager.js';
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

     // Listen on the container where tables are added
     DOM.tablesContainer.addEventListener('click', handleTableMenuAction);

     // Global click listener to close menus (moved here for better organization)
     document.addEventListener('click', (e) => {
        // If the click is outside a menu container, close all open menus
        if (!e.target.closest('.table-menu-container')) {
            document.querySelectorAll('.table-menu-dropdown.show').forEach(dropdown => {
                dropdown.classList.remove('show');
            });
        }
    }, true); // Use capture phase to catch clicks early

    console.log("Initial event listeners set up.");
}

// Handles clicks on the table menu items
export function handleTableMenuAction(event) {
    const target = event.target;

    // Check if the clicked element is a menu item button
    if (target.classList.contains('table-menu-item')) {
        event.preventDefault();
        event.stopPropagation(); // Prevent triggering other listeners

        const schema = target.dataset.schema;
        const table = target.dataset.table;
        const action = target.dataset.action;
        const currentTableKey = `${schema}.${table}`;

        console.log(`Menu action: ${action} for ${currentTableKey}`);

        // Get currently visible tables BEFORE calculating new ones
        const currentlyVisibleKeys = window.TableFilter.getVisibleTableKeys(); // Use the new function
        let combinedTablesToShow = new Set(currentlyVisibleKeys); // Start with current view

        // Always add the source table
        combinedTablesToShow.add(currentTableKey);

        let relatedKeys = [];

        if (action === 'show-to') {
            relatedKeys = getRelatedTablesTo(schema, table);
            relatedKeys.forEach(key => combinedTablesToShow.add(key)); // Add related tables
            console.log('Adding "to" relations. Total visible:', Array.from(combinedTablesToShow));
            window.TableFilter.filterByTableList(Array.from(combinedTablesToShow)); // Filter with combined list
        } else if (action === 'show-from') {
            relatedKeys = getRelatedTablesFrom(schema, table);
            relatedKeys.forEach(key => combinedTablesToShow.add(key)); // Add related tables
            console.log('Adding "from" relations. Total visible:', Array.from(combinedTablesToShow));
            window.TableFilter.filterByTableList(Array.from(combinedTablesToShow)); // Filter with combined list
        } else if (action === 'show-all') {
            console.log('Showing all tables');
            window.TableFilter.showAllTables(); // Reset remains the same
        }
         // Add more 'else if' blocks for future actions


        // Close the parent dropdown menu
        const dropdown = target.closest('.table-menu-dropdown');
        if (dropdown) {
            dropdown.classList.remove('show');
        }
    }
}