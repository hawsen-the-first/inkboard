import mongoose, { Document, Schema } from 'mongoose';

export interface ITag extends Document {
  name: string;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

const TagSchema: Schema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    color: { type: String, default: '#6366f1' },
  },
  { timestamps: true },
);

export default mongoose.model<ITag>('Tag', TagSchema);
