const DiscordOauth2 = require("discord-oauth2");
const express = require("express");
const router = express.Router();
const {auth_url,tokenRequest,spworlds_data} = require("../../spworlds");

router.get("", async function (request, response) {
    if (request.query.code) {
        try{
            const token_data = await tokenRequest(request.query.code);
           
            response.send(token_data);
        }
        catch(error){
            console.log(error)
        }
        return;
    }
    
    response.redirect(await auth_url());

});
module.exports = router;