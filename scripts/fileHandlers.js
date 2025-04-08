// scripts/fileHandlers.js
import * as DOM from './domElements.js';
import { state, setData } from './state.js';
import { processData } from './dataProcessor.js';
import { showWorkspace } from './uiUpdater.js';

export function handleFileUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            // Split by either \r\n or \n
            const lines = text.split(/\r\n|\n|\r/);

            // Skip empty lines and header row
            const parsedData = lines
                .filter(line => line.trim() !== '')
                .slice(1)
                .map(line => {
                    const values = line.split(';');
                    return {
                        schema: values[0] || '',
                        table_name: values[1] || '',
                        column_name: values[2] || '',
                        relation_schema: values[3] || '',
                        relation_table_name: values[4] || '',
                        relation_column_name: values[5] || '',
                        pos_x: parseFloat(values[6]) || 0, // Parse as float, default to 0
                        pos_y: parseFloat(values[7]) || 0, // Parse as float, default to 0
                        pos_z: parseInt(values[8]) || state.minTableZIndex  // Parse as int, default to 0
                    };
                });

            setData(parsedData);
            processData(); // This will call renderVisualization internally
            showWorkspace();
        };
        reader.readAsText(file);
    }
}

export function handleExport() {
    const csvContent =
        "schema;table_name;column_name;relation_schema;relation_table_name;relation_column_name;pos_x;pos_y;pos_z\n" +
        state.data.map(row => {
            // Retrieve x, y, z from tablePositions
            const key = `${row.schema}.${row.table_name}`;
            const pos = state.tablePositions[key] || { x: 0, y: 0, z: state.minTableZIndex }; // Default position

            return `${row.schema};${row.table_name};${row.column_name};${row.relation_schema || ''};${row.relation_table_name || ''};${row.relation_column_name || ''};${pos.x};${pos.y};${pos.z}`;
        }).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'database_schema.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url); // Clean up the object URL
}