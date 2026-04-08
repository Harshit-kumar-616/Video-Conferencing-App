import { useContext, useRef, useState } from "react";
import '../styles/MeetPage.css';
import { Button } from "@mui/base";
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import LogoutIcon from '@mui/icons-material/Logout';
import PresentToAllIcon from '@mui/icons-material/PresentToAll';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare';
import ForumIcon from '@mui/icons-material/Forum';
import PersonIcon from '@mui/icons-material/Person';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { SocketContext } from "../context/SocketContext";
import { useNavigate } from "react-router-dom";
import RecordRTC from 'recordrtc';
import download from 'downloadjs';
import { Tooltip } from "@mui/material";

export default function Controls() {
  const { tracks, client, setStart, setInCall, screenTrack, setScreenTrack,
          participantsListOpen, setParticipantsListOpen, chatsContainerOpen, setChatsContainerOpen } = useContext(SocketContext);

  const [trackState, setTrackState] = useState({ video: true, audio: true });

  // Screen recording
  const [screenRecording, setScreenrecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const recorderRef = useRef(null);

  const startRecording = async () => {
    try {
      // Create a stream that includes the meeting window
      // User must choose the window/screen to record
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });
      
      const recorder = RecordRTC(stream, {
        type: 'video',
        mimeType: 'video/webm'
      });
      
      recorderRef.current = recorder;
      recorder.startRecording();
      setScreenrecording(true);
      
      // Handle the case where the user stops the display media manually
      stream.getTracks()[0].onended = () => {
        stopRecording();
      };
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const stopRecording = () => {
    if (recorderRef.current) {
      recorderRef.current.stopRecording(() => {
        const blob = recorderRef.current.getBlob();
        setRecordedBlob(blob);
        setScreenrecording(false);
        // Stop all tracks of the stream
        recorderRef.current.getState() !== 'inactive' && recorderRef.current.destroy();
      });
    }
  };

  const downloadVideo = async () => {
    if (recordedBlob) {
      download(recordedBlob, 'recorded-meeting.webm');
      setRecordedBlob(null);
    }
  };

  // Screen sharing logic
  const screenAudioRef = useRef(null);

  const startScreenSharing = async () => {
    try {
      // 1. Create Screen Track
      const result = await AgoraRTC.createScreenVideoTrack({ 
        encoderConfig: '1080p_1',
        optimizationMode: 'detail' 
      }, "auto"); // "auto" captures audio if sharing tab

      const screenVideoTrack = Array.isArray(result) ? result[0] : result;
      const screenAudioTrack = Array.isArray(result) ? result[1] : null;

      setScreenTrack(screenVideoTrack);
      screenAudioRef.current = screenAudioTrack;

      // 2. Unpublish camera track if it was published
      if (tracks[1]) {
        await client.unpublish(tracks[1]);
      }

      // 3. Publish screen track(s)
      if (screenAudioTrack) {
        await client.publish([screenVideoTrack, screenAudioTrack]);
      } else {
        await client.publish(screenVideoTrack);
      }

      // 4. Handle 'track-ended' (user clicks "Stop sharing" in browser)
      screenVideoTrack.on('track-ended', () => {
        handleStopScreenShare(screenVideoTrack, screenAudioTrack);
      });

    } catch (error) {
      console.error('Failed to start screen sharing:', error);
    }
  };

  const stopScreenSharing = async () => {
    if (screenTrack) {
      handleStopScreenShare(screenTrack, screenAudioRef.current);
    }
  };

  const handleStopScreenShare = async (videoTrack, audioTrack) => {
    try {
      // 1. Unpublish screen track(s)
      if (audioTrack) {
        await client.unpublish([videoTrack, audioTrack]);
      } else {
        await client.unpublish(videoTrack);
      }
      
      // 2. Close screen tracks
      videoTrack.stop();
      videoTrack.close();
      if (audioTrack) {
        audioTrack.stop();
        audioTrack.close();
      }
      setScreenTrack(null);
      screenAudioRef.current = null;

      // 3. Republish camera track if it should be on
      if (tracks[1] && trackState.video) {
        await client.publish(tracks[1]);
      }
    } catch (error) {
      console.error('Failed to stop screen share properly:', error);
    }
  };

  // Mute / unmute
  const mute = async (type) => {
    if (type === "audio" && tracks[0]) {
      if (trackState.audio) {
        await tracks[0].setEnabled(false);
      } else {
        await tracks[0].setEnabled(true);
      }
      setTrackState(ps => ({ ...ps, audio: !ps.audio }));
    } else if (type === "video" && tracks[1]) {
      if (trackState.video) {
        // If screen sharing is NOT active, we can unpublish. 
        // If it IS active, tracks[1] is already unpublished, so we just track state.
        if (!screenTrack) {
          await client.unpublish(tracks[1]);
        }
        await tracks[1].setEnabled(false);
      } else {
        await tracks[1].setEnabled(true);
        if (!screenTrack) {
          await client.publish(tracks[1]);
        }
      }
      setTrackState(ps => ({ ...ps, video: !ps.video }));
    }
  };

  const navigate = useNavigate();

  // Leave channel safely
  const leaveChannel = async () => {
    // 1. Cleanup Screen Sharing
    if (screenTrack) {
      await client.unpublish(screenTrack);
      screenTrack.stop();
      screenTrack.close();
      setScreenTrack(null);
    }
    if (screenAudioRef.current) {
      await client.unpublish(screenAudioRef.current);
      screenAudioRef.current.stop();
      screenAudioRef.current.close();
      screenAudioRef.current = null;
    }

    // 2. Cleanup Microphone and Camera
    if (tracks[0]) {
      await client.unpublish(tracks[0]);
      tracks[0].stop();
      tracks[0].close();
    }
    if (tracks[1]) {
      await client.unpublish(tracks[1]);
      tracks[1].stop();
      tracks[1].close();
    }

    // 3. Leave client
    await client.leave();
    client.removeAllListeners();
    setStart(false);
    setInCall(false);
    navigate('/');
  };

  return (
    <div className="controls-page">

      <div className="controllers-video-part">
        <Button variant="contained" color={trackState.audio ? "primary" : "secondary"} onClick={() => mute("audio")}>
          {trackState.audio ?
            <Tooltip title="Mike is on" placement="top"><MicIcon /></Tooltip> :
            <Tooltip title="Mike is off" placement="top"><MicOffIcon /></Tooltip>
          }
        </Button>

        <Button variant="contained" color={trackState.video ? "primary" : "secondary"} onClick={() => mute("video")}>
          {trackState.video ?
            <Tooltip title="Camera is on" placement="top"><VideocamIcon /></Tooltip> :
            <Tooltip title="Camera is off" placement="top"><VideocamOffIcon /></Tooltip>
          }
        </Button>

        {screenTrack ?
          <Button variant="contained" color="primary" onClick={stopScreenSharing}>
            <Tooltip title="Stop screen sharing" placement="top"><StopScreenShareIcon /></Tooltip>
          </Button> :
          <Button variant="contained" color="primary" onClick={startScreenSharing}>
            <Tooltip title="Screen share" placement="top"><PresentToAllIcon /></Tooltip>
          </Button>
        }

        {screenRecording ?
          <Button variant="contained" color="primary" onClick={stopRecording}>
            <Tooltip title="Stop recording" placement="top"><StopCircleIcon /></Tooltip>
          </Button> :
          <Button variant="contained" onClick={startRecording}>
            <Tooltip title="Start recording" placement="top"><RadioButtonCheckedIcon /></Tooltip>
          </Button>
        }

        {recordedBlob ?
          <Button variant="contained" color="error" onClick={downloadVideo}>
            <Tooltip title="Download" placement="top"><CloudDownloadIcon /></Tooltip>
          </Button> : ''
        }

        <Button variant="contained" color="default" onClick={leaveChannel}>
          <Tooltip title="Leave meet" placement="top"><LogoutIcon /></Tooltip>
        </Button>
      </div>

      <div className="controllers-chat-participants">
        <button onClick={() => { setParticipantsListOpen(false); setChatsContainerOpen(!chatsContainerOpen); }}>
          <Tooltip title="Chats" placement="top"><ForumIcon /></Tooltip>
        </button>
        <button onClick={() => { setParticipantsListOpen(!participantsListOpen); setChatsContainerOpen(false); }}>
          <Tooltip title="Participants" placement="top"><PersonIcon /></Tooltip>
        </button>
      </div>

    </div>
  );
}
