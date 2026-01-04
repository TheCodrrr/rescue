import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js"
import { User } from "../models/user.models.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../../utils/cloudinary.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import redisClient from "../../utils/redisClient.js";
import path from "path";
import fs from "fs";
import sharp from "sharp";
import { Complaint } from "../models/complaint.models.js";
import { Escalation } from "../models/escalation.models.js";
import { Feedback } from "../models/feedback.models.js";
// import bcrypt from "bcryptjs";

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);
    
        if (!user) {
            // console.log(`The user with the id ${userId} was not found.`);
            return;
        }
    
        const accessToken = user.generateAccessToken();
        // console.log("Access Token generated: ", accessToken);
        const refreshToken = user.generateRefreshToken();
        // console.log("Refresh Token generated: ", refreshToken);
    
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });
    
        return {accessToken, refreshToken};
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating access and refresh token.");
    }
}

const registerUser = asyncHandler(async (req, res) => {
    const { email, name, password, phone, role, latitude, longitude, address, profileImage: profileImageUrlFromBody } = req.body;

    const { category, department_id } = role === "officer" ? req.body : { category: "", department_id: "" };

    // Set user level based on role
    let level = 0; // Default for citizens
    if (role === "officer") {
        // Officers can have levels 1-5, default to 1 if not provided
        level = req.body.level ? parseInt(req.body.level) : 1;
        // Validate officer level is between 1-5
        if (level < 1 || level > 5) {
            level = 1; // Reset to default if invalid
        }
    } else if (role === "admin") {
        level = 5; // Admins always have level 5
    }

    // Validation for empty fields (only for strings)
    if ([name, email, password, phone, role].some((field) => typeof field === "string" && field.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    // Additional validation for officers
    if (role === "officer") {
        if (!category || category.trim() === "") throw new ApiError(400, "Category is required for officer role");
        if (!department_id || department_id.trim() === "") throw new ApiError(400, "Department is required for officer role");
    }

    // console.log("The req.body is:", req.body);

    const existedUser = await User.findOne({
        $or: [{ email }, { phone: phone || null }],
    });

    if (existedUser) {
        throw new ApiError(409, "User with this email or phone already exists!");
    }

    // Handle profile image (file or string)
    const profileLocalPath = req.files?.profileImage?.[0]?.path;
    let imageUrl = null;

    if (profileLocalPath) {
        // Image uploaded as file
        const optimizedPath = path.join("public", "temp", `${Date.now()}-optimized.webp`);

        await sharp(profileLocalPath)
            .resize(300, 300, { fit: "cover", position: "center" })
            .webp({ quality: 80 })
            .toFile(optimizedPath);

        // Delete the original uploaded file
        try {
            if (fs.existsSync(profileLocalPath)) await fs.promises.unlink(profileLocalPath);
        } catch (error) {
            console.error("Error deleting original profile image:", error);
        }

        const profileImage = await uploadOnCloudinary(optimizedPath);

        // Delete the optimized file
        try {
            if (fs.existsSync(optimizedPath)) await fs.promises.unlink(optimizedPath);
        } catch (error) {
            console.error("Error deleting optimized profile image:", error);
        }

        imageUrl = profileImage?.secure_url || profileImage?.url || "../public/temp/profile.png";

        imageUrl = imageUrl.replace("/upload/", "/upload/f_auto,q_auto,w_300,h_300,c_fill/");
    } else if (profileImageUrlFromBody) {
        // Image provided as URL string
        imageUrl = profileImageUrlFromBody;
    } else {
        throw new ApiError(400, "Profile image is mandatory!");
    }

    try {
        const user = await User.create({
            name,
            profileImage: imageUrl,
            email,
            password,
            phone,
            role,
            user_level: level,
            ...(role === "officer" && { officer_category: category }),
            ...(role === "officer" && department_id && { department_id }),
            latitude: latitude || undefined,
            longitude: longitude || undefined,
            address: address || undefined,
        });

        const createdUser = await User.findById(user._id)
            .select("-password -refreshToken")
            .lean();

        if (!createdUser) throw new ApiError(500, "Something went wrong while registering the user.");

        return res.status(201).json(new ApiResponse(200, createdUser, "User registered successfully"));
    } catch (error) {
        // console.log("User creation failed.");
        console.error(error);
        throw new ApiError(500, "Something went wrong while registering a user.");
    }
});


const loginUser = asyncHandler( async (req, res) => {
    const {email, password} = req.body;

    if (!email) throw new ApiError(400, "Email is required");

    const user = await User.findOne({ email });

    if (!user) throw new ApiError(404, "User not found.");

    // validate password
    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) throw new ApiError(401, "Invalid credentials");

    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id);

    const loggedInUser = await User.findById(user._id)
                                                .select("-password -refreshToken");

    if (!loggedInUser) throw new ApiError(401, "Login failed!");

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
    }

    return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json( new ApiResponse(
                200,
                { user: loggedInUser, accessToken, refreshToken },
                "User logged in successfully"
            ));
})

const logoutUser = asyncHandler( async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined,
            }
        },
        {new: true}
    )

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
    }

    return res
            .status(200)
            .clearCookie("accessToken", options)
            .clearCookie("refreshToken", options)
            .json( new ApiResponse(200, "User logged out successfully"))
})

