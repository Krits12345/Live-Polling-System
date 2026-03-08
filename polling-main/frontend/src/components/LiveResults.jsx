import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import ChatSidebar from "./ChatSidebar";
import useSocket from "../hooks/useSocket";
import usePollTimer from "../hooks/usePollTimer";

const LiveResults = () => {
    const { state } = useLocation();
    const navigate = useNavigate();
    const { socket, connected } = useSocket();
    const [poll, setPoll] = useState(state?.poll || null);
    const [timer, setTimer] = useState(state?.timeLimit || 60);
    const [results, setResults] = useState(null);
    const [canAskNew, setCanAskNew] = useState(false);
    const serverTimer = usePollTimer(timer);

    // if we lost navigation state (e.g. page refreshed), fetch current poll
    useEffect(() => {
        if (!poll) {
            axios
                .get("/api/polls/current")
                .then((res) => {
                    if (res.data && res.data.poll) {
                        setPoll(res.data.poll);
                        setTimer(res.data.remaining || res.data.poll.timeLimit || 60);
                    } else {
                        // nothing active, go back to teacher page
                        navigate("/teacher");
                    }
                })
                .catch((err) => {
                    console.error("Failed to fetch current poll", err);
                });
        }
    }, [poll, navigate]);

    useEffect(() => {
        // Listen for live poll results
        socket.on("poll-results", (data) => {
            setResults(data);
        });

        // Listen for poll status (can teacher ask new question)
        socket.on("poll-status", ({ canAskNew }) => {
            setCanAskNew(canAskNew);
        });

        socket.on("poll-error", ({ message }) => {
            alert(message);
        });

        return () => {
            socket.off("poll-results");
            socket.off("poll-status");
            socket.off("poll-error");
        };
    }, [socket]);

    if (!poll) {
        return (
            <div className="text-center text-red-500 mt-10">
                Poll data not found. Redirecting...
            </div>
        );
    }

    // update timer when serverTimer changes
    useEffect(() => {
        setTimer(serverTimer);
    }, [serverTimer]);

    const totalVotes = results
        ? Object.values(results.answers || {}).reduce((a, b) => a + b, 0)
        : 0;

    return (
        <>
            <ChatSidebar />
            <div className="min-h-screen flex items-center p-6 bg-white text-dark">
                <div className="max-w-6xl w-full mx-auto">
                    <div className="flex justify-between mb-4">
                        <h2 className="text-xl font-bold">Live Poll Results</h2>
                        <span className="text-sm text-red-500 font-semibold">
                            Time remaining: {timer < 10 ? `0${timer}` : timer}s
                        </span>
                    </div>

                    <div className="bg-gradient-to-r from-gray-700 to-gray-600 text-white px-4 py-3 rounded-t-md text-sm font-medium">
                        {poll.text}
                    </div>

                    <div className="border border-gray-200 rounded-b-md px-4 py-4 bg-white space-y-3">
                        {poll.options.map((opt, index) => {
                            const voteCount = results?.answers?.[opt._id] || 0;
                            const percent =
                                totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;

                            return (
                                <div key={opt._id}>
                                    <div className="flex items-center gap-2 text-sm font-medium mb-1">
                                        <span className="w-6 h-6 flex items-center justify-center bg-primary text-white font-bold rounded-full text-xs">
                                            {index + 1}
                                        </span>
                                        <span>{opt.text}</span>
                                    </div>
                                    <div className="relative w-full bg-gray-100 rounded-lg h-6 overflow-hidden">
                                        <div
                                            className="bg-primary h-6 rounded-lg transition-all duration-500"
                                            style={{ width: `${percent}%` }}
                                        />
                                        <div className="absolute inset-0 flex items-center justify-end pr-3 text-xs font-semibold text-gray-800">
                                            {percent}%
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-6 flex justify-center gap-4">
                        {(canAskNew || timer === 0) && (
                            <button
                                onClick={() => navigate("/teacher")}
                                className="bg-primary text-white px-5 py-2 rounded-full font-medium hover:bg-primary/80"
                            >
                                Ask next question
                            </button>
                        )}
                        <button
                            onClick={() => navigate("/poll-history")}
                            className="bg-purple-400 text-white px-5 py-2 rounded-full font-medium hover:bg-purple-500"
                        >
                            View poll history
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default LiveResults;
