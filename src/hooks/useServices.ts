/**
 * Service access hooks
 *
 * The single way components and other hooks get the services: through
 * these hooks, which read the service tree provided by ServicesProvider.
 * Components never construct or wire services themselves — the tree is
 * composed once in App.tsx and injected here.
 */

import { createContext, useContext } from "react";
import type {
  AuthenticationServicePort,
  CalendarServicePort,
  ClockPort,
  PermissionServicePort,
  PreferencesPort,
  Services,
} from "../services/index.ts";

/**
 * The services context, provided by ServicesProvider
 */
export const ServicesContext = createContext<Services | undefined>(undefined);

/**
 * Access the whole service tree
 */
export function useServices(): Services {
  const services = useContext(ServicesContext);
  if (services === undefined) {
    throw new Error("useServices must be used within a ServicesProvider");
  }
  return services;
}

/**
 * Access the authentication service
 */
export function useAuthenticationService(): AuthenticationServicePort {
  return useServices().authentication;
}

/**
 * Access the calendar service
 */
export function useCalendarService(): CalendarServicePort {
  return useServices().calendar;
}

/**
 * Access the permission service
 */
export function usePermissionService(): PermissionServicePort {
  return useServices().permissions;
}

/**
 * Access the clock
 */
export function useClock(): ClockPort {
  return useServices().clock;
}

/**
 * Access the preferences service
 */
export function usePreferences(): PreferencesPort {
  return useServices().preferences;
}
