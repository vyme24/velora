import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type PricingCardProps = {
  title: string;
  price: string;
  features: string[];
  highlighted?: boolean;
  badge?: string;
};

export function PricingCard({ title, price, features, highlighted, badge }: PricingCardProps) {
  return (
    <Card className={highlighted ? "border-primary/40 bg-gradient-to-b from-primary/15 to-primary/5" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          {badge ? <Badge>{badge}</Badge> : null}
        </div>
        <p className="mt-2 text-3xl font-semibold">{price}</p>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm text-foreground/80">
          {features.map((feature) => (
            <li key={feature}>• {feature}</li>
          ))}
        </ul>
        <Button className="mt-5 w-full">Choose {title}</Button>
      </CardContent>
    </Card>
  );
}
