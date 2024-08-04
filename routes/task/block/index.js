const DiscordOauth2 = require("discord-oauth2");
const express = require("express");
const router = express.Router();
const { auth_url, tokenRequest, spworlds_data } = require(process.cwd() + "/spworlds");
const { Task_Model, chat } = require(process.cwd() + "/database/verden");
const { io } = require(process.cwd() + "/server");
const { notify, users_in_task, getNickname,update_connection_info,user_remote_kick } = require(process.cwd() + "/socket/chat.js");
const { is_mayor, is_citizen, check_for_permission } = require(process.cwd() + "/database/permissions");

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
            if (task.owner != spworlds_data_.player_uuid && !await check_for_permission("task_manage", spworlds_data_.player_uuid)) return res_error(response, "вы имеете прав модерировать данное задание..");

            const index = task.workers.indexOf(request.params.player_uuid);
            var iskicked = false;
            if (index != -1) {
                iskicked = true;
                task.workers.splice(index, 1);
            }


            const input_expire_date = request.query.expire_date;
            var expire = undefined;
            if (input_expire_date) {
                var expire_date = input_expire_date;
                if (input_expire_date != "forever") {
                    expire_date = new Date(input_expire_date);
                    const currentDate = new Date();
                    expire_date.setMinutes(currentDate.getMinutes());
                    expire_date.setHours(currentDate.getHours());
                }

                expire = expire_date;
                task.kicked_users[request.params.player_uuid] = { expire_date, from: spworlds_data_.player_uuid }
                task.kicked_users = { ...task.kicked_users };
                task.markModified("kicked_users");
            }
            await task.save();
            await update_connection_info(task.id);
            response.send("игрок " + request.params.player_uuid + " заблокирован/кикнут.");
   
            if (users_in_task[task.id] && users_in_task[task.id][request.params.player_uuid] && task.owner !=request.params.player_uuid && !await check_for_permission("task_manage", request.params.player_uuid)) {
                user_remote_kick(task.id,request.params.player_uuid,"вы кикнуты.")
            }
            const kicked_user_nickname = await getNickname(request.params.player_uuid);

            if (iskicked) {
                const log = new chat.Chat_Message_Model({ task: request.params.id, message_type: "kick", widget: { from: spworlds_data_.nickname, to: kicked_user_nickname, expire_date: expire } });
                await log.save();
                io.to(task.id).emit("recive_message", log.toObject());
                notify(kicked_user_nickname + " был кикнут", task);
            }
            else {
                const log = new chat.Chat_Message_Model({ task: request.params.id, message_type: "block", widget: { from: spworlds_data_.nickname, to: kicked_user_nickname, expire_date: expire } });
                await log.save();
                io.to(task.id).emit("recive_message", log.toObject());
                notify(kicked_user_nickname + " был заблокирован", task);
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