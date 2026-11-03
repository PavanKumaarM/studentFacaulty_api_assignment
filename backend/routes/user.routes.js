const express = require("express");
const router = express.Router();

const userController = require("../controllers/user.controller");
const { authMiddleware } = require("../middleware/auth.middleware");

router.post("/signup", userController.signup);
router.post("/login", userController.login);

router.get("/getUser/:userId", authMiddleware, userController.getUser);
router.get("/getAllFaculty", authMiddleware, userController.getAllFaculty);
router.get("/getAllStudents", authMiddleware, userController.getAllStudents);

router.patch("/softDelete/:userId", authMiddleware, userController.softDeleteUser);

router.post("/profile/:userId", authMiddleware, userController.createProfile);
router.get("/profile/:userId", authMiddleware, userController.getProfile);
router.patch("/profile/:userId", authMiddleware, userController.updateProfile);

module.exports = router;