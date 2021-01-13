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


const certstore = couch.db.use('cert-store');

async function asyncCall() {
  const dblist = await couch.db.list();
  console.log(dblist.toString());
}

asyncCall();


app.post('/form', function(req, res){
  res.send("recieved your request!");
  console.log(req.body);

  const insertResponse = certstore.insert({_id: "test1", "type": "user", "name": req.body.name, "surname": req.body.surname,
    "password": req.body.password, "email": req.body.email, "workfield": req.body.workfield}, (error, response) => {
  })

  console.log("Entry was saved in CouchDB.")

});



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
