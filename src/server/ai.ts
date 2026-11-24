import Anthropic from '@anthropic-ai/sdk';
import { AnthropicBedrock } from '@anthropic-ai/bedrock-sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { StatusError } from 'expo-server';
import { z } from 'zod';

import { isIsoDate, today } from '@/shared/dates';
import type { Draft, Lookups, PaymentMethod } from '@/shared/types';

// Anthropic API (Claude Haiku 5.5) when ANTHROPIC_API_KEY is set; otherwise the Bedrock API key
// already used by the prospeccao project, whose AWS account only has Claude Haiku 4.5.
function getClient() {
  if (process.env.ANTHROPIC_API_KEY) {
    return {
      client: new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 1, timeout: 20_000 }),
      model: 'claude-haiku-5-5',
      effort: { effort: 'low' as const },
    };
  }
  if (process.env.AWS_BEARER_TOKEN_BEDROCK) {
    return {
      client: new AnthropicBedrock({
        apiKey: process.env.AWS_BEARER_TOKEN_BEDROCK,
        awsRegion: process.env.AWS_REGION ?? 'us-east-1',
        maxRetries: 1,
        timeout: 20_000,
      }),
      model: process.env.BEDROCK_MODEL_ID ?? 'us.anthropic.claude-haiku-4-5-20251001-v1:0',
      effort: {},
    };
  }
  throw new StatusError(503, 'IA não configurada (falta ANTHROPIC_API_KEY ou AWS_BEARER_TOKEN_BEDROCK)');
}

const SYSTEM = `Você transforma frases curtas em português sobre dinheiro em um lançamento estruturado de um app de finanças de uma casa (casal ou família).

Regras:
- kind: "income" quando a pessoa recebeu dinheiro (salário, pix recebido, venda); senão "expense".
- description: nome curto e limpo do item, com inicial maiúscula (ex.: "Salgado", "Uber", "Mercado").
- amount_reais: o valor em REAIS exatamente como aparece na frase, como número decimal (nunca em centavos). "10 reais" = 10, "R$ 47,90" = 47.9, "2000 em 12x" = 2000, "10x de 439,90" = 439.9, "1.500" = 1500.
- amount_is_installment: true SOMENTE quando a frase diz explicitamente o valor de cada parcela ("10x de 439,90", "10 parcelas de 439,90"). Valor seguido de "em Nx" é o TOTAL da compra: "1000 em 12x" e "comprei por 2000 em 10x" são false. À vista também é false. Na dúvida, false.
- installments: número de parcelas quando a compra for parcelada ("em 10x", "parcelei em 3"); senão null.
- date: data no formato AAAA-MM-DD. Interprete "hoje", "ontem", "anteontem", dias da semana e "dia 11" (mês atual, ou o anterior se ainda não chegou) a partir da data de hoje informada. Sem data na frase, use hoje.
- category, account, member, payment_method: escolha somente entre as opções listadas. Se não der para deduzir, use null. Não invente.
- Cartão de crédito citado ("no nubank", "no crédito") implica payment_method "credito", salvo se a frase disser pix ou débito.
- "pf" e "pj" (pessoa física / jurídica) na frase, com ou sem nome, indicam o cartão/conta: "lanche pf manu" = conta "... PF ..." da Manu. Escolha a conta cujo nome combina (ex.: "Nubank PF Manu") e use o dono dela como member.
- member é quem gastou ou recebeu. "do Luiz", "da Manu", "eu" (= quem está escrevendo) indicam a pessoa.`;

function buildSchema(lookups: Lookups) {
  const names = (items: { name: string }[]) => {
    const unique = [...new Set(items.map((i) => i.name))];
    return unique.length ? z.enum(unique as [string, ...string[]]).nullable() : z.null();
  };
  return z.object({
    kind: z.enum(['expense', 'income']),
    description: z.string(),
    amount_reais: z.number().nullable(),
    amount_is_installment: z.boolean(),
    installments: z.number().int().nullable(),
    date: z.string(),
    category: names(lookups.categories.filter((c) => !c.archived)),
    payment_method: z.enum(['pix', 'debito', 'credito', 'dinheiro']).nullable(),
    account: names(lookups.accounts.filter((a) => !a.archived)),
    member: names(lookups.members),
  });
}

function weekday(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d)));
}

