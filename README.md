Real-Time Collaborative Canvas -

This is a multi-user, real-time drawing application built with Node.js, Express, Socket.io, and vanilla JavaScript (HTML5 Canvas).

Live Demo - View the live project here: https://collaborative-canvas-vcpj.onrender.com/
(Note: The server is on Render's free tier and may "go to sleep" after 15 minutes of inactivity. The first load might take 30-60 seconds to wake the server.)


Features-
Real-Time Collaboration: All drawings, cursors, and user lists sync instantly across all clients.
Room System: Create private 6-digit rooms or join existing ones. All drawings are isolated per room.
Full Toolset: Includes a brush (pen), eraser, color picker, and stroke width slider.
Global Undo/Redo: A server-authoritative undo/redo stack (Command Pattern) that works for all users in the room.
Polished UX: Includes a "Copy Room ID" button, custom mouse cursors, and disabled states for a professional feel.
Save/Download: Save the current canvas state as a PNG file.


How to Run Locally -
Clone the repository:
git clone [https://github.com/vinaysadupati/Collaborative-Canvas.git]
cd Collaborative-Canvas
Install dependencies:
npm install
Start the server:
npm start
Open the application:
Open your browser and go to http://localhost:3000.


How to Test (Multiple Users) - 
To see the real-time collaboration:
Open the live demo link (or http://localhost:3000) in a browser tab.
Open the same link in a second browser tab (or a different browser).
Place the two tabs side-by-side.
Create a room in one tab and join it from the other to see the app in action.


Known Limitations -
Drawing Feel: The current server-authoritative model waits until mouseup to broadcast the final path. This makes it 100% consistent but can feel "laggy.
No Throttling: cursor:move events are not throttled. With many users, this could create high network traffic.
No Persistence: Drawings are not saved to a database. If the server restarts, the canvas history is lost.


Time Spent - 
Total Time: Approximately 10 hours over 3 days