const DiscordOauth2 = require("discord-oauth2");
const express = require("express");
const router = express.Router();
const { spworlds_data } = require(process.cwd() + "/spworlds");
const { User_Data_Model } = require(process.cwd() + "/database/verden");
const MinecraftAPI = require('minecraft-api');
const { is_citizen, check_for_permission, roles } = require(process.cwd() + "/database/permissions");

router.post("/:uuid", async function (request, response) {
    if (request.query.token) {
        try { 
            const spworlds_data_ = await spworlds_data(request.query.token);
            if (spworlds_data_ == null)
                return res.sendStatus(400);
            if (!await check_for_permission("citizens_manage", spworlds_data_.player_uuid))
                return response.sendStatus(400);

            const user_data = await User_Data_Model.findOne({ player_uuid: request.params.uuid });
            if (!user_data)
                return res.sendStatus(400);
            if (request.body.roles) user_data.roles = request.body.roles;
            if (request.body.points) user_data.points = request.body.points;
            await user_data.save();
            response.send("Успешно Изменено");

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