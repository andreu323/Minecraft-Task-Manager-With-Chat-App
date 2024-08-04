const DiscordOauth2 = require("discord-oauth2");
const express = require("express");
const router = express.Router();
const { auth_url, tokenRequest, spworlds_data } = require("../../spworlds");
const { Task_Model, chat } = require(process.cwd() + "/database/verden");
const { io } = require(process.cwd() + "/server");
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
                return res_error(res, "задачи не существует"); 
            if (!task.workers.includes(spworlds_data_.player_uuid) && !task.owner == spworlds_data_.player_uuid)return res_error(response, "ты не участник.");
            const new_messages = await chat.New_Chat_Messages_Model.findOne({task:task.id,player_uuid:spworlds_data_.player_uuid});
            if(!new_messages)return response.send({});
            response.send(new_messages);
        }
        catch (error) {
            console.log(error);
            response.sendStatus(500);
        }
        return;
    }
    response.sendStatus(400);
});
router.get("/:id/readthem", async function (request, response) {

    if (request.query.token) {
        try {

            const spworlds_data_ = await spworlds_data(request.query.token);

            if (spworlds_data_ == null)
                return res_error(response, "нет проходки на сп");
            if (!await is_citizen(spworlds_data_.player_uuid))
                return res_error(response, "у вас нет прав на просмотр задач");
            var task = await Task_Model.findOne({ id: request.params.id });
            if (!task)
                return res_error(res, "задачи не существует"); 
            if (!task.workers.includes(spworlds_data_.player_uuid)&& !task.owner == spworlds_data_.player_uuid)return res_error(response, "ты не участник.");
            const new_messages = await chat.New_Chat_Messages_Model.deleteOne({task:task.id,player_uuid:spworlds_data_.player_uuid});
            response.send("сообщения помечены как прочитанные");
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