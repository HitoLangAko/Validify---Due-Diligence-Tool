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

const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    ca: fs.readFileSync(process.env.DB_SSL_CA_PATH)
  },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

db.query("SELECT 1", (err) => {
  if (err) {
    console.error("Database connection failed:", err);
    return;
  }

  console.log("Connected to Aiven MySQL database.");
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

/* =========================
   ASSESSMENT ROUTES
========================= */

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

app.get("/assessments/:assessment_id/answers", requireLogin, (req, res) => {
  const { assessment_id } = req.params;

  const sql = `
    SELECT
      a.assessment_id,
      a.status,
      ans.question_id,
      ans.vendor_response,
      ans.company_comment
    FROM assessments a
    LEFT JOIN answers ans ON a.assessment_id = ans.assessment_id
    WHERE a.assessment_id = ?
  `;

  db.query(sql, [assessment_id], (err, rows) => {
    if (err) {
      console.error("Fetch assessment answers error:", err);
      return res.status(500).json({
        message: "Failed to fetch assessment answers."
      });
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
          company_comment: row.company_comment
        }))
    });
  });
});

app.patch("/assessments/:assessment_id/submit", requireRole("vendor"), (req, res) => {
  const { assessment_id } = req.params;

  const sql = `
    UPDATE assessments
    SET status = 'Submitted'
    WHERE assessment_id = ?
    AND status = 'Draft'
  `;

  db.query(sql, [assessment_id], (err, result) => {
    if (err) {
      console.error("Submit assessment error:", err);
      return res.status(500).json({
        message: "Failed to submit vendor answers."
      });
    }

    if (result.affectedRows === 0) {
      return res.status(400).json({
        message: "Only draft assessments can be submitted."
      });
    }

    res.json({
      message: "Vendor answers submitted. Company review is now enabled."
    });
  });
});

