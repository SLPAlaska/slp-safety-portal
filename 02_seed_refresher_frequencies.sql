-- ============================================================
-- AnthroSafe LMS — Refresher Frequency + Regulatory Basis Seed
-- Run AFTER 01_migration_refresher_columns.sql
-- Run in Supabase SQL Editor (project: iypezirwdlqpptjpeeyf)
-- ============================================================
-- Matches courses by exact title. If a title has changed in the
-- UI, update the WHERE clause accordingly.
-- ============================================================

-- === 12 MONTHS (Regulatory Annual) ==========================
UPDATE lms_courses SET refresher_frequency_months = 12, regulatory_basis = '29 CFR 1910.1020(g)(1)' WHERE title = 'Access to Employee Medical & Exposure Records';
UPDATE lms_courses SET refresher_frequency_months = 12, regulatory_basis = '29 CFR 1910.1000 / 29 CFR 1926.55' WHERE title = 'Air Contaminants';
UPDATE lms_courses SET refresher_frequency_months = 12, regulatory_basis = '49 CFR Part 382' WHERE title = 'Alcohol & Drugs- FMCSA';
UPDATE lms_courses SET refresher_frequency_months = 12, regulatory_basis = '29 CFR 1910.1001(j)(7)(iv)' WHERE title = 'Asbestos Awareness';
UPDATE lms_courses SET refresher_frequency_months = 12, regulatory_basis = '29 CFR 1910.1028(j)(3)(iii)' WHERE title = 'Benzene Safety';
UPDATE lms_courses SET refresher_frequency_months = 12, regulatory_basis = '29 CFR 1910.1030(g)(2)(ii)' WHERE title = 'Bloodborne Pathogens';
UPDATE lms_courses SET refresher_frequency_months = 12, regulatory_basis = '29 CFR 1910.1000 / 29 CFR 1926.55' WHERE title = 'Carbon Monoxide Safety';
UPDATE lms_courses SET refresher_frequency_months = 12, regulatory_basis = '29 CFR 1910.157(g)(2)' WHERE title = 'Fire Extinguisher Safety';
UPDATE lms_courses SET refresher_frequency_months = 12, regulatory_basis = '29 CFR 1910.252(a)(2)(iii) / 29 CFR 1926.352(e)' WHERE title = 'Fire Watch';
UPDATE lms_courses SET refresher_frequency_months = 12, regulatory_basis = 'ANSI Z390.1 / API RP 49 (industry standard)' WHERE title = 'H2S Safety';
UPDATE lms_courses SET refresher_frequency_months = 12, regulatory_basis = '29 CFR 1910.95(k)(2)' WHERE title = 'Hearing Conservation';
UPDATE lms_courses SET refresher_frequency_months = 12, regulatory_basis = '29 CFR 1910.1026(l)(1)' WHERE title = 'Hexavalent Chromium';
UPDATE lms_courses SET refresher_frequency_months = 12, regulatory_basis = '29 CFR 1910.1025(l)(1)(i)' WHERE title = 'Lead Safety';
UPDATE lms_courses SET refresher_frequency_months = 12, regulatory_basis = '30 CFR 46.8' WHERE title = 'MSHA Part 46 New Miner Training';
UPDATE lms_courses SET refresher_frequency_months = 12, regulatory_basis = '29 CFR 1910.134(k)(5)' WHERE title = 'Respiratory Protection';
UPDATE lms_courses SET refresher_frequency_months = 12, regulatory_basis = '29 CFR 1910.1053(j)(3) / 29 CFR 1926.1153' WHERE title = 'Silica Dust Safety';

-- === 24 MONTHS ==============================================
UPDATE lms_courses SET refresher_frequency_months = 24, regulatory_basis = 'AHA / American Red Cross certification period' WHERE title = 'Basic First Aid/CPR/AED';
UPDATE lms_courses SET refresher_frequency_months = 24, regulatory_basis = 'Company policy — Competent Person retraining' WHERE title = 'Scaffolding- Competent Person';

