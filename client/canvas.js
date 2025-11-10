// Get canvas and context 
const canvas = document.getElementById('drawing-canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true }); // 'willReadFrequently' can optimize toDataURL

// Drawing state 
let isDrawing = false;
let lastX = 0;
let lastY = 0;

// Local tool settings
let currentTool = 'source-over';
let currentColor = '#000000';
let currentWidth = 5;

// Set initial properties
ctx.lineCap = 'round';
ctx.lineJoin = 'round';

// These functions emit data to the server.
function startDrawing(e) {
    isDrawing = true;
    [lastX, lastY] = [e.offsetX, e.offsetY];

    socket.emit('draw:start', {
        x: e.offsetX,
        y: e.offsetY,
        color: currentColor,
        width: currentWidth,
        tool: currentTool
    });
}

function draw(e) {
    if (!isDrawing) return;

    // Emit the move event
    socket.emit('draw:move', {
        x: e.offsetX,
        y: e.offsetY
    });

    [lastX, lastY] = [e.offsetX, e.offsetY];
}

function stopDrawing() {
    if (!isDrawing) return;
    isDrawing = false;
    socket.emit('draw:end');
}

// TOOLBAR FUNCTIONS (Called by main.js) 
function changeColor(e) {
    currentColor = e.target.value;
}

function changeWidth(e) {
    currentWidth = e.target.value;
}

function setBrush() {
    currentTool = 'source-over';
    // Set the cursor on the canvas
    canvas.classList.remove('cursor-eraser');
}

function setEraser() {
    currentTool = 'destination-out';
    // Set the cursor on the canvas
    canvas.classList.add('cursor-eraser');
}

// RENDERER FUNCTIONS (Called by websocket.js) 
// Draws a single, complete operation on the canvas.
function drawOperation(op) {
    // Check for operation type
    if (op.type === 'draw') {
        // Apply the operation's settings
        ctx.save();
        ctx.globalCompositeOperation = op.tool;
        ctx.strokeStyle = op.color;
        ctx.lineWidth = op.width;

        ctx.beginPath();
        // Check if points array exists and has at least one point
        if (op.points && op.points.length > 0) {
            ctx.moveTo(op.points[0].x, op.points[0].y);

            // Loop through all points in the operation
            for (let i = 1; i < op.points.length; i++) {
                ctx.lineTo(op.points[i].x, op.points[i].y);
            }

            ctx.stroke();
        }
        ctx.closePath();

        // Restore local settings
        ctx.restore();

    } else if (op.type === 'clear') {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    } else {
        console.warn("Unknown operation type:", op.type);
    }
}

// Clears the canvas and redraws the entire history.
function redrawCanvas(history) {
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw every operation from history
    if (history) {
        history.forEach(op => {
            drawOperation(op);
        });
    }
}

// Resizes the canvas drawing buffer to match its new element size.This is crucial for the responsive layout.
function resizeCanvas() {
    // Get the actual display size of the canvas element
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;

    // Check if the canvas size is different
    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        // Resize the drawing buffer
        canvas.width = displayWidth;
        canvas.height = displayHeight;

        // Re-apply a couple of settings that get reset
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        console.log(`Canvas resized to: ${canvas.width}x${canvas.height}`);
        return true; // Return true to signal a resize happened
    }
    return false; // No resize needed
}



//  Saves the current canvas content as a PNG file.This is called from main.js.
function saveCanvasAsImage() {
    // Get the room code from the H1 tag for the filename
    let roomCode = 'drawing';
    const roomTitleEl = document.getElementById('room-title');
    if (roomTitleEl && roomTitleEl.textContent.includes(': ')) {
        roomCode = roomTitleEl.textContent.split(': ')[1].trim();
    }

    // Create a temporary link element
    const link = document.createElement('a');

    // Set the download attribute with a filename
    link.download = `canvas-room-${roomCode}.png`;

    // Create a temporary canvas to draw a white background
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');

    // Draw a white background on the temp canvas
    tempCtx.fillStyle = '#FFFFFF'; // White
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    // Draw the *current* canvas on top of the white background
    tempCtx.drawImage(canvas, 0, 0);

    // Get the data URL from the *temporary* canvas
    link.href = tempCanvas.toDataURL('image/png');

    // Programmatically click the link to trigger the download
    link.click();

    // Clean up the temporary link
    link.remove();
}