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

app.get('/delete', function(req, res) {
  // TODO
});

// +++++++++++++++ REQUESTS FROM HTML SUBMITS ++++++++++++++++++++++++++++++++++
// request to create a profile (and update, but update does not work yet)
// input: profile data for new profile
app.post('/form', function(req, res){
  // inform user
  // res.send("received your request!");
  // log request
  console.log("\nReceived a request to store a new user.")

  // user is new
  // generate uuid, use it to create a new user and log execution
  if(globalUserId==null) {
    getUuid()
        .then(uuid => insertUser(uuid, req.body.name, req.body.surname, req.body.password, req.body.email, req.body.workfield))
        .then(data => {
          console.log("Stored new user in database. Response: ");
          console.log(data);
          res.sendFile(path.join(__dirname, './public/login.html'));
        });
  }
  // user is already logged in
  // update profile information
  else{
    // Info: es würde zu schweren Fehlern kommen, wenn User nicht alle Felder ausfüllen: Informationen würden in Parameter Reihenfolge zugewiesen werden
    // z.B. kein surname --> password in der db in surname eingetragen
    insertUser(globalUserId, req.body.name, req.body.surname, req.body.password, req.body.email, req.body.workfield).then(data => {
      console.log("Updated user in database. Response: ");
      console.log(data);
      res.sendFile(path.join(__dirname, './public/login.html'));
    });
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


// ++++++++++++++++++++++++ DATABASE OPERATIONS +++++++++++++++++++++++++++++++
// use nano package for couchdb access
const couch = require('nano')('http://' + username + ":" + password + "@" + host + ":" + port)
// set global database
const certstore = couch.db.use('cert-store');

// print database access information
console.log("userhello: " + username+ password + host + port);
// check connection ;)
async function getDatabaseList() {
  const dblist = await couch.db.list();
  console.log(dblist.toString());
}
getDatabaseList();

// set global user id to null (no user logged in yet)
let globalUserId = null;

// ++++++++++++++++++++++++++++ Login +++++++++++++++++++++++++++++
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
  globalUserId = receivedID;
  console.log("Global user id was set to: " + globalUserId);
}

// ++++++++++++++++++++++++++++ CRUD +++++++++++++++++++++++++++++++++++++++++++++++++

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

// https://stackoverflow.com/questions/57477157/couchdb-update-handler-doc-update-insert-using-nano
// https://docs.couchdb.org/en/1.6.1/couchapp/ddocs.html#updatefun
// https://stackoverflow.com/questions/32237406/couchdb-update-document
async function updateUser(id, rev, name, surname, password, email, workfield){
  try {
    return await certstore.insert({
      _id: id, _rev: rev, "type": "user", "name": name, "surname": surname,
      "password": password, "email": email, "workfield": workfield
    });
  }
  catch(error){
    console.log("ERROR - happened during updateUser method: " + error);
  }
  finally {
    console.log("User with id '" + globalUserId + "' was updated successfully")
  }

}

// Test für update von max mustermann
/*getRev('cdf60a921351af78780a7c4efc003094').then(rev => {
  updateUser('cdf60a921351af78780a7c4efc003094', rev, "Timo","Mustermann", "example", "max.mustermann@gmx.de", "IT").then(response => console.log(response));
})*/

async function deleteUser(id){
  const response = await certstore.destroy(id)
}



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
  // Achtung, das wird mit "" drum rum zurück gegeben! die müssen noch abgeschnitten werden
  // alternativ kann man auch das komplette doc mit der rev abfragen das ist dann doc._rev einfach
  console.log(doc.etag);
  return doc._rev;
}

async function getCertificatesForAUser(id) {
  const doc = await certstore.get(id)
  const certs = doc.certificates;
  return certs;
}

/*function readCert(cert){
  const certId = cert.id;
  const certName = cert.name;
  const certSkillfield = cert.skillfield;
  const certLevel = cert.level;
  const certIssued = cert.issued;
  const certExceeds = cert.exceeds;
  const certCompany = cert.company;
  const certRegristrationDate = cert.registration_date;
  const certContact = cert.contact;
  console.log(certId, certSkillfield, certName, certIssued, certExceeds, certLevel, certCompany, certRegristrationDate, certContact);
}*/


