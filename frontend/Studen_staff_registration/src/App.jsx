import { useEffect, useState } from "react";
import { apiRequest } from "./api";
import "./App.css";

const EMPTY_PROFILE = {
    age: "",
    dob: "",
    phone: "",
    address: "",
    bio: "",
    department: "",
};

function getId(user) {
    return user?._id || user?.id || "";
}

function getUserFromResponse(data) {
    return data?.user || data?.data?.user || data?.data || null;
}

function getListFromResponse(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.users)) return data.users;
    if (Array.isArray(data?.students)) return data.students;
    if (Array.isArray(data?.faculty)) return data.faculty;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.data?.users)) return data.data.users;
    if (Array.isArray(data?.data?.students)) return data.data.students;

    return [];
}

function getProfileFromResponse(data) {
    return data?.profile || data?.data?.profile || data?.data || data;
}

function App() {
    const [user, setUser] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem("user")) || null;
        } catch {
            return null;
        }
    });

    const [mode, setMode] = useState("login");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [loginForm, setLoginForm] = useState({
        email: "",
        password: "",
    });

    const [signupForm, setSignupForm] = useState({
        name: "",
        email: "",
        password: "",
        role: "student",
    });

    const [students, setStudents] = useState([]);
    const [faculty, setFaculty] = useState([]);

    // The user whose profile is currently open.
    const [selectedUser, setSelectedUser] = useState(null);

    const [profile, setProfile] = useState(EMPTY_PROFILE);
    const [profileExists, setProfileExists] = useState(false);
    const [profileLoading, setProfileLoading] = useState(false);
    const [savingProfile, setSavingProfile] = useState(false);

    const [studentSearch, setStudentSearch] = useState("");
    const [activeTab, setActiveTab] = useState("profile");

    const isFaculty = user?.role === "faculty";
    const ownUserId = getId(user);
    const selectedUserId = getId(selectedUser);

    useEffect(() => {
        if (user && localStorage.getItem("token")) {
            loadOwnProfile();
            if (user.role === "faculty") {
                loadStudents();
                loadFaculty();
            }
        }
        // Initial authenticated session setup.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function showMessage(message, type = "success") {
        setError(type === "error" ? message : "");
        setSuccess(type === "success" ? message : "");
    }

    function resetMessages() {
        setError("");
        setSuccess("");
    }

    async function handleLogin(event) {
        event.preventDefault();
        resetMessages();
        setLoading(true);

        try {
            const data = await apiRequest("/login", {
                method: "POST",
                body: JSON.stringify(loginForm),
            });

            const loggedInUser =
                getUserFromResponse(data) ||
                data?.data?.user ||
                null;

            const token =
                data?.token ||
                data?.data?.token;

            if (!token || !loggedInUser) {
                throw new Error(
                    "Login response must contain both a user and a token."
                );
            }

            localStorage.setItem("token", token);
            localStorage.setItem("user", JSON.stringify(loggedInUser));

            setUser(loggedInUser);
            setLoginForm({ email: "", password: "" });
            setActiveTab("profile");

            showMessage("Login successful.");

            await loadProfileForUser(loggedInUser, true);

            if (loggedInUser.role === "faculty") {
                await loadStudents();
                await loadFaculty();
            }
        } catch (err) {
            showMessage(err.message || "Unable to log in.", "error");
        } finally {
            setLoading(false);
        }
    }

    async function handleSignup(event) {
        event.preventDefault();
        resetMessages();
        setLoading(true);

        try {
            await apiRequest("/signup", {
                method: "POST",
                body: JSON.stringify({
                    name: signupForm.name.trim(),
                    email: signupForm.email.trim().toLowerCase(),
                    password: signupForm.password,
                    role: signupForm.role,
                }),
            });

            setMode("login");
            setLoginForm({
                email: signupForm.email.trim().toLowerCase(),
                password: "",
            });

            setSignupForm({
                name: "",
                email: "",
                password: "",
                role: "student",
            });

            showMessage("Account created. Please log in.");
        } catch (err) {
            showMessage(err.message || "Unable to create account.", "error");
        } finally {
            setLoading(false);
        }
    }

    async function loadStudents() {
        try {
            const data = await apiRequest("/getAllStudents");
            setStudents(getListFromResponse(data));
        } catch (err) {
            showMessage(err.message || "Unable to load students.", "error");
        }
    }

    async function loadFaculty() {
        try {
            const data = await apiRequest("/getAllFaculty");
            setFaculty(getListFromResponse(data));
        } catch (err) {
            showMessage(err.message || "Unable to load faculty.", "error");
        }
    }

    async function loadOwnProfile() {
        if (!user) return;
        await loadProfileForUser(user, true);
    }

    async function loadProfileForUser(targetUser, isOwnProfile = false) {
        if (!targetUser) return;

        setSelectedUser(targetUser);
        setProfile(EMPTY_PROFILE);
        setProfileExists(false);
        setProfileLoading(true);
        resetMessages();

        try {
            const targetId = getId(targetUser);

            if (!targetId) {
                throw new Error("The selected user does not have a valid ID.");
            }

            // Requires GET /api/user/profile/:userId on the backend.
            const data = await apiRequest(`http://localhost:3000/api/user/profile/${targetId}`);

            const profileData = getProfileFromResponse(data);

            if (profileData && profileData.user) {
                setProfile({
                    age: profileData.age ?? "",
                    dob: profileData.dob
                        ? String(profileData.dob).slice(0, 10)
                        : "",
                    phone: profileData.phone ?? "",
                    address: profileData.address ?? "",
                    bio: profileData.bio ?? "",
                    department: profileData.department ?? "",
                });

                setProfileExists(true);
            } else {
                // A missing profile can be created using the profile form.
                setProfile(EMPTY_PROFILE);
                setProfileExists(false);
            }
        } catch (err) {
            /*
             * A 404 can mean the student has not created a profile yet.
             * In that case, display a blank form.
             */
            if (err.message?.includes("404")) {
                setProfile(EMPTY_PROFILE);
                setProfileExists(false);
            } else {
                setProfile(EMPTY_PROFILE);
                setProfileExists(false);

                if (isOwnProfile) {
                    showMessage(
                        "Could not retrieve the profile. Verify that GET /profile/:userId exists on the backend.",
                        "error"
                    );
                } else {
                    showMessage(
                        err.message || "Could not load the selected profile.",
                        "error"
                    );
                }
            }
        } finally {
            setProfileLoading(false);
        }
    }

    function handleProfileChange(event) {
        const { name, value } = event.target;

        setProfile((previous) => ({
            ...previous,
            [name]: value,
        }));
    }

    async function handleProfileSubmit(event) {
        event.preventDefault();
        resetMessages();

        if (!selectedUserId) {
            showMessage("Please select a user.", "error");
            return;
        }

        // Frontend permission check; the backend must enforce this too.
        if (!isFaculty && selectedUserId !== ownUserId) {
            showMessage(
                "Students can edit only their own profile.",
                "error"
            );
            return;
        }

        if (
            isFaculty &&
            selectedUserId !== ownUserId &&
            selectedUser?.role !== "student"
        ) {
            showMessage(
                "Faculty can edit their own profile or a student's profile.",
                "error"
            );
            return;
        }

        const payload = {
            ...profile,
            age: profile.age === "" ? undefined : Number(profile.age),
        };

        Object.keys(payload).forEach((key) => {
            if (payload[key] === undefined || payload[key] === "") {
                delete payload[key];
            }
        });

        setSavingProfile(true);

        try {
            const endpoint = `/profile/${selectedUserId}`;

            const data = await apiRequest(endpoint, {
                method: profileExists ? "PATCH" : "POST",
                body: JSON.stringify(payload),
            });

            setProfileExists(true);

            const returnedProfile = getProfileFromResponse(data);

            if (returnedProfile && returnedProfile.user) {
                setProfile({
                    age: returnedProfile.age ?? "",
                    dob: returnedProfile.dob
                        ? String(returnedProfile.dob).slice(0, 10)
                        : "",
                    phone: returnedProfile.phone ?? "",
                    address: returnedProfile.address ?? "",
                    bio: returnedProfile.bio ?? "",
                    department: returnedProfile.department ?? "",
                });
            }

            showMessage(
                profileExists
                    ? "Profile updated successfully."
                    : "Profile created successfully."
            );

            if (isFaculty) {
                await loadStudents();
            }
        } catch (err) {
            showMessage(
                err.message || "Unable to save the profile.",
                "error"
            );
        } finally {
            setSavingProfile(false);
        }
    }

    async function handleDeactivateAccount() {
        const confirmed = window.confirm(
            "Are you sure you want to deactivate your account? You will be logged out."
        );

        if (!confirmed) return;

        resetMessages();

        try {
            await apiRequest(`/softDelete/${ownUserId}`, {
                method: "PATCH",
            });

            logout();
        } catch (err) {
            showMessage(
                err.message || "Unable to deactivate the account.",
                "error"
            );
        }
    }

    function logout() {
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        setUser(null);
        setStudents([]);
        setFaculty([]);
        setSelectedUser(null);
        setProfile(EMPTY_PROFILE);
        setProfileExists(false);
        setActiveTab("profile");
        setMode("login");
        resetMessages();
    }

    function openOwnProfile() {
        setActiveTab("profile");
        loadProfileForUser(user, true);
    }

    function openStudent(student) {
        setActiveTab("profile");
        loadProfileForUser(student, false);
    }

    const filteredStudents = students.filter((student) => {
        const query = studentSearch.toLowerCase();

        return (
            (student.name || "").toLowerCase().includes(query) ||
            (student.email || "").toLowerCase().includes(query) ||
            (student.department || "").toLowerCase().includes(query)
        );
    });

    if (!user) {
        return (
            <main className="auth-page">
                <section className="auth-card">
                    <div className="brand-mark">SF</div>

                    <h1>Student Faculty Portal</h1>

                    <p className="auth-subtitle">
                        Manage your account and academic profile.
                    </p>

                    <div className="auth-tabs">
                        <button
                            type="button"
                            className={mode === "login" ? "active" : ""}
                            onClick={() => {
                                setMode("login");
                                resetMessages();
                            }}
                        >
                            Login
                        </button>

                        <button
                            type="button"
                            className={mode === "signup" ? "active" : ""}
                            onClick={() => {
                                setMode("signup");
                                resetMessages();
                            }}
                        >
                            Sign Up
                        </button>
                    </div>

                    {error && <div className="alert error">{error}</div>}
                    {success && (
                        <div className="alert success">{success}</div>
                    )}

                    {mode === "login" ? (
                        <form onSubmit={handleLogin} className="auth-form">
                            <label>Email Address</label>
                            <input
                                type="email"
                                required
                                value={loginForm.email}
                                onChange={(event) =>
                                    setLoginForm({
                                        ...loginForm,
                                        email: event.target.value,
                                    })
                                }
                                placeholder="Enter your email"
                            />

                            <label>Password</label>
                            <input
                                type="password"
                                required
                                value={loginForm.password}
                                onChange={(event) =>
                                    setLoginForm({
                                        ...loginForm,
                                        password: event.target.value,
                                    })
                                }
                                placeholder="Enter your password"
                            />

                            <button
                                className="primary-button full-width"
                                disabled={loading}
                            >
                                {loading ? "Logging in..." : "Login"}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleSignup} className="auth-form">
                            <label>Full Name</label>
                            <input
                                type="text"
                                required
                                value={signupForm.name}
                                onChange={(event) =>
                                    setSignupForm({
                                        ...signupForm,
                                        name: event.target.value,
                                    })
                                }
                                placeholder="Enter your full name"
                            />

                            <label>Register As</label>
                            <select
                                value={signupForm.role}
                                onChange={(event) =>
                                    setSignupForm({
                                        ...signupForm,
                                        role: event.target.value,
                                    })
                                }
                            >
                                <option value="student">Student</option>
                                <option value="faculty">Faculty</option>
                            </select>

                            <label>Email Address</label>
                            <input
                                type="email"
                                required
                                value={signupForm.email}
                                onChange={(event) =>
                                    setSignupForm({
                                        ...signupForm,
                                        email: event.target.value,
                                    })
                                }
                                placeholder="Enter your email"
                            />

                            <label>Password</label>
                            <input
                                type="password"
                                required
                                minLength="6"
                                value={signupForm.password}
                                onChange={(event) =>
                                    setSignupForm({
                                        ...signupForm,
                                        password: event.target.value,
                                    })
                                }
                                placeholder="Create a password"
                            />

                            <button
                                className="primary-button full-width"
                                disabled={loading}
                            >
                                {loading ? "Creating account..." : "Create Account"}
                            </button>
                        </form>
                    )}

                    <p className="auth-footer">
                        Secure access for students and faculty
                    </p>
                </section>
            </main>
        );
    }

    return (
        <div className="portal">
            <aside className="sidebar">
                <div className="sidebar-brand">
                    <div className="brand-mark small">SF</div>
                    <div>
                        <strong>Campus Portal</strong>
                        <span>Academic management</span>
                    </div>
                </div>

                <div className="sidebar-user">
                    <div className="avatar">
                        {(user.name || "U").charAt(0).toUpperCase()}
                    </div>
                    <div className="sidebar-user-info">
                        <strong>{user.name}</strong>
                        <span className="role-badge">{user.role}</span>
                    </div>
                </div>

                <p className="sidebar-heading">WORKSPACE</p>

                <button
                    className={`nav-item ${activeTab === "profile" ? "selected" : ""}`}
                    onClick={openOwnProfile}
                >
                    <span>◉</span> My Profile
                </button>

                {isFaculty && (
                    <>
                        <button
                            className={`nav-item ${activeTab === "students" ? "selected" : ""}`}
                            onClick={() => setActiveTab("students")}
                        >
                            <span>▦</span> Students
                            <span className="nav-count">{students.length}</span>
                        </button>

                        <button
                            className={`nav-item ${activeTab === "faculty" ? "selected" : ""}`}
                            onClick={() => setActiveTab("faculty")}
                        >
                            <span>♙</span> Faculty
                        </button>
                    </>
                )}

                <div className="sidebar-bottom">
                    <button className="nav-item logout-button" onClick={logout}>
                        <span>↪</span> Logout
                    </button>
                </div>
            </aside>

            <main className="main-content">
                <header className="topbar">
                    <div>
                        <p className="eyebrow">STUDENT FACULTY PORTAL</p>
                        <h1>
                            {activeTab === "students"
                                ? "Student Directory"
                                : activeTab === "faculty"
                                  ? "Faculty Directory"
                                  : "My Academic Profile"}
                        </h1>
                    </div>

                    <div className="topbar-user">
                        <div className="avatar small-avatar">
                            {(user.name || "U").charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <strong>{user.name}</strong>
                            <span>{user.role}</span>
                        </div>
                    </div>
                </header>

                {error && <div className="alert error">{error}</div>}
                {success && <div className="alert success">{success}</div>}

                {activeTab === "students" && isFaculty && (
                    <section className="content-card">
                        <div className="section-heading">
                            <div>
                                <h2>Manage Students</h2>
                                <p>
                                    Select a student to view, create, or edit
                                    their academic profile.
                                </p>
                            </div>

                            <span className="total-pill">
                                {students.length} students
                            </span>
                        </div>

                        <input
                            className="search-input"
                            type="search"
                            placeholder="Search by name, email or department..."
                            value={studentSearch}
                            onChange={(event) =>
                                setStudentSearch(event.target.value)
                            }
                        />

                        {students.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-icon">♙</div>
                                <h3>No students found</h3>
                                <p>
                                    Students will appear here after they register.
                                </p>
                                <button
                                    className="secondary-button"
                                    onClick={loadStudents}
                                >
                                    Refresh list
                                </button>
                            </div>
                        ) : filteredStudents.length === 0 ? (
                            <div className="empty-state">
                                <h3>No matching students</h3>
                                <p>Try a different search term.</p>
                            </div>
                        ) : (
                            <div className="student-grid">
                                {filteredStudents.map((student) => (
                                    <article
                                        className="student-card"
                                        key={getId(student)}
                                    >
                                        <div className="student-card-top">
                                            <div className="avatar student-avatar">
                                                {(student.name || "S")
                                                    .charAt(0)
                                                    .toUpperCase()}
                                            </div>
                                            <span className="status-dot">
                                                Active
                                            </span>
                                        </div>

                                        <h3>{student.name}</h3>
                                        <p className="student-email">
                                            {student.email}
                                        </p>

                                        <div className="student-meta">
                                            <span>Department</span>
                                            <strong>
                                                {student.department || "Not added"}
                                            </strong>
                                        </div>

                                        <button
                                            className="primary-button full-width"
                                            onClick={() => openStudent(student)}
                                        >
                                            View / Edit Profile
                                        </button>
                                    </article>
                                ))}
                            </div>
                        )}
                    </section>
                )}

                {activeTab === "faculty" && isFaculty && (
                    <section className="content-card">
                        <div className="section-heading">
                            <div>
                                <h2>Faculty Directory</h2>
                                <p>
                                    Faculty accounts registered in the portal.
                                </p>
                            </div>
                            <button
                                className="secondary-button"
                                onClick={loadFaculty}
                            >
                                Refresh
                            </button>
                        </div>

                        {faculty.length === 0 ? (
                            <div className="empty-state">
                                <h3>No faculty records found</h3>
                            </div>
                        ) : (
                            <div className="table-wrapper">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Email</th>
                                            <th>Role</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {faculty.map((member) => (
                                            <tr key={getId(member)}>
                                                <td>{member.name}</td>
                                                <td>{member.email}</td>
                                                <td>
                                                    <span className="role-badge">
                                                        {member.role}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                )}

                {activeTab === "profile" && (
                    <>
                        <section className="welcome-banner">
                            <div>
                                <span className="welcome-tag">
                                    {isFaculty
                                        ? "FACULTY WORKSPACE"
                                        : "STUDENT WORKSPACE"}
                                </span>

                                <h2>
                                    {selectedUserId !== ownUserId
                                        ? `Editing ${selectedUser?.name || "Student"}'s Profile`
                                        : `Welcome back, ${user.name}!`}
                                </h2>

                                <p>
                                    {selectedUserId !== ownUserId
                                        ? "Update this student's academic and contact information below."
                                        : "Manage your personal information and academic details in one place."}
                                </p>
                            </div>

                            <div className="welcome-decoration">✦</div>
                        </section>

                        <section className="content-card profile-card">
                            <div className="section-heading">
                                <div>
                                    <h2>Profile Information</h2>
                                    <p>
                                        {profileExists
                                            ? "Update the details below and save your changes."
                                            : "Complete the form to create this user's profile."}
                                    </p>
                                </div>

                                <span
                                    className={`profile-status ${profileExists ? "complete" : "incomplete"}`}
                                >
                                    {profileExists
                                        ? "Profile available"
                                        : "Profile not created"}
                                </span>
                            </div>

                            <div className="profile-identity">
                                <div className="avatar profile-avatar">
                                    {(selectedUser?.name || user.name || "U")
                                        .charAt(0)
                                        .toUpperCase()}
                                </div>

                                <div>
                                    <h3>{selectedUser?.name || user.name}</h3>
                                    <p>
                                        {selectedUser?.email || user.email}
                                    </p>
                                    <span className="role-badge">
                                        {selectedUser?.role || user.role}
                                    </span>
                                </div>
                            </div>

                            {profileLoading ? (
                                <div className="loading-state">
                                    <div className="spinner"></div>
                                    <p>Loading profile...</p>
                                </div>
                            ) : (
                                <form
                                    className="profile-form"
                                    onSubmit={handleProfileSubmit}
                                >
                                    <div className="form-grid">
                                        <div className="form-field">
                                            <label>Full Name</label>
                                            <input
                                                value={
                                                    selectedUser?.name ||
                                                    user.name ||
                                                    ""
                                                }
                                                disabled
                                            />
                                        </div>

                                        <div className="form-field">
                                            <label>Email Address</label>
                                            <input
                                                value={
                                                    selectedUser?.email ||
                                                    user.email ||
                                                    ""
                                                }
                                                disabled
                                            />
                                        </div>

                                        <div className="form-field">
                                            <label>Age</label>
                                            <input
                                                type="number"
                                                name="age"
                                                min="1"
                                                max="120"
                                                value={profile.age}
                                                onChange={handleProfileChange}
                                                placeholder="Enter age"
                                            />
                                        </div>

                                        <div className="form-field">
                                            <label>Date of Birth</label>
                                            <input
                                                type="date"
                                                name="dob"
                                                value={profile.dob}
                                                onChange={handleProfileChange}
                                            />
                                        </div>

                                        <div className="form-field">
                                            <label>Phone Number</label>
                                            <input
                                                type="tel"
                                                name="phone"
                                                value={profile.phone}
                                                onChange={handleProfileChange}
                                                placeholder="Enter phone number"
                                            />
                                        </div>

                                        <div className="form-field">
                                            <label>Department</label>
                                            <input
                                                type="text"
                                                name="department"
                                                value={profile.department}
                                                onChange={handleProfileChange}
                                                placeholder="e.g. Computer Science"
                                            />
                                        </div>

                                        <div className="form-field full-field">
                                            <label>Address</label>
                                            <textarea
                                                name="address"
                                                rows="3"
                                                value={profile.address}
                                                onChange={handleProfileChange}
                                                placeholder="Enter address"
                                            />
                                        </div>

                                        <div className="form-field full-field">
                                            <label>About / Bio</label>
                                            <textarea
                                                name="bio"
                                                rows="4"
                                                value={profile.bio}
                                                onChange={handleProfileChange}
                                                placeholder="Add a short description..."
                                            />
                                        </div>
                                    </div>

                                    <div className="form-actions">
                                        {isFaculty &&
                                            selectedUserId !== ownUserId && (
                                                <button
                                                    type="button"
                                                    className="secondary-button"
                                                    onClick={openOwnProfile}
                                                >
                                                    Back to My Profile
                                                </button>
                                            )}

                                        <button
                                            type="submit"
                                            className="primary-button save-button"
                                            disabled={savingProfile}
                                        >
                                            {savingProfile
                                                ? "Saving..."
                                                : profileExists
                                                  ? "Save Changes"
                                                  : "Create Profile"}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </section>

                        {selectedUserId === ownUserId && (
                            <section className="danger-card">
                                <div>
                                    <h3>Deactivate Account</h3>
                                    <p>
                                        Your account will be marked inactive and
                                        you will be logged out.
                                    </p>
                                </div>

                                <button
                                    className="danger-button"
                                    onClick={handleDeactivateAccount}
                                >
                                    Deactivate Account
                                </button>
                            </section>
                        )}
                    </>
                )}

                <footer className="page-footer">
                    Student Faculty Portal · Academic Profile Management
                </footer>
            </main>
        </div>
    );
}

export default App;