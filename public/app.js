// const socket = io(`http://localhost:3000/`);
const socket = io(`https://dev.haze.monster:3001/`);

// 이벤트명 상수들
const MATCHING_EVENTS = {
  CONNECT: "connect",
  DISCONNECT: "disconnect",
  INTRODUCE_EACH_USER: "introduce_each_user",
  MATCH_RESULT: "match_result",
  EXCEPTION: "exception",
  RESTART_MATCHING_REQUEST: "restart_matching_request",
  NOT_IDLE: "not_idle",
  NOT_WAITING: "not_waiting",
  PARTNER_DISCONNECTED: "partner_disconnected",
  START_MATCHING: "start_matching",
  CANCEL_MATCHING: "cancel_matching",
  RESPOND_TO_INTRODUCE: "respond_to_introduce",
};

const WEBRTC_EVENTS = {
  START_WEBRTC_SIGNALING: "start_webrtc_signaling",
  OFFER: "offer",
  ANSWER: "answer",
  ICE: "ice",
};

const WEBCHAT_EVENTS = {
  LEAVE_WEBCHAT: "leave_webchat",
  WEBCHAT_ENDED: "webchat_ended",
  REQUEST_FACE_RECOGNITION: "request_face_recognition",
  RESPOND_FACE_RECOGNITION: "respond_face_recognition",
  PERFORM_FACE_RECOGNITION: "perform_face_recognition",
  FACE_RECOGNITION_REQUEST_DENIED: "face_recognition_request_denied",
  ALREADY_REQUESTED: "already_requested",
  RESPOND_IS_TOO_LATE: "respond_is_too_late",
  REPORT_USER: "report_user",
  WEBCHAT_TIMEOUT: "webchat_timeout",
};

// STUN 서버 목록
const stunServers = [
  "stun:stun.l.google.com:19302",
  "stun:stun1.l.google.com:19302",
  "stun:stun2.l.google.com:19302",
  "stun:stun3.l.google.com:19302",
  "stun:stun4.l.google.com:19302",
];

/**
 * DOM 요소 가져오기
 */
// 소개매칭 이전
const matchDiv = document.getElementById("match");
const matchStartButton = document.getElementById("startMatching");
const matchCancelButton = document.getElementById("cancelMatching");
const matchInput = matchDiv.querySelector("input");

// 소개 매칭 성사 이후
const partnerUserDataH3 = matchDiv.querySelector("h3");
const matchedDiv = document.getElementById("matched");
const acceptButton = document.getElementById("acceptButton");
const declineButton = document.getElementById("declineButton");

// 매칭 성사
const call = document.getElementById("call");
const myFace = document.getElementById("myFace");
let partnerFace = document.getElementById("peerFace");
const muteButton = document.getElementById("mute");
const cameraButton = document.getElementById("camera");
const camerasSelect = document.getElementById("cameras");

//화상채팅
const leaveButton = document.getElementById("leave");
const timeOutButton = document.getElementById("timeOut");
const faceRecognitionButton = document.getElementById("faceRecognition");
const faceDiv = document.getElementById("face");
const faceAcceptButton = document.getElementById("faceAcceptButton");
const faceDeclineButton = document.getElementById("faceDeclineButton");

//신고
const reportButton = document.getElementById("report");


/**
 * 상태 변수 선언
 */
let partnerUserId; // 파트너의 userId
let userId; // 실제 유저의 id

let room; // room 이름
let myPeerConnection; // RTCPeerConnection 객체
// let myDataChannel; // DataChannel
let myStream; // 내 영상 stream
let muted = false; // 내 stream mute 상태
let cameraOff = false; // 내 stream 카메라 상태

let receivedTime;

// 소개매칭 필터
const filter = {
    gender: 'MALE',
    location: '경기',
    minAge: 20,
    maxAge: 25,
  }

// 초기 실행 함수
function init() {
  initSocketListeners();
  initHtmlElementListeners();
}

