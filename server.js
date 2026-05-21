const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const ExcelJS = require("exceljs");
require("dotenv").config();

const app = express();

const allowedRoles = ["vendor", "employee", "it", "infosec", "management", "dpo", "hr", "compliance"];
const departmentRoles = ["it", "infosec", "management", "dpo", "hr", "compliance"];

const roleLabels = {
  vendor: "Vendor",
  employee: "Employee / Compliance Officer",
  it: "IT",
  infosec: "InfoSec",
  management: "Management",
  dpo: "DPO",
  hr: "HR",
  compliance: "Compliance"
};

const STATUS = {
  DRAFT: "Draft",
  SUBMITTED_BY_VENDOR: "Submitted by Vendor",
  UNDER_EMPLOYEE_REVIEW: "Under Employee Review",
  RETURNED_TO_VENDOR: "Returned to Vendor",
  REJECTED: "Rejected",
  APPROVED_FOR_DEPARTMENT_REVIEW: "Approved for Department Review",
  UNDER_DEPARTMENT_REVIEW: "Under Department Review",
  UNDER_FINAL_REVIEW: "Under Final Review",
  REPORT_GENERATED: "Report Generated"
};

const DEPARTMENT_STATUS = {
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress",
  SUBMITTED: "Submitted",
  SIGNED_OFF: "Signed Off"
};

const finalDecisions = ["Approved", "Approved with Conditions", "Requires Remediation", "Rejected"];

const vendorQuestionSections = [
  {
    key: "vendor_information",
    title: "Vendor Information",
    questions: [
      "Type of service/s deployment model would this vendor implement for the company? Describe briefly.",
      "Vendor's clients.",
      "Vendor's local offices.",
      "Vendor's headquarters location.",
      "Number of years the vendor has been in business.",
      "Please describe your ability and capacity to perform the outsourced activities effectively and reliably.",
      "What is your support turnaround time?",
      "Provide vendor client references and actual performance, such as certifications, accreditations, performance ratings, and client industries.",
      "To whom are issues escalated? Please provide name, email address, and contact number.",
      "Have there been any instances where you were unable to deliver services as agreed? If yes, provide details and explanations.",
      "Please provide the cost of this engagement."
    ]
  },
  {
    key: "consumer",
    title: "Consumer",
    questions: [
      "Do you have a mechanism to address client complaints against an authorized agent or representative? Provide an overview of your complaint handling procedures.",
      "How do you ensure that client complaints are addressed quickly and adequately?",
      "Do you have a team or individuals dedicated to managing consumer complaints? If so, state the position and qualifications.",
      "What is the typical time frame for acknowledging and addressing a customer complaint?",
      "How do you track and document customer complaints? Do you use any specific software or system?",
      "Are there remedies or compensation measures in place for customer complaints? If so, provide information.",
      "How do you communicate with customers about the complaint resolution process?",
      "Do you collect feedback from clients regarding satisfaction with the complaint resolution process? How is it used?",
      "How do you ensure complaints are handled according to applicable laws, regulations, and industry standards?",
      "Are you familiar with and do you implement complaint management rules established by regulatory bodies? Provide details."
    ]
  },
  {
    key: "it_risk_management",
    title: "IT Risk Management",
    questions: [
      "Does your involvement include IT-related functions such as hardware, software, cloud, maintenance, or IT resources? If yes, provide detailed scope.",
      "Do you have an IT Risk Management framework or program? Describe and provide supporting documents if available.",
      "Do you monitor and report Key Risk Indicators or IT risk metrics? If yes, provide the latest report.",
      "Do you use third-party IT vendors, contractors, or subcontractors? Describe your policy and procedures for using them.",
      "Share documented agreements such as MSA, SLA, incident handling, change management, problem management, event management, reporting process, NDA, and BCP.",
      "Provide your latest SOC or SSAE-16 SOC report, if applicable.",
      "Have your officers been subjected to regulatory investigations, warnings, or penalties? If yes, describe.",
      "Do you have an internal audit function? If no, explain how internal audit is performed.",
      "Provide the latest internal and external audit report and the status of open findings, if any."
    ]
  },
  {
    key: "compliance",
    title: "Compliance",
    questions: [
      "Enumerate the top shareholders and officers indicated in the General Information Sheet. Provide a copy of the GIS.",
      "Will the service be supplied via private cloud, public cloud, hybrid cloud, or community cloud? Describe the deployment.",
      "Will the service require transfer of company data to another country? If yes, state where data will be stored and what controls are in place.",
      "What are your duties for availability, data backup, incident response, and recovery? Are these duties specified in the contract?",
      "Do you have policies and procedures to comply with AML and CFT regulations?",
      "Will the service involve AML-related transactions? If yes, describe AML controls and provide proof of employee AML training.",
      "Does the contract or SLA include privacy authority acknowledgment, audit access, corrective measures, cancellation rights, system change notification, and remedies for ownership or insolvency changes?"
    ]
  },
  {
    key: "resiliency",
    title: "Resiliency",
    questions: [
      "Is there a specified alternate site documented in the Business Continuity Plan?",
      "Provide the current and approved IT Disaster Recovery and Business Continuity Plan or the approved table of contents and sign-off sheet.",
      "Provide the approved Business Continuity Plan effective date within one year or the approved table of contents and sign-off sheet.",
      "Provide the results of the most recent IT DRP and BCP tests.",
      "Are action plans in place for corrective actions discovered during testing?",
      "Provide a copy of the latest test results."
    ]
  },
  {
    key: "data_privacy",
    title: "Data Privacy",
    questions: [
      "Is your company registered with the National Privacy Commission? Provide the NPC Registration Certificate.",
      "Provide the name and contact details of the Data Protection Officer or equivalent officer.",
      "Who is your organization's Data Privacy Officer and what are their contact details?",
      "Is your company certified with ISO 27701?",
      "Describe all data that would be processed or stored under this engagement.",
      "Will company data, whether PII or non-PII, be stored in the cloud? If yes, indicate geolocation and controls.",
      "Provide the organization's privacy policies or manual, or the table of contents if the full document cannot be shared.",
      "Describe security controls protecting data at rest and in transit, including encryption where applicable.",
      "How will the company be notified if a security breach involving company data occurs?",
      "Provide the organization's formal Incident Response Plan supporting this activity.",
      "Are employees periodically trained on data protection laws and standards? Provide proof of training.",
      "How does your organization securely destroy or remove data when needed?",
      "Where does the data reside or transition through at a given point in time?",
      "Provide a data flow diagram.",
      "Who has legal ownership of transmitted and managed data? Provide the signed contract or governing agreement.",
      "Are your privacy policies and data protection standards aligned with international standards? Provide certification if applicable.",
      "Does the company have any history or track record of not upholding confidentiality of information?",
      "Does any employee or affiliate have any history or track record of not upholding confidentiality of information?",
      "Does your company agree to background checks to ensure no history of not upholding confidentiality?",
      "Does your company agree to independent assessments to validate the effectiveness of the control environment and security mechanisms?"
    ]
  },
  {
    key: "environmental_social_risk",
    title: "Environmental and Social Risk",
    questions: [
      "Do you have outstanding legal, regulatory, or environmental issues that could affect your ability to provide goods or services?",
      "Do you have policies to ensure compliance with labor, environmental, health, and safety laws? Provide supporting documents.",
      "Do you have policies to prevent discrimination, harassment, and abuse of employees? Provide supporting documents.",
      "Do you have systems or policies to prevent fraud, corruption, forced labor, child labor, and unethical practices?",
      "Do you track sustainability performance such as UN SDG impact or ESG indicators? Provide the latest sustainability report if available."
    ]
  },
  {
    key: "information_security",
    title: "Information Security",
    questions: [
      "Is there a dedicated security officer or team responsible for security programs, awareness, and compliance?",
      "Does the security officer report to senior management or a steering committee?",
      "Do you have documented security policies?",
      "Are security policies board approved?",
      "Are security policies regularly reviewed to align with ISO 27001, PCI DSS, NIST, or similar standards?",
      "Does your organization undergo regular internal and external security audits?",
      "Do you comply with relevant local and international laws and security regulations?",
      "Are security requirements incorporated in contracts, including data protection clauses?",
      "Do you have an Information Security Awareness Program?",
      "Are roles and access rights based on the least privilege principle?",
      "Are user privileges regularly reviewed and updated?",
      "Are access logs to sensitive data maintained for access review?",
      "Does your organization encrypt communications and data at rest and in transit?",
      "Do you perform application security testing or assessment before production deployment?",
      "Do you have a security incident response team and procedures?",
      "Do you have an Incident Response Plan for ransomware, phishing, and data breach scenarios?"
    ]
  }
];

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use((req, res, next) => {
  if (req.path.endsWith(".html") || req.path === "/" || req.path === "/index.html") {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
  }
  next();
});

