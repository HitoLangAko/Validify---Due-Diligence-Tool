
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const ExcelJS = require("exceljs");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));
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

const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL_CA_PATH
    ? {
        ca: fs.readFileSync(process.env.DB_SSL_CA_PATH)
      }
    : undefined,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const ddfSections = [
  {
    key: "ddf-vendor-information",
    name: "Vendor Information",
    questions: [
      "Type of service or deployment model would this vendor implement for the company?",
      "Vendor clients",
      "Vendor local offices",
      "Vendor HQ location",
      "Number of years the vendor has been in business",
      "Please describe your ability and capacity to perform the outsourced activities effectively and reliably.",
      "What is your support turnaround time?",
      "To whom are issues escalated? Please provide name, email address, and contact number.",
      "Have there been any instances where you were unable to deliver services as per agreed terms?",
      "Please provide the cost of this particular engagement."
    ]
  },
  {
    key: "consumer",
    name: "Consumer",
    questions: [
      "Do you have a mechanism to address client complaints against an authorized agent or representative? Please provide an overview of your complaint handling procedures.",
      "How do you ensure that client complaints are addressed quickly and adequately?",
      "Do you have a team or individuals dedicated to managing consumer complaints? If so, lay out the position and qualifications.",
      "What is a typical time frame for acknowledging and addressing a customer complaint?",
      "How do you track and document customer complaints?"
    ]
  },
  {
    key: "it-risk-management",
    name: "IT Risk Management",
    questions: [
      "Does your organization include IT-related functions such as hardware, software, cloud, maintenance, or other IT resources?",
      "If yes, please provide detailed scope or involvement and outsourced IT functions.",
      "Do you have an IT Risk Management organizational framework or program?",
      "Do you monitor and report Key Risk Indicators and other IT Risk Metrics?",
      "Do you use any third-party IT vendors, contractors, or subcontractors?",
      "Please share documented agreements such as MSA, SLA, NDA, and BCP.",
      "Please provide the latest internal and external audit report and status of open findings.",
      "Will the service be supplied via private cloud, public cloud, hybrid cloud, or community cloud?"
    ]
  },
  {
    key: "compliance",
    name: "Compliance",
    questions: [
      "Enumerate the top shareholders and officers of the vendor as indicated in the General Information Sheet.",
      "Will the service require the transfer of company data to another country?",
      "Do you have policies and procedures to comply with AML and CFT regulations?",
      "Will the service to be provided involve AML-related transactions?",
      "Is there a specific alternate site documented in the BCP?"
    ]
  },
  {
    key: "resiliency",
    name: "Resiliency",
    questions: [
      "What is the specific alternate site documented in the BCP?",
      "Have you conducted BCP testing?",
      "Provide the approved Business Continuity Plan.",
      "Provide results of the most recent IT DRP and BCP tests.",
      "Are there action plans in place for corrective actions discovered during the test?"
    ]
  },
  {
    key: "data-privacy",
    name: "Data Privacy",
    questions: [
      "Is your company registered at the National Privacy Commission?",
      "Please provide NPC Registration Certificate.",
      "Who is your organization Data Privacy Officer and what are their contact details?",
      "Is your company certified with ISO 27001?",
      "Describe in detail all the data that would be processed or stored under this engagement.",
      "Will company data, whether PII or non-PII, be stored in cloud?",
      "Describe the security controls employed to protect data at rest and data in transit.",
      "How will the company be notified if an information security breach involving company data occurred?",
      "What is the policy for archiving company data when the need arises?",
      "Where does the data or information reside or transition through at a given point in time?"
    ]
  },
  {
    key: "environmental-social-risk-management",
    name: "Environmental and Social Risk Management",
    questions: [
      "Please provide a data flow diagram.",
      "Do you have any outstanding legal, regulatory, or environmental issues that could impact your ability to supply goods or services?",
      "Do you have policies in place to ensure compliance with labor, environmental, and health and safety laws?",
      "Do you have policies in place to prevent discrimination, harassment, and abuse of employees?",
      "Do you have systems or policies in place to prevent fraud, corruption, forced labor, child labor, and other unethical practices?",
      "Do you have systems or policies in place to track and measure sustainability performance or have a sustainability report?"
    ]
  }
];

const informationSecuritySections = [
  {
    name: "A. Leadership and Management",
    questions: [
      "Is there a dedicated security officer or team responsible for overseeing the implementation of the information security programs, awareness, and compliance in your organization?",
      "Does your security officer report to senior management or part of the organization's steering committee?"
    ]
  },
  {
    name: "B. Security Governance",
    questions: [
      "Do you have documented security policies?",
      "Are the security policies board approved?",
      "Are security policies regularly reviewed to align with ISO27001, PCI DSS, NIST, or similar standards?",
      "Does your organization undergo regular internal and external security audits?"
    ]
  },
  {
    name: "C. Legal and Compliance",
    questions: [
      "Do you comply with relevant local and international laws and security regulations?",
      "Are security requirements incorporated in contracts, including data protection clauses?"
    ]
  },
  {
    name: "D. Employee Security Awareness",
    questions: [
      "Do you have an established Information Security Awareness Program?",
      "How often do you conduct security awareness training and what topics are covered?",
      "Do you conduct background investigations before hiring employees who handle sensitive information?"
    ]
  },
  {
    name: "E. Access Control Management",
    questions: [
      "Are roles and access rights following the least-privilege principle?",
      "Are user privileges regularly reviewed and updated?",
      "Are access logs to sensitive data maintained for access review?"
    ]
  },
  {
    name: "F. Network Security",
    questions: [
      "Are you employing a zero-trust infrastructure model?",
      "Does your organization encrypt communications and data stored in IT facilities, including data at rest and data in transit?"
    ]
  },
  {
    name: "G. Application Security",
    questions: [
      "Do you perform application security testing or assessment before production deployment?",
      "Do you follow secure coding practices such as OWASP Top 10?",
      "Do you perform code reviews?",
      "Do you have a defined change management process for updates and system changes?"
    ]
  },
  {
    name: "H. Vendor Security Posture",
    questions: [
      "Do you regularly conduct internal or external penetration testing or vulnerability assessments?",
      "Do you have controls in place to assess your own third-party suppliers?",
      "Are systems and applications patched regularly and in a timely manner?"
    ]
  },
  {
    name: "I. Information Security Incident Management",
    questions: [
      "Do you have a security incident response team and procedures in place?",
      "Have you encountered or reported cyber attacks or security incidents in the past two years?",
      "Do you have a dedicated Security Operations Center or team?",
      "Do you have an Incident Response Plan?",
      "Do you have an Incident Response Plan for ransomware scenarios?",
      "Do you have an Incident Response Plan for phishing and data breach scenarios?"
    ]
  },
  {
    name: "J. Disposal",
    questions: [
      "Do you securely dispose electronic copies of client data?",
      "Describe your process for securely disposing electronic copies of client data.",
      "Do you securely dispose physical copies of client data?",
      "Describe your process for securely disposing physical copies of client data."
    ]
  },
  {
    name: "K. Others",
    questions: [
      "Have you ever been blacklisted as a partner or supplier by another company, client, or customer?",
      "Do you provide services to other organizations that are direct competitors of the company?",
      "If yes, do you have processes and procedures that ensure confidentiality of information?"
    ]
  }
];

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

