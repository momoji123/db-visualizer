// table-filter.js

// This module handles table filtering functionality
const TableFilter = (function() {
    // Private variables
    let visibleTables = new Set(); // Stores keys of visible tables (schema.table)
    let allTableKeys = []; // Stores all table keys
    let searchTerm = ""; // Current search term
    
    // DOM elements
    let sidebar;
    let sidebarOverlay;
    let tableListContainer;
    let searchInput;
    let selectAllCheckbox;
    let isFiltered = false; // Track if a specific filter is active
    
    // Initialize the module
    function init() {
        // Create overlay for sidebar if it doesn't exist
        if (!document.getElementById('sidebar-overlay')) {
            sidebarOverlay = document.createElement('div');
            sidebarOverlay.id = 'sidebar-overlay';
            sidebarOverlay.className = 'sidebar-overlay';
            document.body.appendChild(sidebarOverlay);
        } else {
            sidebarOverlay = document.getElementById('sidebar-overlay');
        }
        
        // Cache DOM elements
        sidebar = document.getElementById('filter-sidebar');
        tableListContainer = document.getElementById('table-list');
        searchInput = document.getElementById('table-search');
        selectAllCheckbox = document.getElementById('select-all-tables');
        
        // Set up event listeners
        document.getElementById('toggle-sidebar').addEventListener('click', toggleSidebar);
        document.getElementById('close-sidebar').addEventListener('click', closeSidebar);
        sidebarOverlay.addEventListener('click', closeSidebar);
        searchInput.addEventListener('input', handleSearch);
        document.getElementById('clear-search').addEventListener('click', clearSearch);
        selectAllCheckbox.addEventListener('change', toggleSelectAll);
        document.getElementById('apply-filters').addEventListener('click', applyFilters);
    }
    
    // Toggle sidebar visibility
    function toggleSidebar() {
        sidebar.classList.toggle('open');
        sidebarOverlay.classList.toggle('active');
    }
    
    // Close sidebar
    function closeSidebar() {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('active');
    }
    
    // Handle search input
    function handleSearch() {
        searchTerm = searchInput.value.toLowerCase();
        renderTableList();
    }
    
    // Clear search
    function clearSearch() {
        searchInput.value = '';
        searchTerm = '';
        renderTableList();
    }
    
    // Toggle select all checkbox
    function toggleSelectAll() {
        const isChecked = selectAllCheckbox.checked;
        
        // Update all visible checkboxes
        const checkboxes = tableListContainer.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = isChecked;
        });
        
        // Don't apply filters yet - user needs to click Apply
    }
    
    // Apply the selected filters
    function applyFilters() {
        // Get all displayed checkboxes
		const displayedCheckboxes = tableListContainer.querySelectorAll('input[type="checkbox"]');
		
		// Update visible tables only for the checkboxes that are currently displayed
		displayedCheckboxes.forEach(checkbox => {
			const key = checkbox.value;
			if (checkbox.checked) {
				visibleTables.add(key);
			} else {
				visibleTables.delete(key);
			}
		});

        // Check if any filter is applied (either from sidebar or programmatically)
        isFiltered = visibleTables.size !== allTableKeys.length; 
		
		// Close the sidebar
		closeSidebar();
		
		// Trigger the re-render
        applyFiltersAndRender();
    }

    // Centralized function to trigger rendering after filter changes
    function applyFiltersAndRender() {
        // Find and trigger the renderVisualization function from the main script
        // Ensure renderVisualization is globally accessible or imported correctly
        if (typeof window.renderVisualization === 'function') {
           window.renderVisualization();
       } else {
           // Fallback event dispatching
           console.warn("renderVisualization not found globally. Using event dispatch.");
           const event = new CustomEvent('filtersApplied');
           document.dispatchEvent(event);
       }
   }
    
    // Update table list based on schemas
    function updateTableList(schemas) {
        // Clear allTableKeys and reset visibleTables
        allTableKeys = [];
        visibleTables.clear();
        
        // Populate allTableKeys and visibleTables with all tables by default
        Object.keys(schemas).forEach(schemaName => {
            Object.keys(schemas[schemaName].tables).forEach(tableName => {
                const key = `${schemaName}.${tableName}`;
                allTableKeys.push(key);
                visibleTables.add(key);
            });
        });
        
        // Render the table list
        renderTableList();
    }
    
    // Render the table list with checkboxes
    function renderTableList() {
        // Clear the container
        tableListContainer.innerHTML = '';
        
        // Filter tables based on search term
        const filteredTables = allTableKeys.filter(key => {
            if (!searchTerm) return true;
            return key.toLowerCase().includes(searchTerm);
        });
        
        // Create checkbox for each table
        filteredTables.forEach(key => {
            const [schema, table] = key.split('.');
            
            const tableItem = document.createElement('div');
            tableItem.className = 'table-item';
            
            const label = document.createElement('label');
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = key;
            checkbox.checked = visibleTables.has(key);
            
            const tableText = document.createTextNode(`${schema}.${table}`);
            
            label.appendChild(checkbox);
            label.appendChild(tableText);
            tableItem.appendChild(label);
            
            tableListContainer.appendChild(tableItem);
        });
        
        // Update select all checkbox state
        updateSelectAllState();
    }
    
    // Update the state of the select all checkbox
    function updateSelectAllState() {
        const checkboxes = tableListContainer.querySelectorAll('input[type="checkbox"]');
        const checkedBoxes = tableListContainer.querySelectorAll('input[type="checkbox"]:checked');
        
        if (checkboxes.length === 0) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        } else if (checkedBoxes.length === 0) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        } else if (checkedBoxes.length === checkboxes.length) {
            selectAllCheckbox.checked = true;
            selectAllCheckbox.indeterminate = false;
        } else {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = true;
        }
    }
    
    // Check if a table should be visible
    function isTableVisible(schema, table) {
        return visibleTables.has(`${schema}.${table}`);
    }

    // Set the filter to show only a specific list of tables
    function filterByTableList(tableKeysToShow) {
        visibleTables.clear(); // Start fresh
        tableKeysToShow.forEach(key => {
            if (allTableKeys.includes(key)) { // Ensure the key is valid
                 visibleTables.add(key);
            }
        });
        isFiltered = true; // Mark that a specific filter is active
        
        // Re-render the main visualization
        applyFiltersAndRender();

        // Update the sidebar list (optional, but good for consistency)
        renderTableList();
        updateSelectAllState(); // Update select all based on new visibility

        // Close sidebar if open
        closeSidebar();
    }

    // Reset the filter to show all tables
    function showAllTables() {
        visibleTables.clear();
        allTableKeys.forEach(key => visibleTables.add(key)); // Add all back
        isFiltered = false; // Mark that the filter is reset

        // Re-render the main visualization
        applyFiltersAndRender();

        // Update the sidebar list
        renderTableList();
        updateSelectAllState(); // Update select all based on new visibility
    }
    
    // Public API
    return {
        init,
        updateTableList,
        isTableVisible,
        filterByTableList, // Expose the new function
        showAllTables,     // Expose the reset function
        toggleSidebar,      // Expose toggle if needed elsewhere, e.g., a reset button
        getVisibleTableKeys: function() {
            return Array.from(visibleTables); // Return a copy as an array
        }
    };
})();

// Make it available globally
window.TableFilter = TableFilter;
