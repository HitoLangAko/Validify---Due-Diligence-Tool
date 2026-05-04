CREATE DATABASE IF NOT EXISTS vendor_due_diligence_db;
USE vendor_due_diligence_db;

-- Optional reset for testing
-- Only use this while developing. Remove or comment this if you already have real data.
DROP TABLE IF EXISTS sign_offs;
DROP TABLE IF EXISTS answers;
DROP TABLE IF EXISTS questions;
DROP TABLE IF EXISTS question_sections;
DROP TABLE IF EXISTS assessments;
DROP TABLE IF EXISTS vendors;

CREATE TABLE vendors (
    vendor_id INT AUTO_INCREMENT PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    company_website VARCHAR(255),
    product_services_offered TEXT,
    contact_person_name VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE assessments (
    assessment_id INT AUTO_INCREMENT PRIMARY KEY,
    vendor_id INT NOT NULL,
    assessment_date DATE,
    purpose VARCHAR(255),
    status ENUM('Draft', 'Submitted', 'Reviewed', 'Approved', 'Rejected') DEFAULT 'Draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id)
);

CREATE TABLE question_sections (
    section_id INT AUTO_INCREMENT PRIMARY KEY,
    tab_name ENUM(
        'Due Diligence Form',
        'Information Security',
        'Sign-off Sheet'
    ) NOT NULL,
    section_name VARCHAR(255) NOT NULL
);

CREATE TABLE questions (
    question_id INT AUTO_INCREMENT PRIMARY KEY,
    section_id INT NOT NULL,
    question_text TEXT NOT NULL,
    response_type ENUM('YES_NO_NA', 'TEXT', 'DATE', 'FILE') DEFAULT 'TEXT',
    is_required BOOLEAN DEFAULT FALSE,

    FOREIGN KEY (section_id) REFERENCES question_sections(section_id)
);

CREATE TABLE answers (
    answer_id INT AUTO_INCREMENT PRIMARY KEY,
    assessment_id INT NOT NULL,
    question_id INT NOT NULL,

    vendor_response TEXT,
    vendor_comment TEXT,

    company_response ENUM(
        'Accepted',
        'Needs Review',
        'Rejected',
        'Pending'
    ) DEFAULT 'Pending',
    company_comment TEXT,

    uploaded_file_path VARCHAR(255),
    answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP NULL,

    FOREIGN KEY (assessment_id) REFERENCES assessments(assessment_id),
    FOREIGN KEY (question_id) REFERENCES questions(question_id)
);

CREATE TABLE sign_offs (
    signoff_id INT AUTO_INCREMENT PRIMARY KEY,
    assessment_id INT NOT NULL,

    role_name ENUM(
        'Business Unit Representative',
        'Risk Management Officer',
        'HR',
        'IT Compliance',
        'InfoSec',
        'DPO'
    ) NOT NULL,

    signer_name VARCHAR(255),
    signature_file_path VARCHAR(255),
    signoff_status ENUM('Pending', 'Signed', 'Rejected') DEFAULT 'Pending',
    signed_at DATETIME,

    FOREIGN KEY (assessment_id) REFERENCES assessments(assessment_id)
);

INSERT INTO question_sections (tab_name, section_name)
VALUES
('Due Diligence Form', 'Vendor Information'),
('Due Diligence Form', 'Consumer'),
('Due Diligence Form', 'IT Risk Management'),
('Due Diligence Form', 'Compliance'),
('Due Diligence Form', 'Resiliency'),
('Due Diligence Form', 'Data Privacy'),
('Due Diligence Form', 'Environmental and Social Risk Management'),

('Information Security', 'Leadership and Management'),
('Information Security', 'Security Governance'),
('Information Security', 'Legal and Compliance'),
('Information Security', 'Employee Security Awareness'),
('Information Security', 'Access Control Management'),
('Information Security', 'Network Security'),
('Information Security', 'Application Security'),
('Information Security', 'Vendor Security Posture'),
('Information Security', 'Information Security Incident Management'),
('Information Security', 'Disposal'),
('Information Security', 'Others'),

('Sign-off Sheet', 'Approvals');

INSERT INTO questions (section_id, question_text, response_type, is_required)
VALUES
-- Due Diligence Form: Vendor Information
(1, 'Type of service or deployment model would this vendor implement for the company?', 'TEXT', TRUE),
(1, 'Vendor clients', 'TEXT', FALSE),
(1, 'Vendor local offices', 'TEXT', FALSE),
(1, 'Vendor HQ location', 'TEXT', FALSE),
(1, 'Number of years the vendor has been in business', 'TEXT', FALSE),
(1, 'Please describe your ability and capacity to perform the outsourced activities effectively and reliably.', 'TEXT', FALSE),
(1, 'What is your support turnaround time?', 'TEXT', FALSE),
(1, 'To whom are issues escalated? Please provide name, email address, and contact number.', 'TEXT', FALSE),
(1, 'Have there been any instances where you were unable to deliver services as per agreed terms?', 'YES_NO_NA', FALSE),
(1, 'Please provide the cost of this particular engagement.', 'TEXT', FALSE),

-- Due Diligence Form: Consumer
(2, 'Do you have a mechanism to address client complaints against an authorized agent or representative?', 'YES_NO_NA', FALSE),
(2, 'How do you ensure that client complaints are addressed quickly and adequately?', 'TEXT', FALSE),
(2, 'Do you have a team or individuals dedicated to managing consumer complaints?', 'YES_NO_NA', FALSE),
(2, 'What is a typical time frame for acknowledging and addressing a customer complaint?', 'TEXT', FALSE),
(2, 'How do you track and document customer complaints?', 'TEXT', FALSE),

-- Due Diligence Form: IT Risk Management
(3, 'Does your organization include IT-related functions such as hardware, software, cloud, maintenance, or other IT resources?', 'YES_NO_NA', TRUE),
(3, 'If yes, please provide detailed scope or involvement and outsourced IT functions.', 'TEXT', FALSE),
(3, 'Do you have an IT Risk Management organizational framework or program?', 'YES_NO_NA', TRUE),
(3, 'Do you monitor and report Key Risk Indicators and other IT Risk Metrics?', 'YES_NO_NA', TRUE),
(3, 'Do you use any third-party IT vendors, contractors, or subcontractors?', 'YES_NO_NA', FALSE),
(3, 'Please share documented agreements such as MSA, SLA, NDA, and BCP.', 'FILE', FALSE),
(3, 'Do you have an Internal Audit Function?', 'YES_NO_NA', FALSE),
(3, 'Please provide the latest internal and external audit report and status of open findings.', 'FILE', FALSE),

-- Due Diligence Form: Compliance
(4, 'Enumerate the top shareholders and officers of the vendor as indicated in the General Information Sheet.', 'TEXT', FALSE),
(4, 'Will the service be supplied via private cloud, public cloud, hybrid cloud, or community cloud?', 'TEXT', FALSE),
(4, 'Will the service require the transfer of company data to another country?', 'YES_NO_NA', FALSE),
(4, 'Do you have policies and procedures to comply with AML and CFT regulations?', 'YES_NO_NA', FALSE),
(4, 'Will the service to be provided involve AML-related transactions?', 'YES_NO_NA', FALSE),

-- Due Diligence Form: Resiliency
(5, 'Is there a specified alternate site documented in the BCP?', 'YES_NO_NA', FALSE),
(5, 'Provide the current and approved IT Disaster Recovery and Business Continuity Plan.', 'FILE', FALSE),
(5, 'Provide the approved Business Continuity Plan effective date within one year.', 'DATE', FALSE),
(5, 'Provide results of the most recent IT DRP and BCP tests.', 'FILE', FALSE),
(5, 'Are there action plans in place for corrective actions discovered during the test?', 'YES_NO_NA', FALSE),

-- Due Diligence Form: Data Privacy
(6, 'Is your company registered at the National Privacy Commission?', 'YES_NO_NA', FALSE),
(6, 'Please provide NPC Registration Certificate.', 'FILE', FALSE),
(6, 'Who is your organization Data Privacy Officer and what are their contact details?', 'TEXT', FALSE),
(6, 'Is your company certified with ISO 27701?', 'YES_NO_NA', FALSE),
(6, 'Describe in detail all the data that would be processed or stored under this engagement.', 'TEXT', FALSE),
(6, 'Will company data, whether PII or non-PII, be stored in cloud?', 'YES_NO_NA', FALSE),
(6, 'Describe the security controls employed to protect data-at-rest and data-in-transit.', 'TEXT', FALSE),
(6, 'How will the company be notified if an information security breach involving company data occurred?', 'TEXT', FALSE),
(6, 'How does your organization securely destroy or remove data when the need arises?', 'TEXT', FALSE),
(6, 'Where does the data or information reside or transition through at a given point in time?', 'TEXT', FALSE),
(6, 'Please provide a data flow diagram.', 'FILE', FALSE),

-- Due Diligence Form: Environmental and Social Risk Management
(7, 'Do you have any outstanding legal, regulatory, or environmental issues that could impact your ability to supply goods or services?', 'YES_NO_NA', FALSE),
(7, 'Do you have policies in place to ensure compliance with labor, environmental, and health and safety laws?', 'YES_NO_NA', FALSE),
(7, 'Do you have policies in place to prevent discrimination, harassment, and abuse of employees?', 'YES_NO_NA', FALSE),
(7, 'Do you have systems or policies in place to prevent fraud, corruption, forced labor, child labor, and other unethical practices?', 'YES_NO_NA', FALSE),
(7, 'Do you track and measure sustainability performance or have a sustainability report?', 'YES_NO_NA', FALSE),

-- Information Security: Leadership and Management
(8, 'Is there a dedicated security officer or team responsible for overseeing information security programs, awareness, and compliance?', 'YES_NO_NA', TRUE),
(8, 'Does your security officer report to senior management or form part of the steering committee?', 'YES_NO_NA', TRUE),

-- Information Security: Security Governance
(9, 'Do you have documented security policies?', 'YES_NO_NA', TRUE),
(9, 'Are the security policies board approved?', 'YES_NO_NA', FALSE),
(9, 'Are security policies regularly reviewed to align with ISO27001, PCI DSS, NIST, or similar standards?', 'YES_NO_NA', FALSE),
(9, 'Does your organization undergo regular internal and external security audits?', 'YES_NO_NA', FALSE),

-- Information Security: Legal and Compliance
(10, 'Do you comply with relevant local and international laws and security regulations?', 'YES_NO_NA', TRUE),
(10, 'Are security requirements incorporated in contracts, including data protection clauses?', 'YES_NO_NA', TRUE),

-- Information Security: Employee Security Awareness
(11, 'Do you have an established Information Security Awareness Program?', 'YES_NO_NA', FALSE),
(11, 'How often do you conduct security awareness training and what topics are covered?', 'TEXT', FALSE),
(11, 'Do you conduct background investigations before hiring employees who handle sensitive information?', 'YES_NO_NA', FALSE),

-- Information Security: Access Control Management
(12, 'Are roles and access rights following the least-privilege principle?', 'YES_NO_NA', TRUE),
(12, 'Are user privileges regularly reviewed and updated?', 'YES_NO_NA', TRUE),
(12, 'Are access logs to sensitive data maintained for access review?', 'YES_NO_NA', TRUE),

-- Information Security: Network Security
(13, 'Are you employing a zero-trust infrastructure model?', 'YES_NO_NA', FALSE),
(13, 'Does your organization encrypt communications and data stored in IT facilities, including data-at-rest and data-in-transit?', 'YES_NO_NA', TRUE),

-- Information Security: Application Security
(14, 'Do you perform application security testing or assessment before production deployment?', 'YES_NO_NA', TRUE),
(14, 'Do you follow secure coding practices such as OWASP Top 10?', 'YES_NO_NA', TRUE),
(14, 'Do you perform code reviews?', 'YES_NO_NA', FALSE),
(14, 'Do you have a defined change management process for updates and system changes?', 'YES_NO_NA', TRUE),

-- Information Security: Vendor Security Posture
(15, 'Do you regularly conduct internal or external penetration testing or vulnerability assessments?', 'YES_NO_NA', TRUE),
(15, 'Do you have controls in place to assess your own third-party suppliers?', 'YES_NO_NA', FALSE),
(15, 'Are systems and applications patched regularly and in a timely manner?', 'YES_NO_NA', TRUE),

-- Information Security: Incident Management
(16, 'Do you have a security incident response team and procedures in place?', 'YES_NO_NA', TRUE),
(16, 'Have you encountered or reported cyber attacks or security incidents in the past two years?', 'YES_NO_NA', TRUE),
(16, 'Do you have a dedicated Security Operations Center or team?', 'YES_NO_NA', FALSE),
(16, 'Do you have an Incident Response Plan?', 'YES_NO_NA', TRUE),
(16, 'Do you have an Incident Response Plan for ransomware scenarios?', 'YES_NO_NA', FALSE),
(16, 'Do you have an Incident Response Plan for phishing and data breach scenarios?', 'YES_NO_NA', FALSE),

-- Information Security: Disposal
(17, 'Do you securely dispose electronic copies of client data?', 'YES_NO_NA', TRUE),
(17, 'Describe your process for securely disposing electronic copies of client data.', 'TEXT', FALSE),
(17, 'Do you securely dispose physical copies of client data?', 'YES_NO_NA', FALSE),
(17, 'Describe your process for securely disposing physical copies of client data.', 'TEXT', FALSE),

-- Information Security: Others
(18, 'Have you ever been blacklisted as a partner or supplier by another company, client, or customer?', 'YES_NO_NA', FALSE),
(18, 'Do you provide services to other organizations that are direct competitors of the company?', 'YES_NO_NA', FALSE),
(18, 'If yes, do you have processes and procedures that ensure confidentiality of information?', 'TEXT', FALSE);