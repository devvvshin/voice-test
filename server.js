const Controller = require('./Controller');
const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

const controller = new Controller({dumpFilePath: './dump.json'});
controller.ready().then(() => {

  app.use(express.static('public'));

  app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
  })

  const sockets = [];
  io.on('connection', (socket) => {
    console.log('connected');

    sockets.push(socket);
    socket.emit('ready', null);

    socket.on('queryText', (text) => {
      controller.getPhotosByText(text).then((docs) => {

        const photos = docs.map(({meta, thumbnail_src, tags, date}) => {
          return {
            caption: meta.caption,
            thumbnail_src,
            tags,
            date
          }
        }).sort((r1, r2) => {r1.date.getTime() > r2.date.getTime() ? -1 : 1});

        console.log(photos.length);
        sockets.forEach((socket) => {
          if(socket && socket.emit)
            socket.emit('update', {photos, text});
        })
      })
    })
  });

  http.listen(3000, '0.0.0.0', () => {
    console.log('server')
  })



});
