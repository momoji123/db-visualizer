// scripts/renderer.js
import * as DOM from './domElements.js';
import { state, saveScrollPosition, isTableSelected } from './state.js';
import { handleDragStart, handleSchemaDragStart } from './dragDrop.js';
import { handleColumnClick } from './eventListeners.js'; // Changed from relationManager
import { removeRelation } from './relationManager.js';
import { startEditing } from './editingUtil.js';
// Assuming TableFilter is global or imported
// import { TableFilter } from './table-filter.js';

let clickTimer = null;
const delay = 125;
let isLeftMouseButtonDown = false;

function renderSchemas() {
     Object.keys(state.schemas).forEach(schemaName => {
        const schema = state.schemas[schemaName];

        // Calculate schema boundaries based on table positions within this schema
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        let hasVisibleTables = false;

        Object.keys(schema.tables).forEach(tableName => {
            const key = `${schemaName}.${tableName}`;
             // Check if table is visible according to the filter
            if (window.TableFilter && window.TableFilter.isTableVisible(schemaName, tableName)) {
                 const pos = state.tablePositions[key];
                 if (pos) {
                    hasVisibleTables = true;
                    // Approximate table dimensions (could be improved by getting actual dimensions)
                    const tableElem = document.getElementById(`table-${schemaName}-${tableName}`);
                    const tableWidth = tableElem ? tableElem.offsetWidth : 200; // Use actual width if available
                    const tableHeight = tableElem ? tableElem.offsetHeight : (40 + schema.tables[tableName].columns.length * 30); // Use actual height

                    minX = Math.min(minX, pos.x);
                    minY = Math.min(minY, pos.y);
                    maxX = Math.max(maxX, pos.x + tableWidth);
                    maxY = Math.max(maxY, pos.y + tableHeight);
                }
            }
        });

        // Only draw schema if it contains visible tables with positions
        if (hasVisibleTables) {
            const marginX = 50; // Increased horizontal margin
            const marginY = 60; // Increased vertical margin

            const finalX = minX - marginX;
            const finalY = minY - marginY;
            const width = (maxX - minX) + (marginX * 2);
            const height = (maxY - minY) + (marginY * 2);


            // Create schema area
            const schemaArea = document.createElement('div');
            schemaArea.className = 'schema-area';
             schemaArea.style.left = `${finalX}px`;
             schemaArea.style.top = `${finalY}px`;
             schemaArea.style.width = `${width}px`;
             schemaArea.style.height = `${height}px`;
             schemaArea.dataset.schema = schemaName; // Add data attribute for identification
			 
            // Create schema title inside the schema area
            const schemaTitle = document.createElement('div');
            schemaTitle.className = 'schema-title';
            schemaTitle.textContent = schemaName;
            // Position title relative to the schema area borders
            schemaTitle.style.position = 'absolute';
            schemaTitle.style.top = '15px'; // Adjusted position
            schemaTitle.style.left = '25px';// Adjusted position

            schemaArea.addEventListener('mouseup', (e) => {
                // Check specifically for the left mouse button
                if (e.button === 0) {
                    isLeftMouseButtonDown = false;
                }
            });
            // <-- Add MouseDown Listener for Schema Dragging -->
			schemaArea.addEventListener('mousedown', (e) => {
                // Only trigger schema drag if clicking directly on the schema area,
                // not on a table element that might be inside its bounds visually.
                if (e.button === 0) {
                    isLeftMouseButtonDown = true;
                }
                if (e.target === schemaArea) {
                    clearTimeout(clickTimer);
                    let currentTarget = e.currentTarget;
                    clickTimer = setTimeout(() => {
                        if(isLeftMouseButtonDown){
                            // This code will run if no second click (double-click) happens within the delay
                            handleSchemaDragStart(e, currentTarget, schemaName);
                        }
                    }, delay);
                }
            });

            // For schema title double-click
            schemaArea.addEventListener('dblclick', (e) => {
                clearTimeout(clickTimer);
                e.stopPropagation();
                startEditing(e.target, schemaName, null, null);
            });

             schemaArea.appendChild(schemaTitle);

             // Prepend schema areas so tables render on top
             DOM.tablesContainer.prepend(schemaArea); // Use prepend
        }
    });
}


