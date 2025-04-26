// scripts/eventListeners.js
import * as DOM from './domElements.js';
import { state, addSelectedColumn, clearSelectedColumns, removeSelectedColumn } from './state.js';
import { handleFileUpload, handleExport } from './fileHandlers.js';
import { renderVisualization, renderTables } from './renderer.js';
// dragDrop handlers are added/removed dynamically in dragDrop.js
import { addRelation, getRelatedTablesTo, getRelatedTablesFrom } from './relationManager.js';
import { updateSelectionInfo, showWorkspace } from './uiUpdater.js';

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
    DOM.addSchemaBtn.addEventListener('click', addSchema);


    // Note: Drag/drop listeners for tables are added in dragDrop.js on mousedown
    // Note: Column click listeners are added dynamically in renderer.js
    // Note: Schema menu 'Add Table' listener is added directly in renderer.js

    // Add listener for window resize
    window.addEventListener('resize', resizeWorkspace);


    // Listener for filter changes (if using the custom event from table-filter.js)
    document.addEventListener('filtersApplied', renderVisualization);

    // Listen on the container where tables are added
    DOM.tablesContainer.addEventListener('click', handleTableMenuAction);

    // Global click listener to close *all* menus
    document.addEventListener('click', (e) => {
        // If the click is outside any menu container, close all open menus
        if (!e.target.closest('.table-menu-container') && !e.target.closest('.schema-menu-container')) {
            closeAllMenus();
        }
    }, true); // Use capture phase

    console.log("Initial event listeners set up.");
}

// Helper function to close all open menus (can be called from anywhere)
export function closeAllMenus() {
    document.querySelectorAll('.table-menu-dropdown.show, .schema-menu-dropdown.show').forEach(dropdown => {
        dropdown.classList.remove('show');
    });
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
        } else if (action === 'hide-table' && schema && table) {
            const keyToHide = `${schema}.${table}`;
            console.log(`Hiding table: ${keyToHide}`);
            // Get current visible tables, remove the one to hide
            const currentlyVisibleKeys = window.TableFilter.getVisibleTableKeys();
            const updatedVisibleKeys = currentlyVisibleKeys.filter(key => key !== keyToHide);
            // Apply the new list (which excludes the hidden table)
            window.TableFilter.filterByTableList(updatedVisibleKeys);
        } else if (action === 'add-column' && schema && table){
            //find new column name. if exsist, add incremented number after it ex: "New Column", "New Column 2", "New Column 3", etc
            let i = 1;
            let newColumnName = `New Column ${i}`;
            while (state.schemas[schema].tables[table].columns.includes(newColumnName)) {   
                i++;
                newColumnName = `New Column ${i}`;
            }
            state.schemas[schema].tables[table].columns.push(newColumnName);
            renderTables()
        }
        else {
            console.warn(`Unknown or incomplete action: ${action} for ${schema}.${table}`);
        }
         // Add more 'else if' blocks for future actions


        // Close the parent dropdown menu
        const dropdown = target.closest('.table-menu-dropdown');
        if (dropdown) {
            dropdown.classList.remove('show');
        }
    }
}

function addSchema(event) {
    console.log("Adding new schema...");
    state.schemas[`Schema ${Object.keys(state.schemas).length + 1}`] = {
        tables: {},
    };
    console.log(state.schemas)
    showWorkspace();
    renderVisualization();
}