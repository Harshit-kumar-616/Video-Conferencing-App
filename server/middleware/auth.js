import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const verifyToken = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(403).json({ msg: 'Access denied. No token provided.' });
    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET || 'supersecret_default');
        req.user = await User.findById(verified.id).select('-password');
        if (!req.user) return res.status(401).json({ msg: 'User not found' });
        next();
    } catch (err) {
        res.status(401).json({ msg: 'Invalid or expired token' });
    }
};