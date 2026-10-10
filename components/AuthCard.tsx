import LegalLinks from "@/components/LegalLinks";

export default function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-card border border-line bg-surface p-8 sm:p-10">
        <h1 className="text-center text-3xl font-black tracking-tight">
          {title}
        </h1>
        <p className="mt-2 text-center text-sm text-muted">{subtitle}</p>
        <div className="mt-8">{children}</div>
      </div>
      <LegalLinks className="mt-6" />
    </main>
  );
}
