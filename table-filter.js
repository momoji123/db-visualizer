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
        // Clear the current set
        visibleTables.clear();
        
        // Get all checked tables
        const checkboxes = tableListContainer.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            if (checkbox.checked) {
                visibleTables.add(checkbox.value);
            }
        });
        
        // Close the sidebar
        closeSidebar();
        
        // Find and trigger the renderVisualization function from the main script
		if (typeof renderVisualization === 'function') {
			renderVisualization();
		} else {
			// As a fallback, dispatch a custom event that the main script can listen for
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
    
    // Public API
    return {
        init,
        updateTableList,
        isTableVisible
    };
})();

// Make it available globally
window.TableFilter = TableFilter;
