// scripts/relationManager.js
import {
    state,
    findRelationIndex,
    removeRelationFromSchema,
    addRelationToSchema,
    saveScrollPosition
} from './state.js';
import * as DOM from './domElements.js';
import { renderVisualization } from './renderer.js';
import { updateStatus } from './uiUpdater.js';

export function addRelation(from, to) {
    // Save scroll position before potential re-render
    saveScrollPosition(DOM.workspace.scrollLeft || 0, DOM.workspace.scrollTop || 0);

    // Add relation to the schema structure (for rendering)
    addRelationToSchema(from, to);

    renderVisualization();
    updateStatus();
}

export function removeRelation(from, to) {
    // Save scroll position
    saveScrollPosition(DOM.workspace.scrollLeft || 0, DOM.workspace.scrollTop || 0);

    console.log("Attempting to remove relation:", from, "->", to);

     // 2. Remove from the schema structure
     const relationIndex = findRelationIndex(from, to);
     if (relationIndex > -1) {
         removeRelationFromSchema(from, relationIndex);
         console.log("Relation removed from schema structure.");
     } else {
         console.warn("Relation not found in schema structure:", from, "->", to);
     }

    renderVisualization();
    updateStatus();
}

/**
 * Finds all tables that the given table has relations pointing TO.
 * @param {string} schemaName - The schema of the source table.
 * @param {string} tableName - The name of the source table.
 * @returns {Array<string>} An array of table keys ('schema.table') related TO the source table.
 */
export function getRelatedTablesTo(schemaName, tableName) {
    const relatedKeys = new Set();
    if (state.schemas[schemaName] && state.schemas[schemaName].tables[tableName]) {
        const table = state.schemas[schemaName].tables[tableName];
        table.relations.forEach(relation => {
            // Ensure the target table exists before adding
            if (state.schemas[relation.to.schema]?.tables[relation.to.table]) {
                 relatedKeys.add(`${relation.to.schema}.${relation.to.table}`);
            }
        });
    }
    return Array.from(relatedKeys);
}

/**
 * Finds all tables that have relations pointing FROM them TO the given table.
 * @param {string} targetSchemaName - The schema of the target table.
 * @param {string} targetTableName - The name of the target table.
 * @returns {Array<string>} An array of table keys ('schema.table') related FROM to the target table.
 */
export function getRelatedTablesFrom(targetSchemaName, targetTableName) {
    const relatedKeys = new Set();
    Object.keys(state.schemas).forEach(schemaName => {
        Object.keys(state.schemas[schemaName].tables).forEach(tableName => {
            const table = state.schemas[schemaName].tables[tableName];
            table.relations.forEach(relation => {
                if (relation.to.schema === targetSchemaName && relation.to.table === targetTableName) {
                    // Ensure the source table exists before adding
                    if (state.schemas[relation.from.schema]?.tables[relation.from.table]) {
                         relatedKeys.add(`${relation.from.schema}.${relation.from.table}`);
                    }
                }
            });
        });
    });
    return Array.from(relatedKeys);
}