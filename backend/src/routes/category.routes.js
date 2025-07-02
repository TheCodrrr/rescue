import { getAllCategories } from "../controllers/category.controllers.js";
import { Router } from "express";

const router = Router();

router.get("/", getAllCategories);

export default router;