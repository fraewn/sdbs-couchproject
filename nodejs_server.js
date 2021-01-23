var express = require('express');
var bodyParser = require('body-parser');
var multer = require('multer');
var upload = multer();
var app = express();
const https = require('http')
const request = require("request");
const path = require('path')
const fs = require('fs');
const ini = require('ini');
const { hostname } = require('os');
const querystring = require('querystring');
const PDFDocument = require('pdfkit');


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

const document_by_id_request = 'http://' + username + ":" + password + "@"+ host + ":" + port +"/" + database + "/";

//start app 
const local_port = 3122;

app.listen(local_port, () =>
  console.log(`App is listening on port ${local_port}.`)
);

// +++++++++++++++++ Utility +++++++++++++++++++++++++++++++++++++
function doRequest(targeturl, http_method = "GET", return_json = false, request_sends_json = false) {

  console.log("doRequest: " + targeturl + " " + http_method + " " + return_json + " " + request_sends_json);
  let options = {};
  if (request_sends_json){
    options = {
      url: targeturl,
      method: http_method,
      json: true
    }
  }else{
    options = {
      url: targeturl,
      method: http_method,
    }
  }

  return new Promise(function (resolve, reject) {
    request(options, function (error, res, body) {
      if (!error && res.statusCode == 200) {
        if (return_json)
        {
          resolve(JSON.parse(body));
        }else {
          resolve(body);
        }
      } else {
        console.log("rejected error: " + error);
        reject(error);
      }
    });
  }).catch(console.log);
}

function update_doc(host,port, username, password, pathname, doc){
  const data = JSON.stringify(doc);
  const options = {
    port: port,
    hostname: host,
    path: pathname,
    method: 'PUT',
    auth : username + ":" + password,
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  }
  
  const req = https.request(options, res => {
    console.log(`statusCode: ${res.statusCode}`)
  
    res.on('data', d => {
      process.stdout.write(d)
    })
  })
  
  req.on('error', error => {
    console.error(error)
  })
  
  req.write(data)
  req.end()
  console.log("request ended");
}

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


app.get('/staff', function(req, res) {
  console.log("Looking up all different certs");
  let certificates_request = document_by_id_request+ "certificate_ids";
  let certificates = []

  doRequest(certificates_request, "GET", false).then(certs => { console.log("certs: " + certs)
    certs_json = JSON.parse(certs);
    let promises = [];
    for (let i = 0; i < certs_json["cert_ids"].length; i++){
      promises.push(doRequest(document_by_id_request + certs_json["cert_ids"][i], "GET",  true));
    }
    Promise.all(promises).then((returned_certs) => {   
      //console.log("json " + JSON.stringify(returned_certs, null, 4))
      res.render("staff.ejs", {returned_certs, returned_certs}) 
    });
  });

});

app.post('/staff', function(req, res) {
  console.log("POST request to /staff)");
  let contact_to_change_id = req.body.certificate_id;
  let new_mail = req.body.email;
  console.log("Changing certificate: " + contact_to_change_id);
  console.log("New contact mail: " + new_mail);


  //get_doc(host, port, username, password, "/" + database + "/" + contact_to_change_id ;)
  //update cert (at central point)
  doRequest(document_by_id_request + contact_to_change_id, "GET", true).then(doc_json =>{
    doc_json["contact"] = new_mail;
    console.log(doc_json);
    let update_request = 'http://' + username + ":" + password + "@"+ host + ":" + port +"/" + database + "/";
    let hostname = "www." + username + ":" + password + "@"+ host;
    let pathname = "/" + database + "/" + contact_to_change_id;
    let update_contact_request = update_request + contact_to_change_id + " -d '" +  JSON.stringify(doc_json) + "'";
    //console.log("strigified JSON" + JSON.stringify(doc_json));
    console.log("update_contact_request: " + update_contact_request);

    update_doc(host, port,  username, password, pathname, doc_json);

    console.log("redirecting to staff");
    res.redirect("/staff");
    //doRequest(update_contact_request, "PUT", true, true).then((updated_doc) => {
   //   console.log("Updated doc: " + updated_doc);
    //});
  });



  //update cert in all users
  //use mango..

});

app.post('/downloadcert', function(req, res) {
  console.log("Got a download request for: " + req.body.certificate);

  getCertificatesForAUser(globalUserId).then(certs => {
    //console.log(certs);
    for (let i = 0; i < certs.length; i++){
        let cert = certs[i];
        if (certs[i].id == req.body.certificate){

          let pdfDoc = new PDFDocument;
         
          let stream =fs.createWriteStream(req.body.certificate + ".pdf");  
          pdfDoc.fontSize(40);
          pdfDoc.text(cert.name,{align: "center"});
          pdfDoc.moveDown();
          pdfDoc.fontSize(20);
          pdfDoc.text(cert.skillfield,{align: "center"});
          pdfDoc.moveDown();
          pdfDoc.moveDown();
          pdfDoc.fontSize(12);
          pdfDoc.text(cert.description,{align: "left"});
          pdfDoc.moveDown();
          pdfDoc.fontSize(8);
          pdfDoc.text("Issued: " + cert.issued,{align: "left"});
          pdfDoc.moveDown();
          pdfDoc.text("Exceeds: " + cert.exceeds,{align: "left"});
          pdfDoc.moveDown();
          pdfDoc.image("certified.png", 60, 400, {align: "center", width: 500});
          stream.on('finish', function() {
            res.download(req.body.certificate + ".pdf");
          });
          pdfDoc.pipe(stream);
          pdfDoc.end();
          return;
        }
    }
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
  if (req.body.view != "on"){
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
  }else{ //use view login
    view_request = 'http://' + username + ":" + password + "@"+ host + ":" + port +"/" + database + '/_design/user/_view/login?key="' + req.body.email + '"&value="' + req.body.password +'"';
    console.log("view login request: " + view_request);
    let query_start = new Date();

    request.get(view_request, (error, response, body) => {
      let json = JSON.parse(body);
      console.log("view request is: " +  JSON.stringify(json));
      let query_end = new Date() - query_start;
      console.log("View Login too: " + query_end + "ms");
      for (var i = 0; i < json["rows"].length; i++){
        if(json["rows"][i]["value"] == req.body.password){
          success = true;
        }
      }
      if (success){    //did we find the user + password?
        setGlobalUserId(json["rows"][0]["id"]);
        res.redirect("/certs");
      }else {
        res.sendFile(path.join(__dirname, './public/login.html'));
      }
    });
   }
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
    var query_start = new Date();
    const docResult = await certstore.find(query);
    var query_end = new Date() - query_start;
    console.log("Mango Login too: " + query_end + "ms");

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


