const DiscordOauth2 = require("discord-oauth2");
const express = require("express");
const router = express.Router();
const { auth_url, tokenRequest, spworlds_data } = require(process.cwd() +"/spworlds");
const { Task_Model, chat } = require(process.cwd() + "/database/verden");
const { io } = require(process.cwd() + "/server");
const { is_mayor,is_citizen,check_for_permission } = require(process.cwd() + "/database/permissions");
const fs = require('fs');
function res_error(res, reason) {
    res.statusCode = 400;
    res.send(reason);
}
router.get("/:id", async function (request, response) {

    if (request.query.token) {
        try {

            const spworlds_data_ = await spworlds_data(request.query.token);

            if (spworlds_data_ == null)
                return res_error(response, "нет проходки на сп");
            if (!await is_citizen(spworlds_data_.player_uuid))
                return res_error(response, "у вас нет прав на просмотр задач");
            var task = await Task_Model.findOne({ id: request.params.id });
            if (!task)
                return res_error(response, "задачи не существует"); 
            if (!task.owner == spworlds_data_.player_uuid && !await check_for_permission("task_manage",spworlds_data_.player_uuid))return res_error(response, "вы имеете прав модерировать данное задание..");
        
            await task.deleteOne();
            response.send("задача успешно удалена."); 
            io.to(task.id).emit("kick","задача удалена.");
            io.sockets.to(task.id).disconnectSockets(); 
            fs.rmSync(process.cwd()+"/assets/images/task/"+task.id, { recursive: true, force: true });
            await chat.Chat_Message_Model.deleteMany({ task: task.id });
            await chat.New_Chat_Messages_Model.deleteMany({ task: task.id });
        }
        catch (error) {
            console.log(error);
            if(!response.headersSent)
                response.sendStatus(500);
        }
        return;
    }
    response.sendStatus(400);
});
module.exports = router;