async function runStartupTasks() {
  const connection = db.promise();

  await connection.query(`
    CREATE TABLE IF NOT EXISTS users (
      user_id INT AUTO_INCREMENT PRIMARY KEY,
      full_name VARCHAR(150) NOT NULL,
      email VARCHAR(150) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role ENUM('vendor', 'company_employee') NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS vendors (
      vendor_id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NULL,
      company_name VARCHAR(150) NOT NULL,
      company_website VARCHAR(255),
      product_services_offered TEXT,
      contact_person_name VARCHAR(150),
      contact_email VARCHAR(150),
      contact_phone VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS assessments (
      assessment_id INT AUTO_INCREMENT PRIMARY KEY,
      vendor_id INT NOT NULL,
      assessment_date DATE NOT NULL,
      purpose VARCHAR(100) NOT NULL,
      status ENUM('Draft', 'Submitted', 'Reviewed', 'Rejected', 'Approved', 'Reported to Audit') DEFAULT 'Draft',
      reviewed_date DATE NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS question_sections (
      section_id INT AUTO_INCREMENT PRIMARY KEY,
      tab_name VARCHAR(100) NOT NULL,
      section_name VARCHAR(150) NOT NULL
    )
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS questions (
      question_id INT AUTO_INCREMENT PRIMARY KEY,
      section_id INT NOT NULL,
      question_text TEXT NOT NULL,
      response_type ENUM('text', 'yes_no_na') DEFAULT 'text',
      is_required BOOLEAN DEFAULT TRUE
    )
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS answers (
      answer_id INT AUTO_INCREMENT PRIMARY KEY,
      assessment_id INT NOT NULL,
      question_id INT NOT NULL,
      vendor_response TEXT,
      company_comment TEXT,
      answered_at TIMESTAMP NULL,
      reviewed_at TIMESTAMP NULL,
      UNIQUE KEY unique_answer (assessment_id, question_id)
    )
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS sign_offs (
      signoff_id INT AUTO_INCREMENT PRIMARY KEY,
      assessment_id INT NOT NULL,
      role_name VARCHAR(100) NOT NULL,
      signer_name VARCHAR(150),
      signoff_status ENUM('Pending', 'Signed') DEFAULT 'Pending',
      signed_at TIMESTAMP NULL,
      UNIQUE KEY unique_signoff (assessment_id, role_name)
    )
  `);

  await addColumnIfMissing("vendors", "user_id", "INT NULL");
  await addColumnIfMissing("vendors", "created_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
  await addColumnIfMissing("vendors", "updated_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
  await addColumnIfMissing("assessments", "reviewed_date", "DATE NULL");
  await addColumnIfMissing("assessments", "created_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
  await addColumnIfMissing("assessments", "updated_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
  await addColumnIfMissing("sign_offs", "signature_file_name", "VARCHAR(255) NULL");

  await modifyEnumIfPossible(
    "assessments",
    "status",
    "ENUM('Draft', 'Submitted', 'Reviewed', 'Rejected', 'Approved', 'Reported to Audit') DEFAULT 'Draft'"
  );

  await seedQuestionsIfNeeded();
}

async function addColumnIfMissing(table, column, definition) {
  const connection = db.promise();

  try {
    await connection.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  } catch (error) {
    if (error.code !== "ER_DUP_FIELDNAME") {
      console.warn(`Column check warning for ${table}.${column}:`, error.message);
    }
  }
}

async function modifyEnumIfPossible(table, column, definition) {
  const connection = db.promise();

  try {
    await connection.query(`ALTER TABLE ${table} MODIFY COLUMN ${column} ${definition}`);
  } catch (error) {
    console.warn(`Enum update warning for ${table}.${column}:`, error.message);
  }
}

async function seedQuestionsIfNeeded() {
  const connection = db.promise();
  const [countRows] = await connection.query("SELECT COUNT(*) AS total FROM question_sections");

  if (countRows[0].total > 0) return;

  const allSections = [
    ...ddfSections.map((section) => ({
      tabName: "Due Diligence Form",
      sectionName: section.name,
      responseType: "text",
      questions: section.questions
    })),
    ...informationSecuritySections.map((section) => ({
      tabName: "Information Security",
      sectionName: section.name,
      responseType: "yes_no_na",
      questions: section.questions
    }))
  ];

  for (const section of allSections) {
    const [sectionResult] = await connection.query(
      `
        INSERT INTO question_sections
        (tab_name, section_name)
        VALUES (?, ?)
      `,
      [section.tabName, section.sectionName]
    );

    const values = section.questions.map((question) => [
      sectionResult.insertId,
      question,
      section.responseType,
      1
    ]);

    await connection.query(
      `
        INSERT INTO questions
        (section_id, question_text, response_type, is_required)
        VALUES ?
      `,
      [values]
    );
  }

  console.log("Default questionnaire sections and questions seeded.");
}

/* =========================
   AUTH ROUTES
========================= */

app.post("/register", async (req, res) => {
  const { full_name, email, password, role } = req.body;

  if (!full_name || !email || !password || !role) {
    return res.status(400).json({ message: "Please fill in all fields." });
  }

  if (!["vendor", "company_employee"].includes(role)) {
    return res.status(400).json({ message: "Invalid role selected." });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);

    const sql = `
      INSERT INTO users
      (full_name, email, password_hash, role)
      VALUES (?, ?, ?, ?)
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

/* =========================
   VENDOR ROUTES
========================= */

app.post("/vendors", requireRole("vendor"), (req, res) => {
  const {
    company_name,
    company_website,
    product_services_offered,
    contact_person_name,
    contact_email,
    contact_phone
  } = req.body;

  if (!company_name) {
    return res.status(400).json({ message: "Company name is required." });
  }

  const userId = req.session.user.user_id;

  const findSql = `
    SELECT vendor_id
    FROM vendors
    WHERE user_id = ?
    ORDER BY vendor_id DESC
    LIMIT 1
  `;

  db.query(findSql, [userId], (findErr, rows) => {
    if (findErr) {
      console.error("Find vendor error:", findErr);
      return res.status(500).json({ message: "Failed to check vendor." });
    }

    if (rows.length > 0) {
      const updateSql = `
        UPDATE vendors
        SET
          company_name = ?,
          company_website = ?,
          product_services_offered = ?,
          contact_person_name = ?,
          contact_email = ?,
          contact_phone = ?
        WHERE vendor_id = ?
      `;

      db.query(
        updateSql,
        [
          company_name,
          company_website,
          product_services_offered,
          contact_person_name,
          contact_email,
          contact_phone,
          rows[0].vendor_id
        ],
        (updateErr) => {
          if (updateErr) {
            console.error("Update vendor error:", updateErr);
            return res.status(500).json({ message: "Failed to update vendor." });
          }

          res.json({
            message: "Vendor updated successfully.",
            vendor_id: rows[0].vendor_id
          });
        }
      );

      return;
    }

    const insertSql = `
      INSERT INTO vendors
      (
        user_id,
        company_name,
        company_website,
        product_services_offered,
        contact_person_name,
        contact_email,
        contact_phone
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
      insertSql,
      [
        userId,
        company_name,
        company_website,
        product_services_offered,
        contact_person_name,
        contact_email,
        contact_phone
      ],
      (insertErr, result) => {
        if (insertErr) {
          console.error("Insert vendor error:", insertErr);
          return res.status(500).json({ message: "Failed to save vendor." });
        }

        res.json({
          message: "Vendor saved successfully.",
          vendor_id: result.insertId
        });
      }
    );
  });
});

app.get("/vendors", requireLogin, (req, res) => {
  const isEmployee = req.session.user.role === "company_employee";

  const sql = isEmployee
    ? `
        SELECT *
        FROM vendors
        ORDER BY updated_at DESC, created_at DESC
      `
    : `
        SELECT *
        FROM vendors
        WHERE user_id = ?
        ORDER BY updated_at DESC, created_at DESC
      `;

  const params = isEmployee ? [] : [req.session.user.user_id];

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error("Fetch vendors error:", err);
      return res.status(500).json({ message: "Failed to fetch vendors." });
    }

    res.json(results);
  });
});

