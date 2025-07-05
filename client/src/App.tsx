import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "@/components/error-boundary";
import HomePage from './pages/home';
import Dashboard from "@/pages/dashboard";
import BillsDashboard from "@/pages/bills-dashboard";
import BillDetail from "@/pages/bill-detail";
import BillAnalysis from "@/pages/bill-analysis";
import BillSponsorshipAnalysis from "@/pages/bill-sponsorship-analysis";
import DatabaseManager from "@/pages/database-manager";
import ExpertVerification from "@/pages/expert-verification";
import AuthPage from "@/pages/auth-page";
import Profile from "@/pages/profile";
import Onboarding from "@/pages/onboarding";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/bills" component={BillsDashboard} />
      <Route path="/bills/:id" component={BillDetail} />
      <Route path="/bills/:id/analysis" component={BillAnalysis} />
      <Route path="/bills/:id/sponsorship" component={BillSponsorshipAnalysis} />
      <Route path="/database" component={DatabaseManager} />
      <Route path="/verification" component={ExpertVerification} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/profile" component={Profile} />
      <Route path="/onboarding" component={Onboarding} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;