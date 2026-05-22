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

const allowedRoles = [
  "vendor",
  "employee",
  "it",
  "infosec",
  "management",
  "dpo",
  "hr",
  "compliance"
];

const departmentRoles = [
  "it",
  "infosec",
  "management",
  "dpo",
  "hr",
  "compliance"
];

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

function normalizeUserRole(role) {
  return role === "admin" ? "employee" : role;
}

const INFOSEC_LOGIN_ACCOUNT_ID = process.env.INFOSEC_LOGIN_ACCOUNT_ID || "infosecaccessonly2026";

function normalizeAccountApprovalStatus(status) {
  const value = String(status || "Approved").trim();

  if (["Pending", "Approved", "Rejected"].includes(value)) {
    return value;
  }

  return "Pending";
}


const assessmentCodePrefixes = {
  it: "IT",
  infosec: "IS",
  management: "MG",
  dpo: "DP",
  hr: "HR",
  compliance: "CP"
};

const vendorInformationQuestions = [
  "Type of service/s deployment model would this vendor implement for the company? Describe briefly.",
  "Vendor's clients.",
  "Vendor's Local Offices.",
  "Vendor's HQ Location.",
  "Number of years has been in the business.",
  "Please describe your ability and capacity to perform the outsourced activities effectively and reliably.",
  "What is your Support Turnaround time?",
  "Vendor's clients and actual performance, such as certifications, accreditations, performance rating, and what industries your clients belong to.",
  "To whom are issues escalated? Please provide name, email address, and contact number.",
  "Have there been any instances where you were unable to deliver services as per the agreed terms? If yes, please provide details and explanations.",
  "Please provide the cost of this particular engagement."
];

const consumerQuestions = [
  "Do you have a mechanism to address clients' complaints against an authorized agent or representative? Please provide an overview of your complaint handling procedures.",
  "How do you ensure that client complaints are addressed quickly and adequately?",
  "Do you have a team or individuals dedicated to managing consumer complaints? If so, lay out the position and qualifications.",
  "What is a typical time frame for acknowledging and addressing a customer complaint?",
  "How do you track and document customer complaints? Do you use any specific software or system for this purpose?",
  "Are there any typical remedies or compensation measures in place to handle customer complaints? If so, please provide information.",
  "How do you communicate with customers about the complaint resolution process? Do you provide updates and progress reports?",
  "Do you solicit feedback from clients regarding their satisfaction with the complaint resolution process? If so, how do you collect and utilize feedback to improve your services?",
  "How do you ensure that complaints are handled in accordance with applicable laws, regulations, and industry standards?",
  "Are you familiar with and implement the complaint management rules established by regulatory bodies, such as the Bangko Sentral ng Pilipinas? Please provide details."
];

const resiliencyQuestions = [
  "Is there a specified alternate site documented in the BCP?",
  "Provide the current and approved IT Disaster Recovery and Business Continuity Plan, including resumption strategies, disaster communication or reporting procedures, prioritization arrangements, data backup and recovery arrangements, cloud synchronization procedures, Recovery Time Objective, and Minimum Time Period of Disruption. Otherwise, provide the table of contents and sign-off sheet of the approved IT DR and BCP document.",
  "Provide the approved Business Continuity Plan effective date within one year. Otherwise, provide the table of contents of the approved BCP document including the sign-off sheet of the approvals.",
  "Provide the results of the most recent IT DRP and BCP tests.",
  "Are there action plans in place to handle any corrective actions discovered during the test?",
  "Please provide a copy of the latest test results."
];

const departmentQuestionGroups = {
  employee: [
    {
      section_name: "Vendor Information",
      questions: vendorInformationQuestions
    }
  ],
  infosec: [
    {
      section_name: "Information Security",
      questions: [
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
      ]
    }
  ],
  management: [
    {
      section_name: "Consumer",
      questions: consumerQuestions
    },
    {
      section_name: "Resiliency",
      questions: resiliencyQuestions
    }
  ],
  it: [
    {
      section_name: "IT Risk Management",
      questions: [
        "Does your organization's specific involvement with the company include IT-related functions such as hardware, software, cloud, maintenance, and other IT resources or assets? If yes, please provide detailed scope, involvement, and outsourced IT functions.",
        "Do you have an IT Risk Management organizational framework and/or program? If so, please describe and/or provide an organizational chart. Please share any current ITRM reports.",
        "Do you monitor and report Key Risk Indicators and other IT Risk Metrics? If no but applicable, provide compensating controls on how your organization mitigates existing and potential IT risk incidents. If yes, describe and provide the latest report.",
        "Do you use any third-party IT vendors, contractors, or subcontractors? If so, do you have a clear policy and procedures in place for using third-party vendors? Please describe relevant contractors and subcontractors.",
        "Please share the following documented agreements, approved or drafted: Master Service Agreement including Service Level Agreement, Incident Handling, Change Management, Problem Management, Event Management, Reporting Process, Non-Disclosure Agreement, and Business Continuity Plan.",
        "Please provide a copy of your organization's latest SOC or SSAE-16 SOC Report, if applicable.",
        "Have your officers been subjected to regulator investigations, warnings, or penalties? If yes, please describe.",
        "Do you have an Internal Audit Function? If no, please explain how and who performs the internal audit function.",
        "Please provide any latest Internal and External Audit Report and the status of open findings, if any."
      ]
    }
  ],
  compliance: [
    {
      section_name: "Compliance",
      questions: [
        "Enumerate the top shareholders and officers of the vendor as indicated in the General Information Sheet. Kindly provide a copy of the General Information Sheet.",
        "Will the service be supplied via private cloud, public cloud, hybrid cloud, or community cloud? Please describe the deployment of the cloud service.",
        "Will the service require the transfer of company data to another country? If so, where will company data be stored, and what physical and logical controls will be in place to preserve and ensure its availability?",
        "What are the vendor's duties for availability, data backup, incident response, and recovery? Are these duties specified in the contract?",
        "Do you have policies and procedures to comply with AML and CFT regulations?",
        "Will the service to be provided involve AML-related transactions, such as account opening, remittance, or asset custody? If yes, what AML-related controls are implemented by the vendor? If employees will handle company transactions, processes, or systems, do these employees have AML trainings? Kindly submit proof of compliance such as AML training materials and attendance sheet.",
        "For the vendor-provided contract or company standard contract, are the following included in the contract or service level agreement: acknowledgment of National Privacy Commission supervisory authority, access of internal and external auditors, corrective measures for NPC or audit findings, cancellation rights if required by NPC, mandatory notification of system changes, and remedies in the event of change in ownership, assignment, attachment of assets, insolvency, or receivership of the vendor?"
      ]
    }
  ],
  dpo: [
    {
      section_name: "Data Privacy",
      questions: [
        "Is your company registered at the National Privacy Commission? Please provide the NPC Registration Certificate.",
        "Provide the name and contact details of the organization's Data Protection Officer or any equivalent officer in charge of overall compliance with applicable data protection laws and standards.",
        "Who is your organization's Data Privacy Officer and what are their contact details?",
        "Is your company certified with ISO 27701?",
        "Describe in detail all the data that would be processed or stored under this engagement.",
        "Will the company's data, whether PII or non-PII, be stored in cloud? If yes, indicate the geolocation of the cloud server and the physical and technical controls employed in the storage facility.",
        "Provide the organization's privacy policies or manual. Otherwise, provide the table of contents of the organization's policies and manual.",
        "Describe the security controls employed to protect data at rest and data in transit. Include the type of encryption whenever applicable.",
        "How will the company be notified if an information security breach involving company data occurred?",
        "Provide the organization's formal Incident Response Plan supporting this activity.",
        "Are your employees periodically trained on data protection laws and standards? Provide attestation or proof of regular training conducted.",
        "How does your organization securely destroy or remove data when the need arises?",
        "Where does the data or information reside, or where is it transitioning through, at a given point in time?",
        "Provide a data flow diagram.",
        "Who has the legal ownership of the data transmitted and managed through the vendor or partner? Provide the signed contract, agreement, or any document governing the engagement.",
        "Are your privacy policies and data protection standards aligned with international standards? Provide a copy of certification if applicable, such as TUV or ISO.",
        "Does the company have history or track record of not upholding confidentiality of information?",
        "Does any of your employees and/or affiliates have any history or track record of not upholding confidentiality of information?",
        "Does your company agree to be subjected to background checks to ensure that the company has no history or track record of not upholding confidentiality of information?",
        "Does your company agree to be subjected to independent assessments for purposes of ensuring the Technology Service Provider's control environment and security mechanisms are effective?"
      ]
    }
  ],
  hr: [
    {
      section_name: "Environmental and Social Risk Management",
      questions: [
        "Do you have any outstanding legal, regulatory, or environmental issues that could impact your ability to supply goods or services to us? If yes, provide a description of the issue and the status or action plan. Please provide Environmental Compliance Certification and BCP test result where applicable.",
        "Do you have policies in place to ensure compliance with all relevant laws and regulations, including labor, environmental, and health and safety laws? If yes, provide a description of the policy and a copy of Occupational Health and Safety policies, related government-mandated reports, Sustainability Policy, or any equivalent policy.",
        "Do you have policies in place to prevent discrimination, harassment, and abuse of employees? If yes, provide a description and a copy of the policy or guideline.",
        "Do you have systems and/or policies in place to prevent fraud, corruption, forced labor, child labor, and other unethical practices? If yes, provide a description and a copy of the policy or guideline.",
        "Do you track and measure your sustainability performance, such as UN SDG impact or ESG indicators? Do you have a sustainability report? If yes, provide a copy of your latest sustainability report."
      ]
    }
  ]
};

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* SECURITY:
   Prevent browser from caching login/dashboard HTML pages.
   This helps stop the Back button from showing old protected pages.
*/
app.use((req, res, next) => {
  if (
    req.path.endsWith(".html") ||
    req.path === "/" ||
    req.path === "/login.html" ||
    req.path === "/index.html" ||
    req.path === "/employee.html" ||
    req.path === "/department.html" ||
    req.path === "/vendor.html"
  ) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Surrogate-Control", "no-store");
  }

  next();
});

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

function requireRole(role) {
  return function (req, res, next) {
    if (!req.session.user) {
      return res.status(401).json({ message: "You must be logged in first." });
    }

    if (req.session.user.role !== role) {
      return res.status(403).json({ message: "You are not allowed to do this action." });
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
      return res.status(403).json({ message: "You are not allowed to do this action." });
    }

    next();
  };
}

function requireDepartment(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ message: "You must be logged in first." });
  }

  if (!departmentRoles.includes(req.session.user.role)) {
    return res.status(403).json({ message: "Department account required." });
  }

  next();
}

