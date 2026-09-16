import { DivisionType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { computeBalances } from "@/lib/ledger";
import { accountCreateSchema } from "@/lib/schemas";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";

const DIVISIONS: DivisionType[] = [
  DivisionType.NEEDS,
  DivisionType.PLAY,
  DivisionType.INVESTMENT,
  DivisionType.SAVINGS,
];

function serializeAccount(
  account: {
    id: string;
    name: string;
    currency: "EUR" | "CHF";
    kind: string;
    sortOrder: number;
    divisions: { id: string; type: DivisionType }[];
  },
  balance?: {
    balance: string;
    divisions: { divisionId: string; balance: string }[];
  },
) {
  return {
    id: account.id,
    name: account.name,
    currency: account.currency,
    kind: account.kind,
    sortOrder: account.sortOrder,
    balance: balance?.balance ?? "0.0000",
    divisions: account.divisions.map((division) => {
      const divisionBalance = balance?.divisions.find(
        (d) => d.divisionId === division.id,
      );
      return {
        id: division.id,
        type: division.type,
        balance: divisionBalance?.balance ?? "0.0000",
      };
    }),
  };
}

export async function GET() {
  try {
    const [accounts, balances] = await Promise.all([
      prisma.account.findMany({
        where: { isActive: true },
        include: { divisions: { orderBy: { type: "asc" } } },
        orderBy: { sortOrder: "asc" },
      }),
      computeBalances(),
    ]);

    const balanceByAccount = new Map(balances.map((b) => [b.accountId, b]));

    return jsonOk(
      accounts.map((account) =>
        serializeAccount(account, balanceByAccount.get(account.id)),
      ),
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = accountCreateSchema.parse(await request.json());

    const maxSort = await prisma.account.aggregate({
      _max: { sortOrder: true },
    });
    const sortOrder = (maxSort._max.sortOrder ?? 0) + 1;

    const created = await prisma.account.create({
      data: {
        name: body.name,
        currency: body.currency,
        kind: body.kind,
        sortOrder,
        divisions: {
          create: DIVISIONS.map((type) => ({ type })),
        },
      },
      include: { divisions: { orderBy: { type: "asc" } } },
    });

    return jsonOk(serializeAccount(created), 201);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Unique constraint")
    ) {
      return jsonError("An account with this name already exists", 409);
    }
    return handleApiError(error);
  }
}