function initSocketListeners() {
  // 매칭 이벤트
  socket.on(MATCHING_EVENTS.CONNECT, handleConnect);
  socket.on(MATCHING_EVENTS.DISCONNECT, handleDisconnect);
  socket.on(MATCHING_EVENTS.INTRODUCE_EACH_USER, handleIntroduceEachUser);
  socket.on(MATCHING_EVENTS.MATCH_RESULT, handleMatchResult);
  socket.on(MATCHING_EVENTS.EXCEPTION, handleException);
  socket.on(
    MATCHING_EVENTS.RESTART_MATCHING_REQUEST,
    handleRestartMatchingRequest
  );
  socket.on(MATCHING_EVENTS.NOT_IDLE, handleNotIdle);
  socket.on(MATCHING_EVENTS.NOT_WAITING, handleNotWaiting);
  socket.on(MATCHING_EVENTS.PARTNER_DISCONNECTED, handlePartnerDisconnected);
  socket.on(WEBCHAT_EVENTS.WEBCHAT_ENDED, handleWebchatEnded);

  // 화상채팅
  socket.on(
    WEBCHAT_EVENTS.REQUEST_FACE_RECOGNITION,
    handleRequestFaceRecognition
  );
  socket.on(
    WEBCHAT_EVENTS.FACE_RECOGNITION_REQUEST_DENIED,
    handleFaceRecognitionRequestDenied
  );
  socket.on(
    WEBCHAT_EVENTS.PERFORM_FACE_RECOGNITION,
    handlePerformFaceRecognition
  );
  socket.on(WEBCHAT_EVENTS.ALREADY_REQUESTED, handleAlreadyRequested);
  socket.on(WEBCHAT_EVENTS.RESPOND_IS_TOO_LATE, handleRespondIsTooLate);

  // webrtc 이벤트
  socket.on(WEBRTC_EVENTS.START_WEBRTC_SIGNALING, handleStartWebrtcSignaling);
  socket.on(WEBRTC_EVENTS.OFFER, handleOffer);
  socket.on(WEBRTC_EVENTS.ANSWER, handleAnswer);
  socket.on(WEBRTC_EVENTS.ICE, handleIceFromServer);
}

function initHtmlElementListeners() {
  // 매칭 시작, 취소 버튼
  matchStartButton.addEventListener("click", onStartMatching);
  matchCancelButton.addEventListener("click", onCancelMatching);

  // 매칭 수락, 거절 버튼
  acceptButton.addEventListener("click", onAccept);
  declineButton.addEventListener("click", onDecline);

  // 화상채팅 음소거, 카메라 on/off, 카메라 변경 버튼
  muteButton.addEventListener("click", handleMuteClick);
  cameraButton.addEventListener("click", handleCameraClick);
  camerasSelect.addEventListener("input", handleCameraChange);

  // 화상채팅 종료 버튼
  leaveButton.addEventListener("click", handleLeaveClick);

  // 타임아웃 발생 버튼
  timeOutButton.addEventListener("click", handleTimeOutClick);

  // 얼굴공개 요청 버튼
  faceRecognitionButton.addEventListener("click", handleFaceRecognitionClick);

  // 얼굴공개 수락/거절버튼
  faceAcceptButton.addEventListener("click", handleFaceAcceptButtonClick);
  faceDeclineButton.addEventListener("click", handleFaceDeclineButtonClick);

  // 신고 버튼
  reportButton.addEventListener("click", handleReportButtonClick);
}

/**
 * 매칭
*/
call.hidden = true;
matchedDiv.hidden = true;
faceDiv.hidden = true;

// 소켓 연결 이벤트 핸들러
function handleConnect() {
  console.log("소켓연결됨. \nsocketId =>", socket.id);
}

// 소켓 연결 해제 이벤트 핸들러
function handleDisconnect() {
  console.log("disconnected");
}

// 소개매칭 완료 이벤트 핸들러
function handleIntroduceEachUser(partnerUserInfo) {
  console.log("소개매칭 완료");

  matchedDiv.hidden = false;
  partnerUserDataH3.innerHTML = ""; // 이전 내역 초기화

  partnerUserId = partnerUserInfo.id; // 상대방의 userId

  displayPartnerInfo(partnerUserInfo); // 소개매칭 상대방 정보 표시
};

