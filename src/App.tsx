import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import ExpertVerification from './pages/expert-verification';
import CommunityInput from './pages/community-input';
import Profile from './pages/profile';
import AuthPage from './pages/auth-page';
import Onboarding from './pages/onboarding';
import NotFound from './pages/not-found';

function App() {
  return (
    <Router>
      <Switch>
        <Route exact path="/" component={Onboarding} />
        <Route path="/expert-verification" component={ExpertVerification} />
        <Route path="/community-input" component={CommunityInput} />
        <Route path="/profile" component={Profile} />
        <Route path="/auth" component={AuthPage} />
        <Route path="/onboarding" component={Onboarding} />
        <Route component={NotFound} />
      </Switch>
    </Router>
  );
}

export default App;