/* =========================
   ASSESSMENT ROUTES
========================= */

app.post("/assessments", requireRole("vendor"), (req, res) => {
  const { vendor_id, assessment_date, purpose } = req.body;

  if (!vendor_id || !assessment_date || !purpose) {
    return res.status(400).json({ message: "Please complete the assessment form." });
  }

  const checkSql = `
    SELECT vendor_id
    FROM vendors
    WHERE vendor_id = ?
    AND user_id = ?
  `;

  db.query(checkSql, [vendor_id, req.session.user.user_id], (checkErr, rows) => {
    if (checkErr) {
      console.error("Check vendor error:", checkErr);
      return res.status(500).json({ message: "Failed to check vendor." });
    }

    if (rows.length === 0) {
      return res.status(403).json({ message: "You can only create assessments for your own vendor profile." });
    }

    const sql = `
      INSERT INTO assessments
      (vendor_id, assessment_date, purpose, status)
      VALUES (?, ?, ?, 'Draft')
    `;

    db.query(sql, [vendor_id, assessment_date, purpose], (err, result) => {
      if (err) {
        console.error("Create assessment error:", err);
        return res.status(500).json({ message: "Failed to create assessment." });
      }

      res.json({
        message: "Assessment created successfully.",
        assessment_id: result.insertId
      });
    });
  });
});

app.get("/assessments", requireLogin, (req, res) => {
  const isEmployee = req.session.user.role === "company_employee";

  const sql = `
    SELECT
      a.assessment_id,
      a.vendor_id,
      a.assessment_date,
      a.purpose,
      a.status,
      a.reviewed_date,
      a.created_at,
      a.updated_at,
      v.user_id,
      v.company_name,
      v.product_services_offered
    FROM assessments a
    JOIN vendors v ON a.vendor_id = v.vendor_id
    ${isEmployee ? "" : "WHERE v.user_id = ?"}
    ORDER BY a.created_at DESC
  `;

  const params = isEmployee ? [] : [req.session.user.user_id];

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error("Fetch assessments error:", err);
      return res.status(500).json({ message: "Failed to fetch assessments." });
    }

    res.json(results);
  });
});

