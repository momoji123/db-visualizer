export const state = {
    data: [],
    schemas: {},
    selectedColumns: [],
    selectedTables: new Set(),
    isDragging: false,
    draggedTable: null,
    dragStartMousePos: { x: 0, y: 0 },
    initialDragPositions: {},
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

export function updateTableVisibilityFromFilter(visibleTableSet) {
    // Update the tableVisibility based on the filter selection
    Object.keys(state.tableVisibility).forEach(key => {
        const [schemaName, tableName] = key.split('.');
        // Ensure the table still exists before trying to update visibility
        if (state.schemas[schemaName] && state.schemas[schemaName].tables[tableName]) {
            state.tableVisibility[key] = visibleTableSet.has(key);
            state.schemas[schemaName].tables[tableName].visible = state.tableVisibility[key];
        } else {
            // Clean up visibility state if table no longer exists
            delete state.tableVisibility[key];
        }
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

/**
 * Adds a new, empty table to the specified schema with a unique name.
 * @param {string} schemaName - The name of the schema to add the table to.
 */
export function addNewTable(schemaName) {
    if (!state.schemas[schemaName]) {
        console.error(`Schema "${schemaName}" not found.`);
        return;
    }

    const schemaTables = state.schemas[schemaName].tables;
    let counter = 1;
    let newTableName = `table${counter}`;

    // Find a unique table name within the schema
    while (schemaTables[newTableName]) {
        counter++;
        newTableName = `table${counter}`;
    }

    // Create the new table object
    const newTable = {
        columns: [], // Start with no columns
        relations: [],
        visible: true, // Make it visible by default
        columnsCollapsed: false // Start expanded
    };

    // Add the table to the schema
    schemaTables[newTableName] = newTable;

    // --- Assign Position and Z-index ---
    const key = `${schemaName}.${newTableName}`;
    // Simple positioning logic: place near top-left, slightly offset based on table count
    const tableCount = Object.keys(schemaTables).length; // Includes the newly added one
    const initialX = 50;
    const initialY = 80; // Below schema title
    const offsetX = (tableCount % 8) * 20; // Spread horizontally
    const offsetY = Math.floor(tableCount / 8) * 40; // Spread vertically

    // Try to find the schema area div to position relative to it
    const schemaAreaElement = document.querySelector(`.schema-area[data-schema="${schemaName}"]`);
    let schemaX = 0;
    let schemaY = 0;
    if (schemaAreaElement) {
        schemaX = parseFloat(schemaAreaElement.style.left || '0');
        schemaY = parseFloat(schemaAreaElement.style.top || '0');
    }

    const newX = schemaX + initialX + offsetX;
    const newY = schemaY + initialY + offsetY;

    // Assign the next available highest z-index
    const newZ = getMaxTableZIndex() + 1;
    state.tablePositions[key] = { x: newX, y: newY, z: newZ };
    state.maxTableZIndex = newZ; // Update the cached max z-index

    // --- Update other state ---
    state.tableVisibility[key] = true; // Set visibility

    // Update the filter list
    if (window.TableFilter && typeof window.TableFilter.updateTableList === 'function') {
        window.TableFilter.updateTableList(state.schemas);
    }

    console.log(`Added new table "${newTableName}" to schema "${schemaName}"`);

    // Trigger re-render is handled externally after calling this function
}

// Make sure updateTableVisibilityFromFilter is globally available
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

export function deleteColumn(schemaName, tableName, oldColumnName){
    const table = state.schemas[schemaName]?.tables[tableName];
    if (!table) return;
    
    // delete column names in the table
    let toDeleteIdx = table.columns.indexOf(oldColumnName);
    table.columns.splice(toDeleteIdx, 1);
    
    // delete column in relations within this table
    table.relations = table.relations.filter(relation => {
        if (relation.from.column === oldColumnName) {
            //exclude relation if contain old column
            return false;
        }
        return true;
    });
    
    // delete column in relations from other tables pointing to this column
    Object.keys(state.schemas).forEach(schema => {
        Object.keys(state.schemas[schema].tables).forEach(otherTable => {
            const otherTableObj = state.schemas[schema].tables[otherTable];
            state.schemas[schema].tables[otherTable].relations = otherTableObj.relations.filter(relation => {
                if (relation.to.schema === schemaName && 
                    relation.to.table === tableName && 
                    relation.to.column === oldColumnName) {
                        return false;
                }
                return true;
            });
        });
    });

    // Update visibility state
    initializeTableVisibility(state.schemas);
    window.TableFilter.updateTableList(state.schemas);
}

export function updateColumnName(schemaName, tableName, oldColumnName, newColumnName) {
    
    const table = state.schemas[schemaName]?.tables[tableName];
    if (!table) return;
    
    // Update column names in the table
    const columnIndex = table.columns.indexOf(oldColumnName);
    if (columnIndex !== -1) {
        table.columns[columnIndex] = newColumnName;
    } 
    
    // Update column names in relations within this table
    table.relations.forEach(relation => {
        if (relation.from.column === oldColumnName) {
            relation.from.column = newColumnName;
        }
    });
    
    // Update column names in relations from other tables pointing to this column
    Object.keys(state.schemas).forEach(schema => {
        Object.keys(state.schemas[schema].tables).forEach(otherTable => {
            const otherTableObj = state.schemas[schema].tables[otherTable];
            otherTableObj.relations.forEach(relation => {
                if (relation.to.schema === schemaName && 
                    relation.to.table === tableName && 
                    relation.to.column === oldColumnName) {
                    relation.to.column = newColumnName;
                }
            });
        });
    });

    // Update visibility state
    initializeTableVisibility(state.schemas);
    window.TableFilter.updateTableList(state.schemas);
}

export function deleteTable(schemaName, oldTableName){
    const schema = state.schemas[schemaName];
    if (!schema) return;
    
    // Make a copy of the table
    const table = schema.tables[oldTableName];
    if (!table) return;
    
    // Delete old table and add the new one
    delete schema.tables[oldTableName];
    
    // delete positions
    const oldKey = `${schemaName}.${oldTableName}`;
    if (state.tablePositions[oldKey]) {
        delete state.tablePositions[oldKey];
    }
    
    // delete selected tables if any
    if (state.selectedTables.has(oldKey)) {
        state.selectedTables.delete(oldKey);
    }
    
    // delete relations in all tables referring to this table
    Object.keys(state.schemas).forEach(schema => {
        Object.keys(state.schemas[schema].tables).forEach(tableName => {
            const tableObj = state.schemas[schema].tables[tableName];
            state.schemas[schema].tables[tableName].relations = tableObj.relations.filter(relation => {
                if (relation.from.schema === schemaName && relation.from.table === oldTableName) {
                    return false;
                }
                if (relation.to.schema === schemaName && relation.to.table === oldTableName) {
                    return false;
                }
                return true;
            });
        });
    });
    
    // delete visibility state
    if (state.tableVisibility[oldKey] !== undefined) {
        delete state.tableVisibility[oldKey];
    }

    //update maxZIndex
    state.maxTableZIndex -= 1;

   // Update visibility state
   initializeTableVisibility(state.schemas);
   window.TableFilter.updateTableList(state.schemas);
}

export function updateTableName(schemaName, oldTableName, newTableName) {
    const schema = state.schemas[schemaName];
    if (!schema) return;
    
    // Make a copy of the table
    const table = schema.tables[oldTableName];
    if (!table) return;
    
    // Delete old table and add the new one
    delete schema.tables[oldTableName];
    schema.tables[newTableName] = table;
    
    // Update positions
    const oldKey = `${schemaName}.${oldTableName}`;
    const newKey = `${schemaName}.${newTableName}`;
    if (state.tablePositions[oldKey]) {
        state.tablePositions[newKey] = state.tablePositions[oldKey];
        delete state.tablePositions[oldKey];
    }
    
    // Update selected tables if any
    if (state.selectedTables.has(oldKey)) {
        state.selectedTables.delete(oldKey);
        state.selectedTables.add(newKey);
    }
    
    // Update relations in all tables referring to this table
    Object.keys(state.schemas).forEach(schema => {
        Object.keys(state.schemas[schema].tables).forEach(tableName => {
            const tableObj = state.schemas[schema].tables[tableName];
            tableObj.relations.forEach(relation => {
                // Update "from" relations
                if (relation.from.schema === schemaName && relation.from.table === oldTableName) {
                    relation.from.table = newTableName;
                }
                
                // Update "to" relations
                if (relation.to.schema === schemaName && relation.to.table === oldTableName) {
                    relation.to.table = newTableName;
                }
            });
        });
    });
    
    // Update visibility state
    if (state.tableVisibility[oldKey] !== undefined) {
        state.tableVisibility[newKey] = state.tableVisibility[oldKey];
        delete state.tableVisibility[oldKey];
    }

   // Update visibility state
   initializeTableVisibility(state.schemas);
   window.TableFilter.updateTableList(state.schemas);
}

export function deleteSchema(oldSchemaName) {
    const schema = state.schemas[oldSchemaName];
    
    if (!schema) return;
    
    // Create new schema with the new name
    delete state.schemas[oldSchemaName];
    
    // Update table positions
    Object.keys(state.tablePositions).forEach(key => {
        if (key.startsWith(oldSchemaName + '.')) {
            delete state.tablePositions[key];
        }
    });
    
    // Update selected tables
    state.selectedTables.clear()
    
    // Update relations in all tables
    Object.keys(state.schemas).forEach(schema => {
        Object.keys(state.schemas[schema].tables).forEach(tableName => {
            const tableObj = state.schemas[schema].tables[tableName];
            state.schemas[schema].tables[tableName].relations = tableObj.relations.forEach(relation => {
                // Update "from" relations
                if (relation.from.schema === oldSchemaName) {
                    return false;
                }
                
                // Update "to" relations
                if (relation.to.schema === oldSchemaName) {
                    return false;
                }

                return true;
            });
        });
    });
    
    // If the schema is being dragged, update the dragged schema name
    if (state.isSchemaDragging && state.draggedSchemaName === oldSchemaName) {
        state.draggedSchemaName = null;
        state.isSchemaDragging = false;
        state.initialTablePositionsForSchemaDrag = {};
    }

    // Update visibility state
    initializeTableVisibility(state.schemas);
    window.TableFilter.updateTableList(state.schemas);
}

export function updateSchemaName(oldSchemaName, newSchemaName) {
    const schema = state.schemas[oldSchemaName];
    
    if (!schema) return;
    
    // Create new schema with the new name
    state.schemas[newSchemaName] = schema;
    delete state.schemas[oldSchemaName];
    
    // Update table positions
    Object.keys(state.tablePositions).forEach(key => {
        if (key.startsWith(oldSchemaName + '.')) {
            const tableName = key.substring(oldSchemaName.length + 1);
            const newKey = `${newSchemaName}.${tableName}`;
            state.tablePositions[newKey] = state.tablePositions[key];
            delete state.tablePositions[key];
        }
    });
    
    // Update selected tables
    state.selectedTables.clear()
    
    // Update relations in all tables
    Object.keys(state.schemas).forEach(schema => {
        Object.keys(state.schemas[schema].tables).forEach(tableName => {
            const tableObj = state.schemas[schema].tables[tableName];
            tableObj.relations.forEach(relation => {
                // Update "from" relations
                if (relation.from.schema === oldSchemaName) {
                    relation.from.schema = newSchemaName;
                }
                
                // Update "to" relations
                if (relation.to.schema === oldSchemaName) {
                    relation.to.schema = newSchemaName;
                }
            });
        });
    });
    
    // If the schema is being dragged, update the dragged schema name
    if (state.isSchemaDragging && state.draggedSchemaName === oldSchemaName) {
        state.draggedSchemaName = newSchemaName;
    }

    // Update visibility state
    initializeTableVisibility(state.schemas);
    window.TableFilter.updateTableList(state.schemas);
}