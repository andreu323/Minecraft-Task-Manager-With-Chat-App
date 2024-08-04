const DiscordOauth2 = require("discord-oauth2");
const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs');
const { update_connection_info } = require("../../../socket/chat");
const { Task_Model, can_make_tasks } = require(process.cwd() + "/database/verden");
const { spworlds_data } = require(process.cwd() + "/spworlds");
const { is_mayor, is_citizen, check_for_permission } = require(process.cwd() + "/database/permissions");

const { upload_images } = require(process.cwd() + "/task_utilities.js");
function res_error(res, reason) {
    res.statusCode = 400;
    res.send(reason);
}
router.post("/:id", async function (request, response) {

    const spworlds_data_ = await spworlds_data(request.query.token);
    if (spworlds_data_ == null)
        return response.sendStatus(400);
    var task = await Task_Model.findOne({ id: request.params.id });
    if (!task)
        return res_error(response, "задачи не существует");
    if (!task.owner == spworlds_data_.player_uuid && !await check_for_permission("task_manage", spworlds_data_.player_uuid)) return res_error(response, "вы имеете прав модерировать данное задание..");

    var images_array = [];
    if (request.files) {
        const { images } = request.files;
        if (images) {

            images_array= await upload_images(images,"assets/images/task/" + task.id)

        }
    }
    task.title = request.body.title;
    task.description = request.body.description;
    task.max_workers = request.body.max_workers;
    task.points = request.body.points;
    task.status = request.body.status;
    task.images = [...task.images, ...images_array];
    await task.save();
    await update_connection_info(task.id);
    response.send(task.toObject());
});
module.exports = router;