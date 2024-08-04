const DiscordOauth2 = require("discord-oauth2");
const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const multer = require('multer'); 
const { Task_Model } = require(process.cwd() + "/database/verden");
const { spworlds_data } = require(process.cwd() + "/spworlds");

const { is_mayor, is_citizen, check_for_permission } = require(process.cwd() + "/database/permissions");
const { upload_images } = require(process.cwd() + "/task_utilities.js");
router.post("", async function (request, response) {

    const spworlds_data_ = await spworlds_data(request.query.token);
    if (spworlds_data_ == null)
        return response.sendStatus(400);

    if (!await check_for_permission("task_create", spworlds_data_.player_uuid)) return response.sendStatus(401);
    const task_uuid = crypto.randomUUID();
    var images_array;

    if (request.files) {
        const { images } = request.files;

        if (images) {
            images_array = await upload_images(images,"assets/images/task/"+task_uuid);
        }
    }
    const task = new Task_Model();
    task.title = request.body.title;
    task.images = images_array;
    task.description = request.body.description;
    task.owner = spworlds_data_.player_uuid;
    task.max_workers = request.body.max_workers;
    task.points = request.body.points;
    task.id = task_uuid;
    task.save();

    response.send(task_uuid);
});
module.exports = router;