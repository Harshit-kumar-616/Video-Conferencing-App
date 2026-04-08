import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'supersecret_default', {
        expiresIn: '30d',
    });
};

// ─── REGISTER ─────────────────────────────────────────────────────────────────
export const register = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password)
            return res.status(400).json({ msg: 'All fields are required' });

        const existingUser = await User.findOne({ email });
        if (existingUser)
            return res.status(400).json({ msg: 'Email already registered' });

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const newUser = new User({ username, email, password: passwordHash });
        const user = await newUser.save();

        const token = generateToken(user._id);
        const userData = { _id: user._id, username: user.username, email: user.email };

        res.status(201).json({ token, user: userData });
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ msg: err.message });
    }
};

// ─── LOGIN ────────────────────────────────────────────────────────────────────
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password)
            return res.status(400).json({ msg: 'Email and password are required' });

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ msg: 'User does not exist' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' });

        const token = generateToken(user._id);
        const userData = { _id: user._id, username: user.username, email: user.email };

        res.status(200).json({ token, user: userData });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ msg: err.message });
    }
};

// ─── GET ME (protected) ───────────────────────────────────────────────────────
export const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        if (!user) return res.status(404).json({ msg: 'User not found' });
        res.status(200).json({ user });
    } catch (err) {
        console.error('GetMe error:', err);
        res.status(500).json({ msg: err.message });
    }
};
