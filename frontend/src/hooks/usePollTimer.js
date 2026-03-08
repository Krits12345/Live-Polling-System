import { useState, useEffect } from "react";
import useSocket from "./useSocket";

// subscribes to server timer events and returns remaining seconds
export default function usePollTimer(initial = 0) {
    const { socket } = useSocket();
    const [timer, setTimer] = useState(initial);

    useEffect(() => {
        const handler = ({ remaining }) => {
            if (typeof remaining === "number") setTimer(remaining);
        };
        socket.on("timer", handler);
        return () => {
            socket.off("timer", handler);
        };
    }, [socket]);

    return timer;
}
