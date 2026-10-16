import { Dashboard } from "../../features/dashboard/dashboard";

export default function Investors() {
  return <Dashboard initialRole="lender" chainEnabled={process.env.NEXT_PUBLIC_CHAIN_ENABLED === "true"} />;
}
