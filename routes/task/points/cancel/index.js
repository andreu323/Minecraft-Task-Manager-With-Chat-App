const DiscordOauth2 = require("discord-oauth2");
const express = require("express");
const router = express.Router();
const { auth_url, tokenRequest, spworlds_data } = require(process.cwd() + "/spworlds");
const {User_Data_Model, Task_Model,  chat ,Rewards_Model} = require(process.cwd() + "/database/verden");
const { io } = require(process.cwd() + "/server");
const {notify, getNickname } = require(process.cwd() + "/socket/chat.js");
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
            if (!task.owner == spworlds_data_.player_uuid  && !await check_for_permission("task_manage",spworlds_data_.player_uuid))  return res_error(response, "вы имеете прав модерировать данное задание..");
            const reward = await Rewards_Model.findOne({id:request.params.id});
            const sevenDaysInMilliseconds = 7 * 24 * 60 * 60 * 1000;
            if(reward.createdAt - new Date() >= sevenDaysInMilliseconds)
                return res_error(response, "премия устарела.");
            
            const user = await User_Data_Model.findOne({player_uuid:reward.player_uuid});
            user.points -= reward.points;
            await user.save();
            response.send("успешно Отменено.");
            const log = new chat.Chat_Message_Model({ task: request.params.id, message_type: "points_reward_cancel",widget:{reward:reward.toObject()} });
            await log.save();
            io.to(task.id).emit("recive_message",log.toObject());
            notify(nickname+" вознагрожден.",task);
            await reward.delete();
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