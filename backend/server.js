require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const nodemailer = require('nodemailer');

// Setup file logging
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}
const logFile = path.join(logsDir, 'server.log');
function appendLog(msg) {
  const timestamp = new Date().toISOString();
  const logMsg = `[${timestamp}] ${msg}\n`;
  console.log(logMsg.trim());
  fs.appendFileSync(logFile, logMsg);
}

const User = require('./models/User');
const StudentDetail = require('./models/StudentDetail');
const Issue = require('./models/Issue');
const Feedback = require('./models/Feedback');

const app = express();
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  appendLog(`${req.method} ${req.path}`);
  if (req.method !== 'GET' && req.body) {
    appendLog(`  Body: ${JSON.stringify(req.body)}`);
  }
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ===== File upload configuration for worker proof images =====
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const upload = multer({ dest: uploadDir });
// Serve uploaded images statically at /uploads
app.use('/uploads', express.static(uploadDir));

const MONGO = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ci_app';

async function connectWithRetry(uri, { retries = 5, delayMs = 3000, fallbackToLocal = false } = {}) {
  try {
    await mongoose.connect(uri);
    console.log('MongoDB connected');
    return true;
  } catch (err) {
    // Log useful debugging info
    console.error('Mongo error:', err && err.message ? err.message : err);
    
    // Provide a helpful hint for common Atlas issues
    if (uri && uri.startsWith('mongodb+srv')) {
      console.error('\n======================================================');
      console.error('💡 TIP: If you cannot connect to MongoDB Atlas:');
      console.error('1. Check if your current IP is whitelisted in Atlas Network Access -> Add IP Address (or 0.0.0.0/0).');
      console.error('2. Check your internet connection or proxies.');
      console.error('======================================================\n');
    }

    if (err && err.stack) console.error(err.stack);

    if (retries > 0) {
      console.log(`Retrying MongoDB connection in ${delayMs}ms... (${retries} attempts left)`);
      await new Promise(r => setTimeout(r, delayMs));
      return connectWithRetry(uri, { retries: retries - 1, delayMs: Math.min(30000, delayMs * 2), fallbackToLocal });
    }

    // After exhausting retries, optionally attempt a local fallback
    if (fallbackToLocal && uri && uri.startsWith('mongodb+srv')) {
      const localUri = 'mongodb://127.0.0.1:27017/ci_app';
      if (localUri !== uri) {
        console.log('Attempting fallback to local MongoDB at', localUri);
        try {
          await mongoose.connect(localUri);
          console.log('MongoDB connected to local fallback');
          return true;
        } catch (localErr) {
          console.error('Local fallback connection failed:', localErr && localErr.message ? localErr.message : localErr);
          if (localErr && localErr.stack) console.error(localErr.stack);
        }
      }
    }

    console.error('All MongoDB connection attempts failed. The server will continue running but DB operations will fail until connection is restored.');
    return false;
  }
}

// Start trying to connect. Set fallback based on env var FALLBACK_LOCAL=true
connectWithRetry(MONGO, { retries: 5, delayMs: 3000, fallbackToLocal: process.env.FALLBACK_LOCAL === 'true' });

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, mobile, role, department } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'name, email and password are required' });
    }

    // Check if user already exists
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(409).json({ message: 'User already exists' });
    }

    // Hash password and save user
    const hash = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hash, mobile, role, department });
    await user.save();

    const out = { id: user._id, name: user.name, email: user.email, role: user.role, mobile: user.mobile };
    return res.json(out);
  } catch (err) {
    console.error('Register error:', err);
    // Surface the underlying error message during development so the UI shows something meaningful
    const message = err && err.message ? err.message : 'server error';
    return res.status(500).json({ message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'email and password required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (user.blocked) {
      return res.status(403).json({ message: 'Your account has been blocked by the administrator.' });
    }

    const ok = await bcrypt.compare(password, user.password || '');
    if (!ok) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const out = { id: user._id, name: user.name, email: user.email, role: user.role, mobile: user.mobile };
    return res.json(out);
  } catch (err) {
    console.error('Login error:', err);
    const message = err && err.message ? err.message : 'server error';
    return res.status(500).json({ message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  const state = mongoose.connection.readyState; // 0 disconnected,1 connected,2 connecting,3 disconnecting
  res.json({ ok: true, mongoState: state });
});

// Example: list studentdetails collection (Atlas 'student' DB -> 'studentdetails' collection)
app.get('/api/students', async (req, res) => {
  try {
    const docs = await StudentDetail.find().limit(100).lean();
    res.json(docs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'server error' });
  }
});

// ===== Workers (maintenance staff) APIs =====
// List all users with role "worker" so admin can see worker profiles & attendance
app.get('/api/workers', async (req, res) => {
  try {
    const workers = await User.find({ role: 'worker' }).lean();
    res.json(workers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'server error' });
  }
});

