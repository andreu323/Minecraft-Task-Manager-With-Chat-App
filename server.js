
const express = require('express');
const DiscordOauth2 = require("discord-oauth2");
const fileUpload = require('express-fileupload');
const path = require('path');
var bodyParser = require('body-parser');
var app = express();
const crypto = require("crypto");
var fs = require('fs');
const multer = require('multer');
 
const http = require('http');
const server = http.createServer(app, {
  pingInterval: 10000, // how often to ping/pong.
  pingTimeout: 30000 // time after which the connection is considered timed-out.
});

const cors = require("cors");

const corsOptions = {
  origin: ['http://localhost:5500', 'http://localhost:5173'],
  credentials: true,//access-control-allow-credentials:true
  optionSuccessStatus: 200,
}

app.use(cors(corsOptions));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(fileUpload());

app.use("/assets", express.static("assets"));

const { Server } = require("socket.io");
const io = new Server(server, { maxHttpBufferSize: 200 * 1024 * 1024 });
const { Task_Model, chat } = require("./database/verden");
const { is_citizen, is_mayor, can_make_tasks } = require("./database/permissions");

const { spworlds_data } = require("./spworlds");
const { get_task } = require('./task_utilities');
function res_error(res, reason) {
  res.statusCode = 400;
  res.send(reason);
}
// app.get("/news", async function (request, res) {

//   var newsdata = await News.find().sort({ _id: -1 }).limit(4)

//   res.send({ news: newsdata })
// });
// app.get("/projects", async function (request, res) {
//   var proj = await Projects.find();
//   res.send({ projects: proj })
// });

//require("./gpt")


app.get("/tasks", async function (request, res) {
  const spworlds_data_ = await spworlds_data(request.query.token);
  if (spworlds_data_ == null)
    return res.sendStatus(400);
  if (!await is_citizen(spworlds_data_.player_uuid))
    return res.sendStatus(401);
  var tasks = await Task_Model.find();

  for (let index = 0; index < tasks.length; index++) {
    tasks[index] = tasks[index].toObject();
    const task = tasks[index];
    if (task.last_active)
      task.last_active = task.last_active[spworlds_data_.player_uuid];

    if (task.workers.includes(spworlds_data_.player_uuid) || task.owner == spworlds_data_.player_uuid) {
      const new_messages = await chat.New_Chat_Messages_Model.findOne({ task: task.id, player_uuid: spworlds_data_.player_uuid });
      if (!new_messages) continue;
      task.notify = new_messages.toObject();
    }


  }

  res.send(tasks);

});
app.get("/task/:id", async function (request, res) {
  const spworlds_data_ = await spworlds_data(request.query.token);

  if (spworlds_data_ == null)
    return res_error(res, "нет проходки на сп");
  if (!await is_citizen(spworlds_data_.player_uuid))
    return res_error(res, "no_permissions");
  const task = await get_task(request.params.id)
  if (task.kicked_users && task.kicked_users[spworlds_data_.player_uuid] != undefined) {
    task.kick = task.kicked_users[spworlds_data_.player_uuid];
  }
  delete task.kicked_users;
  res.send(task);
});

app.get("/discord", async function (request, res) {

  res.send("abema")

});

app.get("/debug", async function (request, res) {
  var files = await getAllFiles("./routes");

  var routes = filterFilesByNameAndExtension(files, "index", ".js");

  const file = routes[0];
  let router_name = file.substring(file.indexOf(`routes`)).replace("routes", "").replace("\\index.js", "").replace("/index.js", "");
  res.send(router_name)
  return;

});



io.on('connection', (socket) => {
  const socket_connection = require("./socket/" + socket.handshake.query.portal);

  socket_connection.connected(socket, io);
});


async function getAllFiles(dirPath, arrayOfFiles) {
  const files = await fs.readdirSync(dirPath)

  arrayOfFiles = arrayOfFiles || []

  for (let index = 0; index < files.length; index++) {
    const file = files[index];

    if (await fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = await getAllFiles(dirPath + "/" + file, arrayOfFiles)
    } else {

      const str = path.join(__dirname, dirPath, "/", file);

      await arrayOfFiles.push(str);
    }
  }

  return arrayOfFiles;
}
function filterFilesByNameAndExtension(files, fileName, extension) {
  return files.filter(function (file) {
    return file.indexOf(fileName) !== -1 && path.extname(file) === extension;
  });
}
(async () => {

  var files = await getAllFiles("./routes");

  var routes = filterFilesByNameAndExtension(files, "index", ".js");

  routes.forEach(async (file) => {

    const router_module = await require(file)
    let router_name = file.substring(file.indexOf(`routes`)).replace("routes", "").replace("\\index.js", "").replace("/index.js", "").replaceAll("\\", "/");
    router_name = router_name.replaceAll("--", ":");

    app.use(router_name, router_module)

  })
})();






server.listen(4000, () => {
  console.log('listening on *:4000');

});
module.exports = { io };