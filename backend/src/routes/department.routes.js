import { createDepartment, getAllDepartments, getDepartmentById, updateDepartment, deleteDepartment, getDepartmentsByCategory, validateDepartmentSecret } from "../controllers/department.controllers.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { Router } from "express";

const router = Router();

router.route("/")
    .post(verifyJWT, createDepartment)
    .get(getAllDepartments);

router.route("/:departmentId")
    .get(getDepartmentById)
    .patch(verifyJWT, updateDepartment)
    .delete(verifyJWT, deleteDepartment);

router.route("/category/:category")
    .get(getDepartmentsByCategory);

router.post("/validate-secret", validateDepartmentSecret);

export default router;