app.get("/assessments/:assessment_id/answers", requireLogin, (req, res) => {
  const { assessment_id } = req.params;

  const accessSql = `
    SELECT
      a.assessment_id,
      a.status,
      v.user_id
    FROM assessments a
    JOIN vendors v ON a.vendor_id = v.vendor_id
    WHERE a.assessment_id = ?
  `;

  db.query(accessSql, [assessment_id], (accessErr, accessRows) => {
    if (accessErr) {
      console.error("Fetch assessment access error:", accessErr);
      return res.status(500).json({
        message: "Failed to fetch assessment answers."
      });
    }

    if (accessRows.length === 0) {
      return res.status(404).json({ message: "Assessment not found." });
    }

    const isEmployee = req.session.user.role === "company_employee";
    const isOwner = Number(accessRows[0].user_id) === Number(req.session.user.user_id);

    if (!isEmployee && !isOwner) {
      return res.status(403).json({ message: "You are not allowed to view this assessment." });
    }

    const sql = `
      SELECT
        ans.question_id,
        ans.vendor_response,
        ans.company_comment
      FROM answers ans
      WHERE ans.assessment_id = ?
    `;

    db.query(sql, [assessment_id], (err, rows) => {
      if (err) {
        console.error("Fetch assessment answers error:", err);
        return res.status(500).json({
          message: "Failed to fetch assessment answers."
        });
      }

      res.json({
        assessment_id: accessRows[0].assessment_id,
        status: accessRows[0].status,
        answers: rows.map((row) => ({
          question_id: row.question_id,
          vendor_response: row.vendor_response,
          company_comment: row.company_comment
        }))
      });
    });
  });
});

app.patch("/assessments/:assessment_id/submit", requireRole("vendor"), (req, res) => {
  const { assessment_id } = req.params;

  const sql = `
    UPDATE assessments a
    JOIN vendors v ON a.vendor_id = v.vendor_id
    SET a.status = 'Submitted'
    WHERE a.assessment_id = ?
    AND a.status = 'Draft'
    AND v.user_id = ?
  `;

  db.query(sql, [assessment_id, req.session.user.user_id], (err, result) => {
    if (err) {
      console.error("Submit assessment error:", err);
      return res.status(500).json({
        message: "Failed to submit vendor answers."
      });
    }

    if (result.affectedRows === 0) {
      return res.status(400).json({
        message: "Only your draft assessments can be submitted."
      });
    }

    res.json({
      message: "Vendor answers submitted. Company review is now enabled."
    });
  });
});

app.patch("/assessments/:assessment_id/status", requireRole("company_employee"), (req, res) => {
  const { assessment_id } = req.params;
  const { status, reviewed_date } = req.body;

  const allowedStatuses = ["Reviewed", "Rejected", "Approved", "Reported to Audit"];

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid assessment status." });
  }

  const sql = `
    UPDATE assessments
    SET status = ?,
        reviewed_date = COALESCE(?, reviewed_date, CURRENT_DATE)
    WHERE assessment_id = ?
  `;

  db.query(sql, [status, reviewed_date || null, assessment_id], (err, result) => {
    if (err) {
      console.error("Update assessment status error:", err);
      return res.status(500).json({
        message: "Failed to update assessment status."
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Assessment not found."
      });
    }

    res.json({
      message: `Assessment marked as ${status}.`
    });
  });
});

app.patch("/assessments/:assessment_id/approved", requireRole("company_employee"), (req, res) => {
  req.body.status = "Approved";
  app._router.handle(req, res, () => {});
});

/* =========================
   QUESTIONS ROUTE
========================= */

app.get("/sections-with-questions", requireLogin, (req, res) => {
  const sql = `
    SELECT
      qs.section_id,
      qs.tab_name,
      qs.section_name,
      q.question_id,
      q.question_text,
      q.response_type,
      q.is_required
    FROM question_sections qs
    LEFT JOIN questions q ON qs.section_id = q.section_id
    ORDER BY qs.section_id, q.question_id
  `;

  db.query(sql, (err, rows) => {
    if (err) {
      console.error("Fetch questions error:", err);
      return res.status(500).json({ message: "Failed to fetch questions." });
    }

    const sections = {};

    rows.forEach((row) => {
      if (!sections[row.section_id]) {
        sections[row.section_id] = {
          section_id: row.section_id,
          tab_name: row.tab_name,
          section_name: row.section_name,
          questions: []
        };
      }

      if (row.question_id) {
        sections[row.section_id].questions.push({
          question_id: row.question_id,
          question_text: row.question_text,
          response_type: row.response_type,
          is_required: row.is_required
        });
      }
    });

    res.json(Object.values(sections));
  });
});

/* =========================
   ANSWER ROUTES
========================= */

app.post("/answers/vendor-save", requireRole("vendor"), (req, res) => {
  const { assessment_id, answers } = req.body;

  if (!assessment_id || !Array.isArray(answers)) {
    return res.status(400).json({ message: "Invalid vendor answer data." });
  }

  if (answers.length === 0) {
    return res.status(400).json({ message: "No vendor answers to save." });
  }

  const checkSql = `
    SELECT a.status
    FROM assessments a
    JOIN vendors v ON a.vendor_id = v.vendor_id
    WHERE a.assessment_id = ?
    AND v.user_id = ?
  `;

  db.query(checkSql, [assessment_id, req.session.user.user_id], (err, results) => {
    if (err) {
      console.error("Check assessment error:", err);
      return res.status(500).json({ message: "Failed to check assessment." });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "Assessment not found." });
    }

    if (results[0].status !== "Draft") {
      return res.status(403).json({
        message: "Vendor answers were already submitted and can no longer be edited."
      });
    }

    const values = answers.map((answer) => [
      assessment_id,
      answer.question_id,
      answer.vendor_response || null
    ]);

    const sql = `
      INSERT INTO answers
      (
        assessment_id,
        question_id,
        vendor_response,
        answered_at
      )
      VALUES ?
      ON DUPLICATE KEY UPDATE
        vendor_response = VALUES(vendor_response),
        answered_at = CURRENT_TIMESTAMP
    `;

    db.query(sql, [values], (saveErr) => {
      if (saveErr) {
        console.error("Save vendor answers error:", saveErr);
        return res.status(500).json({
          message: "Failed to save vendor answers."
        });
      }

      res.json({ message: "Vendor answers saved as draft." });
    });
  });
});

