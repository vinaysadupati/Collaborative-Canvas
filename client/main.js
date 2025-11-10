// Global State 
let currentRoom = null;

//Generates a random 6-digit room code.

function generateRoomCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function showModalAlert(message) {
    alert(message);
}

//  Hides all modals

function hideAllModals() {
    document.getElementById('room-modal').style.display = 'none';
    document.getElementById('name-modal-overlay').classList.remove('show');
    document.getElementById('confirm-clear-modal').classList.remove('show');
}

// Shows the main application UI
function showApp() {
    document.querySelector('.app-container').style.display = 'flex';
    document.getElementById('room-title').textContent = `Room: ${currentRoom}`;
}

// Flashes a button to indicate an action

function flashButton(btn) {
    if (!btn) return;
    btn.classList.add('flash');
    setTimeout(() => {
        btn.classList.remove('flash');
    }, 200);
}

// Copies the room code to the clipboard and shows feedback.

function copyRoomCodeToClipboard() {
    const copyBtn = document.getElementById('copy-room-btn');
    const iconClipboard = copyBtn.querySelector('.icon-clipboard');
    const iconCheck = copyBtn.querySelector('.icon-check');

    navigator.clipboard.writeText(currentRoom)
        .then(() => {
            // Success
            iconClipboard.style.display = 'none';
            iconCheck.style.display = 'block';
            copyBtn.classList.add('copied');

            // Reset after 2 seconds
            setTimeout(() => {
                iconClipboard.style.display = 'block';
                iconCheck.style.display = 'none';
                copyBtn.classList.remove('copied');
            }, 2000);
        })
        .catch(err => {
            console.error('Failed to copy room code: ', err);
            showModalAlert('Failed to copy code. Please copy it manually.');
        });
}


// Initializes all the canvas/toolbar event listeners.This is called *after* a room is successfully joined.
function initializeApp() {
    const colorPicker = document.getElementById('color-picker');
    const strokeWidth = document.getElementById('stroke-width');
    const brushBtn = document.getElementById('brush-btn');
    const eraserBtn = document.getElementById('eraser-btn');
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    const clearBtn = document.getElementById('clear-btn');
    const confirmClearModal = document.getElementById('confirm-clear-modal');
    const confirmCancelBtn = document.getElementById('confirm-clear-cancel-btn');
    const confirmClearBtn = document.getElementById('confirm-clear-confirm-btn');
    const mainToolbar = document.getElementById('main-toolbar');
    const copyBtn = document.getElementById('copy-room-btn');
    const saveBtn = document.getElementById('save-btn');

    //  Canvas Event Listeners 
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', stopDrawing);

    //  Cursor Emitter 
    canvas.addEventListener('mousemove', (e) => {
        socket.emit('cursor:move', {
            x: e.offsetX,
            y: e.offsetY
        });
    });

    //  Toolbar Event Listeners 
    colorPicker.addEventListener('input', changeColor);
    strokeWidth.addEventListener('input', changeWidth);
    copyBtn.addEventListener('click', copyRoomCodeToClipboard);

    //  Tool Highlighting Logic 
    let activeTool = brushBtn; // Default tool
    activeTool.classList.add('active-tool');

    brushBtn.addEventListener('click', () => {
        setBrush();
        activeTool.classList.remove('active-tool');
        activeTool = brushBtn;
        activeTool.classList.add('active-tool');
        mainToolbar.classList.remove('eraser-active');
    });

    eraserBtn.addEventListener('click', () => {
        setEraser();
        activeTool.classList.remove('active-tool');
        activeTool = eraserBtn;
        activeTool.classList.add('active-tool');
        mainToolbar.classList.add('eraser-active');
    });

    //  Undo/Redo/Clear Listeners 
    undoBtn.addEventListener('click', () => {
        socket.emit('operation:undo');
        flashButton(undoBtn);
    });

    redoBtn.addEventListener('click', () => {
        socket.emit('operation:redo');
        flashButton(redoBtn);
    });

    clearBtn.addEventListener('click', () => {
        confirmClearModal.classList.add('show');
    });

    // ADD SAVE BUTTON LISTENER 
    saveBtn.addEventListener('click', () => {
        saveCanvasAsImage(); // This function is in canvas.js
        flashButton(saveBtn);
    });

    //  Clear Modal Listeners 
    confirmCancelBtn.addEventListener('click', () => {
        confirmClearModal.classList.remove('show');
    });

    confirmClearBtn.addEventListener('click', () => {
        socket.emit('operation:clear');
        confirmClearModal.classList.remove('show');
        flashButton(clearBtn);
    });

    console.log("Canvas app initialized.");
}

