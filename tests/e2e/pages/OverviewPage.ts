import { expect, type Locator, type Page } from "@playwright/test";
import { SettingsPage } from "./SettingsPage.ts";

/**
 * The rooms of the makersplaats and their column headers on the board.
 */
const ROOM_COLUMNS: Readonly<Record<string, string>> = {
  "Kletshok 03": "KH 03",
  "Kletshok 04": "KH 04",
  "Kletshok 05": "KH 05",
  "Stilteruimte": "Stilteruimte",
  "Tuinkamer": "TK",
  "Vergaderruimte C3": "VG C3",
};

/**
 * The group that collects bookings without a matching room.
 */
const UNMATCHED_GROUP = "Unknown";

/**
 * Geometry of the board's time axis: the first hour shown and the
 * pixels per hour, so tests can click the lane at a concrete time.
 */
const START_HOUR = 8;
const HOUR_HEIGHT_PX = 48;

/**
 * The booking form as it opens from a selected free slot.
 */
interface BookingFormValues {
  /** Room shown in the select, e.g. "Kletshok 03 (KH 03)" */
  room: string;
  /** Value of the "Van" field, e.g. "2026-10-28T10:00" */
  from: string;
  /** Value of the "Tot" field */
  to: string;
  /** Value of the read-only "Boeker" field */
  booker: string;
  /** Value of the read-only "Samenvatting" preview */
  summary: string;
}

/**
 * A write request (POST/PATCH/DELETE) the app sent to the calendar
 * events endpoint, with its JSON body as the calendar API receives it.
 */
interface CalendarWrite {
  method: string;
  /** Decoded request path, e.g. "/calendar/v3/calendars/x/events/evt-1" */
  path: string;
  body: unknown;
}

/**
 * The week overview: the board with the room columns, the bookings, the
 * day toolbar and the booking details.
 *
 * Tests pass the concrete rooms, bookings and labels they expect; the
 * page objects know how the app shows them: the selectors, the terms of
 * the details list, the shapes of the labels.
 */
export class OverviewPage {
  private readonly page: Page;
  /**
   * The write requests (POST/PATCH/DELETE on .../events) seen so far,
   * with their parsed JSON bodies (DELETE carries none).
   */
  private readonly calendarWrites: CalendarWrite[] = [];

  constructor(page: Page) {
    this.page = page;
    page.on("request", (request) => {
      const method = request.method();
      if (method !== "POST" && method !== "PATCH" && method !== "DELETE") {
        return;
      }
      if (
        !/\/calendars\/[^/]+\/events(\/[^/?]+)?$/.test(
          new URL(request.url()).pathname,
        )
      ) {
        return;
      }
      let body: unknown = null;
      try {
        body = request.postDataJSON();
      } catch {
        body = null;
      }
      this.calendarWrites.push({
        method,
        path: decodeURIComponent(new URL(request.url()).pathname),
        body,
      });
    });
  }

  /**
   * Open the week overview.
   */
  async goto(): Promise<this> {
    await this.page.goto("/");
    await expect(this.toolbar().or(this.errorState())).toBeVisible();
    return this;
  }

  /**
   * Move the board one day forward.
   */
  async nextDay(): Promise<this> {
    await this.page.getByRole("button", { name: "Volgende" }).click();
    return this;
  }

  /**
   * Move the board one day back.
   */
  async previousDay(): Promise<this> {
    await this.page.getByRole("button", { name: "Vorige" }).click();
    return this;
  }

  /**
   * Move the board back to today.
   */
  async goToToday(): Promise<this> {
    await this.page.getByRole("button", { name: "Vandaag" }).click();
    return this;
  }

  /**
   * Hide a room's column and its bookings.
   */
  async hideRoom(room: string): Promise<this> {
    await this.roomChip(room).click();
    return this;
  }

  /**
   * Show a hidden room's column and bookings again.
   */
  async showRoom(room: string): Promise<this> {
    await this.roomChip(room).click();
    return this;
  }

  /**
   * Hide the group of bookings without a matching room.
   */
  async hideUnmatchedBookings(): Promise<this> {
    await this.roomChip(UNMATCHED_GROUP).click();
    return this;
  }

