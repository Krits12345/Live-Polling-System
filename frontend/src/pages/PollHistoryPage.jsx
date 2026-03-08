import React, { useEffect, useState } from "react";
import axios from "axios";
import PollHistory from "../components/PollHistory"; // Your styled component

const PollHistoryPage = () => {
    const [pollHistory, setPollHistory] = useState([]);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                // prefer explicit backend url from env, otherwise adjust origin to use port 5000
                let base = import.meta.env.VITE_BACKEND_URI;
                console.log(base)
                const res = await axios.get(`${base}/api/polls/history`);
                setPollHistory(res.data); 
            } catch (err) {
                console.error("Failed to fetch poll history", err);
                alert("Unable to load poll history. Please try again later.");
            }
        };

        fetchHistory();
    }, []);

    return (
        <div className="min-h-screen bg-white p-6">
            <PollHistory history={pollHistory} />
        </div>
    );
};

export default PollHistoryPage;
