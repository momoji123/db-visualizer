import { updateColumnName, updateTableName, updateSchemaName, deleteColumn, state, deleteTable} from './state.js';
import { renderVisualization } from './renderer.js'

let keydownEventTriggered = false;

export function startEditing(element, schema, table, column) {
    console.log("startEditing", state.tableVisibility)
    const currentText = element.textContent;
    const input = document.createElement('input');
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
        keydownEventTriggered = true;
        console.log("edit > enter > state", state.tableVisibility);
        finishEditing(event.target);
    } else if (event.key === 'Escape') {
        keydownEventTriggered = true;
        cancelEditing(event.target);
    }
}

function handleEditBlur(event) {
    if(!keydownEventTriggered){
        //triggered only if not enter or escape keydown event triggered
        console.log("edit > blur > state", state.tableVisibility);
        finishEditing(event.target);
    }else{
        //reset variable
        keydownEventTriggered = false;
    }
}

function finishEditing(input) {
    console.log(state.tableVisibility);
    const newValue = input.value.trim();
    
    const schema = input.dataset.schema!="null" ? input.dataset.schema : null;
    const table = input.dataset.table!="null" ? input.dataset.table : null;
    const column = input.dataset.column!="null" ? input.dataset.column : null;
    
    if (newValue !== input.dataset.originalValue) {
        // Update the appropriate name based on what was edited
        if (column) {
            console.log("trigger column update", column)
            if(newValue){
                updateColumnName(schema, table, column, newValue);
            }else{
                deleteColumn(schema, table, column);
            }
            
        } else if (table) {
            console.log("trigger table update", table)
            if(newValue){
                updateTableName(schema, table, newValue);
            }else{
                deleteTable(schema, table);
            }
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

    renderVisualization();
}

function cancelEditing(input) {
    const originalValue = input.dataset.originalValue;
    const parentElement = input.parentElement;
    parentElement.textContent = originalValue;
    
    // Remove event listeners
    input.removeEventListener('keydown', handleEditKeyDown);
    input.removeEventListener('blur', handleEditBlur);
    renderVisualization();
}