const refreshAccessToken = asyncHandler( async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!refreshAccessToken) throw new ApiError(401, "Refresh token is required.");

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )

        const user = await User.findById(decodedToken?._id);

        if (!user) throw new ApiError(401, "Invalid refresh token");

        if (incomingRefreshToken !== user?.refreshToken) throw new ApiError(401, "Invalid refresh token");

        const options = {
            httpOnly: true,
            secure: process.env.NODE_ENV = "production",
        }

        const {accessToken, refreshToken: newRefreshToken} = await generateAccessAndRefreshToken(user._id)

        return res
                .status(200)
                .cookie("accessToken", accessToken, options)
                .cookie("refreshToken", newRefreshToken, options)
                .json( new ApiResponse(
                        200,
                        {
                            accessToken,
                            refreshToken: newRefreshToken
                        },
                        "Access token refreshed successfully"
                    ));
    } catch (error) {
        throw new ApiError(500, "Something went wrong while refreshing access token")
    }
} )

const changeCurrentPassword = asyncHandler( async (req, res) => {
    const {oldPassword, newPassword} = req.body;

    const user = await User.findById(req.user?._id)

    const isPasswordValid = await user.isPasswordCorrect(oldPassword);
    if (!isPasswordValid) throw new ApiError(401, "Old password is incorrect");

    user.password = newPassword;

    await user.save({ validateBeforeSave: false });

    return res.status(200).json( new ApiResponse(200, {}, "Password changed successfully"))
})
const getCurrentUser = asyncHandler( async (req, res) => {
    return res.status(200).json( new ApiResponse(200, req.user, "Current user details"))
})
const updateAccountDetails = asyncHandler( async (req, res) => {
    const {name, email, phone, latitude, longitude, address} = req.body;
    if (!name || !email || !phone) throw new ApiError(400, "Fullname and email are required.");

    const user = await User.findById(req.user?._id);

    if (!user) throw new ApiError(404, "User not found.");

    user.name = name;

    if (email !== user.email) {
        user.email = email;
        user.isEmailVerified = false; // Reset verification status if email is changed
    }

    if (phone !== user.phone) {
        user.phone = phone;
        user.isPhoneVerified = false;
    }

    if (latitude !== undefined) {
        user.latitude = latitude;
    }
    if (longitude !== undefined) {
        user.longitude = longitude;
    }

    if (address !== undefined) {
        user.address = address;
    }

    await user.save();

    const updatedUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    return res.status(200).json( new ApiResponse(200, updatedUser, "Account details updated successfully"))
})
const updateUserProfileImage = asyncHandler( async (req, res) => {
    const profileLocalPath = req.file?.path;

    if (!profileLocalPath) throw new ApiError(400, "File is required.");

    const profileImage = await uploadOnCloudinary(profileLocalPath);
    if (!profileImage.url) throw new ApiError(500, "Something went wrong while uploading avatar");

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                profileImage: profileImage.url
            }
        },
        {new: true}
    ).select("-password -refreshToken");

    res.status(200).json( new ApiResponse(200, user, "Avatar updated successfully"))
})

const deleteUser = asyncHandler( async(req, res) => {
    const userId = req.user?._id;

    const user = await User.findByIdAndDelete(userId);

    if (!user) throw new ApiError(404, "User not found.");
    if (user.profileImage) {
        try {
            const publicId = user.profileImage.split("/").pop().split(".")[0];
            await deleteFromCloudinary(publicId);
        } catch (error) {
            console.error("Error deleting user profile image:", error);
            
        }
    }

    await Complaint.deleteMany({ user_id: userId });
    await Escalation.deleteMany({ escalated_by: userId });
    await Feedback.deleteMany({ user_id: userId });

    await Complaint.updateMany(
        { assigned_officer_id: userId },
        { $unset: { assigned_officer_id: "" } }
    )

    await User.findByIdAndDelete(userId);

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
    }

    return res
            .status(200)
            .clearCookie("accessToken", options)
            .clearCookie("refreshToken", options)
            .json( new ApiResponse(200, {}, "User and associated data deleted successfully."))
})

const createNotification = async (userId, notificationData) => {
    try {
        const notificationKey = `notification:${userId}:escalations`;

        await redisClient.lPush(notificationKey, JSON.stringify(notificationData));

        await redisClient.expire(notificationKey, 30 * 60);
        return true;
    } catch (error) {
        throw new ApiError(500, "Notification creation failed")
    }
}

const getUserNotifications = asyncHandler(async (req, res) => {
    const userId = req.user._id.toString();
    const notificationKey = `notification:${userId}:escalations`;

    const notifications = await redisClient.lRange(notificationKey, 0, -1);

    if (!notifications || notifications.length === 0) {
        return res.status(200).json({
            success: true,
            data: [],
            message: "No notifications found.",
        });
    }

    const parsedNotifications = notifications.map((notif) => JSON.parse(notif));

    return res.status(200).json({
        success: true,
        data: parsedNotifications,
    })
})

const deleteUserNotification = asyncHandler(async (req, res) => {
    const userId = req.user._id.toString();
    const { index } = req.params;
    const notificationKey = `notification:${userId}:escalations`;

    const notifications = await redisClient.lRange(notificationKey, 0, -1);

    if (!notifications || notifications.length === 0) {
        throw new ApiError(404, "No notifications found for this user.");
    }

    const notifToDelete = notifications[index];
    if (!notifToDelete) {
        throw new ApiError(404, "Notification not found.");
    }

    await redisClient.lRem(notificationKey, 1, notifToDelete);

    return res.status(200).json({
        success: true,
        message: "Notification deleted successfully.",
    });
});

export {
    registerUser,
    loginUser,
    refreshAccessToken,
    logoutUser,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserProfileImage,
    deleteUser,
    createNotification,
    getUserNotifications,
    deleteUserNotification,
}