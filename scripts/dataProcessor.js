// scripts/dataProcessor.js
import { state, setSchemas, setTablePositions, initializeTableVisibility } from './state.js';
import { renderVisualization } from './renderer.js';
import { updateStatus } from './uiUpdater.js';
// Assuming TableFilter is globally available or imported if it's also a module
// import { TableFilter } from './table-filter.js';

export function processData() {
    const newSchemas = {};
    const newTablePositions = {};

    // First pass: build schemas and tables
    state.data.forEach(row => {
        const { schema, table_name, column_name, visibility_state } = row;

        if (!newSchemas[schema]) {
            newSchemas[schema] = {
                tables: {},
            };
        }

        if (!newSchemas[schema].tables[table_name]) {
            newSchemas[schema].tables[table_name] = {
                columns: [],
                relations: [],
                visible: visibility_state || false,
                columnsCollapsed: true
            };
        }else if (visibility_state) {
            // If any row with this table has visibility_state=true, set the table to visible
            newSchemas[schema].tables[table_name].visible = true;
        }

        // Ensure columns are unique
        if (!newSchemas[schema].tables[table_name].columns.includes(column_name)) {
            newSchemas[schema].tables[table_name].columns.push(column_name);
        }
    });

    // Second pass: add relations
    state.data.forEach(row => {
        const { schema, table_name, column_name, relation_schema, relation_table_name, relation_column_name, pos_x, pos_y, pos_z } = row;

        if (relation_table_name && relation_column_name) {
            const targetSchema = relation_schema || Object.keys(newSchemas).find(s => newSchemas[s].tables[relation_table_name]);

            if (targetSchema && newSchemas[schema]?.tables[table_name]) {
                newSchemas[schema].tables[table_name].relations.push({
                    from: { schema, table: table_name, column: column_name },
                    to: { schema: targetSchema, table: relation_table_name, column: relation_column_name }
                });
            }
        }

        // Initialize table positions from CSV data
        const key = `${schema}.${table_name}`;
        if (pos_x !== undefined && pos_y !== undefined && pos_z !== undefined) {
            newTablePositions[key] = { x: pos_x, y: pos_y, z: pos_z };
        } else if (!state.tablePositions[key]) {
            // Arrange tables initially if not positioned
            const radius = 200 + Math.random() * 50;
            const angle = (2 * Math.PI * Object.keys(newSchemas[schema].tables).indexOf(table_name)) / Object.keys(newSchemas[schema].tables).length + Math.random() * 0.5;
            const schemaIndex = Object.keys(newSchemas).indexOf(schema);
            const schemaOffsetX = schemaIndex * 600;

            newTablePositions[key] = {
                x: 300 + schemaOffsetX + radius * Math.cos(angle),
                y: 300 + radius * Math.sin(angle),
                z: state.minTableZIndex //Default Z-index
            };
        } else {
            // Keep existing position
            newTablePositions[key] = state.tablePositions[key];
        }
    });

    // Update state
    setSchemas(newSchemas);
    setTablePositions(newTablePositions); // Use combined new/existing positions
    initializeTableVisibility(newSchemas);

    // Update filter list (assuming TableFilter is accessible)
    if (window.TableFilter && typeof window.TableFilter.updateTableList === 'function') {
        window.TableFilter.updateTableList(newSchemas);
    }

    // Initial render and status update
    renderVisualization();
    updateStatus();
}