const socket = io();

socket.on('connect', () => {
    console.log('Connected to server with ID:', socket.id);
});

// Listen for events from the server
// On 'users:update', we get the full list of users.
// We call updateUserList() from main.js
socket.on('users:update', (users) => {
    console.log("User list updated:", users);
    // Call the globally-scoped function
    if (window.updateUserList) {
        window.updateUserList(users);
    }
});

//On 'canvas:load', we get the entire history.
//We call redrawCanvas() from canvas.js
socket.on('canvas:load', (history) => {
    console.log("Loading canvas history...");
    redrawCanvas(history);
});

//On 'operation:add', we get a single new operation.
//We call drawOperation() from canvas.js
socket.on('operation:add', (operation) => {
    console.log("Adding new operation");
    drawOperation(operation);
});

//On 'canvas:redraw', we get a new, full history.
//This happens after an Undo or Redo.
//We call redrawCanvas() from canvas.js
socket.on('canvas:redraw', (history) => {
    console.log("Redrawing canvas from new history (undo/redo)");
    redrawCanvas(history);
});

// On 'cursor:update', we get a remote user's cursor position.
// We call handleCursorUpdate() from main.js
socket.on('cursor:update', (data) => {
    // Call the globally-scoped function
    if (window.handleCursorUpdate) {
        window.handleCursorUpdate(data);
    }
});