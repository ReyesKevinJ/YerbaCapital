import { notFound } from "next/navigation";
import { PublicLot } from "../../../features/public-lot/public-lot";
import { validIdentifier } from "../../../features/public-lot/identifier";

export default async function PublicLotPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params; if (!validIdentifier(id)) notFound();
  const query = await searchParams;
  const registry = process.env.NEXT_PUBLIC_REGISTRY_ID; const vault = process.env.NEXT_PUBLIC_VAULT_ID;
  const mismatch = (query.registry !== undefined && query.registry !== registry) || (query.vault !== undefined && query.vault !== vault);
  return <PublicLot id={id} enabled={process.env.NEXT_PUBLIC_CHAIN_ENABLED === "true"} mismatch={mismatch} registry={registry} vault={vault} />;
}
