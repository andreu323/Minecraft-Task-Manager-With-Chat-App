
const mongoose = require("mongoose");

const Schema = mongoose.Schema;
const Grid = require('gridfs-stream');
const { v4: uuidv4 } = require('uuid');
const database = mongoose.createConnection(`mongodb://0.0.0.0:27017/Verden`, {
  useUnifiedTopology: true,
  useNewUrlParser: true
});

database.on('error', (err) => {
  console.error('Error connecting to Verden Services Database:', err);
});

var Task_Shema = new Schema({
  images: { type: Array },
  title: { type: String, maxlength: 100 },
  description: { type: String },
  owner: { type: String },
  id: { type: String },
  max_workers: { type: Number },
  workers: { type: Array },
  points: { type: Number },
  status: { type: Number, default: 2 },
  last_message: { type: String },
  last_active: { type: Object, default: {} },
  kicked_users: { type: Object, default: {} },
}, {
  timestamps: true
});
const Task_Model = database.model('tasks', Task_Shema);

var SPworlds_data_Shema = new Schema({
  player_uuid: { type: String },
  nickname: { type: String },
  discord_id: { type: String }
}, {
  timestamps: true
});
SPworlds_data_Shema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });
const SPworlds_data_Model = database.model('spworlds_data', SPworlds_data_Shema);

var User_Data_Shema = new Schema({
  player_uuid: { type: String },
  roles: { type: Array ,default:[]},
  points: { type: Number,default:0 },
}, {
  timestamps: true
});
const User_Data_Model = database.model('user_datas', User_Data_Shema);
 

var Chat_Message_Shema = new Schema({
  task: { type: String, require: true },
  text: { type: String },
  player_uuid: { type: String },
  uuid: { type: String, default: uuidv4 },
  message_type: { type: String, require: true, default: "default" },
  reply: { type: String },
  widget: { type: Object },
  images: {type:Array}
}, {
  timestamps: true
});
const Chat_Message_Model = database.model('chat_messages', Chat_Message_Shema);

var New_Chat_Messages_Shema = new Schema({
  task: { type: String, require: true },
  count: { type: Number, require: true },
  player_uuid: { type: String, require: true }
}, {
  timestamps: true
});
const New_Chat_Messages_Model = database.model('new_chat_messages', New_Chat_Messages_Shema);
var Rewards_Shema = new Schema({
  reason: { type: String, require: true },
  reason_type: { type: String, require: true },
  count: { type: Number, require: true },
  uuid: { type: String, default: uuidv4 },
  from: { type: String, require: true },
  player_uuid: { type: String, require: true }
}, {
  timestamps: true
});
const Rewards_Model = database.model('rewards', Rewards_Shema);


(async () => { 
  const user = await User_Data_Model.findOne({ player_uuid: "cb5fd9c57e514267aa2ce7fcdbcd80f6" });
  if (!user) {
    const user_new = new User_Data_Model({
      player_uuid: "cb5fd9c57e514267aa2ce7fcdbcd80f6",
      roles: ["mayor"]
    });
    user_new.save() 
  }
})();

module.exports = { Task_Model, SPworlds_data_Model, User_Data_Model, Rewards_Model, chat: { Chat_Message_Model, New_Chat_Messages_Model } };