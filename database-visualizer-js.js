// script.js

document.addEventListener('DOMContentLoaded', function() {
	// Initialize Table Filter module
    TableFilter.init();
	
    // DOM Elements
    const fileInput = document.getElementById('file-input');
    const uploadBtn = document.getElementById('upload-btn');
    const uploadBtnEmpty = document.getElementById('upload-btn-empty');
    const exportBtn = document.getElementById('export-btn');
    const emptyState = document.getElementById('empty-state');
    const workspace = document.getElementById('workspace');
    const svgCanvas = document.getElementById('svg-canvas');
    const tablesContainer = document.getElementById('tables-container');
    const selectionInfo = document.getElementById('selection-info');
    const statusInfo = document.getElementById('status-info');

    // App State
    let data = [];
    let schemas = {};
    let selectedColumns = [];
    let isDragging = false;
    let draggedTable = null;
    let dragOffset = { x: 0, y: 0 };
    let tablePositions = {};
	
	// Make renderVisualization accessible outside the IIFE scope
	window.renderVisualization = function() {
		// This function will be defined later in this file
		// It will reference the actual renderVisualization function
	};


    // Event Listeners
    uploadBtn.addEventListener('click', () => fileInput.click());
    uploadBtnEmpty.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileUpload);
    exportBtn.addEventListener('click', handleExport);
    tablesContainer.addEventListener('mouseup', handleDragEnd);
    document.addEventListener('mouseup', handleDragEnd); // Added document-level listener
    tablesContainer.addEventListener('mouseleave', handleDragEnd);
    tablesContainer.addEventListener('mousemove', handleDrag);
    document.addEventListener('mousemove', handleDrag); // Added document-level listener

    // Functions
    function handleFileUpload(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target.result;
                const lines = text.split('\n');
                
                // Skip empty lines
                const parsedData = lines
                    .filter(line => line.trim() !== '')
                    .slice(1) // Skip header row
                    .map(line => {
                        const values = line.split(';');
                        return {
                            schema: values[0] || '',
                            table_name: values[1] || '',
                            column_name: values[2] || '',
                            relation_table_name: values[3] || '',
                            relation_column_name: values[4] || ''
                        };
                    });
                    
                data = parsedData;
                processData();
                showWorkspace();
            };
            reader.readAsText(file);
        }
    }

    function processData() {
        // Reset state
        schemas = {};
        tablePositions = {};
        
        // First pass: build schemas and tables
        data.forEach(row => {
            const { schema, table_name, column_name } = row;
            
            if (!schemas[schema]) {
                schemas[schema] = {
                    tables: {},
                    position: { x: Math.random() * 300, y: Math.random() * 300 }
                };
            }
            
            if (!schemas[schema].tables[table_name]) {
                schemas[schema].tables[table_name] = {
                    columns: [],
                    position: { x: 0, y: 0 },
                    relations: []
                };
            }
            
            if (!schemas[schema].tables[table_name].columns.includes(column_name)) {
                schemas[schema].tables[table_name].columns.push(column_name);
            }
        });
        
        // Second pass: add relations
        data.forEach(row => {
            const { schema, table_name, column_name, relation_table_name, relation_column_name } = row;
            
            if (relation_table_name && relation_column_name) {
                // Find which schema contains the related table
                let relationSchemaName = null;
                Object.keys(schemas).forEach(s => {
                    if (schemas[s].tables[relation_table_name]) {
                        relationSchemaName = s;
                    }
                });
                
                if (relationSchemaName) {
                    schemas[schema].tables[table_name].relations.push({
                        from: {
                            schema,
                            table: table_name,
                            column: column_name
                        },
                        to: {
                            schema: relationSchemaName,
                            table: relation_table_name,
                            column: relation_column_name
                        }
                    });
                }
            }
        });
        
        // Initialize table positions
        Object.keys(schemas).forEach(schema => {
            const tableNames = Object.keys(schemas[schema].tables);
            const tableCount = tableNames.length;
            
            tableNames.forEach((table, index) => {
                const key = `${schema}.${table}`;
                // Arrange tables in a circle within their schema
                const radius = 150;
                const angle = (2 * Math.PI * index) / tableCount;
                tablePositions[key] = {
                    x: 300 + radius * Math.cos(angle),
                    y: 300 + radius * Math.sin(angle)
                };
            });
        });
		
		// After processing data and setting up tables, update the filter sidebar
		TableFilter.updateTableList(schemas);
        
        renderVisualization();
        updateStatus();
    }

    function showWorkspace() {
        emptyState.style.display = 'none';
        workspace.style.display = 'block';
        exportBtn.disabled = false;
    }

    function renderVisualization() {
        // Clear containers
        tablesContainer.innerHTML = '';
        svgCanvas.innerHTML = '';
        
        // Set SVG viewBox based on workspace size
        const workspaceRect = workspace.getBoundingClientRect();
        svgCanvas.setAttribute('width', workspaceRect.width);
        svgCanvas.setAttribute('height', workspaceRect.height);
        
        // Render schemas
        renderSchemas();
        
        // Render tables
        renderTables();
        
        // Render relations
        renderRelations();
    }
	
	// Store reference to the function
	window.renderVisualization = renderVisualization;

	// Also add a fallback event listener
	document.addEventListener('filtersApplied', renderVisualization);

    function renderSchemas() {
        Object.keys(schemas).forEach(schemaName => {
            const schema = schemas[schemaName];
            
            // Calculate schema boundaries based on table positions
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            let hasPositions = false;
            
            Object.keys(schema.tables).forEach(tableName => {
                const key = `${schemaName}.${tableName}`;
                const pos = tablePositions[key];
                
                if (pos) {
                    hasPositions = true;
                    // Approximate table dimensions
                    const tableWidth = 200;
                    const tableHeight = 40 + schema.tables[tableName].columns.length * 30;
                    
                    minX = Math.min(minX, pos.x - 20);
                    minY = Math.min(minY, pos.y - 20);
                    maxX = Math.max(maxX, pos.x + tableWidth + 20);
                    maxY = Math.max(maxY, pos.y + tableHeight + 20);
                }
            });
            
            // Only draw schema if we have tables with positions
            if (hasPositions) {
                const width = maxX - minX;
                const height = maxY - minY;
                
                // Create schema area
                const schemaArea = document.createElement('div');
                schemaArea.className = 'schema-area';
                schemaArea.style.left = `${minX}px`;
                schemaArea.style.top = `${minY}px`;
                schemaArea.style.width = `${width}px`;
                schemaArea.style.height = `${height}px`;
                
                // Create schema title inside the schema area
                const schemaTitle = document.createElement('div');
                schemaTitle.className = 'schema-title';
                schemaTitle.textContent = schemaName;
                schemaTitle.style.position = 'absolute';
                schemaTitle.style.top = '10px';
                schemaTitle.style.left = '20px';
                
                // Append title to schema area, not directly to tablesContainer
                schemaArea.appendChild(schemaTitle);
                tablesContainer.appendChild(schemaArea);
            }
        });
    }

    function renderTables() {
        Object.keys(schemas).forEach(schemaName => {
            Object.keys(schemas[schemaName].tables).forEach(tableName => {
				if (!TableFilter.isTableVisible(schemaName, tableName)) {
					return; // Skip rendering this table
				}
				
                const table = schemas[schemaName].tables[tableName];
                const position = tablePositions[`${schemaName}.${tableName}`] || { x: 0, y: 0 };
                
                // Create table container
                const tableDiv = document.createElement('div');
                tableDiv.className = 'table';
                tableDiv.id = `table-${schemaName}-${tableName}`;
                tableDiv.style.left = `${position.x}px`;
                tableDiv.style.top = `${position.y}px`;
                
                // Create table header
                const tableHeader = document.createElement('div');
                tableHeader.className = 'table-header';
                tableHeader.textContent = tableName;
                tableHeader.addEventListener('mousedown', (e) => handleDragStart(e, schemaName, tableName));
                
                // Create columns container
                const columnsDiv = document.createElement('div');
                columnsDiv.className = 'table-columns';
                
                // Add columns
                table.columns.forEach(column => {
                    const columnDiv = document.createElement('div');
                    columnDiv.className = 'column';
                    columnDiv.id = `col-${schemaName}-${tableName}-${column}`;
                    columnDiv.textContent = column;
                    
                    // Check if column is selected
                    const isSelected = selectedColumns.some(
                        c => c.schema === schemaName && c.table === tableName && c.column === column
                    );
                    
                    if (isSelected) {
                        columnDiv.classList.add('selected');
                    }
                    
                    columnDiv.addEventListener('click', () => handleColumnClick(schemaName, tableName, column));
                    columnsDiv.appendChild(columnDiv);
                });
                
                tableDiv.appendChild(tableHeader);
                tableDiv.appendChild(columnsDiv);
                tablesContainer.appendChild(tableDiv);
            });
        });
    }

	function renderRelations() {
		// Clear existing SVG content
		svgCanvas.innerHTML = '';
		
		// Create SVG namespace elements
		const ns = "http://www.w3.org/2000/svg";
		
		// Make SVG canvas visible and ensure it spans the entire workspace
		svgCanvas.style.pointerEvents = 'none';
		
		// Create groups for different types of elements to control layering
		const linesGroup = document.createElementNS(ns, 'g');
		const endpointsGroup = document.createElementNS(ns, 'g');
		const deleteButtonsGroup = document.createElementNS(ns, 'g');
		
		// Add groups to SVG in order (bottom to top)
		svgCanvas.appendChild(linesGroup);
		svgCanvas.appendChild(endpointsGroup);
		svgCanvas.appendChild(deleteButtonsGroup); // Delete buttons on top
		
		Object.keys(schemas).forEach(schemaName => {
			const schema = schemas[schemaName];
			
			Object.keys(schema.tables).forEach(tableName => {
				// Skip if this table is filtered out
				if (!TableFilter.isTableVisible(schemaName, tableName)) {
					return;
				}
				
				const table = schema.tables[tableName];
				
				table.relations.forEach(relation => {
					const fromKey = `${relation.from.schema}.${relation.from.table}`;
					const toKey = `${relation.to.schema}.${relation.to.table}`;
					
					// Skip if either source or target table is filtered out
					if (!TableFilter.isTableVisible(relation.from.schema, relation.from.table) || 
						!TableFilter.isTableVisible(relation.to.schema, relation.to.table)) {
						return;
					}
					
					if (tablePositions[fromKey] && tablePositions[toKey]) {
						const fromTableElem = document.getElementById(`table-${relation.from.schema}-${relation.from.table}`);
						const toTableElem = document.getElementById(`table-${relation.to.schema}-${relation.to.table}`);
						
						if (fromTableElem && toTableElem) {
							const fromColumnElem = document.getElementById(`col-${relation.from.schema}-${relation.from.table}-${relation.from.column}`);
							const toColumnElem = document.getElementById(`col-${relation.to.schema}-${relation.to.table}-${relation.to.column}`);
							
							if (fromColumnElem && toColumnElem) {
								// Get positions for the columns
								const fromRect = fromColumnElem.getBoundingClientRect();
								const toRect = toColumnElem.getBoundingClientRect();
								const workspaceRect = workspace.getBoundingClientRect();
								
								// Calculate start and end points relative to the workspace
								const fromX = fromRect.right - workspaceRect.left;
								const fromY = fromRect.top - workspaceRect.top + (fromRect.height / 2);
								const toX = toRect.left - workspaceRect.left;
								const toY = toRect.top - workspaceRect.top + (toRect.height / 2);
								
								// Create relation line (add to lines group)
								const line = document.createElementNS(ns, 'line');
								line.setAttribute('x1', fromX);
								line.setAttribute('y1', fromY);
								line.setAttribute('x2', toX);
								line.setAttribute('y2', toY);
								line.setAttribute('stroke', '#3498db');
								line.setAttribute('stroke-width', '2');
								linesGroup.appendChild(line);
								
								// Create circles at endpoints (add to endpoints group)
								const fromCircle = document.createElementNS(ns, 'circle');
								fromCircle.setAttribute('cx', fromX);
								fromCircle.setAttribute('cy', fromY);
								fromCircle.setAttribute('r', '3');
								fromCircle.setAttribute('fill', '#3498db');
								endpointsGroup.appendChild(fromCircle);
								
								const toCircle = document.createElementNS(ns, 'circle');
								toCircle.setAttribute('cx', toX);
								toCircle.setAttribute('cy', toY);
								toCircle.setAttribute('r', '3');
								toCircle.setAttribute('fill', '#3498db');
								endpointsGroup.appendChild(toCircle);
								
								// Create delete button in the middle (add to delete buttons group)
								const midX = (fromX + toX) / 2;
								const midY = (fromY + toY) / 2;
								
								const deleteButton = document.createElementNS(ns, 'g');
								deleteButton.classList.add('relation-delete');
								deleteButton.setAttribute('transform', `translate(${midX}, ${midY})`);
								
								// Making it properly clickable
								deleteButton.style.pointerEvents = 'all';
								deleteButton.style.cursor = 'pointer';
								
								// Store relation data for deletion
								const relationData = JSON.stringify({
									from: relation.from,
									to: relation.to
								});
								deleteButton.setAttribute('data-relation', relationData);
								
								deleteButton.addEventListener('click', function(e) {
									e.stopPropagation(); // Prevent event bubbling
									const data = JSON.parse(this.getAttribute('data-relation'));
									removeRelation(data.from, data.to);
								});
								
								const buttonCircle = document.createElementNS(ns, 'circle');
								buttonCircle.setAttribute('r', '10');
								buttonCircle.setAttribute('fill', 'white');
								buttonCircle.setAttribute('stroke', '#e74c3c');
								deleteButton.appendChild(buttonCircle);
								
								// Create X icon
								const xLine1 = document.createElementNS(ns, 'line');
								xLine1.setAttribute('x1', -5);
								xLine1.setAttribute('y1', -5);
								xLine1.setAttribute('x2', 5);
								xLine1.setAttribute('y2', 5);
								xLine1.setAttribute('stroke', '#e74c3c');
								xLine1.setAttribute('stroke-width', '2');
								deleteButton.appendChild(xLine1);
								
								const xLine2 = document.createElementNS(ns, 'line');
								xLine2.setAttribute('x1', 5);
								xLine2.setAttribute('y1', -5);
								xLine2.setAttribute('x2', -5);
								xLine2.setAttribute('y2', 5);
								xLine2.setAttribute('stroke', '#e74c3c');
								xLine2.setAttribute('stroke-width', '2');
								deleteButton.appendChild(xLine2);
								
								// Add the delete button to the top-most group
								deleteButtonsGroup.appendChild(deleteButton);
							}
						}
					}
				});
			});
		});
	}
    
    function handleDragStart(e, schema, table) {
        e.preventDefault();
        const rect = e.currentTarget.parentElement.getBoundingClientRect();
        
        dragOffset = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        
        isDragging = true;
        draggedTable = { schema, table };
        
        // Add event listeners for dragging
        document.body.style.cursor = 'move';
    }

    function handleDrag(e) {
        if (isDragging && draggedTable) {
            const { schema, table } = draggedTable;
            const key = `${schema}.${table}`;
            
            const tableElem = document.getElementById(`table-${schema}-${table}`);
            if (!tableElem) return;
            
            const workspaceRect = workspace.getBoundingClientRect();
            const newX = e.clientX - workspaceRect.left - dragOffset.x;
            const newY = e.clientY - workspaceRect.top - dragOffset.y;
            
            // Update position
            tablePositions[key] = {
                x: newX,
                y: newY
            };
            
            // Update table position
            tableElem.style.left = `${newX}px`;
            tableElem.style.top = `${newY}px`;
            
            // Update relations without full re-render for better performance
            renderRelations(); // This now clears the SVG before rendering new relations
        }
    }

    function handleDragEnd() {
        if (isDragging) {
            isDragging = false;
            draggedTable = null;
            document.body.style.cursor = 'default';
            // Full re-render after drag to update schema boundaries
            renderVisualization();
        }
    }

    function handleColumnClick(schema, table, column) {
        // Check if column is already selected
        const existingIndex = selectedColumns.findIndex(item => 
            item.schema === schema && item.table === table && item.column === column);
        
        if (existingIndex > -1) {
            // Unselect the column
            selectedColumns.splice(existingIndex, 1);
        } else {
            // Check if we already have a column selected from the same table
            const sameTableIndex = selectedColumns.findIndex(item => 
                item.schema === schema && item.table === table);
                
            if (sameTableIndex > -1) {
                // Replace existing column from same table
                selectedColumns.splice(sameTableIndex, 1);
            }
            
            // Add new column selection (max 2)
            selectedColumns.push({ schema, table, column });
            
            // Trim to 2 columns maximum
            if (selectedColumns.length > 2) {
                selectedColumns.shift();
            }
            
            // If we now have 2 selected columns from different tables, create a relation
            if (selectedColumns.length === 2 && 
                (selectedColumns[0].table !== selectedColumns[1].table)) {
                addRelation(selectedColumns[0], selectedColumns[1]);
                selectedColumns = []; // Reset selection
            }
        }
        
        updateSelectionInfo();
        renderVisualization();
    }

    function addRelation(from, to) {
        // Add relation in data format
        const newRow = {
            schema: from.schema,
            table_name: from.table,
            column_name: from.column,
            relation_table_name: to.table,
            relation_column_name: to.column
        };
        
        data.push(newRow);
        
        // Update schemas
        if (schemas[from.schema]?.tables[from.table]) {
            schemas[from.schema].tables[from.table].relations.push({
                from: {
                    schema: from.schema,
                    table: from.table,
                    column: from.column
                },
                to: {
                    schema: to.schema,
                    table: to.table,
                    column: to.column
                }
            });
        }
        
        renderVisualization();
        updateStatus();
    }

    function removeRelation(from, to) {
        // Debug log to verify removal is being called
        console.log("Removing relation:", from, to);
        
        // Remove relation from data
        data = data.filter(row => 
            !(row.schema === from.schema && 
              row.table_name === from.table && 
              row.column_name === from.column && 
              row.relation_table_name === to.table && 
              row.relation_column_name === to.column)
        );
        
        // Remove relation from schemas
        if (schemas[from.schema]?.tables[from.table]) {
            schemas[from.schema].tables[from.table].relations = 
                schemas[from.schema].tables[from.table].relations.filter(
                    relation => 
                        !(relation.from.schema === from.schema && 
                          relation.from.table === from.table && 
                          relation.from.column === from.column && 
                          relation.to.table === to.table && 
                          relation.to.column === to.column)
                );
        }
        
        renderVisualization();
        updateStatus();
    }

    function handleExport() {
        // Create CSV content
        const csvContent = 
            "schema;table_name;column_name;relation_table_name;relation_column_name\n" + 
            data.map(row => 
                `${row.schema};${row.table_name};${row.column_name};${row.relation_table_name || ''};${row.relation_column_name || ''}`
            ).join('\n');
        
        // Create download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'database_schema.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function updateSelectionInfo() {
        if (selectedColumns.length > 0) {
            const selectionText = selectedColumns.map(col => `${col.table}.${col.column}`).join(' → ');
            let infoText = `Selected: ${selectionText}`;
            
            if (selectedColumns.length === 1) {
                infoText += " (Select another column to create a relation)";
            }
            
            selectionInfo.textContent = infoText;
        } else {
            selectionInfo.textContent = '';
        }
    }

    function updateStatus() {
        if (data.length > 0) {
            const schemaCount = Object.keys(schemas).length;
            const tableCount = Object.values(schemas).reduce((count, schema) => 
                count + Object.keys(schema.tables).length, 0);
            statusInfo.textContent = `${schemaCount} schemas, ${tableCount} tables, ${data.length} items loaded`;
        } else {
            statusInfo.textContent = 'No data loaded';
        }
    }
});