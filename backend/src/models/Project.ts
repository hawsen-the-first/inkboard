import mongoose, { Document, Schema } from 'mongoose';

export interface IColumn {
  id: string;
  label: string;
}

export interface IProject extends Document {
  name: string;
  columns: IColumn[];
  createdAt: Date;
  updatedAt: Date;
}

const ColumnSchema = new Schema<IColumn>({ id: String, label: String }, { _id: false });

const ProjectSchema = new Schema<IProject>(
  {
    name: { type: String, required: true, trim: true },
    columns: { type: [ColumnSchema], default: [] },
  },
  { timestamps: true },
);

export default mongoose.model<IProject>('Project', ProjectSchema);
