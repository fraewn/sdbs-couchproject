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

app.get('/login', function(req, res) {
  res.sendFile(path.join(__dirname, './public/login.html'))
});

app.get('/register', function(req, res) {
  res.sendFile(path.join(__dirname, './public/index.html'))
});

// database operations
console.log("userhello" + username+ password + host + port);
let _id;

const couch = require('nano')('http://' + username + ":" + password + "@" + host + ":" + port)


// create database "cert-store"
//const db = couch.db.create("cert-store", (err, data) => {
//console.log(data.toString());
//console.log(err.toString());
//});

// set global database
const certstore = couch.db.use('cert-store');

// check connecetion
async function getDatabaseList() {
  const dblist = await couch.db.list();
  console.log(dblist.toString());
}
getDatabaseList();

// create profile request
// input: profile data for new profile
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

// show certificates request
// input profile id


// login
// input email, password
app.post('/cert', function(req, res) {
  // log request
  console.log("\nReceived a login request for email: " + req.body.email)
  // execute login
  login(req.body.email, req.body.password).then(loginRes => {
    if (loginRes==true){
      // if logged in successfully, navigate to cert page
      res.sendFile(path.join(__dirname, './public/index.html'));
    }
    else{
      // if login failed, navigate back to login page
      res.sendFile(path.join(__dirname, './public/login.html'));
    }
  });
});

// find documents where the email and password match
async function login(email, password){
  try {
    // define mango query to find a password and id for a given email address
    const query = {
      selector: {
        email: {"$eq": email}
      },
      fields: ["password", "_id"],
      limit: 2
    };

    // execute query
    const docResult = await certstore.find(query);
    // store results in variables
    const receivedPassword = docResult['docs'][0].password;
    const receivedId = docResult['docs'][0]._id;

    // set global user id
    setGlobalUserId(receivedId);

    // return if given password and received password for this email address are the same
    return (receivedPassword === password);
  }
  catch(error){
    console.log("ERROR - happened during login method: " + error)
  }
  finally{
    console.log("User with email '" + email + "'was logged in successfully");
  }
}

function setGlobalUserId(receivedID){
  this._id = receivedID;
  console.log("Global user id was set to: " + this._id);
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
