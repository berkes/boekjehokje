/**
 * Permission service - public API
 */
export type {
  BookingSubject,
  PermissionAction,
  PermissionServicePort,
} from "./PermissionServicePort.ts";
export {
  PermissionService,
  type PermissionServiceDeps,
} from "./PermissionService.ts";
