import Student from "../models/Student.js";

// holds map of connectedStudents socket.id => name
const connected = {};

export async function register(socket, io, { name }) {
    socket.data.name = name;
    connected[socket.id] = name;

    try {
        const res = await Student.updateOne(
            { socketId: socket.id },
            { $set: { name, isKicked: false, connected: true } },
            { upsert: true }
        );
        console.log("student register/update result", res);
    } catch (err) {
        console.error("Error registering student:", err);
        socket.emit("poll-error", { message: "Failed to register. Please try again." });
        return;
    }

    sendParticipants(io);
    socket.emit("registration:success");
}


export async function sendParticipants(io) {
    const students = await Student.find({ isKicked: false, connected: true });
    const participantNames = students.map(s => s.name);
    io.emit("participants:update", participantNames);
}

export async function requestParticipants(socket) {
    const students = await Student.find({ isKicked: false, connected: true });
    const participantNames = students.map(s => s.name);
    socket.emit("participants:update", participantNames);
}

export async function kickStudent(io, name) {
    const student = await Student.findOneAndUpdate(
        { name },
        { $set: { isKicked: true } }
    );
    if (!student) return;

    const targetSocket = [...io.sockets.sockets.values()].find(
        (s) => s.data?.name === name
    );

    if (targetSocket) {
        targetSocket.emit('kicked');
        targetSocket.disconnect();
    }

    sendParticipants(io);
}

export async function disconnectCleanup(socket, io) {
    try {
        // instead of deleting, update connected status and clear socketId
        await Student.updateOne(
            { socketId: socket.id },
            { $unset: { socketId: "" }, $set: { connected: false } }
        );
    } catch (err) {
        console.error("Error during disconnect cleanup:", err);
    }
    // also remove from connected map for completeness
    delete connected[socket.id];
    // refresh participants list from DB
    sendParticipants(io);
}