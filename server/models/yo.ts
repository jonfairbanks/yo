import mongoose, { Schema, Document } from 'mongoose';

// Define an interface for the Yo document
export interface YoDocument extends Document {
  originalUrl: string;
  linkName: string;
  shortUrl: string;
  createdAt: Date;
  updatedAt: Date;
  lastAccess: Date;
  urlHits: number;
}

// Define the Yo schema
const yoSchema = new Schema<YoDocument>({
  originalUrl: { type: String, required: true },
  linkName: { type: String, required: true, unique: true },
  shortUrl: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  lastAccess: { type: Date },
  urlHits: { type: Number, default: 0 },
}, { versionKey: false });

// Create the model and export it
const Yo = mongoose.model<YoDocument>('Yo', yoSchema);
export default Yo;