const DiscordOauth2 = require("discord-oauth2");
const express = require("express");
const router = express.Router();
const { auth_url, tokenRequest, spworlds_data } = require(process.cwd() +"/spworlds");
const { Task_Model, chat } = require(process.cwd() + "/database/verden");
const { is_citizen,check_for_permission} = require(process.cwd() + "/database/permissions");

const { io } = require(process.cwd() + "/server");
const fs = require('fs');
function res_error(res, reason) {
    res.statusCode = 400;
    res.send(reason);
}
router.get("/:id/:img_id", async function (request, response) {

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

            if (!task.owner == spworlds_data_.player_uuid && !await check_for_permission("task_manage",spworlds_data_.player_uuid)) return res_error(response, "вы имеете прав модерировать данное задание..");

            fs.rmSync(process.cwd()+"/assets/images/task/"+task.id+"/"+request.params.img_id+".png", { recursive: true, force: true });
            fs.rmSync(process.cwd()+"/assets/images/task/"+task.id+"/"+request.params.img_id+"-low.png", { recursive: true, force: true }); 
            
            const index = task.images.indexOf(request.params.img_id);
            task.images.splice(index, 1); 
            await task.save();

            response.send("удалено.");
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