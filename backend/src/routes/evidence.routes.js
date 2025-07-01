import { submitEvidence, getAllEvidence, getEvidenceByCategory, getEvidenceByUser, deleteEvidence } from "../controllers/evidence.controllers";

router.route("/")
    .post(verifyJWT, submitEvidence)
    .get(getAllEvidence);

router.get("/category/:categoryId", getEvidenceByCategory);
router.get("/user/:userId", getEvidenceByUser);
router.delete("/:evidenceId", verifyJWT, deleteEvidence);