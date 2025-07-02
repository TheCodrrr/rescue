import { createDepartment, getAllDepartments, getDepartmentById, updateDepartment, deleteDepartment, getDepartmentsByCategory } from "../controllers/department.controllers.js";
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

router.route("/category/:categoryId")
    .get(getDepartmentsByCategory);


export default router;