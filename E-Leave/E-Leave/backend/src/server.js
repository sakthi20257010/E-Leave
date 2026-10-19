
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { pool } from "./db.js";

dotenv.config();

const app = express();


const allowedOrigins = [
  "http://localhost:5173",
  "https://e-leave-bjs2.vercel.app",
];

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

const secret =
  process.env.JWT_SECRET || "dev_only_change_this_secret";

const wrap = (f) => (q, s, n) =>
  Promise.resolve(f(q, s, n)).catch(n);

function auth(q, s, n) {
  const t = (q.headers.authorization || "").replace(
    /^Bearer\s+/,
    "",
  );

  try {
    if (!t) throw Error();

    q.user = jwt.verify(t, secret);
    n();
  } catch {
    s.status(401).json({
      message: "Please log in again",
    });
  }
}

const role =
  (...r) =>
  (q, s, n) =>
    r.includes(q.user.role)
      ? n()
      : s.status(403).json({
          message: "Not allowed",
        });

// Health check
app.get("/api/health", (q, s) => {
  s.json({
    ok: true,
    service: "E-Leave API",
  });
});

// Login
app.post(
  "/api/auth/login",
  wrap(async (q, s) => {
    const uid = q.body?.user_id;
    const { password } = q.body || {};

    if (!uid || !password) {
      return s.status(400).json({
        message: "Enter user ID and password",
      });
    }

    const [r] = await pool.query(
      "SELECT * FROM users WHERE user_id = ?",
      [uid.trim()],
    );

    if (
      !r.length ||
      !(await bcrypt.compare(password, r[0].password_hash))
    ) {
      return s.status(401).json({
        message: "Invalid user ID or password",
      });
    }

    const u = r[0];

    const user = {
      user_id: u.user_id,
      name: u.name,
      role: u.role,
      year_level: u.year_level,
      faculty_user_id: u.faculty_user_id,
    };

    const token = jwt.sign(user, secret, {
      expiresIn: "8h",
    });

    s.json({ token, user });
  }),
);

// Change password
app.post(
  "/api/auth/change-password",
  auth,
  wrap(async (q, s) => {
    const { current_password, new_password } = q.body || {};

    if (
      !current_password ||
      !new_password ||
      new_password.length < 8
    ) {
      return s.status(400).json({
        message: "New password must have at least 8 characters",
      });
    }

    const [r] = await pool.query(
      "SELECT password_hash FROM users WHERE user_id = ?",
      [q.user.user_id],
    );

    if (
      !r.length ||
      !(await bcrypt.compare(
        current_password,
        r[0].password_hash,
      ))
    ) {
      return s.status(400).json({
        message: "Current password is incorrect",
      });
    }

    await pool.query(
      "UPDATE users SET password_hash = ? WHERE user_id = ?",
      [
        await bcrypt.hash(new_password, 10),
        q.user.user_id,
      ],
    );

    s.json({ message: "Password changed" });
  }),
);

// Get assigned faculty (Student)
app.get(
  "/api/students/faculty",
  auth,
  role("STUDENT"),
  wrap(async (q, s) => {
    const [r] = await pool.query(
      "SELECT user_id, name FROM users WHERE user_id = ?",
      [q.user.faculty_user_id],
    );

    s.json({
      faculty: r[0] || null,
    });
  }),
);

