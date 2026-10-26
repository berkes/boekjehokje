/**
 * Calendar module
 *
 * Wraps the super-calendar board in our own component, so the rest of
 * the app can use it with our domain language (rooms and bookings) while
 * the third-party module stays isolated from our business logic
 * (anti-corruption layer) and remains easy to customize and swap out.
 */
export { CalendarView } from "./Calendar.tsx";