function renderTables() {
    Object.keys(state.schemas).forEach(schemaName => {
        Object.keys(state.schemas[schemaName].tables).forEach(tableName => {
             // Use TableFilter to check visibility
             if (!window.TableFilter || !window.TableFilter.isTableVisible(schemaName, tableName)) {
                return; // Skip rendering this table if filtered out
            }


            const table = state.schemas[schemaName].tables[tableName];
            const key = `${schemaName}.${tableName}`;
            const position = state.tablePositions[key] || { x: 10, y: 10, z:3 }; // Default position if missing
            const isCollapsed = table.columnsCollapsed || false;

            // Create table container
            const tableDiv = document.createElement('div');
            tableDiv.className = 'table';
            tableDiv.id = `table-${schemaName}-${tableName}`;
            tableDiv.style.left = `${position.x}px`;
            tableDiv.style.top = `${position.y}px`;
            tableDiv.style.position = 'absolute'; // Ensure absolute positioning
			tableDiv.style.zIndex = position.z;

            if (isTableSelected(key)) {
                tableDiv.classList.add('selected');
            }

            // Create table header
            const tableHeaderContainer = document.createElement('div');
            tableHeaderContainer.className = 'table-header-container'; // Use a container for flex layout

            // Collapse/Expand Column Button
            const collapseButton = document.createElement('button');
            collapseButton.className = 'table-collapse-button btn'; // Add 'btn' class for basic styling
            collapseButton.innerHTML = isCollapsed ? '+' : '-'; // Set text based on state
            collapseButton.title = isCollapsed ? 'Expand columns' : 'Collapse columns';
            collapseButton.dataset.schema = schemaName;
            collapseButton.dataset.table = tableName;
            collapseButton.addEventListener('click', handleToggleColumns); // Add event listener

            const tableTitle = document.createElement('span');
            tableTitle.className = 'table-title';
            tableTitle.textContent = tableName;
            // For table title double-click
            tableTitle.addEventListener('dblclick', (e) => {
                if (!e.target.closest('.table-menu-button')) {
                    clearTimeout(clickTimer);
                    e.stopPropagation();
                    startEditing(e.target, schemaName, tableName, null);
                }
            });

            tableHeaderContainer.addEventListener('mouseup', (e) => {
                // Check specifically for the left mouse button
                if (e.button === 0) {
                    isLeftMouseButtonDown = false;
                }
            });

            // Attach drag start handler directly to the container or title
            tableHeaderContainer.addEventListener('mousedown', (e) => {
                if (e.button === 0) {
                    isLeftMouseButtonDown = true;
                }

                // Prevent drag if clicking on the menu button itself
                if (!e.target.closest('.table-menu-button')) {
                clearTimeout(clickTimer);
                let currentTarget = e.currentTarget;
                clickTimer = setTimeout(() => {
                    if(isLeftMouseButtonDown){
                        // This code will run if no second click (double-click) happens within the delay
                        handleDragStart(e, schemaName, tableName);
                    }
                }, delay);
                
                }
            });


            // --- MENU CODE ---
            const menuContainer = document.createElement('div');
            menuContainer.className = 'table-menu-container';

            const menuButton = document.createElement('button');
            menuButton.className = 'table-menu-button';
            menuButton.innerHTML = '&#x22EE;'; // Vertical ellipsis icon (or use an SVG)
            menuButton.title = 'Table options';
            menuButton.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent table drag
                // Toggle the dropdown visibility
                const dropdown = menuContainer.querySelector('.table-menu-dropdown');
                dropdown.classList.toggle('show');
            });


            const menuDropdown = document.createElement('div');
            menuDropdown.className = 'table-menu-dropdown';

            // Option 1: Show 'TO' relations
            const showToOption = document.createElement('button');
            showToOption.className = 'table-menu-item';
            showToOption.textContent = "Show 'To' Relations";
            showToOption.dataset.schema = schemaName;
            showToOption.dataset.table = tableName;
            showToOption.dataset.action = 'show-to';
            menuDropdown.appendChild(showToOption);

            // Option 2: Show 'FROM' relations
            const showFromOption = document.createElement('button');
            showFromOption.className = 'table-menu-item';
            showFromOption.textContent = "Show 'From' Relations";
            showFromOption.dataset.schema = schemaName;
            showFromOption.dataset.table = tableName;
            showFromOption.dataset.action = 'show-from';
            menuDropdown.appendChild(showFromOption);

            // Option 3: Hide Table
            const hideTableOption = document.createElement('button');
            hideTableOption.className = 'table-menu-item';
            hideTableOption.textContent = "Hide Table";
            hideTableOption.dataset.schema = schemaName;
            hideTableOption.dataset.table = tableName;
            hideTableOption.dataset.action = 'hide-table'; // New action type
            menuDropdown.appendChild(hideTableOption);

            // --- Future options can be added here ---
            // Example:
            // const futureOption = document.createElement('button');
            // futureOption.className = 'table-menu-item';
            // futureOption.textContent = "Future Action";
            // futureOption.dataset.schema = schemaName;
            // futureOption.dataset.table = tableName;
            // futureOption.dataset.action = 'future-action';
            // menuDropdown.appendChild(futureOption);

            menuContainer.appendChild(menuButton);
            menuContainer.appendChild(menuDropdown);
             // --- END NEW MENU CODE ---

            tableHeaderContainer.appendChild(tableTitle);
            tableHeaderContainer.appendChild(collapseButton); // Add before title/menu
            tableHeaderContainer.appendChild(menuContainer); // Add menu container to header
            tableDiv.appendChild(tableHeaderContainer); // Append header container

            // Create columns container
            const columnsDiv = document.createElement('div');
            columnsDiv.className = 'table-columns';

            const relatedColumns = getColumnsWithRelation(table, tableName, schemaName);

            // Add columns
            table.columns.forEach(column => {

                // Show column if:
                // 1. Table is not collapsed OR
                // 2. Table is collapsed AND this column is involved in a relation
                if (!isCollapsed || relatedColumns.has(column)) {
                    const columnDiv = document.createElement('div');
                    columnDiv.className = 'column';
                    columnDiv.id = `col-${schemaName}-${tableName}-${column}`;
                    columnDiv.textContent = column;

                    // Check if column is selected
                    const isSelected = state.selectedColumns.some(
                        c => c.schema === schemaName && c.table === tableName && c.column === column
                    );

                    if (isSelected) {
                        columnDiv.classList.add('selected');
                    }

                    // For column double-click (in the column event handler)
                    columnDiv.addEventListener('dblclick', (e) => {
                        clearTimeout(clickTimer);

                        e.stopPropagation();
                        startEditing(e.target, schemaName, tableName, column);
                    });

                    // Attach click handler
                    columnDiv.addEventListener('click', (e) => {
                        // Prevent triggering drag when clicking column
                        e.stopPropagation();

                        clearTimeout(clickTimer);
                        clickTimer = setTimeout(() => {
                            // This code will run if no second click (double-click) happens within the delay
                            handleColumnClick(schemaName, tableName, column);
                        }, delay);
                    });

                    columnsDiv.appendChild(columnDiv);
                }
            });

            
            tableDiv.appendChild(columnsDiv);
            DOM.tablesContainer.appendChild(tableDiv); // Append tables after schemas
        });
    });
}


