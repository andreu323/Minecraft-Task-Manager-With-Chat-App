const DiscordOauth2 = require("discord-oauth2");
const express = require("express");
const router = express.Router();
const { spworlds_data } = require(process.cwd()+"/spworlds");
const { User_Data_Model } = require(process.cwd()+"/database/verden");
const { user_permissions } = require(process.cwd() + "/database/permissions");
router.get("", async function (request, response) {
    if (request.query.token) {
        try {

            const spworlds_data_ = await spworlds_data(request.query.token);
            const user_data = await User_Data_Model.findOne({player_uuid:spworlds_data_.player_uuid});
            var object = {player_uuid:spworlds_data_.player_uuid,nickname:spworlds_data_.nickname,discord_id:spworlds_data_.discord_id,
                points:0,
                roles:[],
                permissions:[]
                
            };
            if(user_data != undefined){
                object.roles = user_data.roles;
                object.points = user_data.points;
                object.permissions = await user_permissions(user_data.player_uuid);
            } 
            response.send( object);
        }
        catch (error) {
            console.log(error);
            response.sendStatus(400);
        }
        return;
    }
    response.sendStatus(400);

});
module.exports = router;