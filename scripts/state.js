// scripts/state.js
export const state = {
    data: [],
    schemas: {},
    selectedColumns: [],
    isDragging: false,
    draggedTable: null,
    dragOffset: { x: 0, y: 0 },
	isSchemaDragging: false,
    draggedSchemaName: null,
    schemaDragOffset: { x: 0, y: 0 },
    initialTablePositionsForSchemaDrag: {},
    tablePositions: {},
    lastScrollLeft: 0,
    lastScrollTop: 0,
};

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

export function setDragging(isDragging, table = null, offset = { x: 0, y: 0 }) {
    if (isDragging && state.isSchemaDragging) return; // Don't allow table drag if schema drag is active
    state.isDragging = isDragging;
    state.draggedTable = table;
    state.dragOffset = offset;
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
        state.schemas[from.schema].tables[from.table].relations.push({ from, to });
    }
}