// Get single worker with attendance (used by worker dashboard)
app.get('/api/workers/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const worker = await User.findById(id).lean();
    if (!worker || worker.role !== 'worker') {
      return res.status(404).json({ message: 'Worker not found' });
    }
    res.json(worker);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'server error' });
  }
});

// Generic users API (used for listing blocked users in admin dashboard)
app.get('/api/users', async (req, res) => {
  try {
    const query = {};
    if (req.query.role) {
      query.role = req.query.role;
    }
    if (req.query.blocked === 'true') {
      query.blocked = true;
    }
    const users = await User.find(query).lean();
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'server error' });
  }
});

// Mark today's attendance for a worker
app.post('/api/workers/:id/attendance', async (req, res) => {
  try {
    const id = req.params.id;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'Worker not found' });

    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    if (!Array.isArray(user.attendance)) {
      user.attendance = [];
    }
    const existing = user.attendance.find(a => a.date === today);
    if (!existing) {
      user.attendance.push({ date: today, status: 'Present' });
    } else {
      existing.status = 'Present';
    }

    await user.save();
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'server error' });
  }
});

// Create issue
app.post('/api/issues', async (req, res) => {
  try {
    const { category, location, description, reporter } = req.body;
    if (!category || !description || !reporter || !reporter.email) {
      return res.status(400).json({ message: 'category, description and reporter are required' });
    }
    const issue = new Issue({ category, location, description, reporter });
    await issue.save();
    res.json(issue);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'server error' });
  }
});

// List issues
// Optional filters:
//  - reporterEmail: only issues reported by that email
//  - assignedWorkerId: only issues assigned to a given worker (User _id)
app.get('/api/issues', async (req, res) => {
  try {
    const reporterEmail = req.query.reporterEmail;
    const assignedWorkerId = req.query.assignedWorkerId;
    const q = {};
    if (reporterEmail) q['reporter.email'] = reporterEmail;
    if (assignedWorkerId) q.assignedTo = assignedWorkerId;
    const issues = await Issue.find(q).sort({ createdAt: -1 }).lean();
    res.json(issues);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'server error' });
  }
});

// Update issue (status, assignment or add history)
app.put('/api/issues/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const payload = req.body;
    const issue = await Issue.findById(id);
    if (!issue) return res.status(404).json({ message: 'Issue not found' });
    // update allowed fields from JSON body
    if (payload.status) issue.status = payload.status;
    if (payload.history) issue.history = issue.history.concat(payload.history);
    if (payload.assignedTo) issue.assignedTo = payload.assignedTo;
    if (payload.resolutionNote) issue.resolutionNote = payload.resolutionNote;
    await issue.save();
    res.json(issue);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'server error' });
  }
});

// Mark an issue as notified (user has seen the resolution)
app.put('/api/issues/:id/notify', async (req, res) => {
  try {
    const id = req.params.id;
    const issue = await Issue.findById(id);
    if (!issue) return res.status(404).json({ message: 'Issue not found' });
    issue.userNotified = true;
    await issue.save();
    res.json(issue);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'server error' });
  }
});

// Delete issue completely (admin only in UI)
app.delete('/api/issues/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const deleted = await Issue.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: 'Issue not found' });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'server error' });
  }
});

// Block the reporter of a given issue (admin action)
app.post('/api/issues/:id/block-reporter', async (req, res) => {
  try {
    const id = req.params.id;
    const issue = await Issue.findById(id).lean();
    if (!issue) return res.status(404).json({ message: 'Issue not found' });
    if (!issue.reporter || !issue.reporter.email) {
      return res.status(400).json({ message: 'Issue has no reporter email to block' });
    }
    const user = await User.findOne({ email: issue.reporter.email });
    if (!user) {
      return res.status(404).json({ message: 'Reporter user not found' });
    }
    if (user.blocked) {
      return res.status(200).json({ message: 'User already blocked', userId: user._id });
    }
    user.blocked = true;
    await user.save();
    res.json({ message: 'User blocked', userId: user._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'server error' });
  }
});

// Unblock user by id (admin action)
app.post('/api/users/:id/unblock', async (req, res) => {
  try {
    const id = req.params.id;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (!user.blocked) {
      return res.status(200).json({ message: 'User already unblocked', userId: user._id });
    }
    user.blocked = false;
    await user.save();
    res.json({ message: 'User unblocked', userId: user._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'server error' });
  }
});

// Explicit assign endpoint for admin to assign a worker to an issue
app.put('/api/issues/:id/assign', async (req, res) => {
  try {
    const id = req.params.id;
    const { workerId } = req.body;
    const issue = await Issue.findById(id);
    if (!issue) return res.status(404).json({ message: 'Issue not found' });
    issue.assignedTo = workerId || null;
    await issue.save();
    res.json(issue);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'server error' });
  }
});

