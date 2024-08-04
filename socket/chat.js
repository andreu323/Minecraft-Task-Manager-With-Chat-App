const { spworlds_data } = require("../spworlds");
const { chat, Task_Model } = require("../database/verden");
 const { gpt_request } = require("../gpt");
const { is_mayor, is_citizen, check_for_permission } = require(process.cwd() + "/database/permissions");
const { upload_images } = require(process.cwd() + "/task_utilities.js");
const MinecraftAPI = require('minecraft-api');
const crypto = require("crypto");
const { get_task } = require("../task_utilities");
const users_in_task = {}
const users_message_cooldown = {}
var nicknames_buffer = {};
async function getNickname(uuid) {
    if (!nicknames_buffer[uuid]) nicknames_buffer[uuid] = await MinecraftAPI.nameForUuid(uuid).catch(()=>{});
    return nicknames_buffer[uuid];
}
async function getReply(uuid) {
    var message = await chat.Chat_Message_Model.findOne({ uuid });
    if (!message) return;
    message = message.toObject();
    if (message.player_uuid) message.nickname = await getNickname(message.player_uuid);
    return message;
}
async function config_messages(messages) {
    for (let index = 0; index < messages.length; index++) {
        const item = messages[index].toObject();
        if (!item.player_uuid) continue;
        item.nickname = await getNickname(item.player_uuid);
        if (item.reply) item.reply = await getReply(item.reply);

        messages[index] = item;
    }
    return messages;
}
async function active(task, uuid) {
    task.last_active[uuid] = new Date();
    task.markModified("last_active");
    await task.save();
}

