const socket          = io()
,     localVideo      = document.getElementById('local')
,     remoteVideo     = document.getElementById('remote')
,     localIdElement  = document.getElementById('local-id')
,     remoteIdInput   = document.getElementById('remote-id')
,     callButton      = document.getElementById('call')
,     hangUpButton    = document.getElementById('hang-up')

let peerConnection = callerId = calledId = null


function setupPeerConnection() {
  navigator.mediaDevices.getUserMedia({video: true, audio: true})
  .then(stream => {
    localVideo.srcObject = stream

    peerConnection = new RTCPeerConnection()
    // 接通
    peerConnection.ontrack = e => {
      remoteVideo.srcObject = e.streams[0]
      remoteIdInput.disabled = callButton.disabled = true
      hangUpButton.disabled = false
    }

    // ICE
    peerConnection.onicecandidate = e => {
      if (e.candidate) {
        socket.emit('candidate', e.candidate, callerId || calledId)
      }
    }

    stream.getTracks().forEach(track => {
      peerConnection.addTrack(track, stream)
    })
  })
  .catch(e => alert('木有找到摄像头君 or 浏览器君不资瓷WebRTC'))
}

callButton.onclick = e => {
  calledId = remoteIdInput.value.toLowerCase()
  if (calledId === socket.id.toLowerCase()) {
    alert('呼叫自己 听到请回答')
    return
  }
  socket.emit('call', calledId)
}

hangUpButton.onclick = e => {
  socket.emit('leave', callerId || calledId )
  onLeave()
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
    = peerConnection.onicecandidate
    = null
  setupPeerConnection()
  hangUpButton.disabled = true
  callButton.disabled = remoteIdInput.disabled = false
}

setupPeerConnection()
