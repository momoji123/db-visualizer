// scripts/dataProcessor.js
import { state, setSchemas, setTablePositions } from './state.js';
import { renderVisualization } from './renderer.js';
import { updateStatus } from './uiUpdater.js';
// Assuming TableFilter is globally available or imported if it's also a module
// import { TableFilter } from './table-filter.js';

export function processData() {
    const newSchemas = {};
    const newTablePositions = {};

    // First pass: build schemas and tables
    state.data.forEach(row => {
        const { schema, table_name, column_name } = row;

        if (!newSchemas[schema]) {
            newSchemas[schema] = {
                tables: {},
                // Initial schema position (might not be needed if using bounding box)
                // position: { x: Math.random() * 300, y: Math.random() * 300 }
            };
        }

        if (!newSchemas[schema].tables[table_name]) {
            newSchemas[schema].tables[table_name] = {
                columns: [],
                relations: []
                // Position is handled in tablePositions
            };
        }

        // Ensure columns are unique
        if (!newSchemas[schema].tables[table_name].columns.includes(column_name)) {
            newSchemas[schema].tables[table_name].columns.push(column_name);
        }
    });

    // Second pass: add relations
    state.data.forEach(row => {
        const { schema, table_name, column_name, relation_table_name, relation_column_name } = row;

        if (relation_table_name && relation_column_name) {
            // Find which schema contains the related table
            let relationSchemaName = null;
            Object.keys(newSchemas).forEach(s => {
                if (newSchemas[s].tables[relation_table_name]) {
                    relationSchemaName = s;
                }
            });

            if (relationSchemaName && newSchemas[schema]?.tables[table_name]) {
                 newSchemas[schema].tables[table_name].relations.push({
                    from: { schema, table: table_name, column: column_name },
                    to: { schema: relationSchemaName, table: relation_table_name, column: relation_column_name }
                });
            }
        }
    });

     // Initialize table positions if they don't exist
    Object.keys(newSchemas).forEach(schema => {
        const tableNames = Object.keys(newSchemas[schema].tables);
        const tableCount = tableNames.length;

        tableNames.forEach((table, index) => {
            const key = `${schema}.${table}`;
            if (!state.tablePositions[key]) { // Check if position already exists (e.g., from previous state or manual drag)
                 // Arrange tables initially if not positioned
                 const radius = 200 + Math.random() * 50; // Add some randomness
                 const angle = (2 * Math.PI * index) / tableCount + Math.random() * 0.5; // Add some jitter
                 const schemaIndex = Object.keys(newSchemas).indexOf(schema);
                 const schemaOffsetX = schemaIndex * 600; // Spread schemas horizontally

                 newTablePositions[key] = {
                    x: 300 + schemaOffsetX + radius * Math.cos(angle),
                    y: 300 + radius * Math.sin(angle)
                };
            } else {
                 // Keep existing position
                 newTablePositions[key] = state.tablePositions[key];
            }
        });
    });


    // Update state
    setSchemas(newSchemas);
    setTablePositions(newTablePositions); // Use combined new/existing positions

    // Update filter list (assuming TableFilter is accessible)
     if (window.TableFilter && typeof window.TableFilter.updateTableList === 'function') {
        window.TableFilter.updateTableList(newSchemas);
    }


    // Initial render and status update
    renderVisualization();
    updateStatus();
}