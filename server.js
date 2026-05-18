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

const roleLabels = {
  it: "IT",
  infosec: "InfoSec",
  management: "Management",
  dpo: "DPO",
  hr: "HR",
  compliance: "Compliance"
};

const assessmentCodePrefixes = {
  it: "IT",
  infosec: "IS",
  management: "MG",
  dpo: "DP",
  hr: "HR",
  compliance: "CP"
};

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
      role ENUM('employee', 'it', 'infosec', 'management', 'dpo', 'hr', 'compliance', 'admin') NOT NULL,
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
        'employee', 'it', 'infosec', 'management', 'dpo', 'hr', 'compliance', 'admin'
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
      department_role ENUM('it', 'infosec', 'management', 'dpo', 'hr', 'compliance') NOT NULL,
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

  await runQuery(`
    CREATE TABLE IF NOT EXISTS department_assessments (
      department_assessment_id INT AUTO_INCREMENT PRIMARY KEY,
      assessment_id INT NOT NULL,
      department_role ENUM('it', 'infosec', 'management', 'dpo', 'hr', 'compliance') NOT NULL,
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

  await runQuery(`
    CREATE TABLE IF NOT EXISTS department_answers (
      answer_id INT AUTO_INCREMENT PRIMARY KEY,
      department_assessment_id INT NOT NULL,
      section_name VARCHAR(150) NOT NULL,
      question_index INT NOT NULL,
      question_text TEXT NOT NULL,
      response ENUM('Yes', 'No', 'N/A') NOT NULL,
      explanation TEXT NULL,
      artifact_path VARCHAR(255) NULL,
      artifact_name VARCHAR(255) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_department_answer (department_assessment_id, question_index)
    )
  `);

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
  const values = departmentRoles.map((role) => [assessmentId, role, "Pending"]);

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
      SELECT status
      FROM department_assessments
      WHERE assessment_id = ?
    `,
    [assessmentId]
  );

  let overallStatus = "In Review";

  if (rows.some((row) => row.status === "Rejected")) {
    overallStatus = "Rejected";
  } else if (rows.length >= departmentRoles.length && rows.every((row) => row.status === "Approved")) {
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

    await runQuery(
      `
        INSERT INTO users
        (full_name, email, password_hash, role, email_verified, verification_token_hash, verification_token_expires)
        VALUES (?, ?, ?, ?, 1, NULL, NULL)
      `,
      [full_name, email, passwordHash, role]
    );

    res.json({ message: "Account registered successfully. You can now log in." });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ message: "Email already exists." });
    }

    console.error("Register error:", error);
    res.status(500).json({ message: "Failed to register account." });
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const results = await runQuery("SELECT * FROM users WHERE email = ?", [email]);

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

    res.json({ message: "Login successful.", user: req.session.user });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Login failed." });
  }
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

app.post("/vendors", requireAnyRole(["employee", ...departmentRoles]), async (req, res) => {
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
    const reviewValues = departmentRoles.map((role) => [vendorId, role, "Pending"]);

    await runQuery(
      `
        INSERT IGNORE INTO department_reviews
        (vendor_id, department_role, review_status)
        VALUES ?
      `,
      [reviewValues]
    );

    res.json({ message: "Vendor saved. Create a vendor assessment to send it to departments.", vendor_id: vendorId });
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

app.post("/vendor-assessments", requireAnyRole(["employee", ...departmentRoles]), async (req, res) => {
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

app.get("/department/questions", requireDepartment, (req, res) => {
  res.json(flattenQuestionsForRole(req.session.user.role));
});

app.get("/department/queue", requireDepartment, async (req, res) => {
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

app.get("/department/assessments", requireDepartment, async (req, res) => {
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

app.post("/department/assessments/:assessment_id/start", requireDepartment, async (req, res) => {
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

app.get("/department/assessments/:assessment_id", requireDepartment, async (req, res) => {
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

app.post("/department/assessments/:assessment_id/submit", requireDepartment, upload.any(), async (req, res) => {
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
        answer.response,
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
        `${roleLabels[departmentRole] || departmentRole} form submitted to Admin.`,
        assessmentRows[0].vendor_id,
        departmentRole
      ]
    );

    await updateMainAssessmentStatus(assessmentId);

    res.json({ message: `${roleLabels[departmentRole] || departmentRole} assessment submitted to Admin for approval.` });
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
  const { signer_name, signoff_status, assessment_id, department_assessment_id } = req.body;

  if (!signer_name) {
    return res.status(400).json({ message: "Signer name is required." });
  }

  const roleName = roleLabels[req.session.user.role] || req.session.user.role;
  const status = signoff_status === "Signed" ? "Signed" : "Pending";
  const fileName = req.file ? req.file.originalname : null;
  const filePath = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    await runQuery(
      `
        INSERT INTO sign_offs
        (assessment_id, department_assessment_id, role_name, signer_name, signoff_status, signature_file_name, signature_file_path, signed_at, created_by_user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        assessment_id || null,
        department_assessment_id || null,
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

app.get("/admin/vendors", requireRole("admin"), async (_req, res) => {
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

app.get("/admin/department-assessments", requireRole("admin"), async (_req, res) => {
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

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
