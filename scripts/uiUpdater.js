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
        const schemaCount = Object.keys(state.schemas).length;
        const tableCount = Object.values(state.schemas).reduce((count, schema) =>
            count + Object.keys(schema.tables).length, 0);
        DOM.statusInfo.textContent = `${schemaCount} schemas, ${tableCount} tables, ${state.data.length} items loaded`;
    } else {
        DOM.statusInfo.textContent = 'No data loaded';
    }
}