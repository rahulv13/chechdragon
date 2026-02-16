
import mongoose, { Schema, Document } from 'mongoose';

export interface IImage extends Document {
  userId: string;
  data: Buffer;
  contentType: string;
  createdAt: Date;
}

const ImageSchema: Schema = new Schema({
  userId: { type: String, required: true },
  data: { type: Buffer, required: true },
  contentType: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Image || mongoose.model<IImage>('Image', ImageSchema);