// Submit leave request (Student)
app.post(
  "/api/leaves",
  auth,
  role("STUDENT"),
  wrap(async (q, s) => {
    const {
      leave_type,
      start_date,
      end_date,
      reason,
    } = q.body || {};

    const allowedTypes = [
      "Medical",
      "Personal",
      "Outside Permission",
      "Other",
    ];

    if (
      !allowedTypes.includes(leave_type) ||
      !start_date ||
      !end_date ||
      !reason?.trim()
    ) {
      return s.status(400).json({
        message: "Fill all leave fields",
      });
    }

    const today = new Date().toISOString().slice(0, 10);

    if (
      start_date < today ||
      end_date < start_date
    ) {
      return s.status(400).json({
        message: "Choose valid future dates",
      });
    }

    if (!q.user.faculty_user_id) {
      return s.status(400).json({
        message: "No faculty assigned to this student",
      });
    }

    await pool.query(
      `INSERT INTO leave_requests
       (student_user_id, faculty_user_id, leave_type,
        start_date, end_date, reason)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        q.user.user_id,
        q.user.faculty_user_id,
        leave_type,
        start_date,
        end_date,
        reason.trim(),
      ],
    );

    s.status(201).json({
      message: "Request sent to your assigned faculty",
    });
  }),
);

// Student leave history
app.get(
  "/api/leaves/mine",
  auth,
  role("STUDENT"),
  wrap(async (q, s) => {
    const [r] = await pool.query(
      `SELECT *
       FROM leave_requests
       WHERE student_user_id = ?
       ORDER BY created_at DESC`,
      [q.user.user_id],
    );

    s.json(r);
  }),
);

// Faculty: view assigned requests
app.get(
  "/api/faculty/requests",
  auth,
  role("FACULTY"),
  wrap(async (q, s) => {
    const [r] = await pool.query(
      `SELECT
         l.*,
         u.name AS student_name,
         u.year_level
       FROM leave_requests l
       JOIN users u
         ON u.user_id = l.student_user_id
       WHERE l.faculty_user_id = ?
       ORDER BY l.created_at DESC`,
      [q.user.user_id],
    );

    s.json(r);
  }),
);

// Faculty: approve or reject a request
app.patch(
  "/api/faculty/requests/:id",
  auth,
  role("FACULTY"),
  wrap(async (q, s) => {
    const { status, faculty_remarks = "" } = q.body || {};

    if (!["Approved", "Rejected"].includes(status)) {
      return s.status(400).json({
        message: "Invalid status",
      });
    }

    const [r] = await pool.query(
      `UPDATE leave_requests
       SET status = ?, faculty_remarks = ?
       WHERE id = ?
         AND faculty_user_id = ?
         AND status = 'Pending'`,
      [
        status,
        faculty_remarks,
        q.params.id,
        q.user.user_id,
      ],
    );

    if (!r.affectedRows) {
      return s.status(404).json({
        message: "Request not found or already processed",
      });
    }

    s.json({
      message: `Request ${status.toLowerCase()}`,
    });
  }),
);

// HOD dashboard
app.get(
  "/api/hod/dashboard",
  auth,
  role("HOD"),
  wrap(async (q, s) => {
    // Overall request counts
    const [[c]] = await pool.query(
      `SELECT
         COUNT(*) AS total_requests,
         COALESCE(SUM(status = 'Pending'), 0) AS pending,
         COALESCE(SUM(status = 'Approved'), 0) AS approved,
         COALESCE(SUM(status = 'Rejected'), 0) AS rejected
       FROM leave_requests`,
    );

    // FIX: Calculate student and request counts separately.
    // This prevents JOIN multiplication (e.g. 1 request becoming 10).
    const [f] = await pool.query(
      `SELECT
         x.user_id,
         x.name,
         (
           SELECT COUNT(*)
           FROM users u
           WHERE u.faculty_user_id = x.user_id
             AND u.role = 'STUDENT'
         ) AS student_count,
         (
           SELECT COUNT(*)
           FROM leave_requests l
           WHERE l.faculty_user_id = x.user_id
         ) AS request_count,
         (
           SELECT COUNT(*)
           FROM leave_requests l
           WHERE l.faculty_user_id = x.user_id
             AND l.status = 'Pending'
         ) AS pending_count
       FROM users x
       WHERE x.role = 'FACULTY'
       ORDER BY x.user_id`,
    );

    // Student counts by year
    const [y] = await pool.query(
      `SELECT
         year_level,
         COUNT(*) AS student_count
       FROM users
       WHERE role = 'STUDENT'
       GROUP BY year_level
       ORDER BY year_level`,
    );

    // Leave request list
    const [r] = await pool.query(
      `SELECT
         l.*,
         u.name AS student_name,
         u.year_level,
         f.name AS faculty_name
       FROM leave_requests l
       JOIN users u
         ON u.user_id = l.student_user_id
       JOIN users f
         ON f.user_id = l.faculty_user_id
       ORDER BY l.created_at DESC`,
    );

    // Student list
    const [students] = await pool.query(
      `SELECT
         user_id,
         name,
         year_level,
         faculty_user_id
       FROM users
       WHERE role = 'STUDENT'
       ORDER BY year_level, user_id`,
    );

    s.json({
      counts: {
        total_requests: Number(c.total_requests || 0),
        pending: Number(c.pending || 0),
        approved: Number(c.approved || 0),
        rejected: Number(c.rejected || 0),
      },
      faculty: f,
      years: y,
      requests: r,
      students,
    });
  }),
);

// Error handler
app.use((e, q, s, n) => {
  console.error(e);

  s.status(500).json({
    message: "Server error. Check backend .env and MySQL.",
  });
});

// Start server
app.listen(process.env.PORT || 5000, () => {
  console.log(
    "E-Leave API running on port " +
      (process.env.PORT || 5000),
  );
});