function requireVendor(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ message: "You must be logged in first." });
  }

  if (req.session.user.role !== "vendor") {
    return res.status(403).json({ message: "Vendor account required." });
  }

  next();
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
      role ENUM('vendor', 'employee', 'it', 'infosec', 'management', 'dpo', 'hr', 'compliance') NOT NULL,
      email_verified TINYINT(1) DEFAULT 1,
      verification_token_hash VARCHAR(255) NULL,
      verification_token_expires DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  
  await addColumnIfMissing("users", "email_verified", "TINYINT(1) DEFAULT 1");
  await addColumnIfMissing("users", "verification_token_hash", "VARCHAR(255) NULL");
  await addColumnIfMissing("users", "verification_token_expires", "DATETIME NULL");

  await addColumnIfMissing("users", "first_name", "VARCHAR(100) NULL");
  await addColumnIfMissing("users", "last_name", "VARCHAR(100) NULL");
  await addColumnIfMissing("users", "job_title", "VARCHAR(150) NULL");
  await addColumnIfMissing("users", "work_email", "VARCHAR(150) NULL");
  await addColumnIfMissing("users", "profile_photo_path", "VARCHAR(255) NULL");
  await addColumnIfMissing("users", "account_approval_status", "VARCHAR(30) DEFAULT 'Approved'");
  await addColumnIfMissing("users", "account_approved_by_user_id", "INT NULL");
  await addColumnIfMissing("users", "account_decision_at", "TIMESTAMP NULL");
  await addColumnIfMissing("users", "account_rejection_reason", "TEXT NULL");

  await runQuery(`
    UPDATE users
    SET account_approval_status = 'Approved'
    WHERE account_approval_status IS NULL
    OR account_approval_status = ''
  `);

  try {
    await runQuery(`UPDATE users SET role = 'employee' WHERE role = 'admin'`);
  } catch (error) {
    console.log("Skipping legacy admin role conversion:", error.message);
  }

  try {
    await runQuery(`
      ALTER TABLE users MODIFY role ENUM(
        'vendor', 'employee', 'it', 'infosec', 'management', 'dpo', 'hr', 'compliance'
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

  await runQuery(`
    CREATE TABLE IF NOT EXISTS department_reviews (
      review_id INT AUTO_INCREMENT PRIMARY KEY,
      vendor_id INT NOT NULL,
      department_role ENUM('employee', 'it', 'infosec', 'management', 'dpo', 'hr', 'compliance') NOT NULL,
      reviewer_user_id INT NULL,
      review_status ENUM('Pending', 'Reviewed', 'Rejected', 'Approved') DEFAULT 'Pending',
      comments TEXT,
      reviewed_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_department_review (vendor_id, department_role)
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS vendor_assessments (
      assessment_id INT AUTO_INCREMENT PRIMARY KEY,
      assessment_code VARCHAR(30) UNIQUE,
      vendor_id INT NOT NULL,
      created_by_user_id INT NOT NULL,
      purpose VARCHAR(150) NOT NULL,
      assessment_date DATE NULL,
      overall_status ENUM('Draft', 'In Review', 'Pending Admin Approval', 'Approved', 'Rejected', 'Completed') DEFAULT 'In Review',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await addColumnIfMissing("vendor_assessments", "vendor_status", "ENUM('Draft', 'Submitted', 'Returned', 'Approved', 'Rejected') DEFAULT 'Draft'");

  await runQuery(`
    CREATE TABLE IF NOT EXISTS department_assessments (
      department_assessment_id INT AUTO_INCREMENT PRIMARY KEY,
      assessment_id INT NOT NULL,
      department_role ENUM('employee', 'it', 'infosec', 'management', 'dpo', 'hr', 'compliance') NOT NULL,
      submitted_by_user_id INT NULL,
      status ENUM('Pending', 'Draft', 'Pending Admin Approval', 'Approved', 'Rejected') DEFAULT 'Pending',
      admin_comment TEXT NULL,
      submitted_at TIMESTAMP NULL,
      approved_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_department_assessment (assessment_id, department_role)
    )
  `);

  try {
    await runQuery(`
      ALTER TABLE department_assessments MODIFY department_role ENUM(
        'employee', 'it', 'infosec', 'management', 'dpo', 'hr', 'compliance'
      ) NOT NULL
    `);
  } catch (error) {
    console.log("Skipping department assessment role enum update:", error.message);
  }

  await runQuery(`
    CREATE TABLE IF NOT EXISTS department_answers (
      answer_id INT AUTO_INCREMENT PRIMARY KEY,
      department_assessment_id INT NOT NULL,
      section_name VARCHAR(150) NOT NULL,
      question_index INT NOT NULL,
      question_text TEXT NOT NULL,
      response VARCHAR(100) NOT NULL,
      explanation TEXT NULL,
      artifact_path VARCHAR(255) NULL,
      artifact_name VARCHAR(255) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_department_answer (department_assessment_id, question_index)
    )
  `);

  try {
    await runQuery(`
      ALTER TABLE department_answers
      MODIFY COLUMN response VARCHAR(100) NOT NULL
    `);
  } catch (error) {
    console.log("Skipping department answer response migration:", error.message);
  }

  await runQuery(`
    CREATE TABLE IF NOT EXISTS sign_offs (
      signoff_id INT AUTO_INCREMENT PRIMARY KEY,
      assessment_id INT NULL,
      department_assessment_id INT NULL,
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

  await addColumnIfMissing("sign_offs", "department_assessment_id", "INT NULL");
  await addColumnIfMissing("sign_offs", "signature_file_path", "VARCHAR(255) NULL");
  await addColumnIfMissing("sign_offs", "created_by_user_id", "INT NULL");
  await addColumnIfMissing("sign_offs", "created_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP");

  await runQuery(`
    CREATE TABLE IF NOT EXISTS notifications (
      notification_id INT AUTO_INCREMENT PRIMARY KEY,
      recipient_user_id INT NOT NULL,
      type VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      is_read TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_recipient (recipient_user_id),
      INDEX idx_unread (recipient_user_id, is_read)
    )
  `);

  console.log("Database tables checked.");
}

initDatabase().catch((error) => {
  console.error("Database init error:", error);
});

function flattenQuestionsForRole(role) {
  const groups = departmentQuestionGroups[role] || [];
  const flattened = [];

  groups.forEach((group) => {
    group.questions.forEach((question) => {
      flattened.push({
        question_index: flattened.length,
        section_name: group.section_name,
        question_text: question
      });
    });
  });

  return flattened;
}

function makeAssessmentCode(assessmentId) {
  return `VA-${String(assessmentId).padStart(3, "0")}`;
}

async function ensureDepartmentAssessment(assessmentId, departmentRole, statusWhenNew = "Pending") {
  const existing = await runQuery(
    `
      SELECT *
      FROM department_assessments
      WHERE assessment_id = ?
      AND department_role = ?
      LIMIT 1
    `,
    [assessmentId, departmentRole]
  );

  if (existing.length > 0) {
    return existing[0];
  }

  const result = await runQuery(
    `
      INSERT INTO department_assessments
      (assessment_id, department_role, status)
      VALUES (?, ?, ?)
    `,
    [assessmentId, departmentRole, statusWhenNew]
  );

  const rows = await runQuery(
    `
      SELECT *
      FROM department_assessments
      WHERE department_assessment_id = ?
    `,
    [result.insertId]
  );

  return rows[0];
}

async function createAllDepartmentAssessments(assessmentId) {
  const rolesToCreate = ["employee", ...departmentRoles];
  const values = rolesToCreate.map((role) => [assessmentId, role, "Pending"]);

  await runQuery(
    `
      INSERT IGNORE INTO department_assessments
      (assessment_id, department_role, status)
      VALUES ?
    `,
    [values]
  );
}

async function updateMainAssessmentStatus(assessmentId) {
  const rows = await runQuery(
    `
      SELECT status, department_role
      FROM department_assessments
      WHERE assessment_id = ?
    `,
    [assessmentId]
  );

  let overallStatus = "In Review";
  const reviewRows = rows.filter((row) => row.department_role !== "employee");

  if (reviewRows.some((row) => row.status === "Rejected")) {
    overallStatus = "Rejected";
  } else if (reviewRows.length >= departmentRoles.length && reviewRows.every((row) => row.status === "Approved")) {
    overallStatus = "Approved";
  } else if (rows.some((row) => row.status === "Pending Admin Approval")) {
    overallStatus = "Pending Admin Approval";
  } else if (rows.every((row) => row.status === "Pending")) {
    overallStatus = "In Review";
  }

  await runQuery(
    `
      UPDATE vendor_assessments
      SET overall_status = ?
      WHERE assessment_id = ?
    `,
    [overallStatus, assessmentId]
  );
}

async function getUserIdsByRole(roles) {
  const roleList = Array.isArray(roles) ? roles : [roles];

  if (!roleList.length) return [];

  try {
    const placeholders = roleList.map(() => "?").join(", ");
    const rows = await runQuery(
      `SELECT user_id FROM users WHERE role IN (${placeholders})`,
      roleList
    );

    return rows.map((row) => row.user_id);
  } catch (error) {
    console.error("getUserIdsByRole error:", error.message);
    return [];
  }
}

async function createNotification(recipientUserIds, type, title, message) {
  const ids = Array.isArray(recipientUserIds) ? recipientUserIds : [recipientUserIds];
  const validIds = ids
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id) && id > 0);

  if (!validIds.length) return;

  try {
    const values = validIds.map((id) => [id, type, title, message]);
    await runQuery(
      `INSERT INTO notifications (recipient_user_id, type, title, message) VALUES ?`,
      [values]
    );
  } catch (error) {
    console.error("createNotification error:", error.message);
  }
}

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
    const cleanEmail = String(email).trim().toLowerCase();
    const passwordHash = await bcrypt.hash(password, 10);
    let accountApprovalStatus = "Pending";

    if (role === "infosec") {
      const existingApprovedInfoSec = await runQuery(
        `
          SELECT COUNT(*) AS total
          FROM users
          WHERE role = 'infosec'
          AND account_approval_status = 'Approved'
        `
      );

      if (Number(existingApprovedInfoSec[0]?.total || 0) === 0) {
        accountApprovalStatus = "Approved";
      }
    }

    const result = await runQuery(
      `
        INSERT INTO users
        (
          full_name,
          email,
          password_hash,
          role,
          email_verified,
          verification_token_hash,
          verification_token_expires,
          account_approval_status,
          account_approved_by_user_id,
          account_decision_at,
          account_rejection_reason
        )
        VALUES (?, ?, ?, ?, 1, NULL, NULL, ?, NULL, NULL, NULL)
      `,
      [full_name, cleanEmail, passwordHash, role, accountApprovalStatus]
    );

    if (accountApprovalStatus === "Pending") {
      const infosecIds = await getUserIdsByRole("infosec");
      await createNotification(
        infosecIds,
        "new_account_registration",
        "New Account Registration",
        `${full_name} (${cleanEmail}) registered as ${role} and is pending approval.`
      );
    }

    res.json({
      message: accountApprovalStatus === "Approved"
        ? "InfoSec account created. You can now log in using the InfoSec Account ID."
        : "Account created. Your registration is pending InfoSec approval.",
      pending_approval: accountApprovalStatus === "Pending",
      account: {
        full_name,
        email: cleanEmail,
        role,
        account_approval_status: accountApprovalStatus
      }
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ message: "Email already exists." });
    }

    console.error("Register error:", error);
    res.status(500).json({ message: "Failed to register account." });
  }
});

app.post("/login", async (req, res) => {
  const { email, password, account_id } = req.body;

  try {
    const cleanEmail = String(email || "").trim().toLowerCase();
    const results = await runQuery("SELECT * FROM users WHERE email = ?", [cleanEmail]);

    if (results.length === 0) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const user = results[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const accountStatus = normalizeAccountApprovalStatus(user.account_approval_status);

    if (accountStatus === "Pending") {
      return res.status(403).json({
        message: "Your account is still pending InfoSec approval.",
        account_status: "Pending",
        account: {
          full_name: user.full_name,
          email: user.email,
          role: normalizeUserRole(user.role)
        }
      });
    }

    if (accountStatus === "Rejected") {
      return res.status(403).json({
        message: user.account_rejection_reason
          ? `Your registration was rejected by InfoSec. Reason: ${user.account_rejection_reason}`
          : "Your registration was rejected by InfoSec.",
        account_status: "Rejected",
        account: {
          full_name: user.full_name,
          email: user.email,
          role: normalizeUserRole(user.role),
          account_rejection_reason: user.account_rejection_reason || ""
        }
      });
    }

    if (normalizeUserRole(user.role) === "infosec") {
      const submittedAccountId = String(account_id || "").trim();

      if (submittedAccountId !== INFOSEC_LOGIN_ACCOUNT_ID) {
        return res.status(403).json({
          message: "Invalid InfoSec Account ID."
        });
      }
    }

    req.session.user = {
      user_id: user.user_id,
      full_name: user.full_name,
      email: user.email,
      role: normalizeUserRole(user.role),
      account_approval_status: accountStatus
    };

    res.json({ message: "Login successful.", user: req.session.user });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Login failed." });
  }
});

app.get("/me", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: "Not logged in." });
  }

  try {
    const rows = await runQuery(
      `
        SELECT
          user_id,
          full_name,
          email,
          role,
          first_name,
          last_name,
          job_title,
          work_email,
          profile_photo_path,
          account_approval_status,
          account_rejection_reason
        FROM users
        WHERE user_id = ?
        LIMIT 1
      `,
      [req.session.user.user_id]
    );

    if (!rows.length) {
      return res.status(401).json({ message: "User not found." });
    }

    req.session.user = {
      ...req.session.user,
      ...rows[0],
      role: normalizeUserRole(rows[0].role)
    };

    res.json(req.session.user);
  } catch (error) {
    console.error("Fetch current user error:", error);
    res.status(500).json({ message: "Failed to load user profile." });
  }
});

app.get("/notifications", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: "Not logged in." });
  }

  try {
    const notifications = await runQuery(
      `
        SELECT
          notification_id,
          type,
          title,
          message,
          is_read,
          created_at
        FROM notifications
        WHERE recipient_user_id = ?
        ORDER BY is_read ASC, created_at DESC
        LIMIT 50
      `,
      [req.session.user.user_id]
    );

    res.json({ notifications });
  } catch (error) {
    console.error("Fetch notifications error:", error);
    res.status(500).json({ message: "Failed to load notifications." });
  }
});

app.post("/notifications/:id/read", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: "Not logged in." });
  }

  try {
    await runQuery(
      `
        UPDATE notifications
        SET is_read = 1
        WHERE notification_id = ?
        AND recipient_user_id = ?
      `,
      [req.params.id, req.session.user.user_id]
    );

    res.json({ message: "Notification marked as read." });
  } catch (error) {
    console.error("Mark notification read error:", error);
    res.status(500).json({ message: "Failed to mark notification as read." });
  }
});

app.post("/notifications/read-all", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: "Not logged in." });
  }

  try {
    await runQuery(
      `UPDATE notifications SET is_read = 1 WHERE recipient_user_id = ?`,
      [req.session.user.user_id]
    );

    res.json({ message: "All notifications marked as read." });
  } catch (error) {
    console.error("Mark all notifications read error:", error);
    res.status(500).json({ message: "Failed to mark all notifications as read." });
  }
});

app.get("/infosec/account-approvals", requireRole("infosec"), async (req, res) => {
  try {
    const rows = await runQuery(
      `
        SELECT
          u.user_id,
          u.full_name,
          u.email,
          u.role,
          u.account_approval_status,
          u.account_rejection_reason,
          u.account_decision_at,
          u.created_at,
          reviewer.full_name AS decided_by
        FROM users u
        LEFT JOIN users reviewer
          ON u.account_approved_by_user_id = reviewer.user_id
        WHERE u.user_id <> ?
        ORDER BY
          CASE
            WHEN u.account_approval_status = 'Pending' THEN 1
            WHEN u.account_approval_status = 'Approved' THEN 2
            ELSE 3
          END,
          u.created_at DESC
      `,
      [req.session.user.user_id]
    );

    res.json({
      accounts: rows.map((row) => ({
        ...row,
        role: normalizeUserRole(row.role),
        account_approval_status: normalizeAccountApprovalStatus(row.account_approval_status)
      }))
    });
  } catch (error) {
    console.error("Fetch account approvals error:", error);
    res.status(500).json({ message: "Failed to load account approval requests." });
  }
});

app.post("/infosec/account-approvals/:user_id/decision", requireRole("infosec"), async (req, res) => {
  const targetUserId = Number(req.params.user_id);
  const decision = String(req.body.decision || "").trim().toLowerCase();
  const reason = String(req.body.reason || "").trim();

  if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
    return res.status(400).json({ message: "Invalid account selected." });
  }

  if (!["approve", "reject"].includes(decision)) {
    return res.status(400).json({ message: "Invalid decision." });
  }

  if (targetUserId === Number(req.session.user.user_id)) {
    return res.status(400).json({ message: "You cannot approve or reject your own account." });
  }

  if (decision === "reject" && !reason) {
    return res.status(400).json({ message: "Rejection reason is required." });
  }

  try {
    const rows = await runQuery(
      `SELECT user_id, full_name, email, role FROM users WHERE user_id = ? LIMIT 1`,
      [targetUserId]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Account request not found." });
    }

    const nextStatus = decision === "approve" ? "Approved" : "Rejected";

    await runQuery(
      `
        UPDATE users
        SET
          account_approval_status = ?,
          account_approved_by_user_id = ?,
          account_decision_at = CURRENT_TIMESTAMP,
          account_rejection_reason = ?
        WHERE user_id = ?
      `,
      [
        nextStatus,
        req.session.user.user_id,
        decision === "reject" ? reason : null,
        targetUserId
      ]
    );

    res.json({
      message: decision === "approve"
        ? "Account approved. The user can now log in."
        : "Account rejected. The user cannot log in.",
      account_status: nextStatus
    });
  } catch (error) {
    console.error("Account approval decision error:", error);
    res.status(500).json({ message: "Failed to save account approval decision." });
  }
});

app.post("/profile", upload.single("profile_photo"), async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: "Not logged in." });
  }

  const {
    first_name,
    last_name,
    job_title,
    work_email
  } = req.body;

  const profilePhotoPath = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    if (profilePhotoPath) {
      await runQuery(
        `
          UPDATE users
          SET
            first_name = ?,
            last_name = ?,
            job_title = ?,
            work_email = ?,
            profile_photo_path = ?
          WHERE user_id = ?
        `,
        [
          first_name || null,
          last_name || null,
          job_title || null,
          work_email || null,
          profilePhotoPath,
          req.session.user.user_id
        ]
      );
    } else {
      await runQuery(
        `
          UPDATE users
          SET
            first_name = ?,
            last_name = ?,
            job_title = ?,
            work_email = ?
          WHERE user_id = ?
        `,
        [
          first_name || null,
          last_name || null,
          job_title || null,
          work_email || null,
          req.session.user.user_id
        ]
      );
    }

    const rows = await runQuery(
      `
        SELECT
          user_id,
          full_name,
          email,
          role,
          first_name,
          last_name,
          job_title,
          work_email,
          profile_photo_path,
          account_approval_status,
          account_rejection_reason
        FROM users
        WHERE user_id = ?
        LIMIT 1
      `,
      [req.session.user.user_id]
    );

    req.session.user = {
      ...req.session.user,
      ...rows[0],
      role: normalizeUserRole(rows[0].role)
    };

    res.json({
      message: "Profile updated successfully.",
      user: req.session.user
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ message: "Failed to update profile." });
  }
});

app.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ message: "Logged out successfully." });
  });
});

/* VENDOR ROUTES */

app.post("/vendors", requireRole("employee"), async (req, res) => {
  const {
    company_name,
    company_website,
    product_services_offered,
    contact_person_name,
    contact_email,
    contact_phone
  } = req.body;

  if (!company_name || !product_services_offered || !contact_person_name) {
    return res.status(400).json({ message: "Company name, services, and contact person are required." });
  }

  try {
    const createdByUserId = req.session.user.user_id;

    const result = await runQuery(
      `
        INSERT INTO vendors
        (user_id, company_name, company_website, product_services_offered, contact_person_name, contact_email, contact_phone, created_by_user_id, overall_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending')
      `,
      [
        createdByUserId,
        company_name,
        company_website || null,
        product_services_offered,
        contact_person_name,
        contact_email || null,
        contact_phone || null,
        createdByUserId
      ]
    );

    const vendorId = result.insertId;

    res.json({ message: "Vendor draft saved. Create a vendor assessment to send it to departments.", vendor_id: vendorId });
  } catch (error) {
    console.error("Insert vendor error:", error);
    res.status(500).json({ message: "Failed to save vendor." });
  }
});

app.get("/vendors/mine", requireAnyRole(["employee", ...departmentRoles]), async (req, res) => {
  try {
    const rows = await runQuery(
      `
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
      `,
      [req.session.user.user_id, req.session.user.user_id]
    );

    res.json(rows);
  } catch (error) {
    console.error("Fetch my vendors error:", error);
    res.status(500).json({ message: "Failed to load submissions." });
  }
});

/* MAIN VENDOR ASSESSMENT CREATED BY EMPLOYEE */

app.post("/vendor-assessments", requireRole("employee"), async (req, res) => {
  const { vendor_id, purpose, assessment_date } = req.body;

  if (!vendor_id || !purpose || !assessment_date) {
    return res.status(400).json({ message: "Vendor, purpose, and assessment date are required." });
  }

  try {
    const vendorRows = await runQuery("SELECT * FROM vendors WHERE vendor_id = ?", [vendor_id]);

    if (vendorRows.length === 0) {
      return res.status(404).json({ message: "Vendor not found." });
    }

    const result = await runQuery(
      `
        INSERT INTO vendor_assessments
        (vendor_id, created_by_user_id, purpose, assessment_date, overall_status)
        VALUES (?, ?, ?, ?, 'In Review')
      `,
      [vendor_id, req.session.user.user_id, purpose, assessment_date]
    );

    const assessmentId = result.insertId;
    const assessmentCode = makeAssessmentCode(assessmentId);

    await runQuery("UPDATE vendor_assessments SET assessment_code = ? WHERE assessment_id = ?", [assessmentCode, assessmentId]);
    await createAllDepartmentAssessments(assessmentId);

    const reviewValues = departmentRoles.map((role) => [vendor_id, role, "Pending"]);
    await runQuery(
      `
        INSERT IGNORE INTO department_reviews
        (vendor_id, department_role, review_status)
        VALUES ?
      `,
      [reviewValues]
    );

    await runQuery("UPDATE vendors SET overall_status = 'In Review' WHERE vendor_id = ?", [vendor_id]);

    res.json({
      assessment_id: assessmentId,
      assessment_code: assessmentCode,
      vendor_id,
      company_name: vendorRows[0].company_name,
      product_services_offered: vendorRows[0].product_services_offered,
      purpose,
      assessment_date,
      overall_status: "In Review"
    });
  } catch (error) {
    console.error("Create vendor assessment error:", error);
    res.status(500).json({ message: "Failed to create vendor assessment." });
  }
});

app.get("/vendor-assessments/mine", requireAnyRole(["employee", ...departmentRoles]), async (req, res) => {
  try {
    const rows = await runQuery(
      `
        SELECT
          va.assessment_id,
          va.assessment_code,
          va.vendor_id,
          va.purpose,
          va.assessment_date,
          va.overall_status,
          va.created_at,
          v.company_name,
          v.product_services_offered,
          v.contact_person_name
        FROM vendor_assessments va
        JOIN vendors v ON va.vendor_id = v.vendor_id
        WHERE va.created_by_user_id = ?
        ORDER BY va.created_at DESC
      `,
      [req.session.user.user_id]
    );

    res.json(rows);
  } catch (error) {
    console.error("Fetch my vendor assessments error:", error);
    res.status(500).json({ message: "Failed to load vendor assessments." });
  }
});

/* GENERIC DEPARTMENT WORKFLOW */

app.get("/department/questions", requireAnyRole(["employee", ...departmentRoles]), (req, res) => {
  res.json(flattenQuestionsForRole(req.session.user.role));
});

app.get("/department/queue", requireAnyRole(["employee", ...departmentRoles]), async (req, res) => {
  const departmentRole = req.session.user.role;

  try {
    const rows = await runQuery(
      `
        SELECT
          va.assessment_id,
          va.assessment_code,
          va.vendor_id,
          va.purpose,
          va.assessment_date,
          va.overall_status,
          va.created_at,
          v.company_name,
          v.product_services_offered,
          v.contact_person_name,
          v.contact_email,
          u.full_name AS created_by,
          da.department_assessment_id,
          da.department_role,
          da.status AS department_status,
          da.submitted_at
        FROM vendor_assessments va
        JOIN vendors v ON va.vendor_id = v.vendor_id
        LEFT JOIN users u ON va.created_by_user_id = u.user_id
        LEFT JOIN department_assessments da
          ON va.assessment_id = da.assessment_id
          AND da.department_role = ?
        ORDER BY va.created_at DESC
      `,
      [departmentRole]
    );

    res.json(rows);
  } catch (error) {
    console.error("Fetch department queue error:", error);
    res.status(500).json({ message: "Failed to load department queue." });
  }
});

app.get("/department/assessments", requireAnyRole(["employee", ...departmentRoles]), async (req, res) => {
  const departmentRole = req.session.user.role;

  try {
    const rows = await runQuery(
      `
        SELECT
          va.assessment_id,
          va.assessment_code,
          va.vendor_id,
          va.purpose,
          va.assessment_date,
          va.overall_status,
          va.created_at,
          v.company_name,
          v.product_services_offered,
          da.department_assessment_id,
          da.department_role,
          da.status AS department_status,
          da.submitted_by_user_id,
          da.submitted_at
        FROM vendor_assessments va
        JOIN vendors v ON va.vendor_id = v.vendor_id
        LEFT JOIN department_assessments da
          ON va.assessment_id = da.assessment_id
          AND da.department_role = ?
        ORDER BY va.created_at DESC
      `,
      [departmentRole]
    );

    res.json(rows);
  } catch (error) {
    console.error("Fetch department assessments error:", error);
    res.status(500).json({ message: "Failed to load department assessments." });
  }
});

app.post("/department/assessments/:assessment_id/start", requireAnyRole(["employee", ...departmentRoles]), async (req, res) => {
  const assessmentId = req.params.assessment_id;
  const departmentRole = req.session.user.role;

  try {
    const assessmentRows = await runQuery(
      `
        SELECT va.*, v.company_name, v.product_services_offered
        FROM vendor_assessments va
        JOIN vendors v ON va.vendor_id = v.vendor_id
        WHERE va.assessment_id = ?
      `,
      [assessmentId]
    );

    if (assessmentRows.length === 0) {
      return res.status(404).json({ message: "Vendor assessment not found." });
    }

    let departmentAssessment = await ensureDepartmentAssessment(assessmentId, departmentRole, "Draft");

    if (departmentAssessment.status === "Pending") {
      await runQuery(
        `
          UPDATE department_assessments
          SET status = 'Draft', submitted_by_user_id = ?
          WHERE department_assessment_id = ?
        `,
        [req.session.user.user_id, departmentAssessment.department_assessment_id]
      );

      departmentAssessment = {
        ...departmentAssessment,
        status: "Draft",
        submitted_by_user_id: req.session.user.user_id
      };
    }

    res.json({
      assessment: assessmentRows[0],
      department_assessment: departmentAssessment,
      questions: flattenQuestionsForRole(departmentRole)
    });
  } catch (error) {
    console.error("Start department assessment error:", error);
    res.status(500).json({ message: "Failed to start department assessment." });
  }
});

app.get("/department/assessments/:assessment_id", requireAnyRole(["employee", ...departmentRoles]), async (req, res) => {
  const assessmentId = req.params.assessment_id;
  const departmentRole = req.session.user.role;

  try {
    const assessmentRows = await runQuery(
      `
        SELECT
          va.*,
          v.company_name,
          v.product_services_offered,
          v.contact_person_name,
          v.contact_email
        FROM vendor_assessments va
        JOIN vendors v ON va.vendor_id = v.vendor_id
        WHERE va.assessment_id = ?
      `,
      [assessmentId]
    );

    if (assessmentRows.length === 0) {
      return res.status(404).json({ message: "Vendor assessment not found." });
    }

    const departmentAssessment = await ensureDepartmentAssessment(assessmentId, departmentRole, "Pending");

    const answers = await runQuery(
      `
        SELECT *
        FROM department_answers
        WHERE department_assessment_id = ?
        ORDER BY question_index
      `,
      [departmentAssessment.department_assessment_id]
    );

    res.json({
      assessment: assessmentRows[0],
      department_assessment: departmentAssessment,
      answers,
      questions: flattenQuestionsForRole(departmentRole)
    });
  } catch (error) {
    console.error("Fetch department assessment error:", error);
    res.status(500).json({ message: "Failed to load department assessment." });
  }
});

app.post("/department/assessments/:assessment_id/submit", requireAnyRole(["employee", ...departmentRoles]), upload.any(), async (req, res) => {
  const assessmentId = req.params.assessment_id;
  const departmentRole = req.session.user.role;

  let answers;

  try {
    answers = JSON.parse(req.body.answers || "[]");
  } catch (_error) {
    return res.status(400).json({ message: "Invalid answer data." });
  }

  if (!Array.isArray(answers) || answers.length === 0) {
    return res.status(400).json({ message: "No answers submitted." });
  }

  const questions = flattenQuestionsForRole(departmentRole);
  const filesByQuestion = {};

  (req.files || []).forEach((file) => {
    const match = file.fieldname.match(/^artifact_(\d+)$/);
    if (match) {
      filesByQuestion[Number(match[1])] = file;
    }
  });

  for (const answer of answers) {
    if (departmentRole === "employee") {
      if (!String(answer.explanation || "").trim()) {
        return res.status(400).json({ message: "Each Vendor Information question requires an answer." });
      }
    } else {
      if (!["Yes", "No", "N/A"].includes(answer.response)) {
        return res.status(400).json({ message: "Each question must have a valid response." });
      }

      if ((answer.response === "No" || answer.response === "N/A") && !String(answer.explanation || "").trim()) {
        return res.status(400).json({ message: "No and N/A responses require an explanation." });
      }

      if (answer.response === "Yes" && !filesByQuestion[answer.question_index] && !answer.existing_artifact_path) {
        return res.status(400).json({ message: "Yes responses require an artifact or uploaded file." });
      }
    }
  }

  try {
    const assessmentRows = await runQuery("SELECT * FROM vendor_assessments WHERE assessment_id = ?", [assessmentId]);

    if (assessmentRows.length === 0) {
      return res.status(404).json({ message: "Vendor assessment not found." });
    }

    let departmentAssessment = await ensureDepartmentAssessment(assessmentId, departmentRole, "Draft");

    const values = answers.map((answer) => {
      const file = filesByQuestion[answer.question_index];
      const matchedQuestion = questions.find((question) => Number(question.question_index) === Number(answer.question_index));

      return [
        departmentAssessment.department_assessment_id,
        matchedQuestion?.section_name || answer.section_name || roleLabels[departmentRole] || departmentRole,
        answer.question_index,
        matchedQuestion?.question_text || answer.question_text || "",
        departmentRole === "employee" ? "TEXT_ANSWER" : answer.response,
        answer.explanation || null,
        file ? `/uploads/${file.filename}` : answer.existing_artifact_path || null,
        file ? file.originalname : answer.existing_artifact_name || null
      ];
    });

    await runQuery(
      `
        INSERT INTO department_answers
        (department_assessment_id, section_name, question_index, question_text, response, explanation, artifact_path, artifact_name)
        VALUES ?
        ON DUPLICATE KEY UPDATE
          section_name = VALUES(section_name),
          question_text = VALUES(question_text),
          response = VALUES(response),
          explanation = VALUES(explanation),
          artifact_path = VALUES(artifact_path),
          artifact_name = VALUES(artifact_name),
          updated_at = CURRENT_TIMESTAMP
      `,
      [values]
    );

    await runQuery(
      `
        UPDATE department_assessments
        SET status = 'Pending Admin Approval',
            submitted_by_user_id = ?,
            submitted_at = CURRENT_TIMESTAMP
        WHERE department_assessment_id = ?
      `,
      [req.session.user.user_id, departmentAssessment.department_assessment_id]
    );

    if (departmentRole !== "employee") {
      await runQuery(
        `
          UPDATE department_reviews
          SET review_status = 'Reviewed',
              reviewer_user_id = ?,
              comments = ?,
              reviewed_at = CURRENT_TIMESTAMP
          WHERE vendor_id = ?
          AND department_role = ?
        `,
        [
          req.session.user.user_id,
          `${roleLabels[departmentRole] || departmentRole} form submitted to Compliance Officer.`,
          assessmentRows[0].vendor_id,
          departmentRole
        ]
      );
    }

    await updateMainAssessmentStatus(assessmentId);

    res.json({
      message: departmentRole === "employee"
        ? "Vendor Information submitted to Compliance Officer for approval."
        : `${roleLabels[departmentRole] || departmentRole} assessment submitted to Compliance Officer for approval.`
    });
  } catch (error) {
    console.error("Submit department assessment error:", error);
    res.status(500).json({ message: "Failed to submit department assessment." });
  }
});

app.get("/department/pending-approval", requireDepartment, async (req, res) => {
  try {
    const rows = await runQuery(
      `
        SELECT
          da.department_assessment_id,
          da.assessment_id,
          da.department_role,
          da.status AS department_status,
          da.submitted_at,
          va.assessment_code,
          va.purpose,
          va.assessment_date,
          va.overall_status,
          v.company_name,
          v.product_services_offered
        FROM department_assessments da
        JOIN vendor_assessments va ON da.assessment_id = va.assessment_id
        JOIN vendors v ON va.vendor_id = v.vendor_id
        WHERE da.status = 'Pending Admin Approval'
        ORDER BY da.submitted_at DESC
      `
    );

    res.json(rows);
  } catch (error) {
    console.error("Fetch pending department approvals error:", error);
    res.status(500).json({ message: "Failed to load pending approvals." });
  }
});

app.post("/department/signoff", requireDepartment, upload.single("signature"), async (req, res) => {
  const { signer_name, signoff_status } = req.body;
  let { assessment_id, department_assessment_id } = req.body;

  if (!signer_name) {
    return res.status(400).json({ message: "Signer name is required." });
  }

  const departmentRole = req.session.user.role;
  const roleName = roleLabels[departmentRole] || departmentRole;
  const status = signoff_status === "Signed" ? "Signed" : "Pending";
  const fileName = req.file ? req.file.originalname : null;
  const filePath = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    if (!assessment_id || !department_assessment_id) {
      const latestRows = await runQuery(
        `
          SELECT
            da.department_assessment_id,
            da.assessment_id
          FROM department_assessments da
          WHERE da.department_role = ?
          ORDER BY
            CASE
              WHEN da.status = 'Pending Admin Approval' THEN 1
              WHEN da.status = 'Draft' THEN 2
              WHEN da.status = 'Pending' THEN 3
              ELSE 4
            END,
            da.updated_at DESC,
            da.created_at DESC
          LIMIT 1
        `,
        [departmentRole]
      );

      if (latestRows.length === 0) {
        return res.status(400).json({
          message: "No assessment found for sign-off. Please open a vendor assessment first."
        });
      }

      assessment_id = latestRows[0].assessment_id;
      department_assessment_id = latestRows[0].department_assessment_id;
    }

    await runQuery(
      `
        INSERT INTO sign_offs
        (
          assessment_id,
          department_assessment_id,
          role_name,
          signer_name,
          signoff_status,
          signature_file_name,
          signature_file_path,
          signed_at,
          created_by_user_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        assessment_id,
        department_assessment_id,
        roleName,
        signer_name,
        status,
        fileName,
        filePath,
        status === "Signed" ? new Date() : null,
        req.session.user.user_id
      ]
    );

    res.json({ message: "Sign-off saved." });
  } catch (error) {
    console.error("Save signoff error:", error);
    res.status(500).json({ message: "Failed to save sign-off." });
  }
});

/* LEGACY DEPARTMENT REVIEW ROUTES */

app.get("/department/vendors", requireDepartment, async (req, res) => {
  const departmentRole = req.session.user.role;

  try {
    const rows = await runQuery(
      `
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
      `,
      [departmentRole]
    );

    res.json(rows);
  } catch (error) {
    console.error("Fetch department vendors error:", error);
    res.status(500).json({ message: "Failed to load department vendors." });
  }
});

app.patch("/department/reviews/:vendor_id", requireDepartment, async (req, res) => {
  const vendorId = req.params.vendor_id;
  const departmentRole = req.session.user.role;
  const reviewerUserId = req.session.user.user_id;
  const { review_status, comments } = req.body;
  const validStatuses = ["Pending", "Reviewed", "Rejected", "Approved"];

  if (!validStatuses.includes(review_status)) {
    return res.status(400).json({ message: "Invalid review status." });
  }

  try {
    await runQuery(
      `
        INSERT INTO department_reviews
        (vendor_id, department_role, reviewer_user_id, review_status, comments, reviewed_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON DUPLICATE KEY UPDATE
          reviewer_user_id = VALUES(reviewer_user_id),
          review_status = VALUES(review_status),
          comments = VALUES(comments),
          reviewed_at = CURRENT_TIMESTAMP
      `,
      [vendorId, departmentRole, reviewerUserId, review_status, comments || null]
    );

    res.json({ message: "Department review saved." });
  } catch (error) {
    console.error("Save department review error:", error);
    res.status(500).json({ message: "Failed to save department review." });
  }
});

/* ADMIN ROUTES */

app.get("/admin/vendors", requireRole("employee"), async (_req, res) => {
  try {
    const rows = await runQuery(
      `
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
          COUNT(DISTINCT va.assessment_id) AS assessment_count,
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
        LEFT JOIN vendor_assessments va ON v.vendor_id = va.vendor_id
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
      `
    );

    res.json(rows);
  } catch (error) {
    console.error("Fetch admin vendors error:", error);
    res.status(500).json({ message: "Failed to load admin vendors." });
  }
});

app.get("/admin/department-assessments", requireRole("employee"), async (_req, res) => {
  try {
    const rows = await runQuery(
      `
        SELECT
          da.*,
          va.assessment_code,
          va.purpose,
          va.assessment_date,
          va.overall_status,
          v.company_name,
          u.full_name AS submitted_by
        FROM department_assessments da
        JOIN vendor_assessments va ON da.assessment_id = va.assessment_id
        JOIN vendors v ON va.vendor_id = v.vendor_id
        LEFT JOIN users u ON da.submitted_by_user_id = u.user_id
        ORDER BY da.submitted_at DESC, da.created_at DESC
      `
    );

    res.json(rows);
  } catch (error) {
    console.error("Fetch admin department assessments error:", error);
    res.status(500).json({ message: "Failed to load department assessments." });
  }
});



async function getAdminAssessmentBundle(assessmentId = null) {
  let assessmentRows;

  if (assessmentId) {
    assessmentRows = await runQuery(
      `
        SELECT
          va.assessment_id,
          va.assessment_code,
          va.vendor_id,
          va.purpose,
          va.assessment_date,
          va.overall_status,
          va.created_at,
          va.updated_at,
          v.company_name,
          v.company_website,
          v.product_services_offered,
          v.contact_person_name,
          v.contact_email,
          v.contact_phone,
          u.full_name AS created_by
        FROM vendor_assessments va
        JOIN vendors v ON va.vendor_id = v.vendor_id
        LEFT JOIN users u ON va.created_by_user_id = u.user_id
        WHERE va.assessment_id = ?
        LIMIT 1
      `,
      [assessmentId]
    );
  } else {
    assessmentRows = await runQuery(
      `
        SELECT
          va.assessment_id,
          va.assessment_code,
          va.vendor_id,
          va.purpose,
          va.assessment_date,
          va.overall_status,
          va.created_at,
          va.updated_at,
          v.company_name,
          v.company_website,
          v.product_services_offered,
          v.contact_person_name,
          v.contact_email,
          v.contact_phone,
          u.full_name AS created_by
        FROM vendor_assessments va
        JOIN vendors v ON va.vendor_id = v.vendor_id
        LEFT JOIN users u ON va.created_by_user_id = u.user_id
        ORDER BY va.updated_at DESC, va.created_at DESC
        LIMIT 1
      `
    );
  }

  if (!assessmentRows.length) return null;

  const assessment = assessmentRows[0];

  const departmentAssessments = await runQuery(
    `
      SELECT
        da.department_assessment_id,
        da.assessment_id,
        da.department_role,
        da.status AS department_status,
        da.submitted_at,
        da.approved_at,
        da.admin_comment,
        u.full_name AS submitted_by
      FROM department_assessments da
      LEFT JOIN users u ON da.submitted_by_user_id = u.user_id
      WHERE da.assessment_id = ?
      ORDER BY
        CASE da.department_role
          WHEN 'employee' THEN 1
          WHEN 'management' THEN 2
          WHEN 'it' THEN 3
          WHEN 'compliance' THEN 4
          WHEN 'dpo' THEN 5
          WHEN 'hr' THEN 6
          WHEN 'infosec' THEN 7
          ELSE 8
        END
    `,
    [assessment.assessment_id]
  );


  const departmentAnswerRows = await runQuery(
    `
      SELECT
        da.assessment_id,
        da.department_role,
        ans.answer_id,
        ans.department_assessment_id,
        ans.section_name,
        ans.question_index,
        ans.question_text,
        ans.response,
        ans.explanation,
        ans.artifact_path,
        ans.artifact_name,
        ans.created_at,
        ans.updated_at
      FROM department_answers ans
      JOIN department_assessments da
        ON ans.department_assessment_id = da.department_assessment_id
      WHERE da.assessment_id = ?
      ORDER BY
        CASE ans.section_name
          WHEN 'Vendor Information' THEN 1
          WHEN 'Consumer' THEN 2
          WHEN 'IT Risk Management' THEN 3
          WHEN 'Compliance' THEN 4
          WHEN 'Resiliency' THEN 5
          WHEN 'Data Privacy' THEN 6
          WHEN 'Environmental and Social Risk Management' THEN 7
          WHEN 'Information Security' THEN 8
          ELSE 9
        END,
        ans.question_index ASC
    `,
    [assessment.assessment_id]
  );

  const vendorInformationAnswers = departmentAnswerRows
    .filter((answer) => answer.department_role === "employee" || answer.section_name === "Vendor Information")
    .map((answer) => ({
      ...answer,
      vendor_response: answer.response === "TEXT_ANSWER" ? answer.explanation || "" : answer.response || "",
      company_comment: ""
    }));

  const rawSignoffs = await runQuery(
    `
      SELECT
        s.signoff_id,
        s.assessment_id,
        s.department_assessment_id,
        s.role_name AS department_name,
        s.role_name AS department,
        s.signer_name,
        s.signoff_status AS status,
        s.signature_file_name,
        s.signature_file_path,
        s.signed_at,
        s.created_at,
        u.full_name AS submitted_by
      FROM sign_offs s
      LEFT JOIN users u ON s.created_by_user_id = u.user_id
      WHERE s.assessment_id = ?
      ORDER BY s.created_at DESC
    `,
    [assessment.assessment_id]
  );

  const usedSignoffIds = new Set();
  const departmentSignoffs = departmentAssessments
    .filter((dept) => dept.department_role !== "employee")
    .map((dept) => {
      const expectedLabel = roleLabels[dept.department_role] || dept.department_role;
      const match = rawSignoffs.find((signoff) => {
        if (usedSignoffIds.has(signoff.signoff_id)) return false;
        return Number(signoff.department_assessment_id) === Number(dept.department_assessment_id)
          || String(signoff.department_name || "").toLowerCase() === String(expectedLabel).toLowerCase();
      });

      if (match) {
        usedSignoffIds.add(match.signoff_id);
        return {
          ...match,
          department_name: expectedLabel,
          department: expectedLabel,
          status: match.status || "Pending"
        };
      }

      return {
        assessment_id: assessment.assessment_id,
        department_assessment_id: dept.department_assessment_id,
        department_name: expectedLabel,
        department: expectedLabel,
        signer_name: null,
        status: "Pending",
        signed_at: null,
        submitted_by: dept.submitted_by || null
      };
    });

  rawSignoffs.forEach((signoff) => {
    if (!usedSignoffIds.has(signoff.signoff_id)) {
      departmentSignoffs.push(signoff);
    }
  });

  const commentParts = [];
  departmentAssessments.forEach((item) => {
    if (item.admin_comment) {
      commentParts.push(`${roleLabels[item.department_role] || item.department_role}: ${item.admin_comment}`);
    }
  });

  const departmentAssessmentsWithAnswers = departmentAssessments.map((dept) => ({
    ...dept,
    answers: departmentAnswerRows.filter(
      (answer) => Number(answer.department_assessment_id) === Number(dept.department_assessment_id)
    )
  }));

  return {
    ...assessment,
    company_comment: commentParts.join("\n") || null,
    vendor_information_answers: vendorInformationAnswers,
    department_answers: departmentAnswerRows,
    department_assessments: departmentAssessmentsWithAnswers,
    department_signoffs: departmentSignoffs
  };
}

app.get("/admin/review-assessments", requireRole("employee"), async (_req, res) => {
  try {
    const assessments = await runQuery(
      `
        SELECT
          va.assessment_id,
          va.assessment_code,
          va.vendor_id,
          va.purpose,
          va.assessment_date,
          va.overall_status,
          va.created_at,
          va.updated_at,
          v.company_name,
          v.company_website,
          v.product_services_offered,
          v.contact_person_name,
          v.contact_email,
          v.contact_phone,
          u.full_name AS created_by
        FROM vendor_assessments va
        JOIN vendors v ON va.vendor_id = v.vendor_id
        LEFT JOIN users u ON va.created_by_user_id = u.user_id
        ORDER BY va.updated_at DESC, va.created_at DESC
      `
    );

    const bundles = [];
    for (const assessment of assessments) {
      const bundle = await getAdminAssessmentBundle(assessment.assessment_id);
      if (bundle) bundles.push(bundle);
    }

    res.json(bundles);
  } catch (error) {
    console.error("Fetch admin review assessments error:", error);
    res.status(500).json({ message: "Failed to load assessment review data." });
  }
});

app.get("/admin/reporting-signoff", requireRole("employee"), async (req, res) => {
  try {
    const bundle = await getAdminAssessmentBundle(req.query.assessment_id || null);

    if (!bundle) {
      return res.json({ assessment: null, signoffs: [] });
    }

    res.json({
      assessment: {
        assessment_id: bundle.assessment_id,
        assessment_code: bundle.assessment_code,
        company_name: bundle.company_name,
        product_services_offered: bundle.product_services_offered,
        overall_status: bundle.overall_status
      },
      signoffs: bundle.department_signoffs
    });
  } catch (error) {
    console.error("Fetch reporting signoff error:", error);
    res.status(500).json({ message: "Failed to load reporting sign-off data." });
  }
});

app.get("/admin/assessment-summary", requireRole("employee"), async (req, res) => {
  try {
    const bundle = await getAdminAssessmentBundle(req.query.assessment_id || null);

    if (!bundle) {
      return res.json({ assessment: null, department_assessments: [], department_signoffs: [] });
    }

    res.json({
      assessment: {
        assessment_id: bundle.assessment_id,
        assessment_code: bundle.assessment_code,
        company_name: bundle.company_name,
        product_services_offered: bundle.product_services_offered,
        overall_status: bundle.overall_status
      },
      department_assessments: bundle.department_assessments,
      department_signoffs: bundle.department_signoffs
    });
  } catch (error) {
    console.error("Fetch assessment summary error:", error);
    res.status(500).json({ message: "Failed to load assessment summary." });
  }
});

app.post("/admin/assessments/:assessment_id/finalize", requireRole("employee"), async (req, res) => {
  const assessmentId = req.params.assessment_id;

  try {
    const rows = await runQuery("SELECT * FROM vendor_assessments WHERE assessment_id = ?", [assessmentId]);

    if (!rows.length) {
      return res.status(404).json({ message: "Vendor assessment not found." });
    }

    await runQuery(
      `UPDATE vendor_assessments SET overall_status = 'Pending Admin Approval' WHERE assessment_id = ?`,
      [assessmentId]
    );

    res.json({ message: "Assessment finalized for reporting and sign-off." });
  } catch (error) {
    console.error("Finalize assessment error:", error);
    res.status(500).json({ message: "Failed to finalize assessment." });
  }
});

app.post("/admin/assessments/:assessment_id/decision", requireRole("employee"), async (req, res) => {
  const assessmentId = req.params.assessment_id;
  const { decision } = req.body;

  if (!["Approved", "Rejected"].includes(decision)) {
    return res.status(400).json({ message: "Invalid decision." });
  }

  try {
    const rows = await runQuery("SELECT * FROM vendor_assessments WHERE assessment_id = ?", [assessmentId]);

    if (!rows.length) {
      return res.status(404).json({ message: "Vendor assessment not found." });
    }

    await runQuery(
      `UPDATE vendor_assessments SET overall_status = ? WHERE assessment_id = ?`,
      [decision, assessmentId]
    );

    await runQuery(
      `UPDATE vendors SET overall_status = ? WHERE vendor_id = ?`,
      [decision === "Approved" ? "Completed" : "Rejected", rows[0].vendor_id]
    );

    res.json({ message: `Assessment ${decision.toLowerCase()} successfully.` });
  } catch (error) {
    console.error("Submit assessment decision error:", error);
    res.status(500).json({ message: "Failed to save assessment decision." });
  }
});

/* ADMIN EXCEL EXPORT */

function thinBorder() {
  return {
    top: { style: "thin", color: { argb: "FF000000" } },
    left: { style: "thin", color: { argb: "FF000000" } },
    bottom: { style: "thin", color: { argb: "FF000000" } },
    right: { style: "thin", color: { argb: "FF000000" } }
  };
}

function mediumBorder() {
  return {
    top: { style: "medium", color: { argb: "FF000000" } },
    left: { style: "medium", color: { argb: "FF000000" } },
    bottom: { style: "medium", color: { argb: "FF000000" } },
    right: { style: "medium", color: { argb: "FF000000" } }
  };
}

function setCellStyle(cell, options = {}) {
  cell.font = options.font || { size: 9, color: { argb: "FF000000" } };
  cell.alignment = options.alignment || {
    vertical: "top",
    horizontal: "left",
    wrapText: true
  };
  cell.border = options.border || thinBorder();

  if (options.fill) {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: options.fill }
    };
  }
}