  /**
   * Open the details of the given booking.
   */
  async openBookingDetails(booking: string): Promise<this> {
    await this.bookingBar(booking).click();
    await expect(this.detailsTerm("Beschrijving")).toBeVisible();
    return this;
  }

  /**
   * Close the booking details.
   */
  async closeBookingDetails(): Promise<this> {
    await this.page.getByRole("button", { name: "Sluiten" }).click();
    return this;
  }

  /**
   * Try loading the overview again after an error.
   */
  async retryLoading(): Promise<this> {
    await this.page.getByRole("button", { name: "Opnieuw proberen" }).click();
    await expect(this.toolbar()).toBeVisible();
    return this;
  }

  /**
   * Continue to the settings page through the profile menu.
   */
  async openSettingsViaProfileMenu(): Promise<SettingsPage> {
    await this.page.getByRole("button", { name: "Instellingen openen" })
      .click();
    await this.page.getByRole("menuitem", { name: "Mijn account" }).click();
    return await new SettingsPage(this.page).waitUntilOpen();
  }

  /**
   * Assert every room of the makersplaats appears on the board.
   */
  async assertShowsAllRooms(): Promise<void> {
    for (const room of Object.keys(ROOM_COLUMNS)) {
      await this.assertShowsRoom(room);
    }
  }

  /**
   * Assert a room appears on the board.
   */
  async assertShowsRoom(room: string): Promise<void> {
    const column = this.roomColumn(room);
    if (column !== null) {
      await expect(column).toBeVisible();
    } else {
      await expect(this.roomChip(room)).toBeVisible();
    }
  }

  /**
   * Assert a booking is on the board.
   */
  async assertShowsBooking(booking: string): Promise<void> {
    await expect(this.bookingBar(booking)).toBeVisible();
  }

  /**
   * Assert a booking is not on the board.
   */
  async assertShowsNoBooking(booking: string): Promise<void> {
    await expect(this.bookingBar(booking)).toHaveCount(0);
  }

  /**
   * Assert a room's column and bookings are gone from the board.
   */
  async assertRoomIsHidden(room: string): Promise<void> {
    const column = this.roomColumn(room);
    if (column !== null) {
      await expect(column).toBeHidden();
    }
    await expect(this.bookingsOfRoom(room)).toHaveCount(0);
  }

  /**
   * Assert a room's column and bookings are on the board.
   */
  async assertRoomIsVisible(room: string): Promise<void> {
    const column = this.roomColumn(room);
    if (column !== null) {
      await expect(column).toBeVisible();
    }
    await expect(this.bookingsOfRoom(room).first()).toBeVisible();
  }

  /**
   * Assert the board shows the given day.
   */
  async assertShowsDay(label: string): Promise<void> {
    await expect(this.dayLabel()).toHaveText(label);
  }

  /**
   * Assert the overview shows its error state.
   */
  async assertShowsError(): Promise<void> {
    await expect(this.errorState()).toBeVisible();
    await expect(
      this.page.getByRole("button", { name: "Opnieuw proberen" }),
    ).toBeVisible();
  }

  /**
   * Assert the group of bookings without a matching room is on the
   * board, set apart from the named rooms.
   */
  async assertShowsUnmatchedGroup(): Promise<void> {
    await expect(this.unmatchedGroup()).toHaveCount(2);
  }

  /**
   * Assert the group of unmatched bookings is hidden from the board.
   */
  async assertUnmatchedGroupIsHidden(): Promise<void> {
    await expect(this.unmatchedGroup()).toHaveCount(1);
  }

  /**
   * Assert the details describe the given booking.
   */
  async assertDetailsDescribe(booking: string): Promise<void> {
    await expect(this.detailsTerm("Beschrijving")).toBeVisible();
    await expect(this.page.getByText(booking)).toBeVisible();
  }

  /**
   * Assert the details show who made the booking.
   */
  async assertShowsBooker(name: string, email: string): Promise<void> {
    await expect(this.detailsTerm("Door")).toBeVisible();
    await expect(this.page.getByText(`${name} <${email}>`)).toBeVisible();
    await expect(
      this.page.getByRole("heading", { name: new RegExp(name) }),
    ).toBeVisible();
  }

