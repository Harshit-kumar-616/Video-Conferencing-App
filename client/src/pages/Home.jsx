import React, { useContext, useEffect, useState } from 'react';
import '../styles/Home.css';
import { AuthContext } from '../context/authContext';
import { SocketContext } from '../context/SocketContext';
import { useNavigate } from 'react-router-dom';

// Icons
import SpaceDashboardIcon from '@mui/icons-material/SpaceDashboard';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import MovieCreationIcon from '@mui/icons-material/MovieCreation';
import LinkIcon from '@mui/icons-material/Link';
import MarkEmailUnreadIcon from '@mui/icons-material/MarkEmailUnread';
import SmartDisplayIcon from '@mui/icons-material/SmartDisplay';

const Home = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [joinRoomError, setJoinRoomError] = useState('');
  
  // Schedule Form State
  const [schedRoomName, setSchedRoomName] = useState('');
  const [schedDate, setSchedDate] = useState('');
  const [schedTime, setSchedTime] = useState('');

  // Settings State
  const { logout } = useContext(AuthContext);
  const { socket, myMeets, setMyMeets, setNewMeetType } = useContext(SocketContext);
  
  const navigate = useNavigate();

  const handleLogIn = () => {
    navigate('/login');
  };

  const handleLogOut = (e) => {
    e.preventDefault();
    logout();
  };

  const userId = localStorage.getItem("userId") || '';
  const userName = localStorage.getItem("userName") || '';
  const userEmail = localStorage.getItem("userEmail") || ''; 

  const handleInstantMeet = () => {
    setNewMeetType('instant');
    socket.emit("create-room", { 
      userId, 
      roomName: `${userName}'s Instant Meeting`, 
      newMeetType: 'instant', 
      newMeetDate: 'none', 
      newMeetTime: 'none' 
    });
  };

  const handleScheduleMeet = (e) => {
    e.preventDefault();
    if (!schedRoomName || !schedDate || !schedTime) return;
    
    setNewMeetType('scheduled');
    socket.emit("create-room", {
      userId,
      roomName: schedRoomName,
      newMeetType: 'scheduled',
      newMeetDate: schedDate,
      newMeetTime: schedTime
    });

    setSchedRoomName('');
    setSchedDate('');
    setSchedTime('');
    setActiveTab('dashboard');
  };

  const handleJoinRoom = async () => {
    if (!joinRoomId.trim()) return;
    await socket.emit('user-code-join', { roomId: joinRoomId });
    setJoinRoomId('');
  };

  useEffect(() => {
    socket.on("room-created", ({ roomId }) => {
        navigate(`/meet/${roomId}`);
    });

    socket.on("room-exists", ({ roomId }) => {
      navigate(`/meet/${roomId}`);
    });

    socket.on("room-not-exist", () => {
      setJoinRoomId('');
      setJoinRoomError("Room doesn't exist! Please try again.");
    });

    if (userId) {
      socket.emit("fetch-my-meets", { userId });
      socket.on("meets-fetched", async ({ myMeets }) => {
        setMyMeets(myMeets);
      });
    }

    // Cleanup listeners
    return () => {
      socket.off("room-created");
      socket.off("room-exists");
      socket.off("room-not-exist");
      socket.off("meets-fetched");
    };
  }, [socket, navigate, setMyMeets, userId]);

  if (!userName || userName === 'null') {
    return (
      <div className="login-overlay">
        <h1>Welcome to MeetSpace</h1>
        <button onClick={handleLogIn}>Log In to Continue</button>
      </div>
    );
  }

  return (
    <div className='homePage'>
      
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-logo">
          <SmartDisplayIcon style={{ color: '#a78bfa', fontSize: 28 }} />
          MeetSpace
        </div>

        <div className="sidebar-menu">
          <div 
            className={`menu-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <SpaceDashboardIcon fontSize="small" /> Dashboard
          </div>
          <div 
            className={`menu-item ${activeTab === 'schedule' ? 'active' : ''}`}
            onClick={() => setActiveTab('schedule')}
          >
            <CalendarTodayIcon fontSize="small" /> Schedule
          </div>
          <div 
            className={`menu-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <SettingsIcon fontSize="small" /> Settings
          </div>
        </div>

        <div className="user-profile-badge">
          <div className="user-info">
            <div className="avatar">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="user-details">
              <h4>{userName}</h4>
              <p>{userEmail || `${userName}@gmail.com`}</p>
            </div>
          </div>
          <button onClick={handleLogOut} className="logout-btn" title="Log out">
            <LogoutIcon fontSize="small" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="main-content">
        
        {activeTab === 'dashboard' && (
          <>
            <div className="welcome-header">
              <h1>Welcome back, {userName} 👋</h1>
              <p>Ready to meet? Start or join a session below.</p>
            </div>

            <div className="action-cards">
              <div className="new-meet-card" onClick={handleInstantMeet}>
                <MovieCreationIcon />
                <h3>New Meeting</h3>
                <p>Start instantly</p>
              </div>

              <div className="join-meet-card">
                <div className="join-meet-header">
                  <LinkIcon style={{ color: '#8b949e' }} />
                  Join Meeting
                </div>
                <div className="join-input-group">
                  <input 
                    type="text" 
                    placeholder="Enter room code..." 
                    value={joinRoomId}
                    onChange={(e) => setJoinRoomId(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleJoinRoom();
                    }}
                  />
                  <button className="join-btn" onClick={handleJoinRoom}>Join</button>
                </div>
                {joinRoomError && <div className="join-error">{joinRoomError}</div>}
              </div>
            </div>

            <div className="meetings-section">
              <h3>MY MEETINGS</h3>
              
              {(!myMeets || myMeets.length === 0) ? (
                <div className="empty-state">
                  <span role="img" aria-label="mailbox" style={{ fontSize: '48px', marginBottom: '16px' }}>📬</span>
                  <p>No meetings yet. Create your first one!</p>
                </div>
              ) : (
                <div className="meets-grid">
                  {myMeets.map((meet, i) => (
                    <div key={i} className="meet-item">
                      <div className="meet-info">
                        <h4>{meet.roomName}</h4>
                        <div className="meet-meta">
                          <span>{meet.meetDate !== 'none' ? meet.meetDate : 'Instant'}</span>
                          {meet.meetTime !== 'none' && <span> • {meet.meetTime}</span>}
                        </div>
                        <p className="meet-id">ID: {meet._id}</p>
                      </div>
                      <div className="meet-item-actions">
                        <button onClick={() => navigate(`/meet/${meet._id}`)}>Join</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'schedule' && (
          <div className="schedule-section">
            <div className="welcome-header">
              <h1>Schedule a Meeting</h1>
              <p>Set up a meeting for later and share the link with others.</p>
            </div>
            
            <form className="schedule-form" onSubmit={handleScheduleMeet}>
              <div className="form-group">
                <label>Meeting Title</label>
                <input 
                  type="text" 
                  placeholder="e.g. Weekly Sync" 
                  value={schedRoomName}
                  onChange={(e) => setSchedRoomName(e.target.value)}
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Date</label>
                  <input 
                    type="date" 
                    value={schedDate}
                    onChange={(e) => setSchedDate(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Time</label>
                  <input 
                    type="time" 
                    value={schedTime}
                    onChange={(e) => setSchedTime(e.target.value)}
                    required
                  />
                </div>
              </div>
              <button type="submit" className="schedule-btn">Create Scheduled Meeting</button>
            </form>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="settings-section">
            <div className="welcome-header">
              <h1>Settings</h1>
              <p>Manage your account and preferences.</p>
            </div>

            <div className="settings-container">
              <div className="settings-card">
                <h3>Profile Information</h3>
                <div className="profile-edit-preview">
                  <div className="large-avatar">
                   {userName.charAt(0).toUpperCase()}
                  </div>
                  <div className="profile-details">
                    <div className="detail-item">
                      <label>Username</label>
                      <p>{userName}</p>
                    </div>
                    <div className="detail-item">
                      <label>Email Address</label>
                      <p>{userEmail || `${userName}@gmail.com`}</p>
                    </div>
                    <div className="detail-item">
                      <label>User ID</label>
                      <p className="mono">{userId}</p>
                    </div>
                  </div>
                </div>
                <div className="settings-actions">
                    <button className="secondary-btn" onClick={() => logout()}>Log Out</button>
                </div>
              </div>

              <div className="settings-card">
                 <h3>App Preferences</h3>
                 <div className="preference-item">
                    <div className="pref-info">
                        <h4>Dark Mode</h4>
                        <p>Currently default and only theme supported.</p>
                    </div>
                    <div className="pref-toggle">
                        <div className="toggle-bg active">
                            <div className="toggle-knob"></div>
                        </div>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}

export default Home;