//  Handles room/name entry
window.addEventListener('DOMContentLoaded', () => {
    const roomModal = document.getElementById('room-modal');
    const createRoomBtn = document.getElementById('room-create-btn');
    const joinRoomInput = document.getElementById('room-join-input');
    const joinRoomBtn = document.getElementById('room-join-btn');

    const nameModal = document.getElementById('name-modal-overlay');
    const nameInput = document.getElementById('username-input');
    const nameSubmitBtn = document.getElementById('username-submit-btn');
    const nameModalExitBtn = document.getElementById('name-modal-exit-btn');

    //  Room Logic 
    function joinRoom(roomCode) {
        if (!roomCode || !/^\d{6}$/.test(roomCode)) {
            showModalAlert("Please enter a valid 6-digit room code.");
            return;
        }
        currentRoom = roomCode;

        // Emit the join event
        socket.emit('room:join', { roomName: currentRoom });

        // Hide the room modal
        roomModal.style.display = 'none';

        // Show the name modal
        nameModal.classList.add('show');
        nameInput.focus();
    }

    createRoomBtn.addEventListener('click', () => {
        const newRoomCode = generateRoomCode();
        joinRoom(newRoomCode);
    });

    joinRoomBtn.addEventListener('click', () => {
        joinRoom(joinRoomInput.value.trim());
    });

    joinRoomInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            joinRoom(joinRoomInput.value.trim());
        }
    });

    //  Name Modal Logic 
    function submitName() {
        const userName = nameInput.value.trim();
        if (!userName) {
            showModalAlert("Please enter a name.");
            return;
        }

        // Send the name to the server
        socket.emit('user:set-name', userName);

        // Hide modal, show app
        nameModal.classList.remove('show');
        showApp(); // This sets .app-container to display: flex

        // Wait for the browser to paint the new layout
        requestAnimationFrame(() => {
            // Resize the canvas *drawing buffer*
            resizeCanvas();

            // NOW request the history for the (correctly sized) canvas
            socket.emit('canvas:request-history');

            // Initialize all toolbar/canvas event listeners
            initializeApp();
        });
    }
    nameSubmitBtn.addEventListener('click', submitName);

    nameInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            submitName();
        }
    });

    // Exit button on name modal reloads to go back
    nameModalExitBtn.addEventListener('click', () => {
        window.location.reload();
    });
});


// Global UI Functions (Called by websocket.js) 

let cursors = {}; // Store references to cursor elements

// Updates the user list UI based on the user object from the server.
window.updateUserList = function (users) {
    const userListEl = document.getElementById('user-list');
    if (!userListEl) return;

    userListEl.innerHTML = ''; // Clear the list
    const activeUserIds = new Set();

    for (const id in users) {
        const user = users[id];
        activeUserIds.add(id);

        const userItem = document.createElement('div');
        userItem.className = 'user-item';
        userItem.id = `user-${user.id}`;

        const colorSwatch = document.createElement('div');
        colorSwatch.className = 'user-color-swatch';
        colorSwatch.style.backgroundColor = user.color;

        const userIdLabel = document.createElement('span');
        userIdLabel.className = 'user-id';

        userIdLabel.textContent = user.name || 'Joining...';

        if (user.id === socket.id && user.name) {
            userIdLabel.textContent += ' (You)';
        }

        userItem.appendChild(colorSwatch);
        userItem.appendChild(userIdLabel);
        userListEl.appendChild(userItem);
    }

    //  Clean up disconnected cursors 
    for (const id in cursors) {
        if (!activeUserIds.has(id)) {
            if (cursors[id]) {
                cursors[id].remove();
                delete cursors[id];
            }
        }
    }
}

// Updates the position of a remote user's cursor.
window.handleCursorUpdate = function (data) {
    const cursorContainer = document.getElementById('cursor-container');
    if (!cursorContainer) return;

    let cursorEl = cursors[data.id];

    if (!cursorEl) {
        cursorEl = document.createElement('div');
        cursorEl.className = 'cursor';
        cursorEl.style.backgroundColor = data.color;
        cursorContainer.appendChild(cursorEl);
        cursors[data.id] = cursorEl;
    }

    cursorEl.style.transform = `translate(${data.x}px, ${data.y}px)`;
}
