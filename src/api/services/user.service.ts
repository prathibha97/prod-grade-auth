import User from '../models/user.model';
import { IUser } from '../../types/user';

export const findUserById = async (id: string): Promise<IUser | null> => {
  return User.findById(id);
};

export const findUserByEmail = async (email: string): Promise<IUser | null> => {
  return User.findOne({ email });
};

export const updateUser = async (
  id: string,
  updateData: Partial<IUser>
): Promise<IUser | null> => {
  return User.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });
};

export const deleteUser = async (id: string): Promise<IUser | null> => {
  return User.findByIdAndDelete(id);
};
