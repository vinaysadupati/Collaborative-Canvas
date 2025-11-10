// This file is the in-memory "database" for all room states.
// The main store. The key is the roomName,
// and the value is the state for that room.
const rooms = {};

/**
 * Gets the state for a specific room.
 * If the room doesn't exist, it creates a new
 * default state object for it.
 * @param {string} roomName - The name of the room.
 * @returns {object} The state object for that room.
 */
function getRoomState(roomName) {
    if (!rooms[roomName]) {
        // If room doesn't exist, create it
        rooms[roomName] = {
            historyStack: [],
            redoStack: []
        };
        console.log(`New room created: ${roomName}`);
    }
    return rooms[roomName];
}

/**
 * Deletes a room's state from memory when it's empty.
 * @param {string} roomName - The name of the room to delete.
 */
function deleteRoom(roomName) {
    if (rooms[roomName]) {
        delete rooms[roomName];
        console.log(`Room deleted from memory: ${roomName}`);
    }
}

module.exports = {
    getRoomState,
    deleteRoom // Export the new function
};