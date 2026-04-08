import React, { useContext, useState, useEffect } from 'react'
import '../styles/profileCard.css'
import EditIcon from '@mui/icons-material/Edit';
import { SocketContext } from "../context/SocketContext";


const ProfileCard = () => {
  const { socket } = useContext(SocketContext);

  const initialUsername = localStorage.getItem('userName') || '';
  const initialEmail = localStorage.getItem('userEmail') || '';
  const initialAvatar = localStorage.getItem('userAvatar') || 'https://cdn.pixabay.com/photo/2013/07/13/11/44/penguin-158551_1280.png';
  const userId = localStorage.getItem('userId');

  const [isUpdate, setIsUpdate] = useState(false);
  const [username, setUsername] = useState(initialUsername);
  const [email, setEmail] = useState(initialEmail);
  const [avatar, setAvatar] = useState(initialAvatar);

  const handleUpdate = async () => {
    await socket.emit("update-profile", { userId, username, email, avatar });
    localStorage.setItem('userName', username);
    localStorage.setItem('userEmail', email);
    localStorage.setItem('userAvatar', avatar);
    setIsUpdate(false);
  }

  useEffect(() => {
    socket.on("profile-updated", ({ username, email, avatar }) => {
      if (username) setUsername(username);
      if (email) setEmail(email);
      if (avatar) setAvatar(avatar);
    });
    return () => socket.off("profile-updated");
  }, [socket]);

  return (
    <div className='profile-card-body'>
      <button id="update-details-btn" onClick={() => setIsUpdate(!isUpdate)}>
        <EditIcon />
      </button>
      <div className="profile-data">
        <div className="profile-img">
          <img src={avatar} alt="Profile" />
        </div>

        {!isUpdate ? (
          <div className="profile-info">
            <p><strong>Username:</strong> <span>{username}</span></p>
            <p><strong>Email ID:</strong> <span>{email}</span></p>
          </div>
        ) : (
          <div className="update-data" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input type="text" placeholder='Username' value={username} onChange={(e) => setUsername(e.target.value)} />
            <input type="email" placeholder='Email' value={email} onChange={(e) => setEmail(e.target.value)} />
            <input type="text" placeholder='Avatar URL' value={avatar} onChange={(e) => setAvatar(e.target.value)} />
            <button id='update-btn' onClick={handleUpdate}>Save Changes</button>
          </div>
        )}
      </div>
    </div>
  )
}

export default ProfileCard