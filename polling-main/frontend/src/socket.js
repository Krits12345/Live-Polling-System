import { io } from "socket.io-client";

// allow override via env (REACT_APP_SOCKET_URL) or default to current origin
// this makes local development work without changing the code.
// Vite uses import.meta.env for environment variables
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

const socket = io(SOCKET_URL, {
    transports: ["websocket", "polling"], // websocket preferred, fallback to xhr
    autoConnect: true,
});

// optional logging for connection issues
socket.on("connect_error", (err) => {
    console.error("Socket connection error:", err);
});

export default socket;
