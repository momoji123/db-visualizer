// scripts/dragDrop.js
import * as DOM from './domElements.js';
import { state, setDragging, updateTablePosition, setSchemaDragging, 
    storeInitialPositionsForSchemaDrag, getMaxTableZIndex, updateTableZPositionToTop,
    addSelectedTable, removeSelectedTable, toggleSelectedTable,
    clearSelectedTables, isTableSelected, getSelectedTables
 } from './state.js';
import { renderVisualization, renderRelations } from './renderer.js'; // Import renderRelations too

export function handleDragStart(e, schema, table) {
	// Prevent initiating table drag if a schema drag is already active or starting on the schema area
    if (state.isSchemaDragging || e.target.classList.contains('schema-area')) {
         e.stopPropagation(); // Stop the event from bubbling further
        return;
    }

    // Ensure we are clicking the header, not the column or table background
    if (!e.target.classList.contains('table-header-container') && !e.target.classList.contains('table-title')) return;
	
    // Note: preventDefault() was here, removed as it might interfere with other potential text selection,
    // but keep an eye if dragging behaves unexpectedly. It might need to be added back.
    // e.preventDefault();
    
    const tableElement = document.getElementById(`table-${schema}-${table}`);
    if (!tableElement) return;

	
    // Get the next available z-index and apply it to the clicked/dragged table
    const key = `${schema}.${table}`;

    // --- SELECTION LOGIC ---
    if (e.shiftKey) {
        // Shift + Click: Toggle selection for this table
        toggleSelectedTable(key);
    } else {
        // Click without Shift
        if (!isTableSelected(key)) {
            // If the clicked table wasn't already selected, clear others and select only this one.
            clearSelectedTables();
            addSelectedTable(key);
        }
        // If it *was* selected, and others might be too, don't clear, allow dragging the group.
    }
    // --- END SELECTION LOGIC ---
    renderVisualization();

    // --- DRAG INITIATION ---
    // Only start dragging if the clicked table is currently selected
    if (isTableSelected(key)) {
        // Bring *all* selected tables to the top z-index group if needed,
        // but only the *primary* clicked one truly gets the highest z-index at this moment.
        // (Alternatively, you could bring all selected to the top together)
        updateTableZPositionToTop(key);
        tableElement.style.zIndex = state.tablePositions[key].z;

        const workspaceRect = DOM.workspace.getBoundingClientRect();

        // Capture initial mouse position relative to the workspace container
        const startMouseX = e.clientX - workspaceRect.left + DOM.workspace.scrollLeft;
        const startMouseY = e.clientY - workspaceRect.top + DOM.workspace.scrollTop;
        const startMousePos = { x: startMouseX, y: startMouseY }; // <-- Capture this

        // Store initial positions of all selected tables
        const initialPositions = {};
        getSelectedTables().forEach(selectedKey => {
            if (state.tablePositions[selectedKey]) {
                initialPositions[selectedKey] = { ...state.tablePositions[selectedKey] };
            }
        });
        state.initialDragPositions = initialPositions;

        // Set dragging state, passing the START MOUSE POSITION
        setDragging(true, key, startMousePos); // <-- Use startMousePos here

        document.body.style.cursor = 'move';
        document.addEventListener('mousemove', handleDrag);
        document.addEventListener('mouseup', handleDragEnd);
        document.addEventListener('mouseleave', handleDragEnd);
    }
}

export function handleDrag(e) {
    if (state.isDragging && state.draggedTable) {
        // --- Multi-Table Drag Logic ---
        e.preventDefault();
        const primaryDraggedKey = state.draggedTable; // Key of table that initiated drag
        const initialPrimaryPos = state.initialDragPositions[primaryDraggedKey];
        if (!initialPrimaryPos) return; // Safety check

        const workspaceRect = DOM.workspace.getBoundingClientRect();

        // Calculate current mouse position relative to the workspace container
        const currentMouseX = e.clientX - workspaceRect.left + DOM.workspace.scrollLeft;
        const currentMouseY = e.clientY - workspaceRect.top + DOM.workspace.scrollTop;

        // Calculate the delta move from the drag start mouse position
        const deltaX = currentMouseX - state.dragStartMousePos.x;
        const deltaY = currentMouseY - state.dragStartMousePos.y;

        // Move all selected tables based on their initial positions and the calculated delta
        getSelectedTables().forEach(key => {
            const initialPos = state.initialDragPositions[key];
            const tableElem = document.getElementById(`table-${key.replace('.', '-')}`);
            if (initialPos && tableElem) {
                // Calculate new position based on the initial position + delta
                const newX = initialPos.x + deltaX;
                const newY = initialPos.y + deltaY;
                const newZ = initialPos.z; // Keep original Z

                // Update state and element style
                updateTablePosition(key, { x: newX, y: newY, z: newZ });
                tableElem.style.left = `${newX}px`;
                tableElem.style.top = `${newY}px`;
            }
        });

        renderRelations(); // Update relations during drag

    } else if (state.isSchemaDragging && state.draggedSchemaName) {
        e.preventDefault();
        const schemaName = state.draggedSchemaName;
        const schemaAreaElem = DOM.tablesContainer.querySelector(`.schema-area[data-schema="${schemaName}"]`);
        if (!schemaAreaElem) return;

        const workspaceRect = DOM.workspace.getBoundingClientRect();

        // Calculate the current mouse position relative to the workspace container
        const currentX = e.clientX - workspaceRect.left + DOM.workspace.scrollLeft;
        const currentY = e.clientY - workspaceRect.top + DOM.workspace.scrollTop;

        // Calculate the delta move from the drag start
        const deltaX = currentX - state.schemaDragOffset.startX;
        const deltaY = currentY - state.schemaDragOffset.startY;

        // Move the schema area visually
        const newSchemaX = state.schemaDragOffset.initialSchemaX + deltaX;
        const newSchemaY = state.schemaDragOffset.initialSchemaY + deltaY;
        schemaAreaElem.style.left = `${newSchemaX}px`;
        schemaAreaElem.style.top = `${newSchemaY}px`;


        // Move associated tables
        Object.keys(state.initialTablePositionsForSchemaDrag).forEach(key => {
            const tableElem = document.getElementById(`table-${key.replace('.', '-')}`);
            if (tableElem && state.schemas[schemaName]?.tables[key.split('.')[1]]) { // Check if table belongs to the schema being dragged
                const initialPos = state.initialTablePositionsForSchemaDrag[key];
                const newTableX = initialPos.x + deltaX;
                const newTableY = initialPos.y + deltaY;
				const newTableZ = initialPos.z

                // Update state and element style
                updateTablePosition(key, { x: newTableX, y: newTableY, z:newTableZ });
                tableElem.style.left = `${newTableX}px`;
                tableElem.style.top = `${newTableY}px`;
            }
        });

        renderRelations(); // Update relations during schema drag
    }
}

