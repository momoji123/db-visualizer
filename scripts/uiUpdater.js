// scripts/uiUpdater.js
import * as DOM from './domElements.js';
import { state } from './state.js';

export function showWorkspace() {
    DOM.emptyState.style.display = 'none';
    DOM.workspace.style.display = 'block'; // Or 'flex', depending on your CSS
    DOM.exportBtn.disabled = false;
}

export function updateSelectionInfo() {
    if (state.selectedColumns.length > 0) {
        const selectionText = state.selectedColumns.map(col => `${col.table}.${col.column}`).join(' → ');
        let infoText = `Selected: ${selectionText}`;

        if (state.selectedColumns.length === 1) {
            infoText += " (Select another column to create a relation)";
        }

        DOM.selectionInfo.textContent = infoText;
    } else {
        DOM.selectionInfo.textContent = ''; // Clear info if no selection
    }
}

export function updateStatus() {
    if (Object.keys(state.schemas).length > 0) {
        let schemaCount = 0;
        let tableCount = 0;
        let columnCount = 0;

        Object.values(state.schemas).forEach(schema=>{
            Object.values(schema.tables).forEach(table=>{
                table.columns.forEach(col=>{
                    columnCount += 1;
                })
                tableCount += 1;
            })
            schemaCount += 1;
        })
        DOM.statusInfo.textContent = `${schemaCount} schemas, ${tableCount} tables, ${columnCount} columns loaded`;
    } else {
        DOM.statusInfo.textContent = 'No data loaded';
    }
}