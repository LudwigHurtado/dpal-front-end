
import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  handle: string;
  roles: string[];
}

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true },
  handle: { type: String, required: true, unique: true },
  roles: { type: [String], default: ['user'] }
});

export const User = model<IUser>('User', UserSchema);