app.post("/answers/company-review", requireRole("company_employee"), (req, res) => {
  const { assessment_id, answers } = req.body;

  if (!assessment_id || !Array.isArray(answers)) {
    return res.status(400).json({ message: "Invalid company review data." });
  }

  if (answers.length === 0) {
    return res.status(400).json({ message: "No company review to save." });
  }

  const checkStatusSql = `
    SELECT status
    FROM assessments
    WHERE assessment_id = ?
  `;

  db.query(checkStatusSql, [assessment_id], (err, results) => {
    if (err) {
      console.error("Check assessment status error:", err);
      return res.status(500).json({
        message: "Failed to check assessment status."
      });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "Assessment not found." });
    }

    if (results[0].status === "Draft") {
      return res.status(403).json({
        message: "Company review is locked. Vendor must submit answers first."
      });
    }

    const values = answers.map((answer) => [
      assessment_id,
      answer.question_id,
      answer.company_comment || null
    ]);

    const saveReviewSql = `
      INSERT INTO answers
      (
        assessment_id,
        question_id,
        company_comment,
        reviewed_at
      )
      VALUES ?
      ON DUPLICATE KEY UPDATE
        company_comment = VALUES(company_comment),
        reviewed_at = CURRENT_TIMESTAMP
    `;

    db.query(saveReviewSql, [values], (saveErr) => {
      if (saveErr) {
        console.error("Save company review error:", saveErr);
        return res.status(500).json({
          message: "Failed to save company review."
        });
      }

      res.json({ message: "Company review saved successfully." });
    });
  });
});

/* =========================
   SIGN-OFF ROUTES
========================= */

app.get("/signoffs/:assessment_id", requireLogin, (req, res) => {
  const { assessment_id } = req.params;

  const sql = `
    SELECT *
    FROM sign_offs
    WHERE assessment_id = ?
    ORDER BY FIELD(
      role_name,
      'IT',
      'Info Sec',
      'Risk Management Officer',
      'Compliance',
      'DPO',
      'HR'
    )
  `;

  db.query(sql, [assessment_id], (err, results) => {
    if (err) {
      console.error("Fetch signoffs error:", err);
      return res.status(500).json({
        message: "Failed to fetch sign-offs."
      });
    }

    res.json(results);
  });
});

app.post("/signoffs", requireRole("company_employee"), (req, res) => {
  const { assessment_id, signoffs } = req.body;

  if (!assessment_id || !Array.isArray(signoffs)) {
    return res.status(400).json({ message: "Invalid sign-off data." });
  }

  if (signoffs.length === 0) {
    return res.status(400).json({ message: "No sign-off data to save." });
  }

  const values = signoffs.map((item) => [
    assessment_id,
    item.role_name,
    item.signer_name || null,
    item.signoff_status || "Pending",
    item.signature_file_name || null,
    item.signoff_status === "Signed" ? new Date() : null
  ]);

  const sql = `
    INSERT INTO sign_offs
    (
      assessment_id,
      role_name,
      signer_name,
      signoff_status,
      signature_file_name,
      signed_at
    )
    VALUES ?
    ON DUPLICATE KEY UPDATE
      signer_name = VALUES(signer_name),
      signoff_status = VALUES(signoff_status),
      signature_file_name = VALUES(signature_file_name),
      signed_at = VALUES(signed_at)
  `;

  db.query(sql, [values], (err) => {
    if (err) {
      console.error("Save signoffs error:", err);
      return res.status(500).json({
        message: "Failed to save sign-offs."
      });
    }

    res.json({ message: "Sign-off sheet saved successfully." });
  });
});

/* =========================
   EXPORT ROUTE
========================= */

app.get("/export/:assessment_id", requireRole("company_employee"), async (req, res) => {
  const { assessment_id } = req.params;

  const assessmentSql = `
    SELECT
      a.assessment_id,
      a.assessment_date,
      a.purpose,
      a.status,
      a.reviewed_date,
      v.company_name,
      v.company_website,
      v.product_services_offered,
      v.contact_person_name,
      v.contact_email,
      v.contact_phone
    FROM assessments a
    JOIN vendors v ON a.vendor_id = v.vendor_id
    WHERE a.assessment_id = ?
  `;

  const answersSql = `
    SELECT
      qs.tab_name,
      qs.section_name,
      q.question_text,
      q.response_type,
      q.is_required,
      ans.vendor_response,
      ans.company_comment
    FROM question_sections qs
    JOIN questions q ON qs.section_id = q.section_id
    LEFT JOIN answers ans
      ON q.question_id = ans.question_id
      AND ans.assessment_id = ?
    WHERE qs.tab_name IN ('Due Diligence Form', 'Information Security')
    ORDER BY qs.section_id, q.question_id
  `;

  const signoffSql = `
    SELECT
      role_name,
      signer_name,
      signoff_status,
      signed_at
    FROM sign_offs
    WHERE assessment_id = ?
    ORDER BY FIELD(
      role_name,
      'IT',
      'Info Sec',
      'Risk Management Officer',
      'Compliance',
      'DPO',
      'HR'
    )
  `;

  db.query(assessmentSql, [assessment_id], (assessmentErr, assessmentRows) => {
    if (assessmentErr) {
      console.error("Export assessment error:", assessmentErr);
      return res.status(500).json({
        message: "Failed to export assessment."
      });
    }

    if (assessmentRows.length === 0) {
      return res.status(404).json({ message: "Assessment not found." });
    }

    const assessment = assessmentRows[0];

    if (!["Reviewed", "Approved", "Reported to Audit"].includes(assessment.status)) {
      return res.status(403).json({
        message: "Export is locked until the company review is completed."
      });
    }

    db.query(answersSql, [assessment_id], (answersErr, answerRows) => {
      if (answersErr) {
        console.error("Export answers error:", answersErr);
        return res.status(500).json({
          message: "Failed to export answers."
        });
      }

      db.query(signoffSql, [assessment_id], async (signoffErr, signoffRows) => {
        if (signoffErr) {
          console.error("Export signoffs error:", signoffErr);
          return res.status(500).json({
            message: "Failed to export sign-offs."
          });
        }

        const workbook = new ExcelJS.Workbook();
        workbook.creator = "Vendor Due Diligence System";

        createAnswerSheet(workbook, "Due Diligence Form", assessment, answerRows);
        createInformationSecuritySheet(workbook, assessment, answerRows);
        createSignoffSheet(workbook, assessment, signoffRows);

        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );

        res.setHeader(
          "Content-Disposition",
          `attachment; filename=assessment_${assessment_id}_export.xlsx`
        );

        await workbook.xlsx.write(res);
        res.end();
      });
    });
  });
});

