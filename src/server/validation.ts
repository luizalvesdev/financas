import { z } from 'zod';

import { isIsoDate } from '@/shared/dates';

export const uuid = z.uuid();
export const isoDate = z.string().refine(isIsoDate, 'Data inválida');
export const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Mês inválido');
export const cents = z.number().int().positive().max(100_000_000);
const text = z.string().trim().min(1).max(200);

const expenseFields = {
  description: text,
  amountCents: cents,
  spentOn: isoDate,
  categoryId: uuid,
  paymentMethod: z.enum(['pix', 'debito', 'credito', 'dinheiro']),
  accountId: uuid.nullable(),
  memberId: uuid,
  paid: z.boolean(),
};

export const expenseCreate = z
  .object({
    ...expenseFields,
    installments: z.number().int().min(1).max(120).optional(),
    recurring: z.boolean().optional(),
    // Recurring only: the first charge has its own amount and the monthly charges start at nextOn.
    firstAmountCents: cents.optional(),
    nextOn: isoDate.optional(),
    rawText: z.string().max(1000).nullable().optional(),
  })
  .refine((v) => !(v.recurring && (v.installments ?? 1) > 1), 'Parcelado não pode ser recorrente')
  .refine((v) => (v.firstAmountCents === undefined) === (v.nextOn === undefined), 'Informe o valor e a data da primeira cobrança')
  .refine((v) => !v.nextOn || v.recurring, 'Primeira cobrança diferente só vale para recorrentes')
  .refine(
    (v) => !v.nextOn || v.nextOn.slice(0, 7) > v.spentOn.slice(0, 7),
    'As mensalidades precisam começar depois do mês da primeira cobrança',
  );

export const expenseUpdate = z
  .object({
    ...expenseFields,
    applyToFuture: z.boolean().optional(),
    recurring: z.boolean().optional(),
    // Turning a plain expense into installments: this one becomes the first and amountCents is the total.
    installments: z.number().int().min(1).max(120).optional(),
    // Turning a plain expense into recurring: this expense is the first charge, the monthly ones start at nextOn.
    firstAmountCents: cents.optional(),
    nextOn: isoDate.optional(),
  })
  .refine((v) => !(v.recurring && (v.installments ?? 1) > 1), 'Parcelado não pode ser recorrente')
  .refine((v) => (v.firstAmountCents === undefined) === (v.nextOn === undefined), 'Informe o valor e a data da primeira cobrança')
  .refine((v) => !v.nextOn || v.recurring, 'Primeira cobrança diferente só vale para recorrentes')
  .refine(
    (v) => !v.nextOn || v.nextOn.slice(0, 7) > v.spentOn.slice(0, 7),
    'As mensalidades precisam começar depois do mês da primeira cobrança',
  );

const incomeFields = {
  description: text,
  amountCents: cents,
  receivedOn: isoDate,
  memberId: uuid.nullable(),
};

export const incomeCreate = z.object({ ...incomeFields, recurring: z.boolean().optional() });
export const incomeUpdate = z.object({
  ...incomeFields,
  applyToFuture: z.boolean().optional(),
  recurring: z.boolean().optional(),
});

const investmentFields = {
  description: text,
  amountCents: cents,
  investedOn: isoDate,
  memberId: uuid.nullable(),
};

export const investmentCreate = z.object({ ...investmentFields, recurring: z.boolean().optional() });
export const investmentUpdate = z.object({
  ...investmentFields,
  applyToFuture: z.boolean().optional(),
  recurring: z.boolean().optional(),
});

export const goalCents = z.number().int().min(0).max(100_000_000).nullable();

export const planUpdate = z.object({
  description: text,
  categoryId: uuid,
  paymentMethod: z.enum(['pix', 'debito', 'credito', 'dinheiro']),
  accountId: uuid.nullable(),
  memberId: uuid,
});

export const closingDay = z.number().int().min(1).max(31).nullable();
