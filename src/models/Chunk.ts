
import mongoose, { Schema, Document } from 'mongoose';

export interface IChunk extends Document {
  uploadId: string;
  index: number;
  data: Buffer;
  createdAt: Date;
}

const ChunkSchema: Schema = new Schema({
  uploadId: { type: String, required: true },
  index: { type: Number, required: true },
  data: { type: Buffer, required: true },
  createdAt: { type: Date, default: Date.now, expires: 3600 }, // Auto-delete after 1 hour
});

// Compound index to ensure unique chunks for an upload
ChunkSchema.index({ uploadId: 1, index: 1 }, { unique: true });

export default mongoose.models.Chunk || mongoose.model<IChunk>('Chunk', ChunkSchema);