function styleRange(sheet, range, options = {}) {
  const [start, end] = range.split(":");
  const startCell = sheet.getCell(start);
  const endCell = sheet.getCell(end);

  for (let row = startCell.row; row <= endCell.row; row++) {
    for (let col = startCell.col; col <= endCell.col; col++) {
      setCellStyle(sheet.getCell(row, col), options);
    }
  }
}

function formatExcelDate(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric"
  });
}

function estimateTextLines(value, charactersPerLine) {
  const text = String(value || "").trim();

  if (!text) {
    return 1;
  }

  return text.split(/\r?\n/).reduce((total, line) => {
    const cleanLine = line.trim();
    return total + Math.max(1, Math.ceil(cleanLine.length / charactersPerLine));
  }, 0);
}

function calculateRowHeight(items, options = {}) {
  const minHeight = options.minHeight || 54;
  const maxHeight = options.maxHeight || 180;
  const lineHeight = options.lineHeight || 15;

  const maxLines = items.reduce((highest, item) => {
    const lines = estimateTextLines(item.text, item.charactersPerLine || 60);
    return Math.max(highest, lines);
  }, 1);

  return Math.min(maxHeight, Math.max(minHeight, maxLines * lineHeight + 14));
}


function answerComment(item) {
  const parts = [];

  if (item.explanation) {
    parts.push(item.explanation);
  }

  if (item.artifact_name) {
    parts.push(`Artifact: ${item.artifact_name}`);
  }

  return parts.join("\n");
}