async function update_connection_info(task_id){
    if(!users_in_task[task_id])return;
    const connection_data = {task_data:await get_task(task_id),users_in_task: Object.keys( users_in_task[task_id])};
 
    for (let index = 0; index < Object.keys(users_in_task[task_id]).length; index++) {
        const player_uuid = Object.keys(users_in_task[task_id])[index];    
        const cooldown_manager =  users_message_cooldown[player_uuid];
        connection_data.cooldown_manager = cooldown_manager; 
        user_sockets_emit(task_id,player_uuid,"connection_info_update",connection_data) 
    }
 
}
function user_sockets_emit(task_id,player_uuid,emit_type,data){
    if(!users_in_task[task_id] && !users_in_task[task_id][player_uuid])return;
    for (let index = 0; index < Object.keys(users_in_task[task_id][player_uuid]).length; index++) { 
        const socket_id = Object.keys(users_in_task[task_id][player_uuid])[index]; 
        const socket = users_in_task[task_id][player_uuid][socket_id].socket;
        socket.emit(emit_type,data );
    }
}
function user_remote_kick(task_id,player_uuid,reason){
    if(!users_in_task[task_id] && !users_in_task[task_id][player_uuid])return;
    const socket_ids = Object.keys(users_in_task[task_id][player_uuid]);
    for (let index = 0; index <  socket_ids.length; index++) { 
        const socket_id = socket_ids[index]; 
        const socket_data = users_in_task[task_id][player_uuid][socket_id];
        if(!socket_data)continue;
        const kick = socket_data.kick;
         kick(reason);
    }
    
}
async function connected(socket, io) {
    const token = socket.handshake.auth.token;
    const spworlds_data_ = await spworlds_data(token);
    if (!spworlds_data_) return kick("не игрок сп.");
    const task = await Task_Model.findOne({id:socket.handshake.query.task}); 
 
    function kick(reason) {
        socket.emit("kick", reason);
        socket.disconnect();
    }

    if (!task)
        return kick("данной задачи не существует чел..");
    const is_owner = task.owner == spworlds_data_.player_uuid;
    const canManage = await check_for_permission("task_manage", spworlds_data_.player_uuid);
 
    if (!task.workers.includes(spworlds_data_.player_uuid) && !is_owner && !canManage) return kick("вы не участник этой задачи..");
    socket.join(task.id);

    console.log("user connected: " + spworlds_data_.nickname + " to task chat: " + task.id);
    if (!users_in_task[task.id]) users_in_task[task.id] = {};
    if(!users_in_task[task.id][spworlds_data_.player_uuid]) users_in_task[task.id][spworlds_data_.player_uuid] = {}
    const socket_id = crypto.randomUUID();
    users_in_task[task.id][spworlds_data_.player_uuid][socket_id] = { socket, kick }
    const message_limit = 50;

    var messages = await chat.Chat_Message_Model.find({ task: task.id }).sort({ _id: -1 }).limit(message_limit);
    messages.sort();

    messages = await config_messages(messages); 
    const connection_data = {messages,task_data:await get_task(socket.handshake.query.task),users_in_task: Object.keys( users_in_task[task.id])};
    const cooldown_manager =  users_message_cooldown[spworlds_data_.player_uuid];
    connection_data.cooldown_manager = cooldown_manager; 
    
    socket.emit("connection_info",connection_data );
    await update_connection_info(task.id);
    await chat.New_Chat_Messages_Model.deleteOne({ task: task.id, player_uuid: spworlds_data_.player_uuid });

    socket.on("recive_old", async (index, callback) => {
        if (typeof index != "number") return;

        var messages = await chat.Chat_Message_Model.find({ task: task.id }).sort({ _id: -1 }).skip(index * message_limit).limit(message_limit);
        messages.sort();
        messages = await config_messages(messages);
        callback(messages);
    });

    socket.on("delete_message", async (uuid, callback) => {
        const message = await chat.Chat_Message_Model.findOne({uuid});
        if(message.player_uuid == spworlds_data_.player_uuid){
            await message.delete();
            callback("deleted");
        }
        else{
            callback("wrong");
        }
      
    });
    socket.on("send_message", async (data, callback) => {
        if (!users_message_cooldown[spworlds_data_.player_uuid]) users_message_cooldown[spworlds_data_.player_uuid] = { messages: 0,cooldown_in_minutes:1,isCooldown: false, last_message: new Date() }
        else {
      
            const cooldown_manager = users_message_cooldown[spworlds_data_.player_uuid];
       
            const last_msg_time = new Date() - cooldown_manager.last_message;
            if (last_msg_time / 1000 > 10 && !cooldown_manager.isCooldown) cooldown_manager.messages = 0;
            if(cooldown_manager.isCooldown && last_msg_time / (1000*60) >  cooldown_manager.cooldown_in_minutes){
                cooldown_manager.messages = 0;
                cooldown_manager.isCooldown = false; 
            }
    
      
            if (cooldown_manager.isCooldown) return;
            cooldown_manager.messages += 1;
            cooldown_manager.last_message = new Date();
            if (cooldown_manager.messages > 8 && !cooldown_manager.isCooldown && !is_owner)
                cooldown_manager.isCooldown = true;



            users_message_cooldown[spworlds_data_.player_uuid] = cooldown_manager;
            
        }
        
        const cooldown_manager = users_message_cooldown[spworlds_data_.player_uuid];
        const message_model = new chat.Chat_Message_Model({ player_uuid: spworlds_data_.player_uuid, text: data.text, reply: data.reply, task: task.id });

        if (data.images && data.images.length > 0)
            message_model.images = await upload_images(Object.values(data.images), "assets/images/task/" + task.id + "/message/" + message_model.uuid);
        await message_model.save();
        const message_obj = await message_model.toObject();
        if (message_obj.reply) message_obj.reply = await getReply(message_obj.reply);
        const nickname = await getNickname(spworlds_data_.player_uuid);
        message_obj.nickname = nickname;
        socket.to(task.id).emit("recive_message", message_obj);


        callback({message_obj,cooldown_manager});
        await notify(nickname + ": " + data.text, task);
        await active(task, spworlds_data_.player_uuid);
        if (data.text.toLowerCase().includes("@ai")) {
            const ms =  await chat.Chat_Message_Model.find({ task: socket.handshake.query.task }).sort({ _id: -1 }).limit(100);
            const msg = await config_messages(ms);

            const answer = await gpt_request( msg,data.text,spworlds_data_.player_uuid,nickname);
            const log = new chat.Chat_Message_Model({ task: task.id, text: "AI BOT: " + answer });
 
            await log.save();  
            io.to(task.id).emit("recive_message", log.toObject());
            await notify( "AI BOT: " + answer, task);
        }
     
    });

    socket.on("command", async (command) => {
        var values = command.split(" ");
        const command_name = values[0];
        if (command_name == "clear" && is_owner) {
            await chat.Chat_Message_Model.deleteMany({ task: task.id });
            io.to(task.id).emit("clear");

        }
        if (command_name == "sex") {
            const log = new chat.Chat_Message_Model({ task: task.id, text: spworlds_data_.nickname + " ебнулся UWU", player_uuid: "_" });

            await log.save();
            io.to(task.id).emit("recive_message", log.toObject());

        }
        active(task, spworlds_data_.player_uuid);
    });
    socket.on('disconnect', async () => {
        console.log("user disconected: " + spworlds_data_.nickname + " from task chat: " + task.id);  
        delete_socket_from_chat(task.id,spworlds_data_.player_uuid,socket_id)
        await update_connection_info(task.id);
    });
}

function delete_socket_from_chat(task_id,player_uuid,socket_id){
    if(!users_in_task[task_id] &&  !users_in_task[task_id][player_uuid] &&  !users_in_task[task_id][player_uuid][socket_id])return;
    delete users_in_task[task_id][player_uuid][socket_id];
    if(Object.values(users_in_task[task_id][player_uuid]).length == 0)delete users_in_task[task_id][player_uuid];
}

async function notify_user(task, text, player_uuid) {
    const task_id = task.id;

    const notify = await chat.New_Chat_Messages_Model.findOne({ task: task_id, player_uuid });
    if (!notify) {
        const new_notify = new chat.New_Chat_Messages_Model({ task: task_id, player_uuid, count: 1 });
        new_notify.save();
    }
    else {

        notify.count++;
        notify.save();
    }
}
const notify = async (notify_text, task) => {

    task.last_message = notify_text;
    await task.save();
    if (!users_in_task[task.id] || !users_in_task[task.id][task.owner]) notify_user(task, notify_text, task.owner);
    task.workers.forEach(worker => {

        if (!users_in_task[task.id] || !users_in_task[task.id][worker]) notify_user(task, notify_text, worker);

    });
}
module.exports = { users_in_task, connected, notify, getNickname ,update_connection_info,user_remote_kick}