// 소개매칭 상대방 정보 표시 함수
function displayPartnerInfo(partnerUserInfo) {
  for (const key in partnerUserInfo) {
    if (partnerUserInfo.hasOwnProperty(key)) {
      const p = document.createElement("p");

      p.textContent = `${key}: ${partnerUserInfo[key]}`;

      partnerUserDataH3.appendChild(p);
    }
  }
}

// 매칭 결과 이벤트 핸들러
async function handleMatchResult({result, initiator}) {
  if (result) {
    // 매칭이 성사된 경우의 처리
    console.log("매칭이 성사되었습니다.");

    call.hidden = false;

    await getMedia();

    console.log("getMedia 호출 완료");

    console.log(initiator);

    if (initiator) {
      socket.emit(WEBRTC_EVENTS.START_WEBRTC_SIGNALING);
    }
  } else {
    // 매칭이 성사되지 않은 경우의 처리
    console.log("매칭이 성사되지 않았습니다.");
    matchedDiv.hidden = true;

    partnerUserDataH3.innerHTML = "";
  }
};

// 서버 예외 이벤트 핸들러
function handleException(data) {
  console.error("서버에서 예외 발생:", data);

  // 클라이언트의 예외를 처리하는 로직
}

// 소개매칭 재요청 이벤트 핸들러
function handleRestartMatchingRequest() {
  console.log("다시 매칭을 시도합니다.");

  socket.emit(MATCHING_EVENTS.START_MATCHING, {
    userId, filter
  });
}

// 유저의 상태가 idle이 아님을 알림 이벤트 핸들러
function handleNotIdle() {
  console.log("idle 상태가 아닙니다.");
}

// 유저의 상태가 waiting이 아님을 알림 이벤트 핸들러
function handleNotWaiting() {
  console.log("waiting 상태가 아닙니다.");
}

// 상대가 연결 해제됨을 알림 이벤트 핸들러
function handlePartnerDisconnected() {
  console.log("상대방이 종료했습니다. 다시 매칭을 시도합니다.");

  matchedDiv.hidden = true; // 이전 내역 초기화
  partnerUserDataH3.innerHTML = ""; // 이전 내역 초기화

  call.hidden = true; // 화상채팅도중이면 사라지도록 초기화

  socket.emit(MATCHING_EVENTS.START_MATCHING, { userId, filter }); // 소개매칭 재요청
}

// 화상채팅이 종료됐음을 알림 이벤트 핸들러
function handleWebchatEnded() {
  call.hidden = true; // 화상채팅 안보이게
  matchedDiv.hidden = true; // 상대방 정보 안보이게

  myFace.srcObject = null; // 내 얼굴 스트림 초기화
  partnerFace.srcObject = null; // 상대방얼굴 스트림 초기화

  myPeerConnection = null; // PeerConnection 초기화
}

// 화상채팅 도중 얼굴공개 요청이 왔을 때 이벤트 핸들러
function handleRequestFaceRecognition() {
  face.hidden = false;

  receivedTime = new Date();
}

// 얼굴공개 요청이 거부됐을 때
function handleFaceRecognitionRequestDenied() {
  console.log("얼굴 공개 거부 됨");
}

// 얼굴공개 요청이 수락됐을 때
function handlePerformFaceRecognition() {
  console.log("얼굴 공개 수락 됨");
}

// 이미 얼굴공개가 요청됐을 때
function handleAlreadyRequested() {
  console.log("이미 얼굴공개 요청된 상태입니다");
}

// 얼굴공개 요청에 대한 응답이 늦었을 때
function handleRespondIsTooLate() {
  console.log("얼굴공개요청에 대한 응답이 늦었습니다");
}

// 화상채팅도중 상대 유저를 신고할 때
function handleReportUser() {
  console.log("얼굴공개요청에 대한 응답이 늦었습니다");
}

/**
 * HTMLElment
 */

