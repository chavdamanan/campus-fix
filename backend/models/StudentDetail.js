const mongoose = require('mongoose');

const StudentDetailSchema = new mongoose.Schema({
  name: String,
  email: String,
  mobile: String,
  enrollmentNo: String,
  createdAt: { type: Date, default: Date.now }
}, { collection: 'studentdetails' });

module.exports = mongoose.model('StudentDetail', StudentDetailSchema);


