import { 
    registerUser,
    logoutUser,
    loginUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserProfileImage
} from "../controllers/user.controllers.js";
import { Router } from "express";
import { upload } from "../middlewares/multer.middlewares.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = Router()

router.route("/register").post(
upload.fields([
    {
        name: "profileImage",
        maxCount: 1,
    },
]), registerUser);

router.route("/login").post(loginUser);

router.route("/refresh").post(refreshAccessToken);


// Secured Routes
router.route("/change-password").patch(verifyJWT, changeCurrentPassword);

router.route("/me").get(verifyJWT, getCurrentUser);

router.route("/update").patch(verifyJWT, updateAccountDetails);

router.patch("/update-profile-image", verifyJWT, upload.single("profileImage"), updateUserProfileImage);

router.route("/logout").post(verifyJWT, logoutUser);

export default router