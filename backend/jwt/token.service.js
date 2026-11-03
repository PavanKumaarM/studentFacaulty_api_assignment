const jwt = require("jsonwebtoken");

class TokenService {
    generateToken(payload) {
        const secretKey = process.env.JWT_SECRET;

        if (!secretKey) {
            throw new Error("JWT_SECRET is not configured");
        }

        return jwt.sign(payload, secretKey, {
            expiresIn: "1h"
        });
    }

    verifyToken(token) {
        const secretKey = process.env.JWT_SECRET;

        if (!secretKey) {
            throw new Error("JWT_SECRET is not configured");
        }

        return jwt.verify(token, secretKey);
    }
}

module.exports = new TokenService();