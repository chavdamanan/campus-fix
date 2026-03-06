const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String }, // hashed
  mobile: { type: String },
  department: { type: String },
  role: { type: String, default: 'student' }, // 'student' | 'faculty' | 'staff' | 'worker' | 'admin'
  blocked: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  // Simple attendance tracking for workers (and optionally other roles)
  attendance: [{
    date: { type: String }, // YYYY-MM-DD
    status: { type: String, default: 'Present' }
  }],
  resetPasswordOtp: { type: String },
  resetPasswordOtpExpires: { type: Date }
});

module.exports = mongoose.model('User', UserSchema);