app.use(express.static("public"));

const uploadDir = path.join(__dirname, "public", "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safeName = String(file.originalname || "file").replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }
});

app.use(session({
  secret: process.env.SESSION_SECRET || "validify_secret_key",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 2
  }
}));

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

function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, result) => err ? reject(err) : resolve(result));
  });
}

async function columnExists(tableName, columnName) {
  const rows = await runQuery(
    `SELECT COUNT(*) AS total FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [tableName, columnName]
  );
  return rows[0].total > 0;
}

async function addColumnIfMissing(tableName, columnName, definition) {
  if (!(await columnExists(tableName, columnName))) {
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
      role ENUM('vendor', 'employee', 'it', 'infosec', 'management', 'dpo', 'hr', 'compliance') NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  try {
    await runQuery(`UPDATE users SET role = 'employee' WHERE role = 'admin'`);
  } catch (_error) {}

  try {
    await runQuery(`ALTER TABLE users MODIFY role ENUM('vendor', 'employee', 'it', 'infosec', 'management', 'dpo', 'hr', 'compliance') NOT NULL`);
  } catch (error) {
    console.log("Skipping user role enum update:", error.message);
  }

  await addColumnIfMissing("users", "first_name", "VARCHAR(100) NULL");
  await addColumnIfMissing("users", "last_name", "VARCHAR(100) NULL");
  await addColumnIfMissing("users", "job_title", "VARCHAR(150) NULL");
  await addColumnIfMissing("users", "work_email", "VARCHAR(150) NULL");
  await addColumnIfMissing("users", "profile_photo_path", "VARCHAR(255) NULL");

  await runQuery(`
    CREATE TABLE IF NOT EXISTS wf_vendor_profiles (
      vendor_id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      company_name VARCHAR(180) NOT NULL,
      company_website VARCHAR(255) NULL,
      services TEXT NOT NULL,
      contact_person VARCHAR(150) NOT NULL,
      contact_email VARCHAR(150) NOT NULL,
      contact_number VARCHAR(50) NOT NULL,
      status VARCHAR(80) DEFAULT 'Active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_vendor_company (user_id, company_name)
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS wf_assessments (
      assessment_id INT AUTO_INCREMENT PRIMARY KEY,
      assessment_code VARCHAR(40) UNIQUE,
      vendor_id INT NOT NULL,
      created_by_vendor_user_id INT NOT NULL,
      purpose VARCHAR(150) NOT NULL,
      assessment_date DATE NOT NULL,
      status VARCHAR(100) DEFAULT 'Draft',
      employee_decision VARCHAR(100) NULL,
      employee_comment TEXT NULL,
      final_decision VARCHAR(100) NULL,
      final_notes TEXT NULL,
      final_signer_name VARCHAR(150) NULL,
      final_signature_file_name VARCHAR(255) NULL,
      final_signature_file_path VARCHAR(255) NULL,
      report_generated_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS wf_vendor_answers (
      answer_id INT AUTO_INCREMENT PRIMARY KEY,
      assessment_id INT NOT NULL,
      section_key VARCHAR(100) NOT NULL,
      section_name VARCHAR(180) NOT NULL,
      question_index INT NOT NULL,
      question_text TEXT NOT NULL,
      response VARCHAR(100) NULL,
      explanation TEXT NULL,
      document_file_name VARCHAR(255) NULL,
      document_file_path VARCHAR(255) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_vendor_answer (assessment_id, section_key, question_index)
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS wf_department_reviews (
      review_id INT AUTO_INCREMENT PRIMARY KEY,
      assessment_id INT NOT NULL,
      department_role VARCHAR(60) NOT NULL,
      reviewer_user_id INT NULL,
      status VARCHAR(80) DEFAULT 'Assigned',
      findings TEXT NULL,
      comments TEXT NULL,
      recommendation VARCHAR(100) NULL,
      evidence_file_name VARCHAR(255) NULL,
      evidence_file_path VARCHAR(255) NULL,
      signer_name VARCHAR(150) NULL,
      signature_file_name VARCHAR(255) NULL,
      signature_file_path VARCHAR(255) NULL,
      submitted_at TIMESTAMP NULL,
      signed_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_wf_department_review (assessment_id, department_role)
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS wf_notifications (
      notification_id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      title VARCHAR(180) NOT NULL,
      message TEXT NOT NULL,
      link VARCHAR(255) NULL,
      is_read TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS wf_audit_logs (
      log_id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NULL,
      assessment_id INT NULL,
      action VARCHAR(180) NOT NULL,
      details TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log("Database tables checked.");
}

initDatabase().catch((error) => console.error("Database init error:", error));

db.query("SELECT 1", (err) => {
  if (err) console.error("Database connection failed:", err);
  else console.log("Connected to MySQL database.");
});

function sanitizeRole(role) {
  return role === "admin" ? "employee" : role;
}

function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ message: "You must be logged in first." });
  next();
}

function requireRole(role) {
  return function (req, res, next) {
    if (!req.session.user) return res.status(401).json({ message: "You must be logged in first." });
    if (req.session.user.role !== role) return res.status(403).json({ message: "You are not allowed to do this action." });
    next();
  };
}

function requireDepartment(req, res, next) {
  if (!req.session.user) return res.status(401).json({ message: "You must be logged in first." });
  if (!departmentRoles.includes(req.session.user.role)) return res.status(403).json({ message: "Department account required." });
  next();
}

function makeAssessmentCode(id) {
  return `VA-${String(id).padStart(5, "0")}`;
}

function isPdf(file) {
  return Boolean(file) && (file.mimetype === "application/pdf" || String(file.originalname || "").toLowerCase().endsWith(".pdf"));
}

function isImage(file) {
  return Boolean(file) && (file.mimetype === "image/png" || file.mimetype === "image/jpeg" || /\.(png|jpg|jpeg)$/i.test(file.originalname || ""));
}

function uploadPath(file) {
  return file ? `/uploads/${file.filename}` : null;
}

function sectionByKey(key) {
  return vendorQuestionSections.find((section) => section.key === key) || null;
}

async function addAudit(userId, assessmentId, action, details = null) {
  await runQuery(
    `INSERT INTO wf_audit_logs (user_id, assessment_id, action, details) VALUES (?, ?, ?, ?)`,
    [userId || null, assessmentId || null, action, details]
  );
}

async function notifyUser(userId, title, message, link = null) {
  await runQuery(
    `INSERT INTO wf_notifications (user_id, title, message, link) VALUES (?, ?, ?, ?)`,
    [userId, title, message, link]
  );
}

async function notifyRole(role, title, message, link = null) {
  const rows = await runQuery(`SELECT user_id FROM users WHERE role = ?`, [role]);
  for (const row of rows) {
    await notifyUser(row.user_id, title, message, link);
  }
}

async function getAssessmentBundle(assessmentId) {
  const assessmentRows = await runQuery(
    `
      SELECT
        a.*,
        v.company_name,
        v.company_website,
        v.services,
        v.contact_person,
        v.contact_email,
        v.contact_number,
        u.full_name AS vendor_account_name,
        u.email AS vendor_account_email
      FROM wf_assessments a
      JOIN wf_vendor_profiles v ON a.vendor_id = v.vendor_id
      JOIN users u ON a.created_by_vendor_user_id = u.user_id
      WHERE a.assessment_id = ?
      LIMIT 1
    `,
    [assessmentId]
  );

  if (!assessmentRows.length) return null;

  const answers = await runQuery(
    `SELECT * FROM wf_vendor_answers WHERE assessment_id = ? ORDER BY section_name, question_index ASC`,
    [assessmentId]
  );

  const reviews = await runQuery(
    `SELECT r.*, u.full_name AS reviewer_name FROM wf_department_reviews r LEFT JOIN users u ON r.reviewer_user_id = u.user_id WHERE r.assessment_id = ? ORDER BY FIELD(r.department_role, 'it', 'infosec', 'management', 'dpo', 'hr', 'compliance')`,
    [assessmentId]
  );

  return { ...assessmentRows[0], answers, department_reviews: reviews };
}

async function verifyAllDepartmentReviewsComplete(assessmentId) {
  const reviews = await runQuery(`SELECT * FROM wf_department_reviews WHERE assessment_id = ?`, [assessmentId]);
  const complete = departmentRoles.every((role) => {
    const review = reviews.find((item) => item.department_role === role);
    return review && [DEPARTMENT_STATUS.SUBMITTED, DEPARTMENT_STATUS.SIGNED_OFF].includes(review.status);
  });

  if (complete) {
    await runQuery(`UPDATE wf_assessments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE assessment_id = ?`, [STATUS.UNDER_FINAL_REVIEW, assessmentId]);
    await notifyRole("employee", "All department reviews completed", `Assessment ${makeAssessmentCode(assessmentId)} is ready for final review.`, "employee.html");
  }

  return complete;
}

async function validateVendorSubmissionComplete(assessmentId) {
  const saved = await runQuery(`SELECT * FROM wf_vendor_answers WHERE assessment_id = ?`, [assessmentId]);
  const errors = [];

  for (const section of vendorQuestionSections) {
    for (let index = 0; index < section.questions.length; index++) {
      const answer = saved.find((item) => item.section_key === section.key && Number(item.question_index) === index);
      if (!answer || !answer.response || !String(answer.explanation || "").trim()) {
        errors.push(`${section.title} question ${index + 1} requires an answer and explanation.`);
      }
      if (!answer || !answer.document_file_path) {
        errors.push(`${section.title} question ${index + 1} requires a PDF document.`);
      }
    }
  }

  return errors;
}

/* AUTH */

app.post("/register", async (req, res) => {
  const fullName = String(req.body.full_name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const role = sanitizeRole(req.body.role);

  if (!fullName || !email || !password || !role) {
    return res.status(400).json({ message: "Please fill in all fields." });
  }

  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ message: "Invalid role selected." });
  }

  if (password.length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters." });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    await runQuery(`INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, ?)`, [fullName, email, hash, role]);
    res.json({ message: "Account registered successfully. You can now log in." });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") return res.status(400).json({ message: "Email already exists." });
    console.error("Register error:", error);
    res.status(500).json({ message: "Failed to register account." });
  }
});

app.post("/login", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");

  try {
    const rows = await runQuery(`SELECT * FROM users WHERE email = ? LIMIT 1`, [email]);
    if (!rows.length) return res.status(401).json({ message: "Invalid email or password." });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ message: "Invalid email or password." });

    const role = sanitizeRole(user.role);
    if (role !== user.role) {
      await runQuery(`UPDATE users SET role = ? WHERE user_id = ?`, [role, user.user_id]);
    }

    req.session.user = {
      user_id: user.user_id,
      full_name: user.full_name,
      email: user.email,
      role
    };

    res.json({ message: "Login successful.", user: req.session.user });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Login failed." });
  }
});

