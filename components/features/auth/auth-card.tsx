import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function AuthCard({ title, description, children }: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="gap-7 py-8 transition-colors focus-within:border-accent active:border-accent">
      <CardHeader className="gap-3 px-6 sm:px-8">
        <div className="mb-1 h-1 w-8 rounded-full bg-primary" aria-hidden="true" />
        <CardTitle className="text-2xl tracking-tight">{title}</CardTitle>
        <CardDescription className="leading-relaxed">{description}</CardDescription>
      </CardHeader>
      <CardContent className="px-6 sm:px-8">{children}</CardContent>
    </Card>
  );
}
