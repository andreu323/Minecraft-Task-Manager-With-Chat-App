const DiscordOauth2 = require("discord-oauth2");
const crypto = require("crypto"); 
const oauth = new DiscordOauth2({
    clientId: "  CLIENT ID OF UR DISCORD DEV APP",
    clientSecret: " CLIENT SECRET OF UR DISCORD DEV APP",
    redirectUri: "http://localhost:5173",
});

const MinecraftAPI = require('minecraft-api'); 
const { SPworlds_data_Model } = require("./database/verden");
const { error } = require("console");
const auth_url = async () => {
    const url = await oauth.generateAuthUrl({
        scope: ["identify", "guilds"],
        state: crypto.randomBytes(16).toString("hex"), // Be aware that randomBytes is sync if no callback is provided
    });
    return url;
}

const tokenRequest = async (code) => {
    console.log("Test")
    const token = await oauth.tokenRequest({
        code,
        scope: ["identify", "guilds"],
        grantType: "authorization_code",

    });
    return token;
}
let requests_to_minecraft_nickname = [];
(async function main() {

    if (requests_to_minecraft_nickname.length > 0) {
        function return_value(value) {
            requests_to_minecraft_nickname[0].response = value;
            requests_to_minecraft_nickname.shift();
            setTimeout(main, 1);
        }
        try {
            var discord_user;
            try{discord_user =await oauth.getUser(requests_to_minecraft_nickname[0].token)}catch(error){console.log(error)}
            if (!discord_user) {
                return_value(null);
                return;
            }
            // const discord_user = { id: "381076387865427968" }
            const spworlds_data = await SPworlds_data_Model.findOne({ discord_id: discord_user.id });
            

            if (!spworlds_data) {

                var username;

                if (discord_user.id == "381076387865427968") username = "lodo4nik";
                if (discord_user.id == "798561699241787402") username = "Svifey"; 
                //this app was based before on api of some minecraft server that whs returning discord linked users minecraft nickname.
                //uf u put ur nickname here it will allow u to join this chat app.
                const player_uuid = await MinecraftAPI.uuidForName(username).catch((error) => { });
                if (!player_uuid) {
                    return_value(null);
                    return;
                }
                const new_spworlds_data = new SPworlds_data_Model({ discord_id: discord_user.id, nickname: username, player_uuid });
                await new_spworlds_data.save();

                return_value(new_spworlds_data);
                return;
            }
            else {


                return_value(spworlds_data);
                return;
            }


        }
        catch (error) {
            console.log(error);
            return_value(null);
            return;
        }



    }
    setTimeout(main, 1);
})();

const spworlds_data = async (token) => {
    var request = { response: 0, token }
    requests_to_minecraft_nickname.push(request);

    return new Promise((resolve, reject) => {
        async function waiting_for_response() {
            if (request.response != 0) {
                resolve(request.response);
                return;
            }
            setTimeout(waiting_for_response, 1);
        };
        waiting_for_response();
    });



}

module.exports = { auth_url, tokenRequest, spworlds_data };