// Worker resolve endpoint with optional proof image upload
app.put('/api/issues/:id/resolve', upload.single('proofImage'), async (req, res) => {
  try {
    const id = req.params.id;
    const issue = await Issue.findById(id);
    if (!issue) return res.status(404).json({ message: 'Issue not found' });

    const { workerId, resolutionNote } = req.body;
    if (workerId) issue.assignedTo = workerId;

    issue.status = 'Resolved';
    issue.resolvedAt = new Date();
    if (resolutionNote) issue.resolutionNote = resolutionNote;

    if (req.file) {
      // Store relative URL so frontend can display image directly
      issue.proofImageUrl = `/uploads/${req.file.filename}`;
    }

    // push to history for audit trail
    issue.history = issue.history.concat({
      type: 'resolved',
      by: workerId || 'worker',
      at: new Date().toISOString(),
      note: resolutionNote || '',
      proofImageUrl: issue.proofImageUrl || null,
    });

    await issue.save();
    res.json(issue);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'server error' });
  }
});

// ===== Feedback APIs =====

// Submit feedback for a resolved issue
app.post('/api/feedback', async (req, res) => {
  try {
    appendLog('Received feedback request: ' + JSON.stringify(req.body, null, 2));
    const { issueId, workerId, rating, comment, user: feedbackUser } = req.body;
    
    if (!issueId || !workerId || !rating) {
      appendLog(`Missing required fields: issueId=${issueId}, workerId=${workerId}, rating=${rating}`);
      return res.status(400).json({ message: 'issueId, workerId, and rating are required' });
    }

    appendLog(`Validating IDs - issueId: ${issueId}, workerId: ${workerId}`);
    if (!mongoose.Types.ObjectId.isValid(issueId)) {
      appendLog(`Invalid issueId format: ${issueId}`);
      return res.status(400).json({ message: 'Issue ID is not a database ID. (If this is a locally-saved issue, you cannot leave feedback).' });
    }
    if (!mongoose.Types.ObjectId.isValid(workerId)) {
      appendLog(`Invalid workerId format: ${workerId}`);
      return res.status(400).json({ message: 'Worker ID is improperly formatted.' });
    }

    const issue = await Issue.findById(issueId);
    if (!issue) {
      appendLog(`Issue not found: ${issueId}`);
      return res.status(404).json({ message: 'Issue not found' });
    }
    appendLog(`Issue found. feedbackSubmitted: ${issue.feedbackSubmitted}`);
    
    if (issue.feedbackSubmitted) {
      appendLog(`Feedback already submitted for issue: ${issueId}`);
      return res.status(400).json({ message: 'Feedback already submitted for this issue' });
    }

    const feedback = new Feedback({ issue: issueId, worker: workerId, rating, comment, user: feedbackUser });
    await feedback.save();
    appendLog(`Feedback saved: ${feedback._id}`);

    issue.feedbackSubmitted = true;
    await issue.save();
    appendLog(`Issue updated with feedback`);

    res.json(feedback);
  } catch (err) {
    appendLog(`Feedback submission error: ${err.message}`);
    res.status(500).json({ message: err.message || 'server error on feedback' });
  }
});

// Get feedback for a specific worker
app.get('/api/workers/:id/feedback', async (req, res) => {
  try {
    const workerId = req.params.id;
    const feedbacks = await Feedback.find({ worker: workerId }).sort({ createdAt: -1 }).lean();
    
    // Calculate average rating
    const totalRating = feedbacks.reduce((sum, f) => sum + f.rating, 0);
    const averageRating = feedbacks.length > 0 ? (totalRating / feedbacks.length).toFixed(1) : 0;

    res.json({ feedbacks, averageRating, totalReviews: feedbacks.length });
  } catch (err) {
    console.error('Fetch worker feedback error:', err);
    res.status(500).json({ message: 'server error' });
  }
});

// ===== Forgot Password Implementation =====

// 1. Forgot Password - Generate OTP & Send Email
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save OTP to user (expires in 10 mins)
    user.resetPasswordOtp = otp;
    user.resetPasswordOtpExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    // Send email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset OTP - Campus Fix',
      text: `Your OTP for password reset is: ${otp}. It is valid for 10 minutes.`,
    };

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log('Error sending email:', error);
        return res.status(500).json({ message: 'Error sending email' });
      }
      res.json({ message: 'OTP sent to email' });
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// 2. Verify OTP
app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: 'Email and OTP are required' });

    const user = await User.findOne({
      email,
      resetPasswordOtp: otp,
      resetPasswordOtpExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    res.json({ message: 'OTP verified successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// 3. Reset Password
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'Email, OTP, and new password are required' });
    }

    const user = await User.findOne({
      email,
      resetPasswordOtp: otp,
      resetPasswordOtpExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Hash new password
    const hash = await bcrypt.hash(newPassword, 10);
    user.password = hash;

    // Clear OTP fields
    user.resetPasswordOtp = undefined;
    user.resetPasswordOtpExpires = undefined;

    await user.save();

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Use port 5000 for backend to avoid conflict with CRA dev server (3000)
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log('Server running on port', PORT));

module.exports = app;
