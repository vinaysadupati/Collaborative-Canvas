Architecture & Design Decisions -
This document outlines the architecture of the Real-Time Collaborative Canvas.

1. Data Flow Diagram -
The application uses a server-authoritative state model. The server is the single source of truth for all canvas history, which is managed on a per-room basis.
Client A joins a room (e.g., "123456") by emitting room:join.
Client A sets their name by emitting user:set-name.
The server broadcasts the new user list (users:update) to everyone in room "123456".
Client A's browser resizes the canvas and emits canvas:request-history.
The server replies only to Client A with the full history for that room (canvas:load).
Client B (already in the room) draws a line. They send draw:start, draw:move, and draw:end to the server.
The Server collects these into one "operation" and adds it to the historyStack for room "123456".
The Server broadcasts the new operation (operation:add) to all clients in room "123456".
Both Client A and Client B receive the operation and render it.

2. WebSocket Protocol (API) -
The following messages define the communication between client and server:
Client-to-Server Events
Event: room:join
Payload: { roomName }
Description: Joins a specific room. This is the first event sent.
Event: user:set-name
Payload: userName
Description: Sets the user's name after joining a room.
Event: canvas:request-history
Payload: (none)
Description: Asks server for history after client-side canvas resize.
Event: draw:start
Payload: { x, y, color, width, tool }
Description: Fired on mousedown for brush/eraser. Begins a new path object.
Event: draw:move
Payload: { x, y }
Description: Fired on mousemove for brush/eraser. Adds a point to the path.
Event: draw:end
Payload: (none)
Description: Fired on mouseup for brush/eraser. Finalizes the path.
Event: operation:add
Payload: { type: 'clear' }
Description: Fired to add a non-drawing operation, like clearing the canvas.
Event: operation:undo
Payload: (none)
Description: Requests the server to undo the last operation in that room.
Event: operation:redo
Payload: (none)
Description: Requests the server to redo the last operation in that room.
Event: cursor:move
Payload: { x, y }
Description: Sends the user's current cursor coordinates to others in the room.
Server-to-Client Events
Event: canvas:load
Payload: [...historyStack]
Description: Sent only to the requesting user after they ask for the history.
Event: operation:add
Payload: {...operation}
Description: Sent to all clients in the room when a new operation is completed.
Event: canvas:redraw
Payload: [...historyStack]
Description: Sent to all clients in the room after an undo/redo.
Event: users:update
Payload: {...users}
Description: Sent to all clients in the room when a user joins, sets a name, or leaves.
Event: user:self
Payload: { id, name, color, room }
Description: Sent only to the new user with their finalized user data.
Event: cursor:update
Payload: { id, x, y, color }
Description: Broadcast to all other clients in the room to show a cursor.


3. Undo/Redo Strategy (Per-Room Command Pattern) -
The global undo/redo is handled 100% on the server using the Command Pattern, scoped to each room.
server/rooms.js acts as the storage, holding a rooms object (e.g., rooms['123456'] = { historyStack, redoStack }).
server/drawing-state.js acts as the "API" that manipulates the state.
On draw:end / operation:add: A new operation is pushed to the room's historyStack, and the room's redoStack is cleared.
On operation:undo: The server pops an operation from the room's historyStack and pushes it onto the room's redoStack.
On operation:redo: The server pops from the room's redoStack and pushes it onto the room's historyStack.
After every undo/redo, the server broadcasts the entire new historyStack (canvas:redraw) to all clients in that room. This guarantees perfect synchronization.


4. Performance Decisions - 
Operation Broadcasting: Instead of broadcasting every single draw:move point, the server collects all points into one draw operation. This operation is broadcast once on mouseup, which significantly reduces network traffic.
Full Redraw on Undo: Broadcasting the entire history on undo is less efficient than sending a "remove operation X" command. However, it is far more robust and prevents clients from falling out of sync.
DOM Cursors: User cursors are separate <div> elements, not drawn on the canvas. This is more performant as it avoids redrawing the entire canvas (a z-index: 2 overlay) every time a cursor moves.
Memory Management: Empty rooms are automatically deleted from server memory (deleteRoom in rooms.js) when the last user disconnects, preventing memory leaks.


5. Conflict Resolution - 
Drawing: Drawing is purely additive. Since operations are queued by the server's event loop and added to history one by one, there are no "conflicts."
State (Undo/Redo): The server-authoritative, per-room historyStack is the conflict resolution. There is only one "truth" for each room. If two users click "Undo" at the same time, the server will process these requests sequentially, and all clients in the room will end up in the same final state.