export function renderRelations() {
    // Clear existing SVG content
    DOM.svgCanvas.innerHTML = '';

    const ns = "http://www.w3.org/2000/svg";
    DOM.svgCanvas.style.pointerEvents = 'none'; // Base canvas doesn't need events

     // Create groups for layering
    const linesGroup = document.createElementNS(ns, 'g');
    const endpointsGroup = document.createElementNS(ns, 'g');
    const deleteButtonsGroup = document.createElementNS(ns, 'g');
     deleteButtonsGroup.style.pointerEvents = 'all'; // Enable pointer events only for the delete buttons group


     DOM.svgCanvas.appendChild(linesGroup);
     DOM.svgCanvas.appendChild(endpointsGroup);
     DOM.svgCanvas.appendChild(deleteButtonsGroup);


    Object.keys(state.schemas).forEach(schemaName => {
        const schema = state.schemas[schemaName];
        Object.keys(schema.tables).forEach(tableName => {
             // Skip relations originating from a hidden table
             if (!window.TableFilter || !window.TableFilter.isTableVisible(schemaName, tableName)) {
                return;
            }

            const table = schema.tables[tableName];
            table.relations.forEach(relation => {
                 // Also skip relations pointing to a hidden table
                 if (!window.TableFilter || !window.TableFilter.isTableVisible(relation.to.schema, relation.to.table)) {
                    return;
                }

                const fromKey = `${relation.from.schema}.${relation.from.table}`;
                const toKey = `${relation.to.schema}.${relation.to.table}`;

                const fromTableElem = document.getElementById(`table-${fromKey.replace('.', '-')}`);
                const toTableElem = document.getElementById(`table-${toKey.replace('.', '-')}`);
                 const fromColumnElem = document.getElementById(`col-${fromKey.replace('.', '-')}-${relation.from.column}`);
                 const toColumnElem = document.getElementById(`col-${toKey.replace('.', '-')}-${relation.to.column}`);


                // Ensure both tables and columns exist in the DOM and have positions
                 if (fromTableElem && toTableElem && fromColumnElem && toColumnElem && state.tablePositions[fromKey] && state.tablePositions[toKey]) {

                    const fromPos = state.tablePositions[fromKey];
                    const toPos = state.tablePositions[toKey];

                     // Get column vertical offsets relative to their table's top
                     const fromColOffset = fromColumnElem.offsetTop + fromColumnElem.offsetHeight / 2;
                     const toColOffset = toColumnElem.offsetTop + toColumnElem.offsetHeight / 2;


                     // Calculate absolute coordinates for connection points
                     // Connect right side of 'from' table to left side of 'to' table
                     const fromX = fromPos.x + fromTableElem.offsetWidth; // Right edge of fromTable
                     const fromY = fromPos.y + fromColOffset; // Middle of fromColumn row


                     const toX = toPos.x; // Left edge of toTable
                     const toY = toPos.y + toColOffset; // Middle of toColumn row


                    // Create relation line
                    const line = document.createElementNS(ns, 'line');
                    line.setAttribute('x1', fromX);
                    line.setAttribute('y1', fromY);
                    line.setAttribute('x2', toX);
                    line.setAttribute('y2', toY);
                    line.setAttribute('stroke', '#3498db');
                    line.setAttribute('stroke-width', '2');
                    linesGroup.appendChild(line); // Add to lines group

                    // Create circles at endpoints
                    const fromCircle = document.createElementNS(ns, 'circle');
                    fromCircle.setAttribute('cx', fromX);
                    fromCircle.setAttribute('cy', fromY);
                    fromCircle.setAttribute('r', '3');
                    fromCircle.setAttribute('fill', '#3498db');
                    endpointsGroup.appendChild(fromCircle); // Add to endpoints group

                    const toCircle = document.createElementNS(ns, 'circle');
                    toCircle.setAttribute('cx', toX);
                    toCircle.setAttribute('cy', toY);
                    toCircle.setAttribute('r', '3');
                    toCircle.setAttribute('fill', '#3498db');
                    endpointsGroup.appendChild(toCircle); // Add to endpoints group

                    // Create delete button in the middle
                    const midX = (fromX + toX) / 2;
                    const midY = (fromY + toY) / 2;

                    const deleteButton = document.createElementNS(ns, 'g');
                    deleteButton.classList.add('relation-delete');
                    deleteButton.setAttribute('transform', `translate(${midX}, ${midY})`);
                    deleteButton.style.cursor = 'pointer'; // Make it obvious it's clickable
                     // Store relation data directly on the element
                     deleteButton.dataset.relationFrom = JSON.stringify(relation.from);
                     deleteButton.dataset.relationTo = JSON.stringify(relation.to);


                     deleteButton.addEventListener('click', function(e) {
                        e.stopPropagation(); // Prevent other events
                         const fromData = JSON.parse(this.dataset.relationFrom);
                         const toData = JSON.parse(this.dataset.relationTo);
                        console.log("Delete clicked for relation:", fromData, toData);
                        removeRelation(fromData, toData); // Call the manager function
                    });

                    const buttonCircle = document.createElementNS(ns, 'circle');
                    buttonCircle.setAttribute('r', '10');
                    buttonCircle.setAttribute('fill', 'white');
                    buttonCircle.setAttribute('stroke', '#e74c3c');
                    deleteButton.appendChild(buttonCircle);

                    // Create X icon
                    const xLine1 = document.createElementNS(ns, 'line');
                    xLine1.setAttribute('x1', -5); xLine1.setAttribute('y1', -5);
                    xLine1.setAttribute('x2', 5); xLine1.setAttribute('y2', 5);
                    xLine1.setAttribute('stroke', '#e74c3c'); xLine1.setAttribute('stroke-width', '2');
                    deleteButton.appendChild(xLine1);

                    const xLine2 = document.createElementNS(ns, 'line');
                    xLine2.setAttribute('x1', 5); xLine2.setAttribute('y1', -5);
                    xLine2.setAttribute('x2', -5); xLine2.setAttribute('y2', 5);
                    xLine2.setAttribute('stroke', '#e74c3c'); xLine2.setAttribute('stroke-width', '2');
                    deleteButton.appendChild(xLine2);

                    deleteButtonsGroup.appendChild(deleteButton); // Add to delete buttons group
                }
            });
        });
    });
}


