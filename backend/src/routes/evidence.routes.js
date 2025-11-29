import { submitEvidence, getAllEvidence, getEvidenceByComplaint, getEvidenceByUser, deleteEvidence } from "../controllers/evidence.controllers.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { upload } from "../middlewares/multer.middlewares.js";
import express from "express";

const router = express.Router();

router.route("/")
    .post(verifyJWT, upload.single('file'), submitEvidence)
    .get(getAllEvidence);

router.get("/complaint/:complaintId", getEvidenceByComplaint);
router.get("/user/:userId", getEvidenceByUser);
router.delete("/:evidenceId", verifyJWT, deleteEvidence);

export default router;