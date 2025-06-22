import { registerUser, logoutUser } from "../controllers/user.controllers.js";
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

// Secured Routes
router.route("/logout").post(verifyJWT, logoutUser);

export default router