// Main render function
export function renderVisualization() {
    // Save scroll position
    saveScrollPosition(DOM.workspace.scrollLeft || 0, DOM.workspace.scrollTop || 0);

     // Clear containers selectively
     DOM.tablesContainer.innerHTML = ''; // Clear tables and schema areas
     DOM.svgCanvas.innerHTML = ''; // Clear SVG relations


     // Calculate required size based on current table positions and workspace view
    const workspaceRect = DOM.workspace.getBoundingClientRect();
    let maxRight = workspaceRect.width;
    let maxBottom = workspaceRect.height;


    Object.keys(state.tablePositions).forEach(key => {
         const [schema, table] = key.split('.');
         // Consider only visible tables for boundary calculations
         if (window.TableFilter && window.TableFilter.isTableVisible(schema, table)) {
            const pos = state.tablePositions[key];
            if (pos && state.schemas[schema]?.tables[table]) {
                 // Estimate table dimensions (can be refined)
                 const tableWidth = 200; // A reasonable default or get from actual element if rendered
                 const tableHeight = 40 + (state.schemas[schema].tables[table].columns.length * 30); // Estimate


                 maxRight = Math.max(maxRight, pos.x + tableWidth + 150); // Add generous margin
                 maxBottom = Math.max(maxBottom, pos.y + tableHeight + 150); // Add generous margin
            }
        }
    });

    // Determine container dimensions
     const containerWidth = Math.max(DOM.workspace.clientWidth, maxRight); // Use clientWidth for visible area
     const containerHeight = Math.max(DOM.workspace.clientHeight, maxBottom); // Use clientHeight


     // Set dimensions for the scrollable container and the SVG canvas
     DOM.tablesContainer.style.width = `${containerWidth}px`;
     DOM.tablesContainer.style.height = `${containerHeight}px`;
     DOM.svgCanvas.setAttribute('width', containerWidth);
     DOM.svgCanvas.setAttribute('height', containerHeight);
     DOM.svgCanvas.style.width = `${containerWidth}px`;
     DOM.svgCanvas.style.height = `${containerHeight}px`;


     // Render components in order: schemas first, then tables, then relations on top
     renderSchemas(); // Renders schema backgrounds
     renderTables(); // Renders table divs on top of schemas
     renderRelations(); // Renders SVG lines/buttons over everything


    // Restore scroll position
    DOM.workspace.scrollLeft = state.lastScrollLeft;
    DOM.workspace.scrollTop = state.lastScrollTop;
}

