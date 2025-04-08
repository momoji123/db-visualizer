// scripts/dragDrop.js
import * as DOM from './domElements.js';
import { state, setDragging, updateTablePosition, setSchemaDragging, storeInitialPositionsForSchemaDrag, getNextTableZIndex } from './state.js';
import { renderVisualization, renderRelations } from './renderer.js'; // Import renderRelations too

export function handleDragStart(e, schema, table) {
	// Prevent initiating table drag if a schema drag is already active or starting on the schema area
    if (state.isSchemaDragging || e.target.classList.contains('schema-area')) {
         e.stopPropagation(); // Stop the event from bubbling further
        return;
    }
    // Ensure we are clicking the header, not the column or table background
    if (!e.target.classList.contains('table-header')) return;
	
    // Note: preventDefault() was here, removed as it might interfere with other potential text selection,
    // but keep an eye if dragging behaves unexpectedly. It might need to be added back.
    // e.preventDefault();

    const tableElement = document.getElementById(`table-${schema}-${table}`);
    if (!tableElement) return;

	
    // Get the next available z-index and apply it to the clicked/dragged table
    const newZIndex = getNextTableZIndex();
	state.tablePositions[`${schema}.${table}`].z = newZIndex;
    tableElement.style.zIndex = newZIndex;
    // --- End Z-Index Handling ---

    const rect = tableElement.getBoundingClientRect(); // Use table element for rect
     const workspaceRect = DOM.workspace.getBoundingClientRect();


    const dragOffset = {
        // Calculate offset relative to the workspace container, considering scroll
         x: e.clientX - rect.left,
         y: e.clientY - rect.top
       // x: e.clientX - workspaceRect.left + DOM.workspace.scrollLeft - state.tablePositions[`${schema}.${table}`].x,
       // y: e.clientY - workspaceRect.top + DOM.workspace.scrollTop - state.tablePositions[`${schema}.${table}`].y
    };

    setDragging(true, { schema, table }, dragOffset);

    document.body.style.cursor = 'move';
     // Add listeners to document to handle dragging outside the initial element
     document.addEventListener('mousemove', handleDrag);
     document.addEventListener('mouseup', handleDragEnd);
     document.addEventListener('mouseleave', handleDragEnd); // Handle mouse leaving the window


     // Optional: Add a class to the dragged element for visual feedback
     //tableElement.classList.add('dragging');
}

export function handleDrag(e) {
    if (state.isDragging && state.draggedTable) {
        // --- Existing Table Drag Logic ---
        e.preventDefault();
        const { schema, table } = state.draggedTable;
        const key = `${schema}.${table}`;
        const tableElem = document.getElementById(`table-${schema}-${table}`);
        if (!tableElem) return;
        const workspaceRect = DOM.workspace.getBoundingClientRect();

        let newX = e.clientX - workspaceRect.left - state.dragOffset.x + DOM.workspace.scrollLeft;
        let newY = e.clientY - workspaceRect.top - state.dragOffset.y + DOM.workspace.scrollTop;
		let newZ = state.tablePositions[key].z;

        updateTablePosition(key, { x: newX, y: newY, z:newZ });
        tableElem.style.left = `${newX}px`;
        tableElem.style.top = `${newY}px`;

        renderRelations(); // Update relations during table drag

    } else if (state.isSchemaDragging && state.draggedSchemaName) {
        // --- New Schema Drag Logic ---
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
		console.log(state)
        setDragging(false); // Reset table dragging state
        document.body.style.cursor = 'default';
        if (schema && table) {
            const tableElem = document.getElementById(`table-${schema}-${table}`);
            if (tableElem) {
                tableElem.classList.remove('dragging');
                // DO NOT reset z-index here - let it persist
            }
        }
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

export function handleSchemaDragStart(e, schemaName) {
     // Prevent drag if a table drag is somehow active
     if (state.isDragging) return;

    e.preventDefault();
    e.stopPropagation(); // Prevent triggering table drag if header is overlapped

    const schemaAreaElem = e.currentTarget; // The schema area div
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