  /**
   * Assert the details show the room of the booking.
   */
  async assertShowsRoomOfBooking(
    room: string,
    shortName: string,
  ): Promise<void> {
    await expect(this.detailsTerm("Ruimte")).toBeVisible();
    await expect(this.page.getByText(`${room} (${shortName})`)).toBeVisible();
  }

  /**
   * Assert the details show how long the booking lasts.
   */
  async assertShowsDuration(duration: string): Promise<void> {
    await expect(this.detailsTerm("Duur")).toBeVisible();
    await expect(this.page.getByText(duration)).toBeVisible();
  }

  /**
   * Assert the booking details are closed.
   */
  async assertBookingDetailsAreClosed(): Promise<void> {
    await expect(this.detailsTerm("Beschrijving")).toBeHidden();
  }

  /**
   * Assert a booking offers to edit and delete.
   */
  async assertBookingIsEditable(booking: string): Promise<void> {
    const bar = this.bookingBar(booking);
    await expect(bar).toBeVisible();
    await expect(bar.getByRole("button", { name: "edit" })).toBeVisible();
    await expect(bar.getByRole("button", { name: "delete" })).toBeVisible();
  }

  /**
   * Assert a booking offers details only.
   */
  async assertBookingIsReadOnly(booking: string): Promise<void> {
    const bar = this.bookingBar(booking);
    await expect(bar).toBeVisible();
    await expect(bar.getByRole("button", { name: "info" })).toBeVisible();
    await expect(bar.getByRole("button", { name: "edit" })).toBeHidden();
    await expect(bar.getByRole("button", { name: "delete" })).toBeHidden();
  }

  /**
   * Click a free slot in a room's column at the given time ("HH:mm").
   */
  async clickFreeSlot(room: string, at: string): Promise<this> {
    const point = await this.slotPoint(room, at);
    await this.page.mouse.click(point.x, point.y);
    return this;
  }

  /**
   * Drag a free range in a room's column, from "HH:mm" to "HH:mm".
   */
  async dragFreeRange(room: string, from: string, to: string): Promise<this> {
    const start = await this.slotPoint(room, from);
    const end = await this.slotPoint(room, to);
    await this.page.mouse.move(start.x, start.y);
    await this.page.mouse.down();
    await this.page.mouse.move(end.x, end.y, { steps: 8 });
    await this.page.mouse.up();
    return this;
  }

  /**
   * Assert the create booking form is open with the given pre-filled values.
   */
  async assertBookingFormIsOpen(values: BookingFormValues): Promise<void> {
    await this.assertFormIsOpen("Nieuwe boeking", values);
  }

  /**
   * Assert the edit form is open, prefilled with the booking's values.
   */
  async assertEditFormIsOpen(values: BookingFormValues): Promise<void> {
    await this.assertFormIsOpen("Boeking bewerken", values);
  }

  /**
   * Assert the form with the given title is open with the given values.
   */
  private async assertFormIsOpen(
    title: string,
    values: BookingFormValues,
  ): Promise<void> {
    await expect(this.page.getByRole("heading", { name: title })).toBeVisible();
    await expect(this.roomSelect()).toHaveText(values.room);
    await expect(this.page.getByLabel("Van")).toHaveValue(values.from);
    await expect(this.page.getByLabel("Tot")).toHaveValue(values.to);
    const booker = this.page.getByLabel("Boeker");
    await expect(booker).toHaveValue(values.booker);
    await expect(booker).toBeDisabled();
    const summary = this.page.getByLabel("Samenvatting");
    await expect(summary).toHaveValue(values.summary);
    await expect(summary).not.toBeEditable();
  }

