const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const app = express();

const allowedRoles = [
  "employee",
  "it",
  "infosec",
  "management",
  "dpo",
  "hr",
  "compliance",
  "admin"
];

const departmentRoles = [
  "it",
  "infosec",
  "management",
  "dpo",
  "hr",
  "compliance"
];

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "vendor_due_diligence_secret_key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 2
    }
  })
);

const sslConfig = process.env.DB_SSL_CA_PATH && fs.existsSync(process.env.DB_SSL_CA_PATH)
  ? { ca: fs.readFileSync(process.env.DB_SSL_CA_PATH) }
  : undefined;

const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: sslConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

db.query("SELECT 1", (err) => {
  if (err) {
    console.error("Database connection failed:", err);
    return;
  }

  console.log("Connected to MySQL database.");
});

function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ message: "You must be logged in first." });
  }

  next();
}

function requireRole(role) {
  return function (req, res, next) {
    if (!req.session.user) {
      return res.status(401).json({ message: "You must be logged in first." });
    }

    if (req.session.user.role !== role) {
      return res.status(403).json({
        message: "You are not allowed to do this action."
      });
    }

    next();
  };
}

function requireAnyRole(roles) {
  return function (req, res, next) {
    if (!req.session.user) {
      return res.status(401).json({ message: "You must be logged in first." });
    }

    if (!roles.includes(req.session.user.role)) {
      return res.status(403).json({
        message: "You are not allowed to do this action."
      });
    }

    next();
  };
}

/* =========================
   DATABASE INIT
========================= */

function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

async function columnExists(tableName, columnName) {
  const rows = await runQuery(
    `
      SELECT COUNT(*) AS total
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND COLUMN_NAME = ?
    `,
    [tableName, columnName]
  );

  return rows[0].total > 0;
}

