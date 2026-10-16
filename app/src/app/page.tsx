import { Dashboard } from "../features/dashboard/dashboard";

export default function Home() {
  return <Dashboard chainEnabled={process.env.NEXT_PUBLIC_CHAIN_ENABLED === "true"} />;
}
