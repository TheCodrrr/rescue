import jwt from "jsonwebtoken"

const access_token_secret = process.env.ACCESS_TOKEN_SECRET
const refresh_token_secret = process.env.REFRESH_TOKEN_SECRET

exports.generateAccessToken = (payload) => {
    return jwt.sign(payload, access_token_secret, { expiresIn: '15m' });
}
exports.generateRefreshToken = (payload) => {
    return jwt.sign(payload, refresh_token_secret, { expiresIn: '7d' });
}

exports.verifyAccessToken = (token) => {
    return jwt.verify(token, access_token_secret);
}
exports.verifyRefreshToken = (token) => {
    return jwt.verify(token, refresh_token_secret);
}