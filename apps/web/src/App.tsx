import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Conflicts from "./pages/Conflicts";
import FormBuilder from "./pages/FormBuilder";
import FieldOperations from "./pages/FieldOperations";
import Home from "./pages/Home";
import Landing from "./pages/Landing";
import NotFound from "./pages/NotFound";
import Projects from "./pages/Projects";
import ReferenceData from "./pages/ReferenceData";
import SelectionTypes from "./pages/SelectionTypes";
import Spaces from "./pages/Spaces";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/app" component={Home} />
      <Route path="/spaces" component={Spaces} />
      <Route path="/superadmin" component={Spaces} />
      <Route path="/projects" component={Projects} />
      <Route path="/forms" component={FormBuilder} />
      <Route path="/field-operations" component={FieldOperations} />
      <Route path="/reference-data" component={ReferenceData} />
      <Route path="/selection-types" component={SelectionTypes} />
      <Route path="/conflicts" component={Conflicts} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
