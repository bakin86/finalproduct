import { useRef, useState, useEffect } from "react";

const useWebRTC = (socket, channelId) => {
  const [inCall, setInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [callParticipants, setCallParticipants] = useState([]);

  const localStreamRef = useRef(null);
  const peersRef = useRef({});

  const createPeer = (toSocketId, stream) => {
    const peer = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });

    // Add local tracks to peer
    stream.getTracks().forEach((track) => peer.addTrack(track, stream));

    // Send ICE candidates to remote peer
    peer.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit("call_ice_candidate", {
          candidate: e.candidate,
          toSocketId,
        });
      }
    };

    // Play remote audio when received
    peer.ontrack = (e) => {
      const audio = new Audio();
      audio.srcObject = e.streams[0];
      audio.play().catch(console.error);
    };

    return peer;
  };

  const joinCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      setInCall(true);
      socket.emit("call_join", { channelId });
    } catch (err) {
      console.error("Mic access denied:", err);
      alert("Microphone access is required for calls.");
    }
  };

  const leaveCall = () => {
    // Stop all tracks
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;

    // Close all peer connections
    Object.values(peersRef.current).forEach((peer) => peer.close());
    peersRef.current = {};

    setInCall(false);
    setIsMuted(false);
    setCallParticipants([]);
    socket.emit("call_leave", { channelId });
  };

  const toggleMute = () => {
    if (!localStreamRef.current) return;
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  };

  useEffect(() => {
    if (!socket) return;

    // Someone joined the call — send them an offer
    const handleUserJoined = async ({ userId, username, socketId }) => {
      setCallParticipants((prev) => [...prev, { userId, username, socketId }]);

      if (!localStreamRef.current) return;

      const peer = createPeer(socketId, localStreamRef.current);
      peersRef.current[socketId] = peer;

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);

      socket.emit("call_offer", { offer, toSocketId: socketId });
    };

    // Received an offer — send back answer
    const handleOffer = async ({ offer, fromSocketId, username, userId }) => {
      setCallParticipants((prev) => {
        if (prev.find((p) => p.socketId === fromSocketId)) return prev;
        return [...prev, { userId, username, socketId: fromSocketId }];
      });

      if (!localStreamRef.current) return;

      const peer = createPeer(fromSocketId, localStreamRef.current);
      peersRef.current[fromSocketId] = peer;

      await peer.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);

      socket.emit("call_answer", { answer, toSocketId: fromSocketId });
    };

    // Received an answer
    const handleAnswer = async ({ answer, fromSocketId }) => {
      const peer = peersRef.current[fromSocketId];
      if (peer) {
        await peer.setRemoteDescription(new RTCSessionDescription(answer));
      }
    };

    // Received ICE candidate
    const handleIceCandidate = async ({ candidate, fromSocketId }) => {
      const peer = peersRef.current[fromSocketId];
      if (peer) {
        await peer.addIceCandidate(new RTCIceCandidate(candidate));
      }
    };

    // Someone left the call
    const handleUserLeft = ({ userId, username }) => {
      setCallParticipants((prev) => prev.filter((p) => p.userId !== userId));
      // Close their peer connection
      const entry = Object.entries(peersRef.current).find(
        ([_, peer]) => peer._userId === userId
      );
      if (entry) {
        entry[1].close();
        delete peersRef.current[entry[0]];
      }
    };

    socket.on("call_user_joined", handleUserJoined);
    socket.on("call_offer", handleOffer);
    socket.on("call_answer", handleAnswer);
    socket.on("call_ice_candidate", handleIceCandidate);
    socket.on("call_user_left", handleUserLeft);

    return () => {
      socket.off("call_user_joined", handleUserJoined);
      socket.off("call_offer", handleOffer);
      socket.off("call_answer", handleAnswer);
      socket.off("call_ice_candidate", handleIceCandidate);
      socket.off("call_user_left", handleUserLeft);
    };
  }, [socket, channelId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (inCall) leaveCall();
    };
  }, []);

  return {
    inCall,
    isMuted,
    callParticipants,
    joinCall,
    leaveCall,
    toggleMute,
  };
};

export default useWebRTC;