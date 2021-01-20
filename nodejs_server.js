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
const database = config.remote.database;

//start app 
const local_port = 3122;

app.listen(local_port, () =>
  console.log(`App is listening on port ${local_port}.`)
);

// +++++++++++++++++ ROUTING +++++++++++++++++++++++++++++++++++++

app.get('/', function(req, res) {
  res.redirect("/login");
});

app.get('/login', function(req, res) {
  res.sendFile(path.join(__dirname, './public/login.html'))
});

app.get('/register', function(req, res) {
  res.sendFile(path.join(__dirname, './public/index.html'))
});

app.get('/certs', function(req, res) {
  console.log("This id was used to look up certs: " + globalUserId);
  getCertificatesForAUser(globalUserId).then(certs => {
    //console.log(certs);
    let certificates = certs
    res.render("certs.ejs", {certificates: certificates});
  });
});

app.get('/logout', function(req, res) {
  console.log("\nUser with id '" + globalUserId + "' was logged out.");
  globalUserId = null;
  res.redirect("/login");
});

// +++++++++++++++ REQUESTS FROM HTML SUBMITS ++++++++++++++++++++++++++++++++++
// request to create or update a profile, depending on if user is logged in or not
// input: profile data
app.post('/form', function(req, res){
  // user is new (= not logged in)
  if(globalUserId==null) {
    // log request to create profile
    console.log("\nReceived a request to store a new user.")
    // generate uuid, use it to create a new user and log execution
    getUuid()
        .then(uuid => insertUser(uuid, req.body.name, req.body.surname, req.body.password, req.body.email, req.body.workfield))
        .then(response => {
          console.log("Stored new user in database. Response: ");
          console.log(response);
          // navigate to login
          res.sendFile(path.join(__dirname, './public/login.html'));
        });
  }
  // user not new (= already logged in)
  else{
    // log request to change profile information
    console.log("\nReceived a request to update user information for user with id: '" + globalUserId + "'")
    getUser(globalUserId).then(doc => {
      console.log(doc);
      updateUser(doc, req.body.name,req.body.surname, req.body.password, req.body.email, req.body.workfield).then(response => {
        console.log("Updated user in database. Response: ");
        console.log(response);
        // after changing the profile information, navigate to cert page
        res.redirect("/certs");
      });
    })
  }
});

// request for a login
// input: email, password
app.post('/cert', function(req, res) {
  // log request
  console.log("\nReceived a login request for email: " + req.body.email)
  // execute login
  login(req.body.email, req.body.password).then(loginRes => {
    if (loginRes==true){
      // if logged in successfully, navigate to cert page
      res.redirect("/certs");
    }
    else{
      // if login failed, navigate back to login page
      res.sendFile(path.join(__dirname, './public/login.html'));
    }
  });
});

// request for delete profile
// input: none
app.post('/bye', function (req, res){
  getRev(globalUserId).then(rev => {
      deleteUser(globalUserId, rev).then(response => {
      console.log("User with id '" + globalUserId + "' was requested to be deleted from database. Response: ");
      console.log(response);
    });
  });
  res.send("Your profile, including all certificates, were deleted!");
})


// ++++++++++++++++++++++++ DATABASE OPERATIONS +++++++++++++++++++++++++++++++
// use nano package for couchdb access
const couch = require('nano')('http://' + username + ":" + password + "@" + host + ":" + port)
// set global database
const certstore = couch.db.use(database);

// log database access information
console.log("userhello: " + username + ":" + password + "@"+ host + ":"+ port + " " + database);
// check connection ;)
async function getDatabaseList() {
  const dblist = await couch.db.list();
  console.log(dblist.toString());
}
getDatabaseList();

// set global user id to null (no user logged in yet)
let globalUserId = null;

// ++++++++++++++++++++++++++++ Login +++++++++++++++++++++++++++++
// find all documents with this email and look if password matches one of them
async function login(email, password){
  let errorHappened = false;
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
  catch(errorMessage){
    errorHappened = true;
    console.log("ERROR - happened during login method: " + errorMessage);
  }
  finally{
    if(!errorHappened) {
      console.log("User with email '" + email + "' was logged in successfully\n");
    }
  }
}

function setGlobalUserId(receivedID){
  globalUserId = receivedID;
  console.log("Global user id was set to: '" + globalUserId + "' \n");
}

// ++++++++++++++++++++++++++++ CRUD +++++++++++++++++++++++++++++++++++++++++++++++++

// CREATE
async function insertUser(uuid, name, surname, password, email, workfield){
  let errorHappened = false;git
  try {
   return await certstore.insert({
     _id: uuid, "type": "user", "name": name, "surname": surname,
      "password": password, "email": email, "workfield": workfield
    });
  }
  catch(errorMessage){
    errorHappened = true;
    console.log("ERROR - while inserting a new User: " + errorMessage + "\n");
  }
  finally{
    if(!errorHappened) {
      console.log("A new user, with id: " + uuid + " and full name: '" + name + " " + surname + "' was inserted. \n");
    }
  }
}

// UPDATE
async function updateUser(doc, name, surname, password, email, workfield){
  let errorHappened = false;
  try {
    // store document in application logic
    let _id = doc['_id'];
    let _rev = doc['_rev'];
    let type = doc['type'];
    let certificates = doc['certificates'];
    let updatedName = doc['name'];
    let updatedSurname = doc['surname'];
    let updatedPassword = doc['password'];
    let updatedEmail = doc['email'];
    let updatedWorkfield = doc['workfield'];

    // if parameter is not empty, overwrite its value in application logic
    if(!(name === "")){
      updatedName = name;
    }
    if(!(surname === "")){
      updatedSurname = surname;
    }
    if(!(password === "")){
      updatedPassword = password;
    }
    if(!(email === "")){
      updatedEmail = email;
    }
    if(!(workfield === "")){
      updatedWorkfield = workfield;
    }

    // update document with values from application logic
    return await certstore.insert({_id: _id, _rev: _rev, "type": type, "name": updatedName, "surname": updatedSurname,
      "password": updatedPassword, "email": updatedEmail, "workfield": updatedWorkfield, "certificates": certificates});
  }
  catch(errorMessage){
    errorHappened = true;
    console.log("ERROR - happened during updateUser method: " + errorMessage + "\n");
  }
  finally {
    if(!errorHappened) {
      console.log("User with id '" + globalUserId + "' was updated successfully. \n")
    }
  }
}

// DELETE
async function deleteUser(id, rev){
  let errorHappened = false;
  try {
    return await certstore.destroy(id, rev);
  }
  catch(errorMessage){
    errorHappened = true;
    console.log("ERROR - happened during deleteUser method: " + errorMessage + "\n");
  }
  finally{
    if(!errorHappened) {
      console.log("User with id '" + globalUserId + "' was deleted from database. \n")
    }
  }

}

// READ
async function getUser(id){
  try {
  const doc = await certstore.get(id)
  console.log(doc);
  return doc;
  }
  catch(errorMessage){
    console.log("ERROR - happened during getUser(" + id +") method: " + errorMessage + "\n");
  }
}
async function getCertificatesForAUser(id) {
  const doc = await certstore.get(id)
  const certs = doc.certificates;
  return certs;
}

//getUser('028f56ee0f8581ccaf35581f81001ac3');


// ++++++++++++++++++ HELPER FUNCTIONS ++++++++++++++++++++++++++++++
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

async function getRev(id){
  const doc = await certstore.head(id);
  // rev is in doc.etag
  // doc.etag has "" around, they need to be cut
  const rev = doc.etag.slice(1,doc.etag.length-1);
  return rev;
}


