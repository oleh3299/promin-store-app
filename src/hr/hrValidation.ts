import { z } from 'zod'

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : null))
  .nullable()
  .optional()

export const hrCandidateSchema = z.object({
  position: optionalText,
  interview_date: optionalText,
  internship_datetime: optionalText,
  last_name: z.string().trim().min(1, 'Вкажіть прізвище'),
  first_name: z.string().trim().min(1, 'Вкажіть імʼя'),
  middle_name: optionalText,
  birth_date: optionalText,
  phone1: optionalText,
  phone2: optionalText,
  registration_address: optionalText,
  residence_address: optionalText,
  marital_status: optionalText,
  has_children: z.boolean(),
  has_credits: z.boolean(),
  credits_amount: optionalText,
  previous_workplace: optionalText,
  work_experience: optionalText,
  passport_code: optionalText,
  tax_code: optionalText,
  passport_copy_added: z.boolean().optional(),
  registration_copy_added: z.boolean().optional(),
  tax_code_copy_added: z.boolean().optional(),
  hr_comment: optionalText,
  decision: z.enum(['rejected', 'trainee', 'approved']),
})

export type HRCandidateFormValues = z.input<typeof hrCandidateSchema>

export const emptyHRCandidateForm: HRCandidateFormValues = {
  position: '',
  interview_date: new Date().toISOString().slice(0, 10),
  internship_datetime: '',
  last_name: '',
  first_name: '',
  middle_name: '',
  birth_date: '',
  phone1: '',
  phone2: '',
  registration_address: '',
  residence_address: '',
  marital_status: '',
  has_children: false,
  has_credits: false,
  credits_amount: '',
  previous_workplace: '',
  work_experience: '',
  passport_code: '',
  tax_code: '',
  passport_copy_added: false,
  registration_copy_added: false,
  tax_code_copy_added: false,
  hr_comment: '',
  decision: 'trainee',
}
