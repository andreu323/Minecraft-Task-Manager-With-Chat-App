const crypto = require("crypto");
const MinecraftAPI = require('minecraft-api');
const sharp = require('sharp');
const fs = require('fs');
const { Task_Model } = require("./database/verden");
async function upload_images(images, dir) {
    var images_array = []
    async function saveImage(image) {
        const img_name = crypto.randomUUID();
        const data = image.data || image;

        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        await sharp(data).toFile(dir + "/" + img_name + ".png");
        await sharp(data).resize(324).jpeg({ quality: 25 }).toFile(dir + "/" + img_name + "-low.png");

        images_array.push(img_name);
    }
    if (images.length) {

        for (let index = 0; index < images.length; index++) {
            const image = images[index];
            await saveImage(image)
        }
    }
    else {
        await saveImage(images)
    }
    return images_array;
}

async function get_task(id) {

    var task = await Task_Model.findOne({ id }).then((model) => { if (model != undefined) return model.toObject(); });
    if (!task)
        return null;

    task.owner_nickname = await MinecraftAPI.nameForUuid(task.owner);

    var worker_nicknames = []
    for (let index = 0; index < task.workers.length; index++) {
        const worker = task.workers[index];
        worker_nicknames.push(await MinecraftAPI.nameForUuid(worker));
    }
    task.worker_nicknames = worker_nicknames;

 
    return task;
}
module.exports = { upload_images ,get_task}