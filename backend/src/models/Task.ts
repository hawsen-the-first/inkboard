import mongoose, { Document, Schema } from 'mongoose';

export interface ISketch {
  imageData: string;
  createdAt: Date;
}

export interface ITask extends Document {
  title: string;
  description: string;
  status: string;
  projectId?: mongoose.Types.ObjectId | null;
  tags: mongoose.Types.ObjectId[];
  sketches: mongoose.Types.DocumentArray<ISketch & { _id: mongoose.Types.ObjectId }>;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const SketchSchema: Schema = new Schema({
  imageData: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const TaskSchema: Schema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    status: { type: String, default: 'todo' },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: false },
    tags: [{ type: Schema.Types.ObjectId, ref: 'Tag' }],
    sketches: [SketchSchema],
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export default mongoose.model<ITask>('Task', TaskSchema);
