/**
 * Hooks - public API
 *
 * The React bridge layer: providers and hooks. Components reach the
 * services only through these hooks; the services' results are managed
 * here as React state.
 */
export { ServicesProvider } from "./ServicesProvider.tsx";
export { useGoogleLoginFlow } from "./useGoogleLoginFlow.ts";
export {
  useAuthenticationService,
  useCalendarService,
  useClock,
  useEventFormatService,
  useOverlapsService,
  usePermissionService,
  usePreferences,
  useRoomsService,
  useServices,
} from "./useServices.ts";
export { SessionProvider, useSession } from "./useSession.tsx";
export { useCalendar, type UseCalendarReturn } from "./useCalendar.ts";
export { toggleHiddenRoom, visibleRooms } from "./roomVisibility.ts";
export { type RoomVisibility, useRoomVisibility } from "./useRoomVisibility.ts";
