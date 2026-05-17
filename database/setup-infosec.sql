USE defaultdb;

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
);

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
);

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
);
