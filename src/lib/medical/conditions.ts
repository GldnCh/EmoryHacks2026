// Links the sample family's conditions to standard ICD-10 codes and the specialist who treats them.
// Used by the specialist finder (NPI Registry) and condition explanations (MedlinePlus).
export interface ConditionInfo {
  icd10: string;
  specialty: string; // NPI Registry taxonomy description
  plainName: string;
}

export const CONDITIONS: Record<string, ConditionInfo> = {
  "Prediabetes": { icd10: "R73.03", specialty: "Endocrinology, Diabetes & Metabolism", plainName: "Prediabetes" },
  "Mild hypertension": { icd10: "I10", specialty: "Cardiovascular Disease", plainName: "High blood pressure" },
  "Hypertension": { icd10: "I10", specialty: "Cardiovascular Disease", plainName: "High blood pressure" },
  "Type 2 diabetes": { icd10: "E11.9", specialty: "Endocrinology, Diabetes & Metabolism", plainName: "Type 2 diabetes" },
  "High cholesterol": { icd10: "E78.5", specialty: "Cardiovascular Disease", plainName: "High cholesterol" },
  "Seasonal allergies": { icd10: "J30.2", specialty: "Allergy & Immunology", plainName: "Seasonal allergies (hay fever)" },
  "Mild asthma": { icd10: "J45.20", specialty: "Allergy & Immunology", plainName: "Mild asthma" },
};

export const lookupCondition = (name: string): ConditionInfo | undefined => CONDITIONS[name];
