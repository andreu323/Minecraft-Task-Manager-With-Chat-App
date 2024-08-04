const DiscordOauth2 = require("discord-oauth2");
const express = require("express");
const router = express.Router();
const { auth_url, tokenRequest, spworlds_data } = require(process.cwd() +"/spworlds");
const { Task_Model,   chat } = require(process.cwd() + "/database/verden");
const { io } = require(process.cwd() + "/server");
const { notify,users_in_task,update_connection_info } = require(process.cwd() + "/socket/chat.js");

 
const { is_mayor,is_citizen,check_for_permission } = require(process.cwd() + "/database/permissions");
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
            if (task.workers.length == task.max_workers) return res_error(response, "нет места.");
            if (task.workers.includes(spworlds_data_.player_uuid))return res_error(response, "ты уже добавлен чел..");

            if(task.kicked_users[spworlds_data_.player_uuid] != undefined){
                if(new Date(task.kicked_users[spworlds_data_.player_uuid].expire_date) > new Date() ||task.kicked_users[spworlds_data_.player_uuid].expire_date == "forever" )
                    return res_error(response, "вы не можете принять задачу, вы заблокированы до: "+ task.kicked_users[spworlds_data_.player_uuid].expire_date);
                else delete task.kicked_users[spworlds_data_.player_uuid];
                task.markModified("kicked_users");
            }

            task.workers = [...task.workers, spworlds_data_.player_uuid];

            await task.save();
            await update_connection_info(task.id);
            response.send("вы успешно добавлены.");
            const log = new chat.Chat_Message_Model({ task: request.params.id, message_type: "join",widget:{max_workers:task.max_workers,workers:task.workers,nickname:spworlds_data_.nickname} });
            await log.save();
            io.to(task.id).emit("recive_message",log.toObject());
            
            notify(spworlds_data_.nickname+" вступил в задание.",task);
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