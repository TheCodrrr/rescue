import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js"
import { User } from "../models/user.models.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../../utils/cloudinary.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);
    
        if (!user) {
            console.log(`The user with the id ${userId} was not found.`);
            return;
        }
    
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
    
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });
    
        return {accessToken, refreshToken};
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating access and refresh token.");
    }
}

const registerUser = asyncHandler( async(req, res) => {
    const {email, name, password} = req.body;

    // validation
    if (
        [name, email, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = await User.findOne({ email });

    if (existedUser) {
        throw new ApiError(409, "User with username or email already exists")
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
        const user = await User.create({
            name,
            profileImage: profileImage?.url || "../public/temp/profile.png",
            email,
            password
        })

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

        if (profileImage) await deleteFromCloudinary(profileImage.public_id);

        throw new ApiError(500, "Something went wrong while registering a user and the iamges were deleted.")
    }

} )

const loginUser = asyncHandler( async (req, res) => {
    const {email, name, password} = req.body;

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
    const {name, email} = req.body;
    if (!name || !email) throw new ApiError(400, "Fullname and email are required.");

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                name,
                email: email
            }
        },
        {new: true}
    ).select("-password -refreshToken");

    return res.status(200).json( new ApiResponse(200, user, "Account details updated successfully"))
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

// const getUserChannelProfile = asyncHandler( async (req, res) => {
//     const {username} = req.params;

//     if (!username?.trim()) throw new ApiError(400, "Username is required");

//     const channel = await User.aggregate([
//         {
//             $match: {
//                 username: username?.toLowerCase(),
//             },
//         },
//         {
//             $lookup: {
//                 from: "subscriptions",
//                 localField: "_id",
//                 foreignField: "channel",
//                 as: "subscribers"
//             },
//         },
//         {
//             $lookup: {
//                 from: "tweets",
//                 localField: "_id",
//                 foreignField: "subscriber",
//                 as: "subscribedTo"
//             }
//         },
//         {
//             $addFields: {
//                 subscribersCount: {
//                     $size: "$subscribers"
//                 },
//                 channelsSubscribedToCount: {
//                     $size: "$subscribedTo"
//                 },
//                 isSubscribed: {
//                     $cond: {
//                         if: {$in: [req.user?._id, "$subscribers.subscriber"]},
//                         then: true,
//                         else: false,
//                     }
//                 }
//             }
//         },
//         {
//             // Project only necessary data
//             $project: {
//                 fullName: 1,
//                 username: 1,
//                 avatar: 1,
//                 subscribersCount: 1,
//                 channelsSubscribedToCount: 1,
//                 isSubscribed: 1,
//                 coverImage: 1,
//                 email: 1,
//             }
//         }
//     ])

//     if (!channel?.length) throw new ApiError(404, "Channel not found");

//     return res.status(200).json( new ApiResponse(
//         200,
//         channel[0],
//         "Channel profile fetched successfully"
//     ))
// })
// const getWatchHistory = asyncHandler( async (req, res) => {
//     const user = await User.aggregate([
//         {
//             $match: {
//                 _id: new mongoose.Types.ObjectId(req.user?._id),
//             }
//         },
//         {
//             $lookup: {
//                 from: "videos",
//                 localField: "watchHistory",
//                 foreignField: "_id",
//                 as: "watchHistory",
//                 pipeline: [
//                     {
//                         $lookup: {
//                             from: "users",
//                             localField: "owner",
//                             foreignField: "_id",
//                             as: "owner",
//                             pipeline: [
//                                 {
//                                     $project: {
//                                         fullname: 1,
//                                         username: 1,
//                                         avatar: 1,
//                                     }
//                                 }
//                             ]
//                         }
//                     },
//                     {
//                         $addFields: {
//                             owner: {
//                                 $first: "$owner"
//                             }
//                         }
//                     }
//                 ]
//             }
//         }
//     ])

//     return res.status(200).json( new ApiResponse(200, user[0]?.watchHistory, "Watch history fetched successfully"))
// })

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