function createAnswerSheet(workbook, tabName, assessment, rows) {
  const sheet = workbook.addWorksheet(tabName);

  sheet.pageSetup = {
    paperSize: 9,
    orientation: "portrait",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0
  };

  sheet.properties.defaultRowHeight = 22;

  sheet.columns = [
    { key: "question_text", width: 85 },
    { key: "vendor_response", width: 38 },
    { key: "company_comment", width: 38 }
  ];

  sheet.mergeCells("A1:C1");
  sheet.getCell("A1").value = tabName.toUpperCase();
  sheet.getCell("A1").font = {
    bold: true,
    size: 16,
    color: { argb: "FFFFFFFF" }
  };
  sheet.getCell("A1").fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1F7A4D" }
  };
  sheet.getCell("A1").alignment = {
    horizontal: "center",
    vertical: "middle"
  };
  sheet.getCell("A1").border = blackBorder();

  const details = [
    ["Company Name", assessment.company_name || "N/A"],
    ["Company Website", assessment.company_website || "N/A"],
    ["Product / Services", assessment.product_services_offered || "N/A"],
    ["Contact Person", assessment.contact_person_name || "N/A"],
    ["Contact Email", assessment.contact_email || "N/A"],
    ["Contact Phone", assessment.contact_phone || "N/A"],
    ["Assessment ID", assessment.assessment_id],
    ["Assessment Date", formatExcelDate(assessment.assessment_date)],
    ["Purpose", assessment.purpose || "N/A"],
    ["Status", assessment.status || "N/A"]
  ];

  let detailStartRow = 3;

  details.forEach((item, index) => {
    const rowNumber = detailStartRow + index;

    sheet.getCell(`A${rowNumber}`).value = item[0];
    sheet.getCell(`B${rowNumber}`).value = item[1] !== null && item[1] !== undefined
      ? String(item[1])
      : "N/A";

    sheet.getCell(`A${rowNumber}`).font = { bold: true };
    sheet.getCell(`A${rowNumber}`).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFEAF4EE" }
    };

    sheet.getCell(`A${rowNumber}`).border = thinBorder();
    sheet.getCell(`B${rowNumber}`).border = thinBorder();

    sheet.getCell(`A${rowNumber}`).alignment = {
      horizontal: "left",
      vertical: "top",
      wrapText: true
    };

    sheet.getCell(`B${rowNumber}`).alignment = {
      horizontal: "left",
      vertical: "top",
      wrapText: true
    };
  });

  const tableHeaderRow = detailStartRow + details.length + 2;

  sheet.getCell(`A${tableHeaderRow}`).value = "QUESTION";
  sheet.getCell(`B${tableHeaderRow}`).value = "VENDOR RESPONSE";
  sheet.getCell(`C${tableHeaderRow}`).value = "<Company> COMMENT/S";

  sheet.getCell(`A${tableHeaderRow}`).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFEAF4EE" }
  };

  sheet.getCell(`B${tableHeaderRow}`).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFC65911" }
  };

  sheet.getCell(`C${tableHeaderRow}`).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E75B6" }
  };

  [`A${tableHeaderRow}`, `B${tableHeaderRow}`, `C${tableHeaderRow}`].forEach((cellRef) => {
    const cell = sheet.getCell(cellRef);

    cell.font = {
      bold: true,
      color: { argb: cellRef === `A${tableHeaderRow}` ? "FF000000" : "FFFFFFFF" }
    };

    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true
    };

    cell.border = blackBorder();
  });

  const filteredRows = rows.filter((row) => row.tab_name === tabName);

  let currentRow = tableHeaderRow + 1;
  let lastSection = "";

  filteredRows.forEach((row) => {
    if (row.section_name !== lastSection) {
      const sectionRow = sheet.getRow(currentRow);

      sectionRow.getCell(1).value = row.section_name.toUpperCase();
      sectionRow.getCell(2).value = "";
      sectionRow.getCell(3).value = "";

      sectionRow.eachCell({ includeEmpty: true }, (cell) => {
        cell.font = {
          bold: true,
          color: { argb: "FF000000" }
        };

        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFFFFFF" }
        };

        cell.alignment = {
          vertical: "middle",
          wrapText: true
        };

        cell.border = blackBorder();
      });

      currentRow++;
      lastSection = row.section_name;
    }

    const answerRow = sheet.getRow(currentRow);

    answerRow.getCell(1).value = row.question_text || "";
    answerRow.getCell(2).value = row.vendor_response || "";
    answerRow.getCell(3).value = row.company_comment || "";

    answerRow.height = 40;

    answerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.border = blackBorder();

      cell.alignment = {
        vertical: "top",
        wrapText: true
      };

      if (colNumber === 1) {
        cell.font = {
          italic: true,
          color: { argb: "FF000000" }
        };
      }
    });

    currentRow++;
  });

  sheet.views = [];
}

