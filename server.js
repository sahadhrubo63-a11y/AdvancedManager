import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// লোকাল .env থাকলে লোড করবে; Render-এ Environment Variables সরাসরি কাজ করবে
dotenv.config({ path: path.join(__dirname, '.env') });

// server.js যে ফোল্ডারে আছে সেখানে index.html থাকলে সেটিই rootDir, নাহলে এক ধাপ ওপরে চেক করবে
const rootDir = fs.existsSync(path.join(__dirname, 'index.html'))
    ? __dirname
    : path.join(__dirname, '..');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' })); // বড় ডাটা বা ছবি হ্যান্ডেল করার জন্য

// রুট ডিরেক্টরি থেকে স্ট্যাটিক ফাইল সার্ভ করার জন্য
app.use(express.static(rootDir));

// রুট (/) হিট করলে index.html দেখানোর জন্য
app.get('/', (req, res) => {
    res.sendFile(path.join(rootDir, 'index.html'));
});

app.get('/user.html', (req, res) => {
    res.sendFile(path.join(rootDir, 'user.html'));
});

app.get('/index.html', (req, res) => {
    res.sendFile(path.join(rootDir, 'index.html'));
});

// MongoDB কানেকশন (MongoDB Atlas অথবা লোকাল URI)
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/advanced_manager";

mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ MongoDB Connected Successfully!'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// ইউজার এবং রেজিস্ট্রেশনের জন্য Mongoose স্কিমা ও মডেল
const UserSchema = new mongoose.Schema({
    id: String,
    fullName: String,
    requestedUsername: String,
    phone: String,
    email: { type: String, unique: true },
    dob: String,
    age: String,
    nationality: String,
    district: String,
    homeAddress: String,
    permAddress: String,
    companyName: String,
    category: String,
    shopAddress: String,
    photoUrl: String,
    status: { type: String, default: 'pending' }, // pending, approved, rejected, delisted
    assignedUsername: String,
    assignedPassword: String,
    submittedAt: String,
    userStatus: { type: String, default: 'Active' },
    lastActiveTime: String,
    softwareViews: { type: Number, default: 1 },

    // POS এর নিজস্ব ডাটা
    inventory: { type: Array, default: [] },
    statements: { type: Array, default: [] },
    vouchers: { type: Array, default: [] },
    documents: { type: Array, default: [] },
    address: String,
    helpline: String,
    dp: String
});

const User = mongoose.model('User', UserSchema);

// ১. নতুন ইউজার রেজিস্ট্রেশন API (User Portal থেকে)
app.post('/api/register', async (req, res) => {
    try {
        const existingUser = await User.findOne({ email: req.body.email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Email already registered!' });
        }
        const newUser = new User(req.body);
        await newUser.save();
        res.status(201).json({ success: true, message: 'Registration submitted successfully!' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ২. সব রেজিস্ট্রেশন রিকোয়েস্ট দেখার API (Admin Panel এর জন্য)
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find().sort({ _id: -1 });
        res.json({ success: true, users });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ৩. ইউজার স্ট্যাটাস আপডেট বা এপ্রুভ করার API (Admin Action)
app.put('/api/users/:id', async (req, res) => {
    try {
        const updatedUser = await User.findOneAndUpdate(
            { id: req.params.id },
            req.body,
            { new: true }
        );
        res.json({ success: true, updatedUser });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ৪. ইউজার ডিলিট করার API
app.delete('/api/users/:id', async (req, res) => {
    try {
        await User.findOneAndDelete({ id: req.params.id });
        res.json({ success: true, message: 'User deleted successfully!' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ৫. POS লগইন API (Index Portal এর জন্য)
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({
            assignedUsername: username,
            assignedPassword: password,
            status: 'approved',
            userStatus: 'Active'
        });

        if (user) {
            res.json({ success: true, user });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials or account not approved!' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ৬. ইউজারদের ইনভেন্টরি, স্টেটমেন্ট বা প্রোডাক্ট আপডেট সেভ করার API
app.put('/api/user-data/:username', async (req, res) => {
    try {
        const updatedUser = await User.findOneAndUpdate(
            { assignedUsername: req.params.username },
            {
                inventory: req.body.inventory,
                statements: req.body.statements,
                vouchers: req.body.vouchers,
                documents: req.body.documents,
                address: req.body.address,
                helpline: req.body.helpline,
                dp: req.body.dp
            },
            { new: true }
        );
        res.json({ success: true, updatedUser });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// সার্ভার লিসেনিং
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`👉 http://localhost:${PORT}/index.html`);
    console.log(`👉 http://localhost:${PORT}/user.html`);
});
