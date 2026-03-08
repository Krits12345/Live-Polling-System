import Poll from "../models/Poll.js";
import Response from "../models/Response.js";
import Student from "../models/Student.js";

// create a new poll and save to DB
export async function createPoll({ text, options, timeLimit }) {
    const poll = await Poll.create({ text, options, timeLimit });
    return poll;
}

// get the most recently created poll
export async function getLatestPoll() {
    return await Poll.findOne().sort({ createdAt: -1 });
}

// determine if the latest poll is still active based on its timeLimit
// returns null when there is no active poll
export async function getActivePoll() {
    const poll = await getLatestPoll();
    if (!poll) return null;
    const elapsed = (Date.now() - poll.createdAt.getTime()) / 1000;
    if (elapsed < poll.timeLimit) {
        return {
            poll,
            remaining: Math.max(0, Math.floor(poll.timeLimit - elapsed)),
        };
    }
    return null;
}

// compute aggregated results for a given poll id
export async function computeResults(pollId) {
    const poll = await Poll.findById(pollId);
    if (!poll) return null;

    const responses = await Response.find({ pollId });
    const result = { answers: {} };

    for (const opt of poll.options) {
        result.answers[opt._id] = 0;
    }

    for (const res of responses) {
        const id = res.selectedOption?.toString();
        if (id && result.answers[id] !== undefined) {
            result.answers[id] += 1;
        }
    }

    return result;
}

// check whether a particular student has already answered a poll
export async function hasStudentResponded(studentId, pollId) {
    return await Response.exists({ studentId, pollId });
}

// determine if teacher may ask new poll 
export async function canAskNew() {
    const active = await getActivePoll();
    if (!active) return true;
    const { poll } = active;
    const responses = await Response.find({ pollId: poll._id });
    const totalStudents = await Student.countDocuments({ isKicked: false });
    return responses.length >= totalStudents;
}
