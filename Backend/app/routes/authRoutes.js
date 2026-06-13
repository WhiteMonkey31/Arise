import express from "express";
import { register, login, getMe } from "../controllers/authController.js";
import { requireAuth } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/token", login);
router.get("/me", requireAuth, getMe);

export default router;
