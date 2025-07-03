import { submitEvidence, getAllEvidence, getEvidenceByCategory, getEvidenceByUser, deleteEvidence } from "../controllers/evidence.controllers.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import express from "express";

const router = express.Router();

router.route("/")
    .post(verifyJWT, submitEvidence)
    .get(getAllEvidence);

router.get("/category/:categoryId", getEvidenceByCategory);
router.get("/user/:userId", getEvidenceByUser);
router.delete("/:evidenceId", verifyJWT, deleteEvidence);

export default router;