export function handleDragEnd(e) {
    const wasTableDragging = state.isDragging;
    const wasSchemaDragging = state.isSchemaDragging;

    if (wasTableDragging) {
        const { schema, table } = state.draggedTable || {};
        setDragging(false); // Reset table dragging state
        document.body.style.cursor = 'default';
    }

    if (wasSchemaDragging) {
        const schemaName = state.draggedSchemaName;
         setSchemaDragging(false); // Reset schema dragging state
         document.body.style.cursor = 'default';
        if (schemaName) {
            const schemaAreaElem = DOM.tablesContainer.querySelector(`.schema-area[data-schema="${schemaName}"]`);
            if (schemaAreaElem) {
                schemaAreaElem.classList.remove('dragging'); // Remove dragging class if you add one
            }
        }
    }


    if (wasTableDragging || wasSchemaDragging) {
        // Remove document-level listeners only if a drag was in progress
        document.removeEventListener('mousemove', handleDrag);
        document.removeEventListener('mouseup', handleDragEnd);
        document.removeEventListener('mouseleave', handleDragEnd); // Ensure this is removed too

        // Perform a full re-render to update schema boundaries etc. correctly after any drag
        renderVisualization();
    }
}

export function handleSchemaDragStart(e, currentTarget, schemaName) {
     // Prevent drag if a table drag is somehow active
     if (state.isDragging) return;

    e.preventDefault();
    e.stopPropagation(); // Prevent triggering table drag if header is overlapped

    const schemaAreaElem = e.currentTarget ? e.currentTarget : currentTarget; // The schema area div

    const workspaceRect = DOM.workspace.getBoundingClientRect();

     // Calculate initial mouse position relative to the workspace, including scroll
     const startX = e.clientX - workspaceRect.left + DOM.workspace.scrollLeft;
     const startY = e.clientY - workspaceRect.top + DOM.workspace.scrollTop;

    // Store initial offset and schema position
    const schemaRect = schemaAreaElem.getBoundingClientRect();
    const initialSchemaX = parseFloat(schemaAreaElem.style.left) || 0;
    const initialSchemaY = parseFloat(schemaAreaElem.style.top) || 0;


    const schemaDragOffset = {
         startX: startX, // Store initial mouse X relative to workspace
         startY: startY, // Store initial mouse Y relative to workspace
         initialSchemaX: initialSchemaX, // Store initial schema X
         initialSchemaY: initialSchemaY // Store initial schema Y
    };


    // Store initial positions of all tables within this schema
    const initialTablePositions = {};
     if (state.schemas[schemaName]) {
        Object.keys(state.schemas[schemaName].tables).forEach(tableName => {
            const key = `${schemaName}.${tableName}`;
            if (state.tablePositions[key]) {
                // Store a copy, not a reference
                 initialTablePositions[key] = { ...state.tablePositions[key] };
            } else {
                 // Fallback if position somehow missing (shouldn't normally happen)
                 const tableElem = document.getElementById(`table-${key.replace('.', '-')}`);
                 if(tableElem){
                      initialTablePositions[key] = { x: parseFloat(tableElem.style.left) || 0, y: parseFloat(tableElem.style.top) || 0, z: parseFloat(tableElem.style.zIndex) };
                 } else {
                      initialTablePositions[key] = { x: 0, y: 0, z: state.nextTableZIndex };
                 }
            }
        });
    }
    storeInitialPositionsForSchemaDrag(initialTablePositions); // Update state

    setSchemaDragging(true, schemaName, schemaDragOffset); // Set schema dragging state

    document.body.style.cursor = 'move';
    schemaAreaElem.classList.add('dragging'); // Optional: Add visual feedback

    // Add listeners to document for moving and stopping
    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('mouseup', handleDragEnd);
    document.addEventListener('mouseleave', handleDragEnd); // Handle mouse leaving window
}