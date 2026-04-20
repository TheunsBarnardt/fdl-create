import { Card, CardContent } from '@/components/ui/card';

export function ComingSoon({ title, description, blueprint }: { title: string; description: string; blueprint: string }) {
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="display text-2xl">{title}</h1>
      <p className="text-sm text-muted-foreground mt-1">{description}</p>
      <Card className="mt-6">
        <CardContent className="p-6 space-y-3">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Blueprint</div>
          <div className="font-mono text-sm">{blueprint}</div>
          <p className="text-sm text-muted-foreground">
            This surface is scaffolded but the interactive canvas is not yet implemented. Build it with
            <code className="mx-1 font-mono text-xs bg-secondary px-1.5 py-0.5 rounded">/fdl-build</code>
            against <code className="font-mono text-xs bg-secondary px-1.5 py-0.5 rounded">blueprints/PLAN.md</code>.
          </p>
          <p className="text-xs text-muted-foreground">
            The design reference is <code className="font-mono text-xs">../../Work/ai-fdl-kit/docs/brainstorm/visual-cms/prototype.html</code>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
