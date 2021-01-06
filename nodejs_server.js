const express = require('express');
const http = require('http')
const cors = require('cors');
const ini = require('ini');
const fs = require('fs');

const config = ini.parse(fs.readFileSync('./configuration.ini', 'utf-8'))
const username = config.remote.user;
const password = config.remote.password;
const host = config.remote.host;
const port = config.remote.port;
console.log("userhello" + username+ password + host + port);


const app = express();

//add other middleware
app.use(cors());

//start app 
const local_port = 3131;

app.listen(local_port, () =>
  console.log(`App is listening on port ${local_port}.`)
);


app.get('/', async (req, res) => {
   
http.get('http://' + username + ":" + password + "@" + host + ":" + port + "/_uuids", (resp) => {
  let data = '';

  // A chunk of data has been recieved.
  resp.on('data', (chunk) => {
    data += chunk;
  });

  resp.on('end', () => {
    console.log(data);
    res.send(data);
  });

}).on("error", (err) => {
  console.log("Error: " + err.message);
});

//          res.send("hi");

});