-- === 36 MONTHS (Default + Regulatory 3-Year) ================
UPDATE lms_courses SET refresher_frequency_months = 36, regulatory_basis = 'ANSI A92.24 (consensus standard)' WHERE title = 'Aerial Lift Safety';
UPDATE lms_courses SET refresher_frequency_months = 36, regulatory_basis = 'NFPA 70E 110.2(D)(3)' WHERE title = 'Arc Flash Safety- Qualified Person';
UPDATE lms_courses SET refresher_frequency_months = 36, regulatory_basis = 'NFPA 70E 110.2(D)(3)' WHERE title = 'Arc Flash Safety- Unqualified Person';
UPDATE lms_courses SET refresher_frequency_months = 36, regulatory_basis = 'Company policy' WHERE title = 'Accident-Incident Investigation & Reporting';
UPDATE lms_courses SET refresher_frequency_months = 36, regulatory_basis = 'Company policy' WHERE title = 'Active Shooter Response';
UPDATE lms_courses SET refresher_frequency_months = 36, regulatory_basis = 'Company policy' WHERE title = 'Battery Safety';
UPDATE lms_courses SET refresher_frequency_months = 36, regulatory_basis = 'Company policy' WHERE title = 'Behavior Based Safety Training';
UPDATE lms_courses SET refresher_frequency_months = 36, regulatory_basis = 'Company policy' WHERE title = 'Boiler Operator & Steam Jetting Safety';
UPDATE lms_courses SET refresher_frequency_months = 36, regulatory_basis = 'Company policy' WHERE title = 'CMV Inspections';
UPDATE lms_courses SET refresher_frequency_months = 36, regulatory_basis = 'Company policy' WHERE title = 'Combustible Dust Safety';
UPDATE lms_courses SET refresher_frequency_months = 36, regulatory_basis = 'Company policy' WHERE title = 'Compressed Gas Safety';
UPDATE lms_courses SET refresher_frequency_months = 36, regulatory_basis = 'Company policy' WHERE title = 'Concrete & Masonry Safety';
UPDATE lms_courses SET refresher_frequency_months = 36, regulatory_basis = 'Company policy' WHERE title = 'Confined Space Safety';
UPDATE lms_courses SET refresher_frequency_months = 36, regulatory_basis = 'Company policy' WHERE title = 'Conflict Resolution';
UPDATE lms_courses SET refresher_frequency_months = 36, regulatory_basis = 'Company policy' WHERE title = 'Contractor Safety Orientation';
UPDATE lms_courses SET refresher_frequency_months = 36, regulatory_basis = 'Cook Inlet Operators Agreement' WHERE title = 'Cook Inlet Training Standards';
UPDATE lms_courses SET refresher_frequency_months = 36, regulatory_basis = 'Company policy' WHERE title = 'Crane Rigging Safety';
UPDATE lms_courses SET refresher_frequency_months = 36, regulatory_basis = 'Company policy' WHERE title = 'Defensive Driving- CMV';
UPDATE lms_courses SET refresher_frequency_months = 36, regulatory_basis = 'Company policy' WHERE title = 'Distracted Driving Prevention';
UPDATE lms_courses SET refresher_frequency_months = 36, regulatory_basis = 'Company policy' WHERE title = 'Driver Safety- General';
UPDATE lms_courses SET refresher_frequency_months = 36, regulatory_basis = 'NFPA 70E 110.2(D)(3)' WHERE title = 'Electrical Safety- Qualified Person';
UPDATE lms_courses SET refresher_frequency_months = 36, regulatory_basis = 'Company policy' WHERE title = 'Emergency Action Plans';
UPDATE lms_courses SET refresher_frequency_months = 36, regulatory_basis = 'Company policy' WHERE title = 'Energy Isolation (LOTO)';
UPDATE lms_courses SET refresher_frequency_months = 36, regulatory_basis = 'Company policy' WHERE title = 'Environmental Compliance- Alaska Ops';
UPDATE lms_courses SET refresher_frequency_months = 36, regulatory_basis = 'Company policy — Competent Person retraining' WHERE title = 'Excavation & Trenching- Competent Person';
UPDATE lms_courses SET refresher_frequency_months = 36, regulatory_basis = 'Company policy' WHERE title = 'Exit Routes';
UPDATE lms_courses SET refresher_frequency_months = 36, regulatory_basis = 'Company policy — Competent Person retraining' WHERE title = 'Fall Protection- Competent Person';
UPDATE lms_courses SET refresher_frequency_months = 36, regulatory_basis = 'Company policy' WHERE title = 'Fatigue Management';
UPDATE lms_courses SET refresher_frequency_months = 36, regulatory_basis = 'Company policy' WHERE title = 'Fire Prevention';
UPDATE lms_courses SET refresher_frequency_months = 36, regulatory_basis = 'MUTCD Part 6 (industry practice)' WHERE title = 'Flagger Safety';
UPDATE lms_courses SET refresher_frequency_months = 36, regulatory_basis = 'NFPA 30 (industry standard)' WHERE title = 'Flammable/Combustible Liquids';
UPDATE lms_courses SET refresher_frequency_months = 36, regulatory_basis = '29 CFR 1910.178(l)(4)(iii)' WHERE title = 'Forklift Safety';
UPDATE lms_courses SET refresher_frequency_months = 36, regulatory_basis = 'Company policy' WHERE title = 'Hand Safety';
UPDATE lms_courses SET refresher_frequency_months = 36, regulatory_basis = 'IADC Rig Pass / NSTC' WHERE title = 'HAVOC Training';
UPDATE lms_courses SET refresher_frequency_months = 36, regulatory_basis = '49 CFR 172.704(c)(2)' WHERE title = 'HazMat Transportation';
UPDATE lms_courses SET refresher_frequency_months = 36, regulatory_basis = '49 CFR Part 395' WHERE title = 'Hours of Service- DOT';
UPDATE lms_courses SET refresher_frequency_months = 36, regulatory_basis = 'Company policy' WHERE title = 'Incident Investigation- Competent Investigator';
UPDATE lms_courses SET refresher_frequency_months = 36, regulatory_basis = 'Company policy' WHERE title = 'Industrial Athlete- Body Mechanics';
UPDATE lms_courses SET refresher_frequency_months = 36, regulatory_basis = 'Company policy' WHERE title = 'Industrial Hygiene- Basics';
UPDATE lms_courses SET refresher_frequency_months = 36, regulatory_basis = 'API RP 2016 (industry practice)' WHERE title = 'Iron Sulfide';
UPDATE lms_courses SET refresher_frequency_months = 36, regulatory_basis = 'Company policy' WHERE title = 'Job Hazard Analysis';
UPDATE lms_courses SET refresher_frequency_months = 36, regulatory_basis = 'Company policy' WHERE title = 'Ladder Safety';
UPDATE lms_courses SET refresher_frequency_months = 36, regulatory_basis = 'Company policy' WHERE title = 'Machine Guarding';
UPDATE lms_courses SET refresher_frequency_months = 36, regulatory_basis = 'Company policy' WHERE title = 'Nitrogen Safety';
UPDATE lms_courses SET refresher_frequency_months = 36, regulatory_basis = 'EPA 40 CFR / ADEC 18 AAC 75' WHERE title = 'North Slope Environmental Awareness';
UPDATE lms_courses SET refresher_frequency_months = 36, regulatory_basis = 'Company policy' WHERE title = 'Office Safety';
UPDATE lms_courses SET refresher_frequency_months = 36, regulatory_basis = 'Company policy' WHERE title = 'Oil & Gas Contractor Orientation';
UPDATE lms_courses SET refresher_frequency_months = 36, regulatory_basis = 'Company policy' WHERE title = 'PPE';
UPDATE lms_courses SET refresher_frequency_months = 36, regulatory_basis = '29 CFR 1910.119(g)(2)' WHERE title = 'PSM- Overview';
UPDATE lms_courses SET refresher_frequency_months = 36, regulatory_basis = 'Company policy' WHERE title = 'Stop Work Authority';

