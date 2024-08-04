const DiscordOauth2 = require("discord-oauth2");
const express = require("express");
const router = express.Router();
const { spworlds_data} = require(process.cwd()+"/spworlds");
const { User_Data_Model ,Rewards_Model,Task_Model} = require(process.cwd()+"/database/verden");
const { is_citizen,check_for_permission} = require(process.cwd() + "/database/permissions");
const MinecraftAPI = require('minecraft-api'); 
router.get("", async function (request, response) {
    if (request.query.token) {
        try {

            const spworlds_data_ = await spworlds_data(request.query.token);
            if (spworlds_data_ == null)
                return res.sendStatus(400);
            if(!await is_citizen(spworlds_data_.player_uuid) )
                return response.sendStatus(400);
            const user_datas = await User_Data_Model.find({});
            const user_datas_object = []
            await Promise.all( user_datas.map(async i=>{ 
                const nickname = await MinecraftAPI.nameForUuid(i.player_uuid).catch(()=>{});
                user_datas_object.push(
                    {...i.toObject(),nickname}
                )
                
            }))
            response.send(user_datas_object );
            
        }
        catch (error) {
            console.log(error);
            response.sendStatus(400);
        }
        return;
    }
    response.sendStatus(400);

});
router.get("/:uuid", async function (request, response) {
    if (request.query.token) {
        try {

            const spworlds_data_ = await spworlds_data(request.query.token);
            if (spworlds_data_ == null)
                return res.sendStatus(400);
            if(!await check_for_permission("citizens_manage", spworlds_data_.player_uuid))
                return response.sendStatus(400); 
            const user_data = await User_Data_Model.findOne({player_uuid: request.params.uuid});
            if(!user_data)
                return res.sendStatus(400);
            const data = {...user_data.toObject()}
            const nickname = await MinecraftAPI.nameForUuid(user_data.player_uuid).catch(()=>{});
            data.nickname = nickname;
       
            const found_rewards = await Rewards_Model.find({player_uuid:user_data.player_uuid}).lean();
            const modifiedrewards = await Promise.all(found_rewards.map(async doc => ({
                ...doc,
                from_nickname: await MinecraftAPI.nameForUuid(doc.from)
              })));
            data.rewards = modifiedrewards; 
            const found_own_rewards = await Rewards_Model.find({from:user_data.player_uuid}).lean();
            const modifiedownrewards = await Promise.all(found_own_rewards.map(async doc => ({
                ...doc,
                nickname: await MinecraftAPI.nameForUuid(doc.player_uuid)
              })));
            data.own_rewards = modifiedownrewards; 
     
            data.last_active = await Task_Model.find({ [`last_active.${user_data.player_uuid}`] : { $exists : true } }).select("title").select("id").select( [`last_active.${user_data.player_uuid}`]).sort({[`last_active.${user_data.player_uuid}`]: -1});
            data.owner_of = await Task_Model.find({ owner:user_data.player_uuid }).sort({createdAt: -1});
            response.send(data );
            
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