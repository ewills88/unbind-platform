import { describe, it, expect } from 'vitest';
import {
  personalInfoSchema,
  marriageDetailsSchema,
  childrenCustodySchema,
  financialOverviewSchema,
  legalGoalsSchema,
  getSchemaForStep,
  getPartialSchemaForStep,
} from '@/lib/validations/intake';

describe('personalInfoSchema', () => {
  const validData = {
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: '1985-03-15',
    email: 'john@example.com',
    phone: '555-123-4567',
    address: {
      street: '123 Main St',
      city: 'Los Angeles',
      state: 'CA',
      zipCode: '90001',
    },
    spouseFirstName: 'Jane',
    spouseLastName: 'Doe',
  };

  it('should accept valid personal info', () => {
    const result = personalInfoSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should require first name', () => {
    const result = personalInfoSchema.safeParse({
      ...validData,
      firstName: '',
    });
    expect(result.success).toBe(false);
  });

  it('should require last name', () => {
    const result = personalInfoSchema.safeParse({
      ...validData,
      lastName: '',
    });
    expect(result.success).toBe(false);
  });

  it('should validate email format', () => {
    const result = personalInfoSchema.safeParse({
      ...validData,
      email: 'invalid-email',
    });
    expect(result.success).toBe(false);
  });

  it('should validate phone format', () => {
    const result = personalInfoSchema.safeParse({
      ...validData,
      phone: 'abc',
    });
    expect(result.success).toBe(false);
  });

  it('should validate zip code format', () => {
    const invalid = personalInfoSchema.safeParse({
      ...validData,
      address: { ...validData.address, zipCode: '123' },
    });
    expect(invalid.success).toBe(false);

    const valid5 = personalInfoSchema.safeParse({
      ...validData,
      address: { ...validData.address, zipCode: '12345' },
    });
    expect(valid5.success).toBe(true);

    const valid9 = personalInfoSchema.safeParse({
      ...validData,
      address: { ...validData.address, zipCode: '12345-6789' },
    });
    expect(valid9.success).toBe(true);
  });

  it('should require spouse first name', () => {
    const result = personalInfoSchema.safeParse({
      ...validData,
      spouseFirstName: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('marriageDetailsSchema', () => {
  const validData = {
    dateOfMarriage: '2010-06-15',
    placeOfMarriage: {
      city: 'Las Vegas',
      state: 'NV',
      country: 'United States',
    },
    currentlyLivingTogether: false,
  };

  it('should accept valid marriage details', () => {
    const result = marriageDetailsSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should require date of marriage', () => {
    const result = marriageDetailsSchema.safeParse({
      ...validData,
      dateOfMarriage: '',
    });
    expect(result.success).toBe(false);
  });

  it('should require place of marriage city', () => {
    const result = marriageDetailsSchema.safeParse({
      ...validData,
      placeOfMarriage: { ...validData.placeOfMarriage, city: '' },
    });
    expect(result.success).toBe(false);
  });

  it('should accept optional domestic violence fields', () => {
    const result = marriageDetailsSchema.safeParse({
      ...validData,
      domesticViolenceHistory: true,
      domesticViolenceDetails: 'Details here',
    });
    expect(result.success).toBe(true);
  });
});

describe('childrenCustodySchema', () => {
  it('should accept when no minor children', () => {
    const result = childrenCustodySchema.safeParse({
      hasMinorChildren: false,
      children: [],
    });
    expect(result.success).toBe(true);
  });

  it('should validate children data when children exist', () => {
    const result = childrenCustodySchema.safeParse({
      hasMinorChildren: true,
      children: [
        {
          id: '1',
          firstName: 'Tommy',
          lastName: 'Doe',
          dateOfBirth: '2018-05-20',
          age: 6,
          currentCustody: 'shared',
        },
      ],
    });
    expect(result.success).toBe(true);
  });
});

describe('financialOverviewSchema', () => {
  it('should accept valid financial data', () => {
    const result = financialOverviewSchema.safeParse({
      clientEmploymentStatus: 'employed',
      spouseEmploymentStatus: 'employed',
    });
    expect(result.success).toBe(true);
  });

  it('should require client employment status', () => {
    const result = financialOverviewSchema.safeParse({
      spouseEmploymentStatus: 'employed',
    });
    expect(result.success).toBe(false);
  });
});

describe('legalGoalsSchema', () => {
  it('should accept valid legal goals', () => {
    const result = legalGoalsSchema.safeParse({
      primaryGoals: ['fair_property_division'],
      preferredApproach: 'collaborative',
    });
    expect(result.success).toBe(true);
  });

  it('should require at least one primary goal', () => {
    const result = legalGoalsSchema.safeParse({
      primaryGoals: [],
      preferredApproach: 'collaborative',
    });
    expect(result.success).toBe(false);
  });

  it('should require preferred approach', () => {
    const result = legalGoalsSchema.safeParse({
      primaryGoals: ['fair_property_division'],
    });
    expect(result.success).toBe(false);
  });
});

describe('getSchemaForStep', () => {
  it('should return personalInfoSchema for step 1', () => {
    const schema = getSchemaForStep(1);
    expect(schema).toBe(personalInfoSchema);
  });

  it('should return marriageDetailsSchema for step 2', () => {
    const schema = getSchemaForStep(2);
    expect(schema).toBe(marriageDetailsSchema);
  });

  it('should return childrenCustodySchema for step 3', () => {
    const schema = getSchemaForStep(3);
    expect(schema).toBe(childrenCustodySchema);
  });

  it('should return financialOverviewSchema for step 4', () => {
    const schema = getSchemaForStep(4);
    expect(schema).toBe(financialOverviewSchema);
  });

  it('should return legalGoalsSchema for step 5', () => {
    const schema = getSchemaForStep(5);
    expect(schema).toBe(legalGoalsSchema);
  });
});

describe('getPartialSchemaForStep', () => {
  it('should return a partial schema that accepts incomplete data', () => {
    const partialSchema = getPartialSchemaForStep(1);
    // Should accept partial data (for auto-save)
    const result = partialSchema.safeParse({
      firstName: 'John',
      // Missing required fields should be ok
    });
    expect(result.success).toBe(true);
  });
});