function onStartMatching(e) {
  console.log("매칭 시작 버튼 클릭");

  userId = matchInput.value;
  
  socket.removeEventListener(MATCHING_EVENTS.START_MATCHING, onStartMatching);
  socket.emit(MATCHING_EVENTS.START_MATCHING, { userId, filter });
}

function onCancelMatching(e) {
  console.log("매칭 취소 버튼 클릭");

  userId = matchInput.value;

  socket.removeEventListener(MATCHING_EVENTS.CANCEL_MATCHING, onCancelMatching);
  socket.emit(MATCHING_EVENTS.CANCEL_MATCHING, { userId });
}

function onAccept(e) {
  socket.removeEventListener(MATCHING_EVENTS.RESPOND_TO_INTRODUCE);
  
  socket.emit(MATCHING_EVENTS.RESPOND_TO_INTRODUCE, {
    userId,
    response: "accept",
  });
}

function onDecline(e) {
  socket.removeEventListener(MATCHING_EVENTS.RESPOND_TO_INTRODUCE);
  
  socket.emit(MATCHING_EVENTS.RESPOND_TO_INTRODUCE, {
    userId,
    response: "decline",
  });
}


/**
 * WebRTC
 */

/**
 * 서버에서 소개매칭이 성사되면 실행되는 코드
 * 미디어 스트림 얻는 코드
 **/
async function getMedia(deviceId) {
  const initialConstraints = {
    audio: true,
    video: {
      facingMode: "user",
    },
  };

  const cameraContraints = {
    audio: true,
    video: {
      deviceId: {
        exact: deviceId,
      },
    },
  };

  try {
    myStream = await navigator.mediaDevices.getUserMedia(
      deviceId ? cameraContraints : initialConstraints
    );

    myFace.srcObject = myStream;

    if (!deviceId) await getCameras();
  } catch (error) {
    console.log("user 미디어 가져오기 실패");

    console.log(error);
  }
}

async function getCameras() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter((e) => e.kind === "videoinput");

    const currentCamera = myStream.getVideoTracks()[0];

    cameras.forEach((camera) => {
      const option = document.createElement("option");
      option.value = camera.deviceId;
      option.innerText = camera.label;

      if (currentCamera.label === camera.label) {
        option.selected = true;
      }

      camerasSelect.appendChild(option);
    });
  } catch (error) {
    console.log(error);
  }
}

//소개매칭 phase에서 start_webrtc_signaling이 발생됐을 때 listen하는 이벤트 핸들러
async function handleStartWebrtcSignaling({ roomName, stunServers }) {
  console.log("start_webrtc_signaling 이벤트 on");

  await makeConnection(); // 유저A 의 RTCPeerConnection 생성

  const offer = await myPeerConnection.createOffer(); // offer 생성

  console.log("offer 생성 완료");

  myPeerConnection.setLocalDescription(offer); // SDP Offer 저장

  // offer를 유저 B에게 전송하기 위한 이벤트 발생
  socket.emit(WEBRTC_EVENTS.OFFER, { offer });

  console.log("offer 전송 완료");

  room = roomName; // room 이름 저장
};


// 서버에서 offer 이벤트가 발생했을 때 listen하는 이벤트 핸들러
async function handleOffer({ offer, roomName }) {
  await makeConnection(); // 유저 B의 RTCPeerConnection 생성

  console.log("offer 전달 받음");

  await myPeerConnection.setRemoteDescription(offer); // 상대의 SDP Offer 저장

  const answer = await myPeerConnection.createAnswer(); // SDP Answer 생성

  console.log("answer 생성완료");

  myPeerConnection.setLocalDescription(answer); // answer 저장

  // answer를 유저 A에게 전송하기 위한 이벤트 발생
  socket.emit(WEBRTC_EVENTS.ANSWER, { answer });

  console.log("answer 전송 완료");
};

// 서버에서 answer 이벤트가 발생했을 때 listen하는 이벤트 핸들러
function handleAnswer({ answer }) {
  console.log("answer 전달 받음");

  myPeerConnection.setRemoteDescription(answer); // 상대의 SDP answer 저장
};

