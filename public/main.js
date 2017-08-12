const socket          = io()
  ,   localVideo      = document.getElementById('local')
  ,   remoteVideo     = document.getElementById('remote')
  ,   localIdElement  = document.getElementById('local-id')
  ,   remoteIdInput   = document.getElementById('remote-id')
  ,   callButton      = document.getElementById('call')
  ,   hangUpButton    = document.getElementById('hang-up')
  ,   receivedMsg     = document.getElementById('received')
  ,   msgTextarea     = document.getElementById('msg')
  ,   sendButton      = document.getElementById('send')
  ,   connectedMsg    = '连接成功 双方可以进行通话了'

let peerConnection
  = callerId
  = calledId
  = dataChannel
  = localStream
  = null


navigator.mediaDevices.getUserMedia({video: true, audio: false})
.then(stream => {
  localVideo.srcObject = stream
  localStream = stream
  setupPeerConnection(stream)
})
.catch(e => alert('木有找到摄像头君 or 浏览器君不资瓷WebRTC'))

// Button Event
callButton.onclick = e => {
  calledId = remoteIdInput.value.toLowerCase()
  if (calledId === socket.id.toLowerCase()) {
    alert('呼叫自己 听到请回答')
    return
  }
  socket.emit('call', calledId)

  dataChannel = peerConnection.createDataChannel('chat', {ordered: true})
  dataChannel.onopen = e => {
    appendContent(connectedMsg)
    msgTextarea.disabled
      = sendButton.disabled
      = false
  }
  dataChannel.onmessage = e => {
    appendContent(e.data)
  }
}

hangUpButton.onclick = e => {
  socket.emit('leave', callerId || calledId )
  onLeave()
}

sendButton.onclick = e => {
  if (dataChannel) {
    appendContent(msgTextarea.value)
    dataChannel.send(msgTextarea.value)
    msgTextarea.value = ''
  }
}


socket.on('connect', () => {
  localIdElement.textContent = socket.id.toLowerCase()
})

socket.on('findPeerResult', result => {
  if (!result) {
    alert('没有这个人')
    return
  }
  peerConnection.createOffer().then(offer => {
    peerConnection.setLocalDescription(offer)
    socket.emit('offer', offer, calledId)
    console.log('发送offer...')
  })
})

socket.on('receiveOffer', (offer, id) => {
  console.log('收到offer');
  callerId = id
  peerConnection.setRemoteDescription(new RTCSessionDescription(offer))

  peerConnection.createAnswer().then(answer => {
    peerConnection.setLocalDescription(answer)
    socket.emit('answer', answer, callerId)
    console.log('给对方回应...');
  })
})

// 收到answer 与对方连接成功
socket.on('receiveAnswer', answer => {
  peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
  console.log('收到回应');
})

socket.on('receiveCandidate', candidate => {
  peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
  console.log('添加候选地址');
})

socket.on('leave', onLeave)

function onLeave() {
  peerConnection.close()
  callerId
    = calledId
    = remoteVideo.srcObject
    = null
  setupPeerConnection(localStream)
  hangUpButton.disabled = true
  callButton.disabled = remoteIdInput.disabled = false
}

function setupPeerConnection(stream) {
  peerConnection = new RTCPeerConnection()

  // ICE
  peerConnection.onicecandidate = e => {
    if (e.candidate) {
      socket.emit('candidate', e.candidate, callerId || calledId)
    }
  }

  // 设置对方的媒体流
  peerConnection.ontrack = e => {
    remoteVideo.srcObject = e.streams[0]
    remoteIdInput.disabled = callButton.disabled = true
    hangUpButton.disabled = false
  }

  peerConnection.ondatachannel = e => {
    appendContent(connectedMsg)
    dataChannel = e.channel
    dataChannel.onmessage = e => {
      appendContent(e.data)
    }
    msgTextarea.disabled
      = sendButton.disabled
      = false
  }

  stream.getTracks().forEach(track => {
    peerConnection.addTrack(track, stream)
  })
}

function appendContent(content) {
  const pElement = document.createElement('p')
  pElement.textContent = content
  receivedMsg.appendChild(pElement)
}
