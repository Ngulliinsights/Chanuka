import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";

export default function BillsDashboard() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Bills Dashboard</h1>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Legislative Bills</CardTitle>
            <CardDescription>
              Browse current and proposed legislation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Bills dashboard coming soon...</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
