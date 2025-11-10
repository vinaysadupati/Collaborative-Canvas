// This file manages the state of the canvas
// It is now an "API" that operates on a specific room's state.

const { getRoomState, deleteRoom } = require('./rooms');

/**
 * Adds a new drawing operation to a room's history.
 * @param {string} roomName - The room to add to.
 * @param {object} operation - The operation object.
 */
function addOperation(roomName, operation) {
    const roomState = getRoomState(roomName);

    roomState.historyStack.push(operation);
    // When a new operation is added, the redo stack must be cleared
    roomState.redoStack.length = 0;
    console.log(`[${roomName}] Operation added. History size:`, roomState.historyStack.length);
    return operation;
}

/**
 * Undoes the last operation in a room.
 * @param {string} roomName - The room to undo in.
 */
function undoOperation(roomName) {
    const roomState = getRoomState(roomName);

    if (roomState.historyStack.length === 0) {
        return roomState.historyStack; // Nothing to undo
    }
    const undoneOperation = roomState.historyStack.pop();
    roomState.redoStack.push(undoneOperation);
    console.log(`[${roomName}] Operation undone. History size:`, roomState.historyStack.length);
    return roomState.historyStack; // Return the new, complete history
}

/**
 * Redoes the last undone operation in a room.
 * @param {string} roomName - The room to redo in.
 */
function redoOperation(roomName) {
    const roomState = getRoomState(roomName);

    if (roomState.redoStack.length === 0) {
        return roomState.historyStack; // Nothing to redo
    }
    const redoneOperation = roomState.redoStack.pop();
    roomState.historyStack.push(redoneOperation);
    console.log(`[${roomName}] Operation redone. History size:`, roomState.historyStack.length);
    return roomState.historyStack; // Return the new, complete history
}

/**
 * Gets the entire drawing history for a room.
 * @param {string} roomName - The room to get history for.
 */
function getHistory(roomName) {
    const roomState = getRoomState(roomName);
    return roomState.historyStack;
}

// Make these functions available to other server files
module.exports = {
    addOperation,
    undoOperation,
    redoOperation,
    getHistory,
    deleteRoom
};