const { mongoose } = require('../lib/mongoose');
const { Schema } = mongoose;

const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  // add your fields here
}, { timestamps: true });

// Idempotent export: reuse existing model if already registered
module.exports = mongoose.models?.User || mongoose.model('User', UserSchema);