function createInformationSecuritySheet(workbook, assessment, rows) {
  const sheet = workbook.addWorksheet("Information Security");

  sheet.pageSetup = {
    paperSize: 9,
    orientation: "portrait",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0
  };

  sheet.properties.defaultRowHeight = 22;

  sheet.columns = [
    { key: "question_text", width: 75 },
    { key: "vendor_response", width: 35 },
    { key: "company_comment", width: 30 },
    { key: "artifacts", width: 22 }
  ];

  sheet.mergeCells("A1:D1");
  sheet.getCell("A1").value = `Product/ Services Offered to <Company>: ${assessment.product_services_offered || ""}`;
  sheet.getCell("A1").font = {
    bold: true,
    size: 11,
    color: { argb: "FF000000" }
  };
  sheet.getCell("A1").alignment = {
    vertical: "middle",
    wrapText: true
  };
  sheet.getCell("A1").border = blackBorder();

  const headerRow = 2;

  sheet.getCell(`A${headerRow}`).value = "IT SUPPLIER DUE DILIGENCE QUESTIONNAIRES";
  sheet.getCell(`B${headerRow}`).value = "RESPONSE/CURRENTLY\nAVAILABLE IN YOUR COMPANY?\n(YES | NO | N/A)";
  sheet.getCell(`C${headerRow}`).value = "VENDOR/SUPPLIER\nCOMMENTS";
  sheet.getCell(`D${headerRow}`).value = "ARTIFACTS";

  [`A${headerRow}`, `B${headerRow}`, `C${headerRow}`, `D${headerRow}`].forEach((cellRef) => {
    const cell = sheet.getCell(cellRef);

    cell.font = {
      bold: true,
      color: { argb: "FFFFFFFF" },
      size: 11
    };

    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1F4E79" }
    };

    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true
    };

    cell.border = blackBorder();
  });

  sheet.getRow(headerRow).height = 45;

  const filteredRows = rows.filter((row) => row.tab_name === "Information Security");

  let currentRow = 3;
  let lastSection = "";
  let sectionQuestionNumber = 1;

  filteredRows.forEach((row) => {
    if (row.section_name !== lastSection) {
      sheet.mergeCells(`A${currentRow}:D${currentRow}`);

      const sectionCell = sheet.getCell(`A${currentRow}`);
      sectionCell.value = row.section_name;
      sectionCell.font = {
        bold: true,
        color: { argb: "FFFFFFFF" },
        size: 11
      };

      sectionCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1F4E79" }
      };

      sectionCell.alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true
      };

      sectionCell.border = blackBorder();

      currentRow++;
      lastSection = row.section_name;
      sectionQuestionNumber = 1;
    }

    const excelRow = sheet.getRow(currentRow);

    excelRow.getCell(1).value = `${sectionQuestionNumber}. ${row.question_text || ""}`;
    excelRow.getCell(2).value = row.vendor_response || "";
    excelRow.getCell(3).value = row.company_comment || "";
    excelRow.getCell(4).value = "";

    excelRow.height = 60;

    excelRow.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = blackBorder();
      cell.alignment = {
        vertical: "top",
        wrapText: true
      };
    });

    currentRow++;
    sectionQuestionNumber++;
  });

  sheet.views = [];
}

function createSignoffSheet(workbook, assessment, signoffs) {
  const sheet = workbook.addWorksheet("Sign-off Sheet");

  sheet.pageSetup = {
    paperSize: 9,
    orientation: "portrait",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 1
  };

  sheet.properties.defaultRowHeight = 20;

  sheet.columns = [
    { width: 4 },
    { width: 10 },
    { width: 10 },
    { width: 10 },
    { width: 10 },
    { width: 10 },
    { width: 10 },
    { width: 10 },
    { width: 10 },
    { width: 10 },
    { width: 10 },
    { width: 10 },
    { width: 10 },
    { width: 10 },
    { width: 4 }
  ];

  applyOuterBorderToRange(sheet, "B1:N34", thickBorder());

  sheet.mergeCells("C2:E4");
  applyBorderToRange(sheet, "C2:E4", thinBlackBorder());

  const logoPath = path.join(__dirname, "public", "images", "company-logo.png");

  if (fs.existsSync(logoPath)) {
    const logoImageId = workbook.addImage({
      filename: logoPath,
      extension: "png"
    });

    sheet.addImage(logoImageId, {
      tl: { col: 2.15, row: 1.25 },
      ext: { width: 185, height: 55 }
    });
  } else {
    sheet.getCell("C2").value = "Company Logo";
    sheet.getCell("C2").fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF5B9BD5" }
    };
    sheet.getCell("C2").font = {
      bold: true,
      color: { argb: "FFFFFFFF" }
    };
    sheet.getCell("C2").alignment = {
      horizontal: "center",
      vertical: "middle"
    };
  }

  sheet.mergeCells("F2:L3");
  sheet.getCell("F2").value = "VENDOR/IT SUPPLIER DUE DILIGENCE FORM\nSIGN-OFF SHEET";
  sheet.getCell("F2").font = {
    bold: true,
    size: 18,
    color: { argb: "FF000000" }
  };
  sheet.getCell("F2").alignment = {
    horizontal: "left",
    vertical: "middle",
    wrapText: true
  };

  const signoffMap = {};
  signoffs.forEach((item) => {
    signoffMap[item.role_name] = item;
  });

  createSignatureBox(sheet, {
    labelRange: "C6:C10",
    boxRange: "D6:F10",
    label: "IT",
    signer: getSigner(signoffMap, "IT")
  });

  createSignatureBox(sheet, {
    labelRange: "C12:C16",
    boxRange: "D12:F16",
    label: "INFOSEC",
    signer: getSigner(signoffMap, "Info Sec")
  });

  createSignatureBox(sheet, {
    labelRange: "C19:C23",
    boxRange: "D19:F23",
    label: "RISK\nMANAGEMENT\nOFFICER",
    signer: getSigner(signoffMap, "Risk Management Officer")
  });

  createSignatureBox(sheet, {
    labelRange: "H6:H10",
    boxRange: "I6:K10",
    label: "COMPLIANCE",
    signer: getSigner(signoffMap, "Compliance")
  });

  createSignatureBox(sheet, {
    labelRange: "H12:H16",
    boxRange: "I12:K16",
    label: "DPO",
    signer: getSigner(signoffMap, "DPO")
  });

  createSignatureBox(sheet, {
    labelRange: "H19:H23",
    boxRange: "I19:K23",
    label: "HR",
    signer: getSigner(signoffMap, "HR")
  });

  sheet.mergeCells("C25:L26");
  sheet.getCell("C25").value =
    "DISCLAIMER: All identified risks, findings and recommended controls are based on the disclosure of Vendor/IT supplier with the supervision of the requesting unit based on the initial questionnaire submitted.";
  sheet.getCell("C25").alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true
  };
  sheet.getCell("C25").font = {
    size: 8
  };

  sheet.mergeCells("C28:L28");
  sheet.getCell("C28").value =
    "All identified Vendor/IT supplier risks, any open items are reflected in the Business unit's RCSAs and SLA Documentation.";
  sheet.getCell("C28").alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true
  };
  sheet.getCell("C28").font = {
    size: 8
  };

  sheet.mergeCells("C30:L31");
  sheet.getCell("C30").value =
    "This signed document is a requirement for accreditation and onboarding of Vendor/IT supplier whose service engagement connects to the Company's network infrastructure/core systems and/or with exchange of data.";
  sheet.getCell("C30").alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true
  };
  sheet.getCell("C30").font = {
    size: 8
  };

  sheet.mergeCells("D33:K33");
  sheet.getCell("D33").value =
    "Signature above printed name of Business Unit Representative";
  sheet.getCell("D33").fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFD9D9D9" }
  };
  sheet.getCell("D33").font = {
    underline: true,
    size: 9
  };
  sheet.getCell("D33").alignment = {
    horizontal: "center",
    vertical: "middle"
  };

  for (let i = 1; i <= 34; i++) {
    sheet.getRow(i).height = 20;
  }

  sheet.getRow(2).height = 28;
  sheet.getRow(3).height = 28;
  sheet.getRow(25).height = 25;
  sheet.getRow(30).height = 28;

  sheet.views = [];
}

