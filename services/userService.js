import User from '../models/User.js';
import bcrypt from 'bcryptjs';

export const createUser = async (data) => {
	const existing = await User.findOne({ email: data.email.toLowerCase() });
	if (existing) throw new Error('Email already in use');

	const password = data.password || Math.random().toString(36).slice(-8);
	const salt = await bcrypt.genSalt(10);
	const hash = await bcrypt.hash(password, salt);

	const user = new User({
		name: data.name,
		email: data.email.toLowerCase(),
		password: hash,
		role: data.role,
	});

	await user.save();
	const obj = user.toObject();
	delete obj.password;
	return obj;
};

export const getUsers = async ({ page = 1, limit = 10, search = '', role }) => {
	const q = {};
	if (search) {
		const re = new RegExp(search, 'i');
		q.$or = [{ name: re }, { email: re }];
	}
	if (role) q.role = role;

	const skip = (page - 1) * limit;
	const [items, total] = await Promise.all([
		User.find(q).select('-password').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit, 10)),
		User.countDocuments(q),
	]);

	return {
		items,
		total,
		page: parseInt(page, 10),
		pages: Math.ceil(total / limit || 1),
	};
};

export const getUserById = async (id) => {
	const user = await User.findById(id).select('-password');
	if (!user) throw new Error('User not found');
	return user;
};

export const updateUser = async (id, data) => {
	const update = { ...data };
	if (update.password) {
		const salt = await bcrypt.genSalt(10);
		update.password = await bcrypt.hash(update.password, salt);
	}
	const user = await User.findByIdAndUpdate(id, update, { new: true }).select('-password');
	if (!user) throw new Error('User not found');
	return user;
};

export const deleteUser = async (id) => {
	const user = await User.findByIdAndDelete(id);
	if (!user) throw new Error('User not found');
	return true;
};

export default {
	createUser,
	getUsers,
	getUserById,
	updateUser,
	deleteUser,
};
