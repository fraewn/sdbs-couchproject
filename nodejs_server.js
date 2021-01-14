var express = require('express');
var bodyParser = require('body-parser');
var multer = require('multer');
var upload = multer();
var app = express();

const path = require('path')
const fs = require('fs');
const ini = require('ini');


// for parsing application/json
app.use(bodyParser.json()); 

// for parsing application/xwww-
app.use(bodyParser.urlencoded({ extended: true })); 
//form-urlencoded

// for parsing multipart/form-data
app.use(upload.array()); 
app.use(express.static('public'));

const config = ini.parse(fs.readFileSync('./configuration.ini', 'utf-8'))
const username = config.remote.user;
const password = config.remote.password;
const host = config.remote.host;
const port = config.remote.port;

//start app 
const local_port = 3122;

app.listen(local_port, () =>
  console.log(`App is listening on port ${local_port}.`)
);

app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname, './public/index.html'))
});



// database operations

console.log("userhello" + username+ password + host + port);

const couch = require('nano')('http://' + username + ":" + password + "@" + host + ":" + port)


// create database "cert-store"
//const db = couch.db.create("cert-store", (err, data) => {
//console.log(data.toString());
//console.log(err.toString());
//});

// set global database
const certstore = couch.db.use('cert-store');

async function getDatabaseList() {
  const dblist = await couch.db.list();
  console.log(dblist.toString());
}
getDatabaseList();

app.post('/form', function(req, res){
  // inform user
  res.send("recieved your request!");
  // log request
  console.log("\nRecieved a request to store a new user.")
  // generate uuid, use it to create a new user and log execution
  getUuid()
      .then(uuid => insertUser(uuid, req.body.name, req.body.surname, req.body.password, req.body.email, req.body.workfield))
      .then(data => { console.log("Operation 'saving user in database' was executed. Response: "); console.log(data);});
});

async function insertUser(uuid, name, surname, password, email, workfield){
  try {
   return await certstore.insert({
     _id: uuid, "type": "user", "name": name, "surname": surname,
      "password": password, "email": email, "workfield": workfield
    });
  }
  catch(error){
    console.log("ERROR - while inserting a new User: " + error)
  }
  finally{
    console.log("A new user, with id: " + uuid + " and full name: '" + name + " " + surname + "' was inserted.");
  }
}

async function getUuid(){
  try {
      const uuidResult = await couch.uuids(1);
      const uuid = uuidResult['uuids'][0];
      return uuid;
  }
  catch(error){
    console.log("ERROR - in getUuid() method: " + error);
  }
  finally{
    console.log("A new uuid was generated.");
  }
}







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
})