-- === 60 MONTHS ==============================================
UPDATE lms_courses SET refresher_frequency_months = 60, regulatory_basis = '29 CFR 1926.1427 (operator recertification)' WHERE title = 'Overhead Crane Safety';
UPDATE lms_courses SET refresher_frequency_months = 60, regulatory_basis = 'Company policy' WHERE title = 'Risk Assessment';
UPDATE lms_courses SET refresher_frequency_months = 60, regulatory_basis = 'Company policy' WHERE title = 'Lifesaving Rules';
UPDATE lms_courses SET refresher_frequency_months = 60, regulatory_basis = 'NFPA 51B (industry standard)' WHERE title = 'Welding/Cutting/Brazing Awareness';
UPDATE lms_courses SET refresher_frequency_months = 60, regulatory_basis = '29 CFR 1910.1200 (retrain on new hazards)' WHERE title = 'Chemical Labeling- HazCom & GHS';
UPDATE lms_courses SET refresher_frequency_months = 60, regulatory_basis = 'Company policy' WHERE title = 'Workplace Violence Awareness & Prevention';

-- === NULL (One-Time, No Refresher) ==========================
UPDATE lms_courses SET refresher_frequency_months = NULL, regulatory_basis = 'One-time orientation on hire' WHERE title = 'New Employee Orientation';
UPDATE lms_courses SET refresher_frequency_months = NULL, regulatory_basis = 'MagTec SOP — one-time' WHERE title = 'Dragon ST6';

-- === VERIFICATION ===========================================
-- Show all courses with their new frequencies:
SELECT
  title,
  refresher_frequency_months AS months,
  CASE
    WHEN refresher_frequency_months IS NULL THEN 'One-time'
    WHEN refresher_frequency_months = 12 THEN 'Annual'
    WHEN refresher_frequency_months = 24 THEN '2 years'
    WHEN refresher_frequency_months = 36 THEN '3 years'
    WHEN refresher_frequency_months = 60 THEN '5 years'
    ELSE refresher_frequency_months::text || ' months'
  END AS frequency,
  regulatory_basis
FROM lms_courses
WHERE active = true
ORDER BY refresher_frequency_months NULLS LAST, title;

-- Show any active courses that DIDN'T get a frequency set
-- (title mismatch between seed and DB):
SELECT title, 'NO FREQUENCY SET' AS status
FROM lms_courses
WHERE active = true
  AND refresher_frequency_months IS NULL
  AND (regulatory_basis IS NULL OR regulatory_basis NOT LIKE '%one-time%' AND regulatory_basis NOT LIKE '%One-time%')
ORDER BY title;
