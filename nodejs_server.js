const express = require('express');
const http = require('http')
const cors = require('cors');
const path = require('path')

const app = express();

app.use(express.static(path.join(__dirname, 'public')))

//add other middleware
app.use(cors());

//start app 
const local_port = 3131;

app.listen(local_port, () =>
  console.log(`App is listening on port ${local_port}.`)
);

app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname, './public/index.html'))
})







