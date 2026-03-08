import { useEffect, useState } from "react";
import socket from "../socket";

// custom hook to expose socket instance and connection status. also handles global errors.
export default function useSocket() {
    const [connected, setConnected] = useState(socket.connected);

    useEffect(() => {
        const onConnect = () => setConnected(true);
        const onDisconnect = () => setConnected(false);
        const onError = (err) => {
            console.error("Socket error", err);
            alert("Connection error: " + (err.message || err));
        };

        socket.on("connect", onConnect);
        socket.on("disconnect", onDisconnect);
        socket.on("connect_error", onError);
        socket.on("error", onError);

        return () => {
            socket.off("connect", onConnect);
            socket.off("disconnect", onDisconnect);
            socket.off("connect_error", onError);
            socket.off("error", onError);
        };
    }, []);

    return { socket, connected };
}
