const DiscordOauth2 = require("discord-oauth2");
const express = require("express");
const router = express.Router();
const { auth_url, tokenRequest, spworlds_data } = require(process.cwd() + "/spworlds");
const { Task_Model,  chat } = require(process.cwd() + "/database/verden");
const { io } = require(process.cwd() + "/server");
const { notify ,users_in_task,getNickname} = require(process.cwd() + "/socket/chat.js");
const { is_mayor,is_citizen ,check_for_permission} = require(process.cwd() + "/database/permissions");
 
function res_error(res, reason) {
    res.statusCode = 400;
    res.send(reason);
}
router.get("/:id/:player_uuid", async function (request, response) {

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
            if (task.workers.length == task.max_workers && !await check_for_permission("task_manage",spworlds_data_.player_uuid)) return res_error(response, "вы имеете прав модерировать данное задание..");
            if (!task.kicked_users[request.params.player_uuid]) return res_error(response, "игрок не заблокирован");
            
            delete task.kicked_users[request.params.player_uuid] ;
            task.markModified("kicked_users")
            await task.save();
            response.send("игрок " + request.params.player_uuid + " разблокирован.");
        
            const kicked_user_nickname = await getNickname(request.params.player_uuid);
            const log = new chat.Chat_Message_Model({ task: request.params.id, message_type: "unblock", widget: { from:spworlds_data_.nickname,to:kicked_user_nickname} });
            await log.save();
            io.to(task.id).emit("recive_message", log.toObject());
            notify(kicked_user_nickname + " был разблокирован", task);  
        }
        catch (error) {
            console.log(error);
            response.sendStatus(500);
        }
        return;
    }
    response.sendStatus(400);
});
module.exports = router;