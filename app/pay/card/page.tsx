import PayPage from "@/components/PayPage";

export default async function Page({ searchParams }: { searchParams: Promise<{ cancelled?: string }> }) {
  return <PayPage method="card" searchParams={await searchParams} />;
}
