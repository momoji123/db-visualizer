// scripts/state.js
export const state = {
    data: [],
    schemas: {},
    selectedColumns: [],
    selectedTables: new Set(), // <-- ADD THIS LINE
    isDragging: false,
    draggedTable: null,
    dragStartMousePos: { x: 0, y: 0 },
    initialDragPositions: {}, // <-- ADD THIS LINE (To store positions of all selected tables on drag start)
	isSchemaDragging: false,
    draggedSchemaName: null,
    schemaDragOffset: { x: 0, y: 0 },
    initialTablePositionsForSchemaDrag: {},
    tablePositions: {},
    lastScrollLeft: 0,
    lastScrollTop: 0,
	minTableZIndex: 3, // Initial base z-index for tables
    maxTableZIndex:null,
    tableVisibility: {},
};

export function setTableVisibility(key, isVisible) {
    state.tableVisibility[key] = isVisible;
}

export function updateTableVisibilityFromFilter(visibleTableSet) {
    // Update the tableVisibility based on the filter selection
    Object.keys(state.tableVisibility).forEach(key => {
        state.tableVisibility[key] = visibleTableSet.has(key);
    });
}

export function initializeTableVisibility(schemas) {
    const visibility = {};
    
    // Set visibility based on schema data
    Object.keys(schemas).forEach(schemaName => {
        Object.keys(schemas[schemaName].tables).forEach(tableName => {
            const key = `${schemaName}.${tableName}`;
            visibility[key] = schemas[schemaName].tables[tableName].visible || false;
        });
    });
    
    state.tableVisibility = visibility;
}

export function getMaxTableZIndex(){
    if (state.maxTableZIndex === null) {
        // Calculate max z-index only if it's not cached
        let maxZ = state.minTableZIndex;
        maxZ = state.minTableZIndex + Object.keys(state.tablePositions).length;
        state.maxTableZIndex = maxZ;
    }
    return state.maxTableZIndex;
}

export function updateTableZPositionToTop(key){
    const currentZ = state.tablePositions[key]?.z || state.minTableZIndex; // Get current z or default
    const newMaxZ = getMaxTableZIndex(); // Calculate new max z-index

    // Shift existing tables' z-indices down if they were above the moved table
    Object.keys(state.tablePositions).forEach(otherKey => {
        if (otherKey !== key && state.tablePositions[otherKey].z > currentZ) {
            state.tablePositions[otherKey].z -= 1;
        }
    });

    // Update the dragged table's z-index to the new maximum
    if (state.tablePositions[key]) {
        state.tablePositions[key].z = newMaxZ;
    }
}
// Make sure updateTableZPositionToTop is globally available
window.updateTableVisibilityFromFilter = updateTableVisibilityFromFilter;

export function setData(newData) {
    state.data = newData;
}

export function setSchemas(newSchemas) {
    state.schemas = newSchemas;
}

export function setTablePositions(newPositions) {
    state.tablePositions = newPositions;
}

export function updateTablePosition(key, pos) {
    state.tablePositions[key] = pos;
}

export function setSchemaDragging(isDragging, schemaName = null, offset = { x: 0, y: 0 }) {
    state.isSchemaDragging = isDragging;
    state.draggedSchemaName = schemaName;
    state.schemaDragOffset = offset;
    if (!isDragging) {
        state.initialTablePositionsForSchemaDrag = {}; // Clear initial positions when drag ends
    }
}

export function storeInitialPositionsForSchemaDrag(positions) {
    state.initialTablePositionsForSchemaDrag = positions;
}

export function setDragging(isDragging, tableKey = null, startMousePos = { x: 0, y: 0 }) {
    if (isDragging && state.isSchemaDragging) return; // Don't allow table drag if schema drag is active
    state.isDragging = isDragging;
    state.draggedTable = tableKey; // Store the key of the primary table
    state.dragStartMousePos = startMousePos; // Store the initial mouse position
    if (!isDragging) {
        state.initialDragPositions = {}; // Clear initial positions when drag ends
    }
}

export function setSelectedColumns(columns) {
    state.selectedColumns = columns;
}

export function addSelectedColumn(column) {
    state.selectedColumns.push(column);
    // Trim to 2 columns maximum
    if (state.selectedColumns.length > 2) {
        state.selectedColumns.shift();
    }
}

export function clearSelectedColumns() {
    state.selectedColumns = [];
}

export function removeSelectedColumn(index) {
    state.selectedColumns.splice(index, 1);
}

export function saveScrollPosition(scrollLeft, scrollTop) {
    state.lastScrollLeft = scrollLeft;
    state.lastScrollTop = scrollTop;
}

export function addDataRow(row) {
    state.data.push(row);
}

export function filterData(filterFn) {
    state.data = state.data.filter(filterFn);
}

export function findRelationIndex(from, to) {
     return state.schemas[from.schema]?.tables[from.table]?.relations.findIndex(
        relation =>
            relation.from.schema === from.schema &&
            relation.from.table === from.table &&
            relation.from.column === from.column &&
            relation.to.schema === to.schema && // Ensure matching target schema
            relation.to.table === to.table &&
            relation.to.column === to.column
    );
}


export function removeRelationFromSchema(from, relationIndex) {
    if (state.schemas[from.schema]?.tables[from.table] && relationIndex > -1) {
         state.schemas[from.schema].tables[from.table].relations.splice(relationIndex, 1);
    }
}

export function addRelationToSchema(from, to) {
     if (state.schemas[from.schema]?.tables[from.table]) {
		if(findRelationIndex(from, to)==-1){
			state.schemas[from.schema].tables[from.table].relations.push({ from, to });
			console.log("Added relation:", from, "->", to);
		}
    }
}

export function addSelectedTable(key) {
    state.selectedTables.add(key);
}

export function removeSelectedTable(key) {
    state.selectedTables.delete(key);
}

export function toggleSelectedTable(key) {
    if (state.selectedTables.has(key)) {
        state.selectedTables.delete(key);
    } else {
        state.selectedTables.add(key);
    }
}

export function clearSelectedTables() {
    state.selectedTables.clear();
}

export function isTableSelected(key) {
    return state.selectedTables.has(key);
}

export function getSelectedTables() {
    return Array.from(state.selectedTables); // Return as an array
}