function createSignatureBox(sheet, config) {
  const { labelRange, boxRange, label, signer } = config;

  sheet.mergeCells(labelRange);
  sheet.mergeCells(boxRange);

  const labelCell = sheet.getCell(labelRange.split(":")[0]);
  const boxCell = sheet.getCell(boxRange.split(":")[0]);

  labelCell.value = label;
  labelCell.font = {
    bold: true,
    size: 9
  };
  labelCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFDDEBF7" }
  };
  labelCell.alignment = {
    horizontal: "center",
    vertical: "middle",
    textRotation: 90,
    wrapText: true
  };

  boxCell.value = signer || "";
  boxCell.alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true
  };
  boxCell.font = {
    bold: true,
    size: 10
  };

  applyBorderToRange(sheet, labelRange, thickBorder());
  applyBorderToRange(sheet, boxRange, thickBorder());
}

function getSigner(signoffMap, roleName) {
  const item = signoffMap[roleName];

  if (!item) return "";

  if (item.signoff_status === "Signed") {
    return item.signer_name || "";
  }

  if (item.signer_name) {
    return `${item.signer_name}\n(${item.signoff_status || "Pending"})`;
  }

  return item.signoff_status || "";
}

function applyBorderToRange(sheet, range, borderStyle) {
  const [start, end] = range.split(":");
  const startCell = sheet.getCell(start);
  const endCell = sheet.getCell(end);

  const startRow = startCell.row;
  const endRow = endCell.row;
  const startCol = startCell.col;
  const endCol = endCell.col;

  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      sheet.getCell(row, col).border = borderStyle;
    }
  }
}

function applyOuterBorderToRange(sheet, range, borderStyle) {
  const [start, end] = range.split(":");
  const startCell = sheet.getCell(start);
  const endCell = sheet.getCell(end);

  const startRow = startCell.row;
  const endRow = endCell.row;
  const startCol = startCell.col;
  const endCol = endCell.col;

  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      const cell = sheet.getCell(row, col);

      cell.border = {
        top: row === startRow ? borderStyle.top : undefined,
        bottom: row === endRow ? borderStyle.bottom : undefined,
        left: col === startCol ? borderStyle.left : undefined,
        right: col === endCol ? borderStyle.right : undefined
      };
    }
  }
}

function formatExcelDate(dateValue) {
  if (!dateValue) return "N/A";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return String(dateValue);
  }

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();

  return `${month}/${day}/${year}`;
}

function thinBlackBorder() {
  return {
    top: { style: "thin", color: { argb: "FF000000" } },
    left: { style: "thin", color: { argb: "FF000000" } },
    bottom: { style: "thin", color: { argb: "FF000000" } },
    right: { style: "thin", color: { argb: "FF000000" } }
  };
}

function thinBorder() {
  return {
    top: { style: "thin", color: { argb: "FFB7B7B7" } },
    left: { style: "thin", color: { argb: "FFB7B7B7" } },
    bottom: { style: "thin", color: { argb: "FFB7B7B7" } },
    right: { style: "thin", color: { argb: "FFB7B7B7" } }
  };
}

function blackBorder() {
  return {
    top: { style: "medium", color: { argb: "FF000000" } },
    left: { style: "medium", color: { argb: "FF000000" } },
    bottom: { style: "medium", color: { argb: "FF000000" } },
    right: { style: "medium", color: { argb: "FF000000" } }
  };
}

function thickBorder() {
  return blackBorder();
}

/* =========================
   START SERVER
========================= */

const PORT = process.env.PORT || 3000;

runStartupTasks()
  .then(() => {
    console.log("Database tables checked and default questions ready.");

    db.query("SELECT 1", (err) => {
      if (err) {
        console.error("Database connection failed:", err);
        return;
      }

      console.log("Connected to Aiven MySQL database.");
    });

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Startup database setup failed:", error);
    process.exit(1);
  });
