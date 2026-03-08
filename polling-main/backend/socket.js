import { sendCurrentState, handleCreatePoll, handleSubmitAnswer, handleGetPollHistory } from "./controllers/PollController.js";
import { register, requestParticipants, kickStudent, disconnectCleanup } from "./controllers/StudentController.js";
import { handleChatMessage, handleGetAllMessages } from "./controllers/ChatController.js";

export default function socketHandler(socket, io) {
    console.log("New client connected:", socket.id);

    // immediately provide state in case user refreshes / reconnects
    sendCurrentState(socket);

    // Student registration
    socket.on("register-student", (data) => register(socket, io, data));


    // Request Participants list
    socket.on("request-participants", () => requestParticipants(socket));



    // Real-time chat
    socket.on("chat:message", (msg) => handleChatMessage(io, msg));
    socket.on("get-all-messages", () => handleGetAllMessages(socket));



    // Teacher creates poll
    socket.on("create-poll", (data) => handleCreatePoll(socket, io, data));





    // Student submits answer
    socket.on("submit-answer", (data) => handleSubmitAnswer(socket, io, data));


    // History of the poll
    socket.on("get-poll-history", () => handleGetPollHistory(socket));


    // Kick
    socket.on('kick-student', ({ name }) => kickStudent(io, name));

    // Disconnect cleanup
    socket.on("disconnect", () => disconnectCleanup(socket, io));

}
