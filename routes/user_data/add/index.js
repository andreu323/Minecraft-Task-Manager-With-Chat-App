const DiscordOauth2 = require("discord-oauth2");
const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs');
const { User_Data_Model } = require(process.cwd() + "/database/verden");
const { spworlds_data } = require(process.cwd() + "/spworlds");
const { is_citizen, check_for_permission, roles } = require(process.cwd() + "/database/permissions");

router.get("/:uuid", async function (request, response) {

    const spworlds_data_ = await spworlds_data(request.query.token);
    if (spworlds_data_ == null)
        return response.sendStatus(400);
    if (!await check_for_permission("citizens_manage", spworlds_data_.player_uuid))
        return response.sendStatus(400);

    //if (!can_make_tasks(spworlds_data_.uuid)) return response.sendStatus(401);
    if(await User_Data_Model.findOne({ player_uuid: request.params.uuid })) return response.sendStatus(500);
    const user_data = new User_Data_Model({ player_uuid: request.params.uuid });
    await user_data.save();

    response.send("Успешно Добавлен");
});
module.exports = router;