// 서버에서온 ICE 이벤트 핸들러
function handleIceFromServer({ ice }) {
  console.log("candidate 전달 받음 ice:", ice);

  myPeerConnection.addIceCandidate(ice);
};


// RTC 연결 설정 함수
async function makeConnection() {
  //브라우저 구성
  myPeerConnection = new RTCPeerConnection({
    iceServers: [
      {
        urls: stunServers,
      }]
  });

  // IceCandidate event listner
  myPeerConnection.addEventListener("icecandidate", handleIceCandidate);
  myPeerConnection.addEventListener("addstream", handleAddStream);

  myStream.getTracks().forEach((track) => {
    myPeerConnection.addTrack(track, myStream);
  });

  console.log("connection구성 완료");
}

// 클라이언트가 알아서 수집한 icecandidate 이벤트 핸들러
function handleIceCandidate(data) {
  // 서로의 클라이언트가 수집한 candidate들을 서로 주고 받는다는 뜻
  socket.emit(WEBRTC_EVENTS.ICE, { ice: data.candidate });

  console.log("candidate 전송 완료");
}

// 스트림 추가 이벤트 핸들러
function handleAddStream(data) {
  partnerFace.srcObject = data.stream;
}

// 음소거/해제 버튼 클릭 이벤트 핸들러
function handleMuteClick() {
  myStream.getAudioTracks().forEach((track) => {
    track.enabled = !track.enabled;
  });

  if (!muted) {
    muteButton.innerText = "Unmute";
    muted = true;
    return;
  }

  muteButton.innerText = "Mute";
  muted = false;
}

// 카메라 끄기/켜기 버튼 클릭 이벤트 핸들러
function handleCameraClick() {
  myStream.getVideoTracks().forEach((track) => {
    track.enabled = !track.enabled;
  });

  if (cameraOff) {
    cameraButton.innerText = "Turn Camera Off";
    cameraOff = false;
    return;
  }

  cameraButton.innerText = "Turn Camera On";
  cameraOff = true;
}

// 카메라 변경 이벤트 핸들러
async function handleCameraChange() {
  await getMedia(camerasSelect.value);

  if (myPeerConnection) {
    const videoTrack = myStream.getVideoTracks()[0];
    const videoSender = myPeerConnection
      .getSenders()
      .find((sender) => sender.track.kind === "video");

    videoSender.replaceTrack(videoTrack);
  }
}

// 화상채팅 종료 버튼 클릭 이벤트 핸들러
function handleLeaveClick() {
  socket.emit(WEBCHAT_EVENTS.LEAVE_WEBCHAT, { userId });
}

// 타임아웃 발생 버튼 클릭 이벤트 핸들러
function handleTimeOutClick() {
  socket.emit(WEBCHAT_EVENTS.WEBCHAT_TIMEOUT, { userId });
}

// 얼굴공개요청 버튼 클릭 이벤트 핸들러
function handleFaceRecognitionClick() {
  socket.emit(WEBCHAT_EVENTS.REQUEST_FACE_RECOGNITION, { userId });
}

// 얼굴공개 수락 버튼 클릭 이벤트 핸들러
function handleFaceAcceptButtonClick() {
  face.hidden = true;

  console.log(receivedTime)

  socket.emit(WEBCHAT_EVENTS.RESPOND_FACE_RECOGNITION, {
    userId,
    response: "accept",
    receivedTime,
  });
}

// 얼굴공개 거절 버튼 클릭 이벤트 핸들러
function handleFaceDeclineButtonClick() {
  face.hidden = true;

  socket.emit(WEBCHAT_EVENTS.RESPOND_FACE_RECOGNITION, {
    userId,
    response: "decline",
    receivedTime,
  });
}

// 화상채팅도중 상대유저 신고 버튼 클릭 이벤트 핸들러
function handleReportButtonClick() {
  face.hidden = true;

  socket.emit(WEBCHAT_EVENTS.REPORT_USER, {
    userId,
  });
}


init();