app.get("/me", requireAuth, async (req, res) => {
  const rows = await runQuery(
    `SELECT user_id, full_name, email, role, first_name, last_name, job_title, work_email, profile_photo_path FROM users WHERE user_id = ? LIMIT 1`,
    [req.session.user.user_id]
  );

  if (!rows.length) return res.status(401).json({ message: "User not found." });
  req.session.user = { ...req.session.user, ...rows[0], role: sanitizeRole(rows[0].role) };
  res.json(req.session.user);
});

app.post("/profile", requireAuth, upload.single("profile_photo"), async (req, res) => {
  const profilePath = req.file ? uploadPath(req.file) : null;
  await runQuery(
    `UPDATE users SET first_name = ?, last_name = ?, job_title = ?, work_email = ?${profilePath ? ", profile_photo_path = ?" : ""} WHERE user_id = ?`,
    profilePath
      ? [req.body.first_name || null, req.body.last_name || null, req.body.job_title || null, req.body.work_email || null, profilePath, req.session.user.user_id]
      : [req.body.first_name || null, req.body.last_name || null, req.body.job_title || null, req.body.work_email || null, req.session.user.user_id]
  );
  const rows = await runQuery(`SELECT user_id, full_name, email, role, first_name, last_name, job_title, work_email, profile_photo_path FROM users WHERE user_id = ?`, [req.session.user.user_id]);
  req.session.user = { ...req.session.user, ...rows[0] };
  res.json({ message: "Profile updated.", user: req.session.user });
});

