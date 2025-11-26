// src/RouteComponent.tsx
import { useAutoLogout } from "./hooks/useAutoLogout";

interface IRouteProps {
  component: React.ElementType;
  layout?: React.ElementType;
}

const RouteComponent = ({ component: Component, layout: Layout }: IRouteProps) => {
  // Auto-logout logic (MSAL / token expiry)
  useAutoLogout();

  const content = <Component />;

  return Layout ? <Layout>{content}</Layout> : content;
};

export default RouteComponent;
