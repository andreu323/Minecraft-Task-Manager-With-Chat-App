const DiscordOauth2 = require("discord-oauth2");
const express = require("express");
const router = express.Router();
const { auth_url, tokenRequest, spworlds_data } = require(process.cwd() + "/spworlds");
const { Task_Model,  chat } = require(process.cwd() + "/database/verden");
const { io } = require(process.cwd() + "/server");
const { notify ,users_in_task,getNickname} = require(process.cwd() + "/socket/chat.js");
const { is_mayor,is_citizen ,check_for_permission} = require(process.cwd() + "/database/permissions");
const MinecraftAPI = require('minecraft-api');
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
            if (task.workers.length == task.max_workers && !await check_for_permission("task_manage",spworlds_data_.player_uuid)) return res_error(response, "вы имеете прав модерировать данное задание..");
            const kicked_users = {...task.kicked_users}
            const user_ids = Object.keys(kicked_users);
            for (let index = 0; index < user_ids.length; index++) {
                const user_id = user_ids[index];
                const kicked_data = kicked_users[user_id];
                kicked_data.nickname = await MinecraftAPI.nameForUuid(user_id);
             
            }
            response.send(kicked_users );   
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