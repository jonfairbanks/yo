import mongoose from 'mongoose'

const yoSchema = new mongoose.Schema({
    originalUrl: { type: String, required: true },
    linkName: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
    },
    shortUrl: { type: String, required: true },
    lastAccess: { type: Date },
    urlHits: { type: Number, default: 0 },
}, {
    timestamps: true,
})

yoSchema.index({ lastAccess: -1 })
yoSchema.index({ urlHits: -1 })

export default mongoose.models.Yo || mongoose.model('Yo', yoSchema)