async function addColumnIfMissing(tableName, columnName, definition) {
  const exists = await columnExists(tableName, columnName);

  if (!exists) {
    await runQuery(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

async function initDatabase() {
  await runQuery(`
    CREATE TABLE IF NOT EXISTS users (
      user_id INT AUTO_INCREMENT PRIMARY KEY,
      full_name VARCHAR(150) NOT NULL,
      email VARCHAR(150) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role ENUM(
        'employee',
        'it',
        'infosec',
        'management',
        'dpo',
        'hr',
        'compliance',
        'admin'
      ) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS vendors (
      vendor_id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NULL,
      company_name VARCHAR(150) NOT NULL,
      company_website VARCHAR(255),
      product_services_offered TEXT,
      contact_person_name VARCHAR(150),
      contact_email VARCHAR(150),
      contact_phone VARCHAR(50),
      created_by_user_id INT NULL,
      overall_status ENUM('Pending', 'In Review', 'Completed', 'Rejected') DEFAULT 'Pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await addColumnIfMissing("vendors", "created_by_user_id", "INT NULL");
  await addColumnIfMissing("vendors", "overall_status", "ENUM('Pending', 'In Review', 'Completed', 'Rejected') DEFAULT 'Pending'");
  await addColumnIfMissing("vendors", "user_id", "INT NULL");

  try {
    await runQuery("ALTER TABLE vendors MODIFY user_id INT NULL");
  } catch (error) {
    console.log("Skipping user_id nullable update:", error.message);
  }

  await runQuery(`
    CREATE TABLE IF NOT EXISTS department_reviews (
      review_id INT AUTO_INCREMENT PRIMARY KEY,
      vendor_id INT NOT NULL,
      department_role ENUM(
        'it',
        'infosec',
        'management',
        'dpo',
        'hr',
        'compliance'
      ) NOT NULL,
      reviewer_user_id INT NULL,
      review_status ENUM('Pending', 'Reviewed', 'Rejected', 'Approved') DEFAULT 'Pending',
      comments TEXT,
      reviewed_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_department_review (vendor_id, department_role)
    )
  `);

  console.log("Database tables checked.");
}

initDatabase().catch((error) => {
  console.error("Database init error:", error);
});

/* =========================
   VERIFICATION EMAAIL
========================= */

const APP_BASE_URL = process.env.APP_BASE_URL || "http://localhost:3000";

const mailer = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: Number(process.env.EMAIL_PORT || 587),
  secure: String(process.env.EMAIL_SECURE || "false") === "true",
  family: 4,
  connectionTimeout: 30000,
  greetingTimeout: 30000,
  socketTimeout: 30000,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

function hashVerificationToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function sendVerificationEmail(email, fullName, token) {
  const verifyLink = `${APP_BASE_URL}/verify-email?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;

  await mailer.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: email,
    subject: "Verify your Validify account",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Verify your Validify account</h2>
        <p>Hello ${fullName},</p>
        <p>Please verify your email address before logging in.</p>
        <p>
          <a href="${verifyLink}" style="background:#2f66e8;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold;">
            Verify Email
          </a>
        </p>
        <p>If the button does not work, copy this link:</p>
        <p>${verifyLink}</p>
      </div>
    `
  });
}

/* =========================
   AUTH ROUTES
========================= */

app.post("/register", async (req, res) => {
  const { full_name, email, password, role } = req.body;

  if (!full_name || !email || !password || !role) {
    return res.status(400).json({ message: "Please fill in all fields." });
  }

  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ message: "Invalid role selected." });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);

    const sql = `
      INSERT INTO users
      (
        full_name,
        email,
        password_hash,
        role,
        email_verified,
        verification_token_hash,
        verification_token_expires
      )
      VALUES (?, ?, ?, ?, 1, NULL, NULL)
    `;

    db.query(sql, [full_name, email, passwordHash, role], (err) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") {
          return res.status(400).json({ message: "Email already exists." });
        }

        console.error("Register error:", err);
        return res.status(500).json({ message: "Failed to register account." });
      }

      res.json({
        message: "Account registered successfully. You can now log in."
      });
    });
  } catch (error) {
    console.error("Register server error:", error);
    res.status(500).json({ message: "Server error during registration." });
  }
});

app.get("/verify-email", (req, res) => {
  const { email, token } = req.query;

  if (!email || !token) {
    return res.status(400).send("Invalid verification link.");
  }

  const tokenHash = hashVerificationToken(token);

  const sql = `
    SELECT user_id
    FROM users
    WHERE email = ?
    AND verification_token_hash = ?
    AND verification_token_expires > NOW()
    AND email_verified = 0
  `;

  db.query(sql, [email, tokenHash], (err, results) => {
    if (err) {
      console.error("Verify email error:", err);
      return res.status(500).send("Failed to verify email.");
    }

    if (results.length === 0) {
      return res.status(400).send("Verification link is invalid or expired.");
    }

    const updateSql = `
      UPDATE users
      SET
        email_verified = 1,
        verification_token_hash = NULL,
        verification_token_expires = NULL
      WHERE user_id = ?
    `;

    db.query(updateSql, [results[0].user_id], (updateErr) => {
      if (updateErr) {
        console.error("Email verify update error:", updateErr);
        return res.status(500).send("Failed to verify email.");
      }

      res.redirect("/login.html?verified=1");
    });
  });
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;

  const sql = `
    SELECT *
    FROM users
    WHERE email = ?
  `;

  db.query(sql, [email], async (err, results) => {
    if (err) {
      console.error("Login error:", err);
      return res.status(500).json({ message: "Login failed." });
    }

    if (results.length === 0) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const user = results[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    req.session.user = {
      user_id: user.user_id,
      full_name: user.full_name,
      email: user.email,
      role: user.role
    };

    res.json({
      message: "Login successful.",
      user: req.session.user
    });
  });
});

app.get("/me", (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: "Not logged in." });
  }

  res.json(req.session.user);
});

app.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ message: "Logged out successfully." });
  });
});

/* =========================
   EMPLOYEE VENDOR ROUTES
========================= */

app.post("/vendors", requireRole("employee"), (req, res) => {
  const {
    company_name,
    company_website,
    product_services_offered,
    contact_person_name,
    contact_email,
    contact_phone
  } = req.body;

  if (!company_name || !product_services_offered || !contact_person_name) {
    return res.status(400).json({
      message: "Company name, services, and contact person are required."
    });
  }

  const createdByUserId = req.session.user.user_id;

  const sql = `
    INSERT INTO vendors
    (
      user_id,
      company_name,
      company_website,
      product_services_offered,
      contact_person_name,
      contact_email,
      contact_phone,
      created_by_user_id,
      overall_status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending')
  `;

  db.query(
    sql,
    [
      createdByUserId,
      company_name,
      company_website || null,
      product_services_offered,
      contact_person_name,
      contact_email || null,
      contact_phone || null,
      createdByUserId
    ],
    (err, result) => {
      if (err) {
        console.error("Insert vendor error:", err);
        return res.status(500).json({ message: "Failed to save vendor." });
      }

      const vendorId = result.insertId;

      const reviewValues = departmentRoles.map((role) => [
        vendorId,
        role,
        "Pending"
      ]);

      const reviewSql = `
        INSERT IGNORE INTO department_reviews
        (
          vendor_id,
          department_role,
          review_status
        )
        VALUES ?
      `;

      db.query(reviewSql, [reviewValues], (reviewErr) => {
        if (reviewErr) {
          console.error("Create department reviews error:", reviewErr);
          return res.status(500).json({
            message: "Vendor saved, but failed to assign department reviews."
          });
        }

        res.json({
          message: "Vendor submitted to all departments.",
          vendor_id: vendorId
        });
      });
    }
  );
});

app.get("/vendors/mine", requireRole("employee"), (req, res) => {
  const sql = `
    SELECT
      v.vendor_id,
      v.company_name,
      v.company_website,
      v.product_services_offered,
      v.contact_person_name,
      v.contact_email,
      v.contact_phone,
      v.overall_status,
      v.created_at
    FROM vendors v
    WHERE v.created_by_user_id = ?
    OR v.user_id = ?
    ORDER BY v.created_at DESC
  `;

  db.query(sql, [req.session.user.user_id, req.session.user.user_id], (err, rows) => {
    if (err) {
      console.error("Fetch my submissions error:", err);
      return res.status(500).json({ message: "Failed to load submissions." });
    }

    res.json(rows);
  });
});

/* =========================
   DEPARTMENT ROUTES
========================= */

app.get("/department/vendors", requireAnyRole(departmentRoles), (req, res) => {
  const departmentRole = req.session.user.role;

  const sql = `
    SELECT
      v.vendor_id,
      v.company_name,
      v.company_website,
      v.product_services_offered,
      v.contact_person_name,
      v.contact_email,
      v.contact_phone,
      v.overall_status,
      v.created_at,
      u.full_name AS submitted_by,
      dr.review_status,
      dr.comments,
      dr.reviewed_at
    FROM department_reviews dr
    JOIN vendors v ON dr.vendor_id = v.vendor_id
    LEFT JOIN users u ON v.created_by_user_id = u.user_id
    WHERE dr.department_role = ?
    ORDER BY v.created_at DESC
  `;

  db.query(sql, [departmentRole], (err, rows) => {
    if (err) {
      console.error("Fetch department vendors error:", err);
      return res.status(500).json({ message: "Failed to load department vendors." });
    }

    res.json(rows);
  });
});

app.patch("/department/reviews/:vendor_id", requireAnyRole(departmentRoles), (req, res) => {
  const vendorId = req.params.vendor_id;
  const departmentRole = req.session.user.role;
  const reviewerUserId = req.session.user.user_id;
  const { review_status, comments } = req.body;

  const validStatuses = ["Pending", "Reviewed", "Rejected", "Approved"];

  if (!validStatuses.includes(review_status)) {
    return res.status(400).json({ message: "Invalid review status." });
  }

  const sql = `
    INSERT INTO department_reviews
    (
      vendor_id,
      department_role,
      reviewer_user_id,
      review_status,
      comments,
      reviewed_at
    )
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON DUPLICATE KEY UPDATE
      reviewer_user_id = VALUES(reviewer_user_id),
      review_status = VALUES(review_status),
      comments = VALUES(comments),
      reviewed_at = CURRENT_TIMESTAMP
  `;

  db.query(
    sql,
    [vendorId, departmentRole, reviewerUserId, review_status, comments || null],
    (err) => {
      if (err) {
        console.error("Save department review error:", err);
        return res.status(500).json({ message: "Failed to save department review." });
      }

      updateVendorOverallStatus(vendorId, () => {
        res.json({ message: "Department review saved." });
      });
    }
  );
});

function updateVendorOverallStatus(vendorId, callback) {
  const sql = `
    SELECT review_status
    FROM department_reviews
    WHERE vendor_id = ?
  `;

  db.query(sql, [vendorId], (err, rows) => {
    if (err) {
      console.error("Read department statuses error:", err);
      return callback();
    }

    let overallStatus = "In Review";

    if (rows.some((row) => row.review_status === "Rejected")) {
      overallStatus = "Rejected";
    } else if (rows.length >= departmentRoles.length && rows.every((row) => row.review_status === "Reviewed" || row.review_status === "Approved")) {
      overallStatus = "Completed";
    } else if (rows.every((row) => row.review_status === "Pending")) {
      overallStatus = "Pending";
    }

    const updateSql = `
      UPDATE vendors
      SET overall_status = ?
      WHERE vendor_id = ?
    `;

    db.query(updateSql, [overallStatus, vendorId], () => callback());
  });
}

/* =========================
   ADMIN ROUTES
========================= */

app.get("/admin/vendors", requireRole("admin"), (req, res) => {
  const sql = `
    SELECT
      v.vendor_id,
      v.company_name,
      v.company_website,
      v.product_services_offered,
      v.contact_person_name,
      v.contact_email,
      v.contact_phone,
      v.overall_status,
      v.created_at,
      u.full_name AS submitted_by,
      SUM(CASE WHEN dr.review_status = 'Pending' THEN 1 ELSE 0 END) AS pending_reviews,
      MAX(CASE WHEN dr.department_role = 'it' THEN dr.review_status END) AS it_status,
      MAX(CASE WHEN dr.department_role = 'infosec' THEN dr.review_status END) AS infosec_status,
      MAX(CASE WHEN dr.department_role = 'management' THEN dr.review_status END) AS management_status,
      MAX(CASE WHEN dr.department_role = 'dpo' THEN dr.review_status END) AS dpo_status,
      MAX(CASE WHEN dr.department_role = 'hr' THEN dr.review_status END) AS hr_status,
      MAX(CASE WHEN dr.department_role = 'compliance' THEN dr.review_status END) AS compliance_status
    FROM vendors v
    LEFT JOIN users u ON v.created_by_user_id = u.user_id
    LEFT JOIN department_reviews dr ON v.vendor_id = dr.vendor_id
    GROUP BY
      v.vendor_id,
      v.company_name,
      v.company_website,
      v.product_services_offered,
      v.contact_person_name,
      v.contact_email,
      v.contact_phone,
      v.overall_status,
      v.created_at,
      u.full_name
    ORDER BY v.created_at DESC
  `;

  db.query(sql, (err, rows) => {
    if (err) {
      console.error("Fetch admin vendors error:", err);
      return res.status(500).json({ message: "Failed to load admin vendors." });
    }

    res.json(rows);
  });
});

/* =========================
   START SERVER
========================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
