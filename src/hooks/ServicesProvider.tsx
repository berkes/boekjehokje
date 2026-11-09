/**
 * Services provider
 *
 * Provides the service tree (built once by the composition root in
 * App.tsx) through React context. The provider is dumb: it only hands the
 * tree down; the hooks in useServices.ts give components typed access, and
 * the domain hooks (useSession, useCalendar) manage the services' results
 * as React state.
 */

import type { ReactNode } from "react";
import type { Services } from "../services/index.ts";
import { ServicesContext } from "./useServices.ts";

/** Props for ServicesProvider */
interface ServicesProviderProps {
  /** The service tree, composed in App.tsx */
  services: Services;
  children: ReactNode;
}

/**
 * Provides the service tree to the tree below
 */
export function ServicesProvider(
  { services, children }: ServicesProviderProps,
): React.JSX.Element {
  return (
    <ServicesContext.Provider value={services}>
      {children}
    </ServicesContext.Provider>
  );
}