function handleToggleColumns(event) {
    event.stopPropagation(); // Prevent table drag
    const button = event.currentTarget;
    const schemaName = button.dataset.schema;
    const tableName = button.dataset.table;

    if (state.schemas[schemaName] && state.schemas[schemaName].tables[tableName]) {
        // Toggle the state
        state.schemas[schemaName].tables[tableName].columnsCollapsed = !state.schemas[schemaName].tables[tableName].columnsCollapsed;

        // Re-render the visualization to reflect the change
        renderVisualization();
    } else {
        console.error("Table not found in state:", schemaName, tableName);
    }
}

function getColumnsWithRelation(table, tableName, schemaName){
    const relatedColumns = new Set();

    table.relations.forEach(rel => {
        relatedColumns.add(rel.from.column);
    });

    Object.keys(state.schemas).forEach(otherSchemaName => {
        Object.keys(state.schemas[otherSchemaName].tables).forEach(otherTableName => {
            // Don't check relations within the same table against itself in this loop
            if (otherSchemaName === schemaName && otherTableName === tableName) {
                return;
            }
            const otherTable = state.schemas[otherSchemaName].tables[otherTableName];
            otherTable.relations.forEach(rel => {
                // If this relation points TO the current table, add the target column
                if (rel.to.schema === schemaName && rel.to.table === tableName) {
                    relatedColumns.add(rel.to.column);
                }
            });
        });
    });

    return relatedColumns;
}