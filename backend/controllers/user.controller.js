const userService = require("../service/user.service");

class UserController {

    constructor() {
        this.userService = userService;

        // Bind methods so `this` works when Express calls them.
        this.signup = this.signup.bind(this);
        this.login = this.login.bind(this);
        this.getUser = this.getUser.bind(this);
        this.getAllFaculty = this.getAllFaculty.bind(this);
        this.getAllStudents = this.getAllStudents.bind(this);
        this.softDeleteUser = this.softDeleteUser.bind(this);
        this.createProfile = this.createProfile.bind(this);
        this.getProfile = this.getProfile.bind(this);
        this.updateProfile = this.updateProfile.bind(this);
    }

    // SIGNUP
    async signup(req, res) {
        try {
            const user = await this.userService.signup(req.body);

            return res.status(201).json({
                message: "User registered successfully",
                user
            });
        } catch (error) {
            return res.status(error.statusCode || 500).json({
                message: error.message || "Signup failed"
            });
        }
    }

    // LOGIN
    async login(req, res) {
        try {
            const { email, password } = req.body;

            const result = await this.userService.login(
                email,
                password
            );

            return res.status(200).json({
                message: "Login successful",
                user: result.user,
                token: result.token
            });
        } catch (error) {
            return res.status(error.statusCode || 500).json({
                message: error.message || "Login failed"
            });
        }
    }

    // GET USER BY ID
    async getUser(req, res) {
        try {
            const user = await this.userService.getUser(
                req.user._id,
                req.user.role,
                req.params.userId
            );

            return res.status(200).json({
                message: "User retrieved successfully",
                user
            });
        } catch (error) {
            return res.status(error.statusCode || 500).json({
                message: error.message || "Failed to retrieve user"
            });
        }
    }

    // GET ALL FACULTY
    async getAllFaculty(req, res) {
        try {
            const faculty = await this.userService.getAllFaculty();

            return res.status(200).json({
                message: "Faculty retrieved successfully",
                count: faculty.length,
                faculty
            });
        } catch (error) {
            return res.status(error.statusCode || 500).json({
                message: error.message || "Failed to retrieve faculty"
            });
        }
    }

    // GET ALL STUDENTS
    async getAllStudents(req, res) {
        try {
            const students = await this.userService.getAllStudents();

            return res.status(200).json({
                message: "Students retrieved successfully",
                count: students.length,
                students
            });
        } catch (error) {
            return res.status(error.statusCode || 500).json({
                message: error.message || "Failed to retrieve students"
            });
        }
    }

    // SOFT DELETE USER
    async softDeleteUser(req, res) {
        try {
            const result = await this.userService.softDeleteUser(
                req.user._id,
                req.params.userId
            );

            return res.status(200).json(result);
        } catch (error) {
            return res.status(error.statusCode || 500).json({
                message: error.message || "Failed to deactivate account"
            });
        }
    }

    // CREATE PROFILE
    async createProfile(req, res) {
        try {
            const profile = await this.userService.createProfile(
                req.user._id,
                req.user.role,
                req.params.userId,
                req.body
            );

            return res.status(201).json({
                message: "Profile created successfully",
                profile
            });
        } catch (error) {
            return res.status(error.statusCode || 500).json({
                message: error.message || "Failed to create profile"
            });
        }
    }

    // GET PROFILE
    async getProfile(req, res) {
        try {
            const profile = await this.userService.getProfile(
                req.user._id,
                req.user.role,
                req.params.userId
            );

            return res.status(200).json({
                message: "Profile retrieved successfully",
                profile
            });
        } catch (error) {
            return res.status(error.statusCode || 500).json({
                message: error.message || "Failed to retrieve profile"
            });
        }
    }

    // UPDATE PROFILE
    async updateProfile(req, res) {
        try {
            const profile = await this.userService.updateProfile(
                req.user._id,
                req.user.role,
                req.params.userId,
                req.body
            );

            return res.status(200).json({
                message: "Profile updated successfully",
                profile
            });
        } catch (error) {
            return res.status(error.statusCode || 500).json({
                message: error.message || "Failed to update profile"
            });
        }
    }
}

module.exports = new UserController();