function normalizeSectionName(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function makeAnswerLookup(answers) {
  const lookup = {};

  (answers || []).forEach((answer) => {
    const role = normalizeSectionName(answer.department_role);
    const indexKey = `${role}|${Number(answer.question_index)}`;
    lookup[indexKey] = answer;

    const textKey = `${role}|${normalizeSectionName(answer.section_name)}|${normalizeSectionName(answer.question_text)}`;
    lookup[textKey] = answer;
  });

  return lookup;
}

function buildExportRowsForRole(role, answers) {
  const questions = flattenQuestionsForRole(role);
  const lookup = makeAnswerLookup(answers);

  return questions.map((question) => {
    const byIndex = lookup[`${normalizeSectionName(role)}|${Number(question.question_index)}`];
    const byText = lookup[`${normalizeSectionName(role)}|${normalizeSectionName(question.section_name)}|${normalizeSectionName(question.question_text)}`];
    const saved = byIndex || byText || {};

    return {
      department_role: role,
      section_name: question.section_name,
      question_index: question.question_index,
      question_text: question.question_text,
      response: saved.response || "",
      explanation: saved.explanation || "",
      artifact_name: saved.artifact_name || "",
      artifact_path: saved.artifact_path || ""
    };
  });
}

function buildVendorInformationExportRows(answers) {
  const lookup = makeAnswerLookup(answers);

  return vendorInformationQuestions.map((question, index) => {
    const byIndex = lookup[`employee|${Number(index)}`];
    const byText = lookup[`employee|vendor information|${normalizeSectionName(question)}`];
    const saved = byIndex || byText || {};

    return {
      department_role: "employee",
      section_name: "Vendor Information",
      question_index: index,
      question_text: question,
      response: saved.response || "",
      explanation: saved.explanation || "",
      artifact_name: saved.artifact_name || "",
      artifact_path: saved.artifact_path || ""
    };
  });
}

function buildSupplierDDFRows(answers) {
  return [
    ...buildVendorInformationExportRows(answers),
    ...buildExportRowsForRole("management", answers),
    ...buildExportRowsForRole("it", answers),
    ...buildExportRowsForRole("compliance", answers),
    ...buildExportRowsForRole("dpo", answers),
    ...buildExportRowsForRole("hr", answers)
  ];
}

function createSupplierDDFSheet(workbook, assessment = {}, answers = []) {
  const sheet = workbook.addWorksheet("Vendor DDF");

  const selectedAssessment = Array.isArray(assessment)
    ? assessment[0] || {}
    : assessment || {};

  sheet.pageSetup = {
    paperSize: 9,
    orientation: "portrait",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0
  };

  sheet.properties.defaultRowHeight = 30;
  sheet.views = [];

  sheet.columns = [
    { width: 86 },
    { width: 36 },
    { width: 36 }
  ];

  const titleFill = "FF1F4E79";
  const vendorFill = "FFC65911";
  const companyFill = "FF1F4E79";
  const sectionFill = "FFD9D9D9";

  sheet.mergeCells("A1:C1");
  sheet.getCell("A1").value = `${selectedAssessment.company_name || "<Company>"} - DUE DILIGENCE FORM`;
  setCellStyle(sheet.getCell("A1"), {
    font: { bold: true, size: 11, color: { argb: "FFFFFFFF" } },
    alignment: { horizontal: "center", vertical: "middle", wrapText: true },
    border: mediumBorder(),
    fill: titleFill
  });
  sheet.getRow(1).height = 24;

  const infoRows = [
    ["Assessment ID:", selectedAssessment.assessment_code || `VA-${selectedAssessment.assessment_id || ""}`],
    ["Assessment Date:", formatExcelDate(selectedAssessment.assessment_date)],
    ["Company Name:", selectedAssessment.company_name || ""],
    ["Company Website:", selectedAssessment.company_website || ""],
    ["Product/ Services Offered to <company>:", selectedAssessment.product_services_offered || ""],
    ["Purpose: For Accreditation/Re-accreditation, New contract or Renewal:", selectedAssessment.purpose || ""],
    [
      "Contact Person Name / Email Address / Phone Number:",
      `${selectedAssessment.contact_person_name || ""} ${selectedAssessment.contact_email || ""} ${selectedAssessment.contact_phone || ""}`.trim()
    ]
  ];

  let row = 2;

  infoRows.forEach(([label, value]) => {
    sheet.getCell(`A${row}`).value = label;
    sheet.getCell(`B${row}`).value = value;
    sheet.mergeCells(`B${row}:C${row}`);

    setCellStyle(sheet.getCell(`A${row}`), {
      font: { bold: true, size: 9 },
      alignment: { vertical: "middle", horizontal: "left", wrapText: true },
      border: thinBorder()
    });

    styleRange(sheet, `B${row}:C${row}`, {
      font: { size: 9 },
      alignment: { vertical: "middle", horizontal: "left", wrapText: true },
      border: thinBorder()
    });

    row++;
  });

  row++;

  sheet.getCell(`A${row}`).value = "";
  sheet.getCell(`B${row}`).value = "VENDOR RESPONSE";
  sheet.getCell(`C${row}`).value = "<Company> COMMENT/S";

  setCellStyle(sheet.getCell(`A${row}`), {
    font: { bold: true, size: 9 },
    border: mediumBorder()
  });

  setCellStyle(sheet.getCell(`B${row}`), {
    font: { bold: true, size: 9, color: { argb: "FFFFFFFF" } },
    alignment: { horizontal: "center", vertical: "middle", wrapText: true },
    border: mediumBorder(),
    fill: vendorFill
  });

  setCellStyle(sheet.getCell(`C${row}`), {
    font: { bold: true, size: 9, color: { argb: "FFFFFFFF" } },
    alignment: { horizontal: "center", vertical: "middle", wrapText: true },
    border: mediumBorder(),
    fill: companyFill
  });

  row++;

  const allRows = buildSupplierDDFRows(answers);

  const sectionOrder = [
    "Vendor Information",
    "Consumer",
    "IT Risk Management",
    "Compliance",
    "Resiliency",
    "Data Privacy",
    "Environmental and Social Risk Management"
  ];

  sectionOrder.forEach((sectionName) => {
    const sectionRows = allRows.filter((item) => normalizeSectionName(item.section_name) === normalizeSectionName(sectionName));

    if (!sectionRows.length) return;

    sheet.getCell(`A${row}`).value = sectionName.toUpperCase();
    sheet.getCell(`B${row}`).value = "";
    sheet.getCell(`C${row}`).value = "";

    styleRange(sheet, `A${row}:C${row}`, {
      font: { bold: true, size: 9 },
      alignment: { vertical: "middle", horizontal: "left", wrapText: true },
      border: mediumBorder(),
      fill: sectionFill
    });

    row++;

    sectionRows.forEach((item) => {
      const isVendorInfoText = item.department_role === "employee" && item.response === "TEXT_ANSWER";
      const commentText = isVendorInfoText ? "" : answerComment(item);
      const questionText = item.question_text || "";
      const responseText = isVendorInfoText ? (item.explanation || "") : (item.response || "");

      sheet.getCell(`A${row}`).value = questionText;
      sheet.getCell(`B${row}`).value = responseText;
      sheet.getCell(`C${row}`).value = commentText;
      sheet.getRow(row).height = calculateRowHeight(
        [
          { text: questionText, charactersPerLine: 78 },
          { text: responseText, charactersPerLine: 32 },
          { text: commentText, charactersPerLine: 32 }
        ],
        { minHeight: 62, maxHeight: 220, lineHeight: 15 }
      );

      setCellStyle(sheet.getCell(`A${row}`), {
        font: { italic: true, size: 9 },
        alignment: { vertical: "top", horizontal: "left", wrapText: true },
        border: thinBorder()
      });

      setCellStyle(sheet.getCell(`B${row}`), {
        font: { size: 9 },
        alignment: { vertical: "top", horizontal: "left", wrapText: true },
        border: thinBorder()
      });

      setCellStyle(sheet.getCell(`C${row}`), {
        font: { size: 9 },
        alignment: { vertical: "top", horizontal: "left", wrapText: true },
        border: thinBorder()
      });

      row++;
    });
  });
}

function createInformationSecuritySheet(workbook, assessment, answers) {
  const sheet = workbook.addWorksheet("Information Security");

  sheet.pageSetup = {
    paperSize: 9,
    orientation: "portrait",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0
  };

  sheet.properties.defaultRowHeight = 30;
  sheet.views = [];

  sheet.columns = [
    { width: 86 },
    { width: 34 },
    { width: 36 },
    { width: 28 }
  ];

  const infoSecRows = buildExportRowsForRole("infosec", answers);

  sheet.mergeCells("A1:D1");
  sheet.getCell("A1").value = `Product/ Services Offered to <Company>: ${assessment.product_services_offered || ""}`;
  setCellStyle(sheet.getCell("A1"), {
    font: { bold: true, size: 9 },
    alignment: { horizontal: "left", vertical: "middle", wrapText: true },
    border: mediumBorder()
  });

  sheet.getCell("A2").value = "IT SUPPLIER DUE DILIGENCE QUESTIONNAIRES";
  sheet.getCell("B2").value = "RESPONSE/CURRENTLY\nAVAILABLE IN YOUR COMPANY?\n(YES | NO | N/A)";
  sheet.getCell("C2").value = "VENDOR/SUPPLIER\nCOMMENTS";
  sheet.getCell("D2").value = "ARTIFACTS";

  ["A2", "B2", "C2", "D2"].forEach((cellAddress) => {
    setCellStyle(sheet.getCell(cellAddress), {
      font: { bold: true, size: 9, color: { argb: "FFFFFFFF" } },
      alignment: { horizontal: "center", vertical: "middle", wrapText: true },
      border: mediumBorder(),
      fill: "FF1F4E79"
    });
  });

  sheet.getRow(2).height = 45;

  let row = 3;
  let lastSection = "";

  infoSecRows.forEach((item) => {
    const sectionName = item.section_name || "Information Security";

    if (sectionName !== lastSection) {
      sheet.mergeCells(`A${row}:D${row}`);
      sheet.getCell(`A${row}`).value = sectionName;
      setCellStyle(sheet.getCell(`A${row}`), {
        font: { bold: true, size: 9, color: { argb: "FFFFFFFF" } },
        alignment: { horizontal: "center", vertical: "middle", wrapText: true },
        border: mediumBorder(),
        fill: "FF1F4E79"
      });

      row++;
      lastSection = sectionName;
    }

    const questionText = item.question_text || "";
    const responseText = item.response || "";
    const explanationText = item.explanation || "";
    const artifactText = item.artifact_name || "";

    sheet.getCell(`A${row}`).value = questionText;
    sheet.getCell(`B${row}`).value = responseText;
    sheet.getCell(`C${row}`).value = explanationText;
    sheet.getCell(`D${row}`).value = artifactText;
    sheet.getRow(row).height = calculateRowHeight(
      [
        { text: questionText, charactersPerLine: 78 },
        { text: responseText, charactersPerLine: 30 },
        { text: explanationText, charactersPerLine: 32 },
        { text: artifactText, charactersPerLine: 24 }
      ],
      { minHeight: 58, maxHeight: 220, lineHeight: 15 }
    );

    ["A", "B", "C", "D"].forEach((col) => {
      setCellStyle(sheet.getCell(`${col}${row}`), {
        font: { size: 9 },
        alignment: { vertical: "top", horizontal: "left", wrapText: true },
        border: thinBorder()
      });
    });

    row++;
  });
}

function getSignatureImageExtension(filePath) {
  const ext = path.extname(filePath || "").toLowerCase();

  if (ext === ".png") return "png";
  if (ext === ".jpg" || ext === ".jpeg") return "jpeg";

  return null;
}

function getSignaturePhysicalPath(signatureFilePath) {
  if (!signatureFilePath) return null;

  const cleanPath = String(signatureFilePath).replace(/^\/+/, "");
  return path.join(__dirname, "public", cleanPath);
}

function createSignoffSheet(workbook, signoffs) {
  const sheet = workbook.addWorksheet("Sign-off Sheet");

  sheet.pageSetup = {
    paperSize: 9,
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 1
  };

  sheet.properties.defaultRowHeight = 20;
  sheet.columns = [
    { width: 4 },
    { width: 10 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 4 }
  ];

  for (let r = 1; r <= 33; r++) {
    for (let c = 2; c <= 13; c++) {
      setCellStyle(sheet.getCell(r, c), {
        font: { size: 9 },
        alignment: { horizontal: "center", vertical: "middle", wrapText: true },
        border: thinBorder()
      });
    }
  }

  sheet.mergeCells("C2:E4");
  sheet.getCell("C2").value = "";
  styleRange(sheet, "C2:E4", {
    font: { size: 9 },
    alignment: { horizontal: "center", vertical: "middle", wrapText: true },
    border: mediumBorder()
  });

  sheet.mergeCells("F2:L4");
  sheet.getCell("F2").value = "VENDOR/IT SUPPLIER DUE DILIGENCE FORM\nSIGN-OFF SHEET";
  setCellStyle(sheet.getCell("F2"), {
    font: { bold: true, size: 18 },
    alignment: { horizontal: "left", vertical: "middle", wrapText: true },
    border: thinBorder()
  });

  const signoffMap = {};

  (signoffs || []).forEach((item) => {
    signoffMap[normalizeSectionName(item.role_name)] = item;
  });

  function getSignoff(role) {
    return signoffMap[normalizeSectionName(role)] || null;
  }

  function addSignatureImage(signoff, imageRange) {
    if (!signoff || !signoff.signature_file_path) return false;

    const physicalPath = getSignaturePhysicalPath(signoff.signature_file_path);
    const extension = getSignatureImageExtension(physicalPath);

    if (!physicalPath || !extension || !fs.existsSync(physicalPath)) {
      return false;
    }

    const [startCell, endCell] = imageRange.split(":");
    const start = sheet.getCell(startCell);
    const end = sheet.getCell(endCell);

    const imageId = workbook.addImage({
      filename: physicalPath,
      extension
    });

    sheet.addImage(imageId, {
      tl: {
        col: start.col - 1 + 0.15,
        row: start.row - 1 + 0.20
      },
      br: {
        col: end.col - 0.15,
        row: end.row - 0.35
      },
      editAs: "oneCell"
    });

    return true;
  }

  function signatureBlock(roleRange, nameRange, roleLabel, signoff) {
    sheet.mergeCells(roleRange);
    sheet.mergeCells(nameRange);

    const roleCell = sheet.getCell(roleRange.split(":")[0]);
    const nameCell = sheet.getCell(nameRange.split(":")[0]);

    roleCell.value = roleLabel;

    const signerName = signoff?.signer_name || "";
    const hasSignatureImage = addSignatureImage(signoff, nameRange);

    if (hasSignatureImage) {
      nameCell.value = signerName
        ? `\n\n\n\n${signerName}`
        : "";
    } else {
      nameCell.value = signerName || signoff?.signature_file_name || "";
    }

    styleRange(sheet, roleRange, {
      font: { bold: true, size: 9 },
      alignment: { horizontal: "center", vertical: "middle", wrapText: true },
      border: mediumBorder(),
      fill: "FFDDEBF7"
    });

    styleRange(sheet, nameRange, {
      font: { bold: true, size: 10 },
      alignment: { horizontal: "center", vertical: "bottom", wrapText: true },
      border: mediumBorder()
    });
  }

  signatureBlock("C6:C10", "D6:F10", "IT", getSignoff("IT"));
  signatureBlock("H6:H10", "I6:K10", "COMPLIANCE", getSignoff("Compliance"));
  signatureBlock("C12:C16", "D12:F16", "INFOSEC", getSignoff("InfoSec"));
  signatureBlock("H12:H16", "I12:K16", "DPO", getSignoff("DPO"));
  signatureBlock("C19:C23", "D19:F23", "RISK\nMANAGEMENT\nOFFICER", getSignoff("Management"));
  signatureBlock("H19:H23", "I19:K23", "HR", getSignoff("HR"));

  sheet.mergeCells("C25:L26");
  sheet.getCell("C25").value =
    "DISCLAIMER: All identified risks, findings and recommended controls are based on the disclosure of Vendor/IT supplier with the supervision of the requesting unit based on the initial questionnaire submitted.";

  sheet.mergeCells("C28:L28");
  sheet.getCell("C28").value =
    "All identified Vendor/IT supplier risks, any open items are reflected in the Business unit's RCSAs and SLA Documentation.";

  sheet.mergeCells("C30:L31");
  sheet.getCell("C30").value =
    "This signed document is a requirement for accreditation and onboarding of Vendor/IT supplier whose service engagement connects to the Company's network infrastructure/core systems and/or with exchange of data.";

  ["C25", "C28", "C30"].forEach((cellAddress) => {
    setCellStyle(sheet.getCell(cellAddress), {
      font: { italic: true, size: 8 },
      alignment: { horizontal: "center", vertical: "middle", wrapText: true },
      border: thinBorder()
    });
  });

  sheet.mergeCells("C33:L33");
  sheet.getCell("C33").value = "Signature above printed name of Business Unit Representative";
  setCellStyle(sheet.getCell("C33"), {
    font: { size: 9 },
    alignment: { horizontal: "center", vertical: "middle", wrapText: true },
    border: thinBorder(),
    fill: "FFD9D9D9"
  });
}



app.get("/admin/export-excel", requireRole("employee"), async (req, res) => {
  try {
    const requestedAssessmentId = req.query.assessment_id
      ? Number(req.query.assessment_id)
      : null;

    const assessmentParams = [];
    let assessmentWhere = "";
    let assessmentLimit = "LIMIT 1";

    if (requestedAssessmentId && Number.isInteger(requestedAssessmentId)) {
      assessmentWhere = "WHERE va.assessment_id = ?";
      assessmentParams.push(requestedAssessmentId);
      assessmentLimit = "";
    }

    const assessments = await runQuery(
      `
        SELECT
          va.assessment_id,
          va.assessment_code,
          va.vendor_id,
          va.purpose,
          va.assessment_date,
          va.overall_status,
          va.created_at,
          v.company_name,
          v.company_website,
          v.product_services_offered,
          v.contact_person_name,
          v.contact_email,
          v.contact_phone,
          u.full_name AS created_by
        FROM vendor_assessments va
        JOIN vendors v ON va.vendor_id = v.vendor_id
        LEFT JOIN users u ON va.created_by_user_id = u.user_id
        ${assessmentWhere}
        ORDER BY va.created_at DESC
        ${assessmentLimit}
      `,
      assessmentParams
    );

    if (!assessments.length) {
      return res.status(404).json({
        message: "Selected assessment not found."
      });
    }

    const selectedAssessment = assessments[0];
    const selectedAssessmentId = selectedAssessment.assessment_id;

    const answers = await runQuery(
      `
        SELECT
          da.department_assessment_id,
          da.assessment_id,
          da.department_role,
          da.status AS department_status,
          va.assessment_code,
          va.vendor_id,
          v.company_name,
          ans.section_name,
          ans.question_index,
          ans.question_text,
          ans.response,
          ans.explanation,
          ans.artifact_name,
          ans.artifact_path
        FROM department_answers ans
        JOIN department_assessments da
          ON ans.department_assessment_id = da.department_assessment_id
        JOIN vendor_assessments va
          ON da.assessment_id = va.assessment_id
        JOIN vendors v
          ON va.vendor_id = v.vendor_id
        WHERE va.assessment_id = ?
        ORDER BY
          FIELD(da.department_role, 'employee', 'management', 'it', 'compliance', 'dpo', 'hr', 'infosec'),
          ans.question_index ASC
      `,
      [selectedAssessmentId]
    );

    const signoffs = await runQuery(
        `
          SELECT
            s.signoff_id,
            s.assessment_id,
            s.department_assessment_id,
            s.role_name,
            s.signer_name,
            s.signoff_status,
            s.signature_file_name,
            s.signature_file_path,
            s.signed_at,
            s.created_at,
            u.full_name AS created_by
          FROM sign_offs s
          LEFT JOIN department_assessments da
            ON s.department_assessment_id = da.department_assessment_id
          LEFT JOIN users u
            ON s.created_by_user_id = u.user_id
          WHERE s.assessment_id = ?
          OR da.assessment_id = ?
          ORDER BY s.created_at DESC
        `,
        [selectedAssessmentId, selectedAssessmentId]
      );

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Validify";
    workbook.created = new Date();

    createSupplierDDFSheet(workbook, selectedAssessment, answers);
    createInformationSecuritySheet(workbook, selectedAssessment, answers);
    createSignoffSheet(workbook, signoffs);

    const safeCode = selectedAssessment.assessment_code || "Due_Diligence_Report";
    const safeCompanyName = String(selectedAssessment.company_name || "Vendor")
      .replace(/[^a-zA-Z0-9-_ ]/g, "")
      .replace(/\s+/g, "_");

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Validify_${safeCode}_${safeCompanyName}_Due_Diligence_Report.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Compliance Officer Excel export error:", error);
    res.status(500).json({
      message: "Failed to generate Excel report."
    });
  }
});


/* VENDOR PORTAL ROUTES */

const vendorSectionMeta = {
  vendor_info: { section_name: "Vendor Information", offset: 0 },
  consumer: { section_name: "Consumer", offset: 100 },
  it_risk: { section_name: "IT Risk Management", offset: 200 },
  compliance: { section_name: "Compliance", offset: 300 },
  resiliency: { section_name: "Resiliency", offset: 400 },
  data_privacy: { section_name: "Data Privacy", offset: 500 },
  environmental: { section_name: "Environmental and Social Risk Management", offset: 600 },
  infosec: { section_name: "Information Security", offset: 700 }
};

function vendorSectionKeyFromName(sectionName) {
  const normalized = normalizeSectionName(sectionName);
  const found = Object.entries(vendorSectionMeta).find(([, meta]) => {
    return normalizeSectionName(meta.section_name) === normalized;
  });

  return found ? found[0] : null;
}

async function getVendorOwnedAssessment(userId, assessmentId) {
  const rows = await runQuery(
    `
      SELECT
        va.assessment_id,
        va.assessment_code,
        va.vendor_id,
        va.purpose,
        va.assessment_date,
        va.overall_status,
        va.vendor_status,
        va.created_at,
        va.updated_at,
        v.company_name,
        v.company_website,
        v.product_services_offered,
        v.contact_person_name,
        v.contact_email,
        v.contact_phone
      FROM vendor_assessments va
      JOIN vendors v ON va.vendor_id = v.vendor_id
      WHERE va.assessment_id = ?
      AND v.user_id = ?
      LIMIT 1
    `,
    [assessmentId, userId]
  );

  return rows[0] || null;
}

async function loadVendorAnswersForAssessment(assessmentId) {
  const rows = await runQuery(
    `
      SELECT
        ans.answer_id,
        ans.department_assessment_id,
        ans.section_name,
        ans.question_index,
        ans.question_text,
        ans.response,
        ans.explanation,
        ans.artifact_path,
        ans.artifact_name,
        ans.created_at,
        ans.updated_at
      FROM department_answers ans
      JOIN department_assessments da
        ON ans.department_assessment_id = da.department_assessment_id
      WHERE da.assessment_id = ?
      AND da.department_role = 'employee'
      ORDER BY ans.question_index ASC
    `,
    [assessmentId]
  );

  const grouped = {};

  rows.forEach((answer) => {
    const sectionKey = vendorSectionKeyFromName(answer.section_name);
    if (!sectionKey) return;

    const meta = vendorSectionMeta[sectionKey];
    const localIndex = Number(answer.question_index) - Number(meta.offset || 0);

    if (!grouped[sectionKey]) grouped[sectionKey] = {};
    grouped[sectionKey][localIndex] = {
      ...answer,
      question_index: localIndex
    };
  });

  return grouped;
}

app.get("/vendor/dashboard", requireVendor, async (req, res) => {
  try {
    const userId = req.session.user.user_id;

    const vendorRows = await runQuery(
      `
        SELECT
          vendor_id,
          company_name,
          company_website,
          product_services_offered,
          contact_person_name,
          contact_email,
          contact_phone,
          overall_status,
          created_at,
          updated_at
        FROM vendors
        WHERE user_id = ?
        ORDER BY updated_at DESC, created_at DESC
      `,
      [userId]
    );

    const assessmentRows = await runQuery(
      `
        SELECT
          va.assessment_id,
          va.assessment_code,
          va.vendor_id,
          va.purpose,
          va.assessment_date,
          va.overall_status,
          va.vendor_status,
          va.created_at,
          va.updated_at,
          v.company_name,
          v.product_services_offered
        FROM vendor_assessments va
        JOIN vendors v ON va.vendor_id = v.vendor_id
        WHERE v.user_id = ?
        ORDER BY va.updated_at DESC, va.created_at DESC
      `,
      [userId]
    );

    res.json({
      vendors: vendorRows,
      assessments: assessmentRows
    });
  } catch (error) {
    console.error("Vendor dashboard error:", error);
    res.status(500).json({ message: "Failed to load vendor dashboard." });
  }
});

app.post("/vendor/vendors", requireVendor, async (req, res) => {
  const {
    company_name,
    company_website,
    product_services_offered,
    contact_person_name,
    contact_email,
    contact_phone
  } = req.body;

  if (!company_name || !product_services_offered || !contact_person_name || !contact_email || !contact_phone) {
    return res.status(400).json({ message: "Company name, services, contact person, email, and phone are required." });
  }

  try {
    const userId = req.session.user.user_id;

    const duplicateRows = await runQuery(
      `
        SELECT vendor_id
        FROM vendors
        WHERE user_id = ?
        AND LOWER(company_name) = LOWER(?)
        LIMIT 1
      `,
      [userId, company_name]
    );

    if (duplicateRows.length) {
      await runQuery(
        `
          UPDATE vendors
          SET
            company_website = ?,
            product_services_offered = ?,
            contact_person_name = ?,
            contact_email = ?,
            contact_phone = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE vendor_id = ?
          AND user_id = ?
        `,
        [
          company_website || null,
          product_services_offered,
          contact_person_name,
          contact_email,
          contact_phone,
          duplicateRows[0].vendor_id,
          userId
        ]
      );

      return res.json({
        message: "Vendor credentials updated.",
        vendor_id: duplicateRows[0].vendor_id
      });
    }

    const result = await runQuery(
      `
        INSERT INTO vendors
        (user_id, company_name, company_website, product_services_offered, contact_person_name, contact_email, contact_phone, created_by_user_id, overall_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending')
      `,
      [
        userId,
        company_name,
        company_website || null,
        product_services_offered,
        contact_person_name,
        contact_email,
        contact_phone,
        userId
      ]
    );

    res.json({
      message: "Vendor credentials saved.",
      vendor_id: result.insertId
    });
  } catch (error) {
    console.error("Vendor credentials save error:", error);
    res.status(500).json({ message: "Failed to save vendor credentials." });
  }
});

app.post("/vendor/assessments", requireVendor, async (req, res) => {
  const { vendor_id, purpose, assessment_date } = req.body;

  if (!vendor_id || !purpose || !assessment_date) {
    return res.status(400).json({ message: "Vendor, purpose, and assessment date are required." });
  }

  try {
    const userId = req.session.user.user_id;
    const vendorRows = await runQuery(
      `SELECT * FROM vendors WHERE vendor_id = ? AND user_id = ? LIMIT 1`,
      [vendor_id, userId]
    );

    if (!vendorRows.length) {
      return res.status(404).json({ message: "Vendor profile not found for this account." });
    }

    const result = await runQuery(
      `
        INSERT INTO vendor_assessments
        (vendor_id, created_by_user_id, purpose, assessment_date, overall_status, vendor_status)
        VALUES (?, ?, ?, ?, 'Draft', 'Draft')
      `,
      [vendor_id, userId, purpose, assessment_date]
    );

    const assessmentId = result.insertId;
    const assessmentCode = makeAssessmentCode(assessmentId);

    await runQuery(
      `UPDATE vendor_assessments SET assessment_code = ? WHERE assessment_id = ?`,
      [assessmentCode, assessmentId]
    );

    await createAllDepartmentAssessments(assessmentId);

    const rows = await runQuery(
      `
        SELECT
          va.assessment_id,
          va.assessment_code,
          va.vendor_id,
          va.purpose,
          va.assessment_date,
          va.overall_status,
          va.vendor_status,
          va.created_at,
          va.updated_at,
          v.company_name,
          v.product_services_offered
        FROM vendor_assessments va
        JOIN vendors v ON va.vendor_id = v.vendor_id
        WHERE va.assessment_id = ?
      `,
      [assessmentId]
    );

    res.json(rows[0]);
  } catch (error) {
    console.error("Vendor create assessment error:", error);
    res.status(500).json({ message: "Failed to create vendor assessment." });
  }
});

app.get("/vendor/assessments/:assessment_id", requireVendor, async (req, res) => {
  try {
    const assessment = await getVendorOwnedAssessment(req.session.user.user_id, req.params.assessment_id);

    if (!assessment) {
      return res.status(404).json({ message: "Assessment not found for this vendor account." });
    }

    const answers = await loadVendorAnswersForAssessment(assessment.assessment_id);

    res.json({
      assessment,
      answers
    });
  } catch (error) {
    console.error("Vendor load assessment error:", error);
    res.status(500).json({ message: "Failed to load vendor assessment." });
  }
});

app.post("/vendor/assessments/:assessment_id/save", requireVendor, upload.any(), async (req, res) => {
  const assessmentId = req.params.assessment_id;
  const sectionKey = req.body.section_key;
  const submitStatus = req.body.status === "Submitted" ? "Submitted" : "Draft";
  const meta = vendorSectionMeta[sectionKey];

  if (!meta) {
    return res.status(400).json({ message: "Invalid vendor form section." });
  }

  let answers;

  try {
    answers = JSON.parse(req.body.answers || "[]");
  } catch (_error) {
    return res.status(400).json({ message: "Invalid answer data." });
  }

  if (!Array.isArray(answers) || !answers.length) {
    return res.status(400).json({ message: "No answers submitted." });
  }

  for (const answer of answers) {
    const fileField = `artifact_${answer.question_index}`;
    const uploadedFile = (req.files || []).find((file) => file.fieldname === fileField);
    const hasExistingArtifact = Boolean(answer.existing_artifact_path || answer.existing_artifact_name);
    const hasUploadedArtifact = Boolean(uploadedFile);

    if (!answer.response || !String(answer.explanation || "").trim()) {
      return res.status(400).json({ message: "Every question requires an answer and comment." });
    }

    if (!hasExistingArtifact && !hasUploadedArtifact) {
      return res.status(400).json({ message: "Every question requires a PDF artifact." });
    }

    if (uploadedFile) {
      const isPdf = uploadedFile.mimetype === "application/pdf" || uploadedFile.originalname.toLowerCase().endsWith(".pdf");
      if (!isPdf) {
        return res.status(400).json({ message: "Only PDF files are accepted." });
      }
    }
  }

  try {
    const assessment = await getVendorOwnedAssessment(req.session.user.user_id, assessmentId);

    if (!assessment) {
      return res.status(404).json({ message: "Assessment not found for this vendor account." });
    }

    const employeeAssessment = await ensureDepartmentAssessment(assessmentId, "employee", "Draft");

    const values = answers.map((answer) => {
      const fileField = `artifact_${answer.question_index}`;
      const uploadedFile = (req.files || []).find((file) => file.fieldname === fileField);
      const dbQuestionIndex = Number(meta.offset || 0) + Number(answer.question_index);

      return [
        employeeAssessment.department_assessment_id,
        meta.section_name,
        dbQuestionIndex,
        answer.question_text || "",
        answer.response === "NA" ? "N/A" : answer.response,
        answer.explanation || null,
        uploadedFile ? `/uploads/${uploadedFile.filename}` : answer.existing_artifact_path || null,
        uploadedFile ? uploadedFile.originalname : answer.existing_artifact_name || null
      ];
    });

    await runQuery(
      `
        INSERT INTO department_answers
        (department_assessment_id, section_name, question_index, question_text, response, explanation, artifact_path, artifact_name)
        VALUES ?
        ON DUPLICATE KEY UPDATE
          section_name = VALUES(section_name),
          question_text = VALUES(question_text),
          response = VALUES(response),
          explanation = VALUES(explanation),
          artifact_path = VALUES(artifact_path),
          artifact_name = VALUES(artifact_name),
          updated_at = CURRENT_TIMESTAMP
      `,
      [values]
    );

    const departmentStatus = submitStatus === "Submitted" ? "Pending Admin Approval" : "Draft";
    const assessmentStatus = submitStatus === "Submitted" ? "Pending Admin Approval" : "Draft";

    await runQuery(
      `
        UPDATE department_assessments
        SET status = ?,
            submitted_by_user_id = ?,
            submitted_at = CASE WHEN ? = 'Pending Admin Approval' THEN CURRENT_TIMESTAMP ELSE submitted_at END
        WHERE department_assessment_id = ?
      `,
      [departmentStatus, req.session.user.user_id, departmentStatus, employeeAssessment.department_assessment_id]
    );

    await runQuery(
      `
        UPDATE vendor_assessments
        SET overall_status = ?,
            vendor_status = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE assessment_id = ?
      `,
      [assessmentStatus, submitStatus, assessmentId]
    );

    if (submitStatus === "Submitted") {
      await runQuery(
        `UPDATE vendors SET overall_status = 'In Review' WHERE vendor_id = ?`,
        [assessment.vendor_id]
      );
    }

    const updatedAssessment = await getVendorOwnedAssessment(req.session.user.user_id, assessmentId);
    const updatedAnswers = await loadVendorAnswersForAssessment(assessmentId);

    res.json({
      message: submitStatus === "Submitted"
        ? "Assessment submitted to the Employee / Compliance Officer."
        : "Draft saved.",
      assessment: updatedAssessment,
      answers: updatedAnswers
    });
  } catch (error) {
    console.error("Vendor save assessment error:", error);
    res.status(500).json({ message: "Failed to save vendor assessment." });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
