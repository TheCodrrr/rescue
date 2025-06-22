import bcrypt from "bcryptjs"
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../../utils/jwt.js"
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { User } from "../models/user.models.js";

let users = [];
let refreshToken = [];

exports.generateAccessAndRefreshToken = asyncHandler( async (userId) => {
    const user = await User.findById(userId);

    if (!user) ApiError(500, "Something went wrong while generating the access and refresh token.");

} )