  /**
   * Assert the room select offers exactly the given room labels
   * ("full name (short name)"), without the Unknown group.
   */
  async assertRoomOptions(labels: string[]): Promise<void> {
    await this.roomSelect().click();
    const options = this.page.getByRole("option");
    await expect(options).toHaveCount(labels.length);
    for (const label of labels) {
      await expect(this.page.getByRole("option", { name: label }))
        .toBeVisible();
    }
    await expect(
      this.page.getByRole("option", { name: /Unknown/ }),
    ).toHaveCount(0);
    await this.page.keyboard.press("Escape");
  }

  /**
   * Pick another room in the booking form's select.
   */
  async selectRoom(label: string): Promise<this> {
    await this.roomSelect().click();
    await this.page.getByRole("option", { name: label }).click();
    return this;
  }

  /**
   * Fill the contact field of the booking form.
   */
  async fillContact(contact: string): Promise<this> {
    await this.page.getByLabel("Contact").fill(contact);
    return this;
  }

  /**
   * Confirm the create booking form.
   */
  async submitBookingForm(): Promise<this> {
    await this.page.getByRole("button", { name: "Boeking aanmaken" }).click();
    return this;
  }

  /**
   * Confirm the edit form.
   */
  async submitEditForm(): Promise<this> {
    await this.page.getByRole("button", { name: "Boeking bijwerken" }).click();
    return this;
  }

  /**
   * Click the edit icon of a booking's bar on the board.
   */
  async clickEditOn(booking: string): Promise<this> {
    await this.bookingBar(booking).getByRole("button", { name: "edit" })
      .click();
    return this;
  }

  /**
   * Click the delete icon of a booking's bar on the board.
   */
  async clickDeleteOn(booking: string): Promise<this> {
    await this.bookingBar(booking).getByRole("button", { name: "delete" })
      .click();
    return this;
  }

  /**
   * Assert the booking form is closed.
   */
  async assertBookingFormIsClosed(): Promise<void> {
    await expect(this.bookingFormTitle()).toBeHidden();
  }

  /**
   * Assert the form shows an alert (MUI Alert, role="alert") matching the
   * given text.
   */
  private async assertAlertIsShown(pattern: RegExp): Promise<void> {
    await expect(
      this.page.getByRole("alert").filter({ hasText: pattern }),
    ).toBeVisible();
  }

  /**
   * Assert the form warns in an alert that there is no five-minute margin
   * to an adjacent booking (ADR-0006: encouraged, never enforced).
   */
  async assertMarginWarningIsShown(): Promise<void> {
    await this.assertAlertIsShown(
      /geen 5 minuten tussen deze en een aansluitende boeking/i,
    );
  }

  /**
   * Assert the form warns in an alert that the range overlaps the named
   * bookings (issue #16: overlaps are warned about, never blocked).
   */
  async assertOverlapWarningIsShown(...bookingNames: string[]): Promise<void> {
    const names = bookingNames.map((name) =>
      `"${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`
    ).join(", ");
    await this.assertAlertIsShown(new RegExp(`overlapt met ${names}`));
  }

  /**
   * Assert a free-slot block conflicting with an existing booking is
   * marked in a room's lane (issue #16).
   */
  async assertConflictSlotIsShownIn(room: string): Promise<void> {
    await expect(
      this.page.locator(
        `[data-resource-id="${room}"] [data-slot-conflict="true"]`,
      ),
    ).toHaveCount(1);
  }

  /**
   * Assert the given number of booking bars in a room's lane are marked
   * as conflicting with another booking (issue #16).
   */
  async assertConflictBookingsIn(room: string, count: number): Promise<void> {
    await expect(
      this.page.locator(
        `[data-resource-id="${room}"] [data-booking-conflict="true"]`,
      ),
    ).toHaveCount(count);
  }

  /**
   * The bookable free-slot blocks ("Nu boeken") painted in a room's lane.
   */
  async assertFreeSlotCount(room: string, count: number): Promise<void> {
    await expect(this.freeSlotBlocks(room)).toHaveCount(count);
  }

  /**
   * Assert the selected free-slot block is highlighted in a room's lane.
   */
  async assertSelectedSlotIsHighlighted(room: string): Promise<void> {
    await expect(
      this.page.locator(
        `[data-resource-id="${room}"] [data-slot-selected="true"]`,
      ),
    ).toHaveCount(1);
  }

