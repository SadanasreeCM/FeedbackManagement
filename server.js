const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Sentiment = require("sentiment");

const app = express();
app.use(express.json());
app.use(cors());

// Initialize sentiment analyzer
const sentiment = new Sentiment();

// Serve static files (HTML, CSS, JS)
app.use(express.static('.'));

// JWT Secret Key
const JWT_SECRET = "your-secret-key-change-in-production";

// MongoDB Connection
mongoose.connect("mongodb://127.0.0.1:27017/complaintDB")
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));

// User Schema
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: "user", enum: ["user", "admin"] },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model("User", userSchema);

// Complaint Schema
const complaintSchema = new mongoose.Schema({
    name: String,
    email: String,
    category: String,
    message: String,
    status: { type: String, default: "Open" },
    sentiment: { type: String, enum: ["Positive", "Neutral", "Negative"], default: "Neutral" },
    sentimentScore: { type: Number, default: 0 },
    date: { type: Date, default: Date.now },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const Complaint = mongoose.model("Complaint", complaintSchema);

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(400).json({ message: 'Invalid token.' });
    }
};

// Helper function to classify sentiment with better accuracy
function classifySentiment(sentimentAnalysis) {
    // sentimentAnalysis has { score, comparative, words, positive, negative }
    const score = sentimentAnalysis.score;
    const comparative = sentimentAnalysis.comparative;
    
    // Use both score and comparative for better classification
    // If there are positive words, it's positive
    if (sentimentAnalysis.positive && sentimentAnalysis.positive.length > 0 && score > 0) {
        return "Positive";
    }
    // If there are negative words, it's negative
    if (sentimentAnalysis.negative && sentimentAnalysis.negative.length > 0 && score < 0) {
        return "Negative";
    }
    // Check score thresholds
    if (score > 2 || comparative > 0.5) {
        return "Positive";
    } else if (score < -2 || comparative < -0.5) {
        return "Negative";
    }
    return "Neutral";
}

// Auth Routes
// Register
app.post("/auth/register", async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const user = new User({
            username,
            email,
            password: hashedPassword
        });

        await user.save();

        // Create JWT token
        const token = jwt.sign({ id: user._id, username: user.username, role: user.role }, JWT_SECRET);

        res.json({ message: "User registered successfully", token, user: { id: user._id, username, email, role: user.role } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

// Login
app.post("/auth/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        // Create JWT token
        const token = jwt.sign({ id: user._id, username: user.username, role: user.role }, JWT_SECRET);

        res.json({ message: "Login successful", token, user: { id: user._id, username: user.username, email: user.email, role: user.role } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

// API: Add complaint (protected)
app.post("/complaints", authenticateToken, async (req, res) => {
    try {
        // Analyze sentiment of the message
        const sentimentResult = sentiment.analyze(req.body.message);
        const sentimentClass = classifySentiment(sentimentResult.score);

        const complaint = new Complaint({
            ...req.body,
            userId: req.user.id,
            sentiment: sentimentClass,
            sentimentScore: sentimentResult.score
        });
        await complaint.save();
        res.json({ message: "Complaint Submitted", sentiment: sentimentClass, sentimentScore: sentimentResult.score });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

// API: Get all complaints (protected)
app.get("/complaints", authenticateToken, async (req, res) => {
    try {
        const data = await Complaint.find().populate('userId', 'username email');
        res.json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

// API: Update complaint status (admin only)
app.put("/complaints/:id", authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: "Access denied. Admin only." });
        }

        const { status } = req.body;
        await Complaint.findByIdAndUpdate(req.params.id, { status });
        res.json({ message: "Complaint updated successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

// Dashboard API: Get stats (admin only)
app.get("/dashboard/stats", authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: "Access denied. Admin only." });
        }

        const totalComplaints = await Complaint.countDocuments();
        const openComplaints = await Complaint.countDocuments({ status: "Open" });
        const resolvedComplaints = await Complaint.countDocuments({ status: "Resolved" });
        const totalUsers = await User.countDocuments();

        // Category stats
        const categoryStats = await Complaint.aggregate([
            { $group: { _id: "$category", count: { $sum: 1 } } }
        ]);

        // Sentiment stats
        const sentimentStats = await Complaint.aggregate([
            { $group: { _id: "$sentiment", count: { $sum: 1 } } }
        ]);

        // Recent complaints
        const recentComplaints = await Complaint.find()
            .populate('userId', 'username')
            .sort({ date: -1 })
            .limit(5);

        res.json({
            totalComplaints,
            openComplaints,
            resolvedComplaints,
            totalUsers,
            categoryStats,
            sentimentStats,
            recentComplaints
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

// Serve index.html for root path
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.listen(3000, () => {
    console.log("Server running on port 3000");
});
