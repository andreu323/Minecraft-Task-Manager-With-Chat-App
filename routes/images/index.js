const DiscordOauth2 = require("discord-oauth2");
const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs');
const { gridfsBucket, Task_Model, can_make_tasks } = require(process.cwd() + "/database/verden");
const { spworlds_data } = require(process.cwd() + "/spworlds");

router.get("/:filename", async function (request, response) {
    const files = await gridfsBucket.find({ filename: request.params.filename }).toArray();
    if (files.length == 0) return response.sendStatus(400);
    const readStream = gridfsBucket.openDownloadStream(files[0]._id, { revision: -1 });
    const sharpStream = sharp();
         
    
    //readStream.setEncoding("image");
    readStream.pipe(response); 
    // readStream.pipe(sharpStream.jpeg({ quality: 100 })).pipe(response);
});
module.exports = router;