  /**
   * Assert a preview block (the form's current draft) is shown in a room's
   * lane.
   */
  async assertPreviewSlotIsShownIn(room: string): Promise<void> {
    await expect(
      this.page.locator(
        `[data-resource-id="${room}"] [data-slot-preview="true"]`,
      ),
    ).toHaveCount(1);
  }

  /**
   * Assert no preview block is shown in a room's lane.
   */
  async assertNoPreviewSlotIn(room: string): Promise<void> {
    await expect(
      this.page.locator(
        `[data-resource-id="${room}"] [data-slot-preview="true"]`,
      ),
    ).toHaveCount(0);
  }

  /**
   * Assert no preview block is shown anywhere on the board.
   */
  async assertNoPreviewSlotAnywhere(): Promise<void> {
    await expect(this.page.locator('[data-slot-preview="true"]')).toHaveCount(
      0,
    );
  }

  /**
   * Assert all free-slot blocks in a room's lane are disabled.
   */
  async assertAllSlotsDisabled(room: string): Promise<void> {
    const total = await this.freeSlotBlocks(room).count();
    await expect(
      this.page.locator(
        `[data-resource-id="${room}"] [data-slot-disabled="true"]`,
      ),
    ).toHaveCount(total);
  }

  /**
   * Assert no free-slot block in a room's lane is disabled.
   */
  async assertNoSlotIsDisabled(room: string): Promise<void> {
    await expect(
      this.page.locator(
        `[data-resource-id="${room}"] [data-slot-disabled="true"]`,
      ),
    ).toHaveCount(0);
  }

  /**
   * Assert the form warns in an alert that the booking is very long
   * (> 3 hours).
   */
  async assertLongBookingWarningIsShown(): Promise<void> {
    await this.assertAlertIsShown(/deze boeking is erg lang/i);
  }

  /**
   * Assert the form shows an error alert that Van must be before Tot.
   */
  async assertInvertedRangeWarningIsShown(): Promise<void> {
    await this.assertAlertIsShown(/Van moet vóór Tot liggen/i);
  }

  /**
   * Assert the confirm button is enabled.
   */
  async assertSubmitIsEnabled(): Promise<void> {
    await expect(
      this.page.getByRole("button", { name: "Boeking aanmaken" }),
    ).toBeEnabled();
  }

  /**
   * Click the free-slot block at the given index in a room's lane.
   */
  async clickFreeSlotBlock(room: string, index: number): Promise<this> {
    await this.freeSlotBlocks(room).nth(index).click();
    return this;
  }

  /**
   * Set a datetime field of the booking form ("Van" or "Tot").
   */
  async setDateTime(label: "Van" | "Tot", value: string): Promise<this> {
    await this.page.getByLabel(label).fill(value);
    return this;
  }

  /**
   * Assert the confirm button is disabled.
   */
  async assertSubmitIsDisabled(): Promise<void> {
    await expect(
      this.page.getByRole("button", { name: "Boeking aanmaken" }),
    ).toBeDisabled();
  }

  /**
   * Assert the app wrote a booking event to the calendar API with these
   * values, in the standardized event format (summary "short name |
   * booker", contact in the description, RFC 3339 start/end).
   */
  async assertBookingWasWritten(expected: {
    method?: string;
    /** Event id the write targets (in the request path), when known */
    eventId?: string;
    summary: string;
    description?: string;
    start: string;
    end: string;
  }): Promise<void> {
    await expect.poll(
      () => {
        for (const write of this.calendarWrites) {
          if (expected.method && write.method !== expected.method) continue;
          if (
            expected.eventId &&
            !write.path.endsWith(`/events/${expected.eventId}`)
          ) continue;
          const event = write.body as {
            summary?: string;
            description?: string;
            start?: { dateTime?: string };
            end?: { dateTime?: string };
          } | null;
          if (!event || typeof event !== "object") continue;
          if (event.summary !== expected.summary) continue;
          if ((event.description ?? "") !== (expected.description ?? "")) {
            continue;
          }
          if (event.start?.dateTime !== expected.start) continue;
          if (event.end?.dateTime !== expected.end) continue;
          return true;
        }
        return false;
      },
      { timeout: 5000 },
    ).toBe(true);
  }

