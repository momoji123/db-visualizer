// scripts/main.js
import { setupInitialListeners } from './eventListeners.js';
// Assuming TableFilter is initialized via a separate script tag or needs initialization here
// import { TableFilter } from './table-filter.js';

document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM fully loaded and parsed.");

     // Initialize the Table Filter module if it exposes an init function
     if (window.TableFilter && typeof window.TableFilter.init === 'function') {
        window.TableFilter.init();
         console.log("TableFilter initialized.");
    } else {
         console.warn("TableFilter not found or does not have an init function.");
     }


    // Setup the main application event listeners
    setupInitialListeners();

    // Initial UI setup or rendering could go here if needed,
    // but most rendering happens after data loading in fileHandlers.js
});