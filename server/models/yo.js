const mongoose = require('mongoose');

const { Schema } = mongoose;

const yoSchema = new Schema({
  originalUrl: String,
  linkName: String,
  shortUrl: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  lastAccess: Date,
  urlHits: Number,
}, { versionKey: false });

mongoose.model('yo', yoSchema);