  /**
   * Assert the app sent a DELETE for the given event id to the calendar
   * API (delete carries no request body).
   */
  async assertBookingWasDeleted(eventId: string): Promise<void> {
    await expect.poll(
      () =>
        this.calendarWrites.some(
          (write) =>
            write.method === "DELETE" &&
            write.path.endsWith(`/events/${eventId}`),
        ),
      { timeout: 5000 },
    ).toBe(true);
  }

  /**
   * The toolbar of the loaded overview: proof the board is up.
   */
  private toolbar(): Locator {
    return this.page.getByRole("button", { name: "Vandaag" });
  }

  /**
   * The error state of the overview.
   */
  private errorState(): Locator {
    return this.page.getByText("Fout:", { exact: false });
  }

  /**
   * The bar of one booking on the board.
   */
  private bookingBar(booking: string): Locator {
    return this.page.locator(`button [title="${booking}"]`);
  }

  /**
   * The booking bars of one room.
   */
  private bookingsOfRoom(room: string): Locator {
    return this.page.locator(`button [title^="${room} -"]`);
  }

  /**
   * The chip toggling a room's column.
   */
  private roomChip(room: string): Locator {
    return this.page.getByText(room, { exact: true }).first();
  }

  /**
   * The column header of a room, or null when it cannot be told apart
   * from the chip (the room whose column header repeats its name).
   */
  private roomColumn(room: string): Locator | null {
    const column = ROOM_COLUMNS[room];
    if (column === undefined) {
      throw new Error(`Unknown room: ${room}`);
    }
    return column === room
      ? null
      : this.page.getByText(column, { exact: true });
  }

  /**
   * The group of unmatched bookings: its chip and its board column.
   */
  private unmatchedGroup(): Locator {
    return this.page.getByText(UNMATCHED_GROUP, { exact: true });
  }

  /**
   * The label showing the selected day.
   */
  private dayLabel(): Locator {
    return this.page.locator('[aria-live="polite"]');
  }

  /**
   * A term of the booking details.
   */
  private detailsTerm(term: string): Locator {
    return this.page.getByText(term, { exact: true });
  }

  /**
   * The title of the booking form in the sidebar: "Nieuwe boeking" in
   * create mode, "Boeking bewerken" in edit mode.
   */
  private bookingFormTitle(): Locator {
    return this.page.getByRole("heading", {
      name: /^(Nieuwe boeking|Boeking bewerken)$/,
    });
  }

  /**
   * The room select of the booking form.
   */
  private roomSelect(): Locator {
    return this.page.getByRole("combobox", { name: "Ruimte" });
  }

  /**
   * The free-slot blocks painted in a room's lane.
   */
  private freeSlotBlocks(room: string): Locator {
    return this.page.locator(
      `[data-resource-id="${room}"] [title="Nu boeken"]`,
    );
  }

  /**
   * The viewport point of a time ("HH:mm") in a room's lane. The lane's
   * bounding box already accounts for the board's scroll position, so the
   * time axis maps directly onto its height.
   */
  private async slotPoint(
    room: string,
    hhmm: string,
  ): Promise<{ x: number; y: number }> {
    const lane = this.page.locator(`[data-resource-id="${room}"]`);
    const [hours, minutes] = hhmm.split(":").map(Number);
    const offsetPx = ((hours - START_HOUR) * 60 + minutes) / 60 *
      HOUR_HEIGHT_PX;
    // Scroll the board so the target time is comfortably inside the
    // viewport, then map the time axis onto the lane's bounding box
    const rect = await lane.evaluate((el, offset) => {
      let scroller: Element | null = el.parentElement;
      while (scroller && scroller.scrollHeight <= scroller.clientHeight) {
        scroller = scroller.parentElement;
      }
      if (scroller) {
        scroller.scrollTop = Math.max(0, offset - 100);
      }
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width };
    }, offsetPx);
    return {
      x: rect.x + rect.width / 2,
      y: rect.y + offsetPx,
    };
  }
}
