// scripts/dragDrop.js
import * as DOM from './domElements.js';
import { state, setDragging, updateTablePosition } from './state.js';
import { renderVisualization, renderRelations } from './renderer.js'; // Import renderRelations too

export function handleDragStart(e, schema, table) {
    e.preventDefault();
     // Ensure we are clicking the header, not the column or table background
     if (!e.target.classList.contains('table-header')) return;


    const tableElement = document.getElementById(`table-${schema}-${table}`);
    if (!tableElement) return;

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
     tableElement.classList.add('dragging');
}

export function handleDrag(e) {
    if (!state.isDragging || !state.draggedTable) return;

    e.preventDefault(); // Prevent text selection during drag

    const { schema, table } = state.draggedTable;
    const key = `${schema}.${table}`;
    const tableElem = document.getElementById(`table-${schema}-${table}`);
    if (!tableElem) return; // Should not happen if drag started correctly

     const workspaceRect = DOM.workspace.getBoundingClientRect();


    // Calculate new raw position based on mouse movement and offset
     let newX = e.clientX - workspaceRect.left - state.dragOffset.x;
     let newY = e.clientY - workspaceRect.top - state.dragOffset.y;


     // Add scroll position to get position relative to the tablesContainer
     newX += DOM.workspace.scrollLeft;
     newY += DOM.workspace.scrollTop;


     // Optional: Constrain dragging within workspace boundaries (or add checks)
     // newX = Math.max(0, Math.min(newX, parseInt(DOM.tablesContainer.style.width) - tableElem.offsetWidth));
     // newY = Math.max(0, Math.min(newY, parseInt(DOM.tablesContainer.style.height) - tableElem.offsetHeight));


    // Update position in state
    updateTablePosition(key, { x: newX, y: newY });

    // Update table element's style directly for immediate feedback
    tableElem.style.left = `${newX}px`;
    tableElem.style.top = `${newY}px`;

    // Update relations dynamically without full re-render for performance
     renderRelations(); // Re-render only the SVG relations
}

export function handleDragEnd(e) {
     if (!state.isDragging) return; // Only act if currently dragging


     const { schema, table } = state.draggedTable; // Get info before resetting


    // Clean up
    setDragging(false); // Reset dragging state
    document.body.style.cursor = 'default';


     // Remove dragging class if added
     const tableElem = document.getElementById(`table-${schema}-${table}`);
     if (tableElem) {
         tableElem.classList.remove('dragging');
     }


     // Remove document-level listeners
     document.removeEventListener('mousemove', handleDrag);
     document.removeEventListener('mouseup', handleDragEnd);
     document.removeEventListener('mouseleave', handleDragEnd);


    // Perform a full re-render to update schema boundaries correctly
    // This is important if schema areas depend on table positions.
    renderVisualization();
}