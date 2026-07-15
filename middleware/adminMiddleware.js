export const adminMiddleware = (req, res, next) => {
	const user = req.user;
	if (!user || !user.role) {
		return res.status(403).json({ message: 'Forbidden: No role present' });
	}

	const allowed = [
		'System Administrator',
		'Merchant Administrator',
		'Admin'
	];

	if (!allowed.includes(user.role)) {
		return res.status(403).json({ message: 'Forbidden: Admins only' });
	}

	return next();
};

export default adminMiddleware;
