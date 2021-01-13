import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const fs = require('fs');
const ini = require('ini');


const username = config.remote.user;
const password = config.remote.password;
const host = config.remote.host;
const port = config.remote.port;
console.log("userhello" + username+ password + host + port);

let test = document.getElementById("element");

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
    test.innerText = dblist.toString();
}

asyncCall();

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