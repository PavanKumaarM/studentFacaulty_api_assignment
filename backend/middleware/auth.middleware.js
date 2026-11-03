const tokenService = require("../jwt/token.service");
const User = require("../models/user.model");

async function authMiddleware(req, res, next) {
    try {
        const authorization = req.headers.authorization;

        if (!authorization || !authorization.startsWith("Bearer ")) {
            return res.status(401).json({
                message: "Authentication token is required"
            });
        }

        const token = authorization.split(" ")[1];
        const decoded = tokenService.verifyToken(token);

        const user = await User.findById(decoded.id).select("-password");

        if (!user || user.isActive === false) {
            return res.status(401).json({
                message: "User not found or account is inactive"
            });
        }

        if (decoded.role !== user.role) {
            return res.status(401).json({
                message: "Invalid authentication token"
            });
        }

        req.user = user;

        next();
    } catch (error) {
        return res.status(401).json({
            message: "Invalid or expired token"
        });
    }
}

module.exports = { authMiddleware };