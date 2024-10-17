import mongoose from 'mongoose';

const yoSchema = new mongoose.Schema({
  originalUrl: { type: String, required: true },
  linkName: { type: String, required: true, unique: true },
  shortUrl: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  lastAccess: { type: Date },
  urlHits: { type: Number, default: 0 }
});

export default mongoose.models.Yo || mongoose.model('Yo', yoSchema);