import { updateColumnName, updateTableName, updateSchemaName } from './state.js';

export function startEditing(element, schema, table, column) {
    const currentText = element.textContent;
    const input = document.createElement('input');
    console.log(input.dataset)
    input.type = 'text';
    input.value = currentText;
    input.className = 'inline-editor';
    input.dataset.schema = schema;
    input.dataset.table = table;
    input.dataset.column = column;
    input.dataset.originalValue = currentText;
    
    // Style the input
    input.style.width = '100%';
    input.style.boxSizing = 'border-box';
    input.style.padding = '2px';
    input.style.border = '1px solid #3498db';
    input.style.outline = 'none';
    
    // Replace the element with input
    element.textContent = '';
    element.appendChild(input);
    input.focus();
    input.select();
    
    // Handle enter key and blur
    input.addEventListener('keydown', handleEditKeyDown);
    input.addEventListener('blur', handleEditBlur);
}

function handleEditKeyDown(event) {
    if (event.key === 'Enter') {
        finishEditing(event.target);
    } else if (event.key === 'Escape') {
        cancelEditing(event.target);
    }
}

function handleEditBlur(event) {
    finishEditing(event.target);
}

function finishEditing(input) {
    const newValue = input.value.trim();
    if (newValue === '') {
        cancelEditing(input);
        return;
    }
    
    const schema = input.dataset.schema!="null" ? input.dataset.schema : null;
    const table = input.dataset.table!="null" ? input.dataset.table : null;
    const column = input.dataset.column!="null" ? input.dataset.column : null;
    
    if (newValue !== input.dataset.originalValue) {
        // Update the appropriate name based on what was edited
        if (column) {
            console.log("trigger column update", column)
            updateColumnName(schema, table, column, newValue);
        } else if (table) {
            console.log("trigger table update", table)
            updateTableName(schema, table, newValue);
        } else {
            console.log("trigger schema update", schema)
            updateSchemaName(schema, newValue);
        }
    }
    
    // Remove the input and restore text
    const parentElement = input.parentElement;
    parentElement.textContent = newValue;
    
    // Remove event listeners
    input.removeEventListener('keydown', handleEditKeyDown);
    input.removeEventListener('blur', handleEditBlur);
}

function cancelEditing(input) {
    const originalValue = input.dataset.originalValue;
    const parentElement = input.parentElement;
    parentElement.textContent = originalValue;
    
    // Remove event listeners
    input.removeEventListener('keydown', handleEditKeyDown);
    input.removeEventListener('blur', handleEditBlur);
}
