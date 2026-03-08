import Message from "../models/Message.js";
import Student from "../models/Student.js";

export async function handleChatMessage(io, { sender, text }) {
    if (sender !== 'Teacher') {
        const student = await Student.findOne({ name: sender });
        if (!student || student.isKicked) return;
    }

    const newMsg = await Message.create({ sender, text });
    io.emit("chat:message", {
        sender: newMsg.sender,
        text: newMsg.text,
        createdAt: newMsg.createdAt,
    });
}

export async function handleGetAllMessages(socket) {
    const allMessages = await Message.find({}).sort({ createdAt: 1 });
    socket.emit("chat:messages", allMessages);
}