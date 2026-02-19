import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type ProfilePreviewCardProps = {
  name: string;
  age: number;
  location: string;
  bio: string;
  verified?: boolean;
};

export function ProfilePreviewCard({ name, age, location, bio, verified }: ProfilePreviewCardProps) {
  return (
    <Card className="overflow-hidden">
      <div className="h-64 bg-velora-gradient" />
      <div className="space-y-3 p-5">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">{name}, {age}</h3>
          {verified ? <Badge tone="success">Verified</Badge> : null}
        </div>
        <p className="text-sm text-foreground/70">{location}</p>
        <p className="text-sm text-foreground/85">{bio}</p>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1">Pass</Button>
          <Button className="flex-1">Like</Button>
        </div>
      </div>
    </Card>
  );
}