app.post("/logout", (req, res) => {
  req.session.destroy(() => res.json({ message: "Logged out successfully." }));
});

app.get("/question-bank", requireAuth, (_req, res) => {
  res.json({ vendor_sections: vendorQuestionSections, department_roles: departmentRoles, role_labels: roleLabels, statuses: STATUS });
});

app.get("/notifications", requireAuth, async (req, res) => {
  const rows = await runQuery(`SELECT * FROM wf_notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`, [req.session.user.user_id]);
  res.json(rows);
});

app.post("/notifications/read", requireAuth, async (req, res) => {
  await runQuery(`UPDATE wf_notifications SET is_read = 1 WHERE user_id = ?`, [req.session.user.user_id]);
  res.json({ message: "Notifications marked as read." });
});

/* VENDOR FLOW */

app.get("/vendor/dashboard", requireRole("vendor"), async (req, res) => {
  const userId = req.session.user.user_id;
  const vendors = await runQuery(`SELECT * FROM wf_vendor_profiles WHERE user_id = ? ORDER BY updated_at DESC`, [userId]);
  const assessments = await runQuery(
    `SELECT a.*, v.company_name, v.services FROM wf_assessments a JOIN wf_vendor_profiles v ON a.vendor_id = v.vendor_id WHERE a.created_by_vendor_user_id = ? ORDER BY a.updated_at DESC`,
    [userId]
  );
  const notifications = await runQuery(`SELECT * FROM wf_notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 10`, [userId]);
  res.json({ vendors, assessments, notifications });
});

