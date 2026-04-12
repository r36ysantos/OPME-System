import { z } from 'zod';

// ─── Password strength schema ─────────────────────────────────────────────────

export const passwordSchema = z
  .string()
  .min(8,   'A senha deve ter pelo menos 8 caracteres')
  .max(128, 'A senha não pode ter mais de 128 caracteres')
  .regex(/[A-Z]/, 'A senha deve conter pelo menos uma letra maiúscula')
  .regex(/[a-z]/, 'A senha deve conter pelo menos uma letra minúscula')
  .regex(/[0-9]/, 'A senha deve conter pelo menos um número')
  .regex(/[^A-Za-z0-9]/, 'A senha deve conter pelo menos um caractere especial');

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
  newPassword:     passwordSchema,
  confirmPassword: z.string().min(1, 'Confirmação de senha é obrigatória'),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});

export const adminResetSchema = z.object({
  newPassword:     passwordSchema,
  confirmPassword: z.string().min(1, 'Confirmação de senha é obrigatória'),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});

// ─── Validation helper ────────────────────────────────────────────────────────

export type PasswordValidationResult =
  | { ok: true }
  | { ok: false; errors: string[] };

export function validatePassword(password: string): PasswordValidationResult {
  const result = passwordSchema.safeParse(password);
  if (result.success) return { ok: true };
  return { ok: false, errors: result.error.errors.map((e) => e.message) };
}
