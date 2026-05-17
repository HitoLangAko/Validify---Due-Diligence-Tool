const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
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

const infoSecQuestions = [
  "Is there a dedicated security officer or team responsible for overseeing the implementation of the information security programs, awareness, and compliance in your organization?",
  "Does your security officer report to senior management or part of the organization's steering committee?",
  "Do you have documented security policies?",
  "Are the security policies board approved?",
  "Are security policies regularly reviewed to align with ISO 27001, PCI DSS, NIST, or similar standards?",
  "Does your organization undergo regular internal and external security audits?",
  "Do you comply with relevant local and international laws and security regulations?",
  "Are security requirements incorporated in contracts, including data protection clauses?",
  "Do you have an established Information Security Awareness Program?",
  "Are roles and access rights following the least-privilege principle?",
  "Are user privileges regularly reviewed and updated?",
  "Are access logs to sensitive data maintained for access review?",
  "Does your organization encrypt communications and data stored in IT facilities, including data at rest and data in transit?",
  "Do you perform application security testing or assessment before production deployment?",
  "Do you have a security incident response team and procedures in place?",
  "Do you have an Incident Response Plan for ransomware, phishing, and data breach scenarios?"
];

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

const uploadDir = path.join(__dirname, "public", "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, uploadDir);
  },
  filename: function (_req, file, cb) {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}-${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

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
      email_verified TINYINT(1) DEFAULT 1,
      verification_token_hash VARCHAR(255) NULL,
      verification_token_expires DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await addColumnIfMissing("users", "email_verified", "TINYINT(1) DEFAULT 1");
  await addColumnIfMissing("users", "verification_token_hash", "VARCHAR(255) NULL");
  await addColumnIfMissing("users", "verification_token_expires", "DATETIME NULL");

  try {
    await runQuery(`
      ALTER TABLE users MODIFY role ENUM(
        'employee',
        'it',
        'infosec',
        'management',
        'dpo',
        'hr',
        'compliance',
        'admin'
      ) NOT NULL
    `);
  } catch (error) {
    console.log("Skipping role enum update:", error.message);
  }

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

  await addColumnIfMissing("vendors", "user_id", "INT NULL");
  await addColumnIfMissing("vendors", "created_by_user_id", "INT NULL");
  await addColumnIfMissing("vendors", "overall_status", "ENUM('Pending', 'In Review', 'Completed', 'Rejected') DEFAULT 'Pending'");

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

  await runQuery(`
    CREATE TABLE IF NOT EXISTS infosec_assessments (
      assessment_id INT AUTO_INCREMENT PRIMARY KEY,
      assessment_code VARCHAR(30) UNIQUE,
      vendor_id INT NOT NULL,
      submitted_by_user_id INT NOT NULL,
      purpose VARCHAR(150) DEFAULT 'Information Security',
      status ENUM('Draft', 'Pending Admin Approval', 'Approved', 'Rejected') DEFAULT 'Draft',
      admin_comment TEXT NULL,
      submitted_at TIMESTAMP NULL,
      approved_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS infosec_answers (
      answer_id INT AUTO_INCREMENT PRIMARY KEY,
      assessment_id INT NOT NULL,
      question_index INT NOT NULL,
      question_text TEXT NOT NULL,
      response ENUM('Yes', 'No', 'N/A') NOT NULL,
      explanation TEXT NULL,
      artifact_path VARCHAR(255) NULL,
      artifact_name VARCHAR(255) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_infosec_answer (assessment_id, question_index)
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS sign_offs (
      signoff_id INT AUTO_INCREMENT PRIMARY KEY,
      assessment_id INT NULL,
      role_name VARCHAR(100) NOT NULL,
      signer_name VARCHAR(150),
      signoff_status ENUM('Pending', 'Signed') DEFAULT 'Pending',
      signature_file_name VARCHAR(255) NULL,
      signature_file_path VARCHAR(255) NULL,
      signed_at TIMESTAMP NULL,
      created_by_user_id INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await addColumnIfMissing("sign_offs", "signature_file_path", "VARCHAR(255) NULL");

  console.log("Database tables checked.");
}

initDatabase().catch((error) => {
  console.error("Database init error:", error);
});

/* AUTH ROUTES */

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

/* VENDOR ROUTES */

app.post("/vendors", requireAnyRole(["employee", "infosec"]), (req, res) => {
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
      const reviewValues = departmentRoles.map((role) => [vendorId, role, "Pending"]);

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

app.get("/vendors/mine", requireAnyRole(["employee", "infosec"]), (req, res) => {
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

/* DEPARTMENT ROUTES */

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
    } else if (
      rows.length >= departmentRoles.length &&
      rows.every((row) => row.review_status === "Reviewed" || row.review_status === "Approved")
    ) {
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

/* INFOSEC ROUTES */

app.get("/infosec/questions", requireRole("infosec"), (req, res) => {
  res.json(infoSecQuestions.map((question, index) => ({
    question_index: index,
    question_text: question
  })));
});

app.get("/infosec/queue", requireRole("infosec"), (req, res) => {
  const sql = `
    SELECT
      v.vendor_id,
      v.company_name,
      v.product_services_offered,
      v.contact_person_name,
      v.contact_email,
      v.created_at,
      u.full_name AS submitted_by,
      dr.review_status,
      (
        SELECT ia.assessment_code
        FROM infosec_assessments ia
        WHERE ia.vendor_id = v.vendor_id
        ORDER BY ia.assessment_id DESC
        LIMIT 1
      ) AS latest_assessment_code,
      (
        SELECT ia.status
        FROM infosec_assessments ia
        WHERE ia.vendor_id = v.vendor_id
        ORDER BY ia.assessment_id DESC
        LIMIT 1
      ) AS latest_assessment_status
    FROM department_reviews dr
    JOIN vendors v ON dr.vendor_id = v.vendor_id
    LEFT JOIN users u ON v.created_by_user_id = u.user_id
    WHERE dr.department_role = 'infosec'
    ORDER BY v.created_at DESC
  `;

  db.query(sql, (err, rows) => {
    if (err) {
      console.error("Fetch infosec queue error:", err);
      return res.status(500).json({ message: "Failed to load InfoSec queue." });
    }

    res.json(rows);
  });
});

app.post("/infosec/assessments/start", requireRole("infosec"), (req, res) => {
  const { vendor_id, purpose } = req.body;

  if (!vendor_id) {
    return res.status(400).json({ message: "Vendor is required." });
  }

  const findDraftSql = `
    SELECT *
    FROM infosec_assessments
    WHERE vendor_id = ?
    AND submitted_by_user_id = ?
    AND status = 'Draft'
    ORDER BY assessment_id DESC
    LIMIT 1
  `;

  db.query(findDraftSql, [vendor_id, req.session.user.user_id], (findErr, drafts) => {
    if (findErr) {
      console.error("Find draft error:", findErr);
      return res.status(500).json({ message: "Failed to start assessment." });
    }

    if (drafts.length > 0) {
      return res.json(drafts[0]);
    }

    const insertSql = `
      INSERT INTO infosec_assessments
      (
        vendor_id,
        submitted_by_user_id,
        purpose,
        status
      )
      VALUES (?, ?, ?, 'Draft')
    `;

    db.query(insertSql, [vendor_id, req.session.user.user_id, purpose || "Information Security"], (insertErr, result) => {
      if (insertErr) {
        console.error("Start assessment error:", insertErr);
        return res.status(500).json({ message: "Failed to start assessment." });
      }

      const assessmentId = result.insertId;
      const assessmentCode = `IA-${String(assessmentId).padStart(3, "0")}`;

      const updateSql = `
        UPDATE infosec_assessments
        SET assessment_code = ?
        WHERE assessment_id = ?
      `;

      db.query(updateSql, [assessmentCode, assessmentId], (updateErr) => {
        if (updateErr) {
          console.error("Update assessment code error:", updateErr);
          return res.status(500).json({ message: "Failed to create assessment ID." });
        }

        res.json({
          assessment_id: assessmentId,
          assessment_code: assessmentCode,
          vendor_id,
          submitted_by_user_id: req.session.user.user_id,
          purpose: purpose || "Information Security",
          status: "Draft"
        });
      });
    });
  });
});

app.get("/infosec/assessments/mine", requireRole("infosec"), (req, res) => {
  const sql = `
    SELECT
      ia.assessment_id,
      ia.assessment_code,
      ia.vendor_id,
      ia.purpose,
      ia.status,
      ia.submitted_at,
      ia.created_at,
      ia.admin_comment,
      v.company_name,
      v.product_services_offered
    FROM infosec_assessments ia
    JOIN vendors v ON ia.vendor_id = v.vendor_id
    WHERE ia.submitted_by_user_id = ?
    ORDER BY ia.created_at DESC
  `;

  db.query(sql, [req.session.user.user_id], (err, rows) => {
    if (err) {
      console.error("Fetch my infosec assessments error:", err);
      return res.status(500).json({ message: "Failed to load InfoSec submissions." });
    }

    res.json(rows);
  });
});

app.get("/infosec/assessments/:assessment_id", requireRole("infosec"), (req, res) => {
  const { assessment_id } = req.params;

  const sql = `
    SELECT
      ia.*,
      v.company_name,
      v.product_services_offered
    FROM infosec_assessments ia
    JOIN vendors v ON ia.vendor_id = v.vendor_id
    WHERE ia.assessment_id = ?
    AND ia.submitted_by_user_id = ?
  `;

  db.query(sql, [assessment_id, req.session.user.user_id], (err, rows) => {
    if (err) {
      console.error("Fetch assessment error:", err);
      return res.status(500).json({ message: "Failed to load assessment." });
    }

    if (rows.length === 0) {
      return res.status(404).json({ message: "Assessment not found." });
    }

    const answersSql = `
      SELECT *
      FROM infosec_answers
      WHERE assessment_id = ?
      ORDER BY question_index
    `;

    db.query(answersSql, [assessment_id], (answerErr, answers) => {
      if (answerErr) {
        console.error("Fetch answers error:", answerErr);
        return res.status(500).json({ message: "Failed to load assessment answers." });
      }

      res.json({
        assessment: rows[0],
        answers
      });
    });
  });
});

app.post("/infosec/assessments/:assessment_id/submit", requireRole("infosec"), upload.any(), (req, res) => {
  const { assessment_id } = req.params;

  let answers;

  try {
    answers = JSON.parse(req.body.answers || "[]");
  } catch (error) {
    return res.status(400).json({ message: "Invalid answer data." });
  }

  if (!Array.isArray(answers) || answers.length === 0) {
    return res.status(400).json({ message: "No answers submitted." });
  }

  const filesByQuestion = {};

  (req.files || []).forEach((file) => {
    const match = file.fieldname.match(/^artifact_(\d+)$/);
    if (match) {
      filesByQuestion[Number(match[1])] = file;
    }
  });

  for (const answer of answers) {
    if (!["Yes", "No", "N/A"].includes(answer.response)) {
      return res.status(400).json({ message: "Each question must have a valid response." });
    }

    if ((answer.response === "No" || answer.response === "N/A") && !String(answer.explanation || "").trim()) {
      return res.status(400).json({
        message: "No and N/A responses require an explanation."
      });
    }

    if (answer.response === "Yes" && !filesByQuestion[answer.question_index] && !answer.existing_artifact_path) {
      return res.status(400).json({
        message: "Yes responses require an artifact or uploaded file."
      });
    }
  }

  const checkSql = `
    SELECT *
    FROM infosec_assessments
    WHERE assessment_id = ?
    AND submitted_by_user_id = ?
  `;

  db.query(checkSql, [assessment_id, req.session.user.user_id], (checkErr, rows) => {
    if (checkErr) {
      console.error("Check infosec assessment error:", checkErr);
      return res.status(500).json({ message: "Failed to check assessment." });
    }

    if (rows.length === 0) {
      return res.status(404).json({ message: "Assessment not found." });
    }

    const assessment = rows[0];

    const values = answers.map((answer) => {
      const file = filesByQuestion[answer.question_index];

      return [
        assessment_id,
        answer.question_index,
        infoSecQuestions[answer.question_index] || answer.question_text || "",
        answer.response,
        answer.explanation || null,
        file ? `/uploads/${file.filename}` : answer.existing_artifact_path || null,
        file ? file.originalname : answer.existing_artifact_name || null
      ];
    });

    const saveSql = `
      INSERT INTO infosec_answers
      (
        assessment_id,
        question_index,
        question_text,
        response,
        explanation,
        artifact_path,
        artifact_name
      )
      VALUES ?
      ON DUPLICATE KEY UPDATE
        question_text = VALUES(question_text),
        response = VALUES(response),
        explanation = VALUES(explanation),
        artifact_path = VALUES(artifact_path),
        artifact_name = VALUES(artifact_name),
        updated_at = CURRENT_TIMESTAMP
    `;

    db.query(saveSql, [values], (saveErr) => {
      if (saveErr) {
        console.error("Save infosec answers error:", saveErr);
        return res.status(500).json({ message: "Failed to save InfoSec answers." });
      }

      const submitSql = `
        UPDATE infosec_assessments
        SET status = 'Pending Admin Approval',
            submitted_at = CURRENT_TIMESTAMP
        WHERE assessment_id = ?
      `;

      db.query(submitSql, [assessment_id], (submitErr) => {
        if (submitErr) {
          console.error("Submit infosec assessment error:", submitErr);
          return res.status(500).json({ message: "Failed to submit InfoSec assessment." });
        }

        const reviewSql = `
          UPDATE department_reviews
          SET review_status = 'Reviewed',
              reviewer_user_id = ?,
              comments = ?,
              reviewed_at = CURRENT_TIMESTAMP
          WHERE vendor_id = ?
          AND department_role = 'infosec'
        `;

        db.query(
          reviewSql,
          [
            req.session.user.user_id,
            `InfoSec assessment ${assessment.assessment_code || assessment_id} submitted to Admin.`,
            assessment.vendor_id
          ],
          () => {
            updateVendorOverallStatus(assessment.vendor_id, () => {
              res.json({ message: "InfoSec assessment submitted to Admin for approval." });
            });
          }
        );
      });
    });
  });
});

app.get("/infosec/pending-approval", requireRole("infosec"), (req, res) => {
  const sql = `
    SELECT
      ia.assessment_id,
      ia.assessment_code,
      ia.vendor_id,
      ia.purpose,
      ia.status,
      ia.submitted_at,
      ia.admin_comment,
      v.company_name,
      v.product_services_offered
    FROM infosec_assessments ia
    JOIN vendors v ON ia.vendor_id = v.vendor_id
    WHERE ia.submitted_by_user_id = ?
    AND ia.status = 'Pending Admin Approval'
    ORDER BY ia.submitted_at DESC
  `;

  db.query(sql, [req.session.user.user_id], (err, rows) => {
    if (err) {
      console.error("Fetch pending approvals error:", err);
      return res.status(500).json({ message: "Failed to load pending approvals." });
    }

    res.json(rows);
  });
});

app.post("/infosec/signoff", requireRole("infosec"), upload.single("signature"), (req, res) => {
  const { role_name, signer_name, signoff_status, assessment_id } = req.body;

  if (!role_name || !signer_name) {
    return res.status(400).json({ message: "Role and signer name are required." });
  }

  const status = signoff_status === "Signed" ? "Signed" : "Pending";
  const fileName = req.file ? req.file.originalname : null;
  const filePath = req.file ? `/uploads/${req.file.filename}` : null;

  const sql = `
    INSERT INTO sign_offs
    (
      assessment_id,
      role_name,
      signer_name,
      signoff_status,
      signature_file_name,
      signature_file_path,
      signed_at,
      created_by_user_id
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      assessment_id || null,
      role_name,
      signer_name,
      status,
      fileName,
      filePath,
      status === "Signed" ? new Date() : null,
      req.session.user.user_id
    ],
    (err) => {
      if (err) {
        console.error("Save signoff error:", err);
        return res.status(500).json({ message: "Failed to save sign-off." });
      }

      res.json({ message: "Sign-off saved." });
    }
  );
});

/* ADMIN ROUTES */

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

app.get("/admin/infosec-assessments", requireRole("admin"), (req, res) => {
  const sql = `
    SELECT
      ia.*,
      v.company_name,
      u.full_name AS submitted_by
    FROM infosec_assessments ia
    JOIN vendors v ON ia.vendor_id = v.vendor_id
    JOIN users u ON ia.submitted_by_user_id = u.user_id
    ORDER BY ia.submitted_at DESC, ia.created_at DESC
  `;

  db.query(sql, (err, rows) => {
    if (err) {
      console.error("Fetch admin infosec assessments error:", err);
      return res.status(500).json({ message: "Failed to load InfoSec assessments." });
    }

    res.json(rows);
  });
});

/* START SERVER */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
