const DiscordOauth2 = require("discord-oauth2");
const express = require("express");
const router = express.Router();
const { auth_url, tokenRequest, spworlds_data } = require(process.cwd() + "/spworlds");
const {User_Data_Model, Task_Model, chat ,Rewards_Model} = require(process.cwd() + "/database/verden");
const { io } = require(process.cwd() + "/server");
const {notify, getNickname } = require(process.cwd() + "/socket/chat.js");
const { is_mayor,is_citizen,check_for_permission } = require(process.cwd() + "/database/permissions");
function res_error(res, reason) {
    res.statusCode = 400;
    res.send(reason);
}
router.get("/:id/:count/:player_uuid", async function (request, response) {

    if (request.query.token) {
        try {

            const spworlds_data_ = await spworlds_data(request.query.token);

            if (spworlds_data_ == null)
                return res_error(response, "нет проходки на сп"); 
            var task = await Task_Model.findOne({ id: request.params.id });
            if (!task)
                return res_error(response, "задачи не существует"); 
            if (!task.owner == spworlds_data_.player_uuid && !await check_for_permission("task_manage",spworlds_data_.player_uuid)) return res_error(response, "вы имеете прав модерировать данное задание..");
            if (task.workers.length == 0) return res_error(response, "нету рабочих");
            if (!task.workers.includes(request.params.player_uuid)) return res_error(response, "указаный uuid игрока не являеться участником задачи.");
            if(isNaN( request.params.count))return res_error(response, "укажите число баллов правильно.");
            var nickname = await getNickname(request.params.player_uuid);
            const user = await User_Data_Model.findOne({player_uuid:request.params.player_uuid});
            if(!user)return res_error(response, "пользователь не существует")
            user.points += Number.parseInt( request.params.count);
            await user.save();
            const reward = await Rewards_Model({
                count:Number.parseInt( request.params.count),
                player_uuid:request.params.player_uuid,
                reason:task.id,
                reason_type:"task",
                from:spworlds_data_.player_uuid
            });
            await reward.save()
            response.send("успешно выдано.");
            const log = new chat.Chat_Message_Model({ task: request.params.id, message_type: "points_reward",widget:{uuid:request.params.player_uuid,nickname,count:Number.parseInt(request.params.count)} });
            await log.save();
            io.to(task.id).emit("recive_message",log.toObject());
            notify(nickname+" вознагрожден.",task);
            
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