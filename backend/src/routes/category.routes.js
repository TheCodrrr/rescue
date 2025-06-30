import { getAllCategories } from "../controllers/category.controllers";

router.get("/", getAllCategories);