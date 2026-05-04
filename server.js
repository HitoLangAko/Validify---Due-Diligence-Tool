const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const session = require("express-session");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

app.use(
  session({
    secret: "vendor_due_diligence_secret_key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 2
    }
  })
);

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "mypassword123",
  database: "vendor_due_diligence_db"
});

db.connect((err) => {
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
      return res.status(403).json({ message: "You are not allowed to do this action." });
    }

    next();
  };
}

// REGISTER
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

      res.json({ message: "Account registered successfully. You can now log in." });
    });
  } catch (error) {
    res.status(500).json({ message: "Server error during registration." });
  }
});

// LOGIN
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

// CURRENT USER
app.get("/me", (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: "Not logged in." });
  }

  res.json(req.session.user);
});

// LOGOUT
app.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ message: "Logged out successfully." });
  });
});

// SAVE VENDOR
app.post("/vendors", requireLogin, (req, res) => {
  const {
    company_name,
    company_website,
    product_services_offered,
    contact_person_name,
    contact_email,
    contact_phone
  } = req.body;

  const sql = `
    INSERT INTO vendors
    (
      company_name,
      company_website,
      product_services_offered,
      contact_person_name,
      contact_email,
      contact_phone
    )
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      company_name,
      company_website,
      product_services_offered,
      contact_person_name,
      contact_email,
      contact_phone
    ],
    (err, result) => {
      if (err) {
        console.error("Insert vendor error:", err);
        return res.status(500).json({ message: "Failed to save vendor." });
      }

      res.json({
        message: "Vendor saved successfully.",
        vendor_id: result.insertId
      });
    }
  );
});

// GET VENDORS
app.get("/vendors", requireLogin, (req, res) => {
  const sql = "SELECT * FROM vendors ORDER BY created_at DESC";

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Fetch vendors error:", err);
      return res.status(500).json({ message: "Failed to fetch vendors." });
    }

    res.json(results);
  });
});

// CREATE ASSESSMENT
app.post("/assessments", requireLogin, (req, res) => {
  const { vendor_id, assessment_date, purpose } = req.body;

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

// GET ASSESSMENTS
app.get("/assessments", requireLogin, (req, res) => {
  const sql = `
    SELECT
      a.assessment_id,
      a.assessment_date,
      a.purpose,
      a.status,
      a.created_at,
      v.company_name
    FROM assessments a
    JOIN vendors v ON a.vendor_id = v.vendor_id
    ORDER BY a.created_at DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Fetch assessments error:", err);
      return res.status(500).json({ message: "Failed to fetch assessments." });
    }

    res.json(results);
  });
});

// GET ONE ASSESSMENT WITH ANSWERS
app.get("/assessments/:assessment_id/answers", requireLogin, (req, res) => {
  const { assessment_id } = req.params;

  const sql = `
    SELECT
      a.assessment_id,
      a.status,
      ans.question_id,
      ans.vendor_response,
      ans.vendor_comment,
      ans.company_response,
      ans.company_comment
    FROM assessments a
    LEFT JOIN answers ans ON a.assessment_id = ans.assessment_id
    WHERE a.assessment_id = ?
  `;

  db.query(sql, [assessment_id], (err, rows) => {
    if (err) {
      console.error("Fetch assessment answers error:", err);
      return res.status(500).json({ message: "Failed to fetch assessment answers." });
    }

    if (rows.length === 0) {
      return res.status(404).json({ message: "Assessment not found." });
    }

    res.json({
      assessment_id: rows[0].assessment_id,
      status: rows[0].status,
      answers: rows
        .filter((row) => row.question_id !== null)
        .map((row) => ({
          question_id: row.question_id,
          vendor_response: row.vendor_response,
          vendor_comment: row.vendor_comment,
          company_response: row.company_response,
          company_comment: row.company_comment
        }))
    });
  });
});

// GET QUESTIONS
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

// VENDOR SAVE DRAFT ANSWERS
app.post("/answers/vendor-save", requireRole("vendor"), (req, res) => {
  const { assessment_id, answers } = req.body;

  if (!assessment_id || !Array.isArray(answers)) {
    return res.status(400).json({ message: "Invalid vendor answer data." });
  }

  if (answers.length === 0) {
    return res.status(400).json({ message: "No vendor answers to save." });
  }

  const checkSql = `
    SELECT status
    FROM assessments
    WHERE assessment_id = ?
  `;

  db.query(checkSql, [assessment_id], (err, results) => {
    if (err) {
      console.error("Check assessment error:", err);
      return res.status(500).json({ message: "Failed to check assessment." });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "Assessment not found." });
    }

    if (results[0].status !== "Draft") {
      return res.status(403).json({ message: "Vendor answers were already submitted and can no longer be edited." });
    }

    const values = answers.map((answer) => [
      assessment_id,
      answer.question_id,
      answer.vendor_response || null,
      answer.vendor_comment || null
    ]);

    const sql = `
      INSERT INTO answers
      (
        assessment_id,
        question_id,
        vendor_response,
        vendor_comment
      )
      VALUES ?
      ON DUPLICATE KEY UPDATE
        vendor_response = VALUES(vendor_response),
        vendor_comment = VALUES(vendor_comment),
        answered_at = CURRENT_TIMESTAMP
    `;

    db.query(sql, [values], (err) => {
      if (err) {
        console.error("Save vendor answers error:", err);
        return res.status(500).json({ message: "Failed to save vendor answers." });
      }

      res.json({ message: "Vendor answers saved as draft." });
    });
  });
});

// VENDOR SUBMIT ANSWERS
app.patch("/assessments/:assessment_id/submit", requireRole("vendor"), (req, res) => {
  const { assessment_id } = req.params;

  const sql = `
    UPDATE assessments
    SET status = 'Submitted'
    WHERE assessment_id = ?
  `;

  db.query(sql, [assessment_id], (err) => {
    if (err) {
      console.error("Submit assessment error:", err);
      return res.status(500).json({ message: "Failed to submit vendor answers." });
    }

    res.json({ message: "Vendor answers submitted. Company review is now enabled." });
  });
});

// COMPANY SAVE REVIEW
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
      return res.status(500).json({ message: "Failed to check assessment status." });
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

    db.query(saveReviewSql, [values], (err) => {
      if (err) {
        console.error("Save company review error:", err);
        return res.status(500).json({ message: "Failed to save company review." });
      }

      res.json({ message: "Company review saved successfully." });
    });
  });
});

app.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});