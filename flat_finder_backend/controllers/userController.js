const User = require('../models/userModel');
const Flat = require('../models/flatModel');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('../config/config');

exports.signup = async function(req, res, next) {
    try {
        const newUser = new User(req.body);
        newUser.created = new Date();
        newUser.modified = new Date();
        const savedUser = await newUser.save();
        const token = jwt.sign({ id: savedUser._id }, config.secrets.jwt, { expiresIn: config.jwtExpiresIn });
        res.status(201).json({
            status: 'success',
            user: savedUser,
            token: token
        });
    } catch (err) {
        res.status(400).json({
            status: 'fail',
            message: err.message
        });
    }
};

exports.login = async function(req, res, next) {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ status: 'fail', message: 'You need to send email and password' });
    }
    try {
        const user = await User.findOne({ email: email });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(404).json({ status: 'fail', message: 'Invalid email or password' });
        }
        const token = signToken(user._id);
        res.status(200).json({
            status: 'success',
            token: token,
            userId: user._id
        });
    } catch (err) {
        res.status(400).json({
            status: 'fail',
            message: err.message
        });
    }
};

const signToken = (userId) => {
    return jwt.sign({ userId }, config.secrets.jwt, { expiresIn: config.jwtExpiresIn });
};

exports.getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.userId).populate({
            path: 'favouriteFlats',
            model: Flat
        });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json(user);
    } catch (err) {
        console.error('Error fetching user by ID:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.getCurrentUser = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).populate('favouriteFlats', 'title city streetName');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json(user);
    } catch (err) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.updateUser = async (req, res) => {
    const { userId } = req.params;
    const updates = req.body;

    try {
        const user = await User.findByIdAndUpdate(userId, updates, { new: true, runValidators: true });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json(user);
    } catch (err) {
        res.status(400).json({ message: 'Invalid data provided' });
    }
};

exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find();
        res.status(200).json(users);
    } catch (err) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.deleteUser = async (req, res) => {
    const { userId } = req.params;

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        await Flat.deleteMany({ ownerId: userId });
        await User.findByIdAndDelete(userId);
        res.status(200).json({ message: 'User and associated flats deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.addFlatToFavorites = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const flat = await Flat.findById(req.params.flatId);
        if (!flat) {
            return res.status(404).json({ message: 'Flat not found' });
        }

        if (!user.favouriteFlats.includes(flat._id)) {
            user.favouriteFlats.push(flat._id);
            await user.save();
        }

        res.status(200).json({ message: 'Flat added to favorites' });
    } catch (err) {
        console.error('Error adding flat to favorites:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.removeFlatFromFavorites = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const flat = await Flat.findById(req.params.flatId);
        if (!flat) {
            return res.status(404).json({ message: 'Flat not found' });
        }

        user.favouriteFlats = user.favouriteFlats.filter(id => id.toString() !== flat._id.toString());
        await user.save();

        res.status(200).json({ message: 'Flat removed from favorites' });
    } catch (err) {
        console.error('Error removing flat from favorites:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};