import Response from "../models/Response.js";
import Student from "../models/Student.js";
import Poll from "../models/Poll.js";
import {
    createPoll,
    getActivePoll,
    computeResults,
    hasStudentResponded,
    canAskNew,
} from "../services/PollService.js";

// send current state (poll + remaining + possibly previous answer) to a single socket
export async function sendCurrentState(socket) {
    try {
        const active = await getActivePoll();
        // always send a status update even if there is no active poll
        const status = await canAskNew();
        socket.emit("poll-status", { canAskNew: status });

        if (!active) return;

        const { poll, remaining } = active;
        socket.emit("poll-started", { poll, remaining });

        // if this socket corresponds to a student who already answered
        const student = await Student.findOne({ socketId: socket.id });
        if (student) {
            const answered = await hasStudentResponded(student._id, poll._id);
            if (answered) {
                const result = await computeResults(poll._id);
                socket.emit("poll-results", result);
                const resp = await Response.findOne({ studentId: student._id, pollId: poll._id });
                if (resp) {
                    socket.emit("already-answered", { selectedOption: resp.selectedOption?.toString() });
                }
            }
        }
    } catch (err) {
        console.error("Error sending current state:", err);
        socket.emit("poll-error", { message: "Unable to retrieve poll state" });
    }
} 

export async function handleCreatePoll(socket, io, { text, options, timeLimit }) {
    try {
        const allowed = await canAskNew();
        if (!allowed) {
            socket.emit("poll-error", { message: "Cannot start new poll until the current one is complete." });
            return;
        }

        const poll = await createPoll({ text, options, timeLimit });
        const remaining = timeLimit;
        io.emit("poll-started", { poll, remaining });
        io.emit("poll-status", { canAskNew: false });
    } catch (err) {
        console.error("Error creating poll:", err);
    }
}

export async function handleSubmitAnswer(socket, io, { questionId, answer }) {
    try {
        const student = await Student.findOne({ socketId: socket.id });
        if (!student) return;

        const active = await getActivePoll();
        if (!active || active.poll._id.toString() !== questionId) return;
        if (active.remaining <= 0) return;
        const already = await hasStudentResponded(student._id, questionId);
        if (already) return;

        const poll = active.poll;
        const option = poll.options.id(answer);
        const isCorrect = option?.isCorrect || false;

        await Response.create({
            studentId: student._id,
            pollId: questionId,
            selectedOption: answer,
            isCorrect,
        });

        const result = await computeResults(questionId);
        io.emit("poll-results", result);
        const status = await canAskNew();
        io.emit("poll-status", { canAskNew: status });
    } catch (err) {
        console.error("Error submitting answer:", err);
        socket.emit("poll-error", { message: "Failed to record your answer. Please try again." });
    }
} 

export async function handleGetPollHistory(socket) {
    try {
        const polls = await Poll.find({}).sort({ createdAt: -1 }).limit(10);
        const allResults = [];

        for (const poll of polls) {
            const responses = await Response.find({ pollId: poll._id });
            const result = {};
            for (const opt of poll.options) {
                result[opt._id] = 0;
            }
            for (const res of responses) {
                const id = res.selectedOption?.toString();
                if (id && result[id] !== undefined) {
                    result[id] += 1;
                }
            }
            allResults.push({ poll, results: result });
        }

        socket.emit("poll-history", allResults);
    } catch (err) {
        console.error("Error fetching poll history:", err);
        socket.emit("poll-error", { message: "Unable to load poll history." });
    }
}

// HTTP handlers ------------------------------------------------------

export async function httpGetCurrent(req, res) {
    try {
        const active = await getActivePoll();
        res.json(active);
    } catch (err) {
        console.error("Error in httpGetCurrent:", err);
        res.status(500).json({ error: "Failed to fetch current poll" });
    }
}

export async function httpGetHistory(req, res) {
    try {
        const polls = await Poll.find().sort({ createdAt: -1 });
        const responses = await Response.find();

        const history = polls.map((poll) => {
            const pollResponses = responses.filter(
                (r) => r.pollId?.toString() === poll._id.toString()
            );

            const optionCounts = poll.options.map((option) => {
                const count = pollResponses.filter(
                    (r) =>
                        r.selectedOption &&
                        r.selectedOption.toString() === option._id.toString()
                ).length;

                return {
                    _id: option._id,
                    text: option.text,
                    isCorrect: option.isCorrect,
                    count,
                };
            });

            const totalVotes = optionCounts.reduce((acc, opt) => acc + opt.count, 0);

            return {
                _id: poll._id,
                question: poll.text,
                options: optionCounts.map((opt) => ({
                    ...opt,
                    percentage: totalVotes ? Math.round((opt.count / totalVotes) * 100) : 0,
                })),
                createdAt: poll.createdAt,
            };
        });

        res.json(history);
    } catch (err) {
        console.error("Error in httpGetHistory:", err);
        res.status(500).json({ error: "Failed to fetch poll history" });
    }
}
