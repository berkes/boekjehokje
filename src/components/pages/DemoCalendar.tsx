/**
 * Demo calendar page
 *
 * Reachable on /demo but not linked anywhere. Renders exactly the same
 * calendar as the real page, but with the calendar service composed over
 * the DemoCalendarRepositoryAdapter: a complete, realistic week of demo
 * data for every room, with one overlapping pair and one editable booking
 * by the logged-in user per weekday. A place to review and screenshot all
 * calendar features without touching the live NYMA calendar. Without a
 * logged-in user the demo bookings are all read-only.
 */
import Box from "@mui/material/Box";
import React, { useMemo } from "react";
import { ServicesProvider } from "../../hooks/ServicesProvider.tsx";
import { useServices } from "../../hooks/useServices.ts";
import { useSession } from "../../hooks/useSession.tsx";
import { CalendarView } from "../calendar/index.ts";
import {
  CalendarService,
  DemoCalendarRepositoryAdapter,
  type Services,
} from "../../services/index.ts";

/**
 * Demo calendar: the real calendar view with demo data, served for the
 * logged-in user
 */
export function DemoCalendar(): React.JSX.Element {
  const { user } = useSession();
  const services = useServices();

  /**
   * A subset of the service tree with the calendar service composed over
   * the demo event repository: same permission service and clock, demo
   * data instead of Google Calendar
   */
  const demoServices = useMemo<Services>(() => {
    const events = new DemoCalendarRepositoryAdapter({
      user,
      clock: services.clock,
    });
    return {
      ...services,
      calendar: new CalendarService({
        events,
        permissions: services.permissions,
        clock: services.clock,
        eventFormat: services.eventFormat,
        rooms: services.rooms,
      }),
    };
  }, [services, user]);

  return (
    <Box>
      <ServicesProvider services={demoServices}>
        <CalendarView />
      </ServicesProvider>
    </Box>
  );
}
