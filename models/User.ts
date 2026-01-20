import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  _id: string; // Operative ID as string
  email: string;
  handle: string;
  roles: string[];
}

const UserSchema = new Schema<IUser>({
  _id: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  handle: { type: String, required: true, unique: true },
  roles: { type: [String], default: ['user'] }
}, { _id: false });

export const User = model<IUser>('User', UserSchema);