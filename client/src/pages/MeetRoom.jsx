import React, { useContext, useEffect, useState } from 'react';
import '../styles/MeetPage.css';
import { useParams } from 'react-router-dom';
import { SocketContext } from '../context/SocketContext';
import { config } from '../AgoraSetup';
import VideoPlayer from '../components/VideoPlayer';
import Controls from '../components/Controls';
import Participants from '../components/Participants';
import Chat from '../components/Chat';

const MeetRoom = () => {
  const { id } = useParams();
  const [roomName, setRoomName] = useState('');
  const { 
    socket, setInCall, client, users, setUsers, ready, tracks, 
    setStart, setParticipants, start 
  } = useContext(SocketContext);

  // ✅ Always string userId
  const storedId = localStorage.getItem("userId");
  const userId = storedId ? storedId : Date.now().toString();
  localStorage.setItem("userId", userId); 

  useEffect(() => {
    socket.emit('join-room', { userId, roomId: id });

    socket.on("user-joined", async () => {
      setInCall(true);
    });

    socket.emit('get-participants', { roomId: id });
    socket.on("participants-list", async ({ usernames, roomName }) => {
      setParticipants(usernames);
      setRoomName(roomName);
    });

    return () => {
      socket.off("user-joined");
      socket.off("participants-list");
    };
  }, [socket, id, userId, setInCall, setParticipants]);

  useEffect(() => {
    const init = async (channelName) => {
      if (!channelName) {
        console.error("Channel name is undefined");
        return;
      }

      try {
        client.on("user-published", async (user, mediaType) => {
          await client.subscribe(user, mediaType);
          if (mediaType === "video") setUsers(prev => [...prev, user]);
          if (mediaType === "audio" && user.audioTrack) user.audioTrack.play();
        });

        client.on("user-unpublished", (user, mediaType) => {
          if (mediaType === "audio" && user.audioTrack) user.audioTrack.stop();
          if (mediaType === "video") setUsers(prev => prev.filter(u => u.uid !== user.uid));
        });

        client.on("user-left", (user) => {
          socket.emit("user-left-room", { userId: user.uid, roomId: id });
          setUsers(prev => prev.filter(u => u.uid !== user.uid));
        });

        await client.join(config.appId, channelName, config.token || null, userId);

        // ✅ Only publish existing tracks
        if (tracks) {
          const toPublish = [];
          if (tracks[0]) toPublish.push(tracks[0]); // mic
          if (tracks[1]) toPublish.push(tracks[1]); // camera
          if (toPublish.length > 0) {
            await client.publish(toPublish);
          }
        }

        setStart(true);

      } catch (err) {
        console.error("Agora init error:", err);
      }
    };

    if (ready && tracks) {
      init(id);
    }
  }, [id, client, ready, tracks, socket, userId, setUsers, setStart]);

  return (
    <div className='meetPage'>
      <div className="meetPage-header">
        <h3>Meet: <span>{roomName}</span></h3>
        <p>Meet Id: <span id='meet-id-copy'>{id}</span></p>
      </div>

      <Participants />
      <Chat roomId={id} userId={userId} />

      <div className="meetPage-videoPlayer-container">
        {start && tracks ? <VideoPlayer tracks={tracks} users={users} /> : ''}
      </div>

      <div className="meetPage-controls-part">
        {ready && tracks && <Controls tracks={tracks} client={client} />}
      </div>
    </div>
  )
}

export default MeetRoom;
