import { addGuidance, getAllGuidance, getGuidanceByCategory, verifyGuidance, deleteGuidance } from "../controllers/guidance.controllers";

router.route("/")
    .post(verifyJWT, addGuidance)
    .get(getAllGuidance);

router.get("/category/:categoryId", getGuidanceByCategory);
router.patch("/:guidanceId/verify", verifyJWT, verifyGuidance);
router.delete("/:guidanceId", verifyJWT, deleteGuidance);