// The model sometimes flags "1000 em 12x" as a per-installment amount, so trust explicit wording first:
// "12x de 83,33" / "12 parcelas de 83,33" = per installment; "1000 em 12x" / "1000 parcelado em 12" = total.
export function amountIsInstallment(text: string, modelGuess: boolean): boolean {
  const t = text.toLowerCase();
  if (/\d+\s*(x|vezes|parcelas?)\s*de\s*(r\$\s*)?\d/.test(t)) return true;
  if (/\bem\s*\d+\s*(x|vezes|parcelas?)\b|parcel\w*\s*em\s*\d+/.test(t)) return false;
  return modelGuess;
}

export async function parseEntry(text: string, lookups: Lookups): Promise<Draft> {
  const { client, model, effort } = getClient();
  const now = today();
  const activeCategories = lookups.categories.filter((c) => !c.archived);
  const activeAccounts = lookups.accounts.filter((a) => !a.archived);
  const context = [
    `Hoje: ${now} (${weekday(now)})`,
    `Quem está escrevendo: ${lookups.me.name}`,
    `Pessoas: ${lookups.members.map((m) => m.name).join(', ')}`,
    `Categorias: ${activeCategories.map((c) => c.name).join(', ')}`,
    `Cartões/contas: ${activeAccounts
      .map((a) => {
        const owner = lookups.members.find((m) => m.id === a.ownerMemberId)?.name;
        return owner ? `${a.name} (de ${owner})` : a.name;
      })
      .join(', ')}`,
  ].join('\n');

  let response;
  try {
    response = await client.messages.parse({
      model,
      max_tokens: 2048,
      output_config: { ...effort, format: zodOutputFormat(buildSchema(lookups)) },
      system: SYSTEM,
      messages: [{ role: 'user', content: `${context}\n\nFrase: ${text}` }],
    });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) throw new StatusError(429, 'IA ocupada, tente de novo em instantes');
    if (error instanceof Anthropic.APIError) throw new StatusError(502, 'A IA não respondeu, tente de novo');
    throw error;
  }

  if (response.stop_reason === 'refusal' || !response.parsed_output) {
    throw new StatusError(422, 'Não entendi, tente escrever de outro jeito');
  }
  const out = response.parsed_output;
  const byName = <T extends { id: string; name: string }>(items: T[], name: string | null) =>
    name ? (items.find((i) => i.name === name)?.id ?? null) : null;

  const accountId = byName(activeAccounts, out.account);
  let paymentMethod: PaymentMethod | null = out.payment_method;
  if (!paymentMethod && accountId) paymentMethod = 'credito';

  const installments = out.installments && out.installments > 1 ? Math.min(out.installments, 120) : null;
  const amount = out.amount_reais && out.amount_reais > 0 ? Math.round(out.amount_reais * 100) : null;
  const total = amount && installments && amountIsInstallment(text, out.amount_is_installment) ? amount * installments : amount;

  return {
    kind: out.kind,
    description: out.description.trim() || text.trim().slice(0, 60),
    amountCents: total,
    date: isIsoDate(out.date) ? out.date : now,
    categoryId: byName(activeCategories, out.category),
    paymentMethod,
    accountId,
    memberId: byName(lookups.members, out.member) ?? lookups.me.id,
    installments,
    rawText: text,
  };
}

const MAX_ENTRIES = 10;

// Several entries in one text, separated by ";". One parse per piece so each keeps its own raw text.
export async function parseEntries(text: string, lookups: Lookups): Promise<Draft[]> {
  const parts = text
    .split(';')
    .map((p) => p.trim())
    .filter((p) => p.length >= 2);
  if (!parts.length) throw new StatusError(422, 'Não entendi, tente escrever de outro jeito');
  if (parts.length > MAX_ENTRIES) throw new StatusError(422, `No máximo ${MAX_ENTRIES} lançamentos por vez`);

  const results = await Promise.allSettled(parts.map((part) => parseEntry(part, lookups)));
  const firstError = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
  if (firstError && results.every((r) => r.status === 'rejected')) throw firstError.reason;

  // A piece the AI could not read comes back empty (amount missing) so it can be fixed by hand.
  return results.map((r, i) =>
    r.status === 'fulfilled'
      ? r.value
      : {
          kind: 'expense',
          description: parts[i].slice(0, 60),
          amountCents: null,
          date: today(),
          categoryId: null,
          paymentMethod: null,
          accountId: null,
          memberId: lookups.me.id,
          installments: null,
          rawText: parts[i],
        },
  );
}
