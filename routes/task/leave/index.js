const DiscordOauth2 = require("discord-oauth2");
const express = require("express");
const router = express.Router();
const { auth_url, tokenRequest, spworlds_data } = require(process.cwd() +"/spworlds");
const { Task_Model,  chat } = require(process.cwd() + "/database/verden");
const { io } = require(process.cwd() + "/server");
const { notify ,update_connection_info,users_in_task,user_remote_kick} = require(process.cwd() + "/socket/chat.js");
const { is_mayor,is_citizen ,check_for_permission} = require(process.cwd() + "/database/permissions");
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
            if (!task.workers.includes(spworlds_data_.player_uuid))return res_error(response, "ты не участник..");
            task.workers.remove(spworlds_data_.player_uuid);
            task.workers = [...task.workers]; 
            await task.save();
            await update_connection_info(task.id);
            response.send("вы успешно удалены.");
            const log = new chat.Chat_Message_Model({ task: request.params.id, message_type: "leave",widget:{max_workers:task.max_workers,workers:task.workers,nickname:spworlds_data_.nickname} });
            await log.save();
            io.to(task.id).emit("recive_message",log.toObject());
            notify(spworlds_data_.nickname+" покинул задание.",task);
            
            if (users_in_task[task.id] && users_in_task[task.id][spworlds_data_.player_uuid]) {
                user_remote_kick(task.id,spworlds_data_.player_uuid,"вы покинули задачу.")
            }
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