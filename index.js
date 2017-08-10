const express = require('express')
,         app = express()
,      server = require('http').createServer(app)
,          io = require('socket.io')(server)

let users = {}


app.set('port', process.env.PORT || 5000)

app.use(express.static(__dirname + '/public'))

app.get('/', (req, res) => {
  res.sendFile('index.html')
})

io.on('connect', socket => {
  const socketId = socket.id.toLowerCase()
  let   peerId   = null

  users[socketId] = socket

  socket.on('call', calledId => {
    peerId = calledId
    socket.emit('findPeerResult', calledId in users)
  })

  socket.on('offer', (offer, calledId) => {
    users[calledId].emit('receiveOffer', offer, socketId)
  })

  socket.on('answer', (answer, callerId) => {
    peerId = callerId
    users[callerId].emit('receiveAnswer', answer)
  })

  socket.on('candidate', (candidate, peerId) => {
      users[peerId].emit('receiveCandidate', candidate)
  })

  socket.on('leave', peerId => {
    onLeave()
  })

  socket.on('disconnect', () => {
    delete users[socketId]
    onLeave()
  })

  function onLeave() {
    if (peerId in users) {
      users[peerId].emit('leave')
      peer = null
    }
  }
})

server.listen(app.get('port'), () => {
  console.log('Okay, running on port', app.get('port'))
})