app.post("/vendor/company", requireRole("vendor"), async (req, res) => {
  const userId = req.session.user.user_id;
  const companyName = String(req.body.company_name || "").trim();
  const services = String(req.body.services || "").trim();
  const contactPerson = String(req.body.contact_person || "").trim();
  const contactEmail = String(req.body.contact_email || "").trim();
  const contactNumber = String(req.body.contact_number || "").trim();

  if (!companyName || !services || !contactPerson || !contactEmail || !contactNumber) {
    return res.status(400).json({ message: "Company name, services, contact person, email, and number are required." });
  }

  const existing = await runQuery(`SELECT vendor_id FROM wf_vendor_profiles WHERE user_id = ? AND LOWER(company_name) = LOWER(?) LIMIT 1`, [userId, companyName]);
  if (existing.length) {
    await runQuery(
      `UPDATE wf_vendor_profiles SET company_website = ?, services = ?, contact_person = ?, contact_email = ?, contact_number = ? WHERE vendor_id = ? AND user_id = ?`,
      [req.body.company_website || null, services, contactPerson, contactEmail, contactNumber, existing[0].vendor_id, userId]
    );
    return res.json({ message: "Company information updated.", vendor_id: existing[0].vendor_id });
  }

  const result = await runQuery(
    `INSERT INTO wf_vendor_profiles (user_id, company_name, company_website, services, contact_person, contact_email, contact_number) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [userId, companyName, req.body.company_website || null, services, contactPerson, contactEmail, contactNumber]
  );
  res.json({ message: "Company information saved.", vendor_id: result.insertId });
});

app.post("/vendor/assessments", requireRole("vendor"), async (req, res) => {
  const userId = req.session.user.user_id;
  const vendorId = Number(req.body.vendor_id);
  const purpose = String(req.body.purpose || "").trim();
  const assessmentDate = String(req.body.assessment_date || "").trim();

  if (!vendorId || !purpose || !assessmentDate) {
    return res.status(400).json({ message: "Vendor profile, purpose, and assessment date are required." });
  }

  const vendors = await runQuery(`SELECT * FROM wf_vendor_profiles WHERE vendor_id = ? AND user_id = ? LIMIT 1`, [vendorId, userId]);
  if (!vendors.length) return res.status(404).json({ message: "Vendor profile not found for this account." });

  const result = await runQuery(
    `INSERT INTO wf_assessments (vendor_id, created_by_vendor_user_id, purpose, assessment_date, status) VALUES (?, ?, ?, ?, ?)`,
    [vendorId, userId, purpose, assessmentDate, STATUS.DRAFT]
  );
  const code = makeAssessmentCode(result.insertId);
  await runQuery(`UPDATE wf_assessments SET assessment_code = ? WHERE assessment_id = ?`, [code, result.insertId]);
  await addAudit(userId, result.insertId, "Vendor created assessment draft", purpose);
  res.json(await getAssessmentBundle(result.insertId));
});

app.get("/vendor/assessments/:id", requireRole("vendor"), async (req, res) => {
  const bundle = await getAssessmentBundle(req.params.id);
  if (!bundle || Number(bundle.created_by_vendor_user_id) !== Number(req.session.user.user_id)) {
    return res.status(404).json({ message: "Assessment not found for this account." });
  }
  res.json(bundle);
});

app.post("/vendor/assessments/:id/save", requireRole("vendor"), upload.any(), async (req, res) => {
  const assessmentId = Number(req.params.id);
  const bundle = await getAssessmentBundle(assessmentId);
  if (!bundle || Number(bundle.created_by_vendor_user_id) !== Number(req.session.user.user_id)) {
    return res.status(404).json({ message: "Assessment not found for this account." });
  }

  if (![STATUS.DRAFT, STATUS.RETURNED_TO_VENDOR, STATUS.SUBMITTED_BY_VENDOR].includes(bundle.status)) {
    return res.status(400).json({ message: "This assessment can no longer be edited by the vendor." });
  }

  let answers;
  try {
    answers = JSON.parse(req.body.answers || "[]");
  } catch (_error) {
    return res.status(400).json({ message: "Invalid answer data." });
  }

  const filesByField = {};
  for (const file of req.files || []) {
    filesByField[file.fieldname] = file;
    if (!isPdf(file)) {
      return res.status(400).json({ message: "Only PDF files are accepted for due diligence documents." });
    }
  }

  for (const answer of answers) {
    const section = sectionByKey(answer.section_key);
    if (!section) continue;
    const file = filesByField[`document_${answer.section_key}_${answer.question_index}`];
    const existingFilePath = answer.existing_document_file_path || null;

    await runQuery(
      `
        INSERT INTO wf_vendor_answers
        (assessment_id, section_key, section_name, question_index, question_text, response, explanation, document_file_name, document_file_path)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          section_name = VALUES(section_name),
          question_text = VALUES(question_text),
          response = VALUES(response),
          explanation = VALUES(explanation),
          document_file_name = VALUES(document_file_name),
          document_file_path = VALUES(document_file_path),
          updated_at = CURRENT_TIMESTAMP
      `,
      [
        assessmentId,
        section.key,
        section.title,
        Number(answer.question_index),
        section.questions[Number(answer.question_index)] || answer.question_text || "",
        answer.response || null,
        answer.explanation || null,
        file ? file.originalname : answer.existing_document_file_name || null,
        file ? uploadPath(file) : existingFilePath
      ]
    );
  }

  const submit = req.body.submit === "1";
  if (submit) {
    const errors = await validateVendorSubmissionComplete(assessmentId);
    if (errors.length) {
      return res.status(400).json({ message: errors.slice(0, 5).join(" ") });
    }

    await runQuery(
      `UPDATE wf_assessments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE assessment_id = ?`,
      [STATUS.SUBMITTED_BY_VENDOR, assessmentId]
    );
    await notifyRole("employee", "Vendor due diligence submitted", `${bundle.company_name} submitted ${bundle.assessment_code || makeAssessmentCode(assessmentId)} for employee review.`, "employee.html");
    await addAudit(req.session.user.user_id, assessmentId, "Vendor submitted due diligence", bundle.company_name);
    return res.json({ message: "Due diligence submitted to Employee / Compliance Officer.", assessment: await getAssessmentBundle(assessmentId) });
  }

  await runQuery(`UPDATE wf_assessments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE assessment_id = ?`, [STATUS.DRAFT, assessmentId]);
  res.json({ message: "Draft saved.", assessment: await getAssessmentBundle(assessmentId) });
});

/* EMPLOYEE FLOW */

app.get("/employee/dashboard", requireRole("employee"), async (_req, res) => {
  const assessments = await runQuery(
    `SELECT a.*, v.company_name, v.services, v.contact_person, v.contact_email FROM wf_assessments a JOIN wf_vendor_profiles v ON a.vendor_id = v.vendor_id ORDER BY a.updated_at DESC`
  );
  const notifications = await runQuery(`SELECT * FROM wf_notifications WHERE user_id IN (SELECT user_id FROM users WHERE role = 'employee') ORDER BY created_at DESC LIMIT 15`);
  const stats = {
    submitted: assessments.filter((a) => a.status === STATUS.SUBMITTED_BY_VENDOR).length,
    department_review: assessments.filter((a) => a.status === STATUS.UNDER_DEPARTMENT_REVIEW).length,
    final_review: assessments.filter((a) => a.status === STATUS.UNDER_FINAL_REVIEW).length,
    completed: assessments.filter((a) => a.status === STATUS.REPORT_GENERATED).length
  };
  res.json({ assessments, notifications, stats });
});

app.get("/employee/assessments/:id", requireRole("employee"), async (req, res) => {
  const bundle = await getAssessmentBundle(req.params.id);
  if (!bundle) return res.status(404).json({ message: "Assessment not found." });
  if (bundle.status === STATUS.SUBMITTED_BY_VENDOR) {
    await runQuery(`UPDATE wf_assessments SET status = ? WHERE assessment_id = ?`, [STATUS.UNDER_EMPLOYEE_REVIEW, bundle.assessment_id]);
    bundle.status = STATUS.UNDER_EMPLOYEE_REVIEW;
  }
  res.json(bundle);
});

app.post("/employee/assessments/:id/decision", requireRole("employee"), async (req, res) => {
  const assessmentId = Number(req.params.id);
  const decision = String(req.body.decision || "").trim();
  const comment = String(req.body.comment || "").trim();
  const bundle = await getAssessmentBundle(assessmentId);

  if (!bundle) return res.status(404).json({ message: "Assessment not found." });
  if (![STATUS.SUBMITTED_BY_VENDOR, STATUS.UNDER_EMPLOYEE_REVIEW, STATUS.RETURNED_TO_VENDOR].includes(bundle.status)) {
    return res.status(400).json({ message: "This assessment is not waiting for employee due diligence review." });
  }

  if (decision === "RETURN") {
    if (!comment) return res.status(400).json({ message: "Return comment is required." });
    await runQuery(`UPDATE wf_assessments SET status = ?, employee_decision = 'Returned', employee_comment = ? WHERE assessment_id = ?`, [STATUS.RETURNED_TO_VENDOR, comment, assessmentId]);
    await notifyUser(bundle.created_by_vendor_user_id, "Due diligence returned", `${bundle.assessment_code} was returned for revision. ${comment}`, "vendor.html");
    await addAudit(req.session.user.user_id, assessmentId, "Employee returned submission", comment);
    return res.json({ message: "Submission returned to vendor for revision.", assessment: await getAssessmentBundle(assessmentId) });
  }

  if (decision === "REJECT") {
    if (!comment) return res.status(400).json({ message: "Reject comment is required." });
    await runQuery(`UPDATE wf_assessments SET status = ?, employee_decision = 'Rejected', employee_comment = ?, final_decision = 'Rejected' WHERE assessment_id = ?`, [STATUS.REJECTED, comment, assessmentId]);
    await notifyUser(bundle.created_by_vendor_user_id, "Due diligence rejected", `${bundle.assessment_code} was rejected. ${comment}`, "vendor.html");
    await addAudit(req.session.user.user_id, assessmentId, "Employee rejected submission", comment);
    return res.json({ message: "Submission rejected.", assessment: await getAssessmentBundle(assessmentId) });
  }

  if (decision === "APPROVE_FOR_DEPARTMENT") {
    const departments = Array.isArray(req.body.departments) && req.body.departments.length
      ? req.body.departments.filter((role) => departmentRoles.includes(role))
      : departmentRoles;

    if (!departments.length) return res.status(400).json({ message: "Select at least one department." });

    for (const role of departments) {
      await runQuery(
        `INSERT INTO wf_department_reviews (assessment_id, department_role, status) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE status = VALUES(status), updated_at = CURRENT_TIMESTAMP`,
        [assessmentId, role, DEPARTMENT_STATUS.ASSIGNED]
      );
      await notifyRole(role, "New vendor assessment assigned", `${bundle.company_name} assessment ${bundle.assessment_code} was routed to your department.`, "department.html");
    }

    await runQuery(
      `UPDATE wf_assessments SET status = ?, employee_decision = 'Approved for Department Review', employee_comment = ? WHERE assessment_id = ?`,
      [STATUS.UNDER_DEPARTMENT_REVIEW, comment || null, assessmentId]
    );
    await notifyUser(bundle.created_by_vendor_user_id, "Due diligence approved for review", `${bundle.assessment_code} was approved for department review.`, "vendor.html");
    await addAudit(req.session.user.user_id, assessmentId, "Employee approved for department review", departments.join(", "));
    return res.json({ message: "Assessment routed to departments.", assessment: await getAssessmentBundle(assessmentId) });
  }

  res.status(400).json({ message: "Invalid employee decision." });
});

app.post("/employee/assessments/:id/final-decision", requireRole("employee"), upload.single("signature"), async (req, res) => {
  const assessmentId = Number(req.params.id);
  const decision = String(req.body.final_decision || "").trim();
  const notes = String(req.body.final_notes || "").trim();
  const signer = String(req.body.signer_name || "").trim();

  if (!finalDecisions.includes(decision)) return res.status(400).json({ message: "Invalid final decision." });
  if (!signer) return res.status(400).json({ message: "Signer name is required." });
  if (req.file && !isImage(req.file)) return res.status(400).json({ message: "Final signature must be PNG or JPG." });

  const bundle = await getAssessmentBundle(assessmentId);
  if (!bundle) return res.status(404).json({ message: "Assessment not found." });

  const missing = departmentRoles.filter((role) => {
    const review = bundle.department_reviews.find((item) => item.department_role === role);
    return !review || ![DEPARTMENT_STATUS.SUBMITTED, DEPARTMENT_STATUS.SIGNED_OFF].includes(review.status);
  });

  if (missing.length) {
    return res.status(400).json({ message: `Cannot finalize. Missing department reviews/sign-offs: ${missing.map((r) => roleLabels[r]).join(", ")}.` });
  }

  await runQuery(
    `
      UPDATE wf_assessments
      SET status = ?, final_decision = ?, final_notes = ?, final_signer_name = ?, final_signature_file_name = ?, final_signature_file_path = ?, report_generated_at = CURRENT_TIMESTAMP
      WHERE assessment_id = ?
    `,
    [STATUS.REPORT_GENERATED, decision, notes || null, signer, req.file ? req.file.originalname : null, req.file ? uploadPath(req.file) : null, assessmentId]
  );

  await notifyUser(bundle.created_by_vendor_user_id, "Final decision available", `${bundle.assessment_code} final decision: ${decision}.`, "vendor.html");
  await addAudit(req.session.user.user_id, assessmentId, "Employee final decision and sign-off", decision);
  res.json({ message: "Final decision signed. Report is ready and vendor was notified.", assessment: await getAssessmentBundle(assessmentId) });
});

/* DEPARTMENT FLOW */

app.get("/department/dashboard", requireDepartment, async (req, res) => {
  const role = req.session.user.role;
  const reviews = await runQuery(
    `
      SELECT r.*, a.assessment_code, a.status AS assessment_status, a.purpose, a.assessment_date, v.company_name, v.services
      FROM wf_department_reviews r
      JOIN wf_assessments a ON r.assessment_id = a.assessment_id
      JOIN wf_vendor_profiles v ON a.vendor_id = v.vendor_id
      WHERE r.department_role = ?
      ORDER BY r.updated_at DESC
    `,
    [role]
  );
  const notifications = await runQuery(`SELECT * FROM wf_notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 15`, [req.session.user.user_id]);
  const stats = {
    assigned: reviews.length,
    pending: reviews.filter((r) => [DEPARTMENT_STATUS.ASSIGNED, DEPARTMENT_STATUS.IN_PROGRESS].includes(r.status)).length,
    submitted: reviews.filter((r) => [DEPARTMENT_STATUS.SUBMITTED, DEPARTMENT_STATUS.SIGNED_OFF].includes(r.status)).length,
    rejected: reviews.filter((r) => r.recommendation === "Rejected").length
  };
  res.json({ reviews, notifications, stats, role_label: roleLabels[role] });
});

app.get("/department/reviews/:id", requireDepartment, async (req, res) => {
  const role = req.session.user.role;
  const reviewRows = await runQuery(`SELECT * FROM wf_department_reviews WHERE review_id = ? AND department_role = ? LIMIT 1`, [req.params.id, role]);
  if (!reviewRows.length) return res.status(404).json({ message: "Department review not found." });
  const review = reviewRows[0];
  if (review.status === DEPARTMENT_STATUS.ASSIGNED) {
    await runQuery(`UPDATE wf_department_reviews SET status = ?, reviewer_user_id = ? WHERE review_id = ?`, [DEPARTMENT_STATUS.IN_PROGRESS, req.session.user.user_id, review.review_id]);
    review.status = DEPARTMENT_STATUS.IN_PROGRESS;
  }
  const assessment = await getAssessmentBundle(review.assessment_id);
  res.json({ review, assessment });
});

app.post("/department/reviews/:id/submit", requireDepartment, upload.fields([
  { name: "evidence", maxCount: 1 },
  { name: "signature", maxCount: 1 }
]), async (req, res) => {
  const role = req.session.user.role;
  const reviewRows = await runQuery(`SELECT * FROM wf_department_reviews WHERE review_id = ? AND department_role = ? LIMIT 1`, [req.params.id, role]);
  if (!reviewRows.length) return res.status(404).json({ message: "Department review not found." });

  const review = reviewRows[0];
  const findings = String(req.body.findings || "").trim();
  const comments = String(req.body.comments || "").trim();
  const recommendation = String(req.body.recommendation || "").trim();
  const signer = String(req.body.signer_name || "").trim();

  if (!findings || !comments || !recommendation || !signer) {
    return res.status(400).json({ message: "Findings, comments, recommendation, and signer name are required." });
  }

  if (!finalDecisions.includes(recommendation)) {
    return res.status(400).json({ message: "Invalid recommendation." });
  }

  const evidence = req.files?.evidence?.[0] || null;
  const signature = req.files?.signature?.[0] || null;

  if (evidence && !isPdf(evidence)) return res.status(400).json({ message: "Evidence must be a PDF file." });
  if (signature && !isImage(signature)) return res.status(400).json({ message: "Signature must be PNG or JPG." });

  await runQuery(
    `
      UPDATE wf_department_reviews
      SET reviewer_user_id = ?, status = ?, findings = ?, comments = ?, recommendation = ?, evidence_file_name = ?, evidence_file_path = ?, signer_name = ?, signature_file_name = ?, signature_file_path = ?, submitted_at = CURRENT_TIMESTAMP, signed_at = CURRENT_TIMESTAMP
      WHERE review_id = ?
    `,
    [
      req.session.user.user_id,
      DEPARTMENT_STATUS.SIGNED_OFF,
      findings,
      comments,
      recommendation,
      evidence ? evidence.originalname : review.evidence_file_name,
      evidence ? uploadPath(evidence) : review.evidence_file_path,
      signer,
      signature ? signature.originalname : review.signature_file_name,
      signature ? uploadPath(signature) : review.signature_file_path,
      review.review_id
    ]
  );

  const assessment = await getAssessmentBundle(review.assessment_id);
  await notifyRole("employee", `${roleLabels[role]} review completed`, `${roleLabels[role]} submitted findings and sign-off for ${assessment.assessment_code}.`, "employee.html");
  await addAudit(req.session.user.user_id, review.assessment_id, `${roleLabels[role]} submitted review`, recommendation);
  await verifyAllDepartmentReviewsComplete(review.assessment_id);
  res.json({ message: "Department review, recommendation, evidence, and sign-off submitted." });
});

/* REPORT EXPORT */

function setCell(cell, value, options = {}) {
  cell.value = value;
  cell.alignment = { vertical: "top", horizontal: options.center ? "center" : "left", wrapText: true };
  cell.border = {
    top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" }
  };
  cell.font = options.font || { size: 10 };
  if (options.fill) {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: options.fill } };
  }
}

app.get("/employee/export-excel", requireRole("employee"), async (req, res) => {
  const assessmentId = Number(req.query.assessment_id);
  if (!assessmentId) return res.status(400).json({ message: "assessment_id is required." });

  const bundle = await getAssessmentBundle(assessmentId);
  if (!bundle) return res.status(404).json({ message: "Assessment not found." });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Validify";
  workbook.created = new Date();

  const summary = workbook.addWorksheet("Final Report");
  summary.columns = [{ width: 28 }, { width: 80 }];
  summary.mergeCells("A1:B1");
  setCell(summary.getCell("A1"), `${bundle.company_name} - VENDOR DUE DILIGENCE FINAL REPORT`, { center: true, fill: "FF1F4E79", font: { bold: true, size: 14, color: { argb: "FFFFFFFF" } } });
  const metaRows = [
    ["Assessment Code", bundle.assessment_code],
    ["Vendor", bundle.company_name],
    ["Purpose", bundle.purpose],
    ["Assessment Date", bundle.assessment_date ? new Date(bundle.assessment_date).toLocaleDateString() : ""],
    ["Current Status", bundle.status],
    ["Employee Decision", bundle.employee_decision || ""],
    ["Final Decision", bundle.final_decision || ""],
    ["Final Notes", bundle.final_notes || ""],
    ["Final Signer", bundle.final_signer_name || ""],
    ["Report Generated", bundle.report_generated_at ? new Date(bundle.report_generated_at).toLocaleString() : ""]
  ];
  metaRows.forEach((row, index) => {
    setCell(summary.getCell(index + 3, 1), row[0], { font: { bold: true, size: 10 } });
    setCell(summary.getCell(index + 3, 2), row[1] || "");
  });

  const ddf = workbook.addWorksheet("Vendor Due Diligence");
  ddf.columns = [{ width: 26 }, { width: 70 }, { width: 18 }, { width: 50 }, { width: 28 }];
  ["Section", "Question", "Response", "Explanation", "PDF Document"].forEach((h, i) => setCell(ddf.getCell(1, i + 1), h, { fill: "FF1F4E79", font: { bold: true, color: { argb: "FFFFFFFF" }, size: 10 } }));
  bundle.answers.forEach((a, i) => {
    const row = i + 2;
    setCell(ddf.getCell(row, 1), a.section_name);
    setCell(ddf.getCell(row, 2), a.question_text);
    setCell(ddf.getCell(row, 3), a.response);
    setCell(ddf.getCell(row, 4), a.explanation);
    setCell(ddf.getCell(row, 5), a.document_file_name || "");
    ddf.getRow(row).height = 58;
  });

  const reviews = workbook.addWorksheet("Department Reviews");
  reviews.columns = [{ width: 18 }, { width: 18 }, { width: 24 }, { width: 45 }, { width: 45 }, { width: 25 }, { width: 25 }];
  ["Department", "Status", "Recommendation", "Findings", "Comments", "Evidence", "Signed By"].forEach((h, i) => setCell(reviews.getCell(1, i + 1), h, { fill: "FF1F4E79", font: { bold: true, color: { argb: "FFFFFFFF" }, size: 10 } }));
  bundle.department_reviews.forEach((r, i) => {
    const row = i + 2;
    setCell(reviews.getCell(row, 1), roleLabels[r.department_role] || r.department_role);
    setCell(reviews.getCell(row, 2), r.status);
    setCell(reviews.getCell(row, 3), r.recommendation || "");
    setCell(reviews.getCell(row, 4), r.findings || "");
    setCell(reviews.getCell(row, 5), r.comments || "");
    setCell(reviews.getCell(row, 6), r.evidence_file_name || "");
    setCell(reviews.getCell(row, 7), r.signer_name || "");
    reviews.getRow(row).height = 58;
  });

  const safeCode = String(bundle.assessment_code || `VA-${assessmentId}`).replace(/[^a-zA-Z0-9_-]/g, "");
  const safeCompany = String(bundle.company_name || "Vendor").replace(/[^a-zA-Z0-9 _-]/g, "").replace(/\s+/g, "_");

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename=Validify_${safeCode}_${safeCompany}_Final_Report.xlsx`);
  await workbook.xlsx.write(res);
  res.end();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
