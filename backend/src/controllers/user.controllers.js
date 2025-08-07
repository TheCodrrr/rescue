import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js"
import { User } from "../models/user.models.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../../utils/cloudinary.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
// import bcrypt from "bcryptjs";

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);
    
        if (!user) {
            console.log(`The user with the id ${userId} was not found.`);
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

const registerUser = asyncHandler( async(req, res) => {
    // These are the 4 mandatory fields to create a new user
    const {email, name, password, phone} = req.body;

    // validation
    if (
        [name, email, password, phone].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = await User.findOne({
        $or: [
            { email },
            { phone: phone || null },
        ],
    });

    if (existedUser) {
        throw new ApiError(409, "User with this email or phone already exists!")
    }
    
    // console.log("FILES RECEIVED BY MULTER: ", req.files);
    // console.log(req.files?.avatar[0]?.path)
    // console.log(req.files?.coverImage[0]?.path)

    const profileLocalPath = req.files?.profileImage[0]?.path;
    
    if (!profileLocalPath) {
        throw new ApiError(400, "Avatar image is mandatory!")
    }

    const profileImage = await uploadOnCloudinary(profileLocalPath);
    

    try {
        // console.log("This are the user details: ");
        // console.log(name, email, password, profileImage);

        const user = await User.create({
            name,
            profileImage: profileImage?.url || "../public/temp/profile.png",
            email,
            password,
            phone,
        })
        // console.log("This is the user created: ");
        // console.log(user);

        const createdUser = await User.findById(user._id)
                                    .select("-password -refreshToken")
                                    .lean();

        if (!createdUser) {
            throw new ApiError(500, "Something went wrong while registering the user.")
        }

        return res
                .status(201)
                .json( new ApiResponse(200, createdUser, "User registered successfully") )
    } catch (error) {
        console.log("User creation failed.")
        console.error(error);

        if (profileImage) await deleteFromCloudinary(profileImage.public_id);

        throw new ApiError(500, "Something went wrong while registering a user and the images were deleted.")
    }

} )

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
                profile_image: profileImage.url
            }
        },
        {new: true}
    ).select("-password -refreshToken");

    res.status(200).json( new ApiResponse(200, user, "Avatar updated successfully"))
})

export {
    registerUser,
    loginUser,
    refreshAccessToken,
    logoutUser,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserProfileImage
}