// COMPANY MARK AS APPROVED
app.patch("/assessments/:assessment_id/approved", requireRole("company_employee"), (req, res) => {
  const { assessment_id } = req.params;

  const sql = `
    UPDATE assessments
    SET status = 'Approved'
    WHERE assessment_id = ?
    AND status = 'Reviewed'
  `;

  db.query(sql, [assessment_id], (err, result) => {
    if (err) {
      console.error("Approve assessment error:", err);
      return res.status(500).json({
        message: "Failed to approve assessment."
      });
    }

    if (result.affectedRows === 0) {
      return res.status(400).json({
        message: "Only reviewed assessments can be approved."
      });
    }

    res.json({
      message: "Assessment approved successfully. This is now final."
    });
  });
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
      return res.status(403).json({
        message: "Vendor answers were already submitted and can no longer be edited."
      });
    }

    const values = answers.map((answer) => [
      assessment_id,
      answer.question_id,
      answer.company_comment || null
    ]);

    const sql = `
      INSERT INTO answers
      (
        assessment_id,
        question_id,
        vendor_response
      )
      VALUES ?
      ON DUPLICATE KEY UPDATE
        vendor_response = VALUES(vendor_response),
        answered_at = CURRENT_TIMESTAMP
    `;

    db.query(sql, [values], (err) => {
      if (err) {
        console.error("Save vendor answers error:", err);
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
        company_comment
      )
      VALUES ?
      ON DUPLICATE KEY UPDATE
        company_comment = VALUES(company_comment),
        reviewed_at = CURRENT_TIMESTAMP
    `;

    db.query(saveReviewSql, [values], (err) => {
      if (err) {
        console.error("Save company review error:", err);
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
      'Business Unit Representative',
      'Risk Management Officer',
      'HR',
      'IT Compliance',
      'InfoSec',
      'DPO'
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
    item.signoff_status === "Signed" ? new Date() : null
  ]);

  const sql = `
    INSERT INTO sign_offs
    (
      assessment_id,
      role_name,
      signer_name,
      signoff_status,
      signed_at
    )
    VALUES ?
    ON DUPLICATE KEY UPDATE
      signer_name = VALUES(signer_name),
      signoff_status = VALUES(signoff_status),
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
      'Business Unit Representative',
      'Risk Management Officer',
      'HR',
      'IT Compliance',
      'InfoSec',
      'DPO'
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

    if (assessment.status !== "Reviewed" && assessment.status !== "Approved") {
      return res.status(403).json({
        message: "Export is locked until the company review and sign-off are completed."
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

  // Main title
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

  // Assessment details block
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

  // Table header starts after details block
  const tableHeaderRow = detailStartRow + details.length + 2;

  sheet.getCell(`A${tableHeaderRow}`).value = "";
  sheet.getCell(`B${tableHeaderRow}`).value = "VENDOR RESPONSE";
  sheet.getCell(`C${tableHeaderRow}`).value = "<Company> COMMENT/S";

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

  // Column widths based on your sample
  sheet.columns = [
    { key: "question_text", width: 75 },
    { key: "vendor_response", width: 35 },
    { key: "company_comment", width: 30 },
    { key: "artifacts", width: 22 }
  ];

  // Top product/service row
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

  // Main header row
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

  // No frozen panes for smoother scrolling
  sheet.views = [];
}

function blackBorder() {
  return {
    top: { style: "medium", color: { argb: "FF000000" } },
    left: { style: "medium", color: { argb: "FF000000" } },
    bottom: { style: "medium", color: { argb: "FF000000" } },
    right: { style: "medium", color: { argb: "FF000000" } }
  };
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

  // Column widths
  sheet.columns = [
    { width: 4 },   // A
    { width: 10 },  // B
    { width: 10 },  // C
    { width: 10 },  // D
    { width: 10 },  // E
    { width: 10 },  // F
    { width: 10 },  // G
    { width: 10 },  // H
    { width: 10 },  // I
    { width: 10 },  // J
    { width: 10 },  // K
    { width: 10 },  // L
    { width: 10 },  // M
    { width: 10 },  // N
    { width: 4 }    // O
  ];

// Outer border area only, no merge
  applyOuterBorderToRange(sheet, "B1:N34", thickBorder());

  // Logo box
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

  // Title
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

  // Signoff map
  const signoffMap = {};
  signoffs.forEach((item) => {
    signoffMap[item.role_name] = item;
  });

  // Left boxes
  createSignatureBox(sheet, {
    labelRange: "C6:C10",
    boxRange: "D6:F10",
    label: "IT",
    signer: getSigner(signoffMap, "IT Compliance")
  });

  createSignatureBox(sheet, {
    labelRange: "C12:C16",
    boxRange: "D12:F16",
    label: "INFOSEC",
    signer: getSigner(signoffMap, "InfoSec")
  });

  createSignatureBox(sheet, {
    labelRange: "C19:C23",
    boxRange: "D19:F23",
    label: "RISK\nMANAGEMENT\nOFFICER",
    signer: getSigner(signoffMap, "Risk Management Officer")
  });

  // Right boxes
  createSignatureBox(sheet, {
    labelRange: "H6:H10",
    boxRange: "I6:K10",
    label: "COMPLIANCE",
    signer: getSigner(signoffMap, "Business Unit Representative")
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

  // Disclaimer 1
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

  // Disclaimer 2
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

  // Disclaimer 3
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

  // Bottom signature line
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

  // Row heights
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

  if (!item) {
    return "";
  }

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

function thickBorder() {
  return {
    top: { style: "medium", color: { argb: "FF000000" } },
    left: { style: "medium", color: { argb: "FF000000" } },
    bottom: { style: "medium", color: { argb: "FF000000" } },
    right: { style: "medium", color: { argb: "FF000000" } }
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
        company_comment
      )
      VALUES ?
      ON DUPLICATE KEY UPDATE
        company_comment = VALUES(company_comment),
        reviewed_at = CURRENT_TIMESTAMP
    `;

    db.query(saveReviewSql, [values], (err) => {
      if (err) {
        console.error("Save company review error:", err);
        return res.status(500).json({
          message: "Failed to save company review."
        });
      }

      res.json({ message: "Company review saved successfully." });
    });
  });
});

/* =========================
   START SERVER
========================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});