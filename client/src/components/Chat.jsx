import React, { useContext, useEffect, useState } from 'react'
import { SocketContext } from '../context/SocketContext';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';


const Chat = ({roomId, userId}) => {

  const {participants, chatsContainerOpen, socket} = useContext(SocketContext);
  const [texts, setTexts] = useState([])
  const [textInput, setTextInput] = useState('');
  

 

  const sendMsg = async () => {
    if (textInput.trim() === "") return;
    const msgData = { 
      msg: [userId, textInput, 'text'], 
      roomId: roomId 
    };
    await socket.emit("new-chat", msgData);
    setTexts(current => [...current, msgData.msg]);
    setTextInput('');
  }

  const sendFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const msgData = {
        msg: [userId, event.target.result, 'file', file.name],
        roomId: roomId
      };
      await socket.emit("new-chat", msgData);
      setTexts(current => [...current, msgData.msg]);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  useEffect(() =>{
    socket.on("new-chat-arrived", async({msg, room})=>{
      if (room === roomId){
        setTexts(current => [...current, msg]);
      }
    });

    return () => {
      socket.off("new-chat-arrived");
    };
  }, [socket, roomId])

  return (
    <div className='chats-page' 
      style={chatsContainerOpen ? {right: "1vw"} : {right: "-25vw"}}
    >
        <h3>Chat Room</h3>
        <hr id='h3-hr' />
        
        <div className="chat-container">
          <div className="chat-messages-box">
          {texts.length > 0 ? 
            texts.map((i, id) => {
              const [senderId, content, type, fileName] = i;
              return (
                <div className="message-body" key={id} style={{ marginBottom: "15px" }}>
                  <span className="sender-name" style={{ fontSize: "0.8rem", fontWeight: "bold" }}>
                    {participants[senderId] || "User"}
                  </span>
                  {type === 'file' ? (
                    content.startsWith('data:image') ? (
                      <img src={content} alt={fileName} style={{ maxWidth: "100%", borderRadius: "5px", marginTop: "5px" }} />
                    ) : (
                      <a href={content} download={fileName} style={{ fontSize: "0.8rem", color: "#007bff" }}>
                        Download: {fileName}
                      </a>
                    )
                  ) : (
                    <p className="message" style={{ margin: "2px 0" }}>{content}</p>
                  )}
                </div>
              )
            })
          : 
          <p style={{ textAlign: "center", color: "#888" }}>No messages yet</p>}
          </div>

          <div className="send-messages-box">
            <input type="file" id='fileInput' onChange={sendFile} style={{ display: 'none' }} />
            <label htmlFor='fileInput'><AttachFileIcon /></label>
            <input 
              type="text" 
              placeholder="Type a message..."
              value={textInput} 
              onChange={(e)=> setTextInput(e.target.value)} 
              onKeyPress={(e) => e.key === 'Enter' && sendMsg()}
            />
            <button onClick={sendMsg} ><SendIcon /></button>
          </div>
        </div>
    </div>
  )
}

export default Chat;