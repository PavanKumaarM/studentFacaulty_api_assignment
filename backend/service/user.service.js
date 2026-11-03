const bcrypt = require("bcrypt");
const mongoose = require("mongoose");

const User = require("../models/user.model");
const Profile = require("../models/user.profile.model");
const tokenService = require("../jwt/token.service");

class UserService {

    // SIGNUP
    async signup(userData) {
        const { name, email, password, role } = userData;

        if (!name || !email || !password) {
            const error = new Error("Name, email, and password are required");
            error.statusCode = 400;
            throw error;
        }

        if (!["student", "faculty"].includes(role)) {
            const error = new Error("Role must be student or faculty");
            error.statusCode = 400;
            throw error;
        }

        const normalizedEmail = email.trim().toLowerCase();

        const existingUser = await User.findOne({
            email: normalizedEmail
        });

        if (existingUser) {
            const error = new Error("Email already exists");
            error.statusCode = 409;
            throw error;
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword,
            role,
            isActive: true
        });

        return {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            isActive: user.isActive
        };
    }

    // LOGIN
    async login(email, password) {
        if (!email || !password) {
            const error = new Error("Email and password are required");
            error.statusCode = 400;
            throw error;
        }

        const user = await User.findOne({
            email: email.trim().toLowerCase()
        }).select("+password");

        if (!user) {
            const error = new Error("Invalid email or password");
            error.statusCode = 401;
            throw error;
        }

        if (!user.isActive) {
            const error = new Error("Account is inactive");
            error.statusCode = 403;
            throw error;
        }

        const isPasswordValid = await bcrypt.compare(
            password,
            user.password
        );

        if (!isPasswordValid) {
            const error = new Error("Invalid email or password");
            error.statusCode = 401;
            throw error;
        }

        const token = tokenService.generateToken({
            id: user._id.toString(),
            email: user.email,
            role: user.role,
            isActive: user.isActive
        });

        return {
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isActive: user.isActive
            },
            token
        };
    }

    // GET A USER BY ID
    async getUser(currentUserId, currentUserRole, targetUserId) {
        const targetUser = await this.checkUserPermission(
            currentUserId,
            currentUserRole,
            targetUserId
        );

        return targetUser;
    }

    // GET ALL FACULTY
    async getAllFaculty() {
        return await User.find({
            role: "faculty",
            isActive: true
        }).select("-password");
    }

    // GET ALL STUDENTS
    async getAllStudents() {
        return await User.find({
            role: "student",
            isActive: true
        }).select("-password");
    }

    // SOFT DELETE USER
    async softDeleteUser(currentUserId, targetUserId) {
        if (currentUserId.toString() !== targetUserId.toString()) {
            const error = new Error("You can delete only your own account");
            error.statusCode = 403;
            throw error;
        }

        const user = await User.findById(targetUserId);

        if (!user || !user.isActive) {
            const error = new Error("User not found or already inactive");
            error.statusCode = 404;
            throw error;
        }

        user.isActive = false;
        await user.save();

        return {
            message: "User account deactivated successfully"
        };
    }

    // CHECK PROFILE ACCESS PERMISSION
    async checkProfilePermission(
        currentUserId,
        currentUserRole,
        targetUserId
    ) {
        if (
            !mongoose.Types.ObjectId.isValid(currentUserId) ||
            !mongoose.Types.ObjectId.isValid(targetUserId)
        ) {
            const error = new Error("Invalid user ID");
            error.statusCode = 400;
            throw error;
        }

        const currentUser = await User.findOne({
            _id: currentUserId,
            isActive: true
        });

        if (!currentUser) {
            const error = new Error("Your account is not active");
            error.statusCode = 403;
            throw error;
        }

        if (currentUser.role !== currentUserRole) {
            const error = new Error("Invalid user role");
            error.statusCode = 403;
            throw error;
        }

        const targetUser = await User.findOne({
            _id: targetUserId,
            isActive: true
        });

        if (!targetUser) {
            const error = new Error("Target user not found or inactive");
            error.statusCode = 404;
            throw error;
        }

        const isOwnProfile =
            currentUser._id.toString() === targetUser._id.toString();

        // Students can access only their own profiles.
        if (currentUser.role === "student" && !isOwnProfile) {
            const error = new Error(
                "Students can access only their own profiles"
            );
            error.statusCode = 403;
            throw error;
        }

        // Faculty can access their own profiles and student profiles,
        // but not another faculty member's profile.
        if (
            currentUser.role === "faculty" &&
            !isOwnProfile &&
            targetUser.role !== "student"
        ) {
            const error = new Error(
                "Faculty cannot access another faculty member's profile"
            );
            error.statusCode = 403;
            throw error;
        }

        return targetUser;
    }

    // CREATE PROFILE
    async createProfile(
        currentUserId,
        currentUserRole,
        targetUserId,
        profileData
    ) {
        const targetUser = await this.checkProfilePermission(
            currentUserId,
            currentUserRole,
            targetUserId
        );

        const allowedFields = [
            "age",
            "dob",
            "phone",
            "address",
            "bio",
            "department"
        ];

        const filteredData = {};

        for (const field of allowedFields) {
            if (profileData[field] !== undefined) {
                filteredData[field] = profileData[field];
            }
        }

        const existingProfile = await Profile.findOne({
            user: targetUser._id
        });

        if (existingProfile) {
            const error = new Error("Profile already exists");
            error.statusCode = 409;
            throw error;
        }

        return await Profile.create({
            user: targetUser._id,
            ...filteredData
        });
    }

    // GET PROFILE
    async getProfile(
        currentUserId,
        currentUserRole,
        targetUserId
    ) {
        const targetUser = await this.checkProfilePermission(
            currentUserId,
            currentUserRole,
            targetUserId
        );

        const profile = await Profile.findOne({
            user: targetUser._id
        });

        if (!profile) {
            const error = new Error("Profile not found");
            error.statusCode = 404;
            throw error;
        }

        return profile;
    }

    // UPDATE PROFILE
    async updateProfile(
        currentUserId,
        currentUserRole,
        targetUserId,
        profileData
    ) {
        const targetUser = await this.checkProfilePermission(
            currentUserId,
            currentUserRole,
            targetUserId
        );

        const allowedFields = [
            "age",
            "dob",
            "phone",
            "address",
            "bio",
            "department"
        ];

        const filteredData = {};

        for (const field of allowedFields) {
            if (profileData[field] !== undefined) {
                filteredData[field] = profileData[field];
            }
        }

        const updatedProfile = await Profile.findOneAndUpdate(
            { user: targetUser._id },
            { $set: filteredData },
            {
                new: true,
                runValidators: true
            }
        );

        if (!updatedProfile) {
            const error = new Error("Profile not found");
            error.statusCode = 404;
            throw error;
        }

        return updatedProfile;
    }

    // HELPER: CHECK USER ACCESS PERMISSION
    async checkUserPermission(
        currentUserId,
        currentUserRole,
        targetUserId
    ) {
        if (
            !mongoose.Types.ObjectId.isValid(currentUserId) ||
            !mongoose.Types.ObjectId.isValid(targetUserId)
        ) {
            const error = new Error("Invalid user ID");
            error.statusCode = 400;
            throw error;
        }

        const currentUser = await User.findOne({
            _id: currentUserId,
            isActive: true
        });

        if (!currentUser) {
            const error = new Error("Your account is not active");
            error.statusCode = 403;
            throw error;
        }

        if (currentUser.role !== currentUserRole) {
            const error = new Error("Invalid user role");
            error.statusCode = 403;
            throw error;
        }

        const targetUser = await User.findOne({
            _id: targetUserId,
            isActive: true
        }).select("-password");

        if (!targetUser) {
            const error = new Error("User not found or inactive");
            error.statusCode = 404;
            throw error;
        }

        const isOwnAccount =
            currentUser._id.toString() === targetUser._id.toString();

        if (currentUserRole === "student" && !isOwnAccount) {
            const error = new Error(
                "Students can view only their own account"
            );
            error.statusCode = 403;
            throw error;
        }

        if (
            currentUserRole === "faculty" &&
            !isOwnAccount &&
            targetUser.role !== "student"
        ) {
            const error = new Error(
                "Faculty cannot view another faculty member's account"
            );
            error.statusCode = 403;
            throw error;
        }

        return targetUser;
    }
}

module.exports = new UserService();