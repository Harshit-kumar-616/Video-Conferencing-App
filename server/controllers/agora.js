import pkg from 'agora-token';
const { RtcTokenBuilder, RtcRole } = pkg;


export const generateRtcToken = (req, res) => {
    // Set response header
    res.header('Access-Control-Allow-Origin', '*');

    // Get channel name
    const channelName = req.query.channelName;
    if (!channelName) {
        return res.status(500).json({ 'error': 'channel name is required' });
    }

    // Get uid
    let uid = parseInt(req.query.uid, 10);
    if (isNaN(uid)) {
        uid = 0;
    }


    // Get role
    let role = RtcRole.PUBLISHER;
    if (req.query.role === 'subscriber') {
        role = RtcRole.SUBSCRIBER;
    }

    // Get expire time
    let expireTime = req.query.expiry;
    if (!expireTime || expireTime === '') {
        expireTime = 3600;
    } else {
        expireTime = parseInt(expireTime, 10);
    }

    // Calculate privilege expire time
    const currentTime = Math.floor(Date.now() / 1000);
    const privilegeExpireTime = currentTime + expireTime;

    // App credentials
    const appId = process.env.AGORA_APP_ID;
    const appCertificate = process.env.AGORA_APP_CERTIFICATE;

    if (!appId || !appCertificate) {
        return res.status(500).json({ 'error': 'App ID and App Certificate are required in .env' });
    }

    // Build token
    const token = RtcTokenBuilder.buildTokenWithUid(appId, appCertificate, channelName, uid, role, privilegeExpireTime, privilegeExpireTime);

    // Return token
